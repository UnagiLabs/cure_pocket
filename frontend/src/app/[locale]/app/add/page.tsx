"use client";

import {
  AlertTriangle,
  FileText,
  FlaskConical,
  Package,
  Scan,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useApp } from "@/contexts/AppContext";
import { getTheme } from "@/lib/themes";

/**
 * データタイプ選択画面
 * 薬・アレルギー・病歴・検査値・画像レポートの追加方法を選択
 */
export default function AddDataPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { settings } = useApp();
  const theme = getTheme(settings.theme);

  const dataTypes = [
    {
      id: "medication",
      icon: Package,
      title: t("dataTypes.medication"),
      description: t("add.manualDescription"),
      route: `/${locale}/app/add/medication`,
      color: theme.colors.primary,
    },
    {
      id: "allergy",
      icon: AlertTriangle,
      title: t("dataTypes.allergy"),
      description: t("allergies.add"),
      route: `/${locale}/app/add/allergy`,
      color: "#EF4444",
    },
    {
      id: "history",
      icon: FileText,
      title: t("dataTypes.history"),
      description: t("histories.add"),
      route: `/${locale}/app/add/history`,
      color: "#8B5CF6",
    },
    {
      id: "lab",
      icon: FlaskConical,
      title: t("dataTypes.lab"),
      description: t("labs.add"),
      route: `/${locale}/app/add/lab`,
      color: "#10B981",
    },
    {
      id: "imaging",
      icon: Scan,
      title: t("dataTypes.imaging"),
      description: t("imaging.add"),
      route: `/${locale}/app/add/imaging`,
      color: "#3B82F6",
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <h1
        className="mb-6 text-xl font-bold md:text-2xl"
        style={{ color: theme.colors.text }}
      >
        {t("dashboard.addData")}
      </h1>

      <p
        className="mb-6 text-center text-sm md:text-base"
        style={{ color: theme.colors.textSecondary }}
      >
        {t("add.subtitle")}
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
        {dataTypes.map((dataType) => {
          const Icon = dataType.icon;
          return (
            <button
              key={dataType.id}
              onClick={() => router.push(dataType.route)}
              className="w-full rounded-xl p-6 shadow-sm transition-transform active:scale-95 md:p-8 hover:shadow-md"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <div className="flex items-center md:flex-col md:text-center">
                <div
                  className="mr-4 rounded-full p-3 md:mr-0 md:mb-3"
                  style={{ backgroundColor: dataType.color + "20" }}
                >
                  <Icon
                    className="h-8 w-8 md:h-12 md:w-12"
                    style={{ color: dataType.color }}
                  />
                </div>
                <div className="flex-1 text-left md:text-center">
                  <div
                    className="mb-1 font-bold md:text-lg"
                    style={{ color: theme.colors.text }}
                  >
                    {dataType.title}
                  </div>
                  <div
                    className="text-sm md:text-base"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {dataType.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
