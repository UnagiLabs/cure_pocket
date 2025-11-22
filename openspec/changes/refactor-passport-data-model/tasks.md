# Implementation Tasks (TDD方式)

**重要**: このプロジェクトはテスト駆動開発（TDD）で進めます。

## TDDフロー

1. **Phase 1**: テストを先に書く（実装コードは書かない）
2. **Phase 1**: テストを実行して失敗を確認
3. **Phase 1**: テストをコミット
4. **Phase 2**: テストをパスさせる実装を書く
5. **Phase 2**: テストが通過するまで実装を修正（テストは変更しない）
6. **Phase 2**: すべてのテストが通過したらコミット

---

## Phase 1: テスト作成（実装前）

### 1.1 テスト準備

- [ ] 1.1.1 現在のテストファイルをバックアップ（参考用）
- [ ] 1.1.2 テスト方針の確認（期待される入出力を明確化）

### 1.2 基本機能のテスト作成

**対象**: MedicalPassport構造体の変更に対応するテスト

- [ ] 1.2.1 `test_passport_creation_with_analytics_opt_in()`: `analytics_opt_in`フィールドを持つパスポート作成テスト
  - 期待: `seal_id`, `country_code`, `analytics_opt_in`の3フィールドを持つパスポートが作成される
  - 期待: `walrus_blob_id`フィールドは存在しない

- [ ] 1.2.2 `test_analytics_opt_in_true()`: `analytics_opt_in=true`でパスポート作成
  - 期待: `get_analytics_opt_in()`が`true`を返す

- [ ] 1.2.3 `test_analytics_opt_in_false()`: `analytics_opt_in=false`でパスポート作成
  - 期待: `get_analytics_opt_in()`が`false`を返す

- [ ] 1.2.4 `test_mint_without_walrus_blob_id()`: `walrus_blob_id`なしでmintが成功
  - 期待: `mint_medical_passport(registry, seal_id, country_code, analytics_opt_in, ctx)`が成功

- [ ] 1.2.5 `test_get_all_fields_includes_analytics()`: `get_all_fields()`が`analytics_opt_in`を含む
  - 期待: 戻り値が`(&String, &String, bool)`のタプル

### 1.3 Dynamic Fields管理のテスト作成

**対象**: データ種別ごとのBlob ID管理機能

- [ ] 1.3.1 `test_add_blob_id_to_empty_passport()`: 空のパスポートにBlob ID追加
  - 期待: `add_blob_id(passport, "medication", "blob_1", ctx)`が成功
  - 期待: `get_blob_ids(passport, "medication")`が`["blob_1"]`を返す

- [ ] 1.3.2 `test_add_multiple_blob_ids()`: 同じデータ種別に複数のBlob ID追加
  - 期待: `["blob_1", "blob_2", "blob_3"]`の順序が保持される

- [ ] 1.3.3 `test_add_blob_ids_different_types()`: 異なるデータ種別にBlob ID追加
  - 期待: `"medication"`と`"lab_results"`が独立して管理される

- [ ] 1.3.4 `test_get_blob_ids_empty()`: 存在しないデータ種別のクエリ
  - 期待: `get_blob_ids(passport, "conditions")`が空のvector `[]`を返す

- [ ] 1.3.5 `test_has_blob_ids_true()`: データが存在する場合
  - 期待: `has_blob_ids(passport, "medication")`が`true`を返す

- [ ] 1.3.6 `test_has_blob_ids_false()`: データが存在しない場合
  - 期待: `has_blob_ids(passport, "conditions")`が`false`を返す

- [ ] 1.3.7 `test_duplicate_blob_id_prevention()`: 重複Blob IDの追加を防止
  - 期待: 同じBlob IDを追加しようとすると`E_DUPLICATE_BLOB_ID (301)`でabort

- [ ] 1.3.8 `test_empty_data_type_error()`: 空のデータ種別
  - 期待: `add_blob_id(passport, "", "blob_1", ctx)`が`E_EMPTY_DATA_TYPE (302)`でabort

- [ ] 1.3.9 `test_empty_blob_id_error()`: 空のBlob ID
  - 期待: `add_blob_id(passport, "medication", "", ctx)`が`E_EMPTY_BLOB_ID (303)`でabort

- [ ] 1.3.10 `test_blob_id_order_preservation()`: Blob IDの順序保持
  - 期待: 追加順序が`get_blob_ids()`で保持される

