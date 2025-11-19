/// Cure Pocket Medical Passport - コアモジュール
///
/// メディカルパスポート SBT の定義と内部ロジック
///
/// ## 責務
/// - MedicalPassport 構造体の定義
/// - パスポート作成のバリデーション
/// - パスポート転送（Soulbound維持のためパッケージスコープ）
/// - フィールドアクセス（getter関数）
///
/// ## 注意
/// - 公開APIは `accessor.move` に集約
module cure_pocket::medical_passport;

use std::string::{Self, String};
use sui::dynamic_field as df;

// ============================================================
// 型定義
// ============================================================

/// メディカルパスポート SBT
///
/// ## Soulbound 設計
/// - `has key` のみを持つ（`has store` なし）
/// - transfer関数を公開しない
/// - これにより譲渡不可能（Soulbound）を実現
///
/// ## フィールド
/// - `id`: Sui オブジェクトID
/// - `walrus_blob_id`: Walrus上の医療データ識別子
/// - `seal_id`: Seal暗号化システムの鍵/ポリシーID
/// - `country_code`: 発行国コード（ISO 3166-1 alpha-2想定）
public struct MedicalPassport has key {
    id: object::UID,
    walrus_blob_id: String,
    seal_id: String,
    country_code: String,
}

/// パスポートレジストリ - 1ウォレット1枚制約を実現
///
/// ## 設計
/// - 共有オブジェクト（shared object）として初期化時に1つだけ作成
/// - Dynamic Fieldsで address -> object::ID の対応を管理
/// - すべてのmint操作は &mut PassportRegistry を受け取る
///
/// ## 制約保証
/// - 共有オブジェクトの &mut 参照により、同時mint時の競合を防止
/// - has_passport() で既存チェック、register_passport_with_id() で登録
/// - 同じアドレスへの二重mintは E_ALREADY_HAS_PASSPORT でabort
///
/// ## マッピング
/// - `address -> object::ID`: アドレスとパスポートIDの対応を管理
/// - 1ウォレット1枚制約: addressがキーに存在するかで確認
/// - 特定のパスポートの所有者確認: address -> object::ID から取得したパスポートIDと比較
public struct PassportRegistry has key {
    id: object::UID,
}

/// パスポート移行イベント
///
/// ## 用途
/// - 管理者によるパスポート移行の記録
/// - 監査証跡として使用
/// - オフチェーンでの移行履歴追跡
///
/// ## フィールド
/// - `old_owner`: 移行元アドレス
/// - `new_owner`: 移行先アドレス
/// - `passport_id`: 移行されたパスポートのID（burnされる前のID）
/// - `walrus_blob_id`: 医療データ識別子
/// - `timestamp_ms`: 移行実行時刻（ミリ秒）
public struct PassportMigrationEvent has copy, drop {
    old_owner: address,
    new_owner: address,
    passport_id: object::ID,
    walrus_blob_id: String,
    timestamp_ms: u64,
}

// ============================================================
// エラーコード
// ============================================================

/// Walrus blob IDが空文字列
const E_EMPTY_WALRUS_BLOB_ID: u64 = 1;

/// Seal IDが空文字列
const E_EMPTY_SEAL_ID: u64 = 2;

/// 国コードが空文字列
const E_EMPTY_COUNTRY_CODE: u64 = 3;

/// 既にパスポートを所持している
const E_ALREADY_HAS_PASSPORT: u64 = 4;

/// 移行先アドレスが既にパスポートを所持している
const E_MIGRATION_TARGET_HAS_PASSPORT: u64 = 5;

// ============================================================
// エラーコードゲッター
// ============================================================

/// E_ALREADY_HAS_PASSPORT エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
/// - Move 2024 では const を public にできないため、ゲッター経由でアクセス
///
/// ## 返り値
/// - エラーコード `E_ALREADY_HAS_PASSPORT` の値
public(package) fun e_already_has_passport(): u64 {
    E_ALREADY_HAS_PASSPORT
}

/// E_MIGRATION_TARGET_HAS_PASSPORT エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
/// - Move 2024 では const を public にできないため、ゲッター経由でアクセス
///
/// ## 返り値
/// - エラーコード `E_MIGRATION_TARGET_HAS_PASSPORT` の値
public(package) fun e_migration_target_has_passport(): u64 {
    E_MIGRATION_TARGET_HAS_PASSPORT
}

// ============================================================
// パッケージ内部関数: パスポート作成
// ============================================================

