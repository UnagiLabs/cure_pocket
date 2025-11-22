"use client";

import { Calendar, MapPin, Plus, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";

/**
 * 処方箋一覧ページ
 * 直近の処方3件を表示（同じ日・同じ医療機関・同じ診療科でグループ化）
 */
export default function MedicationsPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { prescriptions, settings } = useApp();
	const theme = getTheme(settings.theme);

	// 処方日順にソート（新しい順）して最新3件を取得
	const recentPrescriptions = useMemo(() => {
		return [...prescriptions]
			.sort((a, b) => {
				const dateA = new Date(a.prescriptionDate).getTime();
				const dateB = new Date(b.prescriptionDate).getTime();
				return dateB - dateA;
			})
			.slice(0, 3);
	}, [prescriptions]);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8 space-y-6">
			{/* Header - Mobile only, desktop shows in top bar */}
			<div className="lg:hidden mb-4">
				<h1
					className="text-xl font-bold"
					style={{ color: theme.colors.text }}
				>
					{t("medications.title")}
				</h1>
				<p
					className="mt-1 text-sm"
					style={{ color: theme.colors.textSecondary }}
				>
					{t("medications.description")}
				</p>
			</div>

			{/* Prescriptions List */}
			{recentPrescriptions.length === 0 ? (
				<div
					className="flex flex-col h-64 items-center justify-center rounded-lg"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<p
						className="mb-4 text-center"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("medications.noPrescriptions")}
					</p>
					<button
						type="button"
						onClick={() => router.push(`/${locale}/app/add/medication`)}
						className="flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-all hover:scale-[1.02]"
						style={{
							backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
						}}
					>
						<Plus className="h-5 w-5" />
						{t("medications.addFirstPrescription")}
					</button>
				</div>
			) : (
				<div className="space-y-4">
					{recentPrescriptions.map((prescription) => (
						<div
							key={prescription.id}
							className="rounded-xl border-2 overflow-hidden"
							style={{
								backgroundColor: theme.colors.surface,
								borderColor: `${theme.colors.textSecondary}20`,
							}}
						>
							{/* Prescription Header */}
							<div
								className="px-4 py-3 border-b"
								style={{
									backgroundColor: `${theme.colors.primary}10`,
									borderColor: `${theme.colors.textSecondary}20`,
								}}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<Calendar
												size={16}
												style={{ color: theme.colors.primary }}
											/>
											<span
												className="font-bold text-sm"
												style={{ color: theme.colors.text }}
											>
												{formatDate(prescription.prescriptionDate)}
											</span>
										</div>
										<div className="flex items-center gap-2 mb-1">
											<MapPin
												size={14}
												style={{ color: theme.colors.textSecondary }}
											/>
											<span
												className="text-sm font-medium"
												style={{ color: theme.colors.text }}
											>
												{prescription.clinic}
											</span>
										</div>
										{prescription.department && (
											<div
												className="text-xs ml-5"
												style={{ color: theme.colors.textSecondary }}
											>
												{prescription.department}
											</div>
										)}
										{prescription.doctorName && (
											<div className="flex items-center gap-2 mt-1 ml-5">
												<User
													size={12}
													style={{ color: theme.colors.textSecondary }}
												/>
												<span
													className="text-xs"
													style={{ color: theme.colors.textSecondary }}
												>
													{prescription.doctorName}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Medications List */}
							<div className="px-4 py-3 space-y-3">
								{prescription.medications.map((medication) => (
									<div
										key={medication.id}
										className="pb-3 border-b last:border-b-0"
										style={{ borderColor: `${theme.colors.textSecondary}10` }}
									>
										<div
											className="font-semibold mb-1"
											style={{ color: theme.colors.text }}
										>
											{medication.drugName}
										</div>
										<div className="grid grid-cols-2 gap-2 text-xs">
											<div>
												<span style={{ color: theme.colors.textSecondary }}>
													{t("prescriptions.strength")}:{" "}
												</span>
												<span style={{ color: theme.colors.text }}>
													{medication.strength}
												</span>
											</div>
											<div>
												<span style={{ color: theme.colors.textSecondary }}>
													{t("prescriptions.quantity")}:{" "}
												</span>
												<span style={{ color: theme.colors.text }}>
													{medication.quantity}
												</span>
											</div>
											<div className="col-span-2">
												<span style={{ color: theme.colors.textSecondary }}>
													{t("prescriptions.dosage")}:{" "}
												</span>
												<span style={{ color: theme.colors.text }}>
													{medication.dosage}
												</span>
											</div>
											{medication.duration && (
												<div className="col-span-2">
													<span style={{ color: theme.colors.textSecondary }}>
														{t("prescriptions.duration")}:{" "}
													</span>
													<span style={{ color: theme.colors.text }}>
														{medication.duration}
													</span>
												</div>
											)}
										</div>
									</div>
								))}
							</div>

							{/* Symptoms & Notes */}
							{(prescription.symptoms || prescription.notes) && (
								<div
									className="px-4 py-3 border-t text-sm"
									style={{
										backgroundColor: `${theme.colors.textSecondary}05`,
										borderColor: `${theme.colors.textSecondary}20`,
									}}
								>
									{prescription.symptoms && (
										<div className="mb-2">
											<span
												className="font-medium"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("prescriptions.symptoms")}:{" "}
											</span>
											<span style={{ color: theme.colors.text }}>
												{prescription.symptoms}
											</span>
										</div>
									)}
									{prescription.notes && (
										<div>
											<span
												className="font-medium"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("prescriptions.notes")}:{" "}
											</span>
											<span style={{ color: theme.colors.text }}>
												{prescription.notes}
											</span>
										</div>
									)}
								</div>
							)}

							{/* Attachments */}
							{prescription.attachments &&
								prescription.attachments.length > 0 && (
									<div
										className="px-4 py-2 border-t text-xs"
										style={{
											borderColor: `${theme.colors.textSecondary}20`,
											color: theme.colors.textSecondary,
										}}
									>
										📎 {prescription.attachments.length}{" "}
										{t("prescriptions.attachments")}
									</div>
								)}
						</div>
					))}
				</div>
			)}

			{/* Add Button */}
			<button
				type="button"
				onClick={() => router.push(`/${locale}/app/add/medication`)}
				className="w-full rounded-xl py-4 font-medium text-white transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
				style={{
					backgroundImage: `linear-gradient(to top right, ${theme.colors.primary}, ${theme.colors.secondary})`,
				}}
			>
				<Plus className="h-5 w-5" />
				{t("medications.addNewPrescription")}
			</button>
		</div>
	);
}
