"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";
import type { LabResult } from "@/types";

/**
 * 検査値の追加フォームページ
 */
export default function AddLabPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { settings, addLabResult } = useApp();
  const theme = getTheme(settings.theme);

  const [formData, setFormData] = useState({
    testName: "",
    value: "",
    unit: "",
    referenceRange: "",
    testDate: "",
    testedBy: "",
    category: "",
    notes: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const result: LabResult = {
      id: uuidv4(),
      testName: formData.testName,
      value: formData.value,
      unit: formData.unit || undefined,
      referenceRange: formData.referenceRange || undefined,
      testDate: formData.testDate || new Date().toISOString().split("T")[0],
      testedBy: formData.testedBy || undefined,
      category: formData.category || undefined,
      notes: formData.notes || undefined,
    };

    addLabResult(result);
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
          {t("labs.add")}
        </h1>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("labs.testName")} *
          </label>
          <input
            type="text"
            value={formData.testName}
            onChange={(e) => handleInputChange("testName", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder={t("labs.testName")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("labs.value")} *
            </label>
            <input
              type="text"
              value={formData.value}
              onChange={(e) => handleInputChange("value", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.textSecondary + "40",
                color: theme.colors.text,
              }}
              placeholder="100"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("labs.unit")}
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => handleInputChange("unit", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.textSecondary + "40",
                color: theme.colors.text,
              }}
              placeholder="mg/dL"
            />
          </div>
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("labs.referenceRange")}
          </label>
          <input
            type="text"
            value={formData.referenceRange}
            onChange={(e) =>
              handleInputChange("referenceRange", e.target.value)
            }
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder="70-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("labs.testDate")} *
            </label>
            <input
              type="date"
              value={formData.testDate}
              onChange={(e) => handleInputChange("testDate", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.textSecondary + "40",
                color: theme.colors.text,
              }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: theme.colors.text }}
            >
              {t("labs.category")}
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className="w-full rounded-lg border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.textSecondary + "40",
                color: theme.colors.text,
              }}
              placeholder="血液検査"
            />
          </div>
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("labs.testedBy")}
          </label>
          <input
            type="text"
            value={formData.testedBy}
            onChange={(e) => handleInputChange("testedBy", e.target.value)}
            className="w-full rounded-lg border p-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder={t("labs.testedBy")}
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-medium"
            style={{ color: theme.colors.text }}
          >
            {t("labs.notes")}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            className="w-full rounded-lg border p-3"
            rows={3}
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textSecondary + "40",
              color: theme.colors.text,
            }}
            placeholder={t("labs.notes")}
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
            disabled={!formData.testName || !formData.value}
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
