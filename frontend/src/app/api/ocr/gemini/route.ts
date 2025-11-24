import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Gemini APIクライアントの初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// OCR結果の型定義
interface OCRResult {
	prescriptionDate: string;
	clinic: string;
	department?: string;
	doctorName?: string;
	medications: {
		drugName: string;
		strength: string;
		dosage: string;
		quantity: string;
		duration?: string;
	}[];
	symptoms?: string;
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
		const prompt = `
あなたは医療用OCRアシスタントです。提供された処方箋画像から、以下の情報を抽出してJSON形式で返してください。

抽出する情報：
1. 処方日（prescriptionDate）: YYYY-MM-DD形式
2. 医療機関名（clinic）: 病院やクリニックの名前
3. 診療科（department）: 内科、外科など（任意）
4. 医師名（doctorName）: 処方医の名前（任意）
5. 薬剤情報（medications）: 配列形式で以下を含む
   - 薬品名（drugName）
   - 強度/規格（strength）: 例「60mg」
   - 用法（dosage）: 例「1日3回、食後」
   - 用量（quantity）: 例「1錠」
   - 日数（duration）: 例「7日分」（任意）
6. 症状（symptoms）: 診断名や症状（任意）

重要な注意事項：
- 日本語または英語の処方箋に対応してください
- 情報が不明な場合は、空文字列または省略してください
- 必ず有効なJSONフォーマットで返してください
- 薬品名は正確に抽出してください

JSONスキーマ例：
{
  "prescriptionDate": "2025-11-23",
  "clinic": "サンプル医院",
  "department": "内科",
  "doctorName": "山田太郎",
  "medications": [
    {
      "drugName": "ロキソプロフェンナトリウム錠",
      "strength": "60mg",
      "dosage": "1日3回、食後",
      "quantity": "1錠",
      "duration": "7日分"
    }
  ],
  "symptoms": "頭痛、発熱"
}

画像から上記の情報を抽出し、JSONのみを返してください（説明文は不要）。
`;

		// 画像データを準備（最初の画像のみ使用）
		const imageBase64 = images[0].replace(/^data:image\/\w+;base64,/, "");

		const imageParts = [
			{
				inlineData: {
					data: imageBase64,
					mimeType: "image/jpeg",
				},
			},
		];

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
		const ocrResult: OCRResult = JSON.parse(jsonText);

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
