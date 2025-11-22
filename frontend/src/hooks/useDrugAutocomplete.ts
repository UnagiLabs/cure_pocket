import { useCallback, useEffect, useRef, useState } from "react";
import { type RxTermsResult, searchDrugNames } from "@/lib/rxterms";

/**
 * 薬品名オートコンプリートのカスタムフック
 */
export function useDrugAutocomplete() {
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<RxTermsResult[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const abortControllerRef = useRef<AbortController | null>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 検索実行（デバウンス付き）
	const fetchSuggestions = useCallback(async (searchQuery: string) => {
		// 前回のリクエストをキャンセル
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// 2文字未満は検索しない
		if (searchQuery.trim().length < 2) {
			setSuggestions([]);
			setIsLoading(false);
			setIsOpen(false);
			return;
		}

		console.log("[useDrugAutocomplete] Searching for:", searchQuery);
		setIsLoading(true);

		try {
			const results = await searchDrugNames(searchQuery, 10);
			console.log("[useDrugAutocomplete] Got results:", results.length, results);
			setSuggestions(results);
			setIsOpen(results.length > 0);
			console.log("[useDrugAutocomplete] isOpen set to:", results.length > 0);
		} catch (error) {
			console.error("[useDrugAutocomplete] Error:", error);
			setSuggestions([]);
			setIsOpen(false);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// クエリ変更時のデバウンス処理
	useEffect(() => {
		// 既存のタイマーをクリア
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		// 300msのデバウンス
		debounceTimerRef.current = setTimeout(() => {
			fetchSuggestions(query);
		}, 300);

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [query, fetchSuggestions]);

	// クリーンアップ
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	const handleQueryChange = useCallback((newQuery: string) => {
		setQuery(newQuery);
	}, []);

	const handleSelect = useCallback((result: RxTermsResult) => {
		setQuery(result.displayName);
		setIsOpen(false);
		setSuggestions([]);
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
	}, []);

	return {
		query,
		suggestions,
		isLoading,
		isOpen,
		setQuery: handleQueryChange,
		selectSuggestion: handleSelect,
		closeSuggestions: handleClose,
	};
}
