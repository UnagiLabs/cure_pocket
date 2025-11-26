"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

interface DoctorPatientLayoutProps {
	children: React.ReactNode;
}

export default function DoctorPatientLayout({
	children,
}: DoctorPatientLayoutProps) {
	const t = useTranslations();

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
