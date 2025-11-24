/**
 * ImagingImageViewer Component
 *
 * Displays medical imaging data from a pre-decrypted ObjectURL.
 *
 * ## Features
 * - Simple image display from ObjectURL
 * - Thumbnail and full-size modes
 * - Lazy loading support
 * - Accessibility (ARIA labels, alt text)
 * - Loading placeholder
 *
 * ## Usage
 * ```tsx
 * <ImagingImageViewer
 *   objectUrl="blob:http://localhost:3000/..."
 *   alt="Chest X-ray"
 *   mode="thumbnail"
 * />
 * ```
 *
 * ## Note
 * This component expects a pre-decrypted ObjectURL.
 * Image decryption should be handled by the parent component.
 */
"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

// ==========================================
// Type Definitions
// ==========================================

export interface ImagingImageViewerProps {
	/** Pre-decrypted ObjectURL for the image (e.g., "blob:http://...") */
	objectUrl: string | null;
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
	/** Show placeholder when no image (default: true) */
	showPlaceholder?: boolean;
}

// ==========================================
// Component
// ==========================================

/**
 * Image viewer for medical imaging data
 * Displays pre-decrypted images from ObjectURL
 */
export function ImagingImageViewer({
	objectUrl,
	alt,
	mode = "thumbnail",
	className = "",
	lazy = true,
	onClick,
	showPlaceholder = true,
}: ImagingImageViewerProps) {
	const [isVisible, setIsVisible] = useState(!lazy);

	// Intersection Observer for lazy loading
	useEffect(() => {
		if (!lazy || !objectUrl) {
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

		const element = document.getElementById(`imaging-${objectUrl}`);
		if (element) {
			observer.observe(element);
		}

		return () => observer.disconnect();
	}, [objectUrl, lazy]);

	// Render placeholder if no image
	if (!objectUrl) {
		if (!showPlaceholder) {
			return null;
		}

		return (
			<div
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

	// Render image (only if visible or not lazy)
	const ImageElement = isVisible ? (
		<img
			src={objectUrl}
			alt={alt}
			className={`
				w-full h-full object-contain
				${mode === "thumbnail" ? "rounded-xl" : "rounded-2xl"}
			`}
			loading={lazy ? "lazy" : "eager"}
		/>
	) : (
		<div className="flex items-center justify-center w-full h-full">
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
		</div>
	);

	if (onClick) {
		return (
			<button
				type="button"
				id={`imaging-${objectUrl}`}
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
			id={`imaging-${objectUrl}`}
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
