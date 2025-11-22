# CurePocket Data Schema (Blob-based)

**Version**: 2.0.0  
**Last Updated**: 2025-11-22  
**Status**: Draft

後方互換は考慮せず、パスポート配下の Dynamic Field に複数の Walrus Blob ID を種類別に保持する前提で記載しています。各データ種は独立した“箱”として保存し、更新・差し替えも種類単位で行います。

## 1. Blob 構成

- `basic_profile`: JSON 1本以上（例: 最新と過去の更新履歴）
- `medications`: CSV または TSV 1本以上（調剤明細ごとに分割してもよい）
- `conditions`: JSON 1本以上（最新スナップショット）

SBT（MedicalPassport）側では各種ごとに複数の Blob ID を Dynamic Field で管理する：

```
passport
  ├─ basic_profile : [blob_id_v1, blob_id_v2, ...]
  ├─ medications   : [blob_id_2024Q4, blob_id_2025Q1, ...]
  └─ conditions    : [blob_id_latest]
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

## 4. バリデーション指針

- 各 Blob は上記の最小フィールドを満たすこと。
- 日付は `YYYY-MM-DD`、コードは大文字で保存する。
- CSV/TSV はヘッダー行必須。フィールド数は3列固定。
- Dynamic Field に登録する際は、データ種キー（`basic_profile` / `medications` / `conditions`）を必ず指定する。

## 5. 更新ポリシー

- 後方互換を考慮しない。スキーマ変更時は新しい Blob を追加し、古い Blob は参照を外すだけで削除可。
- フロントエンドはデータ種ごとに最新 Blob を選択して復号・表示する。

