/// Cure Pocket Medical Passport - アクセッサーモジュール
///
/// 公開API（getter関数）を提供
///
/// ## 設計方針（AGENTS.md準拠）
/// - すべての `public fun` をこのモジュールに集約
/// - 外部から呼び出し可能なAPIの単一窓口を提供
/// - 明確な公開インターフェースを維持
///
/// ## 提供API
/// - パスポートフィールドへの読み取りアクセス
/// - 将来的な検索・照会機能の追加余地
module cure_pocket::medical_passport_accessor;
use std::string::String;
use cure_pocket::medical_passport::{Self, MedicalPassport, PassportRegistry};

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

    // tx送信者に転送（Soulbound: この後は譲渡不可）
    medical_passport::transfer_to(passport, sender);

    // Registry にパスポート所有マーカーを登録
    medical_passport::register_passport(registry, sender);
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