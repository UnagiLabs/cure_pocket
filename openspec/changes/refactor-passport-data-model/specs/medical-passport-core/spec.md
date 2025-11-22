# Medical Passport Core - Spec Delta

## MODIFIED Requirements

### Requirement: Medical Passport Structure

The `MedicalPassport` SHALL be a Soulbound Token (SBT) that contains minimal on-chain data and references to encrypted medical data stored on Walrus via Dynamic Fields.

**Structure**:
```move
public struct MedicalPassport has key {
    id: object::UID,
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
}
```

**Fields**:
- `id`: Sui object identifier
- `seal_id`: Seal encryption system key/policy ID (non-empty string)
- `country_code`: ISO 3166-1 alpha-2 country code (non-empty string, e.g., "JP", "US")
- `analytics_opt_in`: User consent flag for anonymous statistical data provision (boolean)

**Medical Data References**:
Medical data Blob IDs SHALL be managed via Dynamic Fields attached to the passport's UID, organized by data type:
- `"medication"` → `vector<String>` (Walrus Blob IDs)
- `"lab_results"` → `vector<String>` (Walrus Blob IDs)
- `"conditions"` → `vector<String>` (Walrus Blob IDs)
- `"basic_profile"` → `vector<String>` (Walrus Blob IDs)

#### Scenario: Passport creation with minimal on-chain data

- **WHEN** a user mints a passport with `seal_id="seal_xyz789"`, `country_code="JP"`, `analytics_opt_in=true`
- **THEN** the passport SHALL contain only these three fields
- **AND** medical data Blob IDs SHALL NOT be stored in the passport struct itself
- **AND** medical data references SHALL be managed via Dynamic Fields

#### Scenario: Soulbound characteristics

- **WHEN** a passport is created
- **THEN** it SHALL have only `has key` ability (no `has store`)
- **AND** the passport SHALL be non-transferable after minting
- **AND** the `transfer_to()` function SHALL be `public(package)` scope only

### Requirement: Passport Minting API

Users SHALL be able to mint their own Medical Passport SBT with minimal required fields.

**API Signature**:
```move
entry fun mint_medical_passport(
    registry: &mut PassportRegistry,
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
    ctx: &mut tx_context::TxContext
)
```

**Constraints**:
- One passport per wallet address (enforced by PassportRegistry)
- Non-empty `seal_id` and `country_code` required
- `analytics_opt_in` is mandatory (true/false)
- No AdminCap required (self-minting allowed)

#### Scenario: Successful passport minting

- **WHEN** a user calls `mint_medical_passport(registry, "seal_abc123", "US", true, ctx)`
- **AND** the user does not already have a passport
- **THEN** a new `MedicalPassport` SHALL be created with the provided fields
- **AND** the passport SHALL be transferred to the transaction sender
- **AND** the passport ID SHALL be registered in PassportRegistry

#### Scenario: Duplicate minting prevention

- **WHEN** a user attempts to mint a second passport
- **THEN** the transaction SHALL abort with `E_ALREADY_HAS_PASSPORT`

#### Scenario: Empty field validation

- **WHEN** a user provides an empty `seal_id` or `country_code`
- **THEN** the transaction SHALL abort with `E_EMPTY_SEAL_ID` or `E_EMPTY_COUNTRY_CODE`

### Requirement: Passport Field Access

Users and applications SHALL be able to read passport fields.

**Getter APIs**:
```move
public fun get_seal_id(passport: &MedicalPassport): &String
public fun get_country_code(passport: &MedicalPassport): &String
public fun get_analytics_opt_in(passport: &MedicalPassport): bool
public fun get_all_fields(passport: &MedicalPassport): (&String, &String, bool)
```

#### Scenario: Individual field retrieval

- **WHEN** `get_seal_id()` is called on a passport
- **THEN** it SHALL return a reference to the `seal_id` field

#### Scenario: Bulk field retrieval

- **WHEN** `get_all_fields()` is called
- **THEN** it SHALL return a tuple of `(seal_id, country_code, analytics_opt_in)`

### Requirement: Analytics Consent Management

Users SHALL be able to update their consent for anonymous statistical data provision.

**API**:
```move
entry fun update_analytics_opt_in(
    passport: &mut MedicalPassport,
    opt_in: bool,
    ctx: &tx_context::TxContext
)
```

#### Scenario: Consent update

- **WHEN** a passport owner calls `update_analytics_opt_in(passport, false, ctx)`
- **THEN** the `analytics_opt_in` field SHALL be updated to `false`
- **AND** the change SHALL be reflected in subsequent `get_analytics_opt_in()` calls

## REMOVED Requirements

### Requirement: Single Walrus Blob ID Storage

**Reason**: Replaced by Dynamic Fields architecture for flexible, type-specific data management

**Migration**: Medical data references now managed via Dynamic Fields (see data-management capability)

## ADDED Requirements

### Requirement: Migration Event Structure

Passport migration events SHALL include the `analytics_opt_in` field.

**Event Structure**:
```move
public struct PassportMigrationEvent has copy, drop {
    old_owner: address,
    new_owner: address,
    passport_id: object::ID,
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
    timestamp_ms: u64,
}
```

#### Scenario: Migration event emission

- **WHEN** an admin migrates a passport
- **THEN** a `PassportMigrationEvent` SHALL be emitted
- **AND** the event SHALL include the `analytics_opt_in` value from the migrated passport
