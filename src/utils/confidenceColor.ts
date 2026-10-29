/**
 * Universal Confidence & Performance Color Hierarchy (Strictly Zero-Green)
 *
 * Tier 0: Unrated / Unstudied / Inactive -> Slate Gray   (#8C8A82)
 * Tier 1: Critical / Low / Behind         -> Crimson Red  (#DC2626)
 * Tier 2: Moderate Low / Struggling       -> Safety Orange(#FF6B00 / #EA580C)
 * Tier 3: Moderate / Developing / Steady  -> Golden Amber (#D97706) [No Green]
 * Tier 4: Strong / High Confidence / Good -> Electric Blue(#0047FF / #2563EB)
 * Tier 5: Mastered / Peak / Ahead         -> Royal Violet (#7C3AED / #4F46E5)
 */

export interface ConfidenceTierConfig {
  level: number;
  label: string;
  shortLabel: string;
  hex: string;
  hoverHex: string;
  bgLight: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  cardBorderClass: string;
  glowClass: string;
}

export const CONFIDENCE_TIERS: Record<number, ConfidenceTierConfig> = {
  0: {
    level: 0,
    label: 'Unrated',
    shortLabel: 'Unrated',
    hex: '#8C8A82',
    hoverHex: '#706E66',
    bgLight: '#ECEAE4',
    textClass: 'text-[#8C8A82]',
    bgClass: 'bg-[#8C8A82]',
    borderClass: 'border-[#C5C3BB]',
    badgeClass: 'bg-[#ECEAE4] text-[#706E66] border-[#141416]',
    cardBorderClass: 'border-l-[#8C8A82]',
    glowClass: '',
  },
  1: {
    level: 1,
    label: 'Critical (Weak)',
    shortLabel: 'L1 Critical',
    hex: '#DC2626',
    hoverHex: '#B91C1C',
    bgLight: '#FEF2F2',
    textClass: 'text-[#DC2626]',
    bgClass: 'bg-[#DC2626]',
    borderClass: 'border-[#DC2626]',
    badgeClass: 'bg-[#DC2626] text-white border-[#141416]',
    cardBorderClass: 'border-l-[#DC2626]',
    glowClass: 'shadow-[0_0_8px_rgba(220,38,38,0.4)]',
  },
  2: {
    level: 2,
    label: 'Low (Needs Work)',
    shortLabel: 'L2 Low',
    hex: '#FF6B00',
    hoverHex: '#EA580C',
    bgLight: '#FFF7ED',
    textClass: 'text-[#FF6B00]',
    bgClass: 'bg-[#FF6B00]',
    borderClass: 'border-[#FF6B00]',
    badgeClass: 'bg-[#FF6B00] text-white border-[#141416]',
    cardBorderClass: 'border-l-[#FF6B00]',
    glowClass: 'shadow-[0_0_8px_rgba(255,107,0,0.4)]',
  },
  3: {
    level: 3,
    label: 'Moderate (Developing)',
    shortLabel: 'L3 Moderate',
    hex: '#D97706',
    hoverHex: '#B45309',
    bgLight: '#FFFBEB',
    textClass: 'text-[#D97706]',
    bgClass: 'bg-[#D97706]',
    borderClass: 'border-[#D97706]',
    badgeClass: 'bg-[#D97706] text-white border-[#141416]',
    cardBorderClass: 'border-l-[#D97706]',
    glowClass: 'shadow-[0_0_8px_rgba(217,119,6,0.4)]',
  },
  4: {
    level: 4,
    label: 'Strong (High)',
    shortLabel: 'L4 Strong',
    hex: '#0047FF',
    hoverHex: '#0038CC',
    bgLight: '#EFF6FF',
    textClass: 'text-[#0047FF]',
    bgClass: 'bg-[#0047FF]',
    borderClass: 'border-[#0047FF]',
    badgeClass: 'bg-[#0047FF] text-white border-[#141416]',
    cardBorderClass: 'border-l-[#0047FF]',
    glowClass: 'shadow-[0_0_8px_rgba(0,71,255,0.4)]',
  },
  5: {
    level: 5,
    label: 'Mastered (Peak)',
    shortLabel: 'L5 Mastered',
    hex: '#7C3AED',
    hoverHex: '#6D28D9',
    bgLight: '#FAF5FF',
    textClass: 'text-[#7C3AED]',
    bgClass: 'bg-[#7C3AED]',
    borderClass: 'border-[#7C3AED]',
    badgeClass: 'bg-[#7C3AED] text-white border-[#141416]',
    cardBorderClass: 'border-l-[#7C3AED]',
    glowClass: 'shadow-[0_0_8px_rgba(124,58,237,0.5)]',
  },
};

/**
 * Returns tier configuration for any confidence rating (0-5)
 */
export function getConfidenceTier(rating: number | undefined | null): ConfidenceTierConfig {
  const num = Math.round(Number(rating) || 0);
  const clamped = Math.max(0, Math.min(5, num));
  return CONFIDENCE_TIERS[clamped] || CONFIDENCE_TIERS[0];
}

/**
 * Maps a test score (out of 720 or given maxScore) to the universal 5-tier confidence hierarchy
 * - Score < 420 (or < 58%): Tier 1 (Crimson Red)
 * - Score 420-519 (58-71%): Tier 2 (Orange)
 * - Score 520-599 (72-82%): Tier 3 (Amber Gold)
 * - Score 600-649 (83-90%): Tier 4 (Cobalt Blue)
 * - Score 650+ (91%+): Tier 5 (Royal Violet)
 */
