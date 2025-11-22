"use client";

import { AlertCircle, CheckCircle, Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useMintPassport } from "@/hooks/useMintPassport";
import { usePassport } from "@/hooks/usePassport";
import { generateSealId } from "@/lib/sealIdGenerator";
import { getTheme } from "@/lib/themes";

/**
 * パスポート発行画面
 * ウォレット接続後、最初に訪れるページ
 */
export default function PassportPage() {
	const t = useTranslations("passport");
	const router = useRouter();
	const locale = useLocale();
	const { settings, walletAddress, profile } = useApp();
	const theme = getTheme(settings.theme);

	// パスポート状態を取得
	const passport_status = usePassport();
	const {
		mint,
		isPending: is_mint_pending,
		error: mint_error,
		isSuccess: is_mint_success,
	} = useMintPassport();

	/**
	 * パスポートを発行するハンドラー
	 */
	async function handle_mint_passport() {
		try {
			// ウォレット接続確認
			if (!walletAddress) {
				throw new Error("ウォレットが接続されていません");
			}

			// ウォレットアドレスから決定論的にseal_idを生成
			const seal_id = await generateSealId(walletAddress);
			console.log(`[Mint] Generated seal_id: ${seal_id.substring(0, 16)}...`);

			// パスポートをmint
			await mint(seal_id, undefined, false); // seal_id, country_code, analytics_opt_in
		} catch (error) {
			// エラーはuseMintPassportで処理される
			console.error("パスポート発行エラー:", error);
		}
	}

	// ウォレットが接続されていない場合はランディングページへ
	useEffect(() => {
		if (!walletAddress) {
			router.push(`/${locale}`);
		}
	}, [walletAddress, router, locale]);

	// パスポート発行成功後、プロフィール登録画面へ遷移
	useEffect(() => {
		// TODO: Dynamic Fields対応
		// 新しいモデルでは、データの存在確認にget_data_entryを使用する必要がある
		// 現在は簡略化: profileがロード済みならホームへ、なければプロフィール入力へ

		// 既にパスポートがあり、プロフィールもロード済みならホームへ
		if (passport_status.has_passport && profile) {
			router.replace(`/${locale}/app`);
			return;
		}

		// パスポートあり（または新規mint完了）の場合はプロフィール入力へ
		if (is_mint_success || passport_status.has_passport) {
			router.replace(`/${locale}/app/profile`);
		}
	}, [is_mint_success, passport_status.has_passport, profile, router, locale]);

	if (!walletAddress) {
		return null; // リダイレクト中
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
			<div className="w-full max-w-md">
				{/* タイトル */}
				<div className="mb-8 text-center">
					<Shield
						className="mx-auto mb-4 h-16 w-16"
						style={{ color: theme.colors.primary }}
					/>
					<h1
						className="mb-2 text-3xl font-bold"
						style={{ color: theme.colors.text }}
					>
						{t("title")}
					</h1>
					<p className="text-sm" style={{ color: theme.colors.textSecondary }}>
						{t("subtitle")}
					</p>
				</div>

				{/* パスポート状態 */}
				{passport_status.loading ? (
					<div
						className="rounded-xl border-2 p-6"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: theme.colors.primary,
						}}
					>
						<div className="flex flex-col items-center">
							<Loader2
								className="mb-4 h-12 w-12 animate-spin"
								style={{ color: theme.colors.primary }}
							/>
							<span
								className="text-sm"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("messages.checking")}
							</span>
						</div>
					</div>
				) : passport_status.error ? (
					<div
						className="rounded-xl border-2 p-6"
						style={{
							backgroundColor: "#FEE2E2",
							borderColor: "#EF4444",
						}}
					>
						<div className="mb-3 flex items-center justify-center">
							<AlertCircle
								className="mr-2 h-8 w-8"
								style={{ color: "#EF4444" }}
							/>
							<h3 className="text-lg font-bold" style={{ color: "#DC2626" }}>
								{t("messages.errorTitle")}
							</h3>
						</div>
						<p
							className="mb-4 text-center text-sm"
							style={{ color: "#991B1B" }}
						>
							{passport_status.error}
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="w-full rounded-lg p-3 text-sm font-medium text-white"
							style={{ backgroundColor: "#EF4444" }}
						>
							{t("actions.reload")}
						</button>
					</div>
				) : is_mint_success || passport_status.has_passport ? (
					<div
						className="rounded-xl border-2 p-6"
						style={{
							backgroundColor: "#D1FAE5",
							borderColor: "#10B981",
						}}
					>
						<div className="mb-3 flex items-center justify-center">
							<CheckCircle
								className="mr-2 h-8 w-8"
								style={{ color: "#10B981" }}
							/>
							<h3 className="text-lg font-bold" style={{ color: "#059669" }}>
								{t("messages.successTitle")}
							</h3>
						</div>
						<p
							className="mb-4 text-center text-sm"
							style={{ color: "#047857" }}
						>
							{t("messages.successBody")}
						</p>
						<div className="flex justify-center">
							<Loader2
								className="h-6 w-6 animate-spin"
								style={{ color: "#10B981" }}
							/>
						</div>
					</div>
				) : (
					<div
						className="rounded-xl border-2 p-6"
						style={{
							backgroundColor: theme.colors.surface,
							borderColor: theme.colors.primary,
						}}
					>
						<div className="mb-4">
							<h3
								className="mb-2 font-bold"
								style={{ color: theme.colors.text }}
							>
								{t("faq.title")}
							</h3>
							<p
								className="mb-4 text-sm leading-relaxed"
								style={{ color: theme.colors.textSecondary }}
							>
								{t("faq.description")}
							</p>
							<div
								className="space-y-2 text-sm"
								style={{ color: theme.colors.textSecondary }}
							>
								{(Array.isArray(t.raw("faq.points"))
									? (t.raw("faq.points") as string[])
									: []
								).map((point) => (
									<p key={point}>✅ {point}</p>
								))}
							</div>
						</div>

						{mint_error && (
							<div
								className="mb-4 rounded-lg p-3 text-sm"
								style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
							>
								<div className="flex items-start">
									<AlertCircle className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
									<span>{mint_error.message}</span>
								</div>
							</div>
						)}

						<button
							type="button"
							onClick={handle_mint_passport}
							disabled={is_mint_pending}
							className="w-full rounded-lg p-4 text-base font-semibold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
							style={{ backgroundColor: theme.colors.primary }}
						>
							{is_mint_pending ? (
								<span className="flex items-center justify-center">
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									{t("actions.minting")}
								</span>
							) : (
								t("actions.mint")
							)}
						</button>

						<button
							type="button"
							onClick={() => router.push(`/${locale}`)}
							className="mt-3 w-full rounded-lg p-3 text-sm font-medium"
							style={{
								backgroundColor: theme.colors.surface,
								color: theme.colors.textSecondary,
								border: `1px solid ${theme.colors.textSecondary}40`,
							}}
						>
							{t("actions.back")}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
