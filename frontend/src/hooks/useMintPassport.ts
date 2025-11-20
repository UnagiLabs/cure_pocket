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
 * - MVP段階では、`walrus_blob_id`と`seal_id`はモック値を使用
 * - 国コードはブラウザのロケールまたはユーザー設定から取得（デフォルト: "JP"）
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
	 * @param walrus_blob_id - Walrus blob ID（MVP段階ではモック値）
	 * @param seal_id - Seal ID（MVP段階ではモック値）
	 * @param country_code - 国コード（省略時はデフォルト値を使用）
	 * @throws トランザクション送信失敗時
	 */
	mint: (
		walrus_blob_id: string,
		seal_id: string,
		country_code?: string,
	) => Promise<void>;
	/**
	 * トランザクション送信中かどうか
	 */
	isPending: boolean;
	/**
	 * エラー情報
	 */
	error: Error | null;
}

/**
 * パスポートを発行するカスタムフック
 *
 * @returns パスポート発行関数、ローディング状態、エラー情報
 */
export function useMintPassport(): UseMintPassportReturn {
	const {
		mutate: sign_and_execute,
		isPending,
		error,
	} = useSignAndExecuteTransaction();
	const [mint_error, set_mint_error] = useState<Error | null>(null);

	/**
	 * パスポートを発行する関数
	 *
	 * @param walrus_blob_id - Walrus blob ID
	 * @param seal_id - Seal ID
	 * @param country_code - 国コード（省略時はデフォルト値を使用）
	 */
	async function mint(
		walrus_blob_id: string,
		seal_id: string,
		country_code?: string,
	): Promise<void> {
		try {
			// 環境変数の確認
			const package_id = get_package_id();
			const registry_id = get_registry_id();

			// 国コードが指定されていない場合はデフォルト値を使用
			const final_country_code = country_code || get_default_country_code();

			// Transactionを構築
			const tx = new Transaction();
			tx.moveCall({
				target: `${package_id}::medical_passport_accessor::mint_medical_passport`,
				arguments: [
					tx.object(registry_id), // PassportRegistry (shared object)
					tx.pure.string(walrus_blob_id), // walrus_blob_id
					tx.pure.string(seal_id), // seal_id
					tx.pure.string(final_country_code), // country_code
				],
			});

			// トランザクションを送信
			sign_and_execute(
				{
					transaction: tx,
				},
				{
					onSuccess: () => {
						// 成功時の処理（必要に応じて実装）
						set_mint_error(null);
					},
					onError: (error) => {
						// エラー時の処理
						const error_message =
							error instanceof Error
								? error.message
								: "パスポート発行に失敗しました";
						set_mint_error(new Error(error_message));
					},
				},
			);
		} catch (error) {
			// エラーハンドリング
			const error_message =
				error instanceof Error ? error.message : "パスポート発行に失敗しました";
			set_mint_error(new Error(error_message));
			throw error;
		}
	}

	return {
		mint,
		isPending,
		error: mint_error || (error as Error | null),
	};
}
