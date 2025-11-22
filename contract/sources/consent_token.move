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

use sui::clock::Clock;
use std::string::String;
use std::hash;

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
/// - `requested_scope`: 要求されるスコープ（例: "medication", "lab_results"）
///
/// ## 注意
/// - Move側では直接使用されず、BCSのバイト列から直接読み取る
/// - フロントエンド側でのBCSシリアライズ時の型定義として使用
/// - フィールドは未使用だが、BCSシリアライズ時の型定義として必要
#[allow(unused_field)]
public struct SealAuthPayload has drop {
    secret: vector<u8>,
    target_passport_id: object::ID,
    requested_scope: String,
}

/// テスト専用: ConsentToken を破棄
#[test_only]
public fun destroy_consent_token_for_tests(token: ConsentToken) {
    let ConsentToken {
        id,
        passport_id: _,
        grantor: _,
        secret_hash: _,
        scopes: _,
        expiration_ms: _,
        is_active: _,
    } = token;
    object::delete(id);
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

/// 有効期限計算時のオーバーフロー
const E_EXPIRATION_OVERFLOW: u64 = 208;

/// スコープ不一致（将来用）
const E_SCOPE_NOT_ALLOWED: u64 = 209;

/// grantor以外による無効化試行（将来用）
const E_NON_GRANTOR_REVOKE: u64 = 210;

/// パスポート所有者以外がトークン作成を試行
const E_NOT_PASSPORT_OWNER: u64 = 211;

/// data_typeとrequested_scopeが不一致
const E_DATA_TYPE_MISMATCH: u64 = 212;

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

/// E_EXPIRATION_OVERFLOW エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_EXPIRATION_OVERFLOW` の値
public(package) fun e_expiration_overflow(): u64 {
    E_EXPIRATION_OVERFLOW
}

/// E_SCOPE_NOT_ALLOWED エラーコードを取得（将来用）
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_SCOPE_NOT_ALLOWED` の値
public(package) fun e_scope_not_allowed(): u64 {
    E_SCOPE_NOT_ALLOWED
}

/// E_NON_GRANTOR_REVOKE エラーコードを取得（将来用）
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_NON_GRANTOR_REVOKE` の値
public(package) fun e_non_grantor_revoke(): u64 {
    E_NON_GRANTOR_REVOKE
}

/// E_NOT_PASSPORT_OWNER エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_NOT_PASSPORT_OWNER` の値
public(package) fun e_not_passport_owner(): u64 {
    E_NOT_PASSPORT_OWNER
}

/// E_DATA_TYPE_MISMATCH エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
///
/// ## 返り値
/// - エラーコード `E_DATA_TYPE_MISMATCH` の値
public(package) fun e_data_type_mismatch(): u64 {
    E_DATA_TYPE_MISMATCH
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
/// - `E_EXPIRATION_OVERFLOW`: 有効期限計算時のオーバーフロー
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
    // 整数オーバーフロー対策: u64::MAXを超えないことを確認
    // u64::MAX = 18446744073709551615
    assert!(now <= (18446744073709551615u64 - duration_ms), E_EXPIRATION_OVERFLOW);
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

// ============================================================
// パッケージ内部関数: ConsentToken無効化
// ============================================================

/// ConsentToken無効化の内部ロジック
///
/// ## 概要
/// 患者（grantor）がConsentTokenを無効化する際に使用する内部関数。
/// `is_active`フラグを`false`に設定します。
///
/// ## バリデーション
/// - トークンが既に無効化されていないことを確認
/// - grantorがトークンの発行者と一致することを確認（将来的な拡張のため、現時点では検証なしでも可）
///
/// ## パラメータ
/// - `token`: 無効化するトークンへの可変参照
/// - `grantor`: 発行者アドレス（検証用）
///
/// ## Aborts
/// - `E_CONSENT_REVOKED`: 既に無効化されている（重複無効化防止）
public(package) fun revoke_consent_internal(
    token: &mut ConsentToken,
    grantor: address
) {
    // バリデーション: 既に無効化されていないことを確認
    assert!(token.is_active, E_CONSENT_REVOKED);

    // バリデーション: grantorがトークンの発行者と一致することを確認
    assert!(token.grantor == grantor, E_NON_GRANTOR_REVOKE);

    // トークンを無効化
    token.is_active = false;
}

// ============================================================
// パッケージ内部関数: ConsentToken検証
// ============================================================

/// ConsentToken検証の内部ロジック
///
/// ## 概要
/// ConsentTokenの検証ロジックを`seal_approve_consent()`から分離した内部関数。
/// アクティブ状態、有効期限、パスポートID、secretハッシュの検証を行います。
///
/// ## バリデーション
/// 1. トークンがアクティブであることを確認
/// 2. 有効期限が切れていないことを確認
/// 3. パスポートIDが一致することを確認
/// 4. secretハッシュが一致することを確認
///
/// ## パラメータ
/// - `token`: 検証対象トークンへの参照
/// - `secret`: 検証用の生secret
/// - `target_passport_id`: 検証対象のパスポートID
/// - `clock`: 現在時刻取得用のClock参照
///
/// ## Aborts
/// - `E_CONSENT_REVOKED`: トークンが無効化されている
/// - `E_CONSENT_EXPIRED`: 有効期限切れ
/// - `E_INVALID_PASSPORT_ID`: パスポートID不一致
/// - `E_INVALID_SECRET`: secretハッシュ不一致
public(package) fun verify_consent_internal(
    token: &ConsentToken,
    secret: vector<u8>,
    target_passport_id: object::ID,
    clock: &Clock
) {
    // 1. アクティブ確認
    assert!(is_active(token), E_CONSENT_REVOKED);

    // 2. 期限確認
    let now = sui::clock::timestamp_ms(clock);
    assert!(now < get_expiration(token), E_CONSENT_EXPIRED);

    // 3. パスポートID整合性確認
    // Payload(医師が要求している対象) == Token(患者が許可した対象) か？
    assert!(
        get_passport_id(token) == target_passport_id,
        E_INVALID_PASSPORT_ID
    );

    // 4. ハッシュロック検証
    // 生secretをハッシュ化し、オンチェーンのハッシュと比較
    let input_hash = hash::sha3_256(secret);
    let stored_hash = get_secret_hash(token);
    assert!(input_hash == stored_hash, E_INVALID_SECRET);

    // 検証成功（関数終了 = 検証OK）
}

// ============================================================
// パッケージ内部関数: スコープ検証
// ============================================================

/// スコープ検証関数
///
/// ## 概要
/// ConsentTokenの`scopes`フィールドに指定されたスコープが含まれているかを確認します。
/// スコープが許可されていない場合は`E_SCOPE_NOT_ALLOWED`でabortします。
///
/// ## パラメータ
/// - `token`: ConsentTokenへの参照
/// - `requested_scope`: 検証対象のスコープ文字列
///
/// ## 注意
/// - 文字列の完全一致で比較（大文字小文字は区別）
/// - スコープが許可されていない場合は`E_SCOPE_NOT_ALLOWED`でabort
///
/// ## Aborts
/// - `E_SCOPE_NOT_ALLOWED`: スコープが許可されていない
public(package) fun verify_scope(
    token: &ConsentToken,
    requested_scope: String
) {
    let scopes = get_scopes(token);
    let len = vector::length(scopes);
    let mut i = 0;
    
    while (i < len) {
        let scope = vector::borrow(scopes, i);
        if (*scope == requested_scope) {
            return // スコープが見つかったので検証成功
        };
        i = i + 1;
    };
    
    // スコープが見つからなかった場合はabort
    abort E_SCOPE_NOT_ALLOWED
}
