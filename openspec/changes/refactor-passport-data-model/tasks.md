# Implementation Tasks

## 1. データ構造の変更

- [ ] 1.1 `medical_passport.move`: MedicalPassport構造体から`walrus_blob_id`フィールドを削除
- [ ] 1.2 `medical_passport.move`: MedicalPassport構造体に`analytics_opt_in: bool`フィールドを追加
- [ ] 1.3 `medical_passport.move`: PassportMigrationEventから`walrus_blob_id`を削除、`analytics_opt_in`を追加
- [ ] 1.4 `medical_passport.move`: エラーコード`E_EMPTY_WALRUS_BLOB_ID`を削除
- [ ] 1.5 `medical_passport.move`: データ種別の定数を追加（`DATA_TYPE_MEDICATION`, `DATA_TYPE_LAB_RESULTS`, etc.）

## 2. 内部関数の変更

- [ ] 2.1 `medical_passport.move`: `create_passport_internal()`のシグネチャ変更（`walrus_blob_id`削除、`analytics_opt_in`追加）
- [ ] 2.2 `medical_passport.move`: `create_passport_internal()`から`walrus_blob_id`のバリデーションを削除
- [ ] 2.3 `medical_passport.move`: `get_walrus_blob_id()`関数を削除
- [ ] 2.4 `medical_passport.move`: `get_passport_data()`の戻り値を変更（`analytics_opt_in`を含む）
- [ ] 2.5 `medical_passport.move`: `emit_migration_event()`のシグネチャ変更（`analytics_opt_in`追加）

## 3. Dynamic Fields管理関数の追加

- [ ] 3.1 `medical_passport.move`: `add_blob_id_internal(passport: &mut MedicalPassport, data_type: String, blob_id: String)`を実装
- [ ] 3.2 `medical_passport.move`: `get_blob_ids_internal(passport: &MedicalPassport, data_type: String): Option<vector<String>>`を実装
- [ ] 3.3 `medical_passport.move`: `has_blob_ids_internal(passport: &MedicalPassport, data_type: String): bool`を実装
- [ ] 3.4 `medical_passport.move`: `remove_blob_id_internal(passport: &mut MedicalPassport, data_type: String, blob_id: String)`を実装（オプション）
- [ ] 3.5 `medical_passport.move`: `get_analytics_opt_in(passport: &MedicalPassport): bool`を実装
- [ ] 3.6 `medical_passport.move`: `update_analytics_opt_in_internal(passport: &mut MedicalPassport, opt_in: bool)`を実装

## 4. Public API（accessor.move）の変更

- [ ] 4.1 `accessor.move`: `mint_medical_passport()`のシグネチャ変更（`walrus_blob_id`削除、`analytics_opt_in`追加）
- [ ] 4.2 `accessor.move`: `get_walrus_blob_id()`を削除
- [ ] 4.3 `accessor.move`: `add_blob_id(passport: &mut MedicalPassport, data_type: String, blob_id: String)`を追加
- [ ] 4.4 `accessor.move`: `get_blob_ids(passport: &MedicalPassport, data_type: String): vector<String>`を追加
- [ ] 4.5 `accessor.move`: `get_analytics_opt_in(passport: &MedicalPassport): bool`を追加
- [ ] 4.6 `accessor.move`: `update_analytics_opt_in(passport: &mut MedicalPassport, opt_in: bool)`を追加（entry fun）
- [ ] 4.7 `accessor.move`: `get_all_fields()`の戻り値を変更（`analytics_opt_in`を含む）

## 5. Admin API（admin.move）の変更

- [ ] 5.1 `admin.move`: `admin_mint_medical_passport()`のシグネチャ変更（`walrus_blob_id`削除、`analytics_opt_in`追加）
- [ ] 5.2 `admin.move`: `migrate_passport()`の実装を変更（`analytics_opt_in`の継承）
- [ ] 5.3 `admin.move`: 移行イベントの発行を変更（`analytics_opt_in`を含む）

## 6. テストの書き直し

- [ ] 6.1 `medical_passport_tests.move`: `test_passport_creation()`を修正（`analytics_opt_in`対応）
- [ ] 6.2 `medical_passport_tests.move`: `test_mint_passport()`を修正（`walrus_blob_id`削除）
- [ ] 6.3 `medical_passport_tests.move`: `test_empty_*`テストを修正（`E_EMPTY_WALRUS_BLOB_ID`削除）
- [ ] 6.4 `medical_passport_tests.move`: Dynamic Fields管理のテストを追加（10+新規テスト）
- [ ] 6.5 `medical_passport_tests.move`: `analytics_opt_in`のテストを追加（5新規テスト）
- [ ] 6.6 `medical_passport_tests.move`: 移行テストを修正（`analytics_opt_in`の継承確認）
- [ ] 6.7 `seal_accessor_tests.move`: mint呼び出しを修正（新しいシグネチャ対応）
- [ ] 6.8 `consent_token_tests.move`: mint呼び出しを修正（新しいシグネチャ対応）
- [ ] 6.9 全テストの実行と確認（`sui move test`）

## 7. ドキュメント更新

- [ ] 7.1 `docs/contract.md`: MedicalPassport構造体の仕様を更新
- [ ] 7.2 `docs/contract.md`: API仕様の更新（mint、getter、Dynamic Fields）
- [ ] 7.3 `docs/contract.md`: 変更履歴にv2.0.0を追加
- [ ] 7.4 `README.md`: アーキテクチャ図の更新（Dynamic Fields言及）
- [ ] 7.5 `docs/frontend.md`: API変更に伴うフロントエンド実装ガイド更新（該当する場合）

## 8. 最終検証

- [ ] 8.1 `sui move build`: コンパイルエラーがないことを確認
- [ ] 8.2 `sui move test`: 全テストが通過することを確認
- [ ] 8.3 コードカバレッジの確認（100%維持）
- [ ] 8.4 要件定義書との整合性確認
- [ ] 8.5 データスキーマとの整合性確認
