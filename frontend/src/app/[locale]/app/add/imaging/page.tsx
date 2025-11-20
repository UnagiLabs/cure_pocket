"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { ImagingReport, ImagingType } from "@/types";

/**
 * 画像レポートの追加フォームページ
 */
export default function AddImagingPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { settings, addImagingReport } = useApp();
  const theme = getTheme(settings.theme);

  const [formData, setFormData] = useState({
    type: "xray" as ImagingType,
    bodyPart: "",
    examDate: "",
    performedBy: "",
    summary: "",
    findings: "",
    impression: "",
  });

  const handleInputChange = (field: string, value: string | ImagingType) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const report: ImagingReport = {
      id: uuidv4(),
      type: formData.type,
      bodyPart: formData.bodyPart || undefined,
      examDate: formData.examDate || new Date().toISOString().split("T")[0],
      performedBy: formData.performedBy || undefined,
      summary: formData.summary,
      findings: formData.findings || undefined,
      impression: formData.impression || undefined,
    };

    addImagingReport(report);
    router.push(`/${locale}/app`);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center md:mb-8">
        <button
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
          {t("imaging.add")}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("imaging.type")} *
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              handleInputChange("type", e.target.value as ImagingType)
            }
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
          >
            <option value="xray">{t("imaging.types.xray")}</option>
            <option value="ct">{t("imaging.types.ct")}</option>
            <option value="mri">{t("imaging.types.mri")}</option>
            <option value="ultrasound">{t("imaging.types.ultrasound")}</option>
            <option value="other">{t("imaging.types.other")}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("imaging.bodyPart")}
            </label>
            <input
              type="text"
              value={formData.bodyPart}
              onChange={(e) => handleInputChange("bodyPart", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.textSecondary + "40",
                color: theme.colors.text,
              }}
              placeholder="胸部"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("imaging.examDate")} *
            </label>
            <input
              type="date"
              value={formData.examDate}
              onChange={(e) => handleInputChange("examDate", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.textSecondary + "40",
                color: theme.colors.text,
              }}
            />
          </div>
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("imaging.performedBy")}
          </label>
          <input
            type="text"
            value={formData.performedBy}
            onChange={(e) => handleInputChange("performedBy", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder={t("imaging.performedBy")}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("imaging.summary")} *
          </label>
          <textarea
            value={formData.summary}
            onChange={(e) => handleInputChange("summary", e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={4}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder={t("imaging.summary")}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("imaging.findings")}
          </label>
          <textarea
            value={formData.findings}
            onChange={(e) => handleInputChange("findings", e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={4}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder={t("imaging.findings")}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("imaging.impression")}
          </label>
          <textarea
            value={formData.impression}
            onChange={(e) => handleInputChange("impression", e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={3}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder={t("imaging.impression")}
          />
        </div>

        <div className="flex gap-3 md:max-w-md md:mx-auto">
          <button
            onClick={() => router.push(`/${locale}/app/add`)}
            className="flex-1 rounded-xl border-2 p-4 font-medium transition-transform active:scale-95"
            style={{
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
          >
            {t("actions.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.summary}
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
