# Data Management via Dynamic Fields - Spec Delta

## ADDED Requirements

### Requirement: Dynamic Field-based Data Storage

The system SHALL store medical data Blob IDs using Sui Dynamic Fields attached to each `MedicalPassport`, organized by data type.

**Supported Data Types** (as defined in data_schema.md):
- `"medication"`: Medication dispensing records
- `"lab_results"`: Laboratory test results
- `"conditions"`: Current and past medical conditions
- `"basic_profile"`: Basic patient information

**Storage Format**:
- Key: `String` (data type identifier)
- Value: `vector<String>` (list of Walrus Blob IDs)

#### Scenario: Empty state on passport creation

- **WHEN** a new passport is minted
- **THEN** the passport SHALL have no Dynamic Fields for data types
- **AND** querying any data type SHALL return an empty vector or None

#### Scenario: Multiple Blob IDs per data type

- **WHEN** a user adds multiple medication records
- **THEN** each Blob ID SHALL be appended to the `"medication"` Dynamic Field
- **AND** the order of Blob IDs SHALL be preserved

### Requirement: Adding Blob References

Users SHALL be able to add Walrus Blob IDs to their passport for specific data types.

**API**:
```move
entry fun add_blob_id(
    passport: &mut MedicalPassport,
    data_type: String,
    blob_id: String,
    ctx: &tx_context::TxContext
)
```

**Constraints**:
- Only the passport owner can add Blob IDs
- `data_type` must be non-empty
- `blob_id` must be non-empty
- Duplicate Blob IDs within the same data type SHALL be prevented

#### Scenario: First Blob ID addition

- **WHEN** a passport owner adds a Blob ID with `add_blob_id(passport, "medication", "blob_xyz789", ctx)`
- **AND** the `"medication"` Dynamic Field does not exist
- **THEN** a new Dynamic Field SHALL be created with key `"medication"`
- **AND** the value SHALL be a vector containing `["blob_xyz789"]`

#### Scenario: Subsequent Blob ID additions

- **WHEN** a passport already has Blob IDs for `"medication": ["blob_1"]`
- **AND** the owner adds `"blob_2"`
- **THEN** the Dynamic Field SHALL be updated to `["blob_1", "blob_2"]`

#### Scenario: Duplicate prevention

- **WHEN** a user attempts to add a Blob ID that already exists for the same data type
- **THEN** the transaction SHALL abort with `E_DUPLICATE_BLOB_ID`

### Requirement: Retrieving Blob References

Users and applications SHALL be able to query Blob IDs for specific data types.

**API**:
```move
public fun get_blob_ids(
    passport: &MedicalPassport,
    data_type: String
): vector<String>
```

#### Scenario: Querying existing data

- **WHEN** a passport has `"medication": ["blob_1", "blob_2"]`
- **AND** `get_blob_ids(passport, "medication")` is called
- **THEN** it SHALL return `vector<String>` containing `["blob_1", "blob_2"]`

#### Scenario: Querying non-existent data type

- **WHEN** a passport has no Dynamic Field for `"lab_results"`
- **AND** `get_blob_ids(passport, "lab_results")` is called
- **THEN** it SHALL return an empty vector `[]`

### Requirement: Data Type Existence Check

Applications SHALL be able to check if a passport has any data for a specific type.

**API**:
```move
public fun has_blob_ids(
    passport: &MedicalPassport,
    data_type: String
): bool
```

#### Scenario: Checking existing data

- **WHEN** a passport has `"medication": ["blob_1"]`
- **AND** `has_blob_ids(passport, "medication")` is called
- **THEN** it SHALL return `true`

#### Scenario: Checking non-existent data

- **WHEN** a passport has no `"conditions"` Dynamic Field
- **AND** `has_blob_ids(passport, "conditions")` is called
- **THEN** it SHALL return `false`

### Requirement: Data Schema Compliance

All medical data referenced by Blob IDs SHALL comply with the schema defined in `data_schema.md v2.0.0`.

**Data Type → Schema Mapping**:
- `"medication"`: CSV/TSV with columns `dispensed_on`, `atc_code`, `rxnorm_code`
- `"lab_results"`: CSV with 8 columns including `collected_on`, `loinc_code`, `value`, etc.
- `"conditions"`: JSON with `current_conditions` and `past_conditions` arrays (ICD-10 codes)
- `"basic_profile"`: JSON with `birth_date`, `nationality`, `gender`, `allergies`, `blood_type`

#### Scenario: Schema validation responsibility

- **WHEN** a Blob ID is added to a passport
- **THEN** the smart contract SHALL NOT validate the Blob content (content validation is the frontend's responsibility)
- **AND** the contract SHALL only ensure the `data_type` and `blob_id` are non-empty strings

### Requirement: Frontend Integration

The frontend SHALL handle Blob creation, encryption, storage, and retrieval in coordination with Walrus and Seal.

**Workflow**:
1. User enters medical data in the frontend
2. Frontend validates against data_schema.md
3. Frontend encrypts data using Seal
4. Frontend uploads encrypted data to Walrus → receives Blob ID
5. Frontend calls `add_blob_id()` to reference the Blob in the passport
6. For retrieval: Frontend calls `get_blob_ids()` → fetches Blob from Walrus → decrypts with Seal

#### Scenario: Data addition workflow

- **WHEN** a user adds medication data via the frontend
- **THEN** the frontend SHALL encrypt the CSV data
- **AND** upload it to Walrus to obtain a Blob ID
- **AND** call `add_blob_id(passport, "medication", blob_id, ctx)`
- **AND** the Blob ID SHALL be stored in the passport's Dynamic Field

## Error Codes

### Error: Duplicate Blob ID

- **Code**: `E_DUPLICATE_BLOB_ID (301)`
- **Trigger**: Attempting to add a Blob ID that already exists for the same data type
- **Recovery**: Frontend should check existing Blob IDs before adding

### Error: Empty Data Type

- **Code**: `E_EMPTY_DATA_TYPE (302)`
- **Trigger**: `data_type` parameter is an empty string
- **Recovery**: Provide a valid data type string

### Error: Empty Blob ID

- **Code**: `E_EMPTY_BLOB_ID (303)`
- **Trigger**: `blob_id` parameter is an empty string
- **Recovery**: Provide a valid Walrus Blob ID

### Error: Unauthorized Blob Addition

- **Code**: `E_UNAUTHORIZED_BLOB_ADDITION (304)`
- **Trigger**: Non-owner attempts to add Blob ID to a passport
- **Recovery**: Only the passport owner can modify their data references
