/**
 * ImagingImageViewer Component
 *
 * Displays medical imaging data with loading states and error handling.
 *
 * ## Features
 * - Automatic image loading from Walrus
 * - Decryption with Seal
 * - Loading and error states
 * - Thumbnail and full-size modes
 * - Lazy loading support
 * - Accessibility (ARIA labels, alt text)
 *
 * ## Usage
 * ```tsx
 * <ImagingImageViewer
 *   blobId="abc123..."
 *   alt="Chest X-ray"
 *   mode="thumbnail"
 * />
 * ```
 */
"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useImage } from "@/hooks/useImagingData";
import { usePassport } from "@/hooks/usePassport";
import { useSessionKeyManager } from "@/hooks/useSessionKeyManager";

// ==========================================
// Type Definitions
// ==========================================

export interface ImagingImageViewerProps {
	/** Walrus blob ID for the imaging binary */
	blobId: string | null;
	/** Alt text for accessibility */
	alt: string;
	/** Display mode */
	mode?: "thumbnail" | "full";
	/** Class name for custom styling */
	className?: string;
	/** Lazy loading (default: true) */
	lazy?: boolean;
	/** On click handler */
	onClick?: () => void;
	/** Show error message (default: true) */
	showError?: boolean;
}

// ==========================================
// Component
// ==========================================

/**
 * Image viewer for medical imaging data
 */
export function ImagingImageViewer({
	blobId,
	alt,
	mode = "thumbnail",
	className = "",
	lazy = true,
	onClick,
	showError = true,
}: ImagingImageViewerProps) {
	const { passport } = usePassport();
	const { sessionKey } = useSessionKeyManager();
	const [isVisible, setIsVisible] = useState(!lazy);

	// Get image from hook
	const { imageUrl, isLoading, error } = useImage(
		blobId && isVisible ? blobId : null,
		blobId && isVisible && sessionKey && passport
			? {
					sealId: passport.sealId,
					sessionKey,
					passportId: passport.id,
				}
			: null,
	);

	// Intersection Observer for lazy loading
	useEffect(() => {
		if (!lazy) {
			setIsVisible(true);
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setIsVisible(true);
						observer.disconnect();
					}
				}
			},
			{
				rootMargin: "100px", // Start loading 100px before visible
			},
		);

		const element = document.getElementById(`imaging-${blobId}`);
		if (element) {
			observer.observe(element);
		}

		return () => observer.disconnect();
	}, [blobId, lazy]);

	// Render loading state
	if (isLoading) {
		return (
			<div
				id={`imaging-${blobId}`}
				className={`flex items-center justify-center ${getSizeClass(mode)} ${className}`}
			>
				<GlassCard className="w-full h-full flex items-center justify-center">
					<div className="flex flex-col items-center gap-3">
						<div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
						<p className="text-sm text-gray-600">画像を読み込み中...</p>
					</div>
				</GlassCard>
			</div>
		);
	}

	// Render error state
	if (error && showError) {
		return (
			<div
				id={`imaging-${blobId}`}
				className={`flex items-center justify-center ${getSizeClass(mode)} ${className}`}
			>
				<GlassCard className="w-full h-full flex items-center justify-center">
					<div className="flex flex-col items-center gap-3 text-center p-4">
						<svg
							className="w-12 h-12 text-red-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div>
							<p className="text-sm font-medium text-gray-900">
								画像を読み込めませんでした
							</p>
							<p className="text-xs text-gray-600 mt-1">{error}</p>
						</div>
					</div>
				</GlassCard>
			</div>
		);
	}

	// Render placeholder if no image yet
	if (!imageUrl) {
		return (
			<div
				id={`imaging-${blobId}`}
				className={`flex items-center justify-center ${getSizeClass(mode)} ${className}`}
			>
				<GlassCard className="w-full h-full flex items-center justify-center">
					<div className="flex flex-col items-center gap-3">
						<svg
							className="w-12 h-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<p className="text-sm text-gray-600">画像なし</p>
					</div>
				</GlassCard>
			</div>
		);
	}

	// Render image
	const ImageElement = (
		<img
			src={imageUrl}
			alt={alt}
			className={`
				w-full h-full object-contain
				${mode === "thumbnail" ? "rounded-xl" : "rounded-2xl"}
			`}
			loading={lazy ? "lazy" : "eager"}
		/>
	);

	if (onClick) {
		return (
			<button
				type="button"
				id={`imaging-${blobId}`}
				onClick={onClick}
				className={`
					${getSizeClass(mode)}
					${className}
					overflow-hidden
					cursor-pointer
					transition-all duration-300
					hover:scale-[1.02]
					focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
				`}
				aria-label={`${alt}を拡大表示`}
			>
				<GlassCard className="w-full h-full p-0 overflow-hidden">
					{ImageElement}
				</GlassCard>
			</button>
		);
	}

	return (
		<div
			id={`imaging-${blobId}`}
			className={`${getSizeClass(mode)} ${className} overflow-hidden`}
		>
			<GlassCard className="w-full h-full p-0 overflow-hidden">
				{ImageElement}
			</GlassCard>
		</div>
	);
}

/**
 * Get size class based on display mode
 */
function getSizeClass(mode: "thumbnail" | "full"): string {
	if (mode === "thumbnail") {
		return "w-32 h-32";
	}
	return "w-full h-auto min-h-[400px]";
}

/**
 * Simple loading placeholder component
 */
export function ImagingImagePlaceholder({
	mode = "thumbnail",
	className = "",
}: {
	mode?: "thumbnail" | "full";
	className?: string;
}) {
	return (
		<div
			className={`flex items-center justify-center ${getSizeClass(mode)} ${className}`}
		>
			<GlassCard className="w-full h-full flex items-center justify-center">
				<svg
					className="w-12 h-12 text-gray-400 animate-pulse"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</GlassCard>
		</div>
	);
}
