# CurePocket Data Schema (Blob-based)

**Version**: 2.0.0
**Last Updated**: 2025-11-22
**Status**: Draft

後方互換は考慮せず、パスポート配下の Dynamic Field に複数の Walrus Blob ID を種類別に保持する前提で記載しています。各データ種は独立した“箱”として保存し、更新・差し替えも種類単位で行います。

## 1. Blob 構成

- `basic_profile`: JSON 1本以上（例: 最新と過去の更新履歴）
- `medications`: CSV または TSV 1本以上（調剤明細ごとに分割してもよい）
- `conditions`: JSON 1本以上（最新スナップショット）
- `lab_results`: CSV（カンマ区切り固定）1本以上（採血1回=1レコード行）
- `imaging_meta`: JSON 1本以上（1スタディ=1Blob想定）
- `imaging_binary`: DICOMまたはZIP（シリーズやインスタンスの実体）複数
- `self_metrics`: CSV（カンマ区切り固定）1本以上（日常記録: 血圧・体重など）

SBT（MedicalPassport）側では各種ごとに複数の Blob ID を Dynamic Field で管理する：

```
passport
  ├─ basic_profile : [blob_id_v1, blob_id_v2, ...]
  ├─ medications   : [blob_id_2024Q4, blob_id_2025Q1, ...]
  ├─ conditions    : [blob_id_latest]
  └─ lab_results   : [blob_id_2025-11-21, blob_id_2025-08-01, ...]
  ├─ imaging_meta  : [blob_id_meta_study1, blob_id_meta_study2, ...]
  ├─ imaging_binary: [blob_id_dicom001, blob_id_zip_seriesA, ...]
  └─ self_metrics  : [blob_id_metrics_2025-11, blob_id_metrics_2025-10, ...]
```

## 2. 採用する標準規格

