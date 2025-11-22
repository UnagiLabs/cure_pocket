# Design Document: Dynamic Fields Architecture for Medical Data

## Context

CurePocket is a decentralized health passport system that stores encrypted medical data on Walrus and manages access via Sui smart contracts. The current implementation stores a single `walrus_blob_id` directly in the `MedicalPassport` struct, which limits flexibility for managing multiple data types and historical records.

**Requirements**:
- Support multiple medical data types (medications, lab results, conditions, basic profile)
- Allow multiple Blob IDs per data type (historical records)
- Enable data type-specific access control via Seal
- Comply with data_schema.md v2.0.0
- Support user consent for analytics data provision

**Constraints**:
- On-chain storage costs (minimize data in structs)
- Soulbound Token (SBT) characteristics must be preserved
- 1 wallet = 1 passport constraint must be maintained
- Breaking changes are acceptable (new implementation)

## Goals / Non-Goals

### Goals

1. **Flexible Data Organization**: Store medical data references organized by type (medication, lab_results, etc.)
2. **Historical Data Support**: Allow multiple Blob IDs per data type for tracking history
3. **Minimal On-Chain Footprint**: Keep passport struct minimal, store references in Dynamic Fields
4. **Analytics Consent**: Add explicit user consent flag for statistical data sharing
5. **Schema Compliance**: Align with data_schema.md requirements

### Non-Goals

1. **Data Migration**: No backward compatibility with existing deployments (fresh start)
2. **On-Chain Validation**: Smart contracts will NOT validate Blob content (frontend responsibility)
3. **Automatic Data Sync**: No automatic synchronization between data types
4. **Multi-Owner Passports**: Passport remains single-owner (Soulbound)

## Decisions

### Decision 1: Use Dynamic Fields for Data References

**Choice**: Store medical data Blob IDs in Sui Dynamic Fields attached to the passport's UID, keyed by data type string.

**Rationale**:
- **Flexibility**: Can add/remove data types without struct changes
- **Gas Efficiency**: Only pay for storage when data is actually added
- **Type Safety**: Each data type can have its own vector of Blob IDs
- **Query Efficiency**: Can check existence without loading all data

**Alternatives Considered**:
1. **Store all Blob IDs in a single vector**:
   - ❌ No type differentiation
   - ❌ Inefficient querying (must scan entire vector)

2. **Use separate struct fields for each data type**:
   - ❌ Requires struct changes to add new data types
   - ❌ Wastes storage if types are unused

3. **Use a Table/Bag**:
   - ❌ More complex API
   - ✅ Similar flexibility to Dynamic Fields
   - Decision: Dynamic Fields are simpler and sufficient for this use case

### Decision 2: Remove `walrus_blob_id` from Passport Struct

**Choice**: Delete the `walrus_blob_id` field entirely and rely solely on Dynamic Fields.

**Rationale**:
- **Consistency**: All medical data references managed uniformly
- **Flexibility**: No "primary" Blob ID concept
- **Clarity**: Clear separation between identity (passport) and data (Blob references)

**Migration Impact**:
- BREAKING: All existing code referencing `walrus_blob_id` must be updated
- No data migration needed (new deployment)

### Decision 3: Add `analytics_opt_in` Field

**Choice**: Add a boolean `analytics_opt_in` field directly to the `MedicalPassport` struct.

**Rationale**:
- **Always Present**: Analytics consent is a core passport attribute
- **Gas Efficient**: Boolean is cheap to store
- **Query Performance**: Faster than Dynamic Field lookup
- **Regulatory Compliance**: Explicit consent tracking for GDPR/HIPAA

**Alternatives Considered**:
1. **Store in Dynamic Fields**:
   - ❌ Adds query overhead for a frequently accessed field
   - ❌ Less clear that it's a core passport attribute

### Decision 4: Data Type String Constants

**Choice**: Define data type constants in `medical_passport.move`:
```move
const DATA_TYPE_MEDICATION: vector<u8> = b"medication";
const DATA_TYPE_LAB_RESULTS: vector<u8> = b"lab_results";
const DATA_TYPE_CONDITIONS: vector<u8> = b"conditions";
const DATA_TYPE_BASIC_PROFILE: vector<u8> = b"basic_profile";
```

**Rationale**:
- **Type Safety**: Reduces typo errors
- **Documentation**: Self-documenting code
- **Frontend Integration**: Frontend can import these constants for consistency

**Alternatives Considered**:
1. **Free-form strings**:
   - ❌ Error-prone (typos)
   - ❌ No compile-time checks

### Decision 5: Ownership Check for `add_blob_id()`

**Choice**: Verify `ctx.sender() == passport.owner` before allowing Blob ID additions.

**Wait**: Sui's object ownership model already enforces this - only the owner can pass `&mut MedicalPassport` to a function.

**Decision**: Rely on Sui's built-in ownership, no explicit check needed.

## Risks / Trade-offs

