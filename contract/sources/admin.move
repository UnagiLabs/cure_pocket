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
use cure_pocket::medical_passport::{Self, PassportRegistry};

    // ============================================================
    // 管理者専用操作（将来の拡張用）
    // ============================================================

    /// メディカルパスポートのmint（発行）
    ///
    /// ## 権限
    /// - `AdminCap` への参照を引数として要求
    /// - `AdminCap` を所有している者のみが呼び出し可能
    ///
    /// ## 制約
    /// - 1ウォレット1枚まで: 既にパスポートを所持している場合はabort
    /// - PassportRegistry で所有状態を管理
    ///
    /// ## 動作
    /// 1. Registry で既存パスポートの有無をチェック
    /// 2. 内部関数 `create_passport_internal()` でパスポートを生成
    /// 3. 生成したパスポートを tx 送信者に転送
    /// 4. Registry にパスポート所有マーカーを登録
    /// 5. パスポートは Soulbound（譲渡不可）となる
    ///
    /// ## パラメータ
    /// - `_admin`: AdminCapへの参照（権限証明として使用、内容は読まない）
    /// - `registry`: PassportRegistry の可変参照（共有オブジェクト）
    /// - `walrus_blob_id`: Walrus上の医療データblob ID
    /// - `seal_id`: Seal暗号化システムの鍵/ポリシーID
    /// - `country_code`: 発行国コード
    /// - `ctx`: トランザクションコンテキスト
    ///
    /// ## 結果
    /// - tx送信者に `MedicalPassport` が転送される
    ///
    /// ## Aborts
    /// - `E_ALREADY_HAS_PASSPORT`: 既にパスポートを所持している
    /// - `E_EMPTY_WALRUS_BLOB_ID`: walrus_blob_idが空文字列（create_passport_internalでabort）
    /// - `E_EMPTY_SEAL_ID`: seal_idが空文字列（create_passport_internalでabort）
    /// - `E_EMPTY_COUNTRY_CODE`: country_codeが空文字列（create_passport_internalでabort）
    public fun mint_medical_passport(
        _admin: &AdminCap,  // 所有していることが権限証明（内容は使用しない）
        registry: &mut PassportRegistry,
        walrus_blob_id: String,
        seal_id: String,
        country_code: String,
        ctx: &mut tx_context::TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // 1ウォレット1枚制約: 既にパスポートを持っていないかチェック
        assert!(!medical_passport::has_passport(registry, sender), medical_passport::e_already_has_passport());

        // パスポートを生成
        let passport = medical_passport::create_passport_internal(
            walrus_blob_id,
            seal_id,
            country_code,
            ctx
        );

        // tx送信者に転送（Soulbound: この後は譲渡不可）
        medical_passport::transfer_to(passport, sender);

        // Registry にパスポート所有マーカーを登録
        medical_passport::register_passport(registry, sender);
    }
