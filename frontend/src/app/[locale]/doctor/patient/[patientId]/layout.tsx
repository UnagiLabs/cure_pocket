"use client";

import { Eye, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { use } from "react";

interface DoctorPatientLayoutProps {
	children: React.ReactNode;
	params: Promise<{ patientId: string }>;
}

export default function DoctorPatientLayout({
	children,
	params,
}: DoctorPatientLayoutProps) {
	const t = useTranslations();
	const { patientId } = use(params);

	// 医師向けテーマカラー（青系）
	const doctorTheme = {
		primary: "#2563EB", // Blue-600
		secondary: "#3B82F6", // Blue-500
		accent: "#60A5FA", // Blue-400
		background: "#F8FAFC", // Slate-50
		surface: "#FFFFFF",
		text: "#0F172A", // Slate-900
		textSecondary: "#64748B", // Slate-500
	};

	return (
		<div
			className="relative min-h-screen w-full"
			style={{
				backgroundColor: doctorTheme.background,
				color: doctorTheme.text,
			}}
		>
			{/* Doctor View Header */}
			<header
				className="sticky top-0 z-50 border-b backdrop-blur-sm"
				style={{
					backgroundColor: `${doctorTheme.surface}f5`,
					borderColor: `${doctorTheme.textSecondary}20`,
				}}
			>
				<div className="mx-auto max-w-7xl px-4 md:px-8 py-4">
					<div className="flex items-center justify-between gap-4">
						{/* Left section */}
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-3">
								<div
									className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
									style={{
										backgroundImage: `linear-gradient(to top right, ${doctorTheme.primary}, ${doctorTheme.secondary})`,
									}}
								>
									<Eye size={20} />
								</div>
								<div>
									<h1
										className="text-lg md:text-xl font-bold"
										style={{ color: doctorTheme.text }}
									>
										{t("doctor.patientView", { default: "Patient View" })}
									</h1>
									<p
										className="text-xs md:text-sm"
										style={{ color: doctorTheme.textSecondary }}
									>
										{t("doctor.patientId", { default: "Patient ID" })}:{" "}
										{patientId.slice(0, 8)}...
									</p>
								</div>
							</div>
						</div>

						{/* Right section - Doctor View Badge */}
						<div className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
							<ShieldCheck size={16} className="text-blue-600" />
							<span className="text-xs md:text-sm font-semibold text-blue-700">
								{t("doctor.badge", { default: "Doctor View" })}
							</span>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="mx-auto max-w-7xl">{children}</main>

			{/* Footer */}
			<footer
				className="mt-12 border-t py-6"
				style={{ borderColor: `${doctorTheme.textSecondary}20` }}
			>
				<div className="mx-auto max-w-7xl px-4 md:px-8">
					<div className="flex flex-col md:flex-row items-center justify-between gap-4">
						<p
							className="text-xs text-center md:text-left"
							style={{ color: doctorTheme.textSecondary }}
						>
							{t("doctor.confidentialNotice", {
								default:
									"This information is confidential and protected by medical privacy laws.",
							})}
						</p>
						<div className="flex items-center gap-2 text-xs">
							<ShieldCheck
								size={14}
								style={{ color: doctorTheme.textSecondary }}
							/>
							<span style={{ color: doctorTheme.textSecondary }}>
								{t("doctor.encryptedConnection", {
									default: "Encrypted Connection",
								})}
							</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
