"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { Check, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useEncryptAndStore } from "@/hooks/useEncryptAndStore";
import { usePassport } from "@/hooks/usePassport";
import { useUpdatePassportData } from "@/hooks/useUpdatePassportData";
import {
	chronicConditionCategories,
	criticalConditions,
} from "@/lib/chronicConditions";
import { profileToHealthData } from "@/lib/profileConverter";
import { generateSealId } from "@/lib/sealIdGenerator";
import { getTheme } from "@/lib/themes";
import type {
	AlcoholUse,
	ChronicCondition,
	ExerciseFrequency,
	Gender,
	PatientProfile,
	SmokingStatus,
} from "@/types";

/**
 * 患者プロフィール設定ページ
 * チェックボックス形式で基礎疾患を選択できる
 */
export default function ProfilePage() {
	const t = useTranslations();
	const router = useRouter();
	const locale = useLocale();
	const currentAccount = useCurrentAccount();
	const {
		settings,
		profile,
		updateProfile,
		medications,
		allergies,
		medicalHistories,
		labResults,
		imagingReports,
	} = useApp();
	const theme = getTheme(settings.theme);
	const { passport, has_passport } = usePassport();
	const {
		encryptAndStore,
		isEncrypting,
		progress,
		error: _encryptError,
	} = useEncryptAndStore();
	const {
		updatePassportData,
		isUpdating,
		error: _updateError,
	} = useUpdatePassportData();
	const [isSaving, setIsSaving] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
		new Set(["cardiovascular", "metabolic"]),
	);

	// フォーム状態
	const [formData, setFormData] = useState<Partial<PatientProfile>>({
		name: undefined,
		ageBand: null,
		gender: "unknown",
		country: null,
		preferredLanguage: locale,
		bloodType: undefined,
		heightCm: undefined,
		weightKg: undefined,
		smokingStatus: "unknown",
		alcoholUse: "unknown",
		exercise: "unknown",
		drugAllergies: [],
		foodAllergies: [],
		hasAnaphylaxisHistory: null,
		chronicConditions: [],
		surgeries: [],
		dataSharing: {
			preference: "deny",
			shareMedication: false,
			shareLabs: false,
			shareConditions: false,
			shareSurgeries: false,
			shareLifestyle: false,
			rewardsEnabled: false,
		},
	});

	// プロフィールが読み込まれたらフォームに反映
	useEffect(() => {
		if (profile) {
			setFormData(profile);
		}
	}, [profile]);

	const toggleCategory = (categoryId: string) => {
		setExpandedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(categoryId)) {
				next.delete(categoryId);
			} else {
				next.add(categoryId);
			}
			return next;
		});
	};

	const handleInputChange = (
		field: string,
		value:
			| string
			| number
			| Gender
			| SmokingStatus
			| AlcoholUse
			| ExerciseFrequency
			| null
			| undefined,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleChronicConditionToggle = (condition: ChronicCondition) => {
		setFormData((prev) => {
			const current = prev.chronicConditions || [];
			const exists = current.some((c) => c.label === condition.label);
			if (exists) {
				return {
					...prev,
					chronicConditions: current.filter((c) => c.label !== condition.label),
				};
			} else {
				return {
					...prev,
					chronicConditions: [...current, condition],
				};
			}
		});
	};

	const handleFoodAllergyAdd = (allergy: string) => {
		if (!allergy.trim()) return;
		setFormData((prev) => ({
			...prev,
			foodAllergies: [...(prev.foodAllergies || []), allergy.trim()],
		}));
	};

	const handleFoodAllergyRemove = (index: number) => {
		setFormData((prev) => ({
			...prev,
			foodAllergies: (prev.foodAllergies || []).filter((_, i) => i !== index),
		}));
	};

	const handleSave = async () => {
		setIsSaving(true);
		setSaveError(null);

		try {
			// 1. Validate: Wallet connected
			if (!currentAccount?.address) {
				throw new Error("ウォレットが接続されていません");
			}

			// 2. Validate: Passport exists
			if (!has_passport || !passport) {
				throw new Error(
					"パスポートが発行されていません。先にパスポートを発行してください。",
				);
			}

			// 3. Build profile to save
			const profileToSave: PatientProfile = {
				ageBand: formData.ageBand || null,
				gender: formData.gender || "unknown",
				country: formData.country || null,
				preferredLanguage: formData.preferredLanguage || locale,
				bloodType: formData.bloodType,
				heightCm: formData.heightCm,
				weightKg: formData.weightKg,
				smokingStatus: formData.smokingStatus || "unknown",
				alcoholUse: formData.alcoholUse || "unknown",
				exercise: formData.exercise || "unknown",
				drugAllergies: formData.drugAllergies || [],
				foodAllergies: formData.foodAllergies || [],
				hasAnaphylaxisHistory: formData.hasAnaphylaxisHistory ?? null,
				chronicConditions: formData.chronicConditions || [],
				surgeries: formData.surgeries || [],
				emergencyContact: formData.emergencyContact,
				dataSharing: formData.dataSharing || {
					preference: "deny",
					shareMedication: false,
					shareLabs: false,
					shareConditions: false,
					shareSurgeries: false,
					shareLifestyle: false,
					rewardsEnabled: false,
				},
				updatedAt: new Date().toISOString(),
			};

			console.log("[ProfileSave] Step 1: Converting to HealthData...");

			// 4. Convert to HealthData
			const healthData = profileToHealthData(
				profileToSave,
				medications,
				allergies,
				medicalHistories,
				labResults,
				imagingReports,
				locale,
			);

			console.log("[ProfileSave] Step 2: Generating seal_id...");

			// 5. Generate seal_id
			const sealId = await generateSealId(currentAccount.address);
			console.log(
				`[ProfileSave] Generated seal_id: ${sealId.substring(0, 16)}...`,
			);

			console.log("[ProfileSave] Step 3: Encrypting and uploading...");

			// 6. Encrypt and upload to Walrus
			const { blobId, dataType } = await encryptAndStore(
				healthData,
				sealId,
				"basic_profile", // データ種別
			);
			console.log(`[ProfileSave] Upload complete, blobId: ${blobId}, dataType: ${dataType}`);

			console.log("[ProfileSave] Step 4: Updating passport on-chain...");

			// 7. Update passport on-chain with Dynamic Fields
			await updatePassportData({
				passportId: passport.id,
				dataType: "basic_profile",
				blobIds: [blobId], // Blob IDの配列
				replace: true, // 既存のbasic_profileを置き換え
			});
			console.log("[ProfileSave] Passport updated successfully");

			// 8. Save locally
			updateProfile(profileToSave);

			// 9. Show success
			setShowSuccess(true);
			console.log("[ProfileSave] Save complete!");

			// 新規登録の場合（profileが未設定の場合）はホーム画面へ遷移
			if (!profile) {
				setTimeout(() => {
					router.push(`/${locale}/app`);
				}, 2000);
			} else {
				setTimeout(() => setShowSuccess(false), 3000);
			}
		} catch (error) {
			console.error("[ProfileSave] Failed to save profile:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "プロフィールの保存に失敗しました";
			setSaveError(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const selectedConditions = formData.chronicConditions || [];

	return (
		<div className="p-4 pb-24 md:pb-6 md:p-6">
			<h1
				className="mb-6 text-xl font-bold md:text-2xl"
				style={{ color: theme.colors.text }}
			>
				プロフィール設定
			</h1>

			{/* 基本情報 */}
			<div
				className="mb-6 rounded-xl p-4 shadow-sm md:p-6"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<h2
					className="mb-4 text-lg font-bold md:text-xl"
					style={{ color: theme.colors.text }}
				>
					基本情報
				</h2>

				<div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
					{/* 名前入力欄 */}
					<div className="md:col-span-2">
						<label
							htmlFor="profile-name"
							className="mb-1 block text-sm font-medium md:text-base"
							style={{ color: theme.colors.text }}
						>
							{t("profile.name")}
						</label>
						<input
							id="profile-name"
							type="text"
							value={formData.name || ""}
							onChange={(e) =>
								handleInputChange("name", e.target.value || undefined)
							}
							className="w-full rounded-lg border p-3 text-sm md:text-base"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
							placeholder={t("profile.name")}
						/>
					</div>

					<div>
						<label
							htmlFor="profile-ageBand"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							年齢帯 *
						</label>
						<select
							id="profile-ageBand"
							value={formData.ageBand || ""}
							onChange={(e) =>
								handleInputChange("ageBand", e.target.value || null)
							}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						>
							<option value="">選択してください</option>
							<option value="10s">10代</option>
							<option value="20s">20代</option>
							<option value="30s">30代</option>
							<option value="40s">40代</option>
							<option value="50s">50代</option>
							<option value="60s">60代</option>
							<option value="70s">70代</option>
							<option value="80plus">80歳以上</option>
						</select>
					</div>

					<div>
						<div
							className="mb-1 text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							性別 *
						</div>
						<div className="grid grid-cols-2 gap-2">
							{(["male", "female", "other", "unknown"] as Gender[]).map(
								(gender) => (
									<button
										type="button"
										key={gender}
										onClick={() => handleInputChange("gender", gender)}
										className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
											formData.gender === gender
												? "border-blue-500 bg-blue-50"
												: "border-gray-200 bg-white"
										}`}
										style={{
											borderColor:
												formData.gender === gender
													? theme.colors.primary
													: `${theme.colors.textSecondary}40`,
											backgroundColor:
												formData.gender === gender
													? `${theme.colors.primary}10`
													: theme.colors.surface,
											color: theme.colors.text,
										}}
									>
										{gender === "male" && "男性"}
										{gender === "female" && "女性"}
										{gender === "other" && "その他"}
										{gender === "unknown" && "回答しない"}
									</button>
								),
							)}
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4 md:col-span-2">
						<div>
							<label
								htmlFor="profile-heightCm"
								className="mb-1 block text-sm font-medium md:text-base"
								style={{ color: theme.colors.text }}
							>
								身長 (cm)
							</label>
							<input
								id="profile-heightCm"
								type="number"
								value={formData.heightCm || ""}
								onChange={(e) =>
									handleInputChange(
										"heightCm",
										e.target.value ? Number(e.target.value) : undefined,
									)
								}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder="170"
							/>
						</div>

						<div>
							<label
								htmlFor="profile-weightKg"
								className="mb-1 block text-sm font-medium"
								style={{ color: theme.colors.text }}
							>
								体重 (kg)
							</label>
							<input
								id="profile-weightKg"
								type="number"
								value={formData.weightKg || ""}
								onChange={(e) =>
									handleInputChange(
										"weightKg",
										e.target.value ? Number(e.target.value) : undefined,
									)
								}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
								placeholder="65"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="profile-bloodType"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							血液型
						</label>
						<select
							id="profile-bloodType"
							value={formData.bloodType || ""}
							onChange={(e) =>
								handleInputChange("bloodType", e.target.value || undefined)
							}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						>
							<option value="">選択しない</option>
							<option value="A">A型</option>
							<option value="B">B型</option>
							<option value="O">O型</option>
							<option value="AB">AB型</option>
							<option value="unknown">不明</option>
						</select>
					</div>
				</div>
			</div>

			{/* 基礎疾患・慢性疾患（カテゴリ別チェックボックス形式） */}
			<div
				className="mb-6 rounded-xl p-4 shadow-sm md:p-6"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<h2
					className="mb-2 text-lg font-bold md:text-xl"
					style={{ color: theme.colors.text }}
				>
					基礎疾患・慢性疾患
				</h2>
				<p
					className="mb-4 text-sm md:text-base"
					style={{ color: theme.colors.textSecondary }}
				>
					該当するものにチェックを入れてください。カテゴリをタップして展開・折りたたみできます。
				</p>

				{/* 最重要疾患（常に表示） */}
				<div className="mb-6">
					<h3
						className="mb-3 text-sm font-bold md:text-base"
						style={{ color: theme.colors.primary }}
					>
						⭐ 最重要疾患
					</h3>
					<p
						className="mb-4 text-xs md:text-sm italic"
						style={{ color: theme.colors.textSecondary }}
					>
						健康管理の上で下記疾病の有無は重要です。該当するものは必ず選択してください。
					</p>
					<div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 md:gap-3">
						{criticalConditions.map((condition) => {
							const isSelected = selectedConditions.some(
								(c) => c.label === condition.label,
							);
							return (
								<label
									key={condition.label}
									className="flex items-center rounded-lg border-2 p-3 transition-colors md:p-4"
									style={{
										borderColor: isSelected
											? theme.colors.primary
											: `${theme.colors.textSecondary}40`,
										backgroundColor: isSelected
											? `${theme.colors.primary}10`
											: "transparent",
									}}
								>
									<input
										type="checkbox"
										checked={isSelected}
										onChange={() => handleChronicConditionToggle(condition)}
										className="mr-3 h-5 w-5 md:h-6 md:w-6"
										style={{ accentColor: theme.colors.primary }}
									/>
									<span
										className="text-sm md:text-base"
										style={{ color: theme.colors.text }}
									>
										{condition.label}
									</span>
								</label>
							);
						})}
					</div>
				</div>

				{/* カテゴリ別セクションの説明 */}
				<div
					className="mb-4 rounded-lg border-l-4 p-3 md:p-4"
					style={{
						borderColor: `${theme.colors.primary}40`,
						backgroundColor: `${theme.colors.primary}05`,
					}}
				>
					<p
						className="text-sm font-medium md:text-base"
						style={{ color: theme.colors.text }}
					>
						詳細情報・上記以外の疾患を登録
					</p>
					<p
						className="mt-1 text-xs md:text-sm"
						style={{ color: theme.colors.textSecondary }}
					>
						カテゴリをタップして展開し、該当する疾患にチェックを入れてください。
					</p>
				</div>

				{/* カテゴリ別疾患リスト */}
				<div className="space-y-3">
					{chronicConditionCategories.map((category) => {
						const isExpanded = expandedCategories.has(category.id);
						return (
							<div
								key={category.id}
								className="rounded-lg border"
								style={{ borderColor: `${theme.colors.textSecondary}40` }}
							>
								<button
									type="button"
									onClick={() => toggleCategory(category.id)}
									className="flex w-full items-center justify-between p-3"
									style={{ backgroundColor: theme.colors.background }}
								>
									<span
										className="font-medium"
										style={{ color: theme.colors.text }}
									>
										{category.label}
									</span>
									{isExpanded ? (
										<ChevronUp
											className="h-5 w-5"
											style={{ color: theme.colors.textSecondary }}
										/>
									) : (
										<ChevronDown
											className="h-5 w-5"
											style={{ color: theme.colors.textSecondary }}
										/>
									)}
								</button>

								{isExpanded && (
									<div
										className="space-y-2 border-t p-3"
										style={{ borderColor: `${theme.colors.textSecondary}20` }}
									>
										{category.conditions.map((condition) => {
											const isSelected = selectedConditions.some(
												(c) => c.label === condition.label,
											);
											return (
												<label
													key={condition.label}
													className="flex items-center rounded-lg border-2 p-2 transition-colors"
													style={{
														borderColor: isSelected
															? theme.colors.primary
															: `${theme.colors.textSecondary}30`,
														backgroundColor: isSelected
															? `${theme.colors.primary}10`
															: "transparent",
													}}
												>
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() =>
															handleChronicConditionToggle(condition)
														}
														className="mr-2 h-4 w-4"
														style={{ accentColor: theme.colors.primary }}
													/>
													<span
														className="text-sm"
														style={{ color: theme.colors.text }}
													>
														{condition.label}
													</span>
												</label>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* その他（自由記載） */}
				<div className="mt-4">
					<label
						htmlFor="profile-other-conditions"
						className="mb-2 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						その他の疾患（自由記載）
					</label>
					<input
						id="profile-other-conditions"
						type="text"
						placeholder="該当する疾患名を入力してください"
						className="w-full rounded-lg border p-3 text-sm"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						onKeyPress={(e) => {
							if (e.key === "Enter" && e.currentTarget.value.trim()) {
								handleChronicConditionToggle({
									label: e.currentTarget.value.trim(),
								});
								e.currentTarget.value = "";
							}
						}}
					/>
				</div>
			</div>

			{/* 食物アレルギー */}
			<div
				className="mb-6 rounded-xl p-4 shadow-sm md:p-6"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<h2
					className="mb-4 text-lg font-bold md:text-xl"
					style={{ color: theme.colors.text }}
				>
					食物アレルギー
				</h2>
				<div className="mb-3 flex gap-2">
					<input
						type="text"
						placeholder="例: ピーナッツ、エビ"
						className="flex-1 rounded-lg border p-2"
						style={{
							backgroundColor: theme.colors.background,
							borderColor: `${theme.colors.textSecondary}40`,
							color: theme.colors.text,
						}}
						onKeyPress={(e) => {
							if (e.key === "Enter") {
								handleFoodAllergyAdd(e.currentTarget.value);
								e.currentTarget.value = "";
							}
						}}
					/>
					<button
						type="button"
						onClick={(e) => {
							const input = e.currentTarget
								.previousElementSibling as HTMLInputElement;
							handleFoodAllergyAdd(input.value);
							input.value = "";
						}}
						className="rounded-lg px-4 py-2 text-sm font-medium text-white"
						style={{ backgroundColor: theme.colors.primary }}
					>
						追加
					</button>
				</div>
				<div className="flex flex-wrap gap-2">
					{(formData.foodAllergies || []).map((allergy) => (
						<span
							key={allergy}
							className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm"
						>
							{allergy}
							<button
								type="button"
								onClick={() =>
									handleFoodAllergyRemove(
										formData.foodAllergies?.indexOf(allergy) || 0,
									)
								}
								className="text-red-600 hover:text-red-800"
							>
								×
							</button>
						</span>
					))}
				</div>
			</div>

			{/* 生活習慣 */}
			<div
				className="mb-6 rounded-xl p-4 shadow-sm md:p-6"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<h2
					className="mb-4 text-lg font-bold md:text-xl"
					style={{ color: theme.colors.text }}
				>
					生活習慣
				</h2>

				<div className="space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
					<div>
						<label
							htmlFor="profile-smoking"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							喫煙
						</label>
						<select
							id="profile-smoking"
							value={formData.smokingStatus || "unknown"}
							onChange={(e) =>
								handleInputChange(
									"smokingStatus",
									e.target.value as SmokingStatus,
								)
							}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						>
							<option value="never">吸わない</option>
							<option value="former">以前吸っていた</option>
							<option value="current">現在吸っている</option>
							<option value="unknown">回答しない</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="profile-alcohol"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							飲酒
						</label>
						<select
							id="profile-alcohol"
							value={formData.alcoholUse || "unknown"}
							onChange={(e) =>
								handleInputChange("alcoholUse", e.target.value as AlcoholUse)
							}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						>
							<option value="none">飲まない</option>
							<option value="light">たまに（週1-2回）</option>
							<option value="moderate">適度に（週3-4回）</option>
							<option value="heavy">頻繁に（ほぼ毎日）</option>
							<option value="unknown">回答しない</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="profile-exercise"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							運動習慣
						</label>
						<select
							id="profile-exercise"
							value={formData.exercise || "unknown"}
							onChange={(e) =>
								handleInputChange(
									"exercise",
									e.target.value as ExerciseFrequency,
								)
							}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						>
							<option value="none">運動しない</option>
							<option value="1-2/week">週1-2回</option>
							<option value="3-5/week">週3-5回</option>
							<option value="daily">毎日</option>
							<option value="unknown">回答しない</option>
						</select>
					</div>
				</div>
			</div>

			{/* 保存ボタン */}
			<div
				className="fixed bottom-20 left-0 right-0 p-4 md:static md:bottom-auto md:left-auto md:right-auto md:mt-8"
				style={{ backgroundColor: theme.colors.background }}
			>
				{/* Success Message */}
				{showSuccess && (
					<div
						className="mb-3 flex items-center justify-center rounded-lg p-3 md:p-4"
						style={{ backgroundColor: "#10B981", color: "white" }}
					>
						<Check className="mr-2 h-5 w-5" />
						<span className="md:text-lg">保存しました</span>
					</div>
				)}

				{/* Error Message */}
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

				{/* Progress Display */}
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
								{progress === "encrypting" && "データを暗号化中..."}
								{progress === "uploading" && "Walrusにアップロード中..."}
								{isUpdating && "パスポートを更新中..."}
							</span>
						</div>
					</div>
				)}

				{/* Passport Warning */}
				{!has_passport && currentAccount?.address && (
					<div
						className="mb-3 rounded-lg p-3 md:p-4"
						style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
					>
						<p className="text-sm md:text-base">
							⚠️
							パスポートが発行されていません。保存する前にパスポートを発行してください。
						</p>
					</div>
				)}

				<button
					type="button"
					onClick={handleSave}
					disabled={
						isSaving ||
						isEncrypting ||
						isUpdating ||
						!formData.ageBand ||
						!has_passport
					}
					className="flex w-full items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95 disabled:opacity-50 md:max-w-md md:mx-auto md:p-5 md:text-lg"
					style={{ backgroundColor: theme.colors.primary }}
				>
					<Save className="mr-2 h-5 w-5" />
					{isSaving || isEncrypting || isUpdating ? "保存中..." : "保存"}
				</button>
			</div>
		</div>
	);
}
