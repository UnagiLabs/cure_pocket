/// Cure Pocket Medical Passport SBT - テストスイート
///
/// TDD (Test-Driven Development) アプローチに基づき、実装前にテストを定義
///
/// テスト範囲:
/// - 基本テスト: AdminCap初期化、パスポート作成、mint操作
/// - 異常系テスト: 空文字列バリデーション
/// - 統合テスト: test_scenarioを使った実際のトランザクションフロー
#[test_only]
module cure_pocket::medical_passport_tests {
    use sui::test_scenario::{Self as ts};
    use sui::test_utils;
    use std::string::{Self, String};

    use cure_pocket::medical_passport::{Self, MedicalPassport, PassportRegistry};
    use cure_pocket::medical_passport_admin::{Self};
    use cure_pocket::medical_passport_accessor;
    use cure_pocket::cure_pocket::{Self, AdminCap};

    // テスト用定数
    const ADMIN: address = @0xAD;

    // テストヘルパー: 標準的なパスポートデータを生成
    fun create_test_passport_data(): (String, String, String) {
        let walrus = string::utf8(b"walrus-blob-12345");
        let seal = string::utf8(b"seal-key-abcde");
        let country = string::utf8(b"JP");
        (walrus, seal, country)
    }

    // ============================================================
    // 基本テスト (Basic Tests)
    // ============================================================