/// パスポート作成の内部ロジック
///
/// ## 注意
/// - この関数は `MedicalPassport` を生成するのみで、transferは行わない
/// - transfer は呼び出し側（accessor, admin モジュール）が責任を持つ
/// - MedicalPassport は `has key` のため、このモジュール内でのみ作成可能
///
/// ## バリデーション
/// - すべてのフィールドが空文字列でないことを確認
///
/// ## パラメータ
/// - `walrus_blob_id`: Walrus blob ID（空文字列不可）
/// - `seal_id`: Seal鍵ID（空文字列不可）
/// - `country_code`: 国コード（空文字列不可）
/// - `ctx`: トランザクションコンテキスト
///
/// ## 返り値
/// - `MedicalPassport`: 新しく生成されたパスポートオブジェクト
///
/// ## Aborts
/// - `E_EMPTY_WALRUS_BLOB_ID`: walrus_blob_idが空文字列
/// - `E_EMPTY_SEAL_ID`: seal_idが空文字列
/// - `E_EMPTY_COUNTRY_CODE`: country_codeが空文字列
public(package) fun create_passport_internal(
    walrus_blob_id: String,
    seal_id: String,
    country_code: String,
    ctx: &mut tx_context::TxContext
): MedicalPassport {
    // バリデーション: 空文字列チェック
    assert!(!string::is_empty(&walrus_blob_id), E_EMPTY_WALRUS_BLOB_ID);
    assert!(!string::is_empty(&seal_id), E_EMPTY_SEAL_ID);
    assert!(!string::is_empty(&country_code), E_EMPTY_COUNTRY_CODE);

    // パスポートオブジェクトの生成
    MedicalPassport {
        id: object::new(ctx),
        walrus_blob_id,
        seal_id,
        country_code,
    }
}

// ============================================================
// パッケージ内部関数: 転送
// ============================================================

/// パスポートを指定アドレスに転送
///
/// ## 注意
/// - この関数はパッケージスコープ（`public(package)`）
/// - 外部からは呼び出し不可（Soulbound特性を維持）
/// - mint時にのみ使用される
///
/// ## パラメータ
/// - `passport`: 転送するMedicalPassport
/// - `recipient`: 受取人のアドレス
public(package) fun transfer_to(passport: MedicalPassport, recipient: address) {
    sui::transfer::transfer(passport, recipient);
}

// ============================================================
// 内部公開関数: フィールドアクセス
// ============================================================

/// Walrus blob IDを取得
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - Walrus blob IDへの参照
public(package) fun get_walrus_blob_id(passport: &MedicalPassport): &String {
    &passport.walrus_blob_id
}

/// Seal IDを取得
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - Seal IDへの参照
public(package) fun get_seal_id(passport: &MedicalPassport): &String {
    &passport.seal_id
}

/// 国コードを取得
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - 国コードへの参照
public(package) fun get_country_code(passport: &MedicalPassport): &String {
    &passport.country_code
}

/// パスポートの全情報を一括取得
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - タプル: (walrus_blob_id, seal_id, country_code)
public(package) fun get_all_fields(passport: &MedicalPassport): (&String, &String, &String) {
    (&passport.walrus_blob_id, &passport.seal_id, &passport.country_code)
}

// ============================================================
// パッケージ内部関数: パスポートレジストリ操作
// ============================================================

/// パスポートレジストリを作成して共有オブジェクト化
///
/// ## 注意
/// - この関数は `init` 関数から1度だけ呼ばれる
/// - 作成後、自動的に `transfer::share_object` で共有オブジェクト化する
///
/// ## パラメータ
/// - `ctx`: トランザクションコンテキスト
public(package) fun create_and_share_passport_registry(ctx: &mut tx_context::TxContext) {
    let registry = PassportRegistry {
        id: object::new(ctx),
    };
    sui::transfer::share_object(registry);
}

/// 指定アドレスが既にパスポートを所持しているか確認
///
/// ## 注意
/// - Dynamic Fieldの存在チェックを行う
/// - `address -> object::ID` マッピングの存在を確認
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの参照
/// - `owner`: 確認するアドレス
///
/// ## 返り値
/// - `true`: 既にパスポートを所持している
/// - `false`: まだパスポートを所持していない
public(package) fun has_passport(registry: &PassportRegistry, owner: address): bool {
    df::exists_<address>(&registry.id, owner)
}

/// 指定アドレスにパスポートIDを登録
///
/// ## 注意
/// - mint成功後に呼び出される
/// - Dynamic Fieldとして address -> object::ID を追加
/// - 既に登録されている場合はabort（通常は has_passport() で事前チェック済み）
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの可変参照
/// - `passport_id`: 登録するパスポートのID
/// - `owner`: 登録するアドレス
///
/// ## Aborts
/// - Dynamic Fieldの add が失敗する場合（既に同じキーが存在する場合）
public(package) fun register_passport_with_id(
    registry: &mut PassportRegistry,
    passport_id: object::ID,
    owner: address
) {
    df::add(&mut registry.id, owner, passport_id);
}

