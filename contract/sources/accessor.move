/// Cure Pocket Medical Passport - アクセッサーモジュール
///
/// 公開API（getter関数）を提供
///
/// ## 設計方針（AGENTS.md準拠）
/// - すべての `public fun` と `entry fun` をこのモジュールに集約
/// - 外部から呼び出し可能なAPIの単一窓口を提供
/// - 明確な公開インターフェースを維持
///
/// ## 提供API
/// - パスポートフィールドへの読み取りアクセス
/// - Sealアクセス制御関数
/// - ConsentToken作成・検証関数
/// - 将来的な検索・照会機能の追加余地
module cure_pocket::medical_passport_accessor;
use std::string::{Self as string, String};
use sui::bcs;
use sui::clock::Clock;
use cure_pocket::medical_passport::{Self, MedicalPassport, PassportRegistry};
use cure_pocket::seal_accessor;
use cure_pocket::consent_token::{Self, ConsentToken};

/// メディカルパスポートの発行（mint）
///
/// ## 権限
/// - 誰でも呼び出し可能（AdminCap不要）
/// - 各ユーザーが自分のパスポートを自由に発行できる
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
/// - `E_EMPTY_WALRUS_BLOB_ID`: walrus_blob_idが空文字列
/// - `E_EMPTY_SEAL_ID`: seal_idが空文字列
/// - `E_EMPTY_COUNTRY_CODE`: country_codeが空文字列
entry fun mint_medical_passport(
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

/// Walrus blob IDを取得
///
/// ## 用途
/// - パスポートに紐づく医療データの識別子を取得
/// - Walrusストレージからデータを取得する際に使用
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - Walrus blob IDへの参照
public fun get_walrus_blob_id(passport: &MedicalPassport): &String {
    medical_passport::get_walrus_blob_id(passport)
}

/// Seal IDを取得
///
/// ## 用途
/// - パスポートに紐づく暗号鍵/ポリシーの識別子を取得
/// - Seal システムで医療データの復号化に使用
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - Seal IDへの参照
public fun get_seal_id(passport: &MedicalPassport): &String {
    medical_passport::get_seal_id(passport)
}

/// 国コードを取得
///
/// ## 用途
/// - パスポートの発行国を識別
/// - 国別の医療データ規制に対応
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - 国コードへの参照（ISO 3166-1 alpha-2 想定）
public fun get_country_code(passport: &MedicalPassport): &String {
    medical_passport::get_country_code(passport)
}

/// パスポートの全情報を一括取得
///
/// ## 用途
/// - パスポートの全フィールドを一度に取得
/// - 個別のgetter呼び出しより効率的
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
///
/// ## 返り値
/// - タプル: (walrus_blob_id, seal_id, country_code)
public fun get_all_fields(passport: &MedicalPassport): (&String, &String, &String) {
    medical_passport::get_all_fields(passport)
}

/// 指定アドレスが既にパスポートを所持しているか確認
///
/// ## 用途
/// - フロントエンドでmint前のチェックに使用
/// - UIで「既にパスポートを所持している」メッセージを表示
/// - mintボタンの有効/無効切り替え
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの参照（共有オブジェクト）
/// - `owner`: 確認するアドレス
///
/// ## 返り値
/// - `true`: 既にパスポートを所持している
/// - `false`: まだパスポートを所持していない
public fun has_passport(registry: &PassportRegistry, owner: address): bool {
    medical_passport::has_passport(registry, owner)
}

/// Sealアクセス制御: 患者本人のみアクセス可能
///
/// ## 概要
/// Sealキーサーバーが復号リクエストを受け取った際に、
/// `.dry_run_transaction_block`上で実行されるアクセス制御関数。
/// この関数がabortしなければ、復号鍵の提供が許可される。
///
/// ## アクセス制御ロジック
/// 1. `ctx.sender()`（復号リクエスト送信者）を取得
/// 2. `passport`のIDを取得
/// 3. `PassportRegistry`の`address -> object::ID`マッピングで、特定のパスポートがsenderのものかを確認
/// 4. senderが指定パスポートを所有していなければabort（アクセス拒否）
/// 5. 所有していれば関数終了（アクセス許可）
///
/// ## パラメータ
/// - `passport`: MedicalPassportオブジェクトへの参照（パスポートID取得用）
/// - `registry`: PassportRegistryへの参照（所有権確認用）
/// - `ctx`: トランザクションコンテキスト（sender取得用）
///
/// ## Aborts
/// - `E_NO_ACCESS`: senderが指定パスポートを所有していない（アクセス拒否）
entry fun seal_approve_patient_only(
    passport: &MedicalPassport,
    registry: &PassportRegistry,
    ctx: &tx_context::TxContext
) {
    seal_accessor::seal_approve_patient_only_internal(passport, registry, ctx);
}

/// Walrus Blob IDを更新するエントリー関数
///
/// ## 概要
/// MedicalPassportの`walrus_blob_id`フィールドを更新するエントリー関数。
/// Walrusではデータ更新時にBlob IDが変わるため、
/// パスポート内のIDを書き換える必要がある。
///
/// ## 権限
/// - パスポートの所有者のみが更新可能
/// - トランザクション送信者がパスポートの所有者と一致する必要がある
///
/// ## 制約
/// - `new_blob_id`が空文字列でないことを確認
/// - パスポートの所有者のみが更新可能（PassportRegistryで所有権を確認）
///
/// ## 動作
/// 1. `new_blob_id`が空文字列でないことをバリデーション
/// 2. トランザクション送信者を取得
/// 3. パスポートIDを取得
/// 4. PassportRegistryで送信者がパスポートの所有者であることを確認
/// 5. `medical_passport::update_walrus_blob_id_internal()`を呼び出して更新
///
/// ## パラメータ
/// - `registry`: PassportRegistryへの参照（所有権確認用）
/// - `passport`: 更新対象のMedicalPassportへの可変参照
/// - `new_blob_id`: 新しいWalrus Blob ID（空文字列不可）
/// - `clock`: 現在時刻取得用のClock参照
/// - `ctx`: トランザクションコンテキスト（送信者取得用）
///
/// ## 副作用
/// - `passport.walrus_blob_id`が`new_blob_id`に更新される
/// - `PassportUpdatedEvent`イベントが発行される
///
/// ## Aborts
/// - `E_EMPTY_WALRUS_BLOB_ID`: `new_blob_id`が空文字列
/// - `E_NO_ACCESS`: トランザクション送信者がパスポートの所有者ではない
entry fun update_walrus_blob_id(
    registry: &PassportRegistry,
    passport: &mut MedicalPassport,
    new_blob_id: String,
    clock: &Clock,
    ctx: &tx_context::TxContext
) {
    // バリデーション: new_blob_idが空文字列でないことを確認
    assert!(!string::is_empty(&new_blob_id), medical_passport::e_empty_walrus_blob_id());

    // アクセス制御: 送信者がパスポートの所有者であることを確認
    medical_passport::assert_passport_owner(registry, object::id(passport), tx_context::sender(ctx), seal_accessor::e_no_access());

    // 内部関数を呼び出して更新
    medical_passport::update_walrus_blob_id_internal(passport, new_blob_id, clock);
}

/// ConsentTokenを作成して共有オブジェクトとして公開
///
/// ## 概要
/// 患者（grantor）が医師などに閲覧権限を付与する際に使用するトークンを作成します。
/// 作成されたトークンは共有オブジェクトとして公開され、Seal認証時に使用されます。
///
/// ## 権限
/// - 誰でも呼び出し可能
/// - ただし、`grantor`は実際のトランザクション送信者である必要がある（将来的に検証を追加可能）
///
/// ## 動作
/// 1. バリデーション（secret_hash、duration_ms、scopesが有効か）
/// 2. 現在時刻を取得
/// 3. 有効期限を計算（現在時刻 + duration_ms）
/// 4. ConsentTokenを生成
/// 5. 共有オブジェクトとして公開
///
/// ## パラメータ
/// - `passport_id`: 紐づくパスポートID
/// - `secret_hash`: 合言葉のハッシュ（sha3_256）
/// - `scopes`: 閲覧許可スコープ（例: "medication", "lab_results"）
/// - `duration_ms`: 有効期限の期間（ミリ秒）
/// - `clock`: Sui Clock（現在時刻取得用）
/// - `ctx`: トランザクションコンテキスト
///
/// ## 結果
/// - 共有オブジェクトとして公開された `ConsentToken` が作成される
///
/// ## Aborts
/// - `E_EMPTY_SECRET`: secret_hashが空
/// - `E_INVALID_DURATION`: duration_msが0
/// - `E_EMPTY_SCOPES`: scopesが空
entry fun create_consent_token(
    passport_id: object::ID,
    secret_hash: vector<u8>,
    scopes: vector<String>,
    duration_ms: u64,
    clock: &Clock,
    ctx: &mut tx_context::TxContext
) {
    let grantor = tx_context::sender(ctx);

    // ConsentTokenを作成
    let token = consent_token::create_consent_internal(
        passport_id,
        grantor,
        secret_hash,
        scopes,
        duration_ms,
        clock,
        ctx
    );

    // 共有オブジェクトとして公開
    consent_token::share_consent_token(token);
}

/// ConsentTokenを無効化する
///
/// ## 概要
/// 患者（grantor）がConsentTokenを無効化する際に使用するentry関数。
/// トークンの`is_active`フラグを`false`に設定します。
///
/// ## 権限
/// - トークンの発行者（grantor）のみが無効化可能
/// - トランザクション送信者がgrantorと一致する必要がある
///
/// ## 動作
/// 1. トランザクション送信者を取得
/// 2. 送信者がトークンのgrantorと一致することを確認
/// 3. `consent_token::revoke_consent_internal()`を呼び出して無効化
///
/// ## パラメータ
/// - `token`: 無効化するトークン（共有オブジェクト）
/// - `ctx`: トランザクションコンテキスト（送信者取得用）
///
/// ## Aborts
/// - `E_CONSENT_REVOKED`: 既に無効化されている（重複無効化防止）
entry fun revoke_consent_token(
    token: &mut ConsentToken,
    ctx: &tx_context::TxContext
) {
    let sender = tx_context::sender(ctx);

    // バリデーション: senderがトークンのgrantorと一致することを確認
    assert!(
        consent_token::get_grantor(token) == sender,
        consent_token::e_non_grantor_revoke()
    );

    // トークンを無効化
    consent_token::revoke_consent_internal(token, sender);
}

/// Seal用アクセス検証関数（Dry Run専用）
///
/// ## 概要
/// Sealキーサーバーが復号リクエストを受け取った際に、
/// `.dry_run_transaction_block`上で実行されるアクセス制御関数。
/// ConsentTokenを使用した閲覧権限の検証を行います。
/// この関数がabortしなければ、復号鍵の提供が許可されます。
///
/// ## アクセス制御ロジック
/// 1. `id`（BCSエンコードされた`SealAuthPayload`）をデシリアライズ
/// 2. Payloadを分解して`secret`と`target_passport_id`を取得
/// 3. ConsentTokenがアクティブか確認
/// 4. 有効期限を確認
/// 5. パスポートIDの整合性を確認（Payloadの`target_passport_id`とTokenの`passport_id`が一致するか）
/// 6. ハッシュロック検証（生`secret`をハッシュ化し、オンチェーンの`secret_hash`と比較）
///
/// ## パラメータ
/// - `id`: BCSエンコードされた`SealAuthPayload`（`vector<u8>`）
/// - `token`: 検証対象のConsentToken（共有オブジェクト）
/// - `clock`: Sui Clock（現在時刻取得用）
///
/// ## 返り値
/// - なし（entry関数なのでvoid）
///
/// ## 副作用
/// - なし（検証のみ）
///
/// ## Aborts
/// - `E_CONSENT_REVOKED`: ConsentTokenが無効化されている
/// - `E_CONSENT_EXPIRED`: ConsentTokenの有効期限が切れている
/// - `E_INVALID_PASSPORT_ID`: パスポートIDが一致しない
/// - `E_INVALID_SECRET`: 合言葉（secret）が一致しない
entry fun seal_approve_consent(
    id: vector<u8>,
    token: &ConsentToken,
    clock: &Clock
) {
    // 1. BCSデシリアライズ（peel_*系の関数を使用）
    // SealAuthPayload構造体をBCSから読み取る
    let mut bcs_cursor = bcs::new(id);
    let secret = bcs::peel_vec_u8(&mut bcs_cursor);
    let target_passport_id = bcs::peel_address(&mut bcs_cursor);
    let requested_scope_bytes = bcs::peel_vec_u8(&mut bcs_cursor);
    let requested_scope = string::utf8(requested_scope_bytes);

    // 2. パスポートIDをID型に変換（addressからIDへ）
    let target_passport_id_obj = object::id_from_address(target_passport_id);

    // 3. 基本検証ロジックを内部関数に委譲
    // コードの重複を削減し、保守性を向上
    consent_token::verify_consent_internal(
        token,
        secret,
        target_passport_id_obj,
        clock
    );

    // 4. スコープ検証
    // ConsentTokenのscopesフィールドにrequested_scopeが含まれているかを確認
    // スコープが許可されていない場合はE_SCOPE_NOT_ALLOWEDでabort
    consent_token::verify_scope(token, requested_scope);

    // 検証成功（関数終了 = Sealが「OK」と判断）
}