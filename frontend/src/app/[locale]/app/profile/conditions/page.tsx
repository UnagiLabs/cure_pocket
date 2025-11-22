"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { Check, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { DiseaseSelect } from "@/components/forms/DiseaseSelect";
import { useApp } from "@/contexts/AppContext";
import { useCheckDataEntryExists } from "@/hooks/useCheckDataEntryExists";
import {
	type HealthDataTypes,
	useEncryptAndStore,
} from "@/hooks/useEncryptAndStore";
import { usePassport } from "@/hooks/usePassport";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import {
	historiesToConditions,
	profileToBasicProfile,
} from "@/lib/profileConverter";
import { generateSealId } from "@/lib/sealIdGenerator";
import { getTheme } from "@/lib/themes";
import type { AgeBand, MedicalHistory, PatientProfile } from "@/types";

function birthDateToAgeBand(birthDate: string | null): AgeBand | null {
	if (!birthDate) return null;
	const birthYear = new Date(birthDate).getFullYear();
	const currentYear = new Date().getFullYear();
	const age = currentYear - birthYear;

	if (age < 10) return null;
	if (age < 20) return "10s";
	if (age < 30) return "20s";
	if (age < 40) return "30s";
	if (age < 50) return "40s";
	if (age < 60) return "50s";
	if (age < 70) return "60s";
	if (age < 80) return "70s";
	return "80plus";
}

type ConditionField =
	| "diagnosis"
	| "diagnosisDate"
	| "resolvedDate"
	| "icd10Code"
	| "notes";

