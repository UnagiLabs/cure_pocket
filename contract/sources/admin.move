/// Cure Pocket Medical Passport - 管理者モジュール
///
/// AdminCap（管理者権限）の管理とパスポート発行（mint）操作を提供
///
/// ## 権限モデル
/// - `AdminCap` を所有している者のみがパスポートを発行可能
/// - `AdminCap` はパッケージデプロイ時に1つ生成され、デプロイヤーに付与される
/// - `AdminCap` 自体は譲渡可能（必要に応じて管理権限を委譲できる）
///
/// ## 公開API
/// - `mint_medical_passport`: AdminCapを持つ者がパスポートを発行
module cure_pocket::medical_passport_admin;

use std::string::String;
use cure_pocket::cure_pocket::AdminCap;
use cure_pocket::medical_passport;

    // ============================================================
    // 管理者専用操作（将来の拡張用）
    // ============================================================

    /// メディカルパスポートのmint（発行）
    ///
    /// ## 権限
    /// - `AdminCap` への参照を引数として要求
    /// - `AdminCap` を所有している者のみが呼び出し可能
    ///
    /// ## 動作
    /// 1. 内部関数 `create_passport_internal()` でパスポートを生成
    /// 2. 生成したパスポートを tx 送信者に転送
    /// 3. パスポートは Soulbound（譲渡不可）となる
    ///
    /// ## パラメータ
    /// - `_admin`: AdminCapへの参照（権限証明として使用、内容は読まない）
    /// - `walrus_blob_id`: Walrus上の医療データblob ID
    /// - `seal_id`: Seal暗号化システムの鍵/ポリシーID
    /// - `country_code`: 発行国コード
    /// - `ctx`: トランザクションコンテキスト
    ///
    /// ## 結果
    /// - tx送信者に `MedicalPassport` が転送される
    ///
    /// ## Aborts
    /// - `E_EMPTY_WALRUS_BLOB_ID`: walrus_blob_idが空文字列（create_passport_internalでabort）
    /// - `E_EMPTY_SEAL_ID`: seal_idが空文字列（create_passport_internalでabort）
    /// - `E_EMPTY_COUNTRY_CODE`: country_codeが空文字列（create_passport_internalでabort）
    public fun mint_medical_passport(
        _admin: &AdminCap,  // 所有していることが権限証明（内容は使用しない）
        walrus_blob_id: String,
        seal_id: String,
        country_code: String,
        ctx: &mut tx_context::TxContext
    ) {
        // パスポートを生成
        let passport = medical_passport::create_passport_internal(
            walrus_blob_id,
            seal_id,
            country_code,
            ctx
        );

        // tx送信者に転送（Soulbound: この後は譲渡不可）
        medical_passport::transfer_to(passport, tx_context::sender(ctx));
    }