/// 指定アドレスからパスポートIDを削除
///
/// ## 用途
/// - パスポート移行時に移行元のマッピングを削除
/// - Dynamic Fieldから address -> object::ID の対応を削除
///
/// ## 注意
/// - マッピングが存在しない場合はabort
/// - 通常は has_passport() で事前チェックを行う
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの可変参照
/// - `owner`: 削除するアドレス
///
/// ## Aborts
/// - Dynamic Fieldの remove が失敗する場合（キーが存在しない場合）
public(package) fun unregister_passport_by_owner(registry: &mut PassportRegistry, owner: address) {
    let _passport_id = df::remove<address, object::ID>(&mut registry.id, owner);
}

/// 特定のパスポートが指定アドレスのものかを確認
///
/// ## 用途
/// - Sealアクセス制御などで、特定のパスポートがsenderのものかを確認
/// - `address -> object::ID` から取得したパスポートIDと引数のパスポートIDを比較
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの参照
/// - `passport_id`: 確認するパスポートのID
/// - `owner`: 確認するアドレス
///
/// ## 返り値
/// - `true`: 指定アドレスが指定パスポートを所有している
/// - `false`: 指定アドレスが指定パスポートを所有していない（パスポート未所持、または別のパスポートを所持）
public(package) fun is_passport_owner(
    registry: &PassportRegistry,
    passport_id: object::ID,
    owner: address
): bool {
    if (!df::exists_<address>(&registry.id, owner)) {
        return false
    };
    let registered_id = df::borrow<address, object::ID>(&registry.id, owner);
    *registered_id == passport_id
}

/// パスポートのデータを取得（値のコピー）
///
/// ## 用途
/// - パスポート移行時にデータをコピーして新しいパスポートを作成
/// - 参照ではなく値を返すため、元のパスポートをburn後も使用可能
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - タプル: (walrus_blob_id, seal_id, country_code) の値のコピー
public(package) fun get_passport_data(passport: &MedicalPassport): (String, String, String) {
    (
        passport.walrus_blob_id,
        passport.seal_id,
        passport.country_code
    )
}

/// パスポートを削除（burn）
///
/// ## 用途
/// - パスポート移行時に元のパスポートを削除
/// - オブジェクトを完全に削除し、ストレージを解放
///
/// ## 注意
/// - この関数は移行時にのみ使用される
/// - 単独のburn機能は提供しない（移行のみ可能）
///
/// ## パラメータ
/// - `passport`: 削除するMedicalPassport（所有権を受け取る）
public(package) fun burn_passport(passport: MedicalPassport) {
    let MedicalPassport { id, walrus_blob_id: _, seal_id: _, country_code: _ } = passport;
    object::delete(id);
}

/// パスポート移行イベントを発行
///
/// ## 用途
/// - パスポート移行時に監査証跡としてイベントを発行
/// - オフチェーンでの移行履歴追跡
///
/// ## パラメータ
/// - `old_owner`: 移行元アドレス
/// - `new_owner`: 移行先アドレス
/// - `passport_id`: 移行されたパスポートのID
/// - `walrus_blob_id`: 医療データ識別子
/// - `timestamp_ms`: 移行実行時刻（ミリ秒）
public(package) fun emit_migration_event(
    old_owner: address,
    new_owner: address,
    passport_id: object::ID,
    walrus_blob_id: String,
    timestamp_ms: u64
) {
    let migration_event = PassportMigrationEvent {
        old_owner,
        new_owner,
        passport_id,
        walrus_blob_id,
        timestamp_ms,
    };
    sui::event::emit(migration_event);
}

// ============================================================
// テスト専用関数
// ============================================================

/// テスト専用: PassportRegistryを作成（共有オブジェクト化しない）
///
/// ## 注意
/// - この関数はテストコードからのみ呼び出し可能（`#[test_only]`）
/// - 本番環境では `create_and_share_passport_registry()` を使用
///
/// ## 用途
/// - ユニットテストでのRegistry取得
/// - share_objectをシミュレートせずに直接Registryを取得
///
/// ## パラメータ
/// - `ctx`: トランザクションコンテキスト
///
/// ## 返り値
/// - `PassportRegistry`: 新しく生成されたレジストリオブジェクト
#[test_only]
public fun create_passport_registry(ctx: &mut tx_context::TxContext): PassportRegistry {
    PassportRegistry {
        id: object::new(ctx),
    }
}