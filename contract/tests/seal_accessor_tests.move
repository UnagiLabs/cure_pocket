/// Seal Accessor - アクセス制御テスト
#[test_only]
module cure_pocket::seal_accessor_tests {
    use sui::test_scenario::{Self as ts};
    use sui::clock;
    use std::string::{Self as string, String};

    use cure_pocket::accessor;
    use cure_pocket::seal_accessor;
    use cure_pocket::medical_passport::{Self as medical_passport, MedicalPassport, PassportRegistry};
    use cure_pocket::cure_pocket::Self;

    const USER1: address = @0xA1;
    const USER2: address = @0xA2;

    fun passport_data(): (String, bool) {
        (string::utf8(b"JP"), true)
    }

    // EntryData用のテストデータ (v3.0.0: metadata_blob_id)
    fun entry_data(): (String, vector<u8>, String) {
        let data_type = string::utf8(b"medications");
        let entry_seal_id = b"entry-seal-id-12345";
        let metadata_blob_id = string::utf8(b"metadata-blob-001");
        (data_type, entry_seal_id, metadata_blob_id)
    }

    #[test]
    fun seal_approve_allows_owner() {
        let mut scenario = ts::begin(USER1);
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));

            ts::next_tx(&mut scenario, USER1);
            {
                let mut registry = ts::take_shared<PassportRegistry>(&scenario);
                let (country_code, analytics) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics, ts::ctx(&mut scenario));
                ts::return_shared(registry);
            };

            // EntryDataを追加
            ts::next_tx(&mut scenario, USER1);
            {
                let mut passport = ts::take_from_sender<MedicalPassport>(&scenario);
                let clock = clock::create_for_testing(ts::ctx(&mut scenario));
                let (data_type, entry_seal_id, metadata_blob_id) = entry_data();

                accessor::add_data_entry(&mut passport, data_type, entry_seal_id, metadata_blob_id, &clock);

                clock::destroy_for_testing(clock);
                ts::return_to_sender(&scenario, passport);
            };

            ts::next_tx(&mut scenario, USER1);
            {
                let passport = ts::take_from_sender<MedicalPassport>(&scenario);
                let registry = ts::take_shared<PassportRegistry>(&scenario);
                let (data_type, entry_seal_id, _metadata_blob_id) = entry_data();

                // seal_idはバイナリ形式で直接渡す
                accessor::seal_approve_patient_only(entry_seal_id, &passport, &registry, data_type, ts::ctx(&mut scenario));

                ts::return_shared(registry);
                ts::return_to_sender(&scenario, passport);
            };
        };
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 102, location = medical_passport)]
    fun seal_approve_rejects_non_owner() {
        let mut scenario = ts::begin(USER1);
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));

            ts::next_tx(&mut scenario, USER1);
            {
                let mut registry = ts::take_shared<PassportRegistry>(&scenario);
                let (country_code, analytics) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics, ts::ctx(&mut scenario));
                ts::return_shared(registry);
            };

            // EntryDataを追加
            ts::next_tx(&mut scenario, USER1);
            {
                let mut passport = ts::take_from_sender<MedicalPassport>(&scenario);
                let clock = clock::create_for_testing(ts::ctx(&mut scenario));
                let (data_type, entry_seal_id, metadata_blob_id) = entry_data();

                accessor::add_data_entry(&mut passport, data_type, entry_seal_id, metadata_blob_id, &clock);

                clock::destroy_for_testing(clock);
                ts::return_to_sender(&scenario, passport);
            };

            // Non-owner attempts to access
            ts::next_tx(&mut scenario, USER2);
            {
                let passport = ts::take_from_address<MedicalPassport>(&scenario, USER1);
                let registry = ts::take_shared<PassportRegistry>(&scenario);
                let (data_type, entry_seal_id, _metadata_blob_id) = entry_data();

                // seal_idはバイナリ形式で直接渡す
                accessor::seal_approve_patient_only(entry_seal_id, &passport, &registry, data_type, ts::ctx(&mut scenario));

                ts::return_shared(registry);
                ts::return_to_address(USER1, passport);
            };
        };
        ts::end(scenario);
    }

    /// seal_idが不一致の場合にE_INVALID_SEAL_ID(103)でabort
    #[test]
    #[expected_failure(abort_code = seal_accessor::E_INVALID_SEAL_ID)]
    fun seal_approve_rejects_invalid_seal_id() {
        let mut scenario = ts::begin(USER1);
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));

            ts::next_tx(&mut scenario, USER1);
            {
                let mut registry = ts::take_shared<PassportRegistry>(&scenario);
                let (country_code, analytics) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics, ts::ctx(&mut scenario));
                ts::return_shared(registry);
            };

            // EntryDataを追加
            ts::next_tx(&mut scenario, USER1);
            {
                let mut passport = ts::take_from_sender<MedicalPassport>(&scenario);
                let clock = clock::create_for_testing(ts::ctx(&mut scenario));
                let (data_type, entry_seal_id, metadata_blob_id) = entry_data();

                accessor::add_data_entry(&mut passport, data_type, entry_seal_id, metadata_blob_id, &clock);

                clock::destroy_for_testing(clock);
                ts::return_to_sender(&scenario, passport);
            };

            // 誤ったseal_idでアクセス
            ts::next_tx(&mut scenario, USER1);
            {
                let passport = ts::take_from_sender<MedicalPassport>(&scenario);
                let registry = ts::take_shared<PassportRegistry>(&scenario);
                let (data_type, _, _metadata_blob_id) = entry_data();

                // 誤ったseal_idを渡す
                let wrong_seal_id_bytes = b"wrong-seal-id";
                accessor::seal_approve_patient_only(wrong_seal_id_bytes, &passport, &registry, data_type, ts::ctx(&mut scenario));

                ts::return_shared(registry);
                ts::return_to_sender(&scenario, passport);
            };
        };
        ts::end(scenario);
    }

    /// 存在しないdata_typeの場合にE_DATA_ENTRY_NOT_FOUND(12)でabort
    #[test]
    #[expected_failure(abort_code = 12, location = medical_passport)]
    fun seal_approve_rejects_data_not_found() {
        let mut scenario = ts::begin(USER1);
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));

            ts::next_tx(&mut scenario, USER1);
            {
                let mut registry = ts::take_shared<PassportRegistry>(&scenario);
                let (country_code, analytics) = passport_data();
                accessor::mint_medical_passport(&mut registry, country_code, analytics, ts::ctx(&mut scenario));
                ts::return_shared(registry);
            };

            // EntryDataを追加しない状態でアクセス
            ts::next_tx(&mut scenario, USER1);
            {
                let passport = ts::take_from_sender<MedicalPassport>(&scenario);
                let registry = ts::take_shared<PassportRegistry>(&scenario);

                // 存在しないdata_typeでアクセス
                let nonexistent_data_type = string::utf8(b"medications");
                let seal_id_bytes = b"some-seal-id";
                accessor::seal_approve_patient_only(seal_id_bytes, &passport, &registry, nonexistent_data_type, ts::ctx(&mut scenario));

                ts::return_shared(registry);
                ts::return_to_sender(&scenario, passport);
            };
        };
        ts::end(scenario);
    }
}
