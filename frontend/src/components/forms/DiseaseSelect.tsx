"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
	allChronicConditions,
	chronicConditionCategories,
} from "@/lib/chronicConditions";
import type { ChronicCondition } from "@/types";

type DiseaseSelectProps = {
	onSelect: (condition: { label: string; icd10Code?: string }) => void;
	initialChapterId?: string;
};

export function DiseaseSelect({
	onSelect,
	initialChapterId,
}: DiseaseSelectProps) {
	const t = useTranslations("conditions");
	const [chapterId, setChapterId] = useState<string>(
		initialChapterId || chronicConditionCategories[0]?.id || "",
	);
	const [query, setQuery] = useState("");

	const chapterOptions = useMemo(
		() =>
			chronicConditionCategories.map((category) => ({
				id: category.id,
			})),
		[],
	);

	const filteredConditions = useMemo(() => {
		const lower = query.trim().toLowerCase();
		const base =
			chronicConditionCategories.find((c) => c.id === chapterId)?.conditions ??
			allChronicConditions;

		if (!lower) return base;

		return base.filter((cond: ChronicCondition) =>
			cond.label.toLowerCase().includes(lower),
		);
	}, [chapterId, query]);

	return (
		<div className="space-y-2">
			<div className="grid gap-2 md:grid-cols-2">
				<div>
					<label
						htmlFor="disease-chapter"
						className="mb-1 block text-xs font-medium"
					>
						{t("fields.chapter")}
					</label>
					<select
						id="disease-chapter"
						value={chapterId}
						onChange={(e) => setChapterId(e.target.value)}
						className="w-full rounded-lg border p-2 text-sm"
					>
						{chapterOptions.map((chapter) => (
							<option key={chapter.id} value={chapter.id}>
								{t(`chapters.${chapter.id}`)}
							</option>
						))}
					</select>
				</div>
				<div>
					<label
						htmlFor="disease-search"
						className="mb-1 block text-xs font-medium"
					>
						{t("fields.search")}
					</label>
					<input
						id="disease-search"
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={t("fields.searchPlaceholder")}
						className="w-full rounded-lg border p-2 text-sm"
					/>
				</div>
			</div>

			<div className="max-h-40 overflow-y-auto rounded-lg border p-2 text-sm">
				{filteredConditions.length === 0 ? (
					<p className="text-xs text-gray-500">{t("fields.noMatch")}</p>
				) : (
					<ul className="space-y-1">
						{filteredConditions.map((condition) => (
							<li key={`${condition.label}-${condition.code ?? ""}`}>
								<button
									type="button"
									onClick={() =>
										onSelect({
											label: condition.label,
											icd10Code: condition.code,
										})
									}
									className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-gray-100"
								>
									<span>
										{t(`conditionNames.${condition.label}`, {
											fallback: condition.label,
										})}
									</span>
									{condition.code && (
										<span className="text-xs text-gray-500">
											ICD-10: {condition.code}
										</span>
									)}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
