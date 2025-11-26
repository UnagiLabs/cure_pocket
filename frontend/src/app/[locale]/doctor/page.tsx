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
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import type { DataType } from "@/lib/mockData";

interface QRPayload {
	v?: number;
	token?: string;
	passport?: string;
	secret?: string;
	scope?: DataType[];
	exp?: string;
}

/**
 * 複数の領域でQRコードを検出する関数
 * 装飾付き画像（中央にQRコード）とQRのみの画像の両方に対応
 */
function detectQRCode(
	ctx: CanvasRenderingContext2D,
	imgWidth: number,
	imgHeight: number,
): ReturnType<typeof jsQR> {
	// 試行する領域リスト（中央 → 上部 → 全体）
	const regions = [
		// 1. 中央領域（装飾画像のQRコード位置）
		{
			x: Math.floor(imgWidth * 0.2),
			y: Math.floor(imgHeight * 0.15),
			width: Math.floor(imgWidth * 0.6),
			height: Math.floor(imgHeight * 0.4),
		},
		// 2. 上半分
		{
			x: 0,
			y: 0,
			width: imgWidth,
			height: Math.floor(imgHeight * 0.5),
		},
		// 3. 画像全体（フォールバック）
		{
			x: 0,
			y: 0,
			width: imgWidth,
			height: imgHeight,
		},
	];

	for (const region of regions) {
		const imageData = ctx.getImageData(
			region.x,
			region.y,
			region.width,
			region.height,
		);
		const code = jsQR(imageData.data, imageData.width, imageData.height);
		if (code) {
			return code;
		}
	}

	return null;
}

export default function DoctorPage() {
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations();
	const [isScanning, setIsScanning] = useState(false);
	const [qrData, setQrData] = useState<QRPayload | null>(null);
	const [message, setMessage] = useState<{
		type: "info" | "error" | "success";
		text: string;
	} | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const dataTypeLabel = useMemo(
		() => ({
			medications: t("dataOverview.chips.prescriptions", {
				default: "Medications",
			}),
			allergies: t("doctor.drugAllergies", { default: "Allergies" }),
			histories: t("dataOverview.chips.conditions", { default: "Conditions" }),
			labs: t("home.labResults", { default: "Lab Results" }),
			imaging: t("home.imagingData", { default: "Imaging" }),
			vitals: t("home.todayVitals", { default: "Vital Signs" }),
		}),
		[t],
	);

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
						text: t("doctor.canvasContextError"),
					});
					setIsScanning(false);
					return;
				}

				canvas.width = img.width;
				canvas.height = img.height;
				ctx.drawImage(img, 0, 0);

				// 複数領域でQRコードを検出（装飾付き画像対応）
				const code = detectQRCode(ctx, canvas.width, canvas.height);

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
							text: t("doctor.qrScanSuccess"),
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
							text: t("doctor.qrDecodeError"),
						});
					}
				} else {
					setMessage({ type: "error", text: t("doctor.qrNotFound") });
				}

				setIsScanning(false);
			};

			img.onerror = () => {
				URL.revokeObjectURL(imageUrl);
				setMessage({ type: "error", text: t("doctor.imageLoadError") });
				setIsScanning(false);
			};

			img.src = imageUrl;
		} catch (err) {
			console.error("QR upload error:", err);
			setMessage({
				type: "error",
				text: t("doctor.qrProcessError"),
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
					<h1 className="text-3xl font-bold text-gray-900">
						{t("doctor.pageTitle")}
					</h1>
					<p className="text-gray-600 max-w-2xl mx-auto">
						{t("doctor.pageDescription")}
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
											{t("doctor.uploadQRTitle")}
										</h3>
										<p className="text-sm text-gray-600">
											{t("doctor.uploadQRDescription")}
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
												{t("doctor.scanning")}
											</>
										) : (
											<>
												<Upload className="h-5 w-5" />
												{t("doctor.selectImage")}
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
									{t("doctor.scanInfo")}
								</h4>
								<div className="space-y-2 text-sm">
									{qrData.scope && qrData.scope.length > 0 && (
										<div className="flex gap-2 flex-wrap">
											{qrData.scope.map((s) => (
												<span
													key={s}
													className="px-3 py-1 bg-white rounded-full text-blue-700 font-medium shadow-sm"
												>
													{dataTypeLabel[s] || s}
												</span>
											))}
										</div>
									)}
									{qrData.exp && (
										<p className="text-blue-700">
											<span className="font-medium">
												{t("doctor.expirationDate")}
											</span>{" "}
											{new Date(qrData.exp).toLocaleString(locale)}
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
						<p className="text-gray-500">{t("doctor.uploadQRCodeGuidance")}</p>
					</div>
				)}
			</div>
		</div>
	);
}
