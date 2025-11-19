/**
 * 基礎疾患・慢性疾患の定義
 * カテゴリごとに整理し、ICD-10コードのプレースホルダーを含む
 */
import type { ChronicCondition } from '@/types';

export interface ChronicConditionCategory {
  id: string;
  label: string;
  conditions: ChronicCondition[];
}

/**
 * 基礎疾患・慢性疾患のカテゴリ別リスト
 */
export const chronicConditionCategories: ChronicConditionCategory[] = [
  {
    id: 'cardiovascular',
    label: '循環器',
    conditions: [
      { label: '高血圧', code: 'I10' },
      { label: '脂質異常症', code: 'E78' },
      { label: '狭心症', code: 'I20' },
      { label: '心筋梗塞の既往', code: 'I25.2' },
      { label: '心不全', code: 'I50' },
      { label: '心房細動・心房粗動', code: 'I48' },
      { label: '末梢動脈疾患', code: 'I73' },
      { label: '脳梗塞・TIAの既往', code: 'I63' },
      { label: '脳出血の既往', code: 'I61' },
      { label: '高血圧性心疾患・左室肥大', code: 'I11' },
    ],
  },
  {
    id: 'metabolic',
    label: '代謝・内分泌',
    conditions: [
      { label: '2型糖尿病', code: 'E11' },
      { label: '1型糖尿病', code: 'E10' },
      { label: '耐糖能異常・境界型', code: 'R73.03' },
      { label: '甲状腺機能亢進症', code: 'E05' },
      { label: '甲状腺機能低下症', code: 'E03' },
      { label: '副腎疾患', code: 'E27' },
      { label: '多嚢胞性卵巣症候群', code: 'E28.2' },
      { label: '肥満（BMI 30以上）', code: 'E66' },
      { label: '痛風・高尿酸血症', code: 'M10' },
      { label: 'メタボリックシンドローム', code: 'E88.81' },
    ],
  },
  {
    id: 'respiratory',
    label: '呼吸器',
    conditions: [
      { label: '気管支喘息', code: 'J45' },
      { label: 'COPD', code: 'J44' },
      { label: '間質性肺疾患', code: 'J84' },
      { label: '睡眠時無呼吸症候群', code: 'G47.3' },
    ],
  },
  {
    id: 'renal',
    label: '腎・泌尿器',
    conditions: [
      { label: '慢性腎臓病（Stage 3以上）', code: 'N18' },
      { label: '透析中', code: 'Z99.2' },
      { label: 'ネフローゼ症候群', code: 'N04' },
      { label: '前立腺肥大症', code: 'N40' },
      { label: '頻回の尿路感染症の既往', code: 'N39.0' },
    ],
  },
  {
    id: 'hepatic',
    label: '肝・消化器',
    conditions: [
      { label: '慢性肝炎（B型・C型など）', code: 'B18' },
      { label: '肝硬変', code: 'K74' },
      { label: '脂肪肝・NASH', code: 'K76.0' },
      { label: '炎症性腸疾患', code: 'K50-K51' },
      { label: '機能性ディスペプシア・慢性胃炎', code: 'K30' },
      { label: '胆石症・胆摘後', code: 'K80' },
    ],
  },
  {
    id: 'neurological',
    label: '神経・精神',
    conditions: [
      { label: '認知症', code: 'F03' },
      { label: 'パーキンソン病', code: 'G20' },
      { label: 'てんかん', code: 'G40' },
      { label: '片頭痛・慢性頭痛', code: 'G43' },
      { label: 'うつ病', code: 'F32' },
      { label: '不安障害・パニック障害', code: 'F41' },
      { label: '双極性障害', code: 'F31' },
      { label: '自閉スペクトラム症・発達障害', code: 'F84' },
      { label: '不眠症', code: 'G47.0' },
      { label: '末梢神経障害', code: 'G62' },
    ],
  },
  {
    id: 'hematology',
    label: '血液・腫瘍・免疫',
    conditions: [
      { label: '貧血（慢性的）', code: 'D64' },
      { label: '血友病・凝固異常', code: 'D66-D68' },
      { label: '血栓性素因', code: 'D68.5' },
      { label: 'がん・悪性腫瘍（固形がん）', code: 'C80' },
      { label: '血液悪性腫瘍', code: 'C81-C96' },
      { label: '関節リウマチ', code: 'M06' },
      { label: '全身性エリテマトーデス', code: 'M32' },
      { label: '乾癬・乾癬性関節炎', code: 'L40' },
      { label: 'その他膠原病', code: 'M35' },
    ],
  },
  {
    id: 'musculoskeletal',
    label: '骨・関節・筋',
    conditions: [
      { label: '骨粗鬆症', code: 'M80-M81' },
      { label: '慢性腰痛・変形性脊椎症', code: 'M47' },
      { label: '変形性膝関節症・股関節症', code: 'M15-M16' },
      { label: '慢性関節リウマチ', code: 'M06' },
    ],
  },
  {
    id: 'gynecologic',
    label: '婦人科・妊娠関連',
    conditions: [
      { label: '子宮内膜症・子宮筋腫', code: 'N80-N82' },
      { label: '不妊治療中', code: 'N97' },
      { label: '妊娠中', code: 'Z33' },
      { label: '授乳中', code: 'Z39.2' },
    ],
  },
];

/**
 * 最重要疾患（統計・副作用リスク評価で優先）
 */
export const criticalConditions: ChronicCondition[] = [
  { label: '高血圧', code: 'I10' },
  { label: '2型糖尿病', code: 'E11' },
  { label: '脂質異常症', code: 'E78' },
  { label: '心不全', code: 'I50' },
  { label: '心房細動・心房粗動', code: 'I48' },
  { label: '慢性腎臓病（Stage 3以上）', code: 'N18' },
  { label: '慢性肝疾患', code: 'K74' },
  { label: 'がん・悪性腫瘍', code: 'C80' },
  { label: '自己免疫疾患', code: 'M35' },
  { label: '気管支喘息', code: 'J45' },
  { label: 'COPD', code: 'J44' },
  { label: 'うつ病・不安障害', code: 'F32' },
];

/**
 * 全疾患のフラットリスト
 */
export const allChronicConditions: ChronicCondition[] =
  chronicConditionCategories.flatMap((category) => category.conditions);


