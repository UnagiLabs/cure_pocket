"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  FlaskConical,
  Loader2,
  Package,
  Plus,
  Scan,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/contexts/AppContext";
import { useMintPassport } from "@/hooks/useMintPassport";
import { usePassport } from "@/hooks/usePassport";
import { getTheme } from "@/lib/themes";
import type { Medication } from "@/types";

/**
 * ホーム画面（ダッシュボード）
 * 全データタイプのサマリーと最近の更新を表示
 */
export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const {
    medications,
    allergies,
    medicalHistories,
    labResults,
    imagingReports,
    settings,
    profile,
    setMedications,
    walletAddress,
  } = useApp();
  const theme = getTheme(settings.theme);

  // ユーザー名をプロフィールから取得、未設定時はGuest表示
  const displayName = profile?.name || null;

  // パスポート状態を取得
  const passport_status = usePassport();
  const {
    mint,
    is_pending: is_mint_pending,
    error: mint_error,
  } = useMintPassport();

  /**
   * パスポートを発行するハンドラー
   */
  async function handle_mint_passport() {
    try {
      // MVP段階ではモック値を使用
      await mint("init_blob", "init_seal");
    } catch (error) {
      // エラーはuseMintPassportで処理される
      console.error("パスポート発行エラー:", error);
    }
  }

  useEffect(() => {
    // Load demo medications if empty
    if (medications.length === 0 && walletAddress) {
      const demoMedications: Medication[] = [
        {
          id: uuidv4(),
          name: "ロスバスタチン",
          dose: "5mg",
          frequency: "1日1回",
          timing: "morning",
          clinic: "○○内科",
          form: "tablet",
          status: "active",
        },
        {
          id: uuidv4(),
          name: "メトホルミン",
          dose: "500mg",
          frequency: "1日2回",
          timing: "afternoon",
          clinic: "△△クリニック",
          form: "tablet",
          warning: "食直前",
          status: "active",
        },
        {
          id: uuidv4(),
          name: "アムロジピン",
          dose: "5mg",
          frequency: "1日1回",
          timing: "morning",
          clinic: "○○内科",
          form: "tablet",
          status: "active",
        },
      ];
      setMedications(demoMedications);
    }
  }, [medications.length, walletAddress, setMedications]);

  const activeMedicationsCount = medications.filter(
    (m) => m.status === "active",
  ).length;
  const importantHistoriesCount = medicalHistories.filter(
    (h) => h.status === "active" || h.type === "surgery",
  ).length;

  // 最近の更新を時系列で取得
  const recentUpdates = useMemo(() => {
    const updates: Array<{
      id: string;
      type: "medication" | "allergy" | "history" | "lab" | "imaging";
      title: string;
      date: string;
      icon: typeof Package;
    }> = [];

    medications.forEach((med) => {
      updates.push({
        id: med.id,
        type: "medication",
        title: med.name,
        date: med.startDate || new Date().toISOString(),
        icon: Package,
      });
    });

    allergies.forEach((allergy) => {
      updates.push({
        id: allergy.id,
        type: "allergy",
        title: allergy.substance,
        date: allergy.onsetDate || new Date().toISOString(),
        icon: AlertTriangle,
      });
    });

    medicalHistories.forEach((history) => {
      updates.push({
        id: history.id,
        type: "history",
        title: history.diagnosis,
        date: history.diagnosisDate || new Date().toISOString(),
        icon: FileText,
      });
    });

    labResults.forEach((lab) => {
      updates.push({
        id: lab.id,
        type: "lab",
        title: `${lab.testName}: ${lab.value}${lab.unit || ""}`,
        date: lab.testDate,
        icon: FlaskConical,
      });
    });

    imagingReports.forEach((report) => {
      updates.push({
        id: report.id,
        type: "imaging",
        title:
          report.summary.substring(0, 30) +
          (report.summary.length > 30 ? "..." : ""),
        date: report.examDate,
        icon: Scan,
      });
    });

    return updates
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [medications, allergies, medicalHistories, labResults, imagingReports]);

  const summaryCards = [
    {
      id: "medications",
      icon: Package,
      title: t("dashboard.summary.medications"),
      count: activeMedicationsCount,
      color: theme.colors.primary,
    },
    {
      id: "allergies",
      icon: AlertTriangle,
      title: t("dashboard.summary.allergies"),
      count: allergies.length,
      color: "#EF4444",
    },
    {
      id: "histories",
      icon: FileText,
      title: t("dashboard.summary.histories"),
      count: importantHistoriesCount,
      color: "#8B5CF6",
    },
    {
      id: "labs",
      icon: FlaskConical,
      title: t("dashboard.summary.labs"),
      count: labResults.length,
      color: "#10B981",
    },
    {
      id: "imaging",
      icon: Scan,
      title: t("dashboard.summary.imaging"),
      count: imagingReports.length,
      color: "#3B82F6",
    },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Greeting */}
      <div className="mb-6 md:mb-8">
        <h2
          className="mb-1 text-lg md:text-xl"
          style={{ color: theme.colors.textSecondary }}
        >
          {t("home.greeting")}
        </h2>
        <h1
          className="text-2xl font-bold md:text-3xl"
          style={{ color: theme.colors.text }}
        >
          {displayName
            ? t("home.greetingWithName", { name: displayName })
            : t("home.guestGreeting")}
        </h1>
      </div>

      {/* Profile Setup Banner */}
      {!profile && (
        <div
          className="mb-6 rounded-xl border-2 p-4"
          style={{
            backgroundColor: `${theme.colors.primary}10`,
            borderColor: theme.colors.primary,
          }}
        >
          <div className="mb-2 flex items-center">
            <AlertCircle
              className="mr-2 h-5 w-5"
              style={{ color: theme.colors.primary }}
            />
            <h3 className="font-bold" style={{ color: theme.colors.text }}>
              {t("home.profileSetupBanner.title")}
            </h3>
          </div>
          <p
            className="mb-3 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            {t("home.profileSetupBanner.description")}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/app/profile`)}
            className="w-full rounded-lg p-2 text-sm font-medium text-white"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {t("home.profileSetupBanner.button")}
          </button>
        </div>
      )}

      {/* Passport Status Banner */}
      {passport_status.loading ? (
        <div
          className="mb-6 rounded-xl border-2 p-4"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
          }}
        >
          <div className="flex items-center justify-center">
            <Loader2
              className="mr-2 h-5 w-5 animate-spin"
              style={{ color: theme.colors.primary }}
            />
            <span
              className="text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              パスポート状態を確認中...
            </span>
          </div>
        </div>
      ) : passport_status.error ? (
        <div
          className="mb-6 rounded-xl border-2 p-4"
          style={{
            backgroundColor: "#FEE2E2",
            borderColor: "#EF4444",
          }}
        >
          <div className="mb-2 flex items-center">
            <AlertCircle
              className="mr-2 h-5 w-5"
              style={{ color: "#EF4444" }}
            />
            <h3 className="font-bold" style={{ color: "#DC2626" }}>
              パスポート確認エラー
            </h3>
          </div>
          <p className="text-sm" style={{ color: "#991B1B" }}>
            {passport_status.error}
          </p>
        </div>
      ) : !passport_status.has_passport ? (
        <div
          className="mb-6 rounded-xl border-2 p-4"
          style={{
            backgroundColor: `${theme.colors.primary}10`,
            borderColor: theme.colors.primary,
          }}
        >
          <div className="mb-2 flex items-center">
            <AlertCircle
              className="mr-2 h-5 w-5"
              style={{ color: theme.colors.primary }}
            />
            <h3 className="font-bold" style={{ color: theme.colors.text }}>
              パスポートを発行してください
            </h3>
          </div>
          <p
            className="mb-3 text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            メディカルパスポートを発行すると、医療データを安全に管理できます。
          </p>
          {mint_error && (
            <div
              className="mb-3 rounded-lg p-2 text-sm"
              style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
            >
              {mint_error.message}
            </div>
          )}
          <button
            type="button"
            onClick={handle_mint_passport}
            disabled={is_mint_pending}
            className="w-full rounded-lg p-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {is_mint_pending ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                発行中...
              </span>
            ) : (
              "パスポートを発行する"
            )}
          </button>
        </div>
      ) : (
        <div
          className="mb-6 rounded-xl border-2 p-4"
          style={{
            backgroundColor: "#D1FAE5",
            borderColor: "#10B981",
          }}
        >
          <div className="mb-2 flex items-center">
            <CheckCircle
              className="mr-2 h-5 w-5"
              style={{ color: "#10B981" }}
            />
            <h3 className="font-bold" style={{ color: "#059669" }}>
              パスポートを所持しています
            </h3>
          </div>
          <p className="text-sm" style={{ color: "#047857" }}>
            メディカルパスポートが正常に発行されています。
          </p>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 md:gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              type="button"
              key={card.id}
              onClick={() => {
                const paths: Record<string, string> = {
                  medications: `/${locale}/app/medications`,
                  allergies: `/${locale}/app/allergies`,
                  histories: `/${locale}/app/histories`,
                  labs: `/${locale}/app/labs`,
                  imaging: `/${locale}/app/imaging`,
                };
                router.push(paths[card.id] || `/${locale}/app`);
              }}
              className="rounded-xl p-4 shadow-sm transition-transform active:scale-95 md:p-6"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Icon
                className="mx-auto mb-2 h-8 w-8"
                style={{ color: card.color }}
              />
              <span
                className="block text-xs font-medium"
                style={{ color: theme.colors.textSecondary }}
              >
                {card.title}
              </span>
              <div
                className="mt-1 text-2xl font-bold"
                style={{ color: theme.colors.text }}
              >
                {card.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Action Buttons */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/app/add`)}
          className="flex w-full items-center justify-center rounded-xl p-4 shadow-md transition-transform active:scale-95 md:p-5"
          style={{ backgroundColor: theme.colors.accent, color: "white" }}
        >
          <Plus className="mr-2 h-6 w-6" />
          <span className="font-medium md:text-lg">
            {t("dashboard.addData")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => router.push(`/${locale}/app/card`)}
          className="flex w-full items-center justify-center rounded-xl border-2 p-4 shadow-sm transition-transform active:scale-95 md:p-5"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: "#FCA5A5",
            color: "#DC2626",
          }}
        >
          <AlertCircle className="mr-2 h-6 w-6" />
          <span className="font-medium md:text-lg">
            {t("home.emergencyCard")}
          </span>
        </button>
      </div>

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <div className="mt-6 md:mt-8">
          <h3
            className="mb-3 font-bold md:text-lg"
            style={{ color: theme.colors.text }}
          >
            {t("dashboard.recentUpdates")}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentUpdates.map((update) => {
              const Icon = update.icon;
              return (
                <div
                  key={update.id}
                  className="rounded-xl p-4 shadow-sm md:p-5"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <div className="mb-1 flex items-center">
                    <Icon
                      className="mr-2 h-5 w-5 md:h-6 md:w-6"
                      style={{ color: theme.colors.primary }}
                    />
                    <span
                      className="font-bold md:text-base"
                      style={{ color: theme.colors.text }}
                    >
                      {update.title}
                    </span>
                  </div>
                  <div
                    className="text-xs md:text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {t(`dataTypes.${update.type}`)} •{" "}
                    {new Date(update.date).toLocaleDateString("ja-JP")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
