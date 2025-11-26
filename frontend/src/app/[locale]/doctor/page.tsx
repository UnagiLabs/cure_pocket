"use client";

import jsQR from "jsqr";
import {
	CheckCircle2,
	Loader2,
	QrCode,
	Stethoscope,
	Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useRef, useState } from "react";
import { type DataType, getDataTypeLabel } from "@/lib/mockData";

interface QRPayload {
	v?: number;
	token?: string;
	passport?: string;
	secret?: string;
	scope?: DataType[];
	exp?: string;
}

export default function DoctorPage() {
	const router = useRouter();
	const locale = useLocale();
	const [isScanning, setIsScanning] = useState(false);
	const [qrData, setQrData] = useState<QRPayload | null>(null);
	const [message, setMessage] = useState<{
		type: "info" | "error" | "success";
		text: string;
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsScanning(true);
		setMessage(null);

		try {
			const imageUrl = URL.createObjectURL(file);
			const img = new Image();

			img.onload = () => {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					setMessage({
						type: "error",
						text: "Canvas コンテキストを取得できませんでした",
					});
					setIsScanning(false);
					return;
				}

				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0);

				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const code = jsQR(imageData.data, imageData.width, imageData.height);

				URL.revokeObjectURL(imageUrl);

				if (code) {
					try {
						// Base64デコード
						const decoded = atob(
							code.data.replace(/-/g, "+").replace(/_/g, "/"),
						);
						const payload: QRPayload = JSON.parse(decoded);

						setQrData(payload);
						setMessage({
							type: "success",
							text: "QRコードの読み取りに成功しました。患者データページへ遷移します...",
						});

						// QRペイロードをsessionStorageに保存
						sessionStorage.setItem(
							"qrPayload",
							JSON.stringify({
								token: payload.token,
								secret: payload.secret,
								scope: payload.scope,
								exp: payload.exp,
							}),
						);

						// patient/[patientId]ページへ遷移
						if (payload.passport) {
							setTimeout(() => {
								router.push(`/${locale}/doctor/patient/${payload.passport}`);
							}, 1000);
						}
					} catch (err) {
						console.error("QR decode error:", err);
						setMessage({
							type: "error",
							text: "QRコードのデコードに失敗しました",
						});
					}
				} else {
					setMessage({ type: "error", text: "QRコードが見つかりませんでした" });
				}

				setIsScanning(false);
			};

			img.onerror = () => {
				URL.revokeObjectURL(imageUrl);
				setMessage({ type: "error", text: "画像の読み込みに失敗しました" });
				setIsScanning(false);
			};

			img.src = imageUrl;
		} catch (err) {
			console.error("QR upload error:", err);
			setMessage({
				type: "error",
				text: "QRコードの処理中にエラーが発生しました",
			});
			setIsScanning(false);
		}

		// ファイル選択をリセット
		e.target.value = "";
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
			<div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
				{/* ヘッダー */}
				<div className="text-center space-y-3">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-2">
						<Stethoscope className="h-8 w-8 text-blue-600" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900">医師用データ閲覧</h1>
					<p className="text-gray-600 max-w-2xl mx-auto">
						患者から共有されたQRコードをアップロードして、医療データを閲覧します
					</p>
				</div>

				{/* QRコードアップロードエリア */}
				<div className="bg-white rounded-2xl shadow-lg p-8">
					<div className="flex flex-col items-center space-y-6">
						<div className="w-full max-w-md">
							<div className="border-2 border-dashed border-blue-300 rounded-xl p-8 bg-blue-50/50 hover:bg-blue-50 transition">
								<div className="text-center space-y-4">
									<QrCode className="h-16 w-16 text-blue-600 mx-auto" />
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-1">
											患者のQRコードをアップロード
										</h3>
										<p className="text-sm text-gray-600">
											PNG、JPG、JPEG形式に対応しています
										</p>
									</div>
									<input
										type="file"
										ref={fileInputRef}
										onChange={handleQRUpload}
										accept="image/*"
										className="hidden"
									/>
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={isScanning}
										className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm hover:shadow-md"
									>
										{isScanning ? (
											<>
												<Loader2 className="h-5 w-5 animate-spin" />
												読み取り中...
											</>
										) : (
											<>
												<Upload className="h-5 w-5" />
												画像を選択
											</>
										)}
									</button>
								</div>
							</div>
						</div>

						{/* メッセージ表示 */}
						{message && (
							<div
								className={`w-full max-w-md p-4 rounded-lg border ${
									message.type === "success"
										? "bg-green-50 border-green-200 text-green-800"
										: message.type === "error"
											? "bg-red-50 border-red-200 text-red-800"
											: "bg-blue-50 border-blue-200 text-blue-800"
								}`}
							>
								<div className="flex items-center gap-2">
									{message.type === "success" && (
										<CheckCircle2 className="h-5 w-5" />
									)}
									<p className="font-medium">{message.text}</p>
								</div>
							</div>
						)}

						{/* QRコード情報表示 */}
						{qrData && (
							<div className="w-full max-w-md p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
								<h4 className="font-semibold text-blue-900 mb-3">
									スキャン情報
								</h4>
								<div className="space-y-2 text-sm">
									{qrData.scope && qrData.scope.length > 0 && (
										<div className="flex gap-2 flex-wrap">
											{qrData.scope.map((s) => (
												<span
													key={s}
													className="px-3 py-1 bg-white rounded-full text-blue-700 font-medium shadow-sm"
												>
													{getDataTypeLabel(s)}
												</span>
											))}
										</div>
									)}
									{qrData.exp && (
										<p className="text-blue-700">
											<span className="font-medium">有効期限:</span>{" "}
											{new Date(qrData.exp).toLocaleString("ja-JP")}
										</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* ガイダンス表示 */}
				{!qrData && !isScanning && (
					<div className="text-center py-12">
						<div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
							<QrCode className="h-10 w-10 text-gray-400" />
						</div>
						<p className="text-gray-500">
							患者から受け取ったQRコードをアップロードしてください
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
