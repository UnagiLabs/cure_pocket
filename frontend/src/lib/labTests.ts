/**
 * 臨床検査データセット
 * MVP用・最小限の臨床検査項目を定義
 * 対象：成人（18歳以上）、非妊娠
 */

export type LabTestCategory =
    | 'CBC'
    | 'electrolyte'
    | 'renal'
    | 'glucose'
    | 'liver'
    | 'inflammation'
    | 'endocrine'
    | 'urine';

export interface LabTestDefinition {
    id: string; // 検査項目ID（例：WBC, HGB）
    category: LabTestCategory; // カテゴリ
    nameEn: string; // 英語名
    nameJa: string; // 日本語名
    unit: string; // 単位
    referenceRange: string; // 基準範囲（表示用）
    referenceRangeMin?: number; // 基準範囲の最小値（計算用）
    referenceRangeMax?: number; // 基準範囲の最大値（計算用）
    notes?: string; // メモ
}

/**
 * 臨床検査項目の定義
 */
export const labTestDefinitions: LabTestDefinition[] = [
    // CBC（血算）
    {
        id: 'WBC',
        category: 'CBC',
        nameEn: 'White blood cell count',
        nameJa: '白血球数',
        unit: '10^9/L',
        referenceRange: '4.0 – 10.0',
        referenceRangeMin: 4.0,
        referenceRangeMax: 10.0,
    },
    {
        id: 'HGB',
        category: 'CBC',
        nameEn: 'Hemoglobin',
        nameJa: 'ヘモグロビン',
        unit: 'g/dL',
        referenceRange: '男 13.0–17.0／女 12.0–15.5',
        referenceRangeMin: 12.0,
        referenceRangeMax: 17.0,
    },
    {
        id: 'PLT',
        category: 'CBC',
        nameEn: 'Platelet count',
        nameJa: '血小板数',
        unit: '10^9/L',
        referenceRange: '150 – 400',
        referenceRangeMin: 150,
        referenceRangeMax: 400,
    },
    // 電解質
    {
        id: 'NA',
        category: 'electrolyte',
        nameEn: 'Sodium',
        nameJa: 'ナトリウム',
        unit: 'mmol/L',
        referenceRange: '135 – 145',
        referenceRangeMin: 135,
        referenceRangeMax: 145,
    },
    {
        id: 'K',
        category: 'electrolyte',
        nameEn: 'Potassium',
        nameJa: 'カリウム',
        unit: 'mmol/L',
        referenceRange: '3.5 – 5.0',
        referenceRangeMin: 3.5,
        referenceRangeMax: 5.0,
    },
    {
        id: 'CL',
        category: 'electrolyte',
        nameEn: 'Chloride',
        nameJa: 'クロール',
        unit: 'mmol/L',
        referenceRange: '96 – 106',
        referenceRangeMin: 96,
        referenceRangeMax: 106,
    },
    {
        id: 'HCO3',
        category: 'electrolyte',
        nameEn: 'Bicarbonate (CO₂)',
        nameJa: '重炭酸',
        unit: 'mmol/L',
        referenceRange: '22 – 29',
        referenceRangeMin: 22,
        referenceRangeMax: 29,
        notes: '酸塩基評価など',
    },
    // 腎機能
    {
        id: 'BUN',
        category: 'renal',
        nameEn: 'Blood Urea Nitrogen',
        nameJa: '尿素窒素',
        unit: 'mg/dL',
        referenceRange: '7 – 20',
        referenceRangeMin: 7,
        referenceRangeMax: 20,
    },
    {
        id: 'CRE',
        category: 'renal',
        nameEn: 'Creatinine',
        nameJa: 'クレアチニン',
        unit: 'mg/dL',
        referenceRange: '男 0.7–1.3／女 0.6–1.1',
        referenceRangeMin: 0.6,
        referenceRangeMax: 1.3,
    },
    // 糖代謝
    {
        id: 'GLU_F',
        category: 'glucose',
        nameEn: 'Glucose (fasting)',
        nameJa: '空腹時血糖',
        unit: 'mg/dL',
        referenceRange: '70 – 99（正常）',
        referenceRangeMin: 70,
        referenceRangeMax: 99,
    },
    {
        id: 'HBA1C',
        category: 'glucose',
        nameEn: 'Hemoglobin A1c',
        nameJa: 'HbA1c',
        unit: '%',
        referenceRange: '4.0 – 5.6（正常）',
        referenceRangeMin: 4.0,
        referenceRangeMax: 5.6,
        notes: '5.7–6.4 境界、6.5以上で糖尿病診断基準の1つ',
    },
    // 肝機能
    {
        id: 'AST',
        category: 'liver',
        nameEn: 'AST',
        nameJa: 'アスパラギン酸アミノトランスフェラーゼ',
        unit: 'U/L',
        referenceRange: '10 – 40',
        referenceRangeMin: 10,
        referenceRangeMax: 40,
    },
    {
        id: 'ALT',
        category: 'liver',
        nameEn: 'ALT',
        nameJa: 'アラニンアミノトランスフェラーゼ',
        unit: 'U/L',
        referenceRange: '7 – 40',
        referenceRangeMin: 7,
        referenceRangeMax: 40,
    },
    {
        id: 'ALP',
        category: 'liver',
        nameEn: 'Alkaline phosphatase',
        nameJa: 'ALP',
        unit: 'U/L',
        referenceRange: '30 – 130',
        referenceRangeMin: 30,
        referenceRangeMax: 130,
    },
    {
        id: 'TBIL',
        category: 'liver',
        nameEn: 'Total bilirubin',
        nameJa: '総ビリルビン',
        unit: 'mg/dL',
        referenceRange: '0.2 – 1.2',
        referenceRangeMin: 0.2,
        referenceRangeMax: 1.2,
    },
    {
        id: 'ALB',
        category: 'liver',
        nameEn: 'Albumin',
        nameJa: 'アルブミン',
        unit: 'g/dL',
        referenceRange: '3.5 – 5.0',
        referenceRangeMin: 3.5,
        referenceRangeMax: 5.0,
    },
    // 炎症
    {
        id: 'CRP',
        category: 'inflammation',
        nameEn: 'C-reactive protein',
        nameJa: 'CRP',
        unit: 'mg/L',
        referenceRange: '<3',
        referenceRangeMin: 0,
        referenceRangeMax: 3,
        notes: '心血管リスク分層では <1 低, 1–3 中, >3 高 など',
    },
    // 内分泌
    {
        id: 'TSH',
        category: 'endocrine',
        nameEn: 'Thyroid-stimulating hormone',
        nameJa: '甲状腺刺激ホルモン',
        unit: 'mIU/L',
        referenceRange: '0.4 – 4.0',
        referenceRangeMin: 0.4,
        referenceRangeMax: 4.0,
    },
    // 尿定性
    {
        id: 'U_PRO',
        category: 'urine',
        nameEn: 'Urine protein',
        nameJa: '尿タンパク',
        unit: '（定性）',
        referenceRange: 'Negative（陰性）',
        notes: 'ごくわずか（<10 mg/dL程度）までは生理的',
    },
    {
        id: 'U_GLU',
        category: 'urine',
        nameEn: 'Urine glucose',
        nameJa: '尿糖',
        unit: '（定性）',
        referenceRange: 'Negative（陰性）',
        notes: '陽性なら高血糖や腎性糖尿など',
    },
    {
        id: 'U_BLD',
        category: 'urine',
        nameEn: 'Urine occult blood',
        nameJa: '尿潜血',
        unit: '（定性）',
        referenceRange: 'Negative（陰性）',
        notes: '沈渣では 0–2 RBC/HPF 程度までを正常とすることが多い',
    },
];

/**
 * カテゴリ別に検査項目をグループ化
 */
export function getLabTestsByCategory(): Record<LabTestCategory, LabTestDefinition[]> {
    const grouped: Record<LabTestCategory, LabTestDefinition[]> = {
        CBC: [],
        electrolyte: [],
        renal: [],
        glucose: [],
        liver: [],
        inflammation: [],
        endocrine: [],
        urine: [],
    };

    labTestDefinitions.forEach((test) => {
        grouped[test.category].push(test);
    });

    return grouped;
}

/**
 * IDから検査項目を取得
 */
export function getLabTestById(id: string): LabTestDefinition | undefined {
    return labTestDefinitions.find((test) => test.id === id);
}