| カテゴリ | 標準規格 (Global Code) | 目的 | API/参照元 |
| :--- | :--- | :--- | :--- |
| **薬剤** | **ATC** (分類) + **RxNorm** (成分) | 国を跨いだ薬効・成分の特定 | [RxNav API](https://rxnav.nlm.nih.gov/) |
| **疾患** | **ICD-10** | 世界共通の疾病分類 | [WHO ICD-10](https://icd.who.int/browse10/2019/en) |
| **検査** | **LOINC** | 検査項目の世界共通識別子 | [LOINC.org](https://loinc.org/) |
| **画像** | **DICOM Modality** | 画像撮影装置の種類 (CT, MR等) | [DICOM Library](https://www.dicomlibrary.com/dicom/modality/) |
| **国名** | **ISO 3166-1 alpha-2** | 2文字の国コード (JP, US等) | - |

## 3. スキーマ定義

### 3.1 基本情報（basic_profile, JSON）

必須フィールド:
- `birth_date`: string (YYYY-MM-DD)
- `nationality`: string (ISO 3166-1 alpha-2)
- `gender`: string (例: "male" | "female" | "other")
- `allergies`: string[] (自由記述または物質名)
- `blood_type`: string (例: "A+", "O-", "Unknown")

例:
```json
{
  "birth_date": "1990-04-12",
  "nationality": "JP",
  "gender": "female",
  "allergies": ["Penicillin", "Peanuts"],
  "blood_type": "A+"
}
```

### 3.2 薬剤情報（medications, CSV/TSV）

行単位で調剤レコードを保持。文字コードは UTF-8。区切りは CSV または TSV いずれでも可（拡張子で判別）。

列定義（順序固定）:
1. `dispensed_on` : 調剤年月日 (YYYY-MM-DD)
2. `atc_code`    : ATC 分類コード (例: A10BA02)
3. `rxnorm_code` : RxNorm 成分コード (例: 860975)

CSV 例:
```
dispensed_on,atc_code,rxnorm_code
2025-11-20,A10BA02,860975
2025-11-21,C09AA05,198211
```

TSV 例:
```
dispensed_on\tatc_code\trxnorm_code
2025-11-20\tA10BA02\t860975
```

### 3.3 疾病情報（conditions, JSON）

必須フィールド:
- `current_conditions`: string[]  — 現在罹患している疾病の ICD-10 コードの配列
- `past_conditions`: string[]     — 既往歴としての ICD-10 コードの配列

例:
```json
{
  "current_conditions": ["E11.9", "I10"],
  "past_conditions": ["J45.9"]
}
```

### 3.4 検査値（lab_results, CSV）

1行=1検査項目。文字コードは UTF-8、区切りはカンマ固定（TSVは使わない）。ヘッダー必須、列順固定。

列定義:
1. `collected_on` : 採取日 (YYYY-MM-DD)
2. `loinc_code`   : LOINC コード (例: 4548-4)
3. `value`        : 数値 (小数可)
4. `unit`         : 単位（UCUM推奨, 例: %, mg/dL）
5. `ref_low`      : 基準下限 (任意, 空でも可)
6. `ref_high`     : 基準上限 (任意, 空でも可)
7. `flag`         : H / L / N / U （High/Low/Normal/Unknown）
8. `notes`        : 任意メモ（カンマを含む場合はダブルクオートでエスケープ）

CSV例:
```
collected_on,loinc_code,value,unit,ref_low,ref_high,flag,notes
2025-11-21,4548-4,6.5,%,4.7,6.2,H,"Post-prandial"
2025-11-21,718-7,13.8,g/dL,13.5,17.5,N,
```

### 3.5 画像データ（imaging_meta + imaging_binary）

**構成方針**
- メタデータは study 単位の JSON（`imaging_meta`）。
- 実体は DICOM 単体または ZIP でシリーズ/インスタンスを束ねる（`imaging_binary`）。
- いずれも同じデータ種キー（例: `imaging`）で Seal 制御しやすいよう分割保存。

**メタデータJSON（1スタディ=1Blob）必須/推奨フィールド**
```json
{
  "study_uid": "1.2.392.200036.9123.100.12.1137834.20251121.1",   // 必須
  "modality": "CT",                                              // 必須 (DICOM Modality)
  "body_site": "Chest",                                         // 必須（英語/ローカライズ文字列でも可）
  "performed_at": "2025-11-21T09:15:00Z",                       // 任意: ISO8601
  "facility": "Tokyo General Hospital",                         // 任意
  "series": [                                                     // 1スタディ内のシリーズ一覧
    {
      "series_uid": "1.2.392.200036.9123.100.12.1137834.20251121.1.2", // 必須
      "description": "Chest w/ contrast",                       // 任意
      "modality": "CT",                                         // 必須
      "instance_blobs": [                                         // DICOMファイル単位の対応
        {
          "sop_instance_uid": "1.2.392.200036.9123.100.12.1137834.20251121.1.2.1", // 推奨
          "dicom_blob_id": "BLOB_DICOM_001",                     // 必須: 実体Blob ID
          "frames": 1,                                            // 任意: マルチフレーム枚数
          "sop_class": "1.2.840.10008.5.1.4.1.1.2"              // 任意: SOP Class UID
        }
      ],
      "zip_blob_id": "BLOB_ZIP_SERIES_02"                        // 任意: シリーズをZIP化したBlob
    }
  ],
  "report": {
    "summary": "No significant abnormalities.",                  // 任意: 簡易レポート
    "language": "en"                                            // 任意
  },
  "schema_version": "2.0.0"                                     // 必須
}
```

**運用上の注意**
- DICOM/ZIP/PNG いずれも UTF-8 でファイル名を付ける場合はASCIIに揃えると安全。
- `imaging_binary` には複数Blobを登録可能。シリーズ単位ZIPと個別DICOMを併存させてもよい。

### 3.6 日常記録データ（self_metrics, CSV）

日々のバイタル・計測データを1行1記録で保持。カンマ区切り固定、ヘッダー必須。

列定義（順序固定、不要項目は空欄可）:
1. `recorded_at` : 測定日時 (ISO8601; もしくは YYYY-MM-DDTHH:MM)
2. `metric`      : 計測種別（例: "blood_pressure", "weight", "pulse", "temperature"）
3. `systolic`    : 収縮期血圧 mmHg（血圧以外は空）
4. `diastolic`   : 拡張期血圧 mmHg（血圧以外は空）
5. `pulse`       : 脈拍 bpm（任意）
6. `value`       : 数値（体重・体温などをここに格納）
7. `unit`        : 単位（例: "kg", "°C", "bpm"）
8. `notes`       : 任意メモ（カンマを含む場合はダブルクオート）

CSV例:
```
recorded_at,metric,systolic,diastolic,pulse,value,unit,notes
2025-11-22T07:30:00Z,blood_pressure,128,82,72,,,"morning"
2025-11-22T07:31:00Z,weight,,,,62.4,kg,
2025-11-22T07:32:00Z,temperature,,,,36.7,°C,
```

## 4. バリデーション指針

- 日付は `YYYY-MM-DD`、コードは大文字で保存する。
- medications: CSV/TSV はヘッダー行必須・3列固定。
- lab_results: CSV はヘッダー行必須・8列固定（不足/超過列はNG）。
- 各 Blob は上記の最小フィールドを満たすこと。
- 日付は `YYYY-MM-DD`、コードは大文字で保存する。
- medications: CSV/TSV はヘッダー行必須・3列固定。
- lab_results: CSV はヘッダー行必須・8列固定（不足/超過列はNG）。
- imaging_meta: 必須フィールド `study_uid` / `modality` / `body_site` / `series[*].series_uid` / `series[*].modality` / `series[*].instance_blobs[*].dicom_blob_id` / `schema_version` を満たすこと。
- imaging_binary: 中身が拡張子に適合すること（DICOM/ZIP）。
- self_metrics: CSV はヘッダー行必須・8列固定（不足/超過列はNG）。
- Dynamic Field に登録する際は、データ種キー（`basic_profile` / `medications` / `conditions` / `lab_results` / `imaging_meta` / `imaging_binary` / `self_metrics`）を必ず指定する。

## 5. 更新ポリシー

- 後方互換を考慮しない。スキーマ変更時は新しい Blob を追加し、古い Blob は参照を外すだけで削除可。
- フロントエンドはデータ種ごとに最新 Blob を選択して復号・表示する。