### Risk 1: Dynamic Field Key Collisions

**Risk**: If two components use the same data type string, data could be overwritten.

**Mitigation**:
- Define constants in smart contract
- Document valid data types in contract and frontend
- Frontend validation layer

**Probability**: Low (constants prevent typos)

### Risk 2: Gas Costs for Large Histories

**Risk**: Users with many historical Blob IDs (e.g., 100+ medication records) may face high gas costs.

**Mitigation**:
- Educate users about gas costs
- Consider optional "archiving" feature in future (remove old Blob IDs from Dynamic Fields)
- Data is stored off-chain (Walrus), only references on-chain

**Probability**: Medium (active users over years)

**Impact**: Low (gas costs manageable for reasonable use)

### Risk 3: Frontend-Contract Schema Mismatch

**Risk**: Frontend uploads Blob with incorrect schema, contract stores reference, data is invalid.

**Mitigation**:
- Strict frontend validation against data_schema.md
- Display data parsing errors gracefully
- Future: Optional on-chain schema version field

**Probability**: Medium (human error)

**Impact**: Low (data can be re-uploaded, no on-chain corruption)

## Data Flow Diagrams

### Mint Flow (Before)
```
User → Frontend → Sui Contract
                    ↓
            MedicalPassport {
                id,
                walrus_blob_id: "blob_xyz",  ← Single Blob
                seal_id,
                country_code
            }
```

### Mint Flow (After)
```
User → Frontend → Sui Contract
                    ↓
            MedicalPassport {
                id,
                seal_id,
                country_code,
                analytics_opt_in: true
            }
            ↓
    (No Blob IDs initially)
```

### Add Medical Data Flow (After)
```
User enters data → Frontend validates → Seal encrypts → Walrus uploads
                                                           ↓
                                                      blob_id_xyz
                                                           ↓
Frontend → add_blob_id(passport, "medication", "blob_id_xyz")
                ↓
        Dynamic Field added:
        passport.id → "medication" → ["blob_id_xyz"]
```

### Retrieve Medical Data Flow (After)
```
Frontend → get_blob_ids(passport, "medication")
              ↓
        ["blob_id_xyz", "blob_id_abc"]
              ↓
Frontend fetches from Walrus → Seal decrypts → Display to user
```

## Migration Plan

### For New Deployment (Current Situation)

1. Implement new `MedicalPassport` struct
2. Update all APIs
3. Rewrite tests
4. Deploy to testnet
5. Frontend integration testing
6. Deploy to mainnet

**Rollback**: Not applicable (no existing deployment)

### For Future Breaking Changes

If breaking changes are needed after mainnet deployment:

1. Deploy new package version
2. Implement admin migration tool:
   ```move
   public fun migrate_to_v2(
       old_passport: MedicalPassport_v1,
       registry: &mut PassportRegistry,
       ...
   ) -> MedicalPassport_v2
   ```
3. Preserve Seal ID and critical data
4. Notify users to migrate
5. Set deprecation timeline for old version

## Open Questions

### Q1: Should we limit the number of Blob IDs per data type?

**Options**:
- A) No limit (current design)
- B) Hard limit (e.g., 100 Blob IDs per type)
- C) Soft limit (gas costs naturally limit)

**Recommendation**: Start with (A), monitor usage, add limit if needed

### Q2: Should `add_blob_id()` emit an event?

**Pros**:
- Off-chain indexing
- Audit trail

**Cons**:
- Extra gas cost

**Recommendation**: YES - emit `BlobIdAddedEvent` for transparency

### Q3: Should we allow removing Blob IDs?

**Current Design**: No removal function (append-only)

**Rationale**:
- Medical records should be permanent
- Simplifies audit trail

**Future**: If removal is needed, add `remove_blob_id()` with careful access control

## Implementation Phases

### Phase 1: Core Structure (High Priority)
- Update `MedicalPassport` struct
- Implement `create_passport_internal()`
- Update `mint_medical_passport()`

### Phase 2: Dynamic Fields API (High Priority)
- `add_blob_id_internal()`
- `get_blob_ids_internal()`
- `has_blob_ids_internal()`
- Expose via `accessor.move`

### Phase 3: Analytics Consent (Medium Priority)
- Add getter/setter for `analytics_opt_in`
- Update migration logic

### Phase 4: Testing & Validation (High Priority)
- Rewrite all unit tests
- Add integration tests for Dynamic Fields
- Test gas costs for large histories

### Phase 5: Documentation (Medium Priority)
- Update contract.md
- Update README.md
- Add frontend integration guide

## Success Criteria

1. ✅ All tests pass (`sui move test`)
2. ✅ Contract compiles without warnings
3. ✅ API matches requirements in spec deltas
4. ✅ Data schema compliance verified
5. ✅ Gas costs acceptable (<1M gas for typical operations)
6. ✅ Frontend can mint passport and add Blob IDs successfully
