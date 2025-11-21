"use client";

import { AlertTriangle, Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { AllergyForm } from "@/components/forms/AllergyForm";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";

/**
 * アレルギー一覧ページ
 * 登録されたアレルギーを一覧表示し、同一画面で追加も行う
 */
export default function AllergiesPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const searchParams = useSearchParams();
	const { allergies, settings } = useApp();
	const theme = getTheme(settings.theme);

	const [isAddOpen, setIsAddOpen] = useState(false);

	// URL の mode=add が付いている場合はフォームを開いた状態で表示
	useEffect(() => {
		setIsAddOpen(searchParams.get("mode") === "add");
	}, [searchParams]);

	// 発症日順にソート（新しい順）
	const sortedAllergies = useMemo(() => {
		return [...allergies].sort((a, b) => {
			const dateA = a.onsetDate ? new Date(a.onsetDate).getTime() : 0;
			const dateB = b.onsetDate ? new Date(b.onsetDate).getTime() : 0;
			return dateB - dateA;
		});
	}, [allergies]);

	const openAdd = () => {
		setIsAddOpen(true);
		const params = new URLSearchParams(searchParams.toString());
		params.set("mode", "add");
		router.replace(`/${locale}/app/allergies?${params.toString()}`);
	};

	const closeAdd = () => {
		setIsAddOpen(false);
		const params = new URLSearchParams(searchParams.toString());
		params.delete("mode");
		const query = params.toString();
		router.replace(`/${locale}/app/allergies${query ? `?${query}` : ""}`);
	};

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="mb-2 flex items-center justify-between md:mb-4">
				<h1
					className="text-xl font-bold md:text-2xl"
					style={{ color: theme.colors.text }}
				>
					{t("allergies.title")}
				</h1>
				<button
					onClick={openAdd}
					className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
					style={{ backgroundColor: theme.colors.primary }}
				>
					<Plus className="h-4 w-4" />
					{t("allergies.add")}
				</button>
			</div>

			{/* Allergies List */}
			{sortedAllergies.length === 0 ? (
				<div
					className="flex h-64 items-center justify-center rounded-lg"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<p style={{ color: theme.colors.textSecondary }}>
						{t("allergies.noAllergies")}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{sortedAllergies.map((allergy) => {
						const onsetDate = allergy.onsetDate
							? new Date(allergy.onsetDate).toLocaleDateString("ja-JP", {
									year: "numeric",
									month: "short",
									day: "numeric",
								})
							: null;

						const severityColor = {
							mild: "#FEF3C7",
							moderate: "#FDE68A",
							severe: "#FCD34D",
							"life-threatening": "#FCA5A5",
						}[allergy.severity];

						const severityTextColor = {
							mild: "#92400E",
							moderate: "#78350F",
							severe: "#713F12",
							"life-threatening": "#991B1B",
						}[allergy.severity];

						return (
							<div
								key={allergy.id}
								className="rounded-lg border-2 p-4"
								style={{
									backgroundColor: theme.colors.surface,
									borderColor: "#EF4444",
								}}
							>
								<div className="flex items-start gap-3">
									<AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-500" />
									<div className="flex-1">
										<div className="mb-1 flex items-center gap-2">
											<div
												className="font-semibold text-lg"
												style={{ color: theme.colors.text }}
											>
												{allergy.substance}
											</div>
											<span
												className="rounded px-2 py-0.5 text-xs font-medium"
												style={{
													backgroundColor: severityColor,
													color: severityTextColor,
												}}
											>
												{t(`allergies.severities.${allergy.severity}`)}
											</span>
										</div>
										{onsetDate && (
											<div
												className="mb-2 text-xs"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("allergies.onsetDate")}: {onsetDate}
											</div>
										)}
										{allergy.symptoms && (
											<div
												className="mb-2 text-sm"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("allergies.symptoms")}: {allergy.symptoms}
											</div>
										)}
										{allergy.diagnosedBy && (
											<div
												className="mb-1 text-xs"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("allergies.diagnosedBy")}: {allergy.diagnosedBy}
											</div>
										)}
										{allergy.notes && (
											<div
												className="mt-2 text-sm"
												style={{ color: theme.colors.textSecondary }}
											>
												{allergy.notes}
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Add Allergy Form (inline panel) */}
			{isAddOpen && (
				<div
					className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border-t bg-white p-4 shadow-lg md:static md:rounded-xl md:border md:p-6"
					style={{
						backgroundColor: theme.colors.background,
						borderColor: `${theme.colors.textSecondary}20`,
					}}
				>
					<div className="mb-4 flex items-center justify-between">
						<h2
							className="text-lg font-bold md:text-xl"
							style={{ color: theme.colors.text }}
						>
							{t("allergies.add")}
						</h2>
						<button
							type="button"
							onClick={closeAdd}
							className="rounded-full p-2"
							style={{ color: theme.colors.textSecondary }}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					<AllergyForm
						onSaved={() => {
							closeAdd();
						}}
						onCancel={closeAdd}
					/>
				</div>
			)}
		</div>
	);
}
