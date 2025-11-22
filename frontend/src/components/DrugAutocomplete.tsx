"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useDrugAutocomplete } from "@/hooks/useDrugAutocomplete";
import { getTheme } from "@/lib/themes";
import type { ThemeId } from "@/types";

interface DrugAutocompleteProps {
	value: string;
	onChange: (value: string, strength?: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	themeId: ThemeId;
	id?: string;
	className?: string;
}

/**
 * 薬品名オートコンプリート入力コンポーネント
 * RxTerms APIを使用して薬品名の候補を表示
 */
export function DrugAutocomplete({
	value,
	onChange,
	onBlur,
	placeholder,
	themeId,
	id,
	className = "",
}: DrugAutocompleteProps) {
	const theme = getTheme(themeId);
	const {
		query,
		suggestions,
		isLoading,
		isOpen,
		setQuery,
		selectSuggestion,
		closeSuggestions,
	} = useDrugAutocomplete();

	const containerRef = useRef<HTMLDivElement>(null);

	// 外部のvalueと内部のqueryを同期
	useEffect(() => {
		if (value !== query) {
			setQuery(value);
		}
	}, [value, query, setQuery]);

	// 外側クリックで候補を閉じる
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				closeSuggestions();
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [closeSuggestions]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setQuery(newValue);
		onChange(newValue);
	};

	const handleSuggestionClick = (suggestion: (typeof suggestions)[0]) => {
		selectSuggestion(suggestion);
		onChange(suggestion.displayName, suggestion.strength);
	};

	return (
		<div ref={containerRef} className="relative">
			<div className="relative">
				<input
					id={id}
					type="text"
					value={query}
					onChange={handleInputChange}
					onBlur={onBlur}
					placeholder={placeholder}
					className={`w-full rounded-lg border p-2.5 text-sm pr-8 ${className}`}
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
						color: theme.colors.text,
					}}
					autoComplete="off"
				/>
				{isLoading && (
					<div className="absolute right-3 top-1/2 -translate-y-1/2">
						<Loader2
							size={16}
							className="animate-spin"
							style={{ color: theme.colors.primary }}
						/>
					</div>
				)}
			</div>

			{/* Suggestions Dropdown */}
			{isOpen && suggestions.length > 0 && (
				<div
					className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto"
					style={{
						backgroundColor: theme.colors.surface,
						borderColor: `${theme.colors.textSecondary}40`,
					}}
				>
					{suggestions.map((suggestion, index) => (
						<button
							type="button"
							key={`${suggestion.rxcui}-${
								// biome-ignore lint/suspicious/noArrayIndexKey: This is a temporary list
								index
							}`}
							onClick={() => handleSuggestionClick(suggestion)}
							className="w-full text-left px-3 py-2.5 hover:bg-opacity-50 transition-colors border-b last:border-b-0"
							style={{
								borderColor: `${theme.colors.textSecondary}10`,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = `${theme.colors.primary}15`;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "transparent";
							}}
						>
							<div
								className="font-medium text-sm"
								style={{ color: theme.colors.text }}
							>
								{suggestion.displayName}
							</div>
							{suggestion.strength && (
								<div
									className="text-xs mt-0.5"
									style={{ color: theme.colors.textSecondary }}
								>
									{suggestion.strength}
								</div>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
