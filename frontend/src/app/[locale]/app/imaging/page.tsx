"use client";

import { Plus, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ImagingForm } from "@/components/forms/ImagingForm";
import { ImagingImageViewer } from "@/components/ImagingImageViewer";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";

/**
 * 画像レポート一覧ページ
 * 登録された画像レポートを一覧表示し、同一画面で追加も行う
 */
export default function ImagingPage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const searchParams = useSearchParams();
	const { imagingReports, settings } = useApp();
	const theme = getTheme(settings.theme);

	const [isAddOpen, setIsAddOpen] = useState(false);

	useEffect(() => {
		setIsAddOpen(searchParams.get("mode") === "add");
	}, [searchParams]);

	// 検査日順にソート（新しい順）
	const sortedReports = useMemo(() => {
		return [...imagingReports].sort((a, b) => {
			const dateA = new Date(a.examDate).getTime();
			const dateB = new Date(b.examDate).getTime();
			return dateB - dateA;
		});
	}, [imagingReports]);

	const openAdd = () => {
		setIsAddOpen(true);
		const params = new URLSearchParams(searchParams.toString());
		params.set("mode", "add");
		router.replace(`/${locale}/app/imaging?${params.toString()}`);
	};

	const closeAdd = () => {
		setIsAddOpen(false);
		const params = new URLSearchParams(searchParams.toString());
		params.delete("mode");
		const query = params.toString();
		router.replace(`/${locale}/app/imaging${query ? `?${query}` : ""}`);
	};

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h1
						className="text-xl font-bold md:text-2xl"
						style={{ color: theme.colors.text }}
					>
						{t("imaging.title")}
					</h1>
					<p
						className="mt-1 text-sm"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("imaging.description")}
					</p>
				</div>
				<button
					type="button"
					onClick={openAdd}
					className="flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
					style={{ backgroundColor: theme.colors.primary }}
				>
					<Plus className="h-4 w-4" />
					{t("imaging.add")}
				</button>
			</div>

			{/* Reports List */}
			{sortedReports.length === 0 ? (
				<div
					className="flex h-64 items-center justify-center rounded-lg"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<p style={{ color: theme.colors.textSecondary }}>
						{t("imaging.noReports")}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{sortedReports.map((report) => {
						const examDate = new Date(report.examDate).toLocaleDateString(
							"ja-JP",
							{
								year: "numeric",
								month: "short",
								day: "numeric",
							},
						);

						return (
							<div
								key={report.id}
								className="rounded-lg border-2 p-4"
								style={{
									backgroundColor: theme.colors.surface,
									borderColor: `${theme.colors.textSecondary}40`,
								}}
							>
								<div className="flex items-start gap-4">
									{/* Image Thumbnail */}
									{report.imageObjectUrl && (
										<div className="flex-shrink-0">
											<ImagingImageViewer
												blobId={report.imageObjectUrl}
												alt={`${t(`imaging.types.${report.type}`)} - ${report.bodyPart || ""}`}
												mode="thumbnail"
												className="w-32 h-32"
											/>
										</div>
									)}

									{/* Report Details */}
									<div className="flex-1">
										<div className="mb-2 flex items-center gap-2">
											<div
												className="font-semibold text-lg"
												style={{ color: theme.colors.text }}
											>
												{t(`imaging.types.${report.type}`)}
											</div>
											{report.bodyPart && (
												<span
													className="rounded px-2 py-0.5 text-xs"
													style={{
														backgroundColor: `${theme.colors.primary}20`,
														color: theme.colors.primary,
													}}
												>
													{report.bodyPart}
												</span>
											)}
										</div>
										<div
											className="mb-2 text-xs"
											style={{ color: theme.colors.textSecondary }}
										>
											{t("imaging.examDate")}: {examDate}
										</div>
										{report.performedBy && (
											<div
												className="mb-2 text-xs"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("imaging.performedBy")}: {report.performedBy}
											</div>
										)}
										<div
											className="mb-2 text-sm font-medium"
											style={{ color: theme.colors.text }}
										>
											{t("imaging.summary")}: {report.summary}
										</div>
										{report.findings && (
											<div
												className="mb-2 text-sm"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("imaging.findings")}: {report.findings}
											</div>
										)}
										{report.impression && (
											<div
												className="mt-2 text-sm"
												style={{ color: theme.colors.textSecondary }}
											>
												{t("imaging.impression")}: {report.impression}
											</div>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Add Imaging Form (inline panel) */}
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
							{t("imaging.add")}
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
					<ImagingForm
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
