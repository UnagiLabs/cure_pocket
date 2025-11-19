/// Seal Accessor - テストスイート
///
/// seal_approve_patient_only関数のテスト
#[test_only]
module cure_pocket::seal_accessor_tests {
    use sui::test_scenario::{Self as ts};
    use std::string::{Self, String};

    use cure_pocket::medical_passport::{MedicalPassport, PassportRegistry};
    use cure_pocket::medical_passport_accessor;
    use cure_pocket::seal_accessor;
    use cure_pocket::cure_pocket::Self;

    // テスト用定数
    const USER1: address = @0xA1;
    const USER2: address = @0xA2;

    // テストヘルパー: 標準的なパスポートデータを生成
    fun create_test_passport_data(): (String, String, String) {
        let walrus = string::utf8(b"walrus-blob-12345");
        let seal = string::utf8(b"seal-key-abcde");
        let country = string::utf8(b"JP");
        (walrus, seal, country)
    }

    // ============================================================
    // 正常系テスト
    // ============================================================

    /// Test 1: オーナーが復号リクエストを送信した場合（正常系）
    ///
    /// 仕様:
    /// - パスポートを作成
    /// - オーナーから`seal_approve_patient_only`を呼び出し
    /// - abortしないことを確認
    #[test]
    fun test_seal_approve_patient_only_success() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートをmint
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            medical_passport_accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートを受け取り、seal_approve_patient_onlyを呼び出す
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // seal_approve_patient_onlyを呼び出し（abortしないことを確認）
            medical_passport_accessor::seal_approve_patient_only(
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    // ============================================================
    // 異常系テスト
    // ============================================================

    /// Test 2: オーナー以外が復号リクエストを送信した場合（異常系）
    ///
    /// 仕様:
    /// - パスポートを作成（user1）
    /// - user2から`seal_approve_patient_only`を呼び出し
    /// - `E_NO_ACCESS`でabortすることを確認
    ///
    /// ## 注意
    /// - abortは`seal_accessor`モジュールの内部実装で発生する
    #[test]
    #[expected_failure(abort_code = 102, location = seal_accessor)]
    fun test_seal_approve_patient_only_fails_for_non_owner() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートをmint
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            medical_passport_accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートを受け取る
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport);
        };

        // User2がパスポートを取得してseal_approve_patient_onlyを呼び出す（エラーになるはず）
        ts::next_tx(&mut scenario, USER2);
        {
            let passport = ts::take_from_address<MedicalPassport>(&scenario, USER1);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // seal_approve_patient_onlyを呼び出し（E_NO_ACCESSでabortするはず）
            medical_passport_accessor::seal_approve_patient_only(
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_address(USER1, passport);
        };

        ts::end(scenario);
    }
}
