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
module cure_pocket::accessor;
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
/// - `country_code`: 発行国コード
/// - `analytics_opt_in`: 匿名統計データ提供可否
/// - `ctx`: トランザクションコンテキスト
///
/// ## 結果
/// - tx送信者に `MedicalPassport` が転送される
///
/// ## Aborts
/// - `E_ALREADY_HAS_PASSPORT`: 既にパスポートを所持している
/// - `E_EMPTY_COUNTRY_CODE`: country_codeが空文字列
entry fun mint_medical_passport(
    registry: &mut PassportRegistry,
    country_code: String,
    analytics_opt_in: bool,
    ctx: &mut tx_context::TxContext
) {
    let sender = tx_context::sender(ctx);

    // 1ウォレット1枚制約: 既にパスポートを持っていないかチェック
    assert!(!medical_passport::has_passport(registry, sender), medical_passport::e_already_has_passport());

    // パスポートを生成
    let passport = medical_passport::create_passport_internal(
        country_code,
        analytics_opt_in,
        ctx
    );

    // パスポートIDを取得
    let passport_id = object::id(&passport);

    // tx送信者に転送（Soulbound: この後は譲渡不可）
    medical_passport::transfer_to(passport, sender);

    // Registry にパスポートIDを登録
    medical_passport::register_passport_with_id(registry, passport_id, sender);
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
/// - タプル: (country_code, analytics_opt_in)
public fun get_all_fields(passport: &MedicalPassport): (&String, bool) {
    medical_passport::get_all_fields(passport)
}

/// 統計データ提供への同意を取得
public fun get_analytics_opt_in(passport: &MedicalPassport): bool {
    medical_passport::get_analytics_opt_in(passport)
}

/// データ種ごとの Walrus Blob ID 配列を追加（新規のみ）
///
/// ## 用途
/// - `basic_profile` / `medications` / `lab_results` などデータ種ごとのBlob参照を登録
/// - 各データ種に個別の Seal ID を設定可能
/// - 既に同じキーが存在する場合はabort
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの可変参照
/// - `data_type`: データ種キー（文字列）
/// - `seal_id`: このデータエントリ専用の Seal 暗号化 ID（バイナリ形式）
/// - `blob_ids`: Walrus Blob IDの配列（1件以上必須）
/// - `clock`: Sui Clock（タイムスタンプ取得用）
entry fun add_data_entry(
    passport: &mut MedicalPassport,
    data_type: String,
    seal_id: vector<u8>,
    blob_ids: vector<String>,
    clock: &Clock
) {
    medical_passport::add_data_entry(passport, data_type, seal_id, blob_ids, clock)
}

/// 既存データ種の EntryData を丸ごと置き換える
///
/// ## 用途
/// - 最新データへの差し替え
/// - Seal ID、Blob ID、タイムスタンプを全て更新
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの可変参照
/// - `data_type`: 置き換えるデータ種キー（文字列）
/// - `seal_id`: 新しい Seal 暗号化 ID（バイナリ形式）
/// - `blob_ids`: 新しい Blob ID 配列（1件以上必須）
/// - `clock`: Sui Clock（タイムスタンプ取得用）
entry fun replace_data_entry(
    passport: &mut MedicalPassport,
    data_type: String,
    seal_id: vector<u8>,
    blob_ids: vector<String>,
    clock: &Clock
) {
    medical_passport::replace_data_entry(passport, data_type, seal_id, blob_ids, clock)
}

/// データ種の EntryData を取得
///
/// ## パラメータ
/// - `passport`: MedicalPassportへの参照
/// - `data_type`: 取得するデータ種キー（文字列）
///
/// ## 返り値
/// - `&medical_passport::EntryData`: 登録済み EntryData への参照
public fun get_data_entry(
    passport: &MedicalPassport,
    data_type: String
): &medical_passport::EntryData {
    medical_passport::get_data_entry(passport, data_type)
}

/// EntryData から Seal ID を取得（ヘルパー関数）
///
/// ## パラメータ
/// - `entry`: EntryData への参照
///
/// ## 返り値
/// - Seal ID への参照（バイナリ形式）
public fun get_entry_seal_id(entry: &medical_passport::EntryData): &vector<u8> {
    medical_passport::get_entry_seal_id(entry)
}

/// EntryData から Blob ID 配列を取得（ヘルパー関数）
///
/// ## パラメータ
/// - `entry`: EntryData への参照
///
/// ## 返り値
/// - Blob ID 配列への参照
public fun get_entry_blob_ids(entry: &medical_passport::EntryData): &vector<String> {
    medical_passport::get_entry_blob_ids(entry)
}

/// EntryData から更新時刻を取得（ヘルパー関数）
///
/// ## パラメータ
/// - `entry`: EntryData への参照
///
/// ## 返り値
/// - 更新時刻（Unix timestamp ms）
public fun get_entry_updated_at(entry: &medical_passport::EntryData): u64 {
    medical_passport::get_entry_updated_at(entry)
}

/// データ種の EntryData を削除
///
/// ## 用途
/// - データ種ごとに参照をリセットする
/// - パスポート削除や移行前のクリーンアップ
///
/// ## 注意
/// - entry関数のため戻り値はなし（EntryDataはdrop可能）
entry fun remove_data_entry(
    passport: &mut MedicalPassport,
    data_type: String
) {
    let _ = medical_passport::remove_data_entry(passport, data_type);
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
/// 5. 要求されたseal_idがEntryDataに格納されたseal_idと一致するかを確認
/// 6. 一致しなければabort、一致すれば関数終了（アクセス許可）
///
/// ## パラメータ
/// - `id`: 要求されたSeal ID（UTF-8バイト）
/// - `passport`: MedicalPassportオブジェクトへの参照（パスポートID取得用）
/// - `registry`: PassportRegistryへの参照（所有権確認用）
/// - `data_type`: データ種別（EntryData検索用）
/// - `ctx`: トランザクションコンテキスト（sender取得用）
///
/// ## Aborts
/// - `E_NO_ACCESS`: senderが指定パスポートを所有していない（アクセス拒否）
/// - `E_INVALID_SEAL_ID`: 要求されたseal_idがEntryDataのseal_idと一致しない
/// - `E_DATA_ENTRY_NOT_FOUND`: 指定されたdata_typeのEntryDataが存在しない
entry fun seal_approve_patient_only(
    id: vector<u8>,
    passport: &MedicalPassport,
    registry: &PassportRegistry,
    data_type: String,
    ctx: &tx_context::TxContext
) {
    seal_accessor::seal_approve_patient_only_internal(id, passport, registry, data_type, ctx);
}


/// ConsentTokenを作成して共有オブジェクトとして公開
///
/// ## 概要
/// 患者（grantor）が医師などに閲覧権限を付与する際に使用するトークンを作成します。
/// 作成されたトークンは共有オブジェクトとして公開され、Seal認証時に使用されます。
///
/// ## 権限
/// - パスポート所有者のみが呼び出し可能
/// - トランザクション送信者がパスポートの所有者であることを確認
///
/// ## 動作
/// 1. 所有者検証（tx送信者がパスポート所有者であることを確認）
/// 2. バリデーション（secret_hash、duration_ms、scopesが有効か）
/// 3. 現在時刻を取得
/// 4. 有効期限を計算（現在時刻 + duration_ms）
/// 5. ConsentTokenを生成
/// 6. 共有オブジェクトとして公開
///
/// ## パラメータ
/// - `passport`: パスポートオブジェクトへの参照（IDと所有者検証用）
/// - `registry`: PassportRegistryへの参照（所有者検証用）
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
/// - `E_NOT_PASSPORT_OWNER`: トランザクション送信者がパスポート所有者でない
/// - `E_EMPTY_SECRET`: secret_hashが空
/// - `E_INVALID_DURATION`: duration_msが0
/// - `E_EMPTY_SCOPES`: scopesが空
entry fun create_consent_token(
    passport: &MedicalPassport,
    registry: &PassportRegistry,
    secret_hash: vector<u8>,
    scopes: vector<String>,
    duration_ms: u64,
    clock: &Clock,
    ctx: &mut tx_context::TxContext
) {
    let grantor = tx_context::sender(ctx);
    let passport_id = object::id(passport);

    // 所有者検証: tx送信者がパスポート所有者であることを確認
    medical_passport::assert_passport_owner(registry, passport_id, grantor, consent_token::e_not_passport_owner());

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
/// 1. 要求されたseal_idがEntryDataに格納されたseal_idと一致するかを確認
/// 2. `auth_payload`（BCSエンコードされた`SealAuthPayload`）をデシリアライズ
/// 3. Payloadを分解して`secret`と`target_passport_id`、`requested_scope`を取得
/// 4. `data_type`とPayload内の`requested_scope`が一致することを確認
/// 5. ConsentTokenがアクティブか確認
/// 6. 有効期限を確認
/// 7. パスポートIDの整合性を確認（Payloadの`target_passport_id`とTokenの`passport_id`、passportのIDが一致するか）
/// 8. ハッシュロック検証（生`secret`をハッシュ化し、オンチェーンの`secret_hash`と比較）
/// 9. スコープ検証（`data_type`がTokenのscopesに含まれているか）
///
/// ## パラメータ
/// - `id`: 要求されたSeal ID（UTF-8バイト）
/// - `auth_payload`: BCSエンコードされた`SealAuthPayload`（`vector<u8>`）
/// - `token`: 検証対象のConsentToken（共有オブジェクト）
/// - `passport`: 閲覧対象のパスポート（ID検証用）
/// - `data_type`: 閲覧対象のデータ種別（"medication", "lab_results"など）
/// - `clock`: Sui Clock（現在時刻取得用）
///
/// ## 返り値
/// - なし（entry関数なのでvoid）
///
/// ## 副作用
/// - なし（検証のみ）
///
/// ## Aborts
/// - `E_INVALID_SEAL_ID`: 要求されたseal_idがEntryDataのseal_idと一致しない
/// - `E_DATA_ENTRY_NOT_FOUND`: 指定されたdata_typeのEntryDataが存在しない
/// - `E_CONSENT_REVOKED`: ConsentTokenが無効化されている
/// - `E_CONSENT_EXPIRED`: ConsentTokenの有効期限が切れている
/// - `E_INVALID_PASSPORT_ID`: パスポートIDが一致しない
/// - `E_INVALID_SECRET`: 合言葉（secret）が一致しない
/// - `E_SCOPE_NOT_ALLOWED`: スコープが許可されていない
/// - `E_DATA_TYPE_MISMATCH`: data_typeとrequested_scopeが不一致
entry fun seal_approve_consent(
    id: vector<u8>,
    auth_payload: vector<u8>,
    token: &ConsentToken,
    passport: &MedicalPassport,
    data_type: String,
    clock: &Clock
) {
    // 1. Seal ID検証
    // EntryDataを取得し、要求されたseal_idが一致するかを確認
    // MystenLabs Seal公式パターンに準拠したバイナリ同士の直接比較
    let entry = medical_passport::get_data_entry(passport, data_type);
    let stored_seal_id = medical_passport::get_entry_seal_id(entry);
    assert!(id == *stored_seal_id, seal_accessor::e_invalid_seal_id());

    // 2. BCSデシリアライズ（peel_*系の関数を使用）
    // SealAuthPayload構造体をauth_payloadから読み取る
    let mut bcs_cursor = bcs::new(auth_payload);
    let secret = bcs::peel_vec_u8(&mut bcs_cursor);
    let target_passport_id = bcs::peel_address(&mut bcs_cursor);
    let requested_scope_bytes = bcs::peel_vec_u8(&mut bcs_cursor);
    let requested_scope = string::utf8(requested_scope_bytes);

    // 3. data_typeとrequested_scopeの整合性確認
    // 呼び出し側が指定したdata_typeとPayload内のrequested_scopeが一致することを確認
    assert!(data_type == requested_scope, consent_token::e_data_type_mismatch());

    // 4. パスポートIDをID型に変換（addressからIDへ）
    let target_passport_id_obj = object::id_from_address(target_passport_id);
    let passport_id = object::id(passport);

    // 5. パスポートIDの整合性確認
    // passportのIDとPayloadのtarget_passport_id、Tokenのpassport_idがすべて一致することを確認
    assert!(passport_id == target_passport_id_obj, consent_token::e_invalid_passport_id());

    // 6. 基本検証ロジックを内部関数に委譲
    // コードの重複を削減し、保守性を向上
    consent_token::verify_consent_internal(
        token,
        secret,
        target_passport_id_obj,
        clock
    );

    // 7. スコープ検証
    // ConsentTokenのscopesフィールドにdata_typeが含まれているかを確認
    // スコープが許可されていない場合はE_SCOPE_NOT_ALLOWEDでabort
    consent_token::verify_scope(token, data_type);

    // 検証成功（関数終了 = Sealが「OK」と判断）
}
