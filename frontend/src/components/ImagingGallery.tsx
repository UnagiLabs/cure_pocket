/**
 * ImagingGallery Component
 *
 * Displays a gallery of medical imaging data with modal viewer.
 *
 * ## Features
 * - Grid layout for multiple images
 * - Modal for full-size viewing
 * - Navigation (previous/next)
 * - Keyboard shortcuts (ESC, arrows)
 * - Accessibility (ARIA, focus management)
 *
 * ## Usage
 * ```tsx
 * <ImagingGallery
 *   images={[
 *     { blobId: "abc...", alt: "X-ray 1" },
 *     { blobId: "def...", alt: "X-ray 2" },
 *   ]}
 * />
 * ```
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagingImageViewer } from "./ImagingImageViewer";
import { GlassCard } from "./ui/GlassCard";

// ==========================================
// Type Definitions
// ==========================================

export interface ImagingGalleryImage {
	/** Walrus blob ID */
	blobId: string;
	/** Alt text for accessibility */
	alt: string;
	/** Optional caption */
	caption?: string;
	/** Optional metadata */
	metadata?: {
		modality?: string;
		bodyPart?: string;
		examDate?: string;
	};
}

export interface ImagingGalleryProps {
	/** Array of images to display */
	images: ImagingGalleryImage[];
	/** Grid columns (default: 3) */
	columns?: number;
	/** Class name for custom styling */
	className?: string;
	/** Show captions (default: true) */
	showCaptions?: boolean;
}

// ==========================================
// Component
// ==========================================

/**
 * Gallery component for medical imaging data
 */
export function ImagingGallery({
	images,
	columns = 3,
	className = "",
	showCaptions = true,
}: ImagingGalleryProps) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	// Handle image click
	const handleImageClick = useCallback((index: number) => {
		setSelectedIndex(index);
	}, []);

	// Close modal
	const closeModal = useCallback(() => {
		setSelectedIndex(null);
	}, []);

	// Navigate to previous image
	const handlePrevious = useCallback(() => {
		setSelectedIndex((prev) => {
			if (prev === null) return null;
			return prev > 0 ? prev - 1 : images.length - 1;
		});
	}, [images.length]);

	// Navigate to next image
	const handleNext = useCallback(() => {
		setSelectedIndex((prev) => {
			if (prev === null) return null;
			return prev < images.length - 1 ? prev + 1 : 0;
		});
	}, [images.length]);

	// Keyboard navigation
	useEffect(() => {
		if (selectedIndex === null) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			switch (event.key) {
				case "Escape":
					closeModal();
					break;
				case "ArrowLeft":
					handlePrevious();
					break;
				case "ArrowRight":
					handleNext();
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectedIndex, closeModal, handlePrevious, handleNext]);

	// Empty state
	if (images.length === 0) {
		return (
			<div className={`py-12 text-center ${className}`}>
				<GlassCard>
					<div className="flex flex-col items-center gap-3">
						<svg
							className="w-16 h-16 text-gray-400"
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
						<p className="text-gray-600">画像データがありません</p>
					</div>
				</GlassCard>
			</div>
		);
	}

	return (
		<>
			{/* Gallery Grid */}
			<div
				className={`
					grid gap-4
					${getGridClass(columns)}
					${className}
				`}
			>
				{images.map((image, index) => (
					<div key={`${image.blobId}-${index}`} className="flex flex-col gap-2">
						{/* Thumbnail */}
						<ImagingImageViewer
							blobId={image.blobId}
							alt={image.alt}
							mode="thumbnail"
							onClick={() => handleImageClick(index)}
							className="w-full"
						/>

						{/* Caption */}
						{showCaptions && image.caption && (
							<p className="text-sm text-gray-700 text-center px-2">
								{image.caption}
							</p>
						)}

						{/* Metadata */}
						{showCaptions && image.metadata && (
							<div className="flex flex-wrap gap-2 justify-center">
								{image.metadata.modality && (
									<span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
										{image.metadata.modality}
									</span>
								)}
								{image.metadata.bodyPart && (
									<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
										{image.metadata.bodyPart}
									</span>
								)}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Modal Viewer */}
			{selectedIndex !== null && (
				<ImagingModal
					image={images[selectedIndex]}
					currentIndex={selectedIndex}
					totalCount={images.length}
					onClose={closeModal}
					onPrevious={handlePrevious}
					onNext={handleNext}
				/>
			)}
		</>
	);
}

/**
 * Get grid class based on column count
 */
function getGridClass(columns: number): string {
	switch (columns) {
		case 1:
			return "grid-cols-1";
		case 2:
			return "grid-cols-1 sm:grid-cols-2";
		case 3:
			return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
		case 4:
			return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
		default:
			return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
	}
}

// ==========================================
// Modal Component
// ==========================================

interface ImagingModalProps {
	image: ImagingGalleryImage;
	currentIndex: number;
	totalCount: number;
	onClose: () => void;
	onPrevious: () => void;
	onNext: () => void;
}

function ImagingModal({
	image,
	currentIndex,
	totalCount,
	onClose,
	onPrevious,
	onNext,
}: ImagingModalProps) {
	// Prevent body scroll when modal is open
	useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "unset";
		};
	}, []);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			{/* Modal Content */}
			<div
				className="relative w-full max-w-6xl max-h-[90vh] p-4 overflow-auto"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Close Button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute top-6 right-6 z-10 bg-white/90 hover:bg-white rounded-full p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
					aria-label="閉じる"
				>
					<svg
						className="w-6 h-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				{/* Previous Button */}
				{totalCount > 1 && (
					<button
						type="button"
						onClick={onPrevious}
						className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
						aria-label="前の画像"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
				)}

				{/* Next Button */}
				{totalCount > 1 && (
					<button
						type="button"
						onClick={onNext}
						className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
						aria-label="次の画像"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
				)}

				{/* Image */}
				<div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
					<ImagingImageViewer
						blobId={image.blobId}
						alt={image.alt}
						mode="full"
						lazy={false}
					/>

					{/* Image Info */}
					<div className="p-6 border-t border-gray-200">
						<h2
							id="modal-title"
							className="text-xl font-semibold text-gray-900 mb-2"
						>
							{image.alt}
						</h2>

						{image.caption && (
							<p className="text-gray-700 mb-4">{image.caption}</p>
						)}

						{/* Metadata */}
						{image.metadata && (
							<div className="flex flex-wrap gap-3">
								{image.metadata.modality && (
									<div className="flex items-center gap-2">
										<span className="text-sm text-gray-600">検査種別:</span>
										<span className="text-sm font-medium bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
											{image.metadata.modality}
										</span>
									</div>
								)}
								{image.metadata.bodyPart && (
									<div className="flex items-center gap-2">
										<span className="text-sm text-gray-600">部位:</span>
										<span className="text-sm font-medium bg-green-100 text-green-800 px-3 py-1 rounded-full">
											{image.metadata.bodyPart}
										</span>
									</div>
								)}
								{image.metadata.examDate && (
									<div className="flex items-center gap-2">
										<span className="text-sm text-gray-600">検査日:</span>
										<span className="text-sm font-medium text-gray-900">
											{image.metadata.examDate}
										</span>
									</div>
								)}
							</div>
						)}

						{/* Image Counter */}
						{totalCount > 1 && (
							<p className="text-sm text-gray-500 mt-4">
								{currentIndex + 1} / {totalCount}
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
