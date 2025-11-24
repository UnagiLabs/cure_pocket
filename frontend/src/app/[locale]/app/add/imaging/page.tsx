"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ImagingForm } from "@/components/forms/ImagingForm";
import { useApp } from "@/contexts/AppContext";
import { useEncryptAndStore } from "@/hooks/useEncryptAndStore";
import { usePassport } from "@/hooks/usePassport";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import { encryptAndStoreImagingBinary } from "@/lib/imagingBinary";
import { createImagingMeta, generateDicomUIDs } from "@/lib/imagingHelpers";
import { generateSealId } from "@/lib/sealIdGenerator";
import { getDataEntryBlobIds } from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";
import type { ImagingReport } from "@/types";

/**
 * 画像レポートの追加フォームページ
 */
export default function AddImagingPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const currentAccount = useCurrentAccount();
	const suiClient = useSuiClient();
	const { settings } = useApp();
	const { passport } = usePassport();
	const theme = getTheme(settings.theme);

	const { encryptAndStoreMultiple, progress, isEncrypting } =
		useEncryptAndStore();
	const {
		updateMultiplePassportData,
		isUpdating,
		error: passportError,
	} = useUpdatePassportData();

	const [uploadError, setUploadError] = useState<string | null>(null);

	const handleSaved = async (report: ImagingReport) => {
		// If no image file, just navigate back
		if (!report.imageFile) {
			router.push(`/${locale}/app`);
			return;
		}

		// Check if passport and account exist
		if (!passport?.id || !currentAccount?.address) {
			setUploadError("NO_PASSPORT");
			return;
		}

		try {
			setUploadError(null);

			// Generate seal ID for encryption
			const sealId = await generateSealId(currentAccount.address);

			// Generate DICOM UIDs
			const dicomUIDs = generateDicomUIDs();

			// imaging_binary を専用ルートで暗号化・アップロード
			const binaryResult = await encryptAndStoreImagingBinary({
				file: report.imageFile,
				sealId,
				suiClient,
			});

			const binaryBlobId = binaryResult.blobId;

			// Create imaging_meta with the blob ID
			const imagingMeta = createImagingMeta(report, binaryBlobId, dicomUIDs);

			// Upload imaging_meta
			const metaResults = await encryptAndStoreMultiple(
				[
					{
						data: {
							meta: {
								schema_version: "2.0.0",
								updated_at: Date.now(),
								generator: "CurePocket_Web_v1",
							},
							imaging_meta: [imagingMeta],
						},
						dataType: "imaging_meta",
					},
				],
				sealId,
			);

			if (!metaResults || metaResults.length === 0) {
				throw new Error("Failed to upload imaging_meta");
			}

			const metaBlobId = metaResults[0].blobId;

			// Check if data entries already exist to determine mode (add or replace)
			const existingMetaBlobs = await getDataEntryBlobIds(
				passport.id,
				"imaging_meta",
			);
			const existingBinaryBlobs = await getDataEntryBlobIds(
				passport.id,
				"imaging_binary",
			);

			// Use replace mode if data already exists, add mode if not
			const shouldReplaceMetadata = existingMetaBlobs.length > 0;
			const shouldReplaceBinary = existingBinaryBlobs.length > 0;

			// Update passport with imaging_meta and imaging_binary
			await updateMultiplePassportData({
				passportId: passport.id,
				dataEntries: [
					{
						dataType: "imaging_meta",
						blobIds: [metaBlobId],
						replace: shouldReplaceMetadata,
					},
					{
						dataType: "imaging_binary",
						blobIds: [binaryBlobId],
						replace: shouldReplaceBinary,
					},
				],
			});

			// Success - navigate back
			router.push(`/${locale}/app`);
		} catch (error) {
			console.error("Failed to upload imaging data:", error);
			setUploadError(error instanceof Error ? error.message : "UPLOAD_FAILED");
		}
	};

	const handleCancel = () => {
		router.push(`/${locale}/app`);
	};

	return (
		<div className="p-4 md:p-6">
			{/* Header */}
			<div className="mb-6 md:mb-8">
				<h1
					className="text-lg font-bold md:text-2xl"
					style={{ color: theme.colors.text }}
				>
					{t("imaging.add")}
				</h1>
			</div>

			{/* Upload Progress */}
			{(isEncrypting || isUpdating) && (
				<div
					className="mb-4 rounded-lg border p-4"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: theme.colors.primary,
					}}
				>
					<p className="font-medium" style={{ color: theme.colors.text }}>
						{t("imaging.uploading")}
					</p>
					<p className="text-sm" style={{ color: theme.colors.textSecondary }}>
						{progress === "validating" && t("imaging.progress.validating")}
						{progress === "encrypting" && t("imaging.progress.encrypting")}
						{progress === "uploading" && t("imaging.progress.uploading")}
						{isUpdating && "Updating passport..."}
					</p>
				</div>
			)}

			{/* Upload Error */}
			{uploadError && (
				<div
					className="mb-4 rounded-lg border p-4"
					style={{
						backgroundColor: "#fee2e2",
						borderColor: "#ef4444",
					}}
				>
					<p className="font-medium" style={{ color: "#991b1b" }}>
						{t("imaging.uploadError")}
					</p>
					<p className="text-sm" style={{ color: "#991b1b" }}>
						{uploadError}
					</p>
				</div>
			)}

			{/* Passport Error */}
			{passportError && (
				<div
					className="mb-4 rounded-lg border p-4"
					style={{
						backgroundColor: "#fee2e2",
						borderColor: "#ef4444",
					}}
				>
					<p className="font-medium" style={{ color: "#991b1b" }}>
						{t("imaging.encryptError")}
					</p>
					<p className="text-sm" style={{ color: "#991b1b" }}>
						{passportError}
					</p>
				</div>
			)}

			{/* Form */}
			<ImagingForm onSaved={handleSaved} onCancel={handleCancel} />
		</div>
	);
}