export default function ConditionsPage() {
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations("conditions");
	const currentAccount = useCurrentAccount();
	const {
		settings,
		profile,
		updateProfile,
		medicalHistories,
		setMedicalHistories,
		allergies,
	} = useApp();
	const theme = useMemo(() => getTheme(settings.theme), [settings.theme]);

	const { passport, has_passport } = usePassport();
	const {
		encryptAndStoreMultiple,
		isEncrypting,
		progress,
		error: _encryptError,
	} = useEncryptAndStore();
	const {
		updateMultiplePassportData,
		isUpdating,
		error: _updateError,
	} = useUpdatePassportData();
	const { checkExists } = useCheckDataEntryExists();

	const [isSaving, setIsSaving] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [conditionEntries, setConditionEntries] = useState<MedicalHistory[]>(
		[],
	);

	const otherHistories = useMemo(
		() => medicalHistories.filter((history) => history.type !== "condition"),
		[medicalHistories],
	);

	useEffect(() => {
		const conditionHistories = medicalHistories.filter(
			(history) => history.type === "condition",
		);
		if (conditionHistories.length === 0) {
			setConditionEntries([
				{
					id: uuidv4(),
					type: "condition",
					diagnosis: "",
					status: "resolved",
				},
				{
					id: uuidv4(),
					type: "condition",
					diagnosis: "",
					status: "active",
				},
			]);
		} else {
			setConditionEntries(conditionHistories);
		}
	}, [medicalHistories]);

	const addCondition = (status: "active" | "resolved") => {
		setConditionEntries((prev) => [
			...prev,
			{
				id: uuidv4(),
				type: "condition",
				diagnosis: "",
				status,
			},
		]);
	};

	const updateCondition = (
		id: string,
		field: ConditionField,
		value: string | undefined,
	) => {
		setConditionEntries((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, [field]: value || undefined } : item,
			),
		);
	};

	const removeCondition = (id: string) => {
		setConditionEntries((prev) => prev.filter((item) => item.id !== id));
	};

	const buildProfileForSave = (): PatientProfile => {
		const birthDate = profile?.birthDate ?? null;
		const defaultDataSharing = {
			preference: "deny" as const,
			shareMedication: false,
			shareLabs: false,
			shareConditions: false,
			shareSurgeries: false,
			shareLifestyle: false,
			rewardsEnabled: false,
		};

		return {
			name: profile?.name,
			birthDate,
			ageBand: profile?.ageBand ?? birthDateToAgeBand(birthDate),
			gender: profile?.gender ?? "unknown",
			country: profile?.country ?? null,
			preferredLanguage: profile?.preferredLanguage ?? locale,
			bloodType: profile?.bloodType,
			heightCm: profile?.heightCm,
			weightKg: profile?.weightKg,
			smokingStatus: profile?.smokingStatus ?? "unknown",
			alcoholUse: profile?.alcoholUse ?? "unknown",
			exercise: profile?.exercise ?? "unknown",
			drugAllergies: profile?.drugAllergies ?? [],
			foodAllergies: profile?.foodAllergies ?? [],
			hasAnaphylaxisHistory: profile?.hasAnaphylaxisHistory ?? null,
			chronicConditions: profile?.chronicConditions ?? [],
			surgeries: profile?.surgeries ?? [],
			emergencyContact: profile?.emergencyContact,
			dataSharing: profile?.dataSharing ?? defaultDataSharing,
			updatedAt: new Date().toISOString(),
		};
	};

	const handleSave = async (skipConditions = false) => {
		setIsSaving(true);
		setSaveError(null);

		try {
			if (!currentAccount?.address) {
				throw new Error(t("errors.wallet"));
			}

			if (!has_passport || !passport) {
				throw new Error(t("errors.passport"));
			}

			const cleanedConditions = conditionEntries
				.filter((item) => item.diagnosis.trim())
				.map((item) => ({
					...item,
					diagnosisDate: item.diagnosisDate || undefined,
					resolvedDate: item.resolvedDate || undefined,
					icd10Code: item.icd10Code || undefined,
					notes: item.notes || undefined,
					status: item.status || "active",
				}));

			const historiesToSave = skipConditions
				? medicalHistories
				: [...otherHistories, ...cleanedConditions];

			const profileToSave = buildProfileForSave();

			// Step 1: 保存するデータ型を準備
			const dataItems: Array<{
				data: HealthDataTypes;
				dataType: "basic_profile" | "conditions";
			}> = [];

			// basic_profile は常に保存
			const basicProfileData = profileToBasicProfile(
				profileToSave,
				allergies,
				locale,
			);
			dataItems.push({
				data: basicProfileData,
				dataType: "basic_profile",
			});

			// conditions データがある場合のみ追加
			if (!skipConditions && cleanedConditions.length > 0) {
				const conditionsData = historiesToConditions(
					profileToSave,
					cleanedConditions,
					locale,
				);
				dataItems.push({
					data: conditionsData,
					dataType: "conditions",
				});
			}

			// Step 2: 並列暗号化とアップロード
			const sealId = await generateSealId(currentAccount.address);
			const encryptionResults = await encryptAndStoreMultiple(
				dataItems,
				sealId,
			);

			// Step 3: 各データ型のオンチェーン存在チェック
			const dataEntries = await Promise.all(
				encryptionResults.map(async (result) => {
					const exists = await checkExists(passport.id, result.dataType);
					return {
						dataType: result.dataType,
						blobIds: [result.blobId],
						replace: exists,
					};
				}),
			);

			// Step 4: 1トランザクションで全データ型を登録
			await updateMultiplePassportData({
				passportId: passport.id,
				dataEntries,
			});

			updateProfile(profileToSave);
			setMedicalHistories(historiesToSave);
			setShowSuccess(true);

			if (skipConditions) {
				router.push(`/${locale}/app`);
			} else {
				setTimeout(() => setShowSuccess(false), 3000);
			}
		} catch (error) {
			console.error("[ConditionSave] Failed to save conditions:", error);
			const errorMessage =
				error instanceof Error ? error.message : t("errors.saveFailed");
			setSaveError(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="p-4 pb-24 md:pb-10 md:p-6 space-y-6">
			<h1
				className="text-xl font-bold md:text-2xl"
				style={{ color: theme.colors.text }}
			>
				{t("title")}
			</h1>
			<p className="text-sm" style={{ color: theme.colors.textSecondary }}>
				{t("description")}
			</p>

			<div className="space-y-4">
				<section
					className="rounded-xl p-4 shadow-sm md:p-6 space-y-4"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<div className="flex items-center justify-between">
						<div>
							<h2
								className="text-lg font-semibold md:text-xl"
								style={{ color: theme.colors.text }}
							>
								{t("resolved.title")}
							</h2>
							<p
								className="text-sm"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("resolved.description")}
							</p>
						</div>
						<button
							type="button"
							onClick={() => addCondition("resolved")}
							className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
							style={{ backgroundColor: theme.colors.primary }}
						>
							<Plus className="h-4 w-4" />
							{t("add")}
						</button>
					</div>

					<div className="space-y-3">
						{conditionEntries
							.filter((entry) => entry.status === "resolved")
							.map((entry) => (
								<div
									key={entry.id}
									className="rounded-lg border p-3 md:p-4 space-y-3"
									style={{ borderColor: `${theme.colors.textSecondary}30` }}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 space-y-3">
											<DiseaseSelect
												onSelect={(condition) => {
													updateCondition(
														entry.id,
														"diagnosis",
														condition.label,
													);
													updateCondition(
														entry.id,
														"icd10Code",
														condition.icd10Code || "",
													);
												}}
											/>
											<input
												type="text"
												value={entry.diagnosis}
												onChange={(e) =>
													updateCondition(entry.id, "diagnosis", e.target.value)
												}
												placeholder={t("fields.diagnosisPlaceholder")}
												className="w-full rounded-lg border p-3 text-sm"
												style={{
													backgroundColor: theme.colors.background,
													borderColor: `${theme.colors.textSecondary}40`,
													color: theme.colors.text,
												}}
											/>
											<div className="grid gap-3 md:grid-cols-3">
												<div>
													<label
														htmlFor={`resolved-icd-${entry.id}`}
														className="mb-1 block text-xs font-medium"
														style={{ color: theme.colors.text }}
													>
														{t("fields.icd10")}
													</label>
													<input
														id={`resolved-icd-${entry.id}`}
														type="text"
														value={entry.icd10Code || ""}
														onChange={(e) =>
															updateCondition(
																entry.id,
																"icd10Code",
																e.target.value,
															)
														}
														className="w-full rounded-lg border p-2 text-sm"
														style={{
															backgroundColor: theme.colors.background,
															borderColor: `${theme.colors.textSecondary}40`,
															color: theme.colors.text,
														}}
														placeholder={t("fields.icdExample")}
													/>
												</div>
												<div>
													<label
														htmlFor={`resolved-onset-${entry.id}`}
														className="mb-1 block text-xs font-medium"
														style={{ color: theme.colors.text }}
													>
														{t("fields.onset")}
													</label>
													<input
														id={`resolved-onset-${entry.id}`}
														type="date"
														value={entry.diagnosisDate || ""}
														onChange={(e) =>
															updateCondition(
																entry.id,
																"diagnosisDate",
																e.target.value,
															)
														}
														lang={locale}
														className="w-full rounded-lg border p-2 text-sm"
														style={{
															backgroundColor: theme.colors.background,
															borderColor: `${theme.colors.textSecondary}40`,
															color: theme.colors.text,
														}}
													/>
												</div>
												<div>
													<label
														htmlFor={`resolved-complete-${entry.id}`}
														className="mb-1 block text-xs font-medium"
														style={{ color: theme.colors.text }}
													>
														{t("fields.resolved")}
													</label>
													<input
														id={`resolved-complete-${entry.id}`}
														type="date"
														value={entry.resolvedDate || ""}
														onChange={(e) =>
															updateCondition(
																entry.id,
																"resolvedDate",
																e.target.value,
															)
														}
														lang={locale}
														className="w-full rounded-lg border p-2 text-sm"
														style={{
															backgroundColor: theme.colors.background,
															borderColor: `${theme.colors.textSecondary}40`,
															color: theme.colors.text,
														}}
													/>
												</div>
											</div>
											<textarea
												value={entry.notes || ""}
												onChange={(e) =>
													updateCondition(entry.id, "notes", e.target.value)
												}
												className="w-full rounded-lg border p-3 text-sm"
												rows={2}
												style={{
													backgroundColor: theme.colors.background,
													borderColor: `${theme.colors.textSecondary}40`,
													color: theme.colors.text,
												}}
												placeholder={t("fields.notesPlaceholder")}
											/>
										</div>
										<button
											type="button"
											onClick={() => removeCondition(entry.id)}
											className="rounded-full p-2"
											style={{ color: theme.colors.textSecondary }}
										>
											<X className="h-5 w-5" />
										</button>
									</div>
								</div>
							))}
					</div>
				</section>

				<section
					className="rounded-xl p-4 shadow-sm md:p-6 space-y-4"
					style={{ backgroundColor: theme.colors.surface }}
				>
					<div className="flex items-center justify-between">
						<div>
							<h2
								className="text-lg font-semibold md:text-xl"
								style={{ color: theme.colors.text }}
							>
								{t("active.title")}
							</h2>
							<p
								className="text-sm"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("active.description")}
							</p>
						</div>
						<button
							type="button"
							onClick={() => addCondition("active")}
							className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white"
							style={{ backgroundColor: theme.colors.primary }}
						>
							<Plus className="h-4 w-4" />
							{t("add")}
						</button>
					</div>

					<div className="space-y-3">
						{conditionEntries
							.filter((entry) => entry.status !== "resolved")
							.map((entry) => (
								<div
									key={entry.id}
									className="rounded-lg border p-3 md:p-4 space-y-3"
									style={{ borderColor: `${theme.colors.textSecondary}30` }}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 space-y-3">
											<DiseaseSelect
												onSelect={(condition) => {
													updateCondition(
														entry.id,
														"diagnosis",
														condition.label,
													);
													updateCondition(
														entry.id,
														"icd10Code",
														condition.icd10Code || "",
													);
												}}
											/>
											<input
												type="text"
												value={entry.diagnosis}
												onChange={(e) =>
													updateCondition(entry.id, "diagnosis", e.target.value)
												}
												placeholder={t("fields.diagnosisPlaceholder")}
												className="w-full rounded-lg border p-3 text-sm"
												style={{
													backgroundColor: theme.colors.background,
													borderColor: `${theme.colors.textSecondary}40`,
													color: theme.colors.text,
												}}
											/>
											<div className="grid gap-3 md:grid-cols-3">
												<div>
													<label
														htmlFor={`active-icd-${entry.id}`}
														className="mb-1 block text-xs font-medium"
														style={{ color: theme.colors.text }}
													>
														{t("fields.icd10")}
													</label>
													<input
														id={`active-icd-${entry.id}`}
														type="text"
														value={entry.icd10Code || ""}
														onChange={(e) =>
															updateCondition(
																entry.id,
																"icd10Code",
																e.target.value,
															)
														}
														className="w-full rounded-lg border p-2 text-sm"
														style={{
															backgroundColor: theme.colors.background,
															borderColor: `${theme.colors.textSecondary}40`,
															color: theme.colors.text,
														}}
														placeholder={t("fields.icdExampleActive")}
													/>
												</div>
												<div>
													<label
														htmlFor={`active-onset-${entry.id}`}
														className="mb-1 block text-xs font-medium"
														style={{ color: theme.colors.text }}
													>
														{t("fields.onset")}
													</label>
													<input
														id={`active-onset-${entry.id}`}
														type="date"
														value={entry.diagnosisDate || ""}
														onChange={(e) =>
															updateCondition(
																entry.id,
																"diagnosisDate",
																e.target.value,
															)
														}
														lang={locale}
														className="w-full rounded-lg border p-2 text-sm"
														style={{
															backgroundColor: theme.colors.background,
															borderColor: `${theme.colors.textSecondary}40`,
															color: theme.colors.text,
														}}
													/>
												</div>
											</div>
											<textarea
												value={entry.notes || ""}
												onChange={(e) =>
													updateCondition(entry.id, "notes", e.target.value)
												}
												className="w-full rounded-lg border p-3 text-sm"
												rows={2}
												style={{
													backgroundColor: theme.colors.background,
													borderColor: `${theme.colors.textSecondary}40`,
													color: theme.colors.text,
												}}
												placeholder={t("fields.notesActivePlaceholder")}
											/>
										</div>
										<button
											type="button"
											onClick={() => removeCondition(entry.id)}
											className="rounded-full p-2"
											style={{ color: theme.colors.textSecondary }}
										>
											<X className="h-5 w-5" />
										</button>
									</div>
								</div>
							))}
					</div>
				</section>
			</div>

			<div
				className="fixed bottom-20 left-0 right-0 p-4 md:static md:bottom-auto md:left-auto md:right-auto md:mt-4 space-y-3"
				style={{ backgroundColor: theme.colors.background }}
			>
				{showSuccess && (
					<div
						className="mb-3 flex items-center justify-center rounded-lg p-3 md:p-4"
						style={{ backgroundColor: "#10B981", color: "white" }}
					>
						<Check className="mr-2 h-5 w-5" />
						<span className="md:text-lg">{t("messages.saved")}</span>
					</div>
				)}

				{saveError && (
					<div
						className="mb-3 rounded-lg p-3 md:p-4"
						style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
					>
						<div className="flex items-start">
							<span className="text-sm md:text-base">{saveError}</span>
						</div>
					</div>
				)}

				{(isEncrypting || isUpdating) && (
					<div
						className="mb-3 rounded-lg p-3 md:p-4"
						style={{ backgroundColor: `${theme.colors.primary}10` }}
					>
						<div className="flex items-center">
							<div
								className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
								style={{ borderColor: theme.colors.primary }}
							/>
							<span
								className="text-sm md:text-base"
								style={{ color: theme.colors.text }}
							>
								{progress === "encrypting" && t("messages.encrypting")}
								{progress === "uploading" && t("messages.uploading")}
								{isUpdating && t("messages.updating")}
							</span>
						</div>
					</div>
				)}

				{!has_passport && currentAccount?.address && (
					<div
						className="mb-3 rounded-lg p-3 md:p-4"
						style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
					>
						<p className="text-sm md:text-base">⚠️ {t("messages.noPassport")}</p>
					</div>
				)}

				<div className="grid gap-2 md:grid-cols-2">
					<button
						type="button"
						onClick={() => handleSave(true)}
						className="flex items-center justify-center rounded-xl border-2 p-4 font-medium transition-transform active:scale-95"
						style={{
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						disabled={isSaving || isEncrypting || isUpdating || !has_passport}
					>
						{t("actions.later")}
					</button>
					<button
						type="button"
						onClick={() => handleSave(false)}
						disabled={isSaving || isEncrypting || isUpdating || !has_passport}
						className="flex items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95 disabled:opacity-50"
						style={{ backgroundColor: theme.colors.primary }}
					>
						<Save className="mr-2 h-5 w-5" />
						{t("actions.save")}
					</button>
				</div>
			</div>
		</div>
	);
}
