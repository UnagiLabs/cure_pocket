/**
 * RxTerms API Integration
 * https://clinicaltables.nlm.nih.gov/apidoc/rxterms/v3/doc.html
 *
 * RxTerms provides drug name autocomplete based on RxNorm
 * Note: English drug names only
 */

export interface RxTermsResult {
	displayName: string; // Drug display name (e.g., "Aspirin 81 MG Oral Tablet")
	rxcui?: string; // RxNorm Concept Unique Identifier
	synonym?: string; // Synonym
	route?: string; // Route of administration
	strength?: string; // Strength/dosage
}

/**
 * Search for drug names using RxTerms API
 * @param query - Search query (partial match)
 * @param maxResults - Maximum number of results (default: 10)
 * @returns List of drug candidates
 */
export async function searchDrugNames(
	query: string,
	maxResults = 10,
): Promise<RxTermsResult[]> {
	if (!query || query.trim().length < 2) {
		return [];
	}

	try {
		const url = new URL(
			"https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search",
		);
		url.searchParams.set("terms", query.trim());
		url.searchParams.set("maxList", maxResults.toString());
		url.searchParams.set("ef", "STRENGTHS_AND_FORMS,RXCUIS");

		const response = await fetch(url.toString());

		if (!response.ok) {
			console.warn(
				`[RxTerms] API error: ${response.status} ${response.statusText}`,
			);
			return [];
		}

		const data = await response.json();

		// RxTerms API response format (actual):
		// [totalCount, [drugName1, drugName2, ...], {STRENGTHS_AND_FORMS: [...], RXCUIS: [...]}]
		// Example: [30, ["Insulin analog, aspart (Injectable)", "Aspirin (Oral Pill)"], {STRENGTHS_AND_FORMS: [...], RXCUIS: [...]}]

		if (!Array.isArray(data) || data.length < 2) {
			console.warn("[RxTerms] Unexpected response format:", data);
			return [];
		}

		const results = data[1]; // Results are in data[1], not data[2]

		if (!Array.isArray(results)) {
			console.warn("[RxTerms] Results is not an array:", results);
			return [];
		}

		const extraFields: Record<string, string[][]> = data[3] || {};

		console.log("[RxTerms] First result:", results[0]);
		console.log("[RxTerms] Extra fields:", extraFields);

		return results.map((result, index) => {
			console.log(`[RxTerms] Processing result ${index}:`, result);
			// result is a string, not an array
			const displayName = result;

			// Get RXCUI from extra fields
			const rxcuiArray = extraFields.RXCUIS?.[index] || [];
			const rxcui = rxcuiArray[0] || undefined;

			// Get strength from extra fields if available
			const strengthsAndForms =
				extraFields.STRENGTHS_AND_FORMS?.[index] || [];
			const strength = strengthsAndForms[0] || undefined;

			console.log(`[RxTerms] Result ${index} - displayName:`, displayName, "rxcui:", rxcui, "strength:", strength);

			return {
				displayName,
				rxcui,
				strength,
			};
		});
	} catch (error) {
		console.warn("[RxTerms] Search failed:", error);
		return [];
	}
}
