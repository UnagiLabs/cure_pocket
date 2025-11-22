/**
 * useMintPassport フック
 *
 * ## 概要
 * Suiコントラクトの`mint_medical_passport`エントリー関数を呼び出して
 * パスポートを発行するカスタムフック。
 *
 * ## 主な仕様
 * - `useSignAndExecuteTransaction`を使用してトランザクションを送信
 * - `mint_medical_passport`エントリー関数を呼び出すPTBを構築
 * - MVP段階では、`seal_id`はモック値を使用
 * - 国コードはブラウザのロケールまたはユーザー設定から取得（デフォルト: "JP"）
 * - 統計データ提供同意フラグ（`analytics_opt_in`）を指定可能（デフォルト: false）
 *
 * ## 制限事項
 * - ウォレットが接続されていない場合はエラーを返す
 * - 環境変数が設定されていない場合はエラーを返す
 * - 既にパスポートを所持している場合はトランザクションが失敗する
 * - ネットワークエラー時は適切にエラーメッセージを返す
 */
"use client";

import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";

/**
 * パッケージIDを取得
 *
 * @returns パッケージID
 * @throws 環境変数が設定されていない場合
 */
function get_package_id(): string {
	const package_id = process.env.NEXT_PUBLIC_PACKAGE_ID;
	if (!package_id) {
		throw new Error("NEXT_PUBLIC_PACKAGE_ID is not set");
	}
	return package_id;
}

/**
 * パスポートレジストリIDを取得
 *
 * @returns パスポートレジストリID
 * @throws 環境変数が設定されていない場合
 */
function get_registry_id(): string {
	const registry_id = process.env.NEXT_PUBLIC_PASSPORT_REGISTRY_ID;
	if (!registry_id) {
		throw new Error("NEXT_PUBLIC_PASSPORT_REGISTRY_ID is not set");
	}
	return registry_id;
}

/**
 * デフォルトの国コードを取得
 *
 * @returns 国コード（ISO 3166-1 alpha-2）
 */
function get_default_country_code(): string {
	// ブラウザのロケールから国コードを取得を試みる
	const locale = navigator.language || "ja-JP";
	const country_code = locale.split("-")[1]?.toUpperCase() || "JP";
	return country_code;
}

/**
 * パスポート発行フックの戻り値の型
 */
export interface UseMintPassportReturn {
	/**
	 * パスポートを発行する関数
	 *
	 * @param seal_id - Seal ID（MVP段階ではモック値）
	 * @param country_code - 国コード（省略時はデフォルト値を使用）
	 * @param analytics_opt_in - 統計データ提供同意フラグ（省略時はfalse）
	 * @returns トランザクションダイジェスト
	 * @throws トランザクション送信失敗時
	 */
	mint: (
		seal_id: string,
		country_code?: string,
		analytics_opt_in?: boolean,
	) => Promise<string | undefined>;
	/**
	 * トランザクション送信中かどうか
	 */
	isPending: boolean;
	/**
	 * トランザクション成功したかどうか
	 */
	isSuccess: boolean;
	/**
	 * エラー情報
	 */
	error: Error | null;
}

/**
 * パスポートを発行するカスタムフック
 *
 * @param onMintSuccess - パスポート発行成功時のコールバック関数（トランザクションダイジェストを受け取る）
 * @returns パスポート発行関数、ローディング状態、エラー情報
 */
export function useMintPassport(
	onMintSuccess?: (digest: string) => void,
): UseMintPassportReturn {
	const {
		mutate: sign_and_execute,
		isPending,
		error,
	} = useSignAndExecuteTransaction();
	const [mint_error, set_mint_error] = useState<Error | null>(null);
	const [is_success, set_is_success] = useState(false);

	/**
	 * パスポートを発行する関数
	 *
	 * @param seal_id - Seal ID
	 * @param country_code - 国コード（省略時はデフォルト値を使用）
	 * @param analytics_opt_in - 統計データ提供同意フラグ（省略時はfalse）
	 * @returns トランザクションダイジェスト
	 */
	async function mint(
		seal_id: string,
		country_code?: string,
		analytics_opt_in?: boolean,
	): Promise<string | undefined> {
		return new Promise((resolve, reject) => {
			try {
				// 環境変数の確認
				const package_id = get_package_id();
				const registry_id = get_registry_id();

				// 国コードが指定されていない場合はデフォルト値を使用
				const final_country_code = country_code || get_default_country_code();
				// analytics_opt_inが指定されていない場合はfalseを使用
				const final_analytics_opt_in = analytics_opt_in ?? false;

				// Transactionを構築
				const tx = new Transaction();
				tx.moveCall({
					target: `${package_id}::accessor::mint_medical_passport`,
					arguments: [
						tx.object(registry_id), // PassportRegistry (shared object)
						tx.pure.string(seal_id), // seal_id
						tx.pure.string(final_country_code), // country_code
						tx.pure.bool(final_analytics_opt_in), // analytics_opt_in
					],
				});

				// トランザクションを送信
				sign_and_execute(
					{
						transaction: tx,
					},
					{
						onSuccess: (result) => {
							// 成功時の処理
							set_mint_error(null);
							set_is_success(true);
							const digest = result.digest;
							// コールバック実行
							onMintSuccess?.(digest);
							resolve(digest);
						},
						onError: (error) => {
							// エラー時の処理
							const error_message =
								error instanceof Error
									? error.message
									: "パスポート発行に失敗しました";
							const mint_error_obj = new Error(error_message);
							set_mint_error(mint_error_obj);
							reject(mint_error_obj);
						},
					},
				);
			} catch (error) {
				// エラーハンドリング
				const error_message =
					error instanceof Error
						? error.message
						: "パスポート発行に失敗しました";
				const mint_error_obj = new Error(error_message);
				set_mint_error(mint_error_obj);
				reject(mint_error_obj);
			}
		});
	}

	return {
		mint,
		isPending,
		isSuccess: is_success,
		error: mint_error || (error as Error | null),
	};
}