export function getScoreConfidenceTier(score: number, maxScore: number = 720): ConfidenceTierConfig {
  if (score === undefined || score === null || score <= 0) {
    return CONFIDENCE_TIERS[0];
  }
  const ratio = score / (maxScore || 720);
  const pct = ratio * 100;

  if (pct >= 90.2 || score >= 650) {
    return CONFIDENCE_TIERS[5]; // Royal Violet
  }
  if (pct >= 83.3 || score >= 600) {
    return CONFIDENCE_TIERS[4]; // Cobalt Blue
  }
  if (pct >= 72.2 || score >= 520) {
    return CONFIDENCE_TIERS[3]; // Amber Gold
  }
  if (pct >= 58.3 || score >= 420) {
    return CONFIDENCE_TIERS[2]; // Flame Orange
  }
  return CONFIDENCE_TIERS[1]; // Crimson Red
}

/**
 * Maps a generic percentage (0-100%) or coverage / completion value to the 5-tier system
 * - < 25%: Tier 1 (Crimson Red)
 * - 25-49%: Tier 2 (Orange)
 * - 50-74%: Tier 3 (Amber Gold)
 * - 75-89%: Tier 4 (Cobalt Blue)
 * - 90%+: Tier 5 (Royal Violet)
 */
export function getPercentageConfidenceTier(pct: number): ConfidenceTierConfig {
  if (pct === undefined || pct === null || pct <= 0) {
    return CONFIDENCE_TIERS[0];
  }
  if (pct >= 90) return CONFIDENCE_TIERS[5];
  if (pct >= 75) return CONFIDENCE_TIERS[4];
  if (pct >= 50) return CONFIDENCE_TIERS[3];
  if (pct >= 25) return CONFIDENCE_TIERS[2];
  return CONFIDENCE_TIERS[1];
}

/**
 * Maps chapter completion/coverage count out of total chapters to the 5-tier system
 */
export function getCountConfidenceTier(count: number, total: number): ConfidenceTierConfig {
  if (!total || total <= 0 || count <= 0) return CONFIDENCE_TIERS[0];
  const pct = (count / total) * 100;
  return getPercentageConfidenceTier(pct);
}

/**
 * Maps study streak in days to color tiers
 * - 0 days: Tier 0 (Slate)
 * - 1-2 days: Tier 2 (Flame Orange)
 * - 3-6 days: Tier 3 (Amber Gold)
 * - 7-13 days: Tier 4 (Cobalt Blue)
 * - 14+ days: Tier 5 (Royal Violet)
 */
export function getStreakTier(days: number): ConfidenceTierConfig {
  if (!days || days <= 0) return CONFIDENCE_TIERS[0];
  if (days >= 14) return CONFIDENCE_TIERS[5];
  if (days >= 7) return CONFIDENCE_TIERS[4];
  if (days >= 3) return CONFIDENCE_TIERS[3];
  return CONFIDENCE_TIERS[2];
}

/**
 * Maps daily study hours (or total hours) to color tiers based on study volume
 */
export function getHoursTier(hours: number, target: number = 6): ConfidenceTierConfig {
  if (!hours || hours <= 0) return CONFIDENCE_TIERS[0];
  const pct = (hours / target) * 100;
  if (pct >= 110) return CONFIDENCE_TIERS[5];
  if (pct >= 85) return CONFIDENCE_TIERS[4];
  if (pct >= 60) return CONFIDENCE_TIERS[3];
  if (pct >= 30) return CONFIDENCE_TIERS[2];
  return CONFIDENCE_TIERS[1];
}

/**
 * Maps syllabus pacing status to color tier
 */
export function getPaceTier(paceStatus: string): ConfidenceTierConfig {
  if (paceStatus === 'AHEAD') return CONFIDENCE_TIERS[5]; // Royal Violet
  if (paceStatus === 'ON_TRACK') return CONFIDENCE_TIERS[4]; // Cobalt Blue
  if (paceStatus === 'BEHIND') return CONFIDENCE_TIERS[1]; // Crimson Red
  return CONFIDENCE_TIERS[3]; // Amber
}

/**
 * Maps memory decay status to color tier
 */
export function getDecayStatusTier(status: string): ConfidenceTierConfig {
  if (status === 'critical') return CONFIDENCE_TIERS[1]; // Crimson Red
  if (status === 'warning') return CONFIDENCE_TIERS[2]; // Flame Orange
  if (status === 'moderate') return CONFIDENCE_TIERS[3]; // Amber
  if (status === 'fresh' || status === 'stable') return CONFIDENCE_TIERS[4]; // Cobalt Blue
  if (status === 'mastered') return CONFIDENCE_TIERS[5]; // Royal Violet
  return CONFIDENCE_TIERS[0];
}

/**
 * Maps revision count (e.g. Pass 1, 2, 3, 4+) to color tier
 */
export function getRevisionPassTier(pass: number): ConfidenceTierConfig {
  if (!pass || pass <= 0) return CONFIDENCE_TIERS[0];
  if (pass >= 4) return CONFIDENCE_TIERS[5];
  if (pass === 3) return CONFIDENCE_TIERS[4];
  if (pass === 2) return CONFIDENCE_TIERS[3];
  return CONFIDENCE_TIERS[2];
}

/**
 * Maps overdue days to urgency tier
 */
export function getOverdueDaysTier(daysDiff: number): ConfidenceTierConfig {
  if (daysDiff === 0) return CONFIDENCE_TIERS[3]; // Amber (Due Today)
  if (daysDiff < 0) {
    const overdueDays = Math.abs(daysDiff);
    if (overdueDays >= 5) return CONFIDENCE_TIERS[1]; // Crimson
    if (overdueDays >= 2) return CONFIDENCE_TIERS[2]; // Orange
    return CONFIDENCE_TIERS[2];
  }
  // Future due
  if (daysDiff <= 3) return CONFIDENCE_TIERS[4]; // Blue
  return CONFIDENCE_TIERS[0]; // Gray/normal
}

