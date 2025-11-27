/**
 * useVitalsPersistence Hook (v3.0.0)
 *
 * Handles vitals persistence to Walrus with monthly partitioning.
 * Uses metadata blob architecture for efficient partition management.
 *
 * ## Features
 * - Monthly partitioning: one data blob per month
 * - Metadata blob stores month references (no need to decrypt all blobs)
 * - Replace per-month blob (no history accumulation)
 * - Encrypt with Seal, upload to Walrus
 * - Update SBT Dynamic Field
 *
 * ## Architecture (v3.0.0)
 * - SBT DataEntry → メタデータBlob → データBlob[]
 * - メタデータBlobにはmonth_keyごとのblob_id参照を保持
 * - 特定月のデータ更新時はメタデータから該当entryを特定
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

import { useCallback, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useMetadataManager } from "@/hooks/useMetadataManager";
import { vitalsToSelfMetrics } from "@/lib/profileConverter";
import type { VitalSign } from "@/types";
import type { SelfMetricsData } from "@/types/healthData";
import {
	createEmptyMetadata,
	type SelfMetricsMetadata,
	type SelfMetricsMetadataEntry,
	type VitalSignType,
} from "@/types/metadata";

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
 * Extract unique vital sign types from vitals array
 * Maps VitalSign.type (kebab-case) to VitalSignType (snake_case)
 */
function extractVitalTypes(vitals: VitalSign[]): VitalSignType[] {
	const types = new Set<VitalSignType>();
	for (const vital of vitals) {
		// Map vital.type (kebab-case) to VitalSignType (snake_case)
		switch (vital.type) {
			case "blood-pressure":
				types.add("blood_pressure");
				break;
			case "heart-rate":
				types.add("heart_rate");
				break;
			case "blood-glucose":
				types.add("blood_glucose");
				break;
			case "weight":
				types.add("weight");
				break;
			case "temperature":
				types.add("temperature");
				break;
			default:
				types.add("other");
		}
	}
	return Array.from(types);
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
 * Vitals persistence hook with monthly partitioning (v3.0.0)
 *
 * Uses useMetadataManager for efficient metadata-based partition management.
 */
export function useVitalsPersistence(): UseVitalsPersistenceReturn {
	const metadataManager = useMetadataManager<SelfMetricsMetadataEntry>({
		dataType: "self_metrics",
	});
	const { setVitalSigns } = useApp();

	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Main persistence function
	 */
	const persistVitals = useCallback(
		async (updatedVitals: VitalSign[]) => {
			setIsSaving(true);
			setError(null);

			try {
				console.log(
					`[VitalsPersistence] Starting persistence for ${updatedVitals.length} vitals`,
				);

				// Load existing metadata (or create new)
				let metadata: SelfMetricsMetadata =
					(await metadataManager.loadMetadata()) ||
					createEmptyMetadata("self_metrics");

				console.log(
					`[VitalsPersistence] Loaded metadata with ${metadata.entries?.length ?? 0} existing entries`,
				);

				// Group updated vitals by month
				const vitalsByMonth = groupVitalsByMonth(updatedVitals);
				console.log(
					`[VitalsPersistence] Updated vitals span ${vitalsByMonth.size} month(s)`,
				);

				// Track which months need processing
				const existingMonthKeys = new Set(
					(metadata.entries || []).map((e) => e.month_key),
				);
				const newMonthKeys = new Set(vitalsByMonth.keys());

				// Find months to delete (exist in metadata but not in new vitals)
				const monthsToDelete = [...existingMonthKeys].filter(
					(key) => !newMonthKeys.has(key),
				);

				// Find months to add/update
				const monthsToProcess = [...newMonthKeys];

				// Process deleted months
				for (const monthKey of monthsToDelete) {
					console.log(`[VitalsPersistence] Removing month ${monthKey}`);
					metadata = metadataManager.removeEntry(
						metadata,
						monthKey,
						"month_key",
					);
				}

				// Process each month with data
				for (const monthKey of monthsToProcess) {
					const monthVitals = vitalsByMonth.get(monthKey);
					if (!monthVitals || monthVitals.length === 0) {
						continue;
					}

					console.log(
						`[VitalsPersistence] Processing month ${monthKey} with ${monthVitals.length} vitals`,
					);

					// Convert to SelfMetricsData
					const metricsData = vitalsToSelfMetrics(monthVitals);

					// Upload data blob (encrypted)
					const blobId =
						await metadataManager.uploadDataBlob<SelfMetricsData>(metricsData);
					console.log(
						`[VitalsPersistence] Uploaded month ${monthKey}, blobId: ${blobId}`,
					);

					// Create metadata entry
					const entry: SelfMetricsMetadataEntry = {
						blob_id: blobId,
						month_key: monthKey,
						record_count: monthVitals.length,
						types: extractVitalTypes(monthVitals),
					};

					// Upsert entry (add or replace by month_key)
					metadata = metadataManager.upsertEntry(metadata, entry, "month_key");
				}

				// Save metadata (encrypts and uploads to Walrus, updates SBT)
				console.log(
					`[VitalsPersistence] Saving metadata with ${metadata.entries?.length ?? 0} entries`,
				);
				await metadataManager.saveMetadata(metadata);

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
		[metadataManager, setVitalSigns],
	);

	return {
		persistVitals,
		isSaving,
		error,
	};
}
