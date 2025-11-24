"use client";

import { Calendar, FileText, Image as ImageIcon, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

const doctorTheme = {
	primary: "#2563EB",
	secondary: "#3B82F6",
	text: "#0F172A",
	textSecondary: "#64748B",
	surface: "#FFFFFF",
};

interface ImagingPageProps {
	params: { patientId: string };
}

export default function DoctorImagingPage({
	params: _params,
}: ImagingPageProps) {
	const t = useTranslations();
	const locale = useLocale();

	// モックデータ
	const mockImagingReports = [
		{
			id: "i1",
			type: "ct" as const,
			bodyPart: "Chest",
			examDate: "2024-10-15",
			performedBy: "Tokyo Imaging Center",
			summary: "CT Chest with contrast",
			findings:
				"No acute cardiopulmonary abnormality. No evidence of pulmonary embolism. Heart size within normal limits.",
			impression: "Normal chest CT scan",
			imageUrl: undefined as string | undefined,
		},
		{
			id: "i2",
			type: "xray" as const,
			bodyPart: "Chest",
			examDate: "2024-09-25",
			performedBy: "City Hospital Radiology",
			summary: "Chest X-ray PA and Lateral",
			findings:
				"Clear lung fields bilaterally. No pleural effusion. Cardiac silhouette within normal limits.",
			impression: "Normal chest X-ray",
			imageUrl: undefined as string | undefined,
		},
		{
			id: "i3",
			type: "ultrasound" as const,
			bodyPart: "Abdomen",
			examDate: "2024-08-10",
			performedBy: "General Hospital",
			summary: "Abdominal ultrasound",
			findings:
				"Liver: Normal size and echogenicity. Gallbladder: No stones. Kidneys: Bilateral normal size.",
			impression: "Normal abdominal ultrasound",
			imageUrl: undefined as string | undefined,
		},
		{
			id: "i4",
			type: "mri" as const,
			bodyPart: "Brain",
			examDate: "2024-06-20",
			performedBy: "Neurology Imaging Center",
			summary: "Brain MRI without contrast",
			findings:
				"No acute intracranial abnormality. No mass effect or midline shift.",
			impression: "Normal brain MRI",
			imageUrl: undefined as string | undefined,
		},
	];

	const sortedReports = useMemo(() => {
		return [...mockImagingReports].sort((a, b) => {
			const dateA = new Date(a.examDate).getTime();
			const dateB = new Date(b.examDate).getTime();
			return dateB - dateA;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mockImagingReports]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getTypeLabel = (type: string) => {
		switch (type) {
			case "xray":
				return "X-Ray";
			case "ct":
				return "CT Scan";
			case "mri":
				return "MRI";
			case "ultrasound":
				return "Ultrasound";
			default:
				return type.toUpperCase();
		}
	};

	const getTypeColor = (type: string) => {
		switch (type) {
			case "xray":
				return { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" };
			case "ct":
				return { bg: "#FCE7F3", text: "#9F1239", border: "#FBCFE8" };
			case "mri":
				return { bg: "#E0E7FF", text: "#3730A3", border: "#C7D2FE" };
			case "ultrasound":
				return { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" };
			default:
				return { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB" };
		}
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 space-y-6">
			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-2">
					<div
						className="flex h-10 w-10 items-center justify-center rounded-xl"
						style={{ backgroundColor: `${doctorTheme.primary}20` }}
					>
						<ImageIcon size={20} style={{ color: doctorTheme.primary }} />
					</div>
					<h1
						className="text-2xl font-bold"
						style={{ color: doctorTheme.text }}
					>
						{t("home.imagingData", { default: "Imaging Reports" })}
					</h1>
				</div>
				<p className="text-sm" style={{ color: doctorTheme.textSecondary }}>
					{t("doctor.imagingHistory", {
						default: "Patient's radiology and imaging examination history",
					})}
				</p>
			</div>

			{/* Imaging Reports List */}
			{sortedReports.length === 0 ? (
				<div
					className="flex flex-col h-64 items-center justify-center rounded-lg border"
					style={{
						backgroundColor: doctorTheme.surface,
						borderColor: `${doctorTheme.textSecondary}20`,
					}}
				>
					<p
						className="text-center"
						style={{ color: doctorTheme.textSecondary }}
					>
						{t("dataOverview.noImaging", {
							default: "No imaging reports recorded",
						})}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{sortedReports.map((report) => {
						const typeConfig = getTypeColor(report.type);
						return (
							<div
								key={report.id}
								className="rounded-xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
								style={{
									backgroundColor: doctorTheme.surface,
									borderColor: `${doctorTheme.textSecondary}20`,
								}}
							>
								{/* Header */}
								<div
									className="px-4 py-3 border-b"
									style={{
										backgroundColor: typeConfig.bg,
										borderColor: typeConfig.border,
									}}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-3 flex-1">
											<div
												className="flex h-10 w-10 items-center justify-center rounded-lg"
												style={{
													backgroundColor: `${typeConfig.text}20`,
													color: typeConfig.text,
												}}
											>
												<ImageIcon size={20} />
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<span
														className="px-2 py-1 rounded-full text-xs font-bold"
														style={{
															backgroundColor: typeConfig.text,
															color: "white",
														}}
													>
														{getTypeLabel(report.type)}
													</span>
													<span
														className="font-bold text-lg"
														style={{ color: doctorTheme.text }}
													>
														{report.bodyPart}
													</span>
												</div>
												<div className="flex items-center gap-2 text-sm">
													<Calendar
														size={14}
														style={{ color: doctorTheme.textSecondary }}
													/>
													<span style={{ color: doctorTheme.text }}>
														{formatDate(report.examDate)}
													</span>
												</div>
												{report.performedBy && (
													<div className="flex items-center gap-2 text-xs mt-1">
														<MapPin
															size={12}
															style={{ color: doctorTheme.textSecondary }}
														/>
														<span style={{ color: doctorTheme.textSecondary }}>
															{report.performedBy}
														</span>
													</div>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Body */}
								<div className="px-4 py-4 space-y-3">
									{/* Summary */}
									{report.summary && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("imaging.summary", { default: "Summary" })}
											</div>
											<div
												className="text-sm font-medium"
												style={{ color: doctorTheme.text }}
											>
												{report.summary}
											</div>
										</div>
									)}

									{/* Findings */}
									{report.findings && (
										<div>
											<div className="flex items-center gap-2 mb-1">
												<FileText
													size={14}
													style={{ color: doctorTheme.textSecondary }}
												/>
												<span
													className="text-xs font-medium"
													style={{ color: doctorTheme.textSecondary }}
												>
													{t("imaging.findings", { default: "Findings" })}
												</span>
											</div>
											<div
												className="text-sm p-3 rounded-lg bg-gray-50"
												style={{ color: doctorTheme.text }}
											>
												{report.findings}
											</div>
										</div>
									)}

									{/* Impression */}
									{report.impression && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("imaging.impression", { default: "Impression" })}
											</div>
											<div
												className="text-sm p-3 rounded-lg font-medium"
												style={{
													backgroundColor: `${doctorTheme.primary}10`,
													color: doctorTheme.text,
												}}
											>
												{report.impression}
											</div>
										</div>
									)}

									{/* Image Placeholder */}
									{report.imageUrl && (
										<div>
											<div
												className="text-xs font-medium mb-1"
												style={{ color: doctorTheme.textSecondary }}
											>
												{t("imaging.images", { default: "Images" })}
											</div>
											<div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
												<div className="text-center">
													<ImageIcon
														size={48}
														className="mx-auto mb-2 text-gray-400"
													/>
													<p className="text-sm text-gray-500">
														{t("imaging.viewImage", { default: "View Image" })}
													</p>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
