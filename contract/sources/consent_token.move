/// Cure Pocket Consent Token - 閲覧権限管理モジュール
///
/// ConsentTokenのデータ構造と内部ロジックを提供
///
/// ## 責務
/// - ConsentToken構造体の定義
/// - Seal認証用ペイロード構造体の定義
/// - トークン作成のバリデーション
/// - フィールドアクセス（getter関数）
/// - Payload分解関数
///
/// ## 注意
/// - 公開APIは `accessor.move` に集約
module cure_pocket::consent_token;

use sui::object;
use sui::clock::Clock;
use std::string::String;

// ============================================================
// 型定義
// ============================================================

/// 閲覧権限管理用共有オブジェクト
///
/// ## 設計
/// - Shared Objectとして公開される
/// - 患者（grantor）が医師などに閲覧権限を付与する際に使用
/// - 合言葉（secret）のハッシュを保存し、検証時に使用
///
/// ## フィールド
/// - `id`: Suiオブジェクト識別子
/// - `passport_id`: 紐づくパスポートID
/// - `grantor`: 発行者（患者）のアドレス
/// - `secret_hash`: 合言葉のハッシュ（sha3_256）
/// - `scopes`: 閲覧許可スコープ（例: "medication", "lab_results"）
/// - `expiration_ms`: 有効期限（Unix timestamp ms）
/// - `is_active`: 有効フラグ（患者が無効化可能）
public struct ConsentToken has key, store {
    id: object::UID,
    passport_id: object::ID,
    grantor: address,
    secret_hash: vector<u8>,
    scopes: vector<String>,
    expiration_ms: u64,
    is_active: bool,
}

/// Seal認証用ペイロード（型定義のみ、BCSシリアライズ用）
///
/// ## 用途
/// - Sealキーサーバーが復号リクエスト時に使用
/// - BCSエンコードされた`vector<u8>`として`id`パラメータに渡される
/// - フロントエンド側でBCSシリアライズ時に使用される構造体定義
/// - Move側では`bcs::peel_*`系の関数で直接デシリアライズ
///
/// ## フィールド
/// - `secret`: 生の合言葉（32bytes random + salt想定）
/// - `target_passport_id`: 閲覧対象のパスポートID（address型としてBCSシリアライズ）
///
/// ## 注意
/// - Move側では直接使用されず、BCSのバイト列から直接読み取る
/// - フロントエンド側でのBCSシリアライズ時の型定義として使用
/// - フィールドは未使用だが、BCSシリアライズ時の型定義として必要
#[allow(unused_field)]
public struct SealAuthPayload has drop {
    secret: vector<u8>,
    target_passport_id: object::ID,
}

// ============================================================
// エラーコード
// ============================================================

/// ConsentTokenが無効化されている
const E_CONSENT_REVOKED: u64 = 201;

/// ConsentTokenの有効期限が切れている
const E_CONSENT_EXPIRED: u64 = 202;

/// パスポートIDが一致しない
const E_INVALID_PASSPORT_ID: u64 = 203;

/// 合言葉（secret）が一致しない
const E_INVALID_SECRET: u64 = 204;

/// 合言葉（secret）が空
const E_EMPTY_SECRET: u64 = 205;

/// 有効期限（duration_ms）が0
const E_INVALID_DURATION: u64 = 206;

/// スコープが空
const E_EMPTY_SCOPES: u64 = 207;

// ============================================================
// エラーコードゲッター
// ============================================================

/// E_CONSENT_REVOKED エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
/// - Move 2024 では const を public にできないため、ゲッター経由でアクセス
///
/// ## 返り値
/// - エラーコード `E_CONSENT_REVOKED` の値
public(package) fun e_consent_revoked(): u64 {
    E_CONSENT_REVOKED
}

/// E_CONSENT_EXPIRED エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_CONSENT_EXPIRED` の値
public(package) fun e_consent_expired(): u64 {
    E_CONSENT_EXPIRED
}

/// E_INVALID_PASSPORT_ID エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_INVALID_PASSPORT_ID` の値
public(package) fun e_invalid_passport_id(): u64 {
    E_INVALID_PASSPORT_ID
}

/// E_INVALID_SECRET エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_INVALID_SECRET` の値
public(package) fun e_invalid_secret(): u64 {
    E_INVALID_SECRET
}

// ============================================================
// パッケージ内部関数: フィールドアクセス
// ============================================================

/// ConsentTokenがアクティブかどうかを取得
///
/// ## パラメータ
/// - `token`: ConsentTokenへの参照
///
/// ## 返り値
/// - `true`: アクティブ（有効）
/// - `false`: 非アクティブ（無効化されている）
public(package) fun is_active(token: &ConsentToken): bool {
    token.is_active
}

