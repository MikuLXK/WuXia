import { ThemePreset } from '../types';

export const THEMES: Record<ThemePreset, Record<string, string>> = {
    ink: {
        '--c-ink-black': '5 5 5',
        '--c-ink-gray': '26 26 26',
        '--c-wuxia-gold': '230 200 110', // Classic Gold
        '--c-wuxia-gold-dark': '138 114 54',
        '--c-wuxia-cyan': '68 170 170',
        '--c-wuxia-red': '163 24 24',
        '--c-paper-white': '230 230 230',
    },
    azure: {
        // Updated Azure Theme (青鸾入梦) - Brighter & Greener
        // Red: Matches Ink theme (163 24 24)
        // Primary (Gold var): Bright Emerald/Spring Green (High brightness, distinct green)
        // Background: Deep Green-Black
        '--c-ink-black': '2 18 12',     // Very Dark Forest Green
        '--c-ink-gray': '12 38 28',     // Dark Emerald Gray
        '--c-wuxia-gold': '60 235 150', // PRIMARY: Bright Vivid Green / Emerald (Replaces Gold)
        '--c-wuxia-gold-dark': '30 110 60', // Darker Green
        '--c-wuxia-cyan': '180 240 220', // SECONDARY: Very Pale Mint
        '--c-wuxia-red': '163 24 24',    // Exact match with Ink theme
        '--c-paper-white': '225 250 242', // Cool Mint White
    }
};