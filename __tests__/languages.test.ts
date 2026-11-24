/**
 * Tests for languages.ts
 * Covers: getLanguageOptions
 */
import { getLanguageOptions } from '../nodes/Bluesky/V2/languages';

describe('Languages', () => {
	describe('getLanguageOptions', () => {
		it('should return an array of language options', () => {
			const options = getLanguageOptions();
			expect(Array.isArray(options)).toBe(true);
			expect(options.length).toBeGreaterThan(0);
		});

		it('returns unique nonempty language codes with nonempty labels', () => {
			// Validate the entire catalog in one invariant rather than one test per entry.
			const options = getLanguageOptions();
			const values = options.map((option) => option.value);
			expect(new Set(values).size).toBe(values.length);
			for (const option of options) {
				expect(typeof option.name).toBe('string');
				expect(typeof option.value).toBe('string');
				expect(String(option.name).trim()).not.toBe('');
				expect(String(option.value).trim()).not.toBe('');
			}
		});

		it('should include English (en)', () => {
			const options = getLanguageOptions();
			const english = options.find((opt) => opt.value === 'en');
			expect(english).toBeDefined();
			expect(english!.name).toBe('English');
		});

		it('should include regional variants', () => {
			const options = getLanguageOptions();
			const usEnglish = options.find((opt) => opt.value === 'en-US');
			expect(usEnglish).toBeDefined();
			expect(usEnglish!.name).toContain('United States');
		});

		it('should include non-Latin script languages', () => {
			const options = getLanguageOptions();
			const arabic = options.find((opt) => opt.value === 'ar');
			expect(arabic).toBeDefined();
			expect(arabic!.name).toBe('Arabic');
		});

		it('should return consistent results on repeated calls', () => {
			const options1 = getLanguageOptions();
			const options2 = getLanguageOptions();
			expect(options1).toEqual(options2);
		});
	});
});