    /// Test 1: AdminCap初期化テスト
    ///
    /// 仕様:
    /// - test_init_for_tests() が AdminCap を返すこと
    /// - AdminCap は has key 能力を持つこと（型システムで保証）
    #[test]
    fun test_init_returns_admin_cap() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);

            // AdminCapを取得（test_only関数）
            let admin = cure_pocket::test_init_for_tests(ctx);

            // AdminCapが正しく作成されたことを確認（型が存在することで保証）
            // ドロップして所有権を解放
            test_utils::destroy(admin);
        };
        ts::end(scenario);
    }

    /// Test 2: MedicalPassport作成時のフィールド設定テスト
    ///
    /// 仕様:
    /// - create_passport_internal() が正しくフィールドを設定すること
    /// - getter関数で各フィールド値を検証できること
    #[test]
    fun test_create_medical_passport_sets_all_fields() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (walrus, seal, country) = create_test_passport_data();

            // 内部関数でパスポートを作成
            let passport = medical_passport::create_passport_internal(
                walrus,
                seal,
                country,
                ctx
            );

            // フィールド値を検証
            assert!(
                medical_passport_accessor::get_walrus_blob_id(&passport) == &string::utf8(b"walrus-blob-12345"),
                0
            );
            assert!(
                medical_passport_accessor::get_seal_id(&passport) == &string::utf8(b"seal-key-abcde"),
                1
            );
            assert!(
                medical_passport_accessor::get_country_code(&passport) == &string::utf8(b"JP"),
                2
            );

            test_utils::destroy(passport);
        };
        ts::end(scenario);
    }

    /// Test 3: mint_medical_passport の基本動作テスト
    ///
    /// 仕様:
    /// - mint_medical_passport() が abort せずに実行完了すること
    /// - AdminCap を持っている場合のみ実行可能であること
    /// - 1ウォレット1枚制約が機能すること
    #[test]
    fun test_mint_medical_passport_compiles_and_does_not_abort() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let admin = cure_pocket::test_init_for_tests(ctx);
            let mut registry = medical_passport::create_passport_registry(ctx);
            let (walrus, seal, country) = create_test_passport_data();

            // mint操作（entry関数なのでtransferされる）
            medical_passport_admin::mint_medical_passport(
                &admin,
                &mut registry,
                walrus,
                seal,
                country,
                ctx
            );

            test_utils::destroy(admin);
            test_utils::destroy(registry);
        };
        ts::end(scenario);
    }

    // ============================================================
    // 異常系テスト (Error Handling Tests)
    // ============================================================

    /// Test 4: 空のwalrus_blob_idでエラーになることを確認
    #[test]
    #[expected_failure(abort_code = 1, location = medical_passport)]
    fun test_create_passport_rejects_empty_walrus_blob_id() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let walrus = string::utf8(b"");  // 空文字列
            let seal = string::utf8(b"seal-key-abcde");
            let country = string::utf8(b"JP");

            let passport = medical_passport::create_passport_internal(
                walrus,
                seal,
                country,
                ctx
            );

            test_utils::destroy(passport);
        };
        ts::end(scenario);
    }

    /// Test 5: 空のseal_idでエラーになることを確認
    #[test]
    #[expected_failure(abort_code = 2, location = medical_passport)]
    fun test_create_passport_rejects_empty_seal_id() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let walrus = string::utf8(b"walrus-blob-12345");
            let seal = string::utf8(b"");  // 空文字列
            let country = string::utf8(b"JP");

            let passport = medical_passport::create_passport_internal(
                walrus,
                seal,
                country,
                ctx
            );

            test_utils::destroy(passport);
        };
        ts::end(scenario);
    }

    /// Test 6: 空のcountry_codeでエラーになることを確認
    #[test]
    #[expected_failure(abort_code = 3, location = medical_passport)]
    fun test_create_passport_rejects_empty_country_code() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let walrus = string::utf8(b"walrus-blob-12345");
            let seal = string::utf8(b"seal-key-abcde");
            let country = string::utf8(b"");  // 空文字列

            let passport = medical_passport::create_passport_internal(
                walrus,
                seal,
                country,
                ctx
            );

            test_utils::destroy(passport);
        };
        ts::end(scenario);
    }

    // ============================================================
    // 統合テスト (Integration Tests with test_scenario)
    // ============================================================

    /// Test 7: 管理者がパスポートをmintし、ユーザーが受け取るフロー
    ///
    /// 仕様:
    /// - init() で AdminCap が ADMIN に転送され、PassportRegistry が共有される
    /// - ADMIN が mint_medical_passport() を実行
    /// - mint したユーザーが MedicalPassport を受け取る
    /// - 1ウォレット1枚制約が機能すること
    #[test]
    fun test_scenario_admin_can_mint_passport() {
        let mut scenario = ts::begin(ADMIN);

        // Step 1: init関数を実行（AdminCapとPassportRegistryが作成される）
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // Step 2: ADMINがAdminCapとRegistryを取得し、パスポートをmint
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            medical_passport_admin::mint_medical_passport(
                &admin_cap,
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // Step 3: ADMINがMedicalPassportを受け取ったことを確認
        ts::next_tx(&mut scenario, ADMIN);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);

            // フィールド値を検証
            assert!(
                medical_passport_accessor::get_walrus_blob_id(&passport) == &string::utf8(b"walrus-blob-12345"),
                0
            );

            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    /// Test 8: Soulbound特性のテスト（transfer関数が存在しない）
    ///
    /// 仕様:
    /// - MedicalPassport は has key のみを持ち、has store を持たない
    /// - public_transfer で転送しようとするとコンパイルエラーになる
    /// - モジュール外部に transfer 関数が公開されていない
    ///
    /// 注意: このテストはコンパイル時の型チェックで保証されるため、
    ///       実際には「transfer関数を呼び出さない」ことで成立
    #[test]
    fun test_scenario_passport_is_soulbound_non_transferable() {
        let mut scenario = ts::begin(ADMIN);

        // パスポートをmint
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);
            let (walrus, seal, country) = create_test_passport_data();

            medical_passport_admin::mint_medical_passport(
                &admin_cap,
                &mut registry,
                walrus,
                seal,
                country,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // パスポートを取得
        ts::next_tx(&mut scenario, ADMIN);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);

            // Soulbound特性の確認:
            // 1. MedicalPassport は has key のみ（has store なし）
            // 2. medical_passport モジュールに public transfer 関数なし
            // 3. よって、以下のコードはコンパイルエラーになる:
            //    sui::transfer::public_transfer(passport, USER);
            //    ↑ これは書けない（has store が必要）

            // 正常にパスポートを保持していることを確認
            assert!(
                medical_passport_accessor::get_country_code(&passport) == &string::utf8(b"JP"),
                0
            );

            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    /// Test 9: get_all_fields で全フィールドを一括取得できること
    ///
    /// 仕様:
    /// - get_all_fields() で全フィールドを一度に取得できること
    /// - 返されたタプルの各要素が正しい値を持つこと
    #[test]
    fun test_get_all_fields_returns_all_data() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (walrus, seal, country) = create_test_passport_data();

            // 内部関数でパスポートを作成
            let passport = medical_passport::create_passport_internal(
                walrus,
                seal,
                country,
                ctx
            );

            // 全フィールドを一括取得
            let (walrus_id, seal_id, country_code) = medical_passport_accessor::get_all_fields(&passport);

            // 各フィールドが正しいことを検証
            assert!(walrus_id == &string::utf8(b"walrus-blob-12345"), 0);
            assert!(seal_id == &string::utf8(b"seal-key-abcde"), 1);
            assert!(country_code == &string::utf8(b"JP"), 2);

            test_utils::destroy(passport);
        };
        ts::end(scenario);
    }

    // ============================================================
    // 新規テスト: 1ウォレット1枚制約 (Registry Tests)
    // ============================================================

    /// Test 10: init関数がPassportRegistryを共有オブジェクトとして作成
    ///
    /// 仕様:
    /// - init() で PassportRegistry が共有オブジェクトとして作成される
    /// - PassportRegistry は take_shared で取得可能
    #[test]
    fun test_init_creates_shared_registry() {
        let mut scenario = ts::begin(ADMIN);

        // init関数を実行
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // Registryが共有オブジェクトとして存在することを確認
        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<PassportRegistry>(&scenario);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    /// Test 11: 同じアドレスが2回mintしようとするとabort
    ///
    /// 仕様:
    /// - 1回目のmintは成功する
    /// - 2回目のmintはE_ALREADY_HAS_PASSPORT (4) でabortする
    #[test]
    #[expected_failure(abort_code = 4, location = medical_passport_admin)]
    fun test_scenario_cannot_mint_twice() {
        let mut scenario = ts::begin(ADMIN);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // 1回目のmint（成功）
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);

            medical_passport_admin::mint_medical_passport(
                &admin_cap,
                &mut registry,
                string::utf8(b"walrus-blob-1"),
                string::utf8(b"seal-key-1"),
                string::utf8(b"JP"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // 2回目のmint（E_ALREADY_HAS_PASSPORTでabort）
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);

            medical_passport_admin::mint_medical_passport(
                &admin_cap,
                &mut registry,
                string::utf8(b"walrus-blob-2"),
                string::utf8(b"seal-key-2"),
                string::utf8(b"US"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    /// Test 12: 異なるユーザーは各自パスポートをmint可能
    ///
    /// 仕様:
    /// - 異なるアドレスは各自1枚ずつパスポートを持てる
    /// - それぞれのmintが独立して成功する
    #[test]
    fun test_different_users_can_mint() {
        let user1 = @0xA1;
        let user2 = @0xA2;
        let mut scenario = ts::begin(ADMIN);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // User1がパスポートをmint
        ts::next_tx(&mut scenario, user1);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);

            medical_passport_accessor::mint_medical_passport(
                &mut registry,
                string::utf8(b"walrus-blob-user1"),
                string::utf8(b"seal-key-user1"),
                string::utf8(b"JP"),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User1がパスポートを受け取ったことを確認
        ts::next_tx(&mut scenario, user1);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport);
        };

        // User2がパスポートをmint
        ts::next_tx(&mut scenario, user2);
        {
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);

            medical_passport_accessor::mint_medical_passport(
                &mut registry,
                string::utf8(b"walrus-blob-user2"),
                string::utf8(b"seal-key-user2"),
                string::utf8(b"US"),
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // User2がパスポートを受け取ったことを確認
        ts::next_tx(&mut scenario, user2);
        {
            let passport = ts::take_from_sender<MedicalPassport>(&scenario);
            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    /// Test 13: has_passport が正しい状態を返す
    ///
    /// 仕様:
    /// - mint前は has_passport が false を返す
    /// - mint後は has_passport が true を返す
    #[test]
    fun test_has_passport_returns_correct_status() {
        let mut scenario = ts::begin(ADMIN);

        // 初期化
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));
        };

        // mint前: has_passport は false
        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<PassportRegistry>(&scenario);
            assert!(!medical_passport::has_passport(&registry, ADMIN), 0);
            ts::return_shared(registry);
        };

        // パスポートをmint
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut registry = ts::take_shared<PassportRegistry>(&scenario);

            medical_passport_admin::mint_medical_passport(
                &admin_cap,
                &mut registry,
                string::utf8(b"walrus-blob"),
                string::utf8(b"seal-key"),
                string::utf8(b"JP"),
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(registry);
        };

        // mint後: has_passport は true
        ts::next_tx(&mut scenario, ADMIN);
        {
            let registry = ts::take_shared<PassportRegistry>(&scenario);
            assert!(medical_passport::has_passport(&registry, ADMIN), 1);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }
}
