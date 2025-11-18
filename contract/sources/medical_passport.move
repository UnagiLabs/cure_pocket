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
/// - Dynamic Fieldsで address -> PassportMarker の対応を管理
/// - すべてのmint操作は &mut PassportRegistry を受け取る
///
/// ## 制約保証
/// - 共有オブジェクトの &mut 参照により、同時mint時の競合を防止
/// - has_passport() で既存チェック、register_passport() で登録
/// - 同じアドレスへの二重mintは E_ALREADY_HAS_PASSPORT でabort
public struct PassportRegistry has key {
    id: object::UID,
}

/// パスポート所有マーカー
///
/// ## 用途
/// - Dynamic Fieldの値として使用
/// - address -> PassportMarker の対応で「このアドレスは既にパスポートを持っている」を記録
///
/// ## 設計
/// - `has store` のみ（Dynamic Fieldに格納可能）
/// - 空の構造体（マーカーとしての役割のみ）
public struct PassportMarker has store {}

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
/// - パスポートの実体ではなく、PassportMarkerの存在を確認
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

/// 指定アドレスにパスポート所有マーカーを登録
///
/// ## 注意
/// - mint成功後に呼び出される
/// - Dynamic Fieldとして address -> PassportMarker を追加
/// - 既に登録されている場合はabort（通常は has_passport() で事前チェック済み）
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの可変参照
/// - `owner`: 登録するアドレス
///
/// ## Aborts
/// - Dynamic Fieldの add が失敗する場合（既に同じキーが存在する場合）
public(package) fun register_passport(registry: &mut PassportRegistry, owner: address) {
    df::add(&mut registry.id, owner, PassportMarker {});
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