import { Chapter, GeneratorMode, Test } from '../types';
import { getChapterRevisionInfo, getDaysDifference, getTodayStr } from './spacedRepetition';

export interface GeneratorResult {
  chapter: Chapter;
  mode: GeneratorMode;
  explanation: string;
  weightScore?: number;
  relativeProbabilityPercent?: number;
  isOverdue: boolean;
  daysSinceStudied: number | null;
  confidence: number;
}

/**
 * Computes weight for a chapter in Weighted Priority Mode.
 * - Lower confidence -> higher weight
 * - Unstudied -> high priority
 * - More days since studied -> higher weight
 * - Overdue -> additional multiplier boost
 */
export function computeChapterWeight(
  chapter: Chapter,
  tests: Test[],
  todayStr: string = getTodayStr()
): number {
  if (chapter.isArchived) return 0;

  let baseWeight = 1.0;

  // 1. Confidence Weight (inverse)
  if (chapter.currentConfidence === 0) {
    baseWeight = 4.0; // Unstudied priority
  } else if (chapter.currentConfidence === 1) {
    baseWeight = 6.0; // Very weak
  } else if (chapter.currentConfidence === 2) {
    baseWeight = 4.5; // Weak
  } else if (chapter.currentConfidence === 3) {
    baseWeight = 2.5; // Moderate
  } else if (chapter.currentConfidence === 4) {
    baseWeight = 1.2; // Good
  } else if (chapter.currentConfidence === 5) {
    baseWeight = 0.8; // Mastered
  }

  // 2. Days since last studied factor
  let daysFactor = 1.0;
  if (chapter.lastStudiedDate) {
    const daysSince = Math.max(0, getDaysDifference(chapter.lastStudiedDate, todayStr));
    // Gradual increase up to 3x for 30+ days
    daysFactor = 1.0 + Math.min(daysSince / 10, 3.0);
  } else {
    daysFactor = 2.5; // Never studied
  }

  // 3. Overdue & Deadline Urgency Boost
  const info = getChapterRevisionInfo(chapter, tests, todayStr);
  let urgencyBoost = 1.0;
  if (info.status === 'overdue') {
    const overdueDays = Math.abs(info.daysDiff);
    urgencyBoost += Math.min(overdueDays * 0.3, 3.0);
  } else if (info.status === 'due_today') {
    urgencyBoost += 0.8;
  }

  if (info.earliestTestDeadline && info.earliestTestDeadline.isUrgent) {
    urgencyBoost += 1.5; // Upcoming test inside 7 days
  }

  return baseWeight * daysFactor * urgencyBoost;
}

/**
 * Computes deterministic penalty score for Strict Worst-First mode.
 * Higher score = worse state = picked first.
 */
export function computeWorstFirstScore(
  chapter: Chapter,
  tests: Test[],
  todayStr: string = getTodayStr()
): number {
  if (chapter.isArchived) return -999999;

  const info = getChapterRevisionInfo(chapter, tests, todayStr);
  const confidence = chapter.currentConfidence === 0 ? 0 : chapter.currentConfidence;
  const daysSince = info.daysSinceLastStudied ?? 100;
  const overduePenalty = info.status === 'overdue' ? Math.abs(info.daysDiff) * 5 : 0;
  const deadlineBoost = info.earliestTestDeadline && info.earliestTestDeadline.isUrgent ? (8 - info.earliestTestDeadline.daysUntil) * 6 : 0;

  // Formula:
  // (5 - confidence) * 20 + daysSince * 2 - (revisionCount * 4) + overduePenalty + deadlineBoost
  return (5 - confidence) * 20 + daysSince * 2 - chapter.revisionCount * 4 + overduePenalty + deadlineBoost;
}

