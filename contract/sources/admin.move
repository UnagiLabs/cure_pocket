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
module cure_pocket::admin;

use std::string::String;
use sui::clock::Clock;
use cure_pocket::cure_pocket::AdminCap;
use cure_pocket::medical_passport::{Self, PassportRegistry, MedicalPassport};

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
    public fun admin_mint_medical_passport(
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

        // パスポートIDを取得
        let passport_id = object::id(&passport);

        // tx送信者に転送（Soulbound: この後は譲渡不可）
        medical_passport::transfer_to(passport, sender);

        // Registry にパスポートIDを登録
        medical_passport::register_passport_with_id(registry, passport_id, sender);
    }

    /// パスポート移行（管理者専用）
    ///
    /// ## 権限
    /// - `AdminCap` への参照を引数として要求
    /// - `AdminCap` を所有している者のみが呼び出し可能
    ///
    /// ## 用途
    /// - ユーザーがウォレットを紛失した際のパスポート移行
    /// - 既存のパスポートデータ（walrus_blob_id, seal_id, country_code）を
    ///   新しいアドレスに移行し、元のパスポートは削除
    ///
    /// ## 制約
    /// - 移行先は必ず空のアドレス（パスポート未所持）でなければならない
    /// - 1ウォレット1枚制約を厳守
    ///
    /// ## 動作フロー
    /// 1. 移行先の状態チェック（既にパスポートを所持していないか）
    /// 2. 移行元のマッピングを削除
    /// 3. パスポートデータを取得
    /// 4. 移行イベントを構築・発行（監査証跡）
    /// 5. 元のパスポートを削除（burn）
    /// 6. 同じデータで新しいパスポートを作成
    /// 7. 新しいパスポートIDを取得
    /// 8. 新しいパスポートを移行先に転送
    /// 9. 移行先のパスポートIDを登録
    ///
    /// ## パラメータ
    /// - `_admin`: AdminCapへの参照（権限証明）
    /// - `registry`: PassportRegistry の可変参照（共有オブジェクト）
    /// - `old_owner`: 移行元アドレス
    /// - `new_owner`: 移行先アドレス
    /// - `passport`: 移行するMedicalPassport（所有権を受け取る）
    /// - `clock`: 時刻取得用のClockオブジェクト
    /// - `ctx`: トランザクションコンテキスト
    ///
    /// ## 結果
    /// - 移行先アドレスに新しい `MedicalPassport` が転送される
    /// - `PassportMigrationEvent` が発行される
    ///
    /// ## Aborts
    /// - `E_MIGRATION_TARGET_HAS_PASSPORT`: 移行先が既にパスポートを所持している
    public fun migrate_passport(
        _admin: &AdminCap,
        registry: &mut PassportRegistry,
        old_owner: address,
        new_owner: address,
        passport: MedicalPassport,
        clock: &Clock,
        ctx: &mut tx_context::TxContext
    ) {
        // 1. 移行先の状態チェック: 既にパスポートを持っていないか確認
        assert!(
            !medical_passport::has_passport(registry, new_owner),
            medical_passport::e_migration_target_has_passport()
        );

        // 2. 移行元のマッピングを削除
        medical_passport::unregister_passport_by_owner(registry, old_owner);

        // 3. パスポートデータを取得（値のコピー）
        let (walrus_blob_id, seal_id, country_code) = medical_passport::get_passport_data(&passport);

        // 4. 移行イベントを構築・発行
        let passport_id = object::id(&passport);
        let timestamp_ms = sui::clock::timestamp_ms(clock);
        medical_passport::emit_migration_event(
            old_owner,
            new_owner,
            passport_id,
            walrus_blob_id,
            timestamp_ms
        );

        // 5. 元のパスポートを削除（burn）
        medical_passport::burn_passport(passport);

        // 6. 同じデータで新しいパスポートを作成
        let new_passport = medical_passport::create_passport_internal(
            walrus_blob_id,
            seal_id,
            country_code,
            ctx
        );

        // 7. 新しいパスポートIDを取得（転送前に取得）
        let new_passport_id = object::id(&new_passport);

        // 8. 新しいパスポートを移行先に転送
        medical_passport::transfer_to(new_passport, new_owner);

        // 9. 移行先のパスポートIDを登録
        medical_passport::register_passport_with_id(registry, new_passport_id, new_owner);
    }
