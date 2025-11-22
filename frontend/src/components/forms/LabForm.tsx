"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { useApp } from "@/contexts/AppContext";
import {
	getLabTestById,
	getLabTestsByCategory,
	type LabTestCategory,
	labTestDefinitions,
} from "@/lib/labTests";
import { getTheme } from "@/lib/themes";
import type { LabResult } from "@/types";

type LabFormProps = {
	onSaved?: (result: LabResult) => void;
	onCancel?: () => void;
};

// バリデーションスキーマ
const labFormSchema = z.object({
	selectedCategory: z.string(),
	selectedTestId: z.string().min(1, "検査項目を選択してください"),
	value: z
		.string()
		.min(1, "値を入力してください")
		.regex(/^-?\d+(\.\d+)?$/, "数値を入力してください"),
	testDate: z.string().min(1, "検査日を選択してください"),
	testedBy: z.string().optional(),
	notes: z.string().optional(),
});

type LabFormData = z.infer<typeof labFormSchema>;

export function LabForm({ onSaved, onCancel }: LabFormProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { settings, addLabResult } = useApp();
	const theme = getTheme(settings.theme);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<LabFormData>({
		resolver: zodResolver(labFormSchema),
		mode: "onBlur",
		defaultValues: {
			selectedCategory: "all",
			selectedTestId: "",
			value: "",
			testDate: new Date().toISOString().split("T")[0],
			testedBy: "",
			notes: "",
		},
	});

	const selectedCategory = watch("selectedCategory");
	const selectedTestId = watch("selectedTestId");

	const testsByCategory = useMemo(() => getLabTestsByCategory(), []);

	const availableTests = useMemo(() => {
		if (selectedCategory === "all") {
			return labTestDefinitions;
		}
		return testsByCategory[selectedCategory as LabTestCategory];
	}, [selectedCategory, testsByCategory]);

	const selectedTest = useMemo(() => {
		if (!selectedTestId) return null;
		return getLabTestById(selectedTestId);
	}, [selectedTestId]);

	const getCategoryLabel = (category: LabTestCategory): string => {
		const labels: Record<LabTestCategory, string> = {
			CBC: t("labs.categories.CBC"),
			electrolyte: t("labs.categories.electrolyte"),
			renal: t("labs.categories.renal"),
			glucose: t("labs.categories.glucose"),
			liver: t("labs.categories.liver"),
			inflammation: t("labs.categories.inflammation"),
			endocrine: t("labs.categories.endocrine"),
			urine: t("labs.categories.urine"),
		};
		return labels[category];
	};

	const getTestName = (testId: string): string => {
		const test = getLabTestById(testId);
		if (!test) return "";
		return locale === "ja" ? test.nameJa : test.nameEn;
	};

	const handleTestSelect = (testId: string) => {
		setValue("selectedTestId", testId);
		setValue("value", "");
	};

	const onSubmit = (data: LabFormData) => {
		const test = getLabTestById(data.selectedTestId);
		if (!test) return;

		const result: LabResult = {
			id: uuidv4(),
			testName: getTestName(data.selectedTestId),
			value: data.value,
			unit: test.unit,
			referenceRange: test.referenceRange,
			testDate: data.testDate,
			testedBy: data.testedBy || undefined,
			category: getCategoryLabel(test.category),
			notes: data.notes || undefined,
		};

		addLabResult(result);
		onSaved?.(result);
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="space-y-4 md:max-w-2xl md:mx-auto"
		>
			{/* カテゴリ選択 */}
			<div>
				<div
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.category")} *
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => {
							setValue("selectedCategory", "all");
							setValue("selectedTestId", "");
						}}
						className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
							selectedCategory === "all" ? "text-white" : "border-2"
						}`}
						style={
							selectedCategory === "all"
								? { backgroundColor: theme.colors.primary }
								: {
										borderColor: `${theme.colors.textSecondary}40`,
										color: theme.colors.text,
									}
						}
					>
						{t("labs.allCategories")}
					</button>
					{(
						[
							"CBC",
							"electrolyte",
							"renal",
							"glucose",
							"liver",
							"inflammation",
							"endocrine",
							"urine",
						] as LabTestCategory[]
					).map((category) => (
						<button
							type="button"
							key={category}
							onClick={() => {
								setValue("selectedCategory", category);
								setValue("selectedTestId", "");
							}}
							className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
								selectedCategory === category ? "text-white" : "border-2"
							}`}
							style={
								selectedCategory === category
									? { backgroundColor: theme.colors.primary }
									: {
											borderColor: `${theme.colors.textSecondary}40`,
											color: theme.colors.text,
										}
							}
						>
							{getCategoryLabel(category)}
						</button>
					))}
				</div>
			</div>

			{/* 検査項目選択 */}
			<div>
				<label
					htmlFor="selectedTestId"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.testName")} *
				</label>
				<select
					id="selectedTestId"
					{...register("selectedTestId")}
					onChange={(e) => handleTestSelect(e.target.value)}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.selectedTestId
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				>
					<option value="">{t("labs.selectTest")}</option>
					{availableTests.map((test) => (
						<option key={test.id} value={test.id}>
							{locale === "ja" ? test.nameJa : test.nameEn} ({test.id})
						</option>
					))}
				</select>
				{errors.selectedTestId && (
					<p className="mt-1 text-sm text-red-500">
						{errors.selectedTestId.message}
					</p>
				)}
			</div>

			{/* 選択された検査項目の情報表示 */}
			{selectedTest && (
				<div
					className="rounded-lg border-2 p-4"
					style={{
						backgroundColor: `${theme.colors.primary}10`,
						borderColor: theme.colors.primary,
					}}
				>
					<div
						className="mb-2 text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("labs.referenceRange")}: {selectedTest.referenceRange}
					</div>
					<div
						className="text-xs"
						style={{ color: theme.colors.textSecondary }}
					>
						{t("labs.unit")}: {selectedTest.unit}
					</div>
					{selectedTest.notes && (
						<div
							className="mt-2 text-xs"
							style={{ color: theme.colors.textSecondary }}
						>
							{selectedTest.notes}
						</div>
					)}
				</div>
			)}

			{/* 値入力 */}
			<div>
				<label
					htmlFor="value"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.value")} *
					{selectedTest && (
						<span
							className="ml-2 text-xs"
							style={{ color: theme.colors.textSecondary }}
						>
							({selectedTest.unit})
						</span>
					)}
				</label>
				<input
					id="value"
					type="text"
					{...register("value")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.value
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("labs.valuePlaceholder")}
				/>
				{errors.value && (
					<p className="mt-1 text-sm text-red-500">{errors.value.message}</p>
				)}
			</div>

			{/* 検査日 */}
			<div>
				<label
					htmlFor="testDate"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.testDate")} *
				</label>
				<input
					id="testDate"
					type="date"
					{...register("testDate")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: errors.testDate
							? "#ef4444"
							: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				/>
				{errors.testDate && (
					<p className="mt-1 text-sm text-red-500">{errors.testDate.message}</p>
				)}
			</div>

			{/* 検査機関 */}
			<div>
				<label
					htmlFor="testedBy"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.testedBy")}
				</label>
				<input
					id="testedBy"
					type="text"
					{...register("testedBy")}
					className="w-full rounded-lg border p-3"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("labs.testedBy")}
				/>
			</div>

			{/* メモ */}
			<div>
				<label
					htmlFor="notes"
					className="mb-1 block text-sm font-medium"
					style={{ color: theme.colors.text }}
				>
					{t("labs.notes")}
				</label>
				<textarea
					id="notes"
					{...register("notes")}
					className="w-full rounded-lg border p-3"
					rows={3}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					placeholder={t("labs.notes")}
				/>
			</div>

			<div className="flex gap-3 pt-4">
				<button
					type="button"
					onClick={onCancel}
					className="flex-1 rounded-lg border-2 p-3 font-medium transition-colors"
					style={{
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
				>
					{t("actions.cancel")}
				</button>
				<button
					type="submit"
					disabled={isSubmitting}
					className="flex-1 rounded-lg p-3 font-medium text-white transition-colors disabled:opacity-50"
					style={{ backgroundColor: theme.colors.primary }}
				>
					{isSubmitting ? t("actions.saving") : t("actions.save")}
				</button>
			</div>
		</form>
	);
}
