# CurePocket Data Schema (Metadata-based)

**Version**: 3.0.0
**Last Updated**: 2025-11-27
**Status**: Draft

v2.0.0からの変更点：SBTがデータblobを直接参照する代わりに、メタデータblobを介して間接参照する2層構造を採用。データblob自体の形式は変更なし。

## 1. アーキテクチャ概要

SBT（MedicalPassport）の各データ種は、**メタデータblob**を介してデータblobを参照する2層構造を採用。

```
┌─────────────────────────────────────────────────────────────────┐
│                    SBT DataEntry (オンチェーン)                  │
├─────────────────────────────────────────────────────────────────┤
│  EntryData {                                                    │
│    seal_id: vector<u8>,           // Seal暗号化ID               │
│    metadata_blob_id: String,      // メタデータblobへの参照      │
│    updated_at: u64,               // 最終更新時刻                │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                メタデータBlob (Walrus + Seal暗号化)              │
├─────────────────────────────────────────────────────────────────┤
│  同じseal_idで暗号化されたJSONファイル                          │
│  データblobへの参照一覧とパーティション情報を保持                │
└─────────────────────────────────────────────────────────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
         [Data Blob]     [Data Blob]     [Data Blob]
         同じseal_idで暗号化・復号可能
         （形式はv2.0.0と同一）
```

### 設計原則

1. **同一seal_id**: 同じデータ種のメタデータblobとデータblobは全て同一のseal_idで暗号化
2. **復号化最小化**: まずメタデータのみ復号し、必要なデータblobだけを選択的に復号
3. **パーティション管理**: メタデータがデータblobの分割単位（月、処方箋等）を管理
4. **データblob互換**: データblob自体の形式はv2.0.0と同一

## 2. データ種とパーティション戦略

| データ種 | パーティションキー | 説明 |
|----------|-------------------|------|
| `basic_profile` | なし | 単一blob、プロフィールは1件のみ |
| `medications` | `prescription_id` | 処方箋単位で分割 |
| `conditions` | なし | 単一blob、更新頻度低 |
| `lab_results` | `test_date` | 検査日単位で分割 |
| `imaging_meta` | `study_id` | 検査単位で分割 |
| `imaging_binary` | `study_id` | imaging_metaと対応 |
| `self_metrics` | `month_key` | 月単位で分割、記録頻度が高い |

## 3. メタデータスキーマ

### 3.1 共通ベース構造

全てのメタデータblobは以下の共通フィールドを持つ：

```typescript
interface BaseMetadata<TEntry> {
  schema_version: "3.0.0";
  data_type: DataType;
  updated_at: number;      // Unix timestamp (ms)
  entries: TEntry[];       // データblobへの参照一覧
}

interface BaseMetadataEntry {
  blob_id: string;         // Walrus blob ID
}
```

### 3.2 basic_profile メタデータ

パーティションなし（単一blob）。

```json
{
  "schema_version": "3.0.0",
  "data_type": "basic_profile",
  "updated_at": 1732700000000,
  "entries": [
    {
      "blob_id": "abc123..."
    }
  ]
}
```

### 3.3 medications メタデータ

処方箋単位でパーティション。

```json
{
  "schema_version": "3.0.0",
  "data_type": "medications",
  "updated_at": 1732700000000,
  "entries": [
    {
      "blob_id": "abc123...",
      "prescription_id": "rx-2025-001",
      "prescription_date": "2025-11-20",
      "clinic": "Tokyo General Hospital",
      "medication_count": 3
    },
    {
      "blob_id": "def456...",
      "prescription_id": "rx-2025-002",
      "prescription_date": "2025-11-27",
      "clinic": "Shibuya Clinic",
      "medication_count": 2
    }
  ]
}
```

### 3.4 conditions メタデータ

パーティションなし（単一blob）。

```json
{
  "schema_version": "3.0.0",
  "data_type": "conditions",
  "updated_at": 1732700000000,
  "entries": [
    {
      "blob_id": "abc123...",
      "condition_count": 5
    }
  ]
}
```

### 3.5 lab_results メタデータ

検査日単位でパーティション。

```json
{
  "schema_version": "3.0.0",
  "data_type": "lab_results",
  "updated_at": 1732700000000,
  "entries": [
    {
      "blob_id": "abc123...",
      "test_date": "2025-11-21",
      "facility": "Tokyo General Hospital",
      "test_count": 12
    },
    {
      "blob_id": "def456...",
      "test_date": "2025-08-15",
      "facility": "Shibuya Lab",
      "test_count": 8
    }
  ]
}
```

### 3.6 imaging_meta メタデータ

検査単位でパーティション。imaging_binaryへの参照を含む。