### 1.4 Analytics Consent管理のテスト作成

**対象**: `analytics_opt_in`フラグの更新機能

- [ ] 1.4.1 `test_update_analytics_opt_in_to_false()`: `true`→`false`への変更
  - 期待: `update_analytics_opt_in(passport, false, ctx)`が成功
  - 期待: `get_analytics_opt_in(passport)`が`false`を返す

- [ ] 1.4.2 `test_update_analytics_opt_in_to_true()`: `false`→`true`への変更
  - 期待: `update_analytics_opt_in(passport, true, ctx)`が成功
  - 期待: `get_analytics_opt_in(passport)`が`true`を返す

- [ ] 1.4.3 `test_update_analytics_multiple_times()`: 複数回の更新
  - 期待: 最新の値が反映される

### 1.5 パスポート移行のテスト修正

**対象**: `analytics_opt_in`の継承確認

- [ ] 1.5.1 `test_migrate_passport_inherits_analytics_opt_in()`: 移行時の`analytics_opt_in`継承
  - 期待: 移行元の`analytics_opt_in`が移行先に継承される

- [ ] 1.5.2 `test_migration_event_includes_analytics_opt_in()`: 移行イベントに`analytics_opt_in`を含む
  - 期待: `PassportMigrationEvent`に`analytics_opt_in`フィールドが存在

### 1.6 既存テストの修正

**対象**: `walrus_blob_id`を使用している既存テストの修正

- [ ] 1.6.1 `medical_passport_tests.move`: 全テストのmint呼び出しを新シグネチャに変更
  - 変更前: `mint_medical_passport(registry, walrus_blob_id, seal_id, country_code, ctx)`
  - 変更後: `mint_medical_passport(registry, seal_id, country_code, analytics_opt_in, ctx)`

- [ ] 1.6.2 `medical_passport_tests.move`: `test_empty_walrus_blob_id`を削除

- [ ] 1.6.3 `seal_accessor_tests.move`: 全テストのmint呼び出しを新シグネチャに変更

- [ ] 1.6.4 `consent_token_tests.move`: 全テストのmint呼び出しを新シグネチャに変更

### 1.7 テストの実行と失敗確認

- [ ] 1.7.1 `sui move test`を実行
  - 期待: すべての新規テストが失敗する（実装がないため）
  - 期待: コンパイルエラーが出る（構造体変更がないため）

- [ ] 1.7.2 失敗内容の確認
  - 期待される失敗箇所をリスト化
  - テストが正しく期待動作を定義していることを確認

### 1.8 Phase 1 コミット

- [ ] 1.8.1 テストコードのみをコミット
  - コミットメッセージ: `[test] TDD: パスポートデータモデルリファクタリングのテスト作成`
  - 実装コードは一切含めない

---

## Phase 2: 実装作成（テスト通過のため）

### 2.1 エラーコードの追加

- [ ] 2.1.1 `medical_passport.move`: 新規エラーコードを追加
  ```move
  const E_DUPLICATE_BLOB_ID: u64 = 301;
  const E_EMPTY_DATA_TYPE: u64 = 302;
  const E_EMPTY_BLOB_ID: u64 = 303;
  ```

- [ ] 2.1.2 `medical_passport.move`: `E_EMPTY_WALRUS_BLOB_ID`を削除

### 2.2 データ構造の変更

- [ ] 2.2.1 `medical_passport.move`: MedicalPassport構造体から`walrus_blob_id`フィールドを削除

- [ ] 2.2.2 `medical_passport.move`: MedicalPassport構造体に`analytics_opt_in: bool`フィールドを追加
  ```move
  public struct MedicalPassport has key {
      id: object::UID,
      seal_id: String,
      country_code: String,
      analytics_opt_in: bool,
  }
  ```

- [ ] 2.2.3 `medical_passport.move`: PassportMigrationEventから`walrus_blob_id`を削除、`analytics_opt_in`を追加
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

- [ ] 2.2.4 `medical_passport.move`: データ種別の定数を追加
  ```move
  const DATA_TYPE_MEDICATION: vector<u8> = b"medication";
  const DATA_TYPE_LAB_RESULTS: vector<u8> = b"lab_results";
  const DATA_TYPE_CONDITIONS: vector<u8> = b"conditions";
  const DATA_TYPE_BASIC_PROFILE: vector<u8> = b"basic_profile";
  ```

