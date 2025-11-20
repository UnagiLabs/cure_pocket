"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { Medication, MedicationForm } from "@/types";

/**
 * 薬の追加フォームページ
 */
export default function AddMedicationPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { settings, addMedication } = useApp();
  const theme = getTheme(settings.theme);

  const [formData, setFormData] = useState({
    name: "",
    genericName: "",
    strength: "",
    form: "tablet" as MedicationForm,
    dose: "",
    frequency: "",
    startDate: "",
    endDate: "",
    reason: "",
    clinic: "",
    warning: "",
  });

  const handleInputChange = (field: string, value: string | MedicationForm) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const medication: Medication = {
      id: uuidv4(),
      name: formData.name,
      genericName: formData.genericName || undefined,
      strength: formData.strength || undefined,
      form: formData.form,
      dose: formData.dose || undefined,
      frequency: formData.frequency || undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      reason: formData.reason || undefined,
      clinic: formData.clinic || undefined,
      warning: formData.warning || undefined,
      status: "active",
    };

    addMedication(medication);
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
          {t("add.title")}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-4 md:max-w-2xl md:mx-auto">
        <div>
          <label
            htmlFor="medication-name"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("add.drugName")} *
          </label>
          <input
            id="medication-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("add.drugName")}
          />
        </div>

        <div>
          <label
            htmlFor="medication-genericName"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("add.genericName")}
          </label>
          <input
            id="medication-genericName"
            type="text"
            value={formData.genericName}
            onChange={(e) => handleInputChange("genericName", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("add.genericName")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="medication-strength"
              className="mb-1 block text-sm font-medium md:text-base"
              style={{ color: theme.colors.text }}
            >
              {t("add.strength")}
            </label>
            <input
              id="medication-strength"
              type="text"
              value={formData.strength}
              onChange={(e) => handleInputChange("strength", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: `${theme.colors.textSecondary}40`,
                color: theme.colors.text,
              }}
              placeholder="5mg"
            />
          </div>

          <div>
            <label
              htmlFor="medication-form"
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("add.form")}
            </label>
            <select
              id="medication-form"
              value={formData.form}
              onChange={(e) =>
                handleInputChange("form", e.target.value as MedicationForm)
              }
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: `${theme.colors.textSecondary}40`,
                color: theme.colors.text,
              }}
            >
              <option value="tablet">{t("forms.tablet")}</option>
              <option value="capsule">{t("forms.capsule")}</option>
              <option value="liquid">{t("forms.liquid")}</option>
              <option value="other">{t("forms.other")}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="medication-dose"
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("add.dose")}
            </label>
            <input
              id="medication-dose"
              type="text"
              value={formData.dose}
              onChange={(e) => handleInputChange("dose", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: `${theme.colors.textSecondary}40`,
                color: theme.colors.text,
              }}
              placeholder="1 tablet"
            />
          </div>

          <div>
            <label
              htmlFor="medication-frequency"
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("add.frequency")}
            </label>
            <input
              id="medication-frequency"
              type="text"
              value={formData.frequency}
              onChange={(e) => handleInputChange("frequency", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: `${theme.colors.textSecondary}40`,
                color: theme.colors.text,
              }}
              placeholder="1日2回"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="medication-startDate"
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("add.startDate")}
            </label>
            <input
              id="medication-startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
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
              htmlFor="medication-endDate"
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("add.endDate")}
            </label>
            <input
              id="medication-endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: `${theme.colors.textSecondary}40`,
                color: theme.colors.text,
              }}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="medication-clinic"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("medications.clinic")}
          </label>
          <input
            id="medication-clinic"
            type="text"
            value={formData.clinic}
            onChange={(e) => handleInputChange("clinic", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("medications.clinic")}
          />
        </div>

        <div>
          <label
            htmlFor="medication-reason"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("add.reason")}
          </label>
          <textarea
            id="medication-reason"
            value={formData.reason}
            onChange={(e) => handleInputChange("reason", e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={3}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("add.reason")}
          />
        </div>

        <div>
          <label
            htmlFor="medication-warning"
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("medications.warning")}
          </label>
          <input
            id="medication-warning"
            type="text"
            value={formData.warning}
            onChange={(e) => handleInputChange("warning", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: `${theme.colors.textSecondary}40`,
              color: theme.colors.text,
            }}
            placeholder={t("medications.warning")}
          />
        </div>

        <div className="flex gap-3 md:max-w-md md:mx-auto">
          <button
            type="button"
            onClick={() => router.push(`/${locale}/app/add`)}
            className="flex-1 rounded-xl border-2 p-4 font-medium transition-transform active:scale-95 md:p-5 md:text-lg hover:shadow-sm"
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
            disabled={!formData.name}
            className="flex-1 rounded-xl p-4 font-medium text-white transition-transform active:scale-95 disabled:opacity-50 md:p-5 md:text-lg hover:shadow-lg"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {t("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