```json
{
  "schema_version": "3.0.0",
  "data_type": "imaging_meta",
  "updated_at": 1732700000000,
  "entries": [
    {
      "blob_id": "abc123...",
      "study_id": "study-2025-001",
      "study_date": "2025-11-21",
      "modality": "CT",
      "body_part": "Chest",
      "binary_blob_id": "bin789..."
    },
    {
      "blob_id": "def456...",
      "study_id": "study-2025-002",
      "study_date": "2025-10-15",
      "modality": "MRI",
      "body_part": "Brain",
      "binary_blob_id": "bin012..."
    }
  ]
}
```

### 3.7 self_metrics メタデータ

月単位でパーティション。

```json
{
  "schema_version": "3.0.0",
  "data_type": "self_metrics",
  "updated_at": 1732700000000,
  "entries": [
    {
      "blob_id": "abc123...",
      "month_key": "2025-11",
      "record_count": 45,
      "types": ["blood_pressure", "weight", "temperature"]
    },
    {
      "blob_id": "def456...",
      "month_key": "2025-10",
      "record_count": 62,
      "types": ["blood_pressure", "weight"]
    }
  ]
}
```

## 4. データblobスキーマ

データblobの形式はv2.0.0と同一。詳細は`data_schema_v2.md`を参照。

### 4.1 basic_profile (JSON)

v2.0.0と同一。

### 4.2 medications (CSV/TSV)

v2.0.0と同一。行単位で調剤レコードを保持。

### 4.3 conditions (JSON)

v2.0.0と同一。

### 4.4 lab_results (CSV)

v2.0.0と同一。1行=1検査項目。

### 4.5 imaging_meta (JSON)

v2.0.0と同一。study単位のJSONメタデータ。

### 4.6 imaging_binary (DICOM/ZIP)

v2.0.0と同一。

### 4.7 self_metrics (CSV)

v2.0.0と同一。日々のバイタル・計測データを1行1記録で保持。

## 5. 採用する標準規格

v2.0.0と同一。

| カテゴリ | 標準規格 | 目的 | 参照 |
|----------|----------|------|------|
| 薬剤 | ATC + RxNorm | 国を跨いだ薬効・成分の特定 | [RxNav API](https://rxnav.nlm.nih.gov/) |
| 疾患 | ICD-10 | 世界共通の疾病分類 | [WHO ICD-10](https://icd.who.int/browse10/2019/en) |
| 検査 | LOINC | 検査項目の世界共通識別子 | [LOINC.org](https://loinc.org/) |
| 画像 | DICOM Modality | 画像撮影装置の種類 | [DICOM Library](https://www.dicomlibrary.com/dicom/modality/) |
| 国名 | ISO 3166-1 alpha-2 | 2文字の国コード | - |

## 6. 処理フロー

### 6.1 データ保存フロー

```
1. 新データを暗号化・アップロード → newDataBlobId取得

2. 既存メタデータblobIdをSBTから取得
   ↓
3. メタデータblobを復号化 → 既存entries取得
   （初回の場合は空のメタデータを作成）
   ↓
4. 新entryを追加/更新（パーティションキーで判定）
   - 同じキーが存在: 該当entryのblob_idを更新
   - 新規キー: entriesに追加
   ↓
5. 更新されたメタデータを暗号化・アップロード → newMetadataBlobId取得
   ↓
6. SBTのmetadata_blob_idを更新（replace_data_entry）
```

### 6.2 データ読み込みフロー

```
1. SBTからmetadata_blob_idを取得
   ↓
2. メタデータblobを復号化 → entries配列取得
   ↓
3. 必要なentryを特定（パーティションキーで検索）
   - 全件: 全entryのblob_idを取得
   - 特定月/日: 該当entryのblob_idのみ取得
   ↓
4. 該当データblobを復号化
```

### 6.3 データ削除フロー

```
1. 既存メタデータblobIdをSBTから取得
   ↓
2. メタデータblobを復号化 → 既存entries取得
   ↓
3. 該当entryをentriesから削除
   ↓
4. 更新されたメタデータを暗号化・アップロード → newMetadataBlobId取得
   ↓
5. SBTのmetadata_blob_idを更新（replace_data_entry）

※ データblob自体はWalrus上に残るが、メタデータから参照されなくなる
```

## 7. バリデーション指針

- メタデータの`schema_version`は`"3.0.0"`必須
- データblobの形式はv2.0.0のバリデーションルールに従う
- パーティションキーは各データ種で必須（単一blobの場合を除く）
- メタデータの`entries`は空配列可（データなし状態）

## 8. 更新ポリシー

- メタデータblobは常に上書き（最新状態を反映）
- データblobはパーティション単位で上書き
- 古いデータblobはWalrus上に残るが、メタデータから参照されなくなる
- 削除操作はメタデータからentryを削除するのみ

## 9. v2.0.0からの移行

後方互換は考慮しない。v3.0.0では新規にメタデータblobを作成し、既存データblobは再利用可能。
