#[test_only]
module cure_pocket::test_utils {
    use cure_pocket::cure_pocket;
    use cure_pocket::medical_passport;
    use cure_pocket::consent_token;

    #[test_only]
    public fun destroy_admin(admin: cure_pocket::AdminCap) {
        cure_pocket::destroy_admin_for_tests(admin);
    }

    #[test_only]
    public fun destroy_registry(registry: medical_passport::PassportRegistry) {
        medical_passport::destroy_registry_for_tests(registry);
    }

    #[test_only]
    public fun destroy_passport(passport: medical_passport::MedicalPassport) {
        medical_passport::destroy_passport_for_tests(passport);
    }

    #[test_only]
    public fun destroy_consent_token(token: consent_token::ConsentToken) {
        consent_token::destroy_consent_token_for_tests(token);
    }
}