/// 有効期限を取得
///
/// ## パラメータ
/// - `token`: ConsentTokenへの参照
///
/// ## 返り値
/// - 有効期限（Unix timestamp ms）
public(package) fun get_expiration(token: &ConsentToken): u64 {
    token.expiration_ms
}

/// パスポートIDを取得
///
/// ## パラメータ
/// - `token`: ConsentTokenへの参照
///
/// ## 返り値
/// - 紐づくパスポートID
public(package) fun get_passport_id(token: &ConsentToken): object::ID {
    token.passport_id
}

/// 合言葉のハッシュを取得
///
/// ## パラメータ
/// - `token`: ConsentTokenへの参照
///
/// ## 返り値
/// - 合言葉のハッシュ（sha3_256）
public(package) fun get_secret_hash(token: &ConsentToken): vector<u8> {
    token.secret_hash
}

/// 発行者（grantor）を取得
///
/// ## パラメータ
/// - `token`: ConsentTokenへの参照
///
/// ## 返り値
/// - 発行者（患者）のアドレス
public(package) fun get_grantor(token: &ConsentToken): address {
    token.grantor
}

/// スコープを取得
///
/// ## パラメータ
/// - `token`: ConsentTokenへの参照
///
/// ## 返り値
/// - スコープのベクターへの参照
public(package) fun get_scopes(token: &ConsentToken): &vector<String> {
    &token.scopes
}

// ============================================================
// パッケージ内部関数: Payload分解
// ============================================================

// Note: unpack_payload関数は不要になりました
// accessor.moveで直接bcs::peel_*系の関数を使用します

// ============================================================
// パッケージ内部関数: ConsentToken作成
// ============================================================

/// ConsentToken作成の内部ロジック
///
/// ## 注意
/// - この関数は `ConsentToken` を生成するのみで、shareは行わない
/// - share は呼び出し側（accessor モジュール）が責任を持つ
///
/// ## バリデーション
/// - `secret_hash`が空でないことを確認
/// - `duration_ms`が0でないことを確認
/// - `scopes`が空でないことを確認
///
/// ## パラメータ
/// - `passport_id`: 紐づくパスポートID
/// - `grantor`: 発行者（患者）のアドレス
/// - `secret_hash`: 合言葉のハッシュ（sha3_256）
/// - `scopes`: 閲覧許可スコープ
/// - `duration_ms`: 有効期限の期間（ミリ秒）
/// - `clock`: Sui Clock（現在時刻取得用）
/// - `ctx`: トランザクションコンテキスト
///
/// ## 返り値
/// - `ConsentToken`: 新しく生成されたトークンオブジェクト
///
/// ## Aborts
/// - `E_EMPTY_SECRET`: secret_hashが空
/// - `E_INVALID_DURATION`: duration_msが0
/// - `E_EMPTY_SCOPES`: scopesが空
public(package) fun create_consent_internal(
    passport_id: object::ID,
    grantor: address,
    secret_hash: vector<u8>,
    scopes: vector<String>,
    duration_ms: u64,
    clock: &Clock,
    ctx: &mut tx_context::TxContext
): ConsentToken {
    // バリデーション: secret_hashが空でないことを確認
    assert!(vector::length(&secret_hash) > 0, E_EMPTY_SECRET);

    // バリデーション: duration_msが0でないことを確認
    assert!(duration_ms > 0, E_INVALID_DURATION);

    // バリデーション: scopesが空でないことを確認
    assert!(vector::length(&scopes) > 0, E_EMPTY_SCOPES);

    // 現在時刻を取得
    let now = sui::clock::timestamp_ms(clock);

    // 有効期限を計算（現在時刻 + 期間）
    let expiration_ms = now + duration_ms;

    // ConsentTokenオブジェクトの生成
    ConsentToken {
        id: object::new(ctx),
        passport_id,
        grantor,
        secret_hash,
        scopes,
        expiration_ms,
        is_active: true,
    }
}

// ============================================================
// パッケージ内部関数: SharedObject化
// ============================================================

/// ConsentTokenを共有オブジェクトとして公開
///
/// ## 注意
/// - この関数はパッケージスコープ（`public(package)`）
/// - 外部からは呼び出し不可
/// - `accessor.move`から呼び出される
/// - カスタムshareポリシーを実装（ConsentTokenは必ずこの関数経由で共有）
///
/// ## パラメータ
/// - `token`: 共有オブジェクト化するConsentToken
#[allow(lint(custom_state_change), lint(share_owned))]
public(package) fun share_consent_token(token: ConsentToken) {
    sui::transfer::share_object(token);
}
