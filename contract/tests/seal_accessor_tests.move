/// Seal Accessor - テストスイート
///
/// seal_approve_patient_only関数のテスト
#[test_only]
module cure_pocket::seal_accessor_tests {
    use sui::test_scenario::{Self as ts};
    use std::string::{Self, String};

    use cure_pocket::medical_passport::{Self as medical_passport, MedicalPassport, PassportRegistry};
    use cure_pocket::accessor;
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

            accessor::mint_medical_passport(
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
            accessor::seal_approve_patient_only(b"", 
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
    /// - abortは`medical_passport`モジュールの`assert_passport_owner`関数で発生する
    #[test]
    #[expected_failure(abort_code = 102, location = medical_passport)]
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

            accessor::mint_medical_passport(
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
            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_address(USER1, passport);
        };

        ts::end(scenario);
    }

    // ============================================================
    // 複数ユーザー環境でのテスト
    // ============================================================

    /// Test 1-1: ユーザー1が自分のパスポートで呼び出す（正常系）
    ///
    /// 仕様:
    /// - ユーザー1がパスポートAを所有
    /// - ユーザー2がパスポートBを所有
    /// - ユーザー1がパスポートAで`seal_approve_patient_only`を呼び出す
    /// - 成功（abortしない）ことを確認
    #[test]
    fun test_seal_approve_patient_only_user1_own_passport_success() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートAをmint
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User2がパスポートBをmint
        ts::next_tx(&mut scenario, USER2);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let walrus2 = string::utf8(b"walrus-blob-67890");
            let seal2 = string::utf8(b"seal-key-fghij");
            let country2 = string::utf8(b"US");

            accessor::mint_medical_passport(
                &mut registry,
                walrus2,
                seal2,
                country2,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートAを受け取り、seal_approve_patient_onlyを呼び出す
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // seal_approve_patient_onlyを呼び出し（abortしないことを確認）
            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    /// Test 1-2: ユーザー2が自分のパスポートで呼び出す（正常系）
    ///
    /// 仕様:
    /// - ユーザー1がパスポートAを所有
    /// - ユーザー2がパスポートBを所有
    /// - ユーザー2がパスポートBで`seal_approve_patient_only`を呼び出す
    /// - 成功（abortしない）ことを確認
    #[test]
    fun test_seal_approve_patient_only_user2_own_passport_success() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートAをmint
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User2がパスポートBをmint
        ts::next_tx(&mut scenario, USER2);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let walrus2 = string::utf8(b"walrus-blob-67890");
            let seal2 = string::utf8(b"seal-key-fghij");
            let country2 = string::utf8(b"US");

            accessor::mint_medical_passport(
                &mut registry,
                walrus2,
                seal2,
                country2,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User2がパスポートBを受け取り、seal_approve_patient_onlyを呼び出す
        ts::next_tx(&mut scenario, USER2);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // seal_approve_patient_onlyを呼び出し（abortしないことを確認）
            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    /// Test 1-3: ユーザー2がユーザー1のパスポートで呼び出す（異常系）
    ///
    /// 仕様:
    /// - ユーザー1がパスポートAを所有
    /// - ユーザー2がパスポートBを所有
    /// - ユーザー2がパスポートAで`seal_approve_patient_only`を呼び出す
    /// - `E_NO_ACCESS`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 102, location = medical_passport)]
    fun test_seal_approve_patient_only_user2_user1_passport_fails() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートAをmint
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートAを受け取る
        ts::next_tx(&mut scenario, USER1);
        {
            let passport_a = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport_a);
        };

        // User2がパスポートBをmint
        ts::next_tx(&mut scenario, USER2);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let walrus2 = string::utf8(b"walrus-blob-67890");
            let seal2 = string::utf8(b"seal-key-fghij");
            let country2 = string::utf8(b"US");

            accessor::mint_medical_passport(
                &mut registry,
                walrus2,
                seal2,
                country2,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User2がパスポートBを受け取る
        ts::next_tx(&mut scenario, USER2);
        {
            let passport_b = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport_b);
        };

        // User2がパスポートAを取得してseal_approve_patient_onlyを呼び出す（エラーになるはず）
        ts::next_tx(&mut scenario, USER2);
        {
            let passport_a = ts::take_from_address<MedicalPassport>(&scenario, USER1);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // seal_approve_patient_onlyを呼び出し（E_NO_ACCESSでabortするはず）
            accessor::seal_approve_patient_only(b"", 
                &passport_a,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_address(USER1, passport_a);
        };

        ts::end(scenario);
    }

    /// Test 1-4: ユーザー1がユーザー2のパスポートで呼び出す（異常系）
    ///
    /// 仕様:
    /// - ユーザー1がパスポートAを所有
    /// - ユーザー2がパスポートBを所有
    /// - ユーザー1がパスポートBで`seal_approve_patient_only`を呼び出す
    /// - `E_NO_ACCESS`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 102, location = medical_passport)]
    fun test_seal_approve_patient_only_user1_user2_passport_fails() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートAをmint
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートAを受け取る
        ts::next_tx(&mut scenario, USER1);
        {
            let passport_a = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport_a);
        };

        // User2がパスポートBをmint
        ts::next_tx(&mut scenario, USER2);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let walrus2 = string::utf8(b"walrus-blob-67890");
            let seal2 = string::utf8(b"seal-key-fghij");
            let country2 = string::utf8(b"US");

            accessor::mint_medical_passport(
                &mut registry,
                walrus2,
                seal2,
                country2,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User2がパスポートBを受け取る
        ts::next_tx(&mut scenario, USER2);
        {
            let passport_b = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport_b);
        };

        // User1がパスポートBを取得してseal_approve_patient_onlyを呼び出す（エラーになるはず）
        ts::next_tx(&mut scenario, USER1);
        {
            let passport_b = ts::take_from_address<MedicalPassport>(&scenario, USER2);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // seal_approve_patient_onlyを呼び出し（E_NO_ACCESSでabortするはず）
            accessor::seal_approve_patient_only(b"", 
                &passport_b,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_address(USER2, passport_b);
        };

        ts::end(scenario);
    }

    // ============================================================
    // パスポート未所持ユーザーのテスト
    // ============================================================

    /// Test 2-1: パスポート未所持ユーザーが他人のパスポートで呼び出す（異常系）
    ///
    /// 仕様:
    /// - ユーザー1がパスポートAを所有
    /// - ユーザー2はパスポート未所持
    /// - ユーザー2がパスポートAで`seal_approve_patient_only`を呼び出す
    /// - `E_NO_ACCESS`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 102, location = medical_passport)]
    fun test_seal_approve_patient_only_no_passport_user_fails() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートAをmint
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートAを受け取る
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport);
        };

        // User2（パスポート未所持）がパスポートAを取得してseal_approve_patient_onlyを呼び出す（エラーになるはず）
        ts::next_tx(&mut scenario, USER2);
        {
            let passport = ts::take_from_address<MedicalPassport>(&scenario, USER1);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // seal_approve_patient_onlyを呼び出し（E_NO_ACCESSでabortするはず）
            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_address(USER1, passport);
        };

        ts::end(scenario);
    }

    // ============================================================
    // エッジケースのテスト
    // ============================================================

    /// Test 3-1: 同じユーザーが複数回呼び出す（正常系）
    ///
    /// 仕様:
    /// - ユーザー1がパスポートAを所有
    /// - ユーザー1が同じパスポートで`seal_approve_patient_only`を複数回呼び出す
    /// - すべて成功（abortしない）ことを確認
    #[test]
    fun test_seal_approve_patient_only_multiple_calls_success() {
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

            accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートを受け取り、seal_approve_patient_onlyを複数回呼び出す
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            // 1回目の呼び出し（abortしないことを確認）
            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            // 2回目の呼び出し（abortしないことを確認）
            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            // 3回目の呼び出し（abortしないことを確認）
            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    /// Test 3-2: パスポート作成直後に呼び出す（正常系）
    ///
    /// 仕様:
    /// - ユーザー1がパスポートAをmint
    /// - 同じトランザクション内で`seal_approve_patient_only`を呼び出す
    /// - 成功（abortしない）ことを確認
    #[test]
    fun test_seal_approve_patient_only_immediately_after_mint_success() {
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

            accessor::mint_medical_passport(
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // ミント直後の次のトランザクションでseal_approve_patient_onlyを呼び出す（abortしないことを確認）
        // 注意: entry funの制約により、mintで転送されたパスポートはトランザクション終了後にインベントリに反映されるため、
        // 同じトランザクション内でtake_from_senderを使用することはできない
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let registry = ts::take_shared<PassportRegistry>(&scenario);

            accessor::seal_approve_patient_only(b"", 
                &passport,
                &registry,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }
}