export function generateNextChapter(
  chapters: Chapter[],
  tests: Test[],
  mode: GeneratorMode,
  previousChapterId?: string,
  todayStr: string = getTodayStr()
): GeneratorResult | null {
  const activeChapters = chapters.filter((c) => !c.isArchived);
  if (activeChapters.length === 0) return null;

  // If more than 1 active chapter, try to avoid picking the exact same one immediately on re-roll if possible
  const pool = activeChapters.length > 1 && previousChapterId
    ? activeChapters.filter((c) => c.id !== previousChapterId)
    : activeChapters;

  if (mode === 'random') {
    // Mode 1: True Random (Uniform distribution)
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];
    const info = getChapterRevisionInfo(chosen, tests, todayStr);

    return {
      chapter: chosen,
      mode: 'random',
      explanation: 'Selected at random to test your recall across any part of the NEET syllabus.',
      relativeProbabilityPercent: Math.round((1 / pool.length) * 1000) / 10,
      isOverdue: info.status === 'overdue',
      daysSinceStudied: info.daysSinceLastStudied,
      confidence: chosen.currentConfidence,
    };
  }

  if (mode === 'worst_first') {
    // Mode 3: Strict Worst-First (Deterministic)
    const sorted = [...pool].sort((a, b) => {
      const scoreA = computeWorstFirstScore(a, tests, todayStr);
      const scoreB = computeWorstFirstScore(b, tests, todayStr);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return a.name.localeCompare(b.name);
    });

    const chosen = sorted[0];
    const info = getChapterRevisionInfo(chosen, tests, todayStr);
    const worstScore = computeWorstFirstScore(chosen, tests, todayStr);

    const confidenceLabel = chosen.currentConfidence === 0 ? 'not started yet' : `rated ${chosen.currentConfidence}/5 confidence`;
    const daysLabel = info.daysSinceLastStudied !== null ? `last revised ${info.daysSinceLastStudied} days ago` : 'never revised';
    const overdueLabel = info.status === 'overdue' ? `overdue by ${Math.abs(info.daysDiff)} days` : 'ready for review';

    return {
      chapter: chosen,
      mode: 'worst_first',
      explanation: `Highest urgency chapter: ${confidenceLabel}, ${daysLabel}, and ${overdueLabel}.`,
      weightScore: Math.round(worstScore),
      isOverdue: info.status === 'overdue',
      daysSinceStudied: info.daysSinceLastStudied,
      confidence: chosen.currentConfidence,
    };
  }

  // Mode 2: Weighted Priority (Default)
  const weights = pool.map((c) => computeChapterWeight(c, tests, todayStr));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight <= 0) {
    const chosen = pool[0];
    return {
      chapter: chosen,
      mode: 'weighted',
      explanation: 'Selected from active pool.',
      isOverdue: false,
      daysSinceStudied: null,
      confidence: chosen.currentConfidence,
    };
  }

  // Roulette wheel selection
  let randomVal = Math.random() * totalWeight;
  let chosenIndex = 0;
  for (let i = 0; i < pool.length; i++) {
    randomVal -= weights[i];
    if (randomVal <= 0) {
      chosenIndex = i;
      break;
    }
  }

  const chosen = pool[chosenIndex];
  const chosenWeight = weights[chosenIndex];
  const probPercent = Math.round((chosenWeight / totalWeight) * 1000) / 10;
  const info = getChapterRevisionInfo(chosen, tests, todayStr);

  const reasons: string[] = [];
  if (chosen.currentConfidence === 0) {
    reasons.push('unstudied status');
  } else if (chosen.currentConfidence <= 2) {
    reasons.push(`low confidence rating (${chosen.currentConfidence}/5)`);
  }
  if (info.daysSinceLastStudied && info.daysSinceLastStudied >= 7) {
    reasons.push(`${info.daysSinceLastStudied} days elapsed`);
  }
  if (info.status === 'overdue') {
    reasons.push(`overdue revision by ${Math.abs(info.daysDiff)} days`);
  }
  if (info.earliestTestDeadline?.isUrgent) {
    reasons.push(`test deadline approaching in ${info.earliestTestDeadline.daysUntil} days`);
  }

  const reasonStr = reasons.length > 0 ? reasons.join(', ') : 'spaced repetition priority balance';

  return {
    chapter: chosen,
    mode: 'weighted',
    explanation: `Weighted draw (${probPercent}% draw probability). Prioritized due to ${reasonStr}. Higher confidence topics remain possible to draw.`,
    weightScore: Math.round(chosenWeight * 10) / 10,
    relativeProbabilityPercent: probPercent,
    isOverdue: info.status === 'overdue',
    daysSinceStudied: info.daysSinceLastStudied,
    confidence: chosen.currentConfidence,
  };
}
