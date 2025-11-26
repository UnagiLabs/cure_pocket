/// Cure Pocket Seal Accessor - Sealアクセス制御モジュール
///
/// Sealキーサーバーからの復号リクエストに対するアクセス制御を実装
///
/// ## 責務
/// - Sealの`seal_approve*`関数の実装
/// - MedicalPassportの所有者のみが復号できるようにするアクセス制御
/// - 「Private data」パターンに基づく認証ロジック
///
/// ## 設計方針
/// - Sealキーサーバーが`.dry_run_transaction_block`上で実行する関数
/// - この関数がabortしなければ、復号鍵の提供が許可される
/// - パスポートのオーナーと復号リクエスト送信者を照合
module cure_pocket::seal_accessor;

use std::string::String;
use sui::hex;
use cure_pocket::medical_passport::{Self, MedicalPassport, PassportRegistry};

// ============================================================
// エラーコード
// ============================================================

/// オーナーとsenderが一致しない（アクセス拒否）
const E_NO_ACCESS: u64 = 102;

/// Seal IDが登録済みのEntryDataのseal_idと一致しない
const E_INVALID_SEAL_ID: u64 = 103;

/// E_NO_ACCESS エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
/// - Move 2024 では const を public にできないため、ゲッター経由でアクセス
///
/// ## 返り値
/// - エラーコード `E_NO_ACCESS` の値
public(package) fun e_no_access(): u64 {
    E_NO_ACCESS
}

/// E_INVALID_SEAL_ID エラーコードを取得
///
/// ## 用途
/// - assert! で使用するエラーコードを取得
/// - 要求されたSeal IDがEntryDataに格納されたseal_idと一致しない場合に使用
///
/// ## 返り値
/// - エラーコード `E_INVALID_SEAL_ID` の値
public(package) fun e_invalid_seal_id(): u64 {
    E_INVALID_SEAL_ID
}

// ============================================================
// Sealアクセス制御関数
// ============================================================

/// Sealアクセス制御: 患者本人のみアクセス可能（内部実装）
///
/// ## 概要
/// Sealキーサーバーが復号リクエストを受け取った際に、
/// `.dry_run_transaction_block`上で実行されるアクセス制御関数の内部実装。
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
/// ## 注意
/// - この関数は`public(package)`スコープ（パッケージ内部のみアクセス可能）
/// - 外部から呼び出す場合は`accessor.move`の`entry fun`を使用すること
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
public(package) fun seal_approve_patient_only_internal(
    id: vector<u8>,
    passport: &MedicalPassport,
    registry: &PassportRegistry,
    data_type: String,
    ctx: &tx_context::TxContext
) {
    // 1. トランザクション送信者を取得
    let sender = tx_context::sender(ctx);

    // 2. パスポートIDを取得
    let passport_id = object::id(passport);

    // 3. PassportRegistryの`address -> object::ID`マッピングで、特定のパスポートがsenderのものかを確認
    // assert_passport_owner()は、senderが指定パスポートを所有していない場合に内部でabort
    medical_passport::assert_passport_owner(registry, passport_id, sender, E_NO_ACCESS);

    // 4. EntryDataを取得してseal_idを検証
    let entry = medical_passport::get_data_entry(passport, data_type);
    let stored_seal_id = medical_passport::get_entry_seal_id(entry);

    // 5. 要求されたid（バイナリ）をhex文字列に変換して比較
    // PTBからはfromHex(sealId)でデコードされたバイナリが渡される
    // stored_seal_idはhex文字列なので、idをhexエンコードして比較
    let id_hex = hex::encode(id);
    let id_string = std::string::utf8(id_hex);
    assert!(id_string == *stored_seal_id, E_INVALID_SEAL_ID);

    // 6. すべての検証をパスすれば関数終了（Sealが「OK」と判断）
}
