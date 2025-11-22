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
use sui::display;
use sui::dynamic_field as df;
use sui::package::Publisher;

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
/// - `seal_id`: Seal暗号化システムの鍵/ポリシーID
/// - `country_code`: 発行国コード（ISO 3166-1 alpha-2想定）
/// - `analytics_opt_in`: 匿名統計データ提供への同意フラグ
public struct MedicalPassport has key {
    id: object::UID,
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
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

// ============================================================
// Display 用定数
// ============================================================

/// Display name (固定)
const DISPLAY_NAME_BYTES: vector<u8> = b"Cure Pocket Medical Passport";

/// Display description (固定)
const DISPLAY_DESCRIPTION_BYTES: vector<u8> =
    b"Soulbound medical passport for Cure Pocket";

/// Display image URL (固定)
const DISPLAY_IMAGE_URL_BYTES: vector<u8> =
    b"https://raw.githubusercontent.com/UnagiLabs/cure_pocket/main/frontend/src/app/icon.png";

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
/// - `seal_id`: 継承されるSeal ID
/// - `country_code`: 継承される国コード
/// - `analytics_opt_in`: 継承される統計データ提供可否
/// - `timestamp_ms`: 移行実行時刻（ミリ秒）
public struct PassportMigrationEvent has copy, drop {
    old_owner: address,
    new_owner: address,
    passport_id: object::ID,
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
    timestamp_ms: u64,
}

// ============================================================
// エラーコード
// ============================================================

/// Seal IDが空文字列
const E_EMPTY_SEAL_ID: u64 = 1;

/// 国コードが空文字列
const E_EMPTY_COUNTRY_CODE: u64 = 2;

/// 既にパスポートを所持している
const E_ALREADY_HAS_PASSPORT: u64 = 3;

/// 移行先アドレスが既にパスポートを所持している
const E_MIGRATION_TARGET_HAS_PASSPORT: u64 = 4;

/// Registryに既に登録済み
const E_REGISTRY_ALREADY_REGISTERED: u64 = 6;

/// Registryにエントリーが存在しない
const E_REGISTRY_NOT_FOUND: u64 = 7;

/// 移行元オーナーが不一致
const E_NOT_OWNER_FOR_MIGRATION: u64 = 8;

/// データ種キーが空
const E_EMPTY_DATA_TYPE_KEY: u64 = 9;

/// Blob ID リストが空
const E_EMPTY_BLOB_IDS: u64 = 10;

/// 指定データ種が既に存在
const E_DATA_ENTRY_ALREADY_EXISTS: u64 = 11;

/// 指定データ種が存在しない
const E_DATA_ENTRY_NOT_FOUND: u64 = 12;

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

/// E_EMPTY_SEAL_ID エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
/// - Move 2024 では const を public にできないため、ゲッター経由でアクセス
///
/// ## 返り値
/// - エラーコード `E_EMPTY_SEAL_ID` の値
public(package) fun e_empty_seal_id(): u64 {
    E_EMPTY_SEAL_ID
}

/// E_REGISTRY_ALREADY_REGISTERED エラーコードを取得
public(package) fun e_registry_already_registered(): u64 {
    E_REGISTRY_ALREADY_REGISTERED
}

/// E_REGISTRY_NOT_FOUND エラーコードを取得
public(package) fun e_registry_not_found(): u64 {
    E_REGISTRY_NOT_FOUND
}

/// E_NOT_OWNER_FOR_MIGRATION エラーコードを取得
public(package) fun e_not_owner_for_migration(): u64 {
    E_NOT_OWNER_FOR_MIGRATION
}

// ============================================================
// Display 生成・更新
// ============================================================

/// MedicalPassport 用の Display を生成し、標準フィールドを設定して返す
///
/// ## フィールド
/// - `name`: `"Cure Pocket Medical Passport"`
/// - `description`: `"Soulbound medical passport for Cure Pocket"`
/// - `image_url`: GitHub 上のアイコン固定URL
///
/// ## 注意
/// - Publisher からのみ呼び出し可能（display::new_with_fields が検証）
public(package) fun create_passport_display(
    publisher: &Publisher,
    ctx: &mut tx_context::TxContext
): display::Display<MedicalPassport> {
    display::new_with_fields<MedicalPassport>(
        publisher,
        vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
        ],
        vector[
            string::utf8(DISPLAY_NAME_BYTES),
            string::utf8(DISPLAY_DESCRIPTION_BYTES),
            string::utf8(DISPLAY_IMAGE_URL_BYTES),
        ],
        ctx
    )
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
/// - `seal_id` と `country_code` が空文字列でないことを確認
///
/// ## パラメータ
/// - `seal_id`: Seal鍵ID（空文字列不可）
/// - `country_code`: 国コード（空文字列不可）
/// - `analytics_opt_in`: 匿名統計データ提供可否
/// - `ctx`: トランザクションコンテキスト
///
/// ## 返り値
/// - `MedicalPassport`: 新しく生成されたパスポートオブジェクト
///
/// ## Aborts
/// - `E_EMPTY_SEAL_ID`: seal_idが空文字列
/// - `E_EMPTY_COUNTRY_CODE`: country_codeが空文字列
public(package) fun create_passport_internal(
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
    ctx: &mut tx_context::TxContext
): MedicalPassport {
    // バリデーション: 空文字列チェック
    assert!(!string::is_empty(&seal_id), E_EMPTY_SEAL_ID);
    assert!(!string::is_empty(&country_code), E_EMPTY_COUNTRY_CODE);

    // パスポートオブジェクトの生成
    MedicalPassport {
        id: object::new(ctx),
        seal_id,
        country_code,
        analytics_opt_in,
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

/// 統計データ提供可否フラグを取得
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - `analytics_opt_in` の値
public(package) fun get_analytics_opt_in(passport: &MedicalPassport): bool {
    passport.analytics_opt_in
}

/// パスポートの全情報を一括取得
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - タプル: (seal_id, country_code, analytics_opt_in)
public(package) fun get_all_fields(passport: &MedicalPassport): (&String, &String, bool) {
    (&passport.seal_id, &passport.country_code, passport.analytics_opt_in)
}

// ============================================================
// パッケージ内部関数: 動的フィールド (医療データ参照)
// ============================================================

/// パスポート配下に Walrus Blob ID リストを新規追加
///
/// ## 用途
/// - 医療データ種（例: `basic_profile`, `medications` など）ごとの Blob ID 配列を登録
/// - データ種キー未登録の場合のみ追加（重複登録はabort）
///
/// ## パラメータ
/// - `passport`: MedicalPassport への可変参照
/// - `data_type`: データ種キー（文字列）
/// - `blob_ids`: Walrus Blob ID の配列（1件以上必須）
///
/// ## Aborts
/// - `E_EMPTY_DATA_TYPE_KEY`: データ種キーが空
/// - `E_EMPTY_BLOB_IDS`: Blob ID 配列が空
/// - `E_DATA_ENTRY_ALREADY_EXISTS`: 既に同じキーが登録済み
public(package) fun add_data_entry(
    passport: &mut MedicalPassport,
    data_type: String,
    blob_ids: vector<String>
) {
    assert!(!string::is_empty(&data_type), E_EMPTY_DATA_TYPE_KEY);
    assert!(!vector::is_empty(&blob_ids), E_EMPTY_BLOB_IDS);
    assert!(
        !df::exists_<String>(&passport.id, data_type),
        E_DATA_ENTRY_ALREADY_EXISTS
    );

    df::add(&mut passport.id, data_type, blob_ids);
}

/// 既存のデータ種に紐づく Blob ID 配列を丸ごと置き換える
///
/// ## 用途
/// - 最新データへの差し替え
/// - 古い Blob を全て無効化し、新しい配列に置換
///
/// ## パラメータ
/// - `passport`: MedicalPassport への可変参照
/// - `data_type`: 置き換えるデータ種キー（文字列）
/// - `blob_ids`: 新しい Blob ID 配列（1件以上必須）
///
/// ## Aborts
/// - `E_EMPTY_DATA_TYPE_KEY`: データ種キーが空
/// - `E_EMPTY_BLOB_IDS`: Blob ID 配列が空
/// - `E_DATA_ENTRY_NOT_FOUND`: 指定キーが未登録
public(package) fun replace_data_entry(
    passport: &mut MedicalPassport,
    data_type: String,
    blob_ids: vector<String>
) {
    assert!(!string::is_empty(&data_type), E_EMPTY_DATA_TYPE_KEY);
    assert!(!vector::is_empty(&blob_ids), E_EMPTY_BLOB_IDS);
    assert!(
        df::exists_<String>(&passport.id, data_type),
        E_DATA_ENTRY_NOT_FOUND
    );

    let entry_ref = df::borrow_mut<String, vector<String>>(&mut passport.id, data_type);
    *entry_ref = blob_ids;
}

/// 指定データ種の Blob ID 配列を取得
///
/// ## パラメータ
/// - `passport`: MedicalPassport への参照
/// - `data_type`: 取得するデータ種キー（文字列）
///
/// ## 返り値
/// - `&vector<String>`: 登録済み Blob ID 配列への参照
///
/// ## Aborts
/// - `E_DATA_ENTRY_NOT_FOUND`: 指定キーが未登録
public(package) fun get_data_entry(
    passport: &MedicalPassport,
    data_type: String
): &vector<String> {
    assert!(
        df::exists_<String>(&passport.id, data_type),
        E_DATA_ENTRY_NOT_FOUND
    );

    df::borrow<String, vector<String>>(&passport.id, data_type)
}

/// 指定データ種の Blob ID 配列を削除し、値を返す
///
/// ## 用途
/// - データ種ごとに参照をリセットする
/// - パスポート削除や移行前のクリーンアップ
///
/// ## Aborts
/// - `E_DATA_ENTRY_NOT_FOUND`: 指定キーが未登録
public(package) fun remove_data_entry(
    passport: &mut MedicalPassport,
    data_type: String
): vector<String> {
    assert!(
        df::exists_<String>(&passport.id, data_type),
        E_DATA_ENTRY_NOT_FOUND
    );

    df::remove<String, vector<String>>(&mut passport.id, data_type)
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
    // 二重登録の明示的ガード（ユーザーUX向上）
    assert!(
        !df::exists_<address>(&registry.id, owner),
        E_REGISTRY_ALREADY_REGISTERED
    );
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
    // 未登録なら明示的にabortし、フロントのエラーハンドリングを簡潔にする
    assert!(
        df::exists_<address>(&registry.id, owner),
        E_REGISTRY_NOT_FOUND
    );
    let _passport_id = df::remove<address, object::ID>(&mut registry.id, owner);
}

/// 特定のパスポートが指定アドレスのものかを確認し、所有していない場合はabort
///
/// ## 用途
/// - Sealアクセス制御などで、特定のパスポートがsenderのものかを確認
/// - `address -> object::ID` から取得したパスポートIDと引数のパスポートIDを比較
/// - 所有していない場合は内部で`assert`を実行してabort
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの参照
/// - `passport_id`: 確認するパスポートのID
/// - `owner`: 確認するアドレス
/// - `error_code`: 所有していない場合にabortする際のエラーコード
///
/// ## Aborts
/// - `error_code`: 指定アドレスが指定パスポートを所有していない場合（パスポート未所持、または別のパスポートを所持）
public(package) fun assert_passport_owner(
    registry: &PassportRegistry,
    passport_id: object::ID,
    owner: address,
    error_code: u64
) {
    // アドレスがパスポートを所持しているか確認
    if (!df::exists_<address>(&registry.id, owner)) {
        abort error_code
    };
    
    // 登録されているパスポートIDを取得
    let registered_id = df::borrow<address, object::ID>(&registry.id, owner);
    
    // パスポートIDが一致するか確認
    assert!(*registered_id == passport_id, error_code);
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
/// - タプル: (seal_id, country_code, analytics_opt_in) の値のコピー
public(package) fun get_passport_data(passport: &MedicalPassport): (String, String, bool) {
    (
        passport.seal_id,
        passport.country_code,
        passport.analytics_opt_in,
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
    let MedicalPassport { id, seal_id: _, country_code: _, analytics_opt_in: _ } = passport;
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
/// - `seal_id`: Seal ID
/// - `country_code`: 国コード
/// - `analytics_opt_in`: 統計データ提供可否
/// - `timestamp_ms`: 移行実行時刻（ミリ秒）
public(package) fun emit_migration_event(
    old_owner: address,
    new_owner: address,
    passport_id: object::ID,
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
    timestamp_ms: u64
) {
    let migration_event = PassportMigrationEvent {
        old_owner,
        new_owner,
        passport_id,
        seal_id,
        country_code,
        analytics_opt_in,
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

/// テスト専用: MedicalPassport を破棄
#[test_only]
public fun destroy_passport_for_tests(passport: MedicalPassport) {
    let MedicalPassport { id, seal_id: _, country_code: _, analytics_opt_in: _ } = passport;
    object::delete(id);
}

/// テスト専用: PassportRegistry を破棄
#[test_only]
public fun destroy_registry_for_tests(registry: PassportRegistry) {
    let PassportRegistry { id } = registry;
    object::delete(id);
}
