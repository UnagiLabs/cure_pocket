# CurePocket Data Schema Specification

**Version**: 1.0.0
**Last Updated**: 2025-11-19
**Status**: Draft (MVP)

## 1. 概要

CurePocketにおいて、Walrusに保存される**暗号化された医療データ**のスキーマ定義です。
本データは、Sealによって管理される暗号鍵で暗号化された状態で保存されます。復号時はこのJSON構造として展開され、フロントエンドで表示・編集されます。

### 設計思想

1.  **Global & Local**: 国際標準コード（Global）と現地語名称（Local）を併記し、緊急時の国際互換性と普段の使いやすさを両立する。
2.  **Analytics Ready**: `codes`（標準コード）や `profile`（属性）を分離しやすい構造にし、将来的な匿名統計データ抽出（Analytics Layer）を容易にする。
3.  **FHIR-like**: 完全なFHIRは複雑すぎるため、MVP向けに軽量化した構造を採用するが、コード体系は国際標準に準拠する。

---

## 2. 採用する標準規格

| カテゴリ | 標準規格 (Global Code) | 目的 | API/参照元 |
| :--- | :--- | :--- | :--- |
| **薬剤** | **ATC** (分類) + **RxNorm** (成分) | 国を跨いだ薬効・成分の特定 | [RxNav API](https://rxnav.nlm.nih.gov/) |
| **疾患** | **ICD-10** | 世界共通の疾病分類 | [WHO ICD-10](https://icd.who.int/browse10/2019/en) |
| **検査** | **LOINC** | 検査項目の世界共通識別子 | [LOINC.org](https://loinc.org/) |
| **画像** | **DICOM Modality** | 画像撮影装置の種類 (CT, MR等) | [DICOM Library](https://www.dicomlibrary.com/dicom/modality/) |
| **国名** | **ISO 3166-1 alpha-2** | 2文字の国コード (JP, US等) | - |

---

## 3. JSON データ例 (Example)

```json
{
  "meta": {
    "schema_version": "1.0.0",
    "updated_at": 1732000000000,
    "generator": "CurePocket_Web_v1"
  },
  "profile": {
    "birth_year": 1990,
    "gender": "male",
    "country": "JP",
    "blood_type": "A+",
    "biometrics": {
      "height_cm": 175.0,
      "weight_kg": 68.0,
      "bmi": 22.2
    }
  },
  "medications": [
    {
      "id": "uuid-v4-sample-01",
      "status": "active",
      "codes": {
        "atc": "A10BA02",
        "rxnorm": "860975",
        "local_code": "12345"
      },
      "name": {
        "en": "Metformin 500mg Tablet",
        "local": "メトグルコ錠 500mg"
      },
      "dosage": "1 tablet twice daily",
      "start_date": "2024-01-01"
    }
  ],
  "conditions": [
    {
      "id": "uuid-v4-sample-02",
      "status": "active",
      "codes": {
        "icd10": "E11.9"
      },
      "name": {
        "en": "Type 2 diabetes mellitus",
        "local": "2型糖尿病"
      },
      "onset_date": "2023-05-20",
      "note": "Dietary management only"
    }
  ],
  "lab_results": [
    {
      "id": "uuid-v4-sample-03",
      "date": "2024-11-15",
      "category": "biochemistry",
      "items": [
        {
          "codes": { "loinc": "4548-4" },
          "name": { "en": "HbA1c", "local": "ヘモグロビンA1c" },
          "value": 6.5,
          "unit": "%",
          "range_high": 6.0,
          "flag": "H"
        }
      ]
    }
  ],
  "imaging": [
    {
      "id": "uuid-v4-sample-04",
      "date": "2024-10-10",
      "modality": "CT",
      "body_site": { "en": "Chest", "local": "胸部" },
      "summary": {
        "en": "No significant abnormalities.",
        "local": "特記すべき異常所見なし。"
      },
      "abnormal_flag": false
    }
  ],
  "allergies": [
    {
      "id": "uuid-v4-sample-05",
      "substance": {
        "code_type": "rxnorm",
        "code": "1191",
        "name": "Aspirin"
      },
      "severity": "severe",
      "reaction": "Anaphylaxis"
    }
  ]
}
```

---

## 4. TypeScript 型定義 (Interfaces)

フロントエンド開発に使用する型定義です。

### 4.1 Root & Metadata

```typescript
export interface HealthData {
  meta: MetaData;
  profile: UserProfile;
  medications: Medication[];
  conditions: Condition[];
  lab_results: LabResult[];
  imaging: ImagingStudy[];
  allergies: Allergy[];
}

export interface MetaData {
  schema_version: string; // e.g., "1.0.0"
  updated_at: number;     // Unix Timestamp (ms)
  generator: string;      // e.g., "CurePocket_Web_v1"
}

// 多言語対応用文字列型
export interface LocalizedString {
  en: string;    // 英語（Emergency Card表示用）
  local: string; // 母国語（普段の閲覧用）
}
```

### 4.2 User Profile

```typescript
export interface UserProfile {
  birth_year: number;      // 年齢計算用（プライバシー保護のため年は保持しない）
  gender: 'male' | 'female' | 'other';
  country: string;         // ISO 3166-1 alpha-2 (e.g., "JP", "US")
  blood_type?: string;     // e.g., "A+", "O-", "Unknown"
  biometrics?: {
    height_cm: number;
    weight_kg: number;
    bmi: number;           // height/weightから自動計算して保存
  };
}
```

### 4.3 Medications (薬剤)

```typescript
export interface Medication {
  id: string;              // UUID v4
  status: 'active' | 'completed' | 'stopped';
  codes: {
    atc?: string;          // WHO ATC Code
    rxnorm?: string;       // RxNorm CUI (Global standard for ingredients)
    local_code?: string;   // YJ Code (Japan) or NDC (USA)
  };
  name: LocalizedString;   // 薬の商品名または一般名
  dosage: string;          // 服用量・頻度 (e.g., "1 tablet twice daily")
  start_date: string;      // YYYY-MM-DD
  end_date?: string;       // YYYY-MM-DD
  prescriber?: string;     // 処方医または病院名 (Optional)
}
```

### 4.4 Conditions (疾患・病歴)

```typescript
export interface Condition {
  id: string;
  status: 'active' | 'remission' | 'resolved';
  codes: {
    icd10?: string;        // ICD-10 Code (e.g., "E11.9")
  };
  name: LocalizedString;   // 病名
  onset_date?: string;     // YYYY-MM-DD
  note?: string;           // 自由記述メモ
}
```

### 4.5 Lab Results (検査結果)

```typescript
export interface LabResult {
  id: string;
  date: string;            // 検査日 YYYY-MM-DD
  category: 'biochemistry' | 'hematology' | 'immunology' | 'other';
  items: LabItem[];        // 1回の検査で複数の項目があるため配列
}

export interface LabItem {
  codes: {
    loinc?: string;        // LOINC Code (e.g., "4548-4" for HbA1c)
  };
  name: LocalizedString;   // 項目名
  value: number;           // 検査値
  unit: string;            // 単位 (e.g., "%", "mg/dL")
  range_low?: number;      // 基準値下限
  range_high?: number;     // 基準値上限
  flag?: 'H' | 'L' | 'N';  // H=High, L=Low, N=Normal/Null
}
```

### 4.6 Imaging (画像検査)

```typescript
export interface ImagingStudy {
  id: string;
  date: string;            // 撮影日 YYYY-MM-DD
  modality: 'CT' | 'MR' | 'US' | 'XR' | 'XA' | 'OT'; // DICOM Modality Codes
  body_site: LocalizedString; // 部位 (e.g., "Chest", "Head")
  summary: LocalizedString;   // 放射線科医のレポート要約
  abnormal_flag: boolean;     // 異常所見の有無
  dicom_blob_id?: string;     // 将来用: 実画像データ(DICOM)のWalrus Blob ID
}
```

### 4.7 Allergies (アレルギー)

```typescript
export interface Allergy {
  id: string;
  substance: {
    code_type?: 'rxnorm' | 'atc' | 'food' | 'other';
    code?: string;
    name: string;
  };
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string;       // 反応内容 (e.g., "Rash", "Anaphylaxis")
}
```

---

## 5. バリデーション & 制約

MVP実装時、フォーム入力等で以下のバリデーションを推奨します。

1.  **ID生成**: 新規追加時は必ず `crypto.randomUUID()` 等でユニークIDを付与すること。
2.  **必須項目**:
    *   `meta` 情報
    *   各エントリーの `name.local`（少なくとも現地語での入力は必須）
    *   日付 (`YYYY-MM-DD` 形式)
3.  **コード入力**:
    *   MVPではユーザーがコードを手入力するのは困難なため、コードフィールドは `Optional` 扱いとするか、プリセット（よくある病気リスト等）から選択された場合のみ自動入力する形とする。
4.  **データサイズ**:
    *   Walrusへの保存単位は1つのBlobとなるため、画像本体（DICOM）はここには含めず、別途保存して `dicom_blob_id` で参照する方式をとる。
    *   このJSON自体は数KB〜数十KB程度に収まる想定。

---

## 6. Analytics Data Schema (Stats JSON)

クライアントサイドで匿名化・集計した統計データの送信用スキーマ。
個票データは送信せず、統計値のみをサーバー/オンチェーンに渡す。

### 6.1 匿名化ルール

- 年齢: 10歳刻みのバンド（例: `"30-39"`）
- 地域: 国コードのみ（ISO 3166-1 alpha-2）
- 薬剤: ATCコード上4桁（Level 3）のみ
- 疾患: ICD-10コード上3桁（Category）のみ
- 検査: 具体値を含めない。LOINCコードと異常フラグ（`H`/`L`/`N`）のみ

### 6.2 JSONスキーマ例

```json
{
  "meta": { "schema_version": "1.0.0", "report_period": "YYYY-MM" },
  "demographics": { "country": "JP", "age_band": "30-39", "sex": "M" },
  "medication_stats": [{ "atc_l3_code": "A10B", "active_count": 1 }],
  "condition_stats": [{ "icd10_l3_code": "E11", "status": "active" }],
  "lab_stats_summary": [{ "loinc_code": "4548-4", "result_flag": "H" }]
}
```

### 6.3 生成・送信の前提

- 端末内でWalrus復号 → 匿名化 → Stats JSON生成。
- 個票や再同定に使える識別子は送信しない。
- Stats JSONは後続の報酬請求データとは分離して送信する。
