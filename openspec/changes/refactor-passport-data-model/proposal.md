# Change: Refactor Medical Passport Data Model to Dynamic Fields Architecture

## Why

現在の実装では、`MedicalPassport`構造体が単一の`walrus_blob_id`フィールドを持ち、すべての医療データを1つのBlobで管理しています。しかし、要件定義書（docs/contract.md）では、以下の設計が求められています：

1. **データ種別ごとの柔軟な管理**: 薬剤（medication）、検査値（lab_results）、疾病（conditions）、基本情報（basic_profile）を個別に管理
2. **複数Blob対応**: 各データ種に対して複数のBlob IDを履歴として保持
3. **統計データ提供フラグ**: `analytics_opt_in`フィールドによる明示的な同意管理
4. **データスキーマ準拠**: data_schema.mdで定義された種別ごとのBlob構成

この設計により、ユーザーは医療データを種別ごとに追加・更新でき、Sealアクセス制御もデータ種単位で実行可能になります。

## What Changes

### **BREAKING**: MedicalPassport構造体の変更

- **削除**: `walrus_blob_id: String`フィールド
- **追加**: `analytics_opt_in: bool`フィールド（統計データ提供可否）
- **変更**: 医療データ参照をDynamic Fieldsで管理（パスポート本体は最小限の情報のみ保持）

### **BREAKING**: mint APIシグネチャ変更

**現在**:
```move
entry fun mint_medical_passport(
    registry: &mut PassportRegistry,
    walrus_blob_id: String,
    seal_id: String,
    country_code: String,
    ctx: &mut tx_context::TxContext
)
```

**変更後**:
```move
entry fun mint_medical_passport(
    registry: &mut PassportRegistry,
    seal_id: String,
    country_code: String,
    analytics_opt_in: bool,
    ctx: &mut tx_context::TxContext
)
```

### 新規API追加（Dynamic Fields管理）

- `add_blob_id(passport: &mut MedicalPassport, data_type: String, blob_id: String)` - Blob ID追加
- `get_blob_ids(passport: &MedicalPassport, data_type: String): vector<String>` - データ種別のBlob IDリスト取得
- `update_analytics_opt_in(passport: &mut MedicalPassport, opt_in: bool)` - 統計提供フラグ更新
- `get_analytics_opt_in(passport: &MedicalPassport): bool` - 統計提供フラグ取得

### API削除

- **削除**: `get_walrus_blob_id()` - Dynamic Fields管理に置き換え

### データマイグレーション

- 既存デプロイがない場合: 直接実装
- 既存デプロイがある場合: 管理者による移行機能が必要（今回は新規実装のため不要）

## Impact

### 影響を受ける仕様

- **specs/medical-passport-core**: MedicalPassport構造体、mint API、getter API
- **specs/data-management**: 新規（Dynamic Fields管理）

### 影響を受けるコード

- `contract/sources/medical_passport.move`: 構造体定義、内部関数
- `contract/sources/accessor.move`: mint関数、getter関数
- `contract/sources/admin.move`: 管理者mint、移行機能
- `contract/tests/medical_passport_tests.move`: 全テストの書き直し
- `contract/tests/seal_accessor_tests.move`: mint呼び出し部分の修正

### フロントエンド影響

- `frontend/`: mint時のパラメータ変更
- Blob ID取得APIの変更
- データ種別ごとのBlob管理ロジック追加

### 互換性

- **下位互換性**: ❌ なし（破壊的変更）
- **データマイグレーション**: 新規実装のため不要
- **テスト**: 全面的な書き直しが必要
