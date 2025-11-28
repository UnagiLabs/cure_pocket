"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ImagingForm } from "@/components/forms/ImagingForm";
import { useApp } from "@/contexts/AppContext";
import { useEncryptAndStore } from "@/hooks/useEncryptAndStore";
import { usePassport } from "@/hooks/usePassport";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import { createImagingMeta, generateDicomUIDs } from "@/lib/imagingHelpers";
import { getDataEntry } from "@/lib/suiClient";
import { getTheme } from "@/lib/themes";
import type { ImagingReport } from "@/types";
import type { ImagingMetadataEntry } from "@/types/metadata";

/**
 * 画像レポートの追加フォームページ
 */
export default function AddImagingPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const currentAccount = useCurrentAccount();
	const { settings } = useApp();
	const { passport } = usePassport();
	const theme = getTheme(settings.theme);

	const { encryptAndStoreMultiple, encryptImage, progress, isEncrypting } =
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

			// Generate DICOM UIDs
			const dicomUIDs = generateDicomUIDs();

			// imaging_binary を暗号化・アップロード（seal_idはフック内で自動生成）
			const binaryResult = await encryptImage(report.imageFile);

			const binaryBlobId = binaryResult.blobId;

			// Create imaging_meta with the blob ID
			const imagingMeta = createImagingMeta(report, binaryBlobId, dicomUIDs);

			// Upload imaging_meta（seal_idはフック内で自動生成）
			const metaResults = await encryptAndStoreMultiple([
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
			]);

			if (!metaResults || metaResults.length === 0) {
				throw new Error("Failed to upload imaging_meta");
			}

			const metaBlobId = metaResults[0].blobId;

			// v3.0.0: Create metadata blob with entry reference
			// Check if data entries already exist to determine mode (add or replace)
			const existingMetaEntry = await getDataEntry(passport.id, "imaging_meta");
			const existingBinaryEntry = await getDataEntry(
				passport.id,
				"imaging_binary",
			);

			// Use replace mode if data already exists, add mode if not
			const shouldReplaceMetadata = existingMetaEntry !== null;
			const shouldReplaceBinary = existingBinaryEntry !== null;

			// Create metadata structure with entry pointing to data blob
			const metadataEntry: ImagingMetadataEntry = {
				blob_id: metaBlobId,
				study_id: dicomUIDs.studyUid,
				study_date: report.examDate || new Date().toISOString().split("T")[0],
				modality: report.type || "other",
				body_part: report.bodyPart || "",
				binary_blob_id: binaryBlobId,
			};

			// v3.0.0: メタデータBlobを作成（暗号化・アップロード用）
			const metadataForUpload = {
				meta: {
					schema_version: "3.0.0",
					updated_at: Date.now(),
					generator: "CurePocket_Web_v1",
				},
				imaging_meta: [createImagingMeta(report, binaryBlobId, dicomUIDs)],
				// メタデータエントリ情報も含める
				entries: [metadataEntry],
			};

			// Upload metadata blob
			const metadataUploadResult = await encryptAndStoreMultiple([
				{
					data: metadataForUpload,
					dataType: "imaging_meta",
				},
			]);

			if (!metadataUploadResult || metadataUploadResult.length === 0) {
				throw new Error("Failed to upload metadata blob");
			}

			const metadataBlobId = metadataUploadResult[0].blobId;

			// Update passport with imaging_meta and imaging_binary
			await updateMultiplePassportData({
				passportId: passport.id,
				dataEntries: [
					{
						dataType: "imaging_meta",
						metadataBlobId: metadataBlobId,
						replace: shouldReplaceMetadata,
					},
					{
						dataType: "imaging_binary",
						metadataBlobId: binaryBlobId, // Binary uses data blob ID as metadata
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
