import { Chapter, LearningStage, SpacedRepetitionSettings, StudyLog, StudySessionType, SyllabusPacingSettings, Test, TestScore } from '../types';

/**
 * Calculates next revision gap in days based on revision number and confidence rating.
 * Default sequence: Day 3 -> Day 7 -> Day 14 -> Day 30
 * Adjusted by confidence multiplier:
 *  - 1-2: 0.5x (struggling chapters resurface sooner)
 *  - 3: 1.0x (standard)
 *  - 4-5: 1.5x (strong chapters get breathing room)
 */
export function calculateNextGap(
  revisionNumber: number,
  confidenceRating: number,
  settings?: SpacedRepetitionSettings
): number {
  const gaps = settings?.defaultGaps && settings.defaultGaps.length > 0 ? settings.defaultGaps : [3, 7, 14, 30];
  
  // Index for gap: revision 1 -> gaps[0], revision 2 -> gaps[1], etc.
  const gapIndex = Math.min(Math.max(0, revisionNumber - 1), gaps.length - 1);
  const baseGap = gaps[gapIndex];

  const defaultMults: Record<number, number> = { 1: 0.5, 2: 0.5, 3: 1.0, 4: 1.5, 5: 1.5 };
  const multiplier =
    settings?.confidenceMultipliers?.[confidenceRating as keyof typeof settings.confidenceMultipliers] ??
    defaultMults[confidenceRating] ??
    1.0;

  const adjustedGap = Math.round(baseGap * multiplier);
  return Math.max(1, adjustedGap);
}

/**
 * Adds N days to a YYYY-MM-DD date string using local date math.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  if (!dateStr || typeof dateStr !== 'string') return getTodayStr();
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return getTodayStr();
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes difference in days between two YYYY-MM-DD dates (d2 - d1).
 */
