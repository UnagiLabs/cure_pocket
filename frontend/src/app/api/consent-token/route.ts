import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface RequestBody {
	walletAddress: string;
	categories?: string[];
	durationHours?: number;
}

function buildConsentUrl(tokenId: string): string {
	const base =
		process.env.NEXT_PUBLIC_DOCTOR_VIEW_BASE_URL ||
		"https://doctor.curepocket.app";
	return `${base}/token/${tokenId}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const body = (await req.json()) as RequestBody;
		if (!body.walletAddress) {
			return NextResponse.json(
				{ error: "walletAddress is required" },
				{ status: 400 },
			);
		}

		const durationHours = body.durationHours ?? 24;
		const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

		// Random, URL-safe token id
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		const tokenId = btoa(String.fromCharCode(...array))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		const consentUrl = buildConsentUrl(tokenId);

		return NextResponse.json({
			consentUrl,
			expiresAt: expiresAt.toISOString(),
			tokenId,
			categories: body.categories ?? [],
			durationHours,
		});
	} catch (error) {
		console.error("[consent-token] POST failed", error);
		return NextResponse.json(
			{ error: "Failed to create consent token" },
			{ status: 500 },
		);
	}
}
