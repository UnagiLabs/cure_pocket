/**
 * usePassport フック
 *
 * ## 概要
 * Suiコントラクトからパスポートの保有状態と情報を取得するカスタムフック。
 * `has_passport`関数で保有確認を行い、保有している場合は`get_all_fields`で
 * パスポート情報を取得します。
 *
 * ## 主な仕様
 * - `useSuiClient`と`useCurrentAccount`を使用してSuiクライアントとアカウント情報を取得
 * - `devInspectTransactionBlock`を使用してdry-run実行でパスポート状態を確認
 * - BCSデコードを使用して戻り値を取得
 * - ローディング状態とエラーハンドリングを実装
 *
 * ## 制限事項
 * - ウォレットが接続されていない場合はエラーを返す
 * - 環境変数が設定されていない場合はエラーを返す
 * - ネットワークエラー時は適切にエラーメッセージを返す
 */
"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback, useEffect, useState } from "react";
import { getPassportByAddress } from "@/lib/suiClient";
import type { PassportStatus } from "@/types";

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
 * パスポートの保有状態と情報を取得するカスタムフック
 *
 * @returns パスポートの状態（保有状態、パスポート情報、ローディング状態、エラー）と再取得関数
 */
export function usePassport(): PassportStatus & { refresh: () => void } {
	const client = useSuiClient();
	const account = useCurrentAccount();
	const [status, set_status] = useState<PassportStatus>({
		has_passport: false,
		passport: null,
		loading: true,
		error: null,
	});
	const [refresh_trigger, set_refresh_trigger] = useState(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refresh_trigger で手動リフレッシュを行うため依存に含める
	useEffect(() => {
		/**
		 * パスポート状態を取得する非同期関数
		 */
		async function fetch_passport_status() {
			// アカウントが接続されていない場合はエラーを返す
			if (!account) {
				set_status({
					has_passport: false,
					passport: null,
					loading: false,
					error: "ウォレットが接続されていません",
				});
				return;
			}

			try {
				// 環境変数の確認
				const package_id = get_package_id();
				const registry_id = get_registry_id();

				// has_passport関数を呼び出すTransactionを構築
				const tx = new Transaction();
				tx.moveCall({
					target: `${package_id}::medical_passport_accessor::has_passport`,
					arguments: [
						tx.object(registry_id), // PassportRegistry
						tx.pure.address(account.address), // owner address
					],
				});

				// devInspectTransactionBlockでdry-run実行
				const result = await client.devInspectTransactionBlock({
					sender: account.address,
					// Transactionをそのまま渡してクライアント側で正しくシリアライズさせる
					transactionBlock: tx,
				});

				// エラーがある場合は処理を中断
				if (result.error) {
					throw new Error(`Transaction failed: ${result.error}`);
				}

				// 戻り値をBCSデコード
				const return_values = result.results?.[0]?.returnValues;
				if (!return_values || return_values.length === 0) {
					throw new Error("No return values from has_passport");
				}

				// bool値をデコード（returnValues は [bytes, typeTag] のタプル）
				const encoded = return_values[0][0]; // 0番目にBCSバイト配列が入る
				let has_passport: boolean;
				if (encoded instanceof Uint8Array) {
					has_passport = bcs.bool().parse(encoded);
				} else if (Array.isArray(encoded)) {
					has_passport = bcs.bool().parse(Uint8Array.from(encoded));
				} else if (typeof encoded === "string") {
					has_passport = bcs.bool().fromBase64(encoded);
				} else {
					throw new Error("Unsupported return value type from has_passport");
				}

				if (!has_passport) {
					// パスポートを所持していない場合
					set_status({
						has_passport: false,
						passport: null,
						loading: false,
						error: null,
					});
					return;
				}

				// パスポートを所持している場合、パスポート情報を取得
				try {
					const passport_data = await getPassportByAddress(account.address);

					if (!passport_data) {
						// パスポート情報が取得できない場合
						throw new Error(
							"パスポートは存在しますが、情報の取得に失敗しました",
						);
					}

					set_status({
						has_passport: true,
						passport: passport_data,
						loading: false,
						error: null,
					});
				} catch (passport_error) {
					// パスポート情報取得エラー
					const passport_error_message =
						passport_error instanceof Error
							? passport_error.message
							: "パスポート情報の取得に失敗しました";
					set_status({
						has_passport: true,
						passport: null,
						loading: false,
						error: passport_error_message,
					});
				}
			} catch (error) {
				// エラーハンドリング
				const error_message =
					error instanceof Error
						? error.message
						: "パスポート状態の取得に失敗しました";
				set_status({
					has_passport: false,
					passport: null,
					loading: false,
					error: error_message,
				});
			}
		}

		fetch_passport_status();
	}, [client, account, refresh_trigger]);

	/**
	 * パスポート状態を再取得する関数
	 */
	const refresh = useCallback(() => {
		set_refresh_trigger((prev) => prev + 1);
	}, []);

	return { ...status, refresh };
}