### 2.3 内部関数の変更

- [ ] 2.3.1 `medical_passport.move`: `create_passport_internal()`のシグネチャ変更
  ```move
  public(package) fun create_passport_internal(
      seal_id: String,
      country_code: String,
      analytics_opt_in: bool,
      ctx: &mut tx_context::TxContext
  ): MedicalPassport
  ```

- [ ] 2.3.2 `medical_passport.move`: `create_passport_internal()`から`walrus_blob_id`のバリデーションを削除

- [ ] 2.3.3 `medical_passport.move`: `create_passport_internal()`で`analytics_opt_in`を設定

- [ ] 2.3.4 `medical_passport.move`: `get_walrus_blob_id()`関数を削除

- [ ] 2.3.5 `medical_passport.move`: `get_passport_data()`の戻り値を変更
  ```move
  public(package) fun get_passport_data(passport: &MedicalPassport): (String, String, bool)
  ```

- [ ] 2.3.6 `medical_passport.move`: `emit_migration_event()`のシグネチャ変更（`analytics_opt_in`追加）

### 2.4 Dynamic Fields管理関数の実装

- [ ] 2.4.1 `medical_passport.move`: `add_blob_id_internal()`を実装
  ```move
  public(package) fun add_blob_id_internal(
      passport: &mut MedicalPassport,
      data_type: String,
      blob_id: String
  )
  ```
  - バリデーション: `data_type`非空、`blob_id`非空
  - 重複チェック: 既存のBlob IDと比較
  - Dynamic Field追加またはvectorにappend

- [ ] 2.4.2 `medical_passport.move`: `get_blob_ids_internal()`を実装
  ```move
  public(package) fun get_blob_ids_internal(
      passport: &MedicalPassport,
      data_type: String
  ): vector<String>
  ```
  - Dynamic Fieldが存在しない場合は空vectorを返す

- [ ] 2.4.3 `medical_passport.move`: `has_blob_ids_internal()`を実装
  ```move
  public(package) fun has_blob_ids_internal(
      passport: &MedicalPassport,
      data_type: String
  ): bool
  ```

- [ ] 2.4.4 `medical_passport.move`: `get_analytics_opt_in()`を実装
  ```move
  public(package) fun get_analytics_opt_in(passport: &MedicalPassport): bool
  ```

- [ ] 2.4.5 `medical_passport.move`: `update_analytics_opt_in_internal()`を実装
  ```move
  public(package) fun update_analytics_opt_in_internal(
      passport: &mut MedicalPassport,
      opt_in: bool
  )
  ```

### 2.5 Public API（accessor.move）の変更

- [ ] 2.5.1 `accessor.move`: `mint_medical_passport()`のシグネチャ変更
  ```move
  entry fun mint_medical_passport(
      registry: &mut PassportRegistry,
      seal_id: String,
      country_code: String,
      analytics_opt_in: bool,
      ctx: &mut tx_context::TxContext
  )
  ```

- [ ] 2.5.2 `accessor.move`: `get_walrus_blob_id()`を削除

- [ ] 2.5.3 `accessor.move`: `add_blob_id()`を追加
  ```move
  entry fun add_blob_id(
      passport: &mut MedicalPassport,
      data_type: String,
      blob_id: String,
      ctx: &tx_context::TxContext
  )
  ```

- [ ] 2.5.4 `accessor.move`: `get_blob_ids()`を追加
  ```move
  public fun get_blob_ids(
      passport: &MedicalPassport,
      data_type: String
  ): vector<String>
  ```

- [ ] 2.5.5 `accessor.move`: `has_blob_ids()`を追加
  ```move
  public fun has_blob_ids(
      passport: &MedicalPassport,
      data_type: String
  ): bool
  ```

- [ ] 2.5.6 `accessor.move`: `get_analytics_opt_in()`を追加
  ```move
  public fun get_analytics_opt_in(passport: &MedicalPassport): bool
  ```

- [ ] 2.5.7 `accessor.move`: `update_analytics_opt_in()`を追加
  ```move
  entry fun update_analytics_opt_in(
      passport: &mut MedicalPassport,
      opt_in: bool,
      ctx: &tx_context::TxContext
  )
  ```

