import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// OCR結果の型定義
interface LabOCRResult {
	testDate: string;
	facility: string;
	items: {
		testName: string;
		value: string;
		unit: string;
		refRange?: string;
		flag?: string;
	}[];
}

export async function POST(request: NextRequest) {
	try {
		// リクエストボディから画像データを取得
		const { images } = await request.json();

		if (!images || !Array.isArray(images) || images.length === 0) {
			return NextResponse.json(
				{ error: "画像データが提供されていません" },
				{ status: 400 },
			);
		}

		// APIキーの確認
		if (!process.env.GEMINI_API_KEY) {
			return NextResponse.json(
				{ error: "GEMINI_API_KEYが設定されていません" },
				{ status: 500 },
			);
		}

		// Gemini 2.5 Flashモデルを使用
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

		// プロンプトの作成（日英両対応）
		const prompt = `あなたは医療検査結果OCRアシスタントです。提供された検査結果用紙の画像から、以下の情報を抽出してJSON形式で返してください。

抽出する情報：
1. 検査日（testDate）: YYYY-MM-DD形式
2. 医療機関名（facility）: 病院やクリニックの名前、検査機関名
3. 検査項目（items）: 配列形式で以下を含む
   - 検査項目名（testName）: 例「WBC」「HbA1c」「AST」「ALT」
   - 検査値（value）: 数値のみ（文字列形式）
   - 単位（unit）: 例「/µL」「%」「mg/dL」「U/L」
   - 基準範囲（refRange）: 例「4000-10000」「4.6-6.2」（任意）
   - 異常フラグ（flag）: H/L/N（任意、High/Low/Normal）

重要な注意事項：
- 日本語または英語の検査結果に対応してください
- 検査項目名は、可能な限り標準的な略称で抽出してください：
  - 血算: WBC, RBC, Hb (HGB), Hct, PLT
  - 電解質: Na, K, Cl
  - 腎機能: BUN, Cre (CRE), eGFR
  - 肝機能: AST (GOT), ALT (GPT), ALP, γ-GTP (GGT), T-Bil, Alb
  - 脂質: LDL (LDL-C), HDL (HDL-C), TG
  - 血糖: FBS, HbA1c
  - その他: CRP, TSH
- 数値は小数点を含む可能性があります
- 単位が不明な場合は空文字列を返してください
- 必ず有効なJSONフォーマットで返してください
- 検査結果が複数ページある場合は、すべてのページから項目を抽出してください
- 検査日が不明な場合は空文字列を返してください

JSONスキーマ例：
{
  "testDate": "2025-11-28",
  "facility": "サンプル病院 検査部",
  "items": [
    {"testName": "WBC", "value": "5500", "unit": "/µL", "refRange": "4000-10000", "flag": "N"},
    {"testName": "HbA1c", "value": "6.5", "unit": "%", "refRange": "4.6-6.2", "flag": "H"},
    {"testName": "AST", "value": "25", "unit": "U/L", "refRange": "10-40", "flag": "N"},
    {"testName": "ALT", "value": "18", "unit": "U/L", "refRange": "5-40", "flag": "N"},
    {"testName": "LDL", "value": "145", "unit": "mg/dL", "refRange": "<140", "flag": "H"},
    {"testName": "Cre", "value": "0.9", "unit": "mg/dL", "refRange": "0.6-1.2", "flag": "N"}
  ]
}

画像から上記の情報を抽出し、JSONのみを返してください（説明文は不要）。`;

		// 画像データを準備（複数画像対応）
		const imageParts = images.map((imageData: string) => {
			const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
			return {
				inlineData: {
					data: base64Data,
					mimeType: "image/jpeg",
				},
			};
		});

		// Gemini APIにリクエスト
		const result = await model.generateContent([prompt, ...imageParts]);
		const response = await result.response;
		const text = response.text();

		// JSONの抽出（マークダウンコードブロックを除去）
		let jsonText = text.trim();
		if (jsonText.startsWith("```json")) {
			jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
		} else if (jsonText.startsWith("```")) {
			jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
		}

		// JSONパース
		const ocrResult: LabOCRResult = JSON.parse(jsonText);

		// バリデーション
		if (!ocrResult.items || !Array.isArray(ocrResult.items)) {
			return NextResponse.json(
				{ error: "検査項目が抽出できませんでした", raw: jsonText },
				{ status: 422 },
			);
		}

		return NextResponse.json(ocrResult);
	} catch (error) {
		console.error("OCR処理エラー:", error);
		return NextResponse.json(
			{
				error: "OCR処理に失敗しました",
				details: error instanceof Error ? error.message : "不明なエラー",
			},
			{ status: 500 },
		);
	}
}
