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

// ============================================================
// エラーコード
// ============================================================

/// Walrus blob IDが空文字列
const E_EMPTY_WALRUS_BLOB_ID: u64 = 1;

/// Seal IDが空文字列
const E_EMPTY_SEAL_ID: u64 = 2;

/// 国コードが空文字列
const E_EMPTY_COUNTRY_CODE: u64 = 3;

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