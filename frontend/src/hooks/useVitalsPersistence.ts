/**
 * useVitalsPersistence Hook
 *
 * Handles vitals persistence to Walrus with monthly partitioning.
 * Each month's data is stored in a separate blob for scalability.
 *
 * ## Features
 * - Monthly partitioning: one blob per month
 * - Replace latest blob per month (no history accumulation)
 * - Encrypt with Seal, upload to Walrus
 * - Update SBT Dynamic Field
 *
 * ## Usage
 * ```typescript
 * const { persistVitals, isSaving } = useVitalsPersistence();
 *
 * // Add/Edit/Delete vitals
 * await persistVitals(updatedVitals);
 * ```
 */
"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useCallback, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import { vitalsToSelfMetrics } from "@/lib/profileConverter";
import {
	buildPatientAccessPTB,
	calculateThreshold,
	createSealClient,
	decryptHealthData,
	encryptHealthData,
	SEAL_KEY_SERVERS,
} from "@/lib/seal";
import { generateSealId } from "@/lib/sealIdGenerator";
import { getDataEntryBlobIds, PASSPORT_REGISTRY_ID } from "@/lib/suiClient";
import { downloadFromWalrusByBlobId, uploadToWalrus } from "@/lib/walrus";
import type { VitalSign } from "@/types";
import type { SelfMetricsData } from "@/types/healthData";

/**
 * Month info for blob management
 */
interface MonthBlobInfo {
	monthKey: string; // "2025-11" format
	blobId: string | null; // existing blob ID or null
	blobIndex: number; // index in blob_ids array (-1 if new)
}

/**
 * Get month key from date string
 * @param dateStr - ISO date string or datetime-local format
 * @returns Month key in "YYYY-MM" format
 */
function getMonthKey(dateStr: string): string {
	return dateStr.slice(0, 7);
}

/**
 * Group vitals by month
 */
function groupVitalsByMonth(vitals: VitalSign[]): Map<string, VitalSign[]> {
	const groups = new Map<string, VitalSign[]>();
	for (const vital of vitals) {
		const monthKey = getMonthKey(vital.recordedAt);
		const existing = groups.get(monthKey) || [];
		groups.set(monthKey, [...existing, vital]);
	}
	return groups;
}

/**
 * Hook return type
 */
export interface UseVitalsPersistenceReturn {
	/** Persist vitals to Walrus with monthly partitioning */
	persistVitals: (updatedVitals: VitalSign[]) => Promise<void>;
	/** Whether persistence is in progress */
	isSaving: boolean;
	/** Error message if persistence failed */
	error: string | null;
}

/**
 * Vitals persistence hook with monthly partitioning
 */
