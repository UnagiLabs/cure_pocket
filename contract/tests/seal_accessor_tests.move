/// Seal Accessor - アクセス制御テスト
#[test_only]
module cure_pocket::seal_accessor_tests {
    use sui::test_scenario::{Self as ts};
    use std::string::{Self as string, String};

    use cure_pocket::accessor;
    use cure_pocket::medical_passport::{Self as medical_passport, MedicalPassport, PassportRegistry};
    use cure_pocket::cure_pocket::Self;

    const USER1: address = @0xA1;
    const USER2: address = @0xA2;

    fun passport_data(): (String, String, bool) {
        (string::utf8(b"seal-key-abcde"), string::utf8(b"JP"), true)
    }

    #[test]
    fun seal_approve_allows_owner() {
        let mut scenario = ts::begin(USER1);
        {
            cure_pocket::init_for_testing(ts::ctx(&mut scenario));

            ts::next_tx(&mut scenario, USER1);
            {
                let mut registry = ts::take_shared<PassportRegistry>(&scenario);
                let (seal_id, country_code, analytics) = passport_data();
                accessor::mint_medical_passport(&mut registry, seal_id, country_code, analytics, ts::ctx(&mut scenario));
                ts::return_shared(registry);
            };

            ts::next_tx(&mut scenario, USER1);
            {
                let passport = ts::take_from_sender<MedicalPassport>(&scenario);
                let registry = ts::take_shared<PassportRegistry>(&scenario);

            accessor::seal_approve_patient_only(b"", &passport, &registry, ts::ctx(&mut scenario));

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
                let (seal_id, country_code, analytics) = passport_data();
                accessor::mint_medical_passport(&mut registry, seal_id, country_code, analytics, ts::ctx(&mut scenario));
                ts::return_shared(registry);
            };

            // Non-owner attempts to access
            ts::next_tx(&mut scenario, USER2);
            {
                let passport = ts::take_from_address<MedicalPassport>(&scenario, USER1);
                let registry = ts::take_shared<PassportRegistry>(&scenario);

            accessor::seal_approve_patient_only(b"", &passport, &registry, ts::ctx(&mut scenario));

                ts::return_shared(registry);
                ts::return_to_address(USER1, passport);
            };
        };
        ts::end(scenario);
    }
}