export function getDaysDifference(d1Str: string, d2Str: string): number {
  if (!d1Str || !d2Str || typeof d1Str !== 'string' || typeof d2Str !== 'string') return 0;
  const [y1, m1, day1] = d1Str.split('-').map(Number);
  const [y2, m2, day2] = d2Str.split('-').map(Number);
  if (!y1 || !m1 || !day1 || !y2 || !m2 || !day2) return 0;
  const date1 = new Date(y1, m1 - 1, day1);
  const date2 = new Date(y2, m2 - 1, day2);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export type RevisionStatus = 'not_started' | 'in_progress' | 'overdue' | 'due_today' | 'due_soon' | 'scheduled';

export interface ChapterRevisionInfo {
  status: RevisionStatus;
  learningStage: LearningStage;
  completionPercentage: number;
  daysActive: number; // days since chapter was first started
  daysTakenToComplete: number | null;
  daysDiff: number; // e.g. -4 means overdue by 4 days, +2 means due in 2 days
  daysSinceLastStudied: number | null;
  earliestTestDeadline: {
    test: Test;
    daysUntil: number;
    isUrgent: boolean; // <= 7 days
  } | null;
  isCriticalRisk: boolean; // Low confidence (<=2) AND overdue
}

export function getChapterRevisionInfo(
  chapter: Chapter,
  tests: Test[],
  todayStr: string = getTodayStr()
): ChapterRevisionInfo {
  let daysSinceLastStudied: number | null = null;
  if (chapter.lastStudiedDate) {
    daysSinceLastStudied = getDaysDifference(chapter.lastStudiedDate, todayStr);
  }

  // Derive completion percentage
  let completionPercentage = chapter.completionPercentage ?? 0;
  if (chapter.learningStage === 'FIRST_PASS_DONE' || chapter.learningStage === 'IN_REVISION' || chapter.revisionCount >= 1) {
    completionPercentage = 100;
  } else if (chapter.learningStage === 'NOT_STARTED' && completionPercentage === 0) {
    completionPercentage = 0;
  } else if (completionPercentage === 0 && (chapter.lastStudiedDate || chapter.currentConfidence > 0)) {
    completionPercentage = 25; // default initial progress if studied
  }

  // Derive learning stage if not explicitly set
  let stage: LearningStage = chapter.learningStage || 'NOT_STARTED';
  if (!chapter.learningStage) {
    if (chapter.revisionCount >= 1 || completionPercentage >= 100) {
      stage = chapter.revisionCount > 1 ? 'IN_REVISION' : 'FIRST_PASS_DONE';
    } else if (completionPercentage > 0 || chapter.lastStudiedDate) {
      stage = 'IN_PROGRESS';
    } else {
      stage = 'NOT_STARTED';
    }
  }

  // Calculate days active since started
  let daysActive = 0;
  if (chapter.startedDate) {
    daysActive = Math.max(1, getDaysDifference(chapter.startedDate, todayStr) + 1);
  } else if (chapter.lastStudiedDate) {
    daysActive = Math.max(1, getDaysDifference(chapter.lastStudiedDate, todayStr) + 1);
  }

  let status: RevisionStatus = 'not_started';
  let daysDiff = 0;

  if (stage === 'NOT_STARTED' || completionPercentage === 0) {
    status = 'not_started';
  } else if (stage === 'IN_PROGRESS' || completionPercentage < 100) {
    status = 'in_progress';
  } else {
    // Fallback nextRevisionDate if missing on a completed chapter
    const effectiveNextRevisionDate =
      chapter.nextRevisionDate ||
      (chapter.lastStudiedDate || chapter.firstPassCompletedDate
        ? addDaysToDateStr(
            (chapter.lastStudiedDate || chapter.firstPassCompletedDate)!,
            calculateNextGap(chapter.revisionCount || 1, chapter.currentConfidence || 3)
          )
        : null);

    if (!effectiveNextRevisionDate) {
      status = 'scheduled';
    } else {
      // daysDiff = nextRevisionDate - today
      daysDiff = getDaysDifference(todayStr, effectiveNextRevisionDate);

      // Only mark as resolved if the chapter was studied on or after its scheduled revision date
      const isResolvedOnOrAfterDue = Boolean(
        chapter.lastStudiedDate && chapter.lastStudiedDate >= effectiveNextRevisionDate
      );

      if (daysDiff < 0) {
        status = isResolvedOnOrAfterDue ? 'scheduled' : 'overdue';
      } else if (daysDiff === 0) {
        status = isResolvedOnOrAfterDue ? 'scheduled' : 'due_today';
      } else if (daysDiff <= 2) {
        status = 'due_soon';
      } else {
        status = 'scheduled';
      }
    }
  }

  // Find linked tests with date >= today
  const linkedTests = tests.filter((t) => t.linkedChapterIds.includes(chapter.id));
  const upcomingTests = linkedTests
    .map((t) => {
      const daysUntil = getDaysDifference(todayStr, t.date);
      return {
        test: t,
        daysUntil,
        isUrgent: daysUntil >= 0 && daysUntil <= 7,
      };
    })
    .filter((item) => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const earliestTestDeadline = upcomingTests.length > 0 ? upcomingTests[0] : null;

  // Critical risk: Low confidence (1 or 2) AND (overdue OR urgent test without completion)
  const isCriticalRisk =
    !chapter.isArchived &&
    ((chapter.currentConfidence > 0 && chapter.currentConfidence <= 2 && status === 'overdue') ||
     (earliestTestDeadline?.isUrgent && (stage === 'NOT_STARTED' || stage === 'IN_PROGRESS' || completionPercentage < 100)));

  return {
    status,
    learningStage: stage,
    completionPercentage,
    daysActive,
    daysTakenToComplete: chapter.daysTakenToComplete ?? null,
    daysDiff,
    daysSinceLastStudied,
    earliestTestDeadline,
    isCriticalRisk,
  };
}

/**
 * Creates a new study log and updates the chapter state immutably.
 */
export function applyStudyLogToChapter(
  chapter: Chapter,
  confidenceRating: number,
  dateStudied: string,
  note: string | undefined,
  existingLogsForChapterCount: number,
  settings: SpacedRepetitionSettings,
  sessionType: StudySessionType = 'progress',
  completionPercentage?: number,
  pillarsCompleted?: Chapter['pillars'],
  hoursSpent?: number
): { updatedChapter: Chapter; newLog: StudyLog } {
  let newRevisionCount = chapter.revisionCount;
  let newStage: LearningStage = chapter.learningStage || 'IN_PROGRESS';
  let nextRevisionDate = chapter.nextRevisionDate;
  
  const startedDate = chapter.startedDate || dateStudied;
  let firstPassCompletedDate = chapter.firstPassCompletedDate || null;
  let daysTakenToComplete = chapter.daysTakenToComplete ?? null;

  // Determine final percentage for this log
  let finalPercentage = completionPercentage !== undefined ? completionPercentage : (chapter.completionPercentage ?? 50);

  const wasAlreadyCompleted =
    chapter.learningStage === 'FIRST_PASS_DONE' ||
    chapter.learningStage === 'IN_REVISION' ||
    (chapter.revisionCount || 0) >= 1 ||
    (chapter.completionPercentage || 0) >= 100;

  if (
    sessionType === 'revision_round_complete' ||
    (wasAlreadyCompleted && sessionType === 'first_pass_complete')
  ) {
    // Finished revision round for already completed chapter
    finalPercentage = 100;
    newStage = 'IN_REVISION';
    newRevisionCount = Math.max(2, (chapter.revisionCount || 1) + 1);
    firstPassCompletedDate = chapter.firstPassCompletedDate || dateStudied;
    if (!daysTakenToComplete) {
      daysTakenToComplete = Math.max(1, getDaysDifference(startedDate, firstPassCompletedDate) + 1);
    }
    const nextGapDays = calculateNextGap(newRevisionCount, confidenceRating, settings);
    nextRevisionDate = addDaysToDateStr(dateStudied, nextGapDays);
  } else if (!wasAlreadyCompleted && (sessionType === 'first_pass_complete' || finalPercentage >= 100)) {
    // Reached 100% first pass milestone for the first time!
    finalPercentage = 100;
    newStage = 'FIRST_PASS_DONE';
    newRevisionCount = 1;
    firstPassCompletedDate = chapter.firstPassCompletedDate || dateStudied;
    daysTakenToComplete = Math.max(1, getDaysDifference(startedDate, dateStudied) + 1);

    // Schedule first spaced repetition (Day 3 by default)
    const nextGapDays = calculateNextGap(newRevisionCount, confidenceRating, settings);
    nextRevisionDate = addDaysToDateStr(dateStudied, nextGapDays);
  } else if (wasAlreadyCompleted) {
    // Supplementary progress / pillar / confidence update on an already completed chapter
    finalPercentage = 100;
    newStage = chapter.learningStage === 'IN_REVISION' ? 'IN_REVISION' : 'FIRST_PASS_DONE';
    newRevisionCount = Math.max(1, chapter.revisionCount || 1);
    firstPassCompletedDate = chapter.firstPassCompletedDate || dateStudied;
    const nextGapDays = calculateNextGap(newRevisionCount, confidenceRating, settings);
    nextRevisionDate = addDaysToDateStr(dateStudied, nextGapDays);
  } else {
    // sessionType === 'progress' (In-progress chapter multi-day study)
    newStage = 'IN_PROGRESS';
    finalPercentage = Math.min(95, Math.max(10, finalPercentage));
    newRevisionCount = 0; // Remains 0 until 100% complete
    nextRevisionDate = null; // NOT in revision yet!
  }

  // Merge pillars (consolidating bookReading and ncertReading alias)
  const rawMergedPillars = {
    ...(chapter.pillars || {}),
    ...(pillarsCompleted || {}),
  };
  const hasBook = Boolean(rawMergedPillars.bookReading || rawMergedPillars.ncertReading);
  const mergedPillars = {
    ...rawMergedPillars,
    bookReading: hasBook,
    ncertReading: hasBook,
  };

  const newLog: StudyLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    chapterId: chapter.id,
    chapterName: chapter.name,
    subject: chapter.subject,
    dateStudied,
    sessionType,
    completionPercentage: finalPercentage,
    pillarsCompleted: mergedPillars,
    hoursSpent,
    confidenceRating,
    revisionNumber: (sessionType === 'progress' && finalPercentage < 100) ? 0 : newRevisionCount,
    note: note?.trim() || undefined,
    timestamp: Date.now(),
  };

  const updatedChapter: Chapter = {
    ...chapter,
    currentConfidence: confidenceRating,
    lastStudiedDate: dateStudied,
    startedDate,
    firstPassCompletedDate,
    daysTakenToComplete,
    completionPercentage: finalPercentage,
    pillars: mergedPillars,
    totalStudySessions: (chapter.totalStudySessions || existingLogsForChapterCount || 0) + 1,
    nextRevisionDate,
    revisionCount: newRevisionCount,
    learningStage: newStage,
    updatedAt: Date.now(),
  };

  return { updatedChapter, newLog };
}

/**
 * Recalculates chapter progress, pillars, confidence, and revision schedule
 * when an existing study log is deleted or history is cleared.
 */
export function recalculateChapterFromRemainingLogs(
  chapter: Chapter,
  remainingLogs: StudyLog[],
  settings: SpacedRepetitionSettings
): Chapter {
  // Always strictly filter logs belonging to this specific chapter
  const chapterLogs = remainingLogs.filter((l) => l.chapterId === chapter.id);

  if (chapterLogs.length === 0) {
    return {
      ...chapter,
      currentConfidence: 0,
      lastStudiedDate: undefined,
      startedDate: undefined,
      firstPassCompletedDate: undefined,
      daysTakenToComplete: undefined,
      completionPercentage: 0,
      pillars: {
        lectures: false,
        bookReading: false,
        ncertReading: false,
        classNotes: false,
        questionPractice: false,
        anki: false,
      },
      totalStudySessions: 0,
      nextRevisionDate: null,
      revisionCount: 0,
      learningStage: 'NOT_STARTED',
      updatedAt: Date.now(),
    };
  }

  // Sort logs chronologically ascending by dateStudied first, then timestamp
  const sorted = [...chapterLogs].sort(
    (a, b) => (a.dateStudied || '').localeCompare(b.dateStudied || '') || (a.timestamp || 0) - (b.timestamp || 0)
  );

  const earliestLog = sorted[0];
  const latestLog = sorted[sorted.length - 1];

  const startedDate = earliestLog.dateStudied;
  const lastStudiedDate = latestLog.dateStudied;
  const currentConfidence = latestLog.confidenceRating || 3;

  // Aggregate pillars across remaining logs for this chapter
  const aggregatedPillars: Chapter['pillars'] = {
    lectures: sorted.some((l) => !!l.pillarsCompleted?.lectures),
    bookReading: sorted.some((l) => !!(l.pillarsCompleted?.bookReading || l.pillarsCompleted?.ncertReading)),
    ncertReading: sorted.some((l) => !!(l.pillarsCompleted?.bookReading || l.pillarsCompleted?.ncertReading)),
    classNotes: sorted.some((l) => !!l.pillarsCompleted?.classNotes),
    questionPractice: sorted.some((l) => !!l.pillarsCompleted?.questionPractice),
    anki: sorted.some((l) => !!l.pillarsCompleted?.anki),
  };

  // Find 100% first pass completion logs
  const firstPassLog = sorted.find(
    (l) => l.sessionType === 'first_pass_complete' || (l.completionPercentage !== undefined && l.completionPercentage >= 100)
  );

  let learningStage: LearningStage = 'IN_PROGRESS';
  let completionPercentage = 0;
  let firstPassCompletedDate: string | null = null;
  let daysTakenToComplete: number | null = null;
  let nextRevisionDate: string | null = null;
  let revisionCount = 0;

  if (firstPassLog) {
    firstPassCompletedDate = firstPassLog.dateStudied;
    daysTakenToComplete = Math.max(1, getDaysDifference(startedDate, firstPassCompletedDate) + 1);
    completionPercentage = 100;

    // Count how many revision rounds happened
    const revisionLogs = sorted.filter(
      (l) => l.sessionType === 'revision_round_complete' || l.revisionNumber > 1
    );
    revisionCount = 1 + revisionLogs.length;
    learningStage = revisionCount > 1 ? 'IN_REVISION' : 'FIRST_PASS_DONE';

    // Calculate next scheduled revision based on latest log
    const nextGapDays = calculateNextGap(revisionCount, currentConfidence, settings);
    nextRevisionDate = addDaysToDateStr(lastStudiedDate, nextGapDays);
  } else {
    // No first pass completion in remaining logs
    // Calculate distinct study pillars (consolidating bookReading and ncertReading alias)
    const distinctPillarsCount = [
      aggregatedPillars.lectures,
      aggregatedPillars.bookReading || aggregatedPillars.ncertReading,
      aggregatedPillars.classNotes,
      aggregatedPillars.questionPractice,
      aggregatedPillars.anki,
    ].filter(Boolean).length;

    if (latestLog.completionPercentage !== undefined && latestLog.completionPercentage !== null) {
      completionPercentage = Math.min(95, Math.max(0, latestLog.completionPercentage));
    } else {
      completionPercentage = Math.min(90, Math.round((distinctPillarsCount / 5) * 100));
    }

    if (completionPercentage > 0 || distinctPillarsCount > 0) {
      learningStage = 'IN_PROGRESS';
    } else {
      learningStage = 'NOT_STARTED';
      completionPercentage = 0;
    }

    firstPassCompletedDate = null;
    daysTakenToComplete = null;
    revisionCount = 0;
    nextRevisionDate = null;
  }

  return {
    ...chapter,
    currentConfidence,
    lastStudiedDate,
    startedDate: startedDate || null,
    firstPassCompletedDate,
    daysTakenToComplete,
    completionPercentage,
    pillars: aggregatedPillars,
    totalStudySessions: chapterLogs.length,
    nextRevisionDate,
    revisionCount,
    learningStage,
    updatedAt: Date.now(),
  };
}

export type MemoryDecayStatus = 'critical' | 'warning' | 'safe' | 'unstudied';

export interface ChapterMemoryRetention {
  retentionPct: number; // 0 to 100
  decayStatus: MemoryDecayStatus;
  memoryStabilityDays: number;
  halfLifeDays: number;
  daysSinceLastStudied: number | null;
  daysUntilCritical: number;
  projectedRetention7d: number;
  projectedRetention14d: number;
  projectedRetention30d: number;
  projectedRetention60d: number;
}

/**
 * Calculates Ebbinghaus Retention Probability R(t) = e^(-t / S) * 100%
 * where S is Memory Stability (days) derived from revision passes and confidence rating.
 */
export function calculateMemoryRetention(
  chapter: Chapter,
  todayStr: string = getTodayStr()
): ChapterMemoryRetention {
  if (!chapter.lastStudiedDate || chapter.currentConfidence === 0) {
    return {
      retentionPct: 0,
      decayStatus: 'unstudied',
      memoryStabilityDays: 1,
      halfLifeDays: 1,
      daysSinceLastStudied: null,
      daysUntilCritical: 0,
      projectedRetention7d: 0,
      projectedRetention14d: 0,
      projectedRetention30d: 0,
      projectedRetention60d: 0,
    };
  }

  const daysSince = Math.max(0, getDaysDifference(chapter.lastStudiedDate, todayStr));
  
  // Confidence multiplier (1 = 0.4, 2 = 0.65, 3 = 1.0, 4 = 1.45, 5 = 2.0)
  const confMap: Record<number, number> = {
    1: 0.45,
    2: 0.7,
    3: 1.0,
    4: 1.5,
    5: 2.1,
  };
  const confMult = confMap[chapter.currentConfidence] || 1.0;

  // Revision passes base strength (R1 = ~7 days base, R2 = ~16 days, R3 = ~32 days, R4+ = ~60+ days)
  const passMultiplier = Math.max(1, (chapter.revisionCount || 1));
  const baseStability = passMultiplier === 1 ? 8 : passMultiplier === 2 ? 18 : passMultiplier === 3 ? 36 : 60;
  
  const S = Math.max(1.5, baseStability * confMult);
  const halfLifeDays = Math.round(S * Math.LN2);

  // R(t) = exp(-t / S)
  const retentionRaw = Math.exp(-daysSince / S) * 100;
  const retentionPct = Math.min(100, Math.max(0, Math.round(retentionRaw)));

  // Days until critical (< 50% retention): solve exp(-t / S) = 0.50 => t = S * ln(2)
  const criticalTime = S * Math.LN2;
  const daysUntilCritical = Math.max(0, Math.round(criticalTime - daysSince));

  // Future projections
  const p7 = Math.round(Math.exp(-(daysSince + 7) / S) * 100);
  const p14 = Math.round(Math.exp(-(daysSince + 14) / S) * 100);
  const p30 = Math.round(Math.exp(-(daysSince + 30) / S) * 100);
  const p60 = Math.round(Math.exp(-(daysSince + 60) / S) * 100);

  let decayStatus: MemoryDecayStatus = 'safe';
  if (retentionPct < 50) {
    decayStatus = 'critical';
  } else if (retentionPct < 70) {
    decayStatus = 'warning';
  }

  return {
    retentionPct,
    decayStatus,
    memoryStabilityDays: Math.round(S * 10) / 10,
    halfLifeDays,
    daysSinceLastStudied: daysSince,
    daysUntilCritical,
    projectedRetention7d: p7,
    projectedRetention14d: p14,
    projectedRetention30d: p30,
    projectedRetention60d: p60,
  };
}

/**
 * Computes count of chapters where a revision successfully rescued them from critical/warning decay.
 */
export function getDecayPreventedStats(
  chapters: Chapter[],
  studyLogs: StudyLog[]
): {
  totalSavedCount: number;
  rescuedChapters: { chapter: Chapter; prevConfidence: number; currentConfidence: number; savedDate: string }[];
} {
  const rescuedChapters: { chapter: Chapter; prevConfidence: number; currentConfidence: number; savedDate: string }[] = [];
  let totalSavedCount = 0;

  chapters.forEach((ch) => {
    const chLogs = studyLogs
      .filter((l) => l.chapterId === ch.id)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (chLogs.length >= 2) {
      for (let i = 1; i < chLogs.length; i++) {
        const prev = chLogs[i - 1];
        const curr = chLogs[i];
        const gap = getDaysDifference(prev.dateStudied, curr.dateStudied);
        if (gap >= 7 || (prev.confidenceRating <= 2 && curr.confidenceRating >= 3)) {
          totalSavedCount++;
          if (i === chLogs.length - 1) {
            rescuedChapters.push({
              chapter: ch,
              prevConfidence: prev.confidenceRating,
              currentConfidence: curr.confidenceRating,
              savedDate: curr.dateStudied,
            });
          }
        }
      }
    }
  });

  return { totalSavedCount, rescuedChapters };
}

export interface SyllabusPacingResult {
  totalChapters: number;
  completed1stPassCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionPercentage: number;
  remaining1stPassCount: number;
  daysUntilSyllabusTarget: number;
  weeksUntilSyllabusTarget: number;
  required1stPassVelocityPerWeek: number;
  required1stPassVelocityPerDay: number;
  actualWeeklyVelocity: number;
  daysFromSyllabusTargetToExam: number;
  weeksFromSyllabusTargetToExam: number;
  targetRevisionPasses: number;
  requiredRevisionPassVelocityPerWeek: number;
  totalTestsPlanned: number;
  testsCompletedCount: number;
  testsRemainingCount: number;
  requiredTestFrequencyDays: number;
  paceStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
  paceDeltaChapters: number;
  projectedCompletionDate: string;
  projectedDaysDelta: number; // positive = ahead (finishes earlier), negative = behind (finishes later)
  startDate: string;
  todayDate: string;
  targetSyllabusDate: string;
  targetExamDate: string;
  trajectoryPoints: { date: string; label: string; actual: number; target: number; projected?: number }[];
}

export function calculateSyllabusPacing(
  chapters: Chapter[],
  studyLogs: StudyLog[],
  tests: Test[],
  testScores: TestScore[],
  pacingSettings?: SyllabusPacingSettings,
  todayStr: string = getTodayStr()
): SyllabusPacingResult {
  const safeSettings: SyllabusPacingSettings = {
    targetSyllabusDate: pacingSettings?.targetSyllabusDate || '2026-12-31',
    targetExamDate: pacingSettings?.targetExamDate || '2027-05-02',
    targetRevisionPasses: pacingSettings?.targetRevisionPasses ?? 3,
    targetMockTestsCount: pacingSettings?.targetMockTestsCount ?? 25,
    includeAllTestsGoal: pacingSettings?.includeAllTestsGoal ?? true,
    studyDaysPerWeek: pacingSettings?.studyDaysPerWeek ?? 7,
  };

  const activeChapters = chapters.filter((c) => !c.isArchived);
  const totalChapters = activeChapters.length || 86;

  let completed1stPassCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;

  activeChapters.forEach((ch) => {
    const stage = ch.learningStage;
    if (
      stage === 'FIRST_PASS_DONE' ||
      stage === 'IN_REVISION' ||
      (ch.completionPercentage && ch.completionPercentage >= 100) ||
      ch.revisionCount >= 1
    ) {
      completed1stPassCount++;
    } else if (stage === 'IN_PROGRESS' || (ch.completionPercentage && ch.completionPercentage > 0) || ch.lastStudiedDate) {
      inProgressCount++;
    } else {
      notStartedCount++;
    }
  });

  const remaining1stPassCount = Math.max(0, totalChapters - completed1stPassCount);
  const completionPercentage = totalChapters > 0 ? Math.round((completed1stPassCount / totalChapters) * 100) : 0;

  // Baseline start date (Session kickoff)
  const baselineStartDate = '2026-01-01';
  const totalWindowDays = Math.max(10, getDaysDifference(baselineStartDate, safeSettings.targetSyllabusDate));
  const elapsedDays = Math.max(1, getDaysDifference(baselineStartDate, todayStr));

  // Determine active study period based on study logs and completed chapters
  let earliestStudyDate: string | null = null;
  studyLogs.forEach((l) => {
    if (l.dateStudied && (!earliestStudyDate || l.dateStudied < earliestStudyDate)) {
      earliestStudyDate = l.dateStudied;
    }
  });
  activeChapters.forEach((ch) => {
    if (ch.startedDate && (!earliestStudyDate || ch.startedDate < earliestStudyDate)) {
      earliestStudyDate = ch.startedDate;
    }
    if (ch.firstPassCompletedDate && (!earliestStudyDate || ch.firstPassCompletedDate < earliestStudyDate)) {
      earliestStudyDate = ch.firstPassCompletedDate;
    }
  });

  // Calculate recent 30-day velocity if chapters were completed recently
  const thirtyDaysAgo = addDaysToDateStr(todayStr, -30);
  const recentCompletedIn30Days = activeChapters.filter(
    (c) => c.firstPassCompletedDate && c.firstPassCompletedDate >= thirtyDaysAgo
  ).length;
  const recentWeeklyPace = recentCompletedIn30Days > 0 ? (recentCompletedIn30Days / (30 / 7)) : 0;

  // Active study duration pace
  const activeStudyDays = earliestStudyDate ? Math.max(7, getDaysDifference(earliestStudyDate, todayStr)) : elapsedDays;
  const activeWeeklyPace = completed1stPassCount > 0 ? (completed1stPassCount / (activeStudyDays / 7)) : 0;

  // Days until Syllabus Completion Deadline
  const daysUntilSyllabusTarget = Math.max(1, getDaysDifference(todayStr, safeSettings.targetSyllabusDate));
  const weeksUntilSyllabusTarget = Math.max(0.1, daysUntilSyllabusTarget / 7);
  const studyDaysPerWeek = Math.max(1, Math.min(7, safeSettings.studyDaysPerWeek || 7));
  const activeStudyDaysUntilSyllabus = Math.max(1, daysUntilSyllabusTarget * (studyDaysPerWeek / 7));

  // Required 1st Pass Velocity to meet target (per week and per active study day)
  const required1stPassVelocityPerWeek = Math.round((remaining1stPassCount / weeksUntilSyllabusTarget) * 10) / 10;
  const required1stPassVelocityPerDay = Math.round((remaining1stPassCount / activeStudyDaysUntilSyllabus) * 100) / 100;

  // Actual Weekly Velocity
  // Pick the most representative non-zero velocity (recent pace or active pace), fallback to 1.5
  const measuredWeeklyPace = Math.max(recentWeeklyPace, activeWeeklyPace);
  const actualWeeklyVelocity = measuredWeeklyPace > 0.1 ? Math.round(measuredWeeklyPace * 10) / 10 : 1.5; // realistic fallback 1.5 ch/wk
  const actualDailyVelocity = actualWeeklyVelocity / 7;

  // Days needed at current actual pace to finish remaining 1st pass chapters
  const daysNeededAtCurrentPace = remaining1stPassCount > 0 ? Math.round(remaining1stPassCount / Math.max(0.05, actualDailyVelocity)) : 0;
  const projectedCompletionDate = remaining1stPassCount === 0 ? todayStr : addDaysToDateStr(todayStr, daysNeededAtCurrentPace);

  // Days difference between projected date and target date
  // Positive = finishes before deadline (ahead), negative = finishes after deadline (behind)
  const projectedDaysDelta = getDaysDifference(projectedCompletionDate, safeSettings.targetSyllabusDate);

  // Days from Syllabus Target to Exam Date
  const daysFromSyllabusTargetToExam = Math.max(1, getDaysDifference(safeSettings.targetSyllabusDate, safeSettings.targetExamDate));
  const weeksFromSyllabusTargetToExam = Math.max(0.1, daysFromSyllabusTargetToExam / 7);

  // Remaining revision operations needed after 1st pass, crediting already-completed extra revisions
  const targetRevPasses = safeSettings.targetRevisionPasses || 3;
  const totalRevisionOperationsNeeded = activeChapters.reduce((sum, ch) => {
    const completedExtraRevs = Math.max(0, (ch.revisionCount || 0) - 1);
    return sum + Math.max(0, targetRevPasses - completedExtraRevs);
  }, 0);
  const requiredRevisionPassVelocityPerWeek = Math.round((totalRevisionOperationsNeeded / weeksFromSyllabusTargetToExam) * 10) / 10;

  // Test Cadence (distinct testIds completed)
  const totalTestsPlanned = safeSettings.includeAllTestsGoal ? Math.max(tests.length, safeSettings.targetMockTestsCount) : safeSettings.targetMockTestsCount;
  const testsCompletedCount = new Set(testScores.map((s) => s.testId)).size;
  const testsRemainingCount = Math.max(0, totalTestsPlanned - testsCompletedCount);
  const totalDaysUntilExam = Math.max(1, getDaysDifference(todayStr, safeSettings.targetExamDate));
  const requiredTestFrequencyDays = testsRemainingCount > 0 ? Math.max(1, Math.round(totalDaysUntilExam / testsRemainingCount)) : 7;

  // Pacing status calculation: synchronized with required velocity and projected completion date
  let paceStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND' = 'ON_TRACK';
  if (remaining1stPassCount === 0) {
    paceStatus = 'AHEAD';
  } else if (projectedDaysDelta >= 7 || (actualWeeklyVelocity >= required1stPassVelocityPerWeek * 1.15 && projectedDaysDelta >= 0)) {
    paceStatus = 'AHEAD';
  } else if (projectedDaysDelta <= -7 || actualWeeklyVelocity < required1stPassVelocityPerWeek * 0.85) {
    paceStatus = 'BEHIND';
  } else {
    paceStatus = 'ON_TRACK';
  }

  // Chapters ahead (positive) or behind (negative) relative to meeting syllabus target on time
  const paceDeltaChapters = remaining1stPassCount === 0
    ? 0
    : Math.round(projectedDaysDelta * actualDailyVelocity);

  // Generate milestone curve points with real dates
  // Month points from baselineStartDate to targetSyllabusDate
  const trajectoryPoints: { date: string; label: string; actual: number; target: number; projected?: number }[] = [];
  
  const stepCount = 6;
  for (let i = 0; i <= stepCount; i++) {
    const frac = i / stepCount;
    const daysOffset = Math.round(totalWindowDays * frac);
    const dateStr = addDaysToDateStr(baselineStartDate, daysOffset);
    const target = Math.round(totalChapters * frac);
    const isPastOrToday = getDaysDifference(dateStr, todayStr) >= 0;

    let actual = 0;
    let projected = 0;

    if (frac === 0) {
      actual = 0;
      projected = 0;
    } else if (isPastOrToday) {
      // Historical actual curve up to today
      const progressRatio = Math.min(1, elapsedDays > 0 ? (daysOffset / elapsedDays) : 0);
      actual = Math.round(completed1stPassCount * progressRatio);
      projected = actual;
    } else {
      // Future projection starting from today
      const futureDaysFromToday = getDaysDifference(todayStr, dateStr);
      const projectedGain = Math.round(futureDaysFromToday * actualDailyVelocity);
      projected = Math.min(totalChapters, completed1stPassCount + projectedGain);
      actual = completed1stPassCount;
    }

    const [yNum, mNum] = dateStr.split('-').map(Number);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = mNum && yNum ? `${monthNames[mNum - 1]} '${String(yNum).slice(2)}` : dateStr;

    trajectoryPoints.push({
      date: dateStr,
      label: i === 0 ? 'Jan 26' : i === stepCount ? 'Dec 26' : monthLabel,
      actual,
      target,
      projected,
    });
  }

  return {
    totalChapters,
    completed1stPassCount,
    inProgressCount,
    notStartedCount,
    completionPercentage,
    remaining1stPassCount,
    daysUntilSyllabusTarget,
    weeksUntilSyllabusTarget,
    required1stPassVelocityPerWeek,
    required1stPassVelocityPerDay,
    actualWeeklyVelocity,
    daysFromSyllabusTargetToExam,
    weeksFromSyllabusTargetToExam,
    targetRevisionPasses: safeSettings.targetRevisionPasses || 3,
    requiredRevisionPassVelocityPerWeek,
    totalTestsPlanned,
    testsCompletedCount,
    testsRemainingCount,
    requiredTestFrequencyDays,
    paceStatus,
    paceDeltaChapters,
    projectedCompletionDate,
    projectedDaysDelta,
    startDate: baselineStartDate,
    todayDate: todayStr,
    targetSyllabusDate: safeSettings.targetSyllabusDate,
    targetExamDate: safeSettings.targetExamDate,
    trajectoryPoints,
  };
}

