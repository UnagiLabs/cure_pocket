"use client";

import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { use, useEffect, useMemo, useState } from "react";
import { useConsentDecrypt } from "@/hooks/useConsentDecrypt";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";
import { getDataEntryBlobIds } from "@/lib/suiClient";
import type { DataScope } from "@/types/doctor";

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
			lab_results: t("home.labData", { default: "Lab Results" }),
			imaging_reports: t("home.imagingData", { default: "Imaging" }),
			vital_signs: t("home.todayVitals", { default: "Vital Signs" }),
		}),
		[t],
	);

	const handleFetch = async () => {
		reset();
		setFetchMessage(null);
		setResults([]);

		if (!consentTokenId || !secret) {
			setFetchMessage("ConsentToken ID と合言葉を入力してください");
			return;
		}

		if (!sessionKey || !sessionKeyValid) {
			setFetchMessage("SessionKey を生成中です。再試行してください。");
			await generateSessionKey();
			return;
		}

		setFetchState("loading");
		try {
			const blobIds = await getDataEntryBlobIds(patientId, dataType);
			if (blobIds.length === 0) {
				setFetchMessage(
					`${scopeLabel[dataType] || dataType}: Blob が登録されていません`,
				);
				setFetchState("idle");
				return;
			}

			const decrypted: Array<{ blobId: string; data: unknown }> = [];
			for (const blobId of blobIds) {
				const res = await decryptWithConsent({
					blobId,
					passportId: patientId,
					consentTokenId,
					dataType,
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

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<label className="space-y-1 text-sm text-gray-700">
						<span className="font-semibold">データ種別</span>
						<select
							value={dataType}
							onChange={(e) => setDataType(e.target.value as DataScope)}
							className="w-full rounded border px-3 py-2 text-sm"
						>
							{SUPPORTED_SCOPES.map((scope) => (
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
						{results.map((item) => (
							<div
								key={item.blobId}
								className="rounded-xl border bg-white p-4 shadow-sm"
							>
								<p className="text-xs text-gray-500 mb-2">
									Blob: {item.blobId}
								</p>
								<pre className="rounded bg-gray-900 text-gray-100 text-xs p-3 overflow-auto">
									{JSON.stringify(item.data, null, 2)}
								</pre>
							</div>
						))}
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
