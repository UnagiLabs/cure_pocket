"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { Allergy, AllergySeverity } from "@/types";

/**
 * アレルギーの追加フォームページ
 */
export default function AddAllergyPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { settings, addAllergy } = useApp();
  const theme = getTheme(settings.theme);

  const [formData, setFormData] = useState({
    substance: "",
    severity: "moderate" as AllergySeverity,
    symptoms: "",
    onsetDate: "",
    diagnosedBy: "",
    notes: "",
  });

  const handleInputChange = (
    field: string,
    value: string | AllergySeverity,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const allergy: Allergy = {
      id: uuidv4(),
      substance: formData.substance,
      severity: formData.severity,
      symptoms: formData.symptoms || undefined,
      onsetDate: formData.onsetDate || undefined,
      diagnosedBy: formData.diagnosedBy || undefined,
      notes: formData.notes || undefined,
    };

    addAllergy(allergy);
    router.push(`/${locale}/app`);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center md:mb-8">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/app/add`)}
          className="mr-3 rounded-lg p-2 transition-colors hover:bg-gray-100"
        >
          <ChevronLeft
            className="h-6 w-6"
            style={{ color: theme.colors.text }}
          />
        </button>
        <h1
          className="text-lg font-bold md:text-2xl"
          style={{ color: theme.colors.text }}
        >
          {t("allergies.add")}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="allergy-substance"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("allergies.substance")} *
          </label>
          <input
            id="allergy-substance"
            type="text"
            value={formData.substance}
            onChange={(e) => handleInputChange("substance", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("allergies.substance")}
          />
        </div>

        <div>
          <label
            htmlFor="allergy-severity"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("allergies.severity")} *
          </label>
          <select
            id="allergy-severity"
            value={formData.severity}
            onChange={(e) =>
              handleInputChange("severity", e.target.value as AllergySeverity)
            }
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
          >
            <option value="mild">{t("allergies.severities.mild")}</option>
            <option value="moderate">
              {t("allergies.severities.moderate")}
            </option>
            <option value="severe">{t("allergies.severities.severe")}</option>
            <option value="life-threatening">
              {t("allergies.severities.life-threatening")}
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="allergy-symptoms"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("allergies.symptoms")}
          </label>
          <textarea
            id="allergy-symptoms"
            value={formData.symptoms}
            onChange={(e) => handleInputChange("symptoms", e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={3}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("allergies.symptoms")}
          />
        </div>

        <div>
          <label
            htmlFor="allergy-onsetDate"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("allergies.onsetDate")}
          </label>
          <input
            id="allergy-onsetDate"
            type="date"
            value={formData.onsetDate}
            onChange={(e) => handleInputChange("onsetDate", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
          />
        </div>

        <div>
          <label
            htmlFor="allergy-diagnosedBy"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("allergies.diagnosedBy")}
          </label>
          <input
            id="allergy-diagnosedBy"
            type="text"
            value={formData.diagnosedBy}
            onChange={(e) => handleInputChange("diagnosedBy", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("allergies.diagnosedBy")}
          />
        </div>

        <div>
          <label
            htmlFor="allergy-notes"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("allergies.notes")}
          </label>
          <textarea
            id="allergy-notes"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={3}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("allergies.notes")}
          />
        </div>

        <div className="flex gap-3 md:max-w-md md:mx-auto">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/app/add`)}
            className="flex-1 rounded-xl border-2 p-4 font-medium transition-transform active:scale-95"
            style={{
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!formData.substance}
            className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {t("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
