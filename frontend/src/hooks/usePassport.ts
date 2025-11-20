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
import { useEffect, useState } from "react";
import type { MedicalPassport, PassportStatus } from "@/types";

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
 * @returns パスポートの状態（保有状態、パスポート情報、ローディング状態、エラー）
 */
export function usePassport(): PassportStatus {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const [status, set_status] = useState<PassportStatus>({
    has_passport: false,
    passport: null,
    loading: true,
    error: null,
  });

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
          transactionBlock: await tx.build({ client }),
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

        // bool値をデコード
        const has_passport = bcs.de("bool", return_values[0][1]);

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

        // パスポートを所持している場合、パスポートIDを取得してget_all_fieldsを呼び出す
        // まず、PassportRegistryからパスポートIDを取得する必要がある
        // ただし、get_all_fieldsはパスポートオブジェクトが必要なので、
        // オブジェクトを取得する必要がある
        // ここでは、まずパスポートオブジェクトを取得する方法を実装する必要がある
        // しかし、PassportRegistryからパスポートIDを取得する関数がpublicでないため、
        // 別のアプローチが必要

        // 暫定的に、パスポートが存在することを示すのみ
        // Phase 2でパスポート情報の取得を実装する
        set_status({
          has_passport: true,
          passport: null, // 暫定的にnull
          loading: false,
          error: null,
        });
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
  }, [client, account]);

  return status;
}
