/// Medical Passport - 新データモデルテスト
#[test_only]
module cure_pocket::medical_passport_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock;
    use std::string::{Self as string, String};

    use cure_pocket::accessor;
    use cure_pocket::admin;
    use cure_pocket::cure_pocket::Self;
    use cure_pocket::medical_passport::{Self, PassportRegistry, MedicalPassport};
    use cure_pocket::test_utils;

    const ADMIN: address = @0xA;
    const USER2: address = @0xB;

    fun passport_data(): (String, bool) {
        (string::utf8(b"JP"), true)
    }

    fun sample_metadata_blob_id(): String {
        string::utf8(b"metadata_blob_001")
    }

    #[test]
    fun create_passport_sets_fields() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (country_code, analytics_opt_in) = passport_data();
            let passport = medical_passport::create_passport_internal(
                country_code,
                analytics_opt_in,
                ctx,
            );

            assert!(accessor::get_country_code(&passport) == &string::utf8(b"JP"), 0);
            assert!(accessor::get_analytics_opt_in(&passport), 1);

            test_utils::destroy_passport(passport);
        };
        ts::end(scenario);
    }

    #[test]
    fun add_dynamic_field_registers_metadata_blob_id() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (country_code, analytics_opt_in) = passport_data();
            let mut passport = medical_passport::create_passport_internal(
                country_code,
                analytics_opt_in,
                ctx,
            );

            let clk = clock::create_for_testing(ctx);
            let key = string::utf8(b"lab_results");
            let entry_seal_id = b"entry-seal-001";
            let metadata_blob_id = sample_metadata_blob_id();
            accessor::add_data_entry(&mut passport, key, entry_seal_id, metadata_blob_id, &clk);

            let entry = accessor::get_data_entry(&passport, key);
            let stored = accessor::get_entry_metadata_blob_id(entry);
            assert!(*stored == string::utf8(b"metadata_blob_001"), 0);

            // Verify seal_id is stored correctly
            let stored_seal_id = accessor::get_entry_seal_id(entry);
            assert!(*stored_seal_id == b"entry-seal-001", 1);

            accessor::remove_data_entry(&mut passport, key);
            clock::destroy_for_testing(clk);
            test_utils::destroy_passport(passport);
        };
        ts::end(scenario);
    }

    #[test]
    fun replace_dynamic_field_overwrites_values() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (country_code, analytics_opt_in) = passport_data();
            let mut passport = medical_passport::create_passport_internal(
                country_code,
                analytics_opt_in,
                ctx,
            );

            let mut clk = clock::create_for_testing(ctx);
            let key = string::utf8(b"basic_profile");
            let entry_seal_id = b"entry-seal-001";
            accessor::add_data_entry(&mut passport, key, entry_seal_id, sample_metadata_blob_id(), &clk);

            // Advance clock to verify updated_at changes
            clock::increment_for_testing(&mut clk, 1000);

            let new_metadata_blob_id = string::utf8(b"new_metadata_blob");
            let new_seal_id = b"entry-seal-002";
            accessor::replace_data_entry(&mut passport, key, new_seal_id, new_metadata_blob_id, &clk);

            let entry = accessor::get_data_entry(&passport, key);
            let stored = accessor::get_entry_metadata_blob_id(entry);
            assert!(*stored == string::utf8(b"new_metadata_blob"), 0);

            // Verify seal_id was updated
            let stored_seal_id = accessor::get_entry_seal_id(entry);
            assert!(*stored_seal_id == b"entry-seal-002", 1);

            // Verify updated_at is 1000ms (after clock increment)
            let updated_at = accessor::get_entry_updated_at(entry);
            assert!(updated_at == 1000, 2);

            accessor::remove_data_entry(&mut passport, key);
            clock::destroy_for_testing(clk);
            test_utils::destroy_passport(passport);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 11, location = medical_passport)]
    fun add_dynamic_field_duplicate_aborts() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (country_code, analytics_opt_in) = passport_data();
            let mut passport = medical_passport::create_passport_internal(
                country_code,
                analytics_opt_in,
                ctx,
            );

            let clk = clock::create_for_testing(ctx);
            let key = string::utf8(b"medications");
            let entry_seal_id = b"entry-seal-001";
            accessor::add_data_entry(&mut passport, key, entry_seal_id, sample_metadata_blob_id(), &clk);
            // 2回目は同じキーで登録しようとすると abort
            accessor::add_data_entry(&mut passport, key, entry_seal_id, sample_metadata_blob_id(), &clk);

            accessor::remove_data_entry(&mut passport, key);
            clock::destroy_for_testing(clk);
            test_utils::destroy_passport(passport);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 2, location = medical_passport)]
    fun empty_country_code_aborts() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (_, analytics_opt_in) = passport_data();
            let empty = string::utf8(b"");
            let passport = medical_passport::create_passport_internal(
                empty,
                analytics_opt_in,
                ctx,
            );
            test_utils::destroy_passport(passport);
        };
        ts::end(scenario);
    }

    #[test]
    fun get_all_fields_includes_analytics() {
        let mut scenario = ts::begin(ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let (country_code, analytics_opt_in) = passport_data();
            let passport = medical_passport::create_passport_internal(
                country_code,
                analytics_opt_in,
                ctx,
            );

            let (country_ref, analytics) = accessor::get_all_fields(&passport);
            assert!(*country_ref == string::utf8(b"JP"), 0);
            assert!(analytics, 1);

            test_utils::destroy_passport(passport);
        };
        ts::end(scenario);
    }

    #[test]
    fun mint_marks_registry() {
        let mut scenario = ts::begin(ADMIN);
        {
            let mut registry: PassportRegistry;

            ts::next_tx(&mut scenario, ADMIN);
            {
                let ctx = ts::ctx(&mut scenario);
                registry = medical_passport::create_passport_registry(ctx);
                let (country_code, analytics_opt_in) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics_opt_in, ctx);
            };

            assert!(accessor::has_passport(&registry, ADMIN), 0);
            test_utils::destroy_registry(registry);
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 3, location = accessor)]
    fun double_mint_aborts() {
        let mut scenario = ts::begin(ADMIN);
        {
            let mut registry: PassportRegistry;

            // 1回目 mint
            ts::next_tx(&mut scenario, ADMIN);
            {
                let ctx = ts::ctx(&mut scenario);
                registry = medical_passport::create_passport_registry(ctx);
                let (country_code, analytics_opt_in) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics_opt_in, ctx);
            };

            // 2回目は重複でabort
            ts::next_tx(&mut scenario, ADMIN);
            {
                let ctx = ts::ctx(&mut scenario);
                let (country_code, analytics_opt_in) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics_opt_in, ctx);
            };

            test_utils::destroy_registry(registry);
        };
        ts::end(scenario);
    }

    #[test]
    fun migration_inherits_fields() {
        let mut scenario = ts::begin(ADMIN);
        {
            let mut registry: PassportRegistry;
            let admin_cap: cure_pocket::AdminCap;

            // 初回トランザクション: registry作成とmint
            ts::next_tx(&mut scenario, ADMIN);
            {
                let ctx = ts::ctx(&mut scenario);
                admin_cap = cure_pocket::test_init_for_tests(ctx);
                registry = medical_passport::create_passport_registry(ctx);
                let (country_code, analytics_opt_in) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics_opt_in, ctx);
            };

            // 移行トランザクション
            ts::next_tx(&mut scenario, ADMIN);
            {
                let passport = ts::take_from_address<MedicalPassport>(&scenario, ADMIN);
                let ctx = ts::ctx(&mut scenario);
                let clock = clock::create_for_testing(ctx);
                admin::migrate_passport(
                    &admin_cap,
                    &mut registry,
                    ADMIN,
                    USER2,
                    passport,
                    &clock,
                    ctx,
                );
                clock::destroy_for_testing(clock);
            };

            // 新オーナー確認
            ts::next_tx(&mut scenario, USER2);
            {
                let passport = ts::take_from_address<MedicalPassport>(&scenario, USER2);
                let (country_ref, analytics) = accessor::get_all_fields(&passport);
                assert!(*country_ref == string::utf8(b"JP"), 0);
                assert!(analytics, 1);
                test_utils::destroy_passport(passport);
            };

            test_utils::destroy_registry(registry);
            test_utils::destroy_admin(admin_cap);
        };
        ts::end(scenario);
    }
}
