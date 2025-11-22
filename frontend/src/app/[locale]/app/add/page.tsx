"use client";

import {
	Activity,
	AlertTriangle,
	Droplet,
	FileText,
	FlaskConical,
	Heart,
	Package,
	Scan,
	Thermometer,
	Weight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";

/**
 * データタイプ選択画面
 * バイタル・薬・アレルギー・病歴・検査値・画像レポートの追加方法を選択
 */
export default function AddDataPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const { settings } = useApp();
	const theme = getTheme(settings.theme);
	const [showVitals, setShowVitals] = useState(false);

	const vitalTypes = [
		{
			id: "blood-pressure",
			icon: Heart,
			title: t("vitals.bloodPressure"),
			description: t("add.bloodPressureAdd"),
			route: `/${locale}/app/vitals?type=blood-pressure`,
			color: "#EF4444",
		},
		{
			id: "blood-glucose",
			icon: Droplet,
			title: t("vitals.bloodGlucose"),
			description: t("add.bloodGlucoseAdd"),
			route: `/${locale}/app/vitals?type=blood-glucose`,
			color: "#F59E0B",
		},
		{
			id: "temperature",
			icon: Thermometer,
			title: t("vitals.temperature"),
			description: t("add.temperatureAdd"),
			route: `/${locale}/app/vitals?type=temperature`,
			color: "#10B981",
		},
		{
			id: "weight",
			icon: Weight,
			title: t("vitals.weight"),
			description: t("add.weightAdd"),
			route: `/${locale}/app/vitals?type=weight`,
			color: "#3B82F6",
		},
	];

	const dataTypes = [
		{
			id: "vitals",
			icon: Activity,
			title: t("tabs.vitals"),
			description: t("add.vitalsDescription"),
			isParent: true,
			color: "#8B5CF6",
		},
		{
			id: "medication",
			icon: Package,
			title: t("dataTypes.medication"),
			description: t("add.manualDescription"),
			route: `/${locale}/app/medications`,
			color: theme.colors.primary,
		},
		{
			id: "allergy",
			icon: AlertTriangle,
			title: t("dataTypes.allergy"),
			description: t("allergies.add"),
			route: `/${locale}/app/add/allergy`,
			color: "#EF4444",
		},
		{
			id: "history",
			icon: FileText,
			title: t("dataTypes.history"),
			description: t("histories.add"),
			route: `/${locale}/app/add/history`,
			color: "#8B5CF6",
		},
		{
			id: "lab",
			icon: FlaskConical,
			title: t("dataTypes.lab"),
			description: t("labs.add"),
			route: `/${locale}/app/add/lab`,
			color: "#10B981",
		},
		{
			id: "imaging",
			icon: Scan,
			title: t("dataTypes.imaging"),
			description: t("imaging.add"),
			route: `/${locale}/app/add/imaging`,
			color: "#3B82F6",
		},
	];

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 pb-24 lg:pb-8">
			{/* Header - Hide on desktop as it's shown in top bar */}
			<div className="lg:hidden mb-6">
				<h1
					className="text-xl font-bold"
					style={{ color: theme.colors.text }}
				>
					{t("tabs.addNew")}
				</h1>
			</div>

			{showVitals ? (
				<>
					{/* Back Button */}
					<button
						type="button"
						onClick={() => setShowVitals(false)}
						className="mb-4 flex items-center gap-2 text-sm font-medium"
						style={{ color: theme.colors.primary }}
					>
						← {t("tabs.addNew")}
					</button>

					{/* Vitals Grid */}
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
						{vitalTypes.map((vital) => {
							const Icon = vital.icon;
							return (
								<button
									type="button"
									key={vital.id}
									onClick={() => router.push(vital.route)}
									className="w-full rounded-xl p-6 shadow-sm transition-transform active:scale-95 hover:shadow-md"
									style={{ backgroundColor: theme.colors.surface }}
								>
									<div className="flex flex-col items-center text-center">
										<div
											className="mb-3 rounded-full p-4"
											style={{ backgroundColor: `${vital.color}20` }}
										>
											<Icon
												className="h-10 w-10"
												style={{ color: vital.color }}
											/>
										</div>
										<div
											className="mb-1 font-bold text-lg"
											style={{ color: theme.colors.text }}
										>
											{vital.title}
										</div>
										<div
											className="text-sm"
											style={{ color: theme.colors.textSecondary }}
										>
											{vital.description}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</>
			) : (
				<>
					{/* Main Data Types Grid */}
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
						{dataTypes.map((dataType) => {
							const Icon = dataType.icon;
							return (
								<button
									type="button"
									key={dataType.id}
									onClick={() => {
										if (dataType.isParent) {
											setShowVitals(true);
										} else if (dataType.route) {
											router.push(dataType.route);
										}
									}}
									className="w-full rounded-xl p-6 shadow-sm transition-transform active:scale-95 md:p-8 hover:shadow-md"
									style={{ backgroundColor: theme.colors.surface }}
								>
									<div className="flex items-center md:flex-col md:text-center">
										<div
											className="mr-4 rounded-full p-3 md:mr-0 md:mb-3"
											style={{ backgroundColor: `${dataType.color}20` }}
										>
											<Icon
												className="h-8 w-8 md:h-12 md:w-12"
												style={{ color: dataType.color }}
											/>
										</div>
										<div className="flex-1 text-left md:text-center">
											<div
												className="mb-1 font-bold md:text-lg"
												style={{ color: theme.colors.text }}
											>
												{dataType.title}
											</div>
											<div
												className="text-sm md:text-base"
												style={{ color: theme.colors.textSecondary }}
											>
												{dataType.description}
											</div>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
