"use client";

import { Calendar, MapPin, Pill, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { use, useMemo } from "react";

const doctorTheme = {
	primary: "#2563EB",
	secondary: "#3B82F6",
	text: "#0F172A",
	textSecondary: "#64748B",
	surface: "#FFFFFF",
};

interface MedicationsPageProps {
	params: Promise<{ patientId: string }>;
}

export default function DoctorMedicationsPage({
	params,
}: MedicationsPageProps) {
	const { patientId } = use(params);
	const t = useTranslations();
	const locale = useLocale();

	// モックデータ（バックエンド実装後に実データに置き換え）
	const mockPrescriptions = [
		{
			id: "1",
			prescriptionDate: "2024-11-15",
			clinic: "Tokyo General Hospital",
			department: "Internal Medicine",
			doctorName: "Dr. Yamada",
			symptoms: "Hypertension, Type 2 Diabetes",
			medications: [
				{
					id: "m1",
					drugName: "Amlodipine",
					strength: "5mg",
					dosage: "Once daily after breakfast",
					quantity: "1 tablet",
					duration: "30 days",
				},
				{
					id: "m2",
					drugName: "Metformin",
					strength: "500mg",
					dosage: "Twice daily after meals",
					quantity: "1 tablet",
					duration: "30 days",
				},
			],
			notes: "Monitor blood pressure and glucose levels regularly",
		},
		{
			id: "2",
			prescriptionDate: "2024-10-20",
			clinic: "City Clinic",
			department: "Cardiology",
			doctorName: "Dr. Suzuki",
			symptoms: "High blood pressure",
			medications: [
				{
					id: "m3",
					drugName: "Lisinopril",
					strength: "10mg",
					dosage: "Once daily in the morning",
					quantity: "1 tablet",
					duration: "30 days",
				},
			],
		},
		{
			id: "3",
			prescriptionDate: "2024-09-10",
			clinic: "Tokyo General Hospital",
			department: "Internal Medicine",
			medications: [
				{
					id: "m4",
					drugName: "Atorvastatin",
					strength: "20mg",
					dosage: "Once daily before bedtime",
					quantity: "1 tablet",
					duration: "30 days",
				},
			],
		},
	];

	const sortedPrescriptions = useMemo(() => {
		return [...mockPrescriptions].sort((a, b) => {
			const dateA = new Date(a.prescriptionDate).getTime();
			const dateB = new Date(b.prescriptionDate).getTime();
			return dateB - dateA;
		});
	}, []);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(locale, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
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
						<Pill size={20} style={{ color: doctorTheme.primary }} />
					</div>
					<h1
						className="text-2xl font-bold"
						style={{ color: doctorTheme.text }}
					>
						{t("dataOverview.prescriptions", { default: "Prescriptions" })}
					</h1>
					<p className="text-xs" style={{ color: doctorTheme.textSecondary }}>
						ID: {patientId}
					</p>
				</div>
				<p className="text-sm" style={{ color: doctorTheme.textSecondary }}>
					{t("doctor.prescriptionHistory", {
						default: "Patient's prescription history and current medications",
					})}
				</p>
			</div>

			{/* Prescriptions List */}
			{sortedPrescriptions.length === 0 ? (
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
						{t("medications.noPrescriptions", {
							default: "No prescriptions recorded",
						})}
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{sortedPrescriptions.map((prescription) => (
						<div
							key={prescription.id}
							className="rounded-xl border-2 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
							style={{
								backgroundColor: doctorTheme.surface,
								borderColor: `${doctorTheme.textSecondary}20`,
							}}
						>
							{/* Prescription Header */}
							<div
								className="px-4 py-3 border-b"
								style={{
									backgroundColor: `${doctorTheme.primary}10`,
									borderColor: `${doctorTheme.textSecondary}20`,
								}}
							>
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<Calendar
												size={16}
												style={{ color: doctorTheme.primary }}
											/>
											<span
												className="font-bold text-sm"
												style={{ color: doctorTheme.text }}
											>
												{formatDate(prescription.prescriptionDate)}
											</span>
										</div>
										<div className="flex items-center gap-2 mb-1">
											<MapPin
												size={14}
												style={{ color: doctorTheme.textSecondary }}
											/>
											<span
												className="text-sm font-medium"
												style={{ color: doctorTheme.text }}
											>
												{prescription.clinic}
											</span>
										</div>
										{prescription.department && (
											<div
												className="text-xs ml-5"
												style={{ color: doctorTheme.textSecondary }}
											>
												{prescription.department}
											</div>
										)}
										{prescription.doctorName && (
											<div className="flex items-center gap-2 mt-1 ml-5">
												<User
													size={12}
													style={{ color: doctorTheme.textSecondary }}
												/>
												<span
													className="text-xs"
													style={{ color: doctorTheme.textSecondary }}
												>
													{prescription.doctorName}
												</span>
											</div>
										)}
									</div>
								</div>

								{/* Symptoms */}
								{prescription.symptoms && (
									<div
										className="mt-3 pt-3 border-t"
										style={{ borderColor: `${doctorTheme.textSecondary}15` }}
									>
										<div
											className="text-xs font-medium mb-1"
											style={{ color: doctorTheme.textSecondary }}
										>
											{t("prescriptions.symptoms", {
												default: "Symptoms / Diagnosis",
											})}
										</div>
										<div
											className="text-sm"
											style={{ color: doctorTheme.text }}
										>
											{prescription.symptoms}
										</div>
									</div>
								)}
							</div>

							{/* Medications List */}
							<div className="px-4 py-3 space-y-3">
								{prescription.medications.map((medication, index) => (
									<div
										key={medication.id}
										className="pb-3 border-b last:border-b-0"
										style={{ borderColor: `${doctorTheme.textSecondary}10` }}
									>
										<div className="flex items-start justify-between mb-2">
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
														{index + 1}
													</span>
													<span
														className="font-semibold"
														style={{ color: doctorTheme.text }}
													>
														{medication.drugName}
													</span>
												</div>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs ml-8">
											<div>
												<span style={{ color: doctorTheme.textSecondary }}>
													{t("prescriptions.strength", { default: "Strength" })}
													:{" "}
												</span>
												<span
													className="font-medium"
													style={{ color: doctorTheme.text }}
												>
													{medication.strength}
												</span>
											</div>
											<div>
												<span style={{ color: doctorTheme.textSecondary }}>
													{t("prescriptions.quantity", { default: "Quantity" })}
													:{" "}
												</span>
												<span
													className="font-medium"
													style={{ color: doctorTheme.text }}
												>
													{medication.quantity}
												</span>
											</div>
											<div className="col-span-1 md:col-span-2">
												<span style={{ color: doctorTheme.textSecondary }}>
													{t("prescriptions.dosage", { default: "Dosage" })}:{" "}
												</span>
												<span
													className="font-medium"
													style={{ color: doctorTheme.text }}
												>
													{medication.dosage}
												</span>
											</div>
											{medication.duration && (
												<div className="col-span-1 md:col-span-2">
													<span style={{ color: doctorTheme.textSecondary }}>
														{t("prescriptions.duration", {
															default: "Duration",
														})}
														:{" "}
													</span>
													<span
														className="font-medium"
														style={{ color: doctorTheme.text }}
													>
														{medication.duration}
													</span>
												</div>
											)}
										</div>
									</div>
								))}
							</div>

							{/* Notes */}
							{prescription.notes && (
								<div
									className="px-4 py-3 border-t"
									style={{
										backgroundColor: `${doctorTheme.textSecondary}05`,
										borderColor: `${doctorTheme.textSecondary}20`,
									}}
								>
									<div
										className="text-xs font-medium mb-1"
										style={{ color: doctorTheme.textSecondary }}
									>
										{t("prescriptions.notes", { default: "Notes" })}
									</div>
									<div className="text-sm" style={{ color: doctorTheme.text }}>
										{prescription.notes}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