export function useVitalsPersistence(): UseVitalsPersistenceReturn {
	const suiClient = useSuiClient();
	const currentAccount = useCurrentAccount();
	const { passport } = usePassport();
	const { sessionKey } = useSessionKeyManager();
	const { updatePassportData } = useUpdatePassportData();
	const { setVitalSigns } = useApp();

	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Load existing blobs and identify which months they contain
	 */
	const loadExistingMonthBlobs = useCallback(
		async (
			existingBlobIds: string[],
			sealId: string,
		): Promise<Map<string, MonthBlobInfo>> => {
			const monthBlobs = new Map<string, MonthBlobInfo>();

			if (existingBlobIds.length === 0 || !sessionKey || !passport) {
				return monthBlobs;
			}

			// Load each blob and identify its month
			for (let i = 0; i < existingBlobIds.length; i++) {
				const blobId = existingBlobIds[i];
				try {
					const encryptedData = await downloadFromWalrusByBlobId(blobId);
					const txBytes = await buildPatientAccessPTB({
						passportObjectId: passport.id,
						registryObjectId: PASSPORT_REGISTRY_ID,
						suiClient,
						sealId,
						dataType: "self_metrics",
					});

					const sealClient = createSealClient(suiClient);
					const decryptedData = await decryptHealthData({
						encryptedData,
						sealClient,
						sessionKey,
						txBytes,
						sealId,
					});

					const metricsData = decryptedData as unknown as SelfMetricsData;
					if (metricsData.self_metrics && metricsData.self_metrics.length > 0) {
						// Get month from first metric's recorded_at
						const monthKey = getMonthKey(
							metricsData.self_metrics[0].recorded_at,
						);
						monthBlobs.set(monthKey, {
							monthKey,
							blobId,
							blobIndex: i,
						});
					}
				} catch (err) {
					console.warn(
						`[VitalsPersistence] Failed to load blob ${blobId}:`,
						err,
					);
					// Continue with other blobs
				}
			}

			return monthBlobs;
		},
		[passport, sessionKey, suiClient],
	);

	/**
	 * Main persistence function
	 */
	const persistVitals = useCallback(
		async (updatedVitals: VitalSign[]) => {
			// Validate prerequisites
			if (!passport) {
				throw new Error(
					"パスポートが見つかりません。プロフィールを作成してください。",
				);
			}
			if (!currentAccount?.address) {
				throw new Error("ウォレットが接続されていません。");
			}
			if (!sessionKey) {
				throw new Error(
					"セッションキーが見つかりません。再度ログインしてください。",
				);
			}

			setIsSaving(true);
			setError(null);

			try {
				// Generate seal_id for self_metrics
				const selfMetricsSealId = await generateSealId(
					currentAccount.address,
					"self_metrics",
				);
				console.log(
					`[VitalsPersistence] Generated seal_id: ${selfMetricsSealId.substring(0, 16)}...`,
				);

				// Get existing blob IDs
				const existingBlobIds = await getDataEntryBlobIds(
					passport.id,
					"self_metrics",
				);
				console.log(
					`[VitalsPersistence] Found ${existingBlobIds.length} existing blob(s)`,
				);

				// Load existing month-blob mapping
				const existingMonthBlobs = await loadExistingMonthBlobs(
					existingBlobIds,
					selfMetricsSealId,
				);
				console.log(
					`[VitalsPersistence] Loaded ${existingMonthBlobs.size} month(s) from existing blobs`,
				);

				// Group updated vitals by month
				const vitalsByMonth = groupVitalsByMonth(updatedVitals);
				console.log(
					`[VitalsPersistence] Updated vitals span ${vitalsByMonth.size} month(s)`,
				);

				// Prepare new blob IDs array (start with existing, will be updated)
				const newBlobIds = [...existingBlobIds];

				// Track which months were affected (either updated or removed)
				const affectedMonths = new Set<string>();
				for (const monthKey of vitalsByMonth.keys()) {
					affectedMonths.add(monthKey);
				}
				for (const monthKey of existingMonthBlobs.keys()) {
					affectedMonths.add(monthKey);
				}

				// Process each affected month
				const sealClient = createSealClient(suiClient);
				const threshold = calculateThreshold(SEAL_KEY_SERVERS.length);

				for (const monthKey of affectedMonths) {
					const monthVitals = vitalsByMonth.get(monthKey) || [];
					const existingInfo = existingMonthBlobs.get(monthKey);

					if (monthVitals.length === 0) {
						// Month was deleted - remove from blob_ids
						if (existingInfo && existingInfo.blobIndex >= 0) {
							console.log(`[VitalsPersistence] Removing month ${monthKey}`);
							// Mark for removal (set to empty string, will filter later)
							newBlobIds[existingInfo.blobIndex] = "";
						}
					} else {
						// Month has data - create/update blob
						console.log(
							`[VitalsPersistence] Processing month ${monthKey} with ${monthVitals.length} vitals`,
						);

						// Convert to SelfMetricsData
						const metricsData = vitalsToSelfMetrics(monthVitals);

						// Encrypt
						const { encryptedObject } = await encryptHealthData({
							healthData: metricsData as unknown as never,
							sealClient,
							sealId: selfMetricsSealId,
							threshold,
						});

						// Upload to Walrus
						const walrusRef = await uploadToWalrus(encryptedObject);
						console.log(
							`[VitalsPersistence] Uploaded month ${monthKey}, blobId: ${walrusRef.blobId}`,
						);

						// Update blob_ids array
						if (existingInfo && existingInfo.blobIndex >= 0) {
							// Replace existing
							newBlobIds[existingInfo.blobIndex] = walrusRef.blobId;
						} else {
							// Add new
							newBlobIds.push(walrusRef.blobId);
						}
					}
				}

				// Filter out empty strings (deleted months)
				const finalBlobIds = newBlobIds.filter((id) => id !== "");
				console.log(
					`[VitalsPersistence] Final blob_ids count: ${finalBlobIds.length}`,
				);

				// Update SBT Dynamic Field
				const shouldReplace = existingBlobIds.length > 0;
				await updatePassportData({
					passportId: passport.id,
					dataType: "self_metrics",
					blobIds: finalBlobIds,
					replace: shouldReplace,
				});

				// Update local state
				setVitalSigns(updatedVitals);

				console.log("[VitalsPersistence] Persistence complete!");
			} catch (err) {
				console.error("[VitalsPersistence] Persistence failed:", err);
				const errorMessage =
					err instanceof Error ? err.message : "保存に失敗しました";
				setError(errorMessage);
				throw new Error(errorMessage);
			} finally {
				setIsSaving(false);
			}
		},
		[
			currentAccount,
			loadExistingMonthBlobs,
			passport,
			sessionKey,
			setVitalSigns,
			suiClient,
			updatePassportData,
		],
	);

	return {
		persistVitals,
		isSaving,
		error,
	};
}
