"use client";

import { AlertCircle, CheckCircle, Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useCheckProfileExists } from "@/hooks/useCheckProfileExists";
import { useMintPassport } from "@/hooks/useMintPassport";
import { usePassport } from "@/hooks/usePassport";
import { getTheme } from "@/lib/themes";

/**
 * パスポート発行画面
 * ウォレット接続後、最初に訪れるページ
 */
export default function PassportPage() {
	const t = useTranslations("passport");
	const router = useRouter();
	const locale = useLocale();
	const { settings, walletAddress, profile, isLoadingProfile } = useApp();
	const theme = getTheme(settings.theme);

	// パスポート状態を取得
	const passport_status = usePassport();
	const {
		profileExists,
		loading: profile_check_loading,
		error: profile_check_error,
		refetch: refetchProfileCheck,
	} = useCheckProfileExists();
	const {
		mint,
		isPending: is_mint_pending,
		error: mint_error,
		isSuccess: is_mint_success,
	} = useMintPassport();

	// Timeout and error states
	const [waitingTimeout, setWaitingTimeout] = useState(false);
	const [timeoutError, setTimeoutError] = useState<string | null>(null);

	/**
	 * パスポートを発行するハンドラー
	 */
	async function handle_mint_passport() {
		try {
			// ウォレット接続確認
			if (!walletAddress) {
				throw new Error("ウォレットが接続されていません");
			}

			// パスポートをmint
			await mint(undefined, false); // country_code, analytics_opt_in
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

	// Timeout handler - wait max 10 seconds for loading states to complete
	useEffect(() => {
		if (!passport_status.has_passport) {
			return; // Only apply timeout when passport exists
		}

		const isLoading = profile_check_loading || isLoadingProfile;
		if (!isLoading) {
			setWaitingTimeout(false);
			return;
		}

		console.log("[PassportPage] Starting timeout timer (10 seconds)");
		const timeoutId = setTimeout(() => {
			console.warn(
				"[PassportPage] Timeout reached while waiting for profile check",
			);
			setWaitingTimeout(true);
			setTimeoutError(
				"プロフィール確認がタイムアウトしました。リトライしてください。",
			);
		}, 10000); // 10 seconds

		return () => clearTimeout(timeoutId);
	}, [profile_check_loading, isLoadingProfile, passport_status.has_passport]);

	// パスポート発行成功後、プロフィール登録画面へ遷移
	useEffect(() => {
		// Skip if timeout occurred
		if (waitingTimeout) {
			console.log("[PassportPage] Skipping navigation due to timeout");
			return;
		}

		// Skip if still loading
		const isStillLoading = profile_check_loading || isLoadingProfile;
		if (isStillLoading) {
			console.log(
				`[PassportPage] Still loading - profile_check: ${profile_check_loading}, isLoadingProfile: ${isLoadingProfile}`,
			);
			return;
		}

		// Case 1: パスポートあり & プロフィールデータあり → ホーム画面へ
		// Both on-chain check (profileExists) and loaded state (profile) must be confirmed
		if (passport_status.has_passport && (profileExists || profile)) {
			console.log(
				"[PassportPage] Passport and profile both exist, redirecting to home",
			);
			router.replace(`/${locale}/app`);
			return;
		}

		// Case 2: パスポートあり（または新規mint完了）& プロフィールデータなし → プロフィール入力へ
		// Only navigate if we're sure profile doesn't exist (loading completed)
		if (
			(is_mint_success || passport_status.has_passport) &&
			!profileExists &&
			!profile &&
			!isLoadingProfile &&
			!profile_check_loading
		) {
			console.log(
				"[PassportPage] Passport exists but no profile data, redirecting to profile setup",
			);
			router.replace(`/${locale}/app/profile`);
		}
	}, [
		is_mint_success,
		passport_status.has_passport,
		profileExists,
		profile,
		profile_check_loading,
		isLoadingProfile,
		waitingTimeout,
		router,
		locale,
	]);

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

						{/* Loading state */}
						{(profile_check_loading || isLoadingProfile) && !waitingTimeout && (
							<div className="flex flex-col items-center space-y-2">
								<Loader2
									className="h-6 w-6 animate-spin"
									style={{ color: "#10B981" }}
								/>
								<p className="text-xs" style={{ color: "#047857" }}>
									{isLoadingProfile
										? "プロフィールデータを読み込み中..."
										: "プロフィール確認中..."}
								</p>
							</div>
						)}

						{/* Timeout error */}
						{waitingTimeout && timeoutError && (
							<div className="space-y-3">
								<div
									className="rounded-lg border-2 p-3"
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
										<p
											className="text-sm font-medium"
											style={{ color: "#DC2626" }}
										>
											タイムアウト
										</p>
									</div>
									<p className="text-xs" style={{ color: "#991B1B" }}>
										{timeoutError}
									</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setWaitingTimeout(false);
										setTimeoutError(null);
										refetchProfileCheck();
									}}
									className="w-full rounded-lg p-3 text-sm font-medium text-white"
									style={{ backgroundColor: "#10B981" }}
								>
									リトライ
								</button>
							</div>
						)}

						{/* Profile check error */}
						{profile_check_error && !waitingTimeout && (
							<div className="space-y-3">
								<div
									className="rounded-lg border-2 p-3"
									style={{
										backgroundColor: "#FEF3C7",
										borderColor: "#F59E0B",
									}}
								>
									<div className="mb-2 flex items-center">
										<AlertCircle
											className="mr-2 h-5 w-5"
											style={{ color: "#F59E0B" }}
										/>
										<p
											className="text-sm font-medium"
											style={{ color: "#D97706" }}
										>
											エラー
										</p>
									</div>
									<p className="text-xs" style={{ color: "#92400E" }}>
										{profile_check_error}
									</p>
								</div>
								<button
									type="button"
									onClick={() => refetchProfileCheck()}
									className="w-full rounded-lg p-3 text-sm font-medium text-white"
									style={{ backgroundColor: "#F59E0B" }}
								>
									リトライ
								</button>
							</div>
						)}
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
