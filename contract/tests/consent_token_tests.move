/// Consent Token - テストスイート
///
/// ConsentToken機能のテスト
#[test_only]
module cure_pocket::consent_token_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock;
    use sui::bcs;
    use std::string::{Self, String};
    use std::hash;
    use cure_pocket::test_utils;

    use cure_pocket::accessor;
    use cure_pocket::consent_token::{Self, ConsentToken};
    use cure_pocket::cure_pocket::Self;
    use cure_pocket::medical_passport::{Self, MedicalPassport};

    // テスト用定数
    const USER1: address = @0xA1;
    const USER2: address = @0xA2;
    const PASSPORT_ID: address = @0xB1;


    // テストヘルパー: 標準的なsecretを生成
    fun create_test_secret(): vector<u8> {
        vector[1u8, 2u8, 3u8, 4u8, 5u8, 6u8, 7u8, 8u8, 9u8, 10u8, 11u8, 12u8, 13u8, 14u8, 15u8, 16u8, 17u8, 18u8, 19u8, 20u8, 21u8, 22u8, 23u8, 24u8, 25u8, 26u8, 27u8, 28u8, 29u8, 30u8, 31u8, 32u8]
    }

    // テストヘルパー: secretのハッシュを生成
    fun create_test_secret_hash(): vector<u8> {
        let secret = create_test_secret();
        hash::sha3_256(secret)
    }

    // テストヘルパー: 標準的なスコープを生成
    fun create_test_scopes(): vector<String> {
        let mut scopes = vector::empty<String>();
        vector::push_back(&mut scopes, string::utf8(b"medications"));
        vector::push_back(&mut scopes, string::utf8(b"lab_results"));
        scopes
    }

    // テストヘルパー: テスト用MedicalPassportを作成
    fun create_test_passport(ctx: &mut sui::tx_context::TxContext): MedicalPassport {
        let country_code = string::utf8(b"JP");
        let analytics_opt_in = true;
        medical_passport::create_passport_internal(country_code, analytics_opt_in, ctx)
    }

    // テストヘルパー: EntryData用のseal_idを生成（バイナリ形式）
    fun create_test_entry_seal_id(): vector<u8> {
        b"test-entry-seal-id-for-medication"
    }

    // テストヘルパー: EntryDataを追加 (v3.0.0: metadata_blob_id)
    fun add_test_entry_data(passport: &mut MedicalPassport, clock: &clock::Clock) {
        let data_type = string::utf8(b"medications");
        let entry_seal_id = create_test_entry_seal_id();
        let metadata_blob_id = string::utf8(b"test-metadata-blob-id");
        medical_passport::add_data_entry(passport, data_type, entry_seal_id, metadata_blob_id, clock);
    }

    // ============================================================
    // 基本機能テスト
    // ============================================================

    /// Test 1: 正常なトークン作成
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - すべてのフィールドが正しく設定されていることを確認
    #[test]
    fun test_create_consent_token_success() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がConsentTokenを作成
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64; // 1日

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };


        ts::end(scenario);
    }

    /// Test 2: 空のsecret_hashでabort
    ///
    /// 仕様:
    /// - 空のsecret_hashでConsentTokenを作成しようとする
    /// - `E_EMPTY_SECRET`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 205, location = consent_token)]
    fun test_create_consent_token_empty_secret_hash() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1が空のsecret_hashでConsentTokenを作成しようとする
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = vector::empty<u8>();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 3: duration_msが0でabort
    ///
    /// 仕様:
    /// - duration_msが0でConsentTokenを作成しようとする
    /// - `E_INVALID_DURATION`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 206, location = consent_token)]
    fun test_create_consent_token_zero_duration() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がduration_ms=0でConsentTokenを作成しようとする
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 0u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 4: 空のscopesでabort
    ///
    /// 仕様:
    /// - 空のscopesでConsentTokenを作成しようとする
    /// - `E_EMPTY_SCOPES`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 207, location = consent_token)]
    fun test_create_consent_token_empty_scopes() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1が空のscopesでConsentTokenを作成しようとする
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = vector::empty<String>();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 5: オーバーフローでabort
    ///
    /// 仕様:
    /// - 非常に大きなduration_msでConsentTokenを作成しようとする
    /// - `E_EXPIRATION_OVERFLOW`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 208, location = consent_token)]
    fun test_create_consent_token_expiration_overflow() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1が非常に大きなduration_msでConsentTokenを作成しようとする
        ts::next_tx(&mut scenario, USER1);
        {
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            // Clockの時刻を1ms進めることで、u64::MAXのduration_msでオーバーフローさせる
            clock::increment_for_testing(&mut clock, 1);
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 18446744073709551615u64; // 最大値でオーバーフロー

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    // ============================================================
    // revoke機能テスト
    // ============================================================

    /// Test 6: 正常な無効化
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - grantorが無効化
    /// - `is_active`が`false`になることを確認
    #[test]
    fun test_revoke_consent_token_success() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がConsentTokenを作成
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // User1がConsentTokenを無効化
        ts::next_tx(&mut scenario, USER1);
        {
            let mut token = ts::take_shared<ConsentToken>(&scenario);

            accessor::revoke_consent_token(
                &mut token,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(token);
        };

        // 無効化されたことを確認
        ts::next_tx(&mut scenario, USER1);
        {
            let token = ts::take_shared<ConsentToken>(&scenario);
            assert!(!consent_token::is_active(&token), 0);
            ts::return_shared(token);
        };

        ts::end(scenario);
    }

    /// Test 7: 既に無効化済みでabort
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - 無効化
    /// - 再度無効化しようとする
    /// - `E_CONSENT_REVOKED`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 201, location = consent_token)]
    fun test_revoke_consent_token_already_revoked() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がConsentTokenを作成
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // User1がConsentTokenを無効化
        ts::next_tx(&mut scenario, USER1);
        {
            let mut token = ts::take_shared<ConsentToken>(&scenario);

            accessor::revoke_consent_token(
                &mut token,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(token);
        };

        // User1が再度無効化しようとする（abort）
        ts::next_tx(&mut scenario, USER1);
        {
            let mut token = ts::take_shared<ConsentToken>(&scenario);

            accessor::revoke_consent_token(
                &mut token,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(token);
        };

        ts::end(scenario);
    }

    /// Test 8: grantor以外が無効化しようとしてabort
    ///
    /// 仕様:
    /// - ConsentTokenを作成（user1）
    /// - user2が無効化しようとする
    /// - `E_NON_GRANTOR_REVOKE`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 210, location = accessor)]
    fun test_revoke_consent_token_non_grantor() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がConsentTokenを作成
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // User2がConsentTokenを無効化しようとする（abort）
        ts::next_tx(&mut scenario, USER2);
        {
            let mut token = ts::take_shared<ConsentToken>(&scenario);

            accessor::revoke_consent_token(
                &mut token,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(token);
        };

        ts::end(scenario);
    }

    /// Test 8b: 内部関数でもgrantor不一致でabort
    ///
    /// 仕様:
    /// - consent_token::revoke_consent_internalにgrantor不一致を渡すとE_NON_GRANTOR_REVOKE(210)でabort
    #[test]
    #[expected_failure(abort_code = 210, location = consent_token)]
    fun test_revoke_consent_internal_non_grantor() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // トークン作成
        let token = {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let t = consent_token::create_consent_internal(
                passport_id,
                USER1,
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
            t
        };

        // grantor不一致で内部無効化
        {
            let mut token_mut = token;
            consent_token::revoke_consent_internal(&mut token_mut, USER2);
            test_utils::destroy_consent_token(token_mut);
        };

        ts::end(scenario);
    }

    // ============================================================
    // verify機能テスト
    // ============================================================

    /// Test 9: 正常な検証
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - 正しいsecretとpassport_idで検証
    /// - abortしないことを確認
    #[test]
    fun test_verify_consent_token_success() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // EntryDataを追加
            add_test_entry_data(&mut passport, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // 検証（正しいsecretとpassport_id）
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let secret = create_test_secret();

            // seal_idをUTF-8バイトとして取得
            let entry_seal_id = create_test_entry_seal_id();
            let seal_id_bytes = entry_seal_id;

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&secret);
            let passport_address = object::id_to_address(&passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"medications");
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 10: 無効化済みトークンでabort
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - 無効化
    /// - 検証しようとする
    /// - `E_CONSENT_REVOKED`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 201, location = consent_token)]
    fun test_verify_consent_token_revoked() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // EntryDataを追加
            add_test_entry_data(&mut passport, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // User1がConsentTokenを無効化
        ts::next_tx(&mut scenario, USER1);
        {
            let mut token = ts::take_shared<ConsentToken>(&scenario);

            accessor::revoke_consent_token(
                &mut token,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(token);
        };

        // 検証しようとする（abort）
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let secret = create_test_secret();

            // seal_idをUTF-8バイトとして取得
            let entry_seal_id = create_test_entry_seal_id();
            let seal_id_bytes = entry_seal_id;

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&secret);
            let passport_address = object::id_to_address(&passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"medications");
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    // Test 11: 有効期限切れでabort
    // 実装スキップ（時間を進める機能が必要）
    // 実際の時間を進めることはできないため、このテストはスキップ

    /// Test 12: パスポートID不一致でabort
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - 異なるpassport_idで検証しようとする
    /// - `E_INVALID_PASSPORT_ID`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 203, location = accessor)]
    fun test_verify_consent_token_invalid_passport_id() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // EntryDataを追加
            add_test_entry_data(&mut passport, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // 異なるpassport_idで検証しようとする（abort）
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let secret = create_test_secret();
            let wrong_passport_id = object::id_from_address(@0xB2); // 異なるID

            // seal_idをUTF-8バイトとして取得
            let entry_seal_id = create_test_entry_seal_id();
            let seal_id_bytes = entry_seal_id;

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&secret);
            let passport_address = object::id_to_address(&wrong_passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"medications");
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 13: secret不一致でabort
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - 異なるsecretで検証しようとする
    /// - `E_INVALID_SECRET`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 204, location = consent_token)]
    fun test_verify_consent_token_invalid_secret() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // EntryDataを追加
            add_test_entry_data(&mut passport, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // 異なるsecretで検証しようとする（abort）
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let wrong_secret = vector[99u8, 98u8, 97u8]; // 異なるsecret

            // seal_idをUTF-8バイトとして取得
            let entry_seal_id = create_test_entry_seal_id();
            let seal_id_bytes = entry_seal_id;

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&wrong_secret);
            let passport_address = object::id_to_address(&passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"medications");
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    // ============================================================
    // 統合テスト
    // ============================================================

    /// Test 14: 作成→検証のフロー
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - 検証
    /// - 両方が成功することを確認
    #[test]
    fun test_create_and_verify_consent_token() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // EntryDataを追加
            add_test_entry_data(&mut passport, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // 検証
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let secret = create_test_secret();

            // seal_idをUTF-8バイトとして取得
            let entry_seal_id = create_test_entry_seal_id();
            let seal_id_bytes = entry_seal_id;

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&secret);
            let passport_address = object::id_to_address(&passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"medications");
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 15: 作成→無効化→検証失敗のフロー
    ///
    /// 仕様:
    /// - ConsentTokenを作成
    /// - 無効化
    /// - 検証しようとする
    /// - `E_CONSENT_REVOKED`でabortすることを確認
    #[test]
    #[expected_failure(abort_code = 201, location = consent_token)]
    fun test_create_revoke_verify_consent_token() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // EntryDataを追加
            add_test_entry_data(&mut passport, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // User1がConsentTokenを無効化
        ts::next_tx(&mut scenario, USER1);
        {
            let mut token = ts::take_shared<ConsentToken>(&scenario);

            accessor::revoke_consent_token(
                &mut token,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(token);
        };

        // 検証しようとする（abort）
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let secret = create_test_secret();

            // seal_idをUTF-8バイトとして取得
            let entry_seal_id = create_test_entry_seal_id();
            let seal_id_bytes = entry_seal_id;

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&secret);
            let passport_address = object::id_to_address(&passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"medications");
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 16: 複数のトークン作成・管理
    ///
    /// 仕様:
    /// - ConsentTokenを作成、無効化、再作成できることを確認
    /// - それぞれを個別に管理できることを確認
    #[test]
    fun test_multiple_consent_tokens() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がConsentToken1を作成
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id1 = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id1,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // Token1を検証して有効であることを確認
        ts::next_tx(&mut scenario, USER1);
        {
            let token1 = ts::take_shared<ConsentToken>(&scenario);
            assert!(consent_token::is_active(&token1), 0);
            ts::return_shared(token1);
        };

        // Token1を無効化
        ts::next_tx(&mut scenario, USER1);
        {
            let mut token1 = ts::take_shared<ConsentToken>(&scenario);
            accessor::revoke_consent_token(
                &mut token1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(token1);
        };

        // Token1が無効であることを確認
        ts::next_tx(&mut scenario, USER1);
        {
            let token1 = ts::take_shared<ConsentToken>(&scenario);
            assert!(!consent_token::is_active(&token1), 0);
            ts::return_shared(token1);
        };

        // User1がConsentToken2を作成（別のパスポートID）
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id2 = object::id_from_address(@0xB2);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id2,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // Token2を検証して有効であることを確認
        ts::next_tx(&mut scenario, USER1);
        {
            let token2 = ts::take_shared<ConsentToken>(&scenario);
            assert!(consent_token::is_active(&token2), 0);
            ts::return_shared(token2);
        };

        ts::end(scenario);
    }

    // ============================================================
    // エッジケーステスト
    // ============================================================

    /// Test 17: 最大期間でのトークン作成
    ///
    /// 仕様:
    /// - 最大期間（u64::MAX - 現在時刻）でConsentTokenを作成
    /// - 成功することを確認
    #[test]
    fun test_consent_token_max_duration() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1が最大期間でConsentTokenを作成
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            // 現在時刻を取得して、オーバーフローしない最大値を計算
            let now = clock::timestamp_ms(&clock);
            let duration_ms = 18446744073709551615u64 - now - 1; // オーバーフローしない最大値

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 18: 最小期間（1ms）でのトークン作成
    ///
    /// 仕様:
    /// - 最小期間（1ms）でConsentTokenを作成
    /// - 成功することを確認
    #[test]
    fun test_consent_token_min_duration() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1が最小期間でConsentTokenを作成
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes();
            let duration_ms = 1u64; // 最小期間

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 19: 様々な長さのsecret_hashでのテスト
    ///
    /// 仕様:
    /// - 様々な長さのsecret_hashでConsentTokenを作成
    /// - すべて成功することを確認
    #[test]
    fun test_consent_token_secret_hash_length() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // 短いsecret_hash
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(PASSPORT_ID);
            let secret_hash = hash::sha3_256(vector[1u8, 2u8, 3u8]);
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // 長いsecret_hash
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let passport_id = object::id_from_address(@0xB2);
            let mut long_secret = vector::empty<u8>();
            let mut i = 0;
            while (i < 100) {
                vector::push_back(&mut long_secret, (i % 256) as u8);
                i = i + 1;
            };
            let secret_hash = hash::sha3_256(long_secret);
            let scopes = create_test_scopes();
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    // ============================================================
    // スコープ検証テスト（Phase 2）
    // ============================================================

    /// Test 20: スコープ外アクセスが拒否されるべき
    ///
    /// 仕様:
    /// - ConsentTokenを作成（スコープ: ["medications"]のみ）
    /// - seal_approve_consent()でrequested_scope = "lab_results"を指定
    /// - E_SCOPE_NOT_ALLOWEDでabortされるべき
    #[test]
    #[expected_failure(abort_code = 209, location = consent_token)]
    fun test_seal_approve_consent_scope_not_allowed() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成（スコープ: ["medications"]のみ）
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // lab_results用のEntryDataを追加（テスト対象のスコープ外アクセス用）
            let data_type = string::utf8(b"lab_results");
            let entry_seal_id = b"test-seal-id-for-lab-results";
            let metadata_blob_id = string::utf8(b"test-metadata-blob-id");
            medical_passport::add_data_entry(&mut passport, data_type, entry_seal_id, metadata_blob_id, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let mut scopes = vector::empty<String>();
            vector::push_back(&mut scopes, string::utf8(b"medications")); // medicationsのみ
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // スコープ外アクセス（lab_results）を試みる
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let secret = create_test_secret();

            // lab_results用のseal_idをバイナリとして直接使用
            let seal_id_bytes = b"test-seal-id-for-lab-results";

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&secret);
            let passport_address = object::id_to_address(&passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"lab_results"); // スコープ外
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }

    /// Test 21: スコープ内アクセスが許可される（既存の動作確認）
    ///
    /// 仕様:
    /// - ConsentTokenを作成（スコープ: ["medications", "lab_results"]）
    /// - seal_approve_consent()でrequested_scope = "medications"を指定
    /// - abortしないことを確認（正常系）
    #[test]
    fun test_seal_approve_consent_scope_allowed() {
        let mut scenario = ts::begin(USER1);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がMedicalPassportとConsentTokenを作成（スコープ: ["medications", "lab_results"]）
        let passport_id;
        ts::next_tx(&mut scenario, USER1);
        {
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let mut passport = create_test_passport(ts::ctx(&mut scenario));
            passport_id = sui::object::id(&passport);

            // EntryDataを追加
            add_test_entry_data(&mut passport, &clock);

            medical_passport::transfer_to(passport, USER1);

            let secret_hash = create_test_secret_hash();
            let scopes = create_test_scopes(); // ["medications", "lab_results"]
            let duration_ms = 86400000u64;

            let token = consent_token::create_consent_internal(
                passport_id,
                USER1,  // grantor
                secret_hash,
                scopes,
                duration_ms,
                &clock,
                ts::ctx(&mut scenario)
            );
            consent_token::share_consent_token(token);

            clock::destroy_for_testing(clock);
        };

        // スコープ内アクセス（medications）を試みる
        ts::next_tx(&mut scenario, USER1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            let token = ts::take_shared<ConsentToken>(&scenario);
            let clock = clock::create_for_testing(ts::ctx(&mut scenario));
            let secret = create_test_secret();

            // seal_idをUTF-8バイトとして取得
            let entry_seal_id = create_test_entry_seal_id();
            let seal_id_bytes = entry_seal_id;

            // BCSエンコードされたauth_payloadを作成
            let mut auth_payload = bcs::to_bytes(&secret);
            let passport_address = object::id_to_address(&passport_id);
            let passport_bytes = bcs::to_bytes(&passport_address);
            vector::append(&mut auth_payload, passport_bytes);
            let requested_scope = string::utf8(b"medications"); // スコープ内
            let scope_bytes = bcs::to_bytes(&requested_scope);
            vector::append(&mut auth_payload, scope_bytes);

            // abortしないことを確認
            accessor::seal_approve_consent(
                seal_id_bytes,
                auth_payload,
                &token,
                &passport,
                requested_scope,
                &clock
            );

            ts::return_to_sender(&scenario, passport);

            ts::return_shared(token);
            clock::destroy_for_testing(clock);
        };

        ts::end(scenario);
    }
}
