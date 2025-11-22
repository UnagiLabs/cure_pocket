"use client";

import { ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { AgeBand, Gender, PatientProfile } from "@/types";

const countryOptions = [
	{ value: "JP", label: "日本" },
	{ value: "US", label: "アメリカ合衆国" },
	{ value: "CN", label: "中国" },
	{ value: "KR", label: "韓国" },
	{ value: "TW", label: "台湾" },
	{ value: "HK", label: "香港" },
	{ value: "SG", label: "シンガポール" },
	{ value: "TH", label: "タイ" },
	{ value: "VN", label: "ベトナム" },
	{ value: "PH", label: "フィリピン" },
	{ value: "ID", label: "インドネシア" },
	{ value: "MY", label: "マレーシア" },
	{ value: "IN", label: "インド" },
	{ value: "BD", label: "バングラデシュ" },
	{ value: "PK", label: "パキスタン" },
	{ value: "AE", label: "アラブ首長国連邦" },
	{ value: "SA", label: "サウジアラビア" },
	{ value: "EG", label: "エジプト" },
	{ value: "ZA", label: "南アフリカ" },
	{ value: "NG", label: "ナイジェリア" },
	{ value: "KE", label: "ケニア" },
	{ value: "GB", label: "イギリス" },
	{ value: "FR", label: "フランス" },
	{ value: "DE", label: "ドイツ" },
	{ value: "ES", label: "スペイン" },
	{ value: "IT", label: "イタリア" },
	{ value: "NL", label: "オランダ" },
	{ value: "SE", label: "スウェーデン" },
	{ value: "CH", label: "スイス" },
	{ value: "AU", label: "オーストラリア" },
	{ value: "NZ", label: "ニュージーランド" },
	{ value: "CA", label: "カナダ" },
	{ value: "MX", label: "メキシコ" },
	{ value: "BR", label: "ブラジル" },
	{ value: "AR", label: "アルゼンチン" },
	{ value: "CL", label: "チリ" },
	{ value: "other", label: "その他" },
];

const majorAllergies = [
	"peanut",
	"shellfish",
	"egg",
	"milk",
	"buckwheat",
	"wheat",
	"penicillin",
	"latex",
];

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

export default function ProfilePage() {
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations("profile");
	const { settings, profile, updateProfile } = useApp();
	const theme = useMemo(() => getTheme(settings.theme), [settings.theme]);

	const [formData, setFormData] = useState<Partial<PatientProfile>>({
		birthDate: null,
		gender: "unknown",
		country: null,
		bloodType: undefined,
		foodAllergies: [],
	});
	const [allergyInput, setAllergyInput] = useState("");
	const [selectedAllergy, setSelectedAllergy] = useState<string>("");

	useEffect(() => {
		if (profile) {
			setFormData({
				birthDate: profile.birthDate ?? null,
				gender: profile.gender,
				country: profile.country,
				bloodType: profile.bloodType,
				foodAllergies: profile.foodAllergies || [],
			});
		}
	}, [profile]);

	const handleInputChange = (
		field: string,
		value: string | Gender | null | undefined,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleAddAllergy = () => {
		const allergyName =
			selectedAllergy === "other" ? allergyInput.trim() : selectedAllergy;
		if (!allergyName) return;
		if ((formData.foodAllergies || []).includes(allergyName)) {
			return;
		}
		setFormData((prev) => ({
			...prev,
			foodAllergies: [...(prev.foodAllergies || []), allergyName],
		}));
		setAllergyInput("");
		setSelectedAllergy("");
	};

	const handleRemoveAllergy = (index: number) => {
		setFormData((prev) => ({
			...prev,
			foodAllergies: (prev.foodAllergies || []).filter((_, i) => i !== index),
		}));
	};

	const handleNext = () => {
		const birthDate = formData.birthDate || null;
		updateProfile({
			birthDate,
			ageBand: birthDateToAgeBand(birthDate),
			gender: formData.gender || "unknown",
			country: formData.country || null,
			preferredLanguage: locale,
			bloodType: formData.bloodType || undefined,
			foodAllergies: formData.foodAllergies || [],
			updatedAt: new Date().toISOString(),
		});
		router.push(`/${locale}/app/profile/conditions`);
	};

	return (
		<div className="p-4 pb-24 md:pb-10 md:p-6">
			<h1
				className="mb-3 text-xl font-bold md:text-2xl"
				style={{ color: theme.colors.text }}
			>
				{t("title")}
			</h1>
			<p className="mb-6 text-sm" style={{ color: theme.colors.textSecondary }}>
				{t("description")}
			</p>

			<div
				className="rounded-xl p-4 shadow-sm md:p-6 space-y-5"
				style={{ backgroundColor: theme.colors.surface }}
			>
				<h2
					className="text-lg font-semibold md:text-xl"
					style={{ color: theme.colors.text }}
				>
					{t("basicInfo")}
				</h2>

				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<label
							htmlFor="birthDate"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							{t("birthDate")}
						</label>
						<input
							id="birthDate"
							type="date"
							value={formData.birthDate || ""}
							onChange={(e) => handleInputChange("birthDate", e.target.value)}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						/>
					</div>

					<div>
						<div
							className="mb-1 text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							{t("gender")}
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
										{gender === "male" && t("genders.male")}
										{gender === "female" && t("genders.female")}
										{gender === "other" && t("genders.other")}
										{gender === "unknown" && t("genders.unknown")}
									</button>
								),
							)}
						</div>
					</div>

					<div>
						<label
							htmlFor="country"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							{t("country")}
						</label>
						<select
							id="country"
							value={formData.country || ""}
							onChange={(e) => {
								const value = e.target.value;
								handleInputChange(
									"country",
									value === "" ? null : value === "other" ? null : value,
								);
							}}
							className="w-full rounded-lg border p-3"
							style={{
								backgroundColor: theme.colors.background,
								borderColor: `${theme.colors.textSecondary}40`,
								color: theme.colors.text,
							}}
						>
							<option value="">{t("selectPlaceholder")}</option>
							{countryOptions.map((option) => (
								<option key={option.value} value={option.value}>
									{t(`countries.${option.value}`)}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="bloodType"
							className="mb-1 block text-sm font-medium"
							style={{ color: theme.colors.text }}
						>
							{t("bloodType")}
						</label>
						<select
							id="bloodType"
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
							<option value="">{t("selectOptional")}</option>
							<option value="A">A</option>
							<option value="B">B</option>
							<option value="O">O</option>
							<option value="AB">AB</option>
							<option value="unknown">{t("unknown")}</option>
						</select>
					</div>
				</div>

				<div>
					<label
						htmlFor="allergy-select"
						className="mb-2 block text-sm font-medium"
						style={{ color: theme.colors.text }}
					>
						{t("allergy")}
					</label>
					<div className="flex flex-col gap-3 md:flex-row md:items-end">
						<div className="flex-1 space-y-2">
							<select
								id="allergy-select"
								value={selectedAllergy}
								onChange={(e) => setSelectedAllergy(e.target.value)}
								className="w-full rounded-lg border p-3"
								style={{
									backgroundColor: theme.colors.background,
									borderColor: `${theme.colors.textSecondary}40`,
									color: theme.colors.text,
								}}
							>
								<option value="">{t("allergySelectPlaceholder")}</option>
								{majorAllergies.map((item) => (
									<option key={item} value={item}>
										{t(`allergyOptions.${item}`)}
									</option>
								))}
								<option value="other">{t("allergyOther")}</option>
							</select>
							{selectedAllergy === "other" && (
								<input
									id="allergy-input"
									type="text"
									value={allergyInput}
									onChange={(e) => setAllergyInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											handleAddAllergy();
										}
									}}
									className="w-full rounded-lg border p-3"
									style={{
										backgroundColor: theme.colors.background,
										borderColor: `${theme.colors.textSecondary}40`,
										color: theme.colors.text,
									}}
									placeholder={t("allergyOtherPlaceholder")}
								/>
							)}
						</div>
						<button
							type="button"
							onClick={handleAddAllergy}
							className="rounded-lg px-4 py-2 text-sm font-medium text-white"
							style={{ backgroundColor: theme.colors.primary }}
						>
							{t("add")}
						</button>
					</div>

					<div className="mt-3 flex flex-wrap gap-2">
						{(formData.foodAllergies || []).map((allergy, index) => (
							<span
								key={allergy}
								className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm"
							>
								{t(`allergyOptions.${allergy}`, { fallback: allergy })}
								<button
									type="button"
									onClick={() => handleRemoveAllergy(index)}
									className="text-red-600 hover:text-red-800"
								>
									<X className="h-4 w-4" />
								</button>
							</span>
						))}
					</div>
				</div>
			</div>

			<div
				className="fixed bottom-20 left-0 right-0 p-4 md:static md:bottom-auto md:left-auto md:right-auto md:mt-8"
				style={{ backgroundColor: theme.colors.background }}
			>
				<button
					type="button"
					onClick={handleNext}
					className="flex w-full items-center justify-center rounded-xl p-4 font-medium text-white shadow-md transition-transform active:scale-95 md:mx-auto md:max-w-md md:p-5 md:text-lg"
					style={{ backgroundColor: theme.colors.primary }}
					disabled={!formData.birthDate || !formData.gender}
				>
					{t("nextToConditions")}
					<ChevronRight className="ml-2 h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
