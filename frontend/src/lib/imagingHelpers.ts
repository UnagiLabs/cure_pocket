/**
 * Imaging data processing helpers
 * Handles DICOM UID generation, imaging_meta and imaging_binary creation
 */

import type { ImagingReport } from "@/types";

// Constants
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const OID_BASE = "1.2.392.200036.9123.100.12"; // Project-specific OID

// DICOM Modality mapping
const MODALITY_MAP: Record<string, string> = {
	xray: "CR", // Computed Radiography
	ct: "CT",
	mri: "MR",
	ultrasound: "US",
	other: "OT",
};

/**
 * Generate DICOM UIDs (study, series, instance)
 */
export function generateDicomUIDs(): {
	studyUid: string;
	seriesUid: string;
	sopInstanceUid: string;
} {
	const timestamp = new Date()
		.toISOString()
		.replace(/[-:T.Z]/g, "")
		.slice(0, 14);
	const random = Math.floor(Math.random() * 1000000);

	const studyUid = `${OID_BASE}.${timestamp}.${random}`;
	const seriesUid = `${studyUid}.1`;
	const sopInstanceUid = `${seriesUid}.1`;

	return {
		studyUid,
		seriesUid,
		sopInstanceUid,
	};
}

/**
 * Create imaging_meta data structure
 */
export function createImagingMeta(
	formData: Omit<ImagingReport, "id">,
	blobId: string,
	dicomUIDs: {
		studyUid: string;
		seriesUid: string;
		sopInstanceUid: string;
	},
) {
	const modality = MODALITY_MAP[formData.type] || "OT";

	// Build report section
	const report = {
		summary: formData.summary,
		language: "en", // TODO: Get from locale context
	};

	// Add findings and impression if present
	if (formData.findings) {
		Object.assign(report, { findings: formData.findings });
	}
	if (formData.impression) {
		Object.assign(report, { impression: formData.impression });
	}

	const imagingMeta = {
		study_uid: dicomUIDs.studyUid,
		modality,
		body_site: formData.bodyPart || "Unknown",
		performed_at: formData.examDate
			? new Date(formData.examDate).toISOString()
			: new Date().toISOString(),
		facility: formData.performedBy || undefined,
		series: [
			{
				series_uid: dicomUIDs.seriesUid,
				description: `${formData.type} - ${formData.bodyPart || "Unknown"}`,
				modality,
				instance_blobs: [
					{
						sop_instance_uid: dicomUIDs.sopInstanceUid,
						dicom_blob_id: blobId,
						frames: 1,
						sop_class: "1.2.840.10008.5.1.4.1.1.2", // CT Image Storage (generic)
					},
				],
			},
		],
		report,
		schema_version: "2.0.0",
	};

	return imagingMeta;
}

/**
 * Create imaging_binary data structure
 */
export async function createImagingBinary(file: File): Promise<{
	content_type: string;
	data: ArrayBuffer;
}> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			const arrayBuffer = event.target?.result;
			if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
				reject(new Error("Failed to read file as ArrayBuffer"));
				return;
			}

			resolve({
				content_type: file.type,
				data: arrayBuffer,
			});
		};

		reader.onerror = () => {
			reject(new Error("Failed to read file"));
		};

		reader.readAsArrayBuffer(file);
	});
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
	valid: boolean;
	error?: string;
} {
	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: "FILE_TOO_LARGE", // i18n key
		};
	}

	// Check file type
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		return {
			valid: false,
			error: "INVALID_FILE_TYPE", // i18n key
		};
	}

	return { valid: true };
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Create image preview URL
 */
export function createImagePreview(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			const result = event.target?.result;
			if (typeof result === "string") {
				resolve(result);
			} else {
				reject(new Error("Failed to create preview"));
			}
		};

		reader.onerror = () => {
			reject(new Error("Failed to read file for preview"));
		};

		reader.readAsDataURL(file);
	});
}
