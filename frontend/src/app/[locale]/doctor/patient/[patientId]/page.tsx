"use client";

import jsQR from "jsqr";
import { Loader2, Lock, QrCode, ShieldAlert, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useConsentDecrypt } from "@/hooks/useConsentDecrypt";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { getDataTypeLabel } from "@/lib/mockData";
import { getDataEntry } from "@/lib/suiClient";
import { type DataScope, toContractDataType } from "@/types/doctor";

type FetchState = "idle" | "loading" | "success" | "error";

const SUPPORTED_SCOPES: DataScope[] = [
	"basic_profile",
	"medications",
	"allergies",
	"conditions",
	"lab_results",
	"imaging_reports",
	"vital_signs",
];

interface DoctorPatientPageProps {
	params: Promise<{ patientId: string }>;
}

export default function DoctorPatientPage({ params }: DoctorPatientPageProps) {
	const { patientId } = use(params);
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();

	const {
		decryptWithConsent,
		stage,
		error: consentError,
		reset,
	} = useConsentDecrypt();

	const {
		sessionKey,
		isValid: sessionKeyValid,
		generateSessionKey,
		isLoading: isSessionKeyLoading,
		error: sessionKeyError,
	} = useSessionKeyManager();

	const [consentTokenId, setConsentTokenId] = useState("");
	const [secret, setSecret] = useState("");
	const [dataType, setDataType] = useState<DataScope>("medications");
	const [fetchState, setFetchState] = useState<FetchState>("idle");
	const [results, setResults] = useState<
		Array<{ blobId: string; data: unknown }>
	>([]);
	const [fetchMessage, setFetchMessage] = useState<string | null>(null);
	const [qrScopes, setQrScopes] = useState<DataScope[]>([]);
	const [isScanning, setIsScanning] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isBusy =
		fetchState === "loading" ||
		stage === "fetching" ||
		stage === "decrypting" ||
		stage === "building_ptb" ||
		isSessionKeyLoading;

	useEffect(() => {
		// Auto-create a session key if none is valid
		if (!sessionKeyValid && !isSessionKeyLoading) {
			void generateSessionKey();
		}
	}, [sessionKeyValid, isSessionKeyLoading, generateSessionKey]);

	const scopeLabel = useMemo(
		() => ({
			basic_profile: t("dataOverview.basicInfo", { default: "Basic Profile" }),
			medications: t("dataOverview.chips.prescriptions", {
				default: "Medications",
			}),
			allergies: t("doctor.drugAllergies", { default: "Allergies" }),
			conditions: t("dataOverview.chips.conditions", { default: "Conditions" }),
			lab_results: t("home.labResults", { default: "Lab Results" }),
			imaging_reports: t("home.imagingData", { default: "Imaging" }),
			vital_signs: t("home.todayVitals", { default: "Vital Signs" }),
		}),
		[t],
	);

	// sessionStorageからQRペイロードを取得（doctor/page.tsxから遷移時）
	useEffect(() => {
		const stored = sessionStorage.getItem("qrPayload");
		if (stored) {
			try {
				const payload = JSON.parse(stored);
				if (payload.token) setConsentTokenId(payload.token);
				if (payload.secret) setSecret(payload.secret);
				if (payload.scope && Array.isArray(payload.scope)) {
					setQrScopes(payload.scope as DataScope[]);
				}
				// 使用後は削除（セキュリティ対策）
				sessionStorage.removeItem("qrPayload");
			} catch (e) {
				console.error("Failed to parse qrPayload:", e);
			}
		}
	}, []);

	// qrScopesが設定された時、dataTypeを許可された最初のスコープに設定
	useEffect(() => {
		if (qrScopes.length > 0 && !qrScopes.includes(dataType)) {
			setDataType(qrScopes[0]);
		}
	}, [qrScopes, dataType]);

	// qrScopesが存在する場合、それに基づいてフィルター
	const allowedScopes = useMemo(() => {
		if (qrScopes.length === 0) return SUPPORTED_SCOPES;
		return SUPPORTED_SCOPES.filter((scope) => qrScopes.includes(scope));
	}, [qrScopes]);

	const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsScanning(true);
		setFetchMessage(null);

		try {
			const imageUrl = URL.createObjectURL(file);
			const img = new Image();

			img.onload = () => {
				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					setFetchMessage("Canvas コンテキストを取得できませんでした");
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
						const payload = JSON.parse(decoded);

						// フォームに自動入力
						if (payload.token) setConsentTokenId(payload.token);
						if (payload.secret) setSecret(payload.secret);
						if (payload.scope && Array.isArray(payload.scope)) {
							setQrScopes(payload.scope);
						}

						setFetchMessage("✅ QRコードの読み取りに成功しました！");
					} catch (err) {
						console.error("QR decode error:", err);
						setFetchMessage("QRコードのデコードに失敗しました");
					}
				} else {
					setFetchMessage("QRコードが見つかりませんでした");
				}

				setIsScanning(false);
			};

			img.onerror = () => {
				URL.revokeObjectURL(imageUrl);
				setFetchMessage("画像の読み込みに失敗しました");
				setIsScanning(false);
			};

			img.src = imageUrl;
		} catch (err) {
			console.error("QR upload error:", err);
			setFetchMessage("QRコードの処理中にエラーが発生しました");
			setIsScanning(false);
		}
	};

	const handleFetch = async () => {
		reset();
		setFetchMessage(null);
		setResults([]);

		if (!consentTokenId || !secret) {
			setFetchMessage("ConsentToken ID と合言葉を入力してください");
			return;
		}

		// スコープ検証（QRで許可されたスコープ外の場合はエラー）
		if (qrScopes.length > 0 && !qrScopes.includes(dataType)) {
			setFetchMessage("このデータ種は許可されていません");
			return;
		}

		// SessionKey検証
		if (!sessionKey || !sessionKeyValid) {
			setFetchMessage("SessionKey を生成中です。再試行してください。");
			await generateSessionKey();
			return;
		}

		setFetchState("loading");
		try {
			// DataScope（UI用）をコントラクトのdataTypeに変換
			const contractDataType = toContractDataType(dataType);

			// EntryData（seal_id + blob_ids）をDFから取得
			const entryData = await getDataEntry(patientId, contractDataType);
			if (!entryData || entryData.blobIds.length === 0) {
				setFetchMessage(
					`${scopeLabel[dataType] || dataType}: Blob が登録されていません`,
				);
				setFetchState("idle");
				return;
			}

			const { sealId, blobIds } = entryData;
			console.log(
				`[DoctorPage] Retrieved seal_id from DF: ${sealId.substring(0, 16)}...`,
			);

			const decrypted: Array<{ blobId: string; data: unknown }> = [];
			for (const blobId of blobIds) {
				const res = await decryptWithConsent({
					blobId,
					sealId, // DFから取得したseal_idを渡す
					passportId: patientId,
					consentTokenId,
					dataType: contractDataType,
					secret,
					sessionKey,
				});
				decrypted.push(res);
			}

			setResults(decrypted);
			setFetchState("success");
		} catch (err) {
			console.error("[DoctorPage] Fetch failed", err);
			setFetchMessage(
				err instanceof Error ? err.message : "取得に失敗しました",
			);
			setFetchState("error");
		}
	};

	const handleViewAll = () => {
		router.push(`/${locale}/doctor/patient/${patientId}/all`);
	};

	return (
		<div className="px-4 md:px-8 lg:px-12 py-4 lg:py-8 space-y-8">
			<section className="rounded-2xl border bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-sm">
				<div className="px-5 py-5 lg:px-8 lg:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-wide text-white/80">
							{t("doctor.medicalRecord", { default: "Medical Record" })}
						</p>
						<h1 className="text-2xl lg:text-3xl font-bold">
							{t("doctor.patientInformation", {
								default: "Patient Information",
							})}
						</h1>
						<p className="text-sm text-white/80 max-w-xl">
							{t("doctor.viewDescription", {
								default:
									"Decrypt shared medical data with ConsentToken and secret.",
							})}
						</p>
					</div>
					<button
						type="button"
						onClick={handleViewAll}
						className="text-xs font-semibold bg-white/15 hover:bg-white/25 transition rounded-full px-4 py-2 border border-white/30"
					>
						View all data types
					</button>
				</div>
			</section>

			<section className="rounded-2xl border bg-white p-4 lg:p-5 shadow-sm space-y-4">
				{/* QRコードアップロード */}
				<div className="flex flex-col sm:flex-row gap-3 items-center p-4 bg-blue-50 border border-blue-200 rounded-xl">
					<QrCode className="h-6 w-6 text-blue-600 flex-shrink-0" />
					<div className="flex-1 text-sm text-blue-900">
						<p className="font-semibold">患者のQRコードをスキャン</p>
						<p className="text-xs text-blue-700">
							患者から受け取ったQRコード画像をアップロードしてください
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
						className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
					>
						{isScanning ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								読み取り中...
							</>
						) : (
							<>
								<Upload className="h-4 w-4" />
								QRコードをアップロード
							</>
						)}
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label className="space-y-1 text-sm text-gray-700">
						<span className="font-semibold">ConsentToken Object ID</span>
						<input
							value={consentTokenId}
							onChange={(e) => setConsentTokenId(e.target.value)}
							className="w-full rounded border px-3 py-2 text-sm"
							placeholder="0x..."
						/>
					</label>

					<label className="space-y-1 text-sm text-gray-700">
						<span className="font-semibold">合言葉 (secret)</span>
						<input
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
							className="w-full rounded border px-3 py-2 text-sm"
							placeholder="患者から共有された秘密文字列"
							type="password"
						/>
					</label>
				</div>

				{/* QRコードからスキャンされたスコープの表示 */}
				{qrScopes.length > 0 && (
					<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
						<p className="text-sm text-green-900">
							<span className="font-semibold">QRスコープ: </span>
							{qrScopes.map((s) => getDataTypeLabel(s as never)).join(", ")}
						</p>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<label className="space-y-1 text-sm text-gray-700">
						<span className="font-semibold">データ種別</span>
						<select
							value={dataType}
							onChange={(e) => setDataType(e.target.value as DataScope)}
							className="w-full rounded border px-3 py-2 text-sm"
						>
							{allowedScopes.map((scope) => (
								<option key={scope} value={scope}>
									{scopeLabel[scope] || scope}
								</option>
							))}
						</select>
					</label>

					<div className="flex gap-2 md:col-span-2 justify-end">
						<button
							type="button"
							onClick={generateSessionKey}
							disabled={isBusy}
							className="rounded border px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100"
						>
							{isSessionKeyLoading
								? "SessionKey生成中..."
								: sessionKeyValid
									? "SessionKey再生成"
									: "SessionKey生成"}
						</button>
						<button
							type="button"
							onClick={handleFetch}
							disabled={isBusy}
							className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
						>
							{isBusy ? (
								<span className="inline-flex items-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									{t("doctor.loading", { default: "Loading..." })}
								</span>
							) : (
								t("doctor.fetchData", { default: "Fetch data" })
							)}
						</button>
					</div>
				</div>

				{sessionKeyError && (
					<AlertCard
						title="SessionKey エラー"
						message={sessionKeyError}
						intent="warning"
					/>
				)}
				{consentError && (
					<AlertCard title="復号エラー" message={consentError} intent="error" />
				)}
				{fetchMessage && (
					<AlertCard title="結果" message={fetchMessage} intent="info" />
				)}
			</section>

			<section className="space-y-4">
				<header className="flex items-center gap-2">
					<h2 className="text-lg font-semibold">
						{scopeLabel[dataType] || dataType}
					</h2>
					{fetchState === "loading" && (
						<Loader2 className="h-4 w-4 animate-spin text-blue-600" />
					)}
				</header>

				{results.length === 0 && fetchState === "idle" && (
					<div className="rounded-xl border border-dashed bg-gray-50 px-4 py-6 text-sm text-gray-600 flex items-center gap-2">
						<Lock className="h-4 w-4 text-gray-400" />
						<span>
							患者から共有された ConsentToken
							と合言葉を入力してデータを取得します。
						</span>
					</div>
				)}

				{results.length > 0 && (
					<div className="space-y-3">
						{results.map((item) => {
							const typedItem = item as {
								blobId: string;
								data: unknown;
								category?: string;
							};
							return (
								<div
									key={typedItem.blobId}
									className="rounded-xl border bg-white p-4 shadow-sm"
								>
									{typedItem.category && (
										<div className="mb-3 pb-2 border-b">
											<h3 className="text-base font-semibold text-gray-900">
												{getDataTypeLabel(typedItem.category as never)}
											</h3>
										</div>
									)}
									<p className="text-xs text-gray-500 mb-2">
										Blob: {typedItem.blobId}
									</p>
									<pre className="rounded bg-gray-900 text-gray-100 text-xs p-3 overflow-auto max-h-96">
										{JSON.stringify(typedItem.data, null, 2)}
									</pre>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}

function AlertCard({
	title,
	message,
	intent = "info",
}: {
	title: string;
	message: string;
	intent?: "info" | "warning" | "error";
}) {
	const color =
		intent === "error"
			? "text-red-700 bg-red-50 border-red-200"
			: intent === "warning"
				? "text-amber-700 bg-amber-50 border-amber-200"
				: "text-blue-700 bg-blue-50 border-blue-200";

	const Icon =
		intent === "error"
			? ShieldAlert
			: intent === "warning"
				? ShieldAlert
				: Lock;

	return (
		<div className={`rounded-xl border ${color} px-3 py-2 text-sm flex gap-2`}>
			<Icon className="h-4 w-4 mt-0.5" />
			<div>
				<p className="font-semibold">{title}</p>
				<p className="text-sm">{message}</p>
			</div>
		</div>
	);
}