- [ ] 2.5.8 `accessor.move`: `get_all_fields()`の戻り値を変更
  ```move
  public fun get_all_fields(passport: &MedicalPassport): (&String, &String, bool)
  ```

### 2.6 Admin API（admin.move）の変更

- [ ] 2.6.1 `admin.move`: `admin_mint_medical_passport()`のシグネチャ変更
  ```move
  public fun admin_mint_medical_passport(
      _admin: &AdminCap,
      registry: &mut PassportRegistry,
      seal_id: String,
      country_code: String,
      analytics_opt_in: bool,
      ctx: &mut tx_context::TxContext
  )
  ```

- [ ] 2.6.2 `admin.move`: `migrate_passport()`の実装を変更（`analytics_opt_in`の継承）

- [ ] 2.6.3 `admin.move`: 移行イベントの発行を変更（`analytics_opt_in`を含む）

### 2.7 実装の検証

- [ ] 2.7.1 `sui move build`を実行
  - 期待: コンパイルエラーがない

- [ ] 2.7.2 `sui move test`を実行
  - 期待: すべてのテストが通過する
  - 失敗するテストがある場合: 実装を修正（テストは変更しない）

- [ ] 2.7.3 テストカバレッジの確認
  - 期待: 100%カバレッジを維持

### 2.8 Phase 2 コミット

- [ ] 2.8.1 実装コードをコミット
  - コミットメッセージ: `[refactor] TDD: パスポートデータモデルをDynamic Fields化`
  - テストコードは変更しない（Phase 1でコミット済み）

---

## Phase 3: ドキュメント更新

- [ ] 3.1 `docs/contract.md`: MedicalPassport構造体の仕様を更新
  - `walrus_blob_id`の削除を反映
  - `analytics_opt_in`フィールドの追加を反映
  - Dynamic Fields管理の説明を追加

- [ ] 3.2 `docs/contract.md`: API仕様の更新
  - mint APIのシグネチャ変更
  - 新規API（add_blob_id, get_blob_ids, etc.）の追加
  - 削除API（get_walrus_blob_id）の削除

- [ ] 3.3 `docs/contract.md`: 変更履歴にv2.0.0を追加
  ```markdown
  ### v2.0.0 (2025-XX-XX)
  **破壊的変更**: Dynamic Fields Architecture導入
  - MedicalPassport構造体のリファクタリング
  - データ種別ごとのBlob ID管理
  - analytics_opt_inフラグ追加
  ```

- [ ] 3.4 `README.md`: アーキテクチャ図の更新
  - Dynamic Fieldsによるデータ管理を図示

- [ ] 3.5 `docs/frontend.md`: API変更に伴うフロントエンド実装ガイド更新（該当する場合）

- [ ] 3.6 ドキュメントのコミット
  - コミットメッセージ: `[docs] パスポートデータモデルv2.0.0の仕様更新`

---

## Phase 4: 最終検証

- [ ] 4.1 `sui move build`: コンパイルエラーがないことを確認

- [ ] 4.2 `sui move test`: 全テストが通過することを確認
  - 期待: 29+15 = 44テストすべてPass

- [ ] 4.3 コードカバレッジの確認
  - 期待: 100%維持

- [ ] 4.4 要件定義書との整合性確認
  - `docs/contract.md`の仕様と実装の一致を確認

- [ ] 4.5 データスキーマとの整合性確認
  - `data_schema.md v2.0.0`との整合性を確認

- [ ] 4.6 OpenSpec提案との整合性確認
  - `openspec show refactor-passport-data-model`で仕様を確認
  - すべてのrequirementsが実装されていることを確認

---

## 📝 TDD実行時の注意事項

1. **Phase 1では実装コードを一切書かない**
   - テストのみを作成
   - コンパイルエラーは正常（構造体変更がないため）

2. **Phase 1のコミット前に失敗を確認**
   - テストが正しく失敗することを確認
   - 期待される失敗内容をドキュメント化

3. **Phase 2ではテストを変更しない**
   - テストをパスさせるために実装を修正
   - テストが間違っていても変更しない（テストは仕様）

4. **各Phaseで必ずコミット**
   - Phase 1: テストのみ
   - Phase 2: 実装のみ
   - Phase 3: ドキュメントのみ

5. **失敗したら実装を修正**
   - テストは正しい仕様を表現している
   - 実装が仕様に合っていない
