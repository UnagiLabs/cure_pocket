import { describe, expect, it } from "vitest";
import {
	calculateFlag,
	formatReferenceRange,
	type RefRanges,
} from "../labResultsConverter";

describe("calculateFlag", () => {
	describe("default範囲のみの場合", () => {
		const refRanges: RefRanges = { default: { low: 4000, high: 10000 } };

		it("正常値でNを返す", () => {
			expect(calculateFlag(5000, refRanges)).toBe("N");
		});

		it("下限未満でLを返す", () => {
			expect(calculateFlag(3000, refRanges)).toBe("L");
		});

		it("上限超過でHを返す", () => {
			expect(calculateFlag(12000, refRanges)).toBe("H");
		});

		it("境界値（下限）でNを返す", () => {
			expect(calculateFlag(4000, refRanges)).toBe("N");
		});

		it("境界値（上限）でNを返す", () => {
			expect(calculateFlag(10000, refRanges)).toBe("N");
		});
	});

	describe("性別別オーバーライドがある場合", () => {
		const refRanges: RefRanges = {
			default: { low: 12.0, high: 17.0 },
			male: { low: 13.0, high: 17.0 },
			female: { low: 12.0, high: 15.5 },
		};

		it("男性で男性基準値を使用", () => {
			expect(calculateFlag(12.5, refRanges, "male")).toBe("L");
		});

		it("女性で女性基準値を使用", () => {
			expect(calculateFlag(12.5, refRanges, "female")).toBe("N");
		});

		it("性別未指定でデフォルトを使用", () => {
			expect(calculateFlag(12.5, refRanges)).toBe("N");
		});

		it("女性で上限超過", () => {
			expect(calculateFlag(16.0, refRanges, "female")).toBe("H");
		});
	});

	describe("片側のみ定義の場合", () => {
		it("上限のみ - 正常値", () => {
			const refRanges: RefRanges = { default: { high: 140 } };
			expect(calculateFlag(100, refRanges)).toBe("N");
		});

		it("上限のみ - 超過", () => {
			const refRanges: RefRanges = { default: { high: 140 } };
			expect(calculateFlag(150, refRanges)).toBe("H");
		});

		it("下限のみ - 正常値", () => {
			const refRanges: RefRanges = { default: { low: 60 } };
			expect(calculateFlag(80, refRanges)).toBe("N");
		});

		it("下限のみ - 未満", () => {
			const refRanges: RefRanges = { default: { low: 60 } };
			expect(calculateFlag(50, refRanges)).toBe("L");
		});
	});

	describe("性別別で部分オーバーライドの場合（γ-GTP）", () => {
		const refRanges: RefRanges = {
			default: { high: 80 },
			male: { high: 80 },
			female: { high: 30 },
		};

		it("男性で正常", () => {
			expect(calculateFlag(50, refRanges, "male")).toBe("N");
		});

		it("女性で高値", () => {
			expect(calculateFlag(50, refRanges, "female")).toBe("H");
		});
	});
});

describe("formatReferenceRange", () => {
	it("両端指定でハイフン区切り", () => {
		expect(formatReferenceRange({ default: { low: 4000, high: 10000 } })).toBe(
			"4,000-10,000",
		);
	});

	it("小数点の両端指定", () => {
		expect(formatReferenceRange({ default: { low: 4.0, high: 5.5 } })).toBe(
			"4-5.5",
		);
	});

	it("下限のみで≥表記", () => {
		expect(formatReferenceRange({ default: { low: 60 } })).toBe("≥60");
	});

	it("上限のみで≤表記", () => {
		expect(formatReferenceRange({ default: { high: 140 } })).toBe("≤140");
	});

	it("性別別オーバーライドがある場合", () => {
		const refRanges: RefRanges = {
			default: { low: 12, high: 17 },
			male: { low: 13, high: 17 },
			female: { low: 12, high: 15.5 },
		};
		expect(formatReferenceRange(refRanges)).toBe("M: 13-17 / F: 12-15.5");
	});

	it("性別別で片側のみ（γ-GTP）", () => {
		const refRanges: RefRanges = {
			default: { high: 80 },
			male: { high: 80 },
			female: { high: 30 },
		};
		expect(formatReferenceRange(refRanges)).toBe("M: ≤80 / F: ≤30");
	});

	it("両方undefinedの場合はハイフン", () => {
		expect(formatReferenceRange({ default: {} })).toBe("-");
	});

	it("大きい数値はカンマ区切り", () => {
		expect(
			formatReferenceRange({ default: { low: 150000, high: 400000 } }),
		).toBe("150,000-400,000");
	});
});
