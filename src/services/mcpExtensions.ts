import {
  ActionLog,
  AppState,
  Chapter,
  LearningStage,
  SpacedRepetitionSettings,
  StudyLog,
  StudyPillars,
  StudySessionType,
  Subject,
  SyllabusPacingSettings,
  Test,
  TestScore,
} from '../types';
import {
  addDaysToDateStr,
  calculateMemoryRetention,
  calculateNextGap,
  calculateSyllabusPacing,
  getDaysDifference,
  getTodayStr,
} from './spacedRepetition';

// ============================================================================
// 1. DAILY SUMMARY INTELLIGENCE
// ============================================================================

export interface DailySummaryResult {
  date: string;
  isToday: boolean;
  studyHoursToday: number;
  sessionsLoggedToday: number;
  chaptersReviewedToday: Array<{
    id: string;
    name: string;
    subject: Subject;
    confidence: number;
    hours: number;
    sessionType: StudySessionType;
    note?: string;
  }>;
  chaptersDueTodayCount: number;
  chaptersDueTodayList: Array<{ id: string; name: string; subject: Subject; confidence: number }>;
  chaptersOverdueCount: number;
  chaptersOverdueList: Array<{ id: string; name: string; subject: Subject; daysOverdue: number; confidence: number }>;
  activeStreakDays: number;
  syllabusPacingRunway: {
    targetSyllabusDate: string;
    daysRemaining: number;
    requiredChaptersPerDay: number;
    actualPaceChaptersPerDay: number;
    status: 'AHEAD_OF_PACE' | 'ON_TRACK' | 'SLIGHT_LAG' | 'CRITICAL_LAG';
  };
  todayProductivityVerdict: 'EXEMPLARY_DEEP_WORK' | 'GOAL_MET' | 'PROGRESS_RECORDED' | 'NO_ACTIVITY_YET';
  topPriorityRecommendation: {
    chapterId: string;
    name: string;
    subject: Subject;
    urgencyReason: string;
    recommendedHours: number;
  } | null;
}

export function computeDailySummary(state: AppState, dateStr?: string): DailySummaryResult {
  const today = getTodayStr();
  const targetDate = dateStr && dateStr.trim() !== '' ? dateStr.trim() : today;
  const isToday = targetDate === today;

  const logs = (state.studyLogs || []).filter((l) => l.dateStudied === targetDate);
  const studyHoursToday = Number(logs.reduce((sum, l) => sum + (l.hoursSpent || 0), 0).toFixed(1));
  const sessionsLoggedToday = logs.length;

  const chaptersReviewedToday = logs.map((l) => ({
    id: l.chapterId,
    name: l.chapterName,
    subject: l.subject,
    confidence: l.confidenceRating,
    hours: l.hoursSpent || 1,
    sessionType: (l.sessionType || 'revision_round_complete') as StudySessionType,
    note: l.note,
  }));

  const allChapters = (state.chapters || []).filter((c) => !c.isArchived);

  // Due today
  const dueToday = allChapters.filter((c) => c.nextRevisionDate === targetDate);
  const chaptersDueTodayList = dueToday.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    confidence: c.currentConfidence,
  }));

  // Overdue
  const overdue = allChapters
    .filter((c) => c.nextRevisionDate && getDaysDifference(targetDate, c.nextRevisionDate) < 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      daysOverdue: Math.abs(getDaysDifference(targetDate, c.nextRevisionDate!)),
      confidence: c.currentConfidence,
      urgencyScore: Math.abs(getDaysDifference(targetDate, c.nextRevisionDate!)) * 3 + (5 - c.currentConfidence) * 4,
    }))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  const chaptersOverdueList = overdue.map(({ id, name, subject, daysOverdue, confidence }) => ({
    id,
    name,
    subject,
    daysOverdue,
    confidence,
  }));

  // Calculate study streak
  const studyDates = new Set((state.studyLogs || []).map((l) => l.dateStudied));
  let streak = 0;
  let checkDate = targetDate;
  // If no logs today, check if streak was active as of yesterday
  if (!studyDates.has(checkDate) && isToday) {
    const yesterday = addDaysToDateStr(today, -1);
    if (studyDates.has(yesterday)) {
      checkDate = yesterday;
    }
  }

  while (studyDates.has(checkDate)) {
    streak++;
    checkDate = addDaysToDateStr(checkDate, -1);
  }

  // Pacing runway
  const pacingSettings = state.pacingSettings || {
    targetSyllabusDate: '2026-12-31',
    targetExamDate: '2027-05-02',
    targetRevisionPasses: 3,
    targetMockTestsCount: 25,
    includeAllTestsGoal: true,
    studyDaysPerWeek: 7,
  };

  const pacing = calculateSyllabusPacing(
    state.chapters || [],
    state.studyLogs || [],
    state.tests || [],
    state.testScores || [],
    pacingSettings,
    targetDate
  );

  let pacingStatus: 'AHEAD_OF_PACE' | 'ON_TRACK' | 'SLIGHT_LAG' | 'CRITICAL_LAG' = 'ON_TRACK';
  if (pacing.paceStatus === 'AHEAD') pacingStatus = 'AHEAD_OF_PACE';
  else if (pacing.paceStatus === 'ON_TRACK') pacingStatus = 'ON_TRACK';
  else if (pacing.paceStatus === 'BEHIND') pacingStatus = 'SLIGHT_LAG';
  else pacingStatus = 'CRITICAL_LAG';

  // Today productivity verdict
  let todayProductivityVerdict: DailySummaryResult['todayProductivityVerdict'] = 'NO_ACTIVITY_YET';
  if (studyHoursToday >= 6) todayProductivityVerdict = 'EXEMPLARY_DEEP_WORK';
  else if (studyHoursToday >= 3.5 || sessionsLoggedToday >= 3) todayProductivityVerdict = 'GOAL_MET';
  else if (studyHoursToday > 0 || sessionsLoggedToday > 0) todayProductivityVerdict = 'PROGRESS_RECORDED';

  // Top priority recommendation
  let topPriorityRecommendation: DailySummaryResult['topPriorityRecommendation'] = null;
  if (overdue.length > 0) {
    const top = overdue[0];
    topPriorityRecommendation = {
      chapterId: top.id,
      name: top.name,
      subject: top.subject,
      urgencyReason: `Overdue by ${top.daysOverdue} days with confidence ${top.confidence}/5`,
      recommendedHours: top.confidence <= 2 ? 2.5 : 1.5,
    };
  } else if (dueToday.length > 0) {
    const top = dueToday[0];
    topPriorityRecommendation = {
      chapterId: top.id,
      name: top.name,
      subject: top.subject,
      urgencyReason: `Scheduled for spaced repetition revision today`,
      recommendedHours: 1.5,
    };
  } else {
    // Recommend unstarted chapter with highest NEET weight
    const unstarted = allChapters.find((c) => c.learningStage === 'NOT_STARTED' || (c.completionPercentage ?? 0) === 0);
    if (unstarted) {
      topPriorityRecommendation = {
        chapterId: unstarted.id,
        name: unstarted.name,
        subject: unstarted.subject,
        urgencyReason: `First-pass syllabus completion required to maintain pacing runway`,
        recommendedHours: 2.0,
      };
    }
  }

  return {
    date: targetDate,
    isToday,
    studyHoursToday,
    sessionsLoggedToday,
    chaptersReviewedToday,
    chaptersDueTodayCount: chaptersDueTodayList.length,
    chaptersDueTodayList,
    chaptersOverdueCount: chaptersOverdueList.length,
    chaptersOverdueList,
    activeStreakDays: streak,
    syllabusPacingRunway: {
      targetSyllabusDate: pacingSettings.targetSyllabusDate,
      daysRemaining: pacing.daysUntilSyllabusTarget,
      requiredChaptersPerDay: pacing.required1stPassVelocityPerDay,
      actualPaceChaptersPerDay: Number((pacing.actualWeeklyVelocity / 7).toFixed(2)),
      status: pacingStatus,
    },
    todayProductivityVerdict,
    topPriorityRecommendation,
  };
}

// ============================================================================
// 2. SIMULATE DECAY FORECAST (EBBINGHAUS MATHEMATICAL ENGINE)
// ============================================================================

export interface DecayForecastResult {
  forecastTimestamp: number;
  subjectFilter: string;
  totalChaptersAnalyzed: number;
  currentAverageRetentionPct: number;
  projectedAverageRetention7d: number;
  projectedAverageRetention14d: number;
  projectedAverageRetention30d: number;
  projectedAverageRetention60d: number;
  decayCategoriesCurrent: {
    safeCount: number; // >= 70%
    warningCount: number; // 50-69%
    criticalCount: number; // < 50%
    unstudiedCount: number;
  };
  projectedDangerWithin14Days: Array<{
    chapterId: string;
    name: string;
    subject: Subject;
    currentRetention: number;
    projectedRetention14d: number;
    daysUntilCritical: number;
    confidence: number;
    revisionCount: number;
  }>;
  recommendedSalvageSequence: Array<{
    priorityRank: number;
    chapterId: string;
    name: string;
    subject: Subject;
    urgencyScore: number;
    suggestedAction: string;
  }>;
}

export function computeDecayForecast(
  state: AppState,
  options?: { subject?: string; daysAhead?: number }
): DecayForecastResult {
  const today = getTodayStr();
  let chapters = (state.chapters || []).filter((c) => !c.isArchived);
  if (options?.subject && options.subject !== 'All') {
    chapters = chapters.filter((c) => c.subject === options.subject);
  }

  let totalRetSum = 0;
  let p7Sum = 0;
  let p14Sum = 0;
  let p30Sum = 0;
  let p60Sum = 0;
  let studiedCount = 0;

  let safeCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let unstudiedCount = 0;

  const dangerWithin14Days: DecayForecastResult['projectedDangerWithin14Days'] = [];
  const salvageCandidates: Array<{
    chapterId: string;
    name: string;
    subject: Subject;
    urgencyScore: number;
    suggestedAction: string;
  }> = [];

  chapters.forEach((ch) => {
    if (!ch.lastStudiedDate && ch.currentConfidence === 0) {
      unstudiedCount++;
      return;
    }

    const ret = calculateMemoryRetention(ch, today);
    studiedCount++;
    totalRetSum += ret.retentionPct;
    p7Sum += ret.projectedRetention7d;
    p14Sum += ret.projectedRetention14d;
    p30Sum += ret.projectedRetention30d;
    p60Sum += ret.projectedRetention60d;

    if (ret.decayStatus === 'safe') safeCount++;
    else if (ret.decayStatus === 'warning') warningCount++;
    else criticalCount++;

    // Check if drops into critical zone in 14 days
    if (ret.projectedRetention14d < 50 || ret.decayStatus === 'critical') {
      dangerWithin14Days.push({
        chapterId: ch.id,
        name: ch.name,
        subject: ch.subject,
        currentRetention: ret.retentionPct,
        projectedRetention14d: ret.projectedRetention14d,
        daysUntilCritical: ret.daysUntilCritical,
        confidence: ch.currentConfidence,
        revisionCount: ch.revisionCount,
      });

      const urgencyScore = (100 - ret.projectedRetention14d) * 1.5 + (5 - ch.currentConfidence) * 10;
      let action = 'Spaced repetition flashcard drill';
      if (ch.currentConfidence <= 2) action = 'Comprehensive NCERT re-read + 30 PYQs';
      else if (ret.projectedRetention14d < 35) action = 'Formula active recall + targeted mock test';

      salvageCandidates.push({
        chapterId: ch.id,
        name: ch.name,
        subject: ch.subject,
        urgencyScore,
        suggestedAction: action,
      });
    }
  });

  dangerWithin14Days.sort((a, b) => a.projectedRetention14d - b.projectedRetention14d);
  salvageCandidates.sort((a, b) => b.urgencyScore - a.urgencyScore);

  const avgCurrent = studiedCount > 0 ? Math.round(totalRetSum / studiedCount) : 0;
  const avgP7 = studiedCount > 0 ? Math.round(p7Sum / studiedCount) : 0;
  const avgP14 = studiedCount > 0 ? Math.round(p14Sum / studiedCount) : 0;
  const avgP30 = studiedCount > 0 ? Math.round(p30Sum / studiedCount) : 0;
  const avgP60 = studiedCount > 0 ? Math.round(p60Sum / studiedCount) : 0;

  return {
    forecastTimestamp: Date.now(),
    subjectFilter: options?.subject || 'All',
    totalChaptersAnalyzed: chapters.length,
    currentAverageRetentionPct: avgCurrent,
    projectedAverageRetention7d: avgP7,
    projectedAverageRetention14d: avgP14,
    projectedAverageRetention30d: avgP30,
    projectedAverageRetention60d: avgP60,
    decayCategoriesCurrent: {
      safeCount,
      warningCount,
      criticalCount,
      unstudiedCount,
    },
    projectedDangerWithin14Days: dangerWithin14Days.slice(0, 15),
    recommendedSalvageSequence: salvageCandidates.slice(0, 10).map((c, idx) => ({
      priorityRank: idx + 1,
      ...c,
    })),
  };
}

// ============================================================================
// 3. CLINICAL WEAK SPOTS DIAGNOSIS
// ============================================================================

export interface WeakSpotItem {
  rank: number;
  chapterId: string;
  name: string;
  subject: Subject;
  compositeRiskScore: number; // 0 to 100
  confidence: number;
  retentionPct: number;
  daysOverdue: number;
  revisionCount: number;
  primaryRiskFactor: string;
  recommendedRemediation: string;
}

export function diagnoseWeakSpots(
  state: AppState,
  options?: { subject?: string; limit?: number }
): {
  diagnosedAt: string;
  subject: string;
  totalWeakChaptersIdentified: number;
  highPriorityRemediations: WeakSpotItem[];
  systemicDiagnosis: string;
} {
  const today = getTodayStr();
  const limit = options?.limit || 10;
  let chapters = (state.chapters || []).filter((c) => !c.isArchived);
  if (options?.subject && options.subject !== 'All') {
    chapters = chapters.filter((c) => c.subject === options.subject);
  }

  const scored: Array<Omit<WeakSpotItem, 'rank'>> = [];

  chapters.forEach((ch) => {
    let daysOverdue = 0;
    if (ch.nextRevisionDate) {
      const diff = getDaysDifference(today, ch.nextRevisionDate);
      if (diff < 0) daysOverdue = Math.abs(diff);
    }

    const ret = calculateMemoryRetention(ch, today);

    // Factors contributing to risk score
    // 1. Confidence deficit (0-40 pts)
    const confScore = Math.max(0, (5 - ch.currentConfidence) * 8);

    // 2. Memory retention deficit (0-30 pts)
    const retScore = Math.max(0, Math.round((100 - ret.retentionPct) * 0.3));

    // 3. Days overdue penalty (0-20 pts)
    const overdueScore = Math.min(20, daysOverdue * 2);

    // 4. Missing pillars penalty (0-10 pts)
    const pillars = ch.pillars || {};
    let missingPillarsCount = 0;
    if (!pillars.lectures) missingPillarsCount++;
    if (!pillars.bookReading && !pillars.ncertReading) missingPillarsCount++;
    if (!pillars.questionPractice) missingPillarsCount++;
    if (!pillars.anki) missingPillarsCount++;
    const pillarScore = missingPillarsCount * 2.5;

    const compositeRiskScore = Math.min(100, Math.round(confScore + retScore + overdueScore + pillarScore));

    if (compositeRiskScore >= 35 || daysOverdue >= 3 || ch.currentConfidence <= 2) {
      let primaryRiskFactor = 'Low confidence rating';
      if (daysOverdue >= 7) primaryRiskFactor = `Severe revision overdue (${daysOverdue} days)`;
      else if (ret.retentionPct < 40) primaryRiskFactor = `Critical memory decay (${ret.retentionPct}% retention)`;
      else if (!pillars.questionPractice) primaryRiskFactor = 'No question practice recorded';

      let recommendedRemediation = 'Complete targeted revision drill';
      if (ch.currentConfidence <= 2) {
        recommendedRemediation = 'High-yield NCERT reading + 50 chapter PYQs + active flashcard recall';
      } else if (daysOverdue > 0) {
        recommendedRemediation = 'Immediate 45-minute timed active recall session to restore retention';
      } else if (!pillars.anki) {
        recommendedRemediation = 'Review Anki high-yield facts & formula sheet';
      }

      scored.push({
        chapterId: ch.id,
        name: ch.name,
        subject: ch.subject,
        compositeRiskScore,
        confidence: ch.currentConfidence,
        retentionPct: ret.retentionPct,
        daysOverdue,
        revisionCount: ch.revisionCount,
        primaryRiskFactor,
        recommendedRemediation,
      });
    }
  });

  scored.sort((a, b) => b.compositeRiskScore - a.compositeRiskScore);

  const highPriorityRemediations: WeakSpotItem[] = scored.slice(0, limit).map((item, idx) => ({
    rank: idx + 1,
    ...item,
  }));

  let systemicDiagnosis = 'Syllabus memory retention is healthy with minimal critical vulnerabilities.';
  if (highPriorityRemediations.length >= 8) {
    systemicDiagnosis = 'High revision debt accumulated. Recommend a 3-day dedicated revision freeze before new chapters.';
  } else if (highPriorityRemediations.length >= 4) {
    systemicDiagnosis = 'Moderate weak clusters detected. Integrate Worst-First daily sessions into study blocks.';
  }

  return {
    diagnosedAt: today,
    subject: options?.subject || 'All',
    totalWeakChaptersIdentified: scored.length,
    highPriorityRemediations,
    systemicDiagnosis,
  };
}

// ============================================================================
// 4. BACKUP EXPORT & RESTORE PROTOCOL
// ============================================================================

export function generateBackupPayload(state: AppState, includeAuditLogs: boolean = true) {
  const now = Date.now();
  const summary = {
    chaptersCount: (state.chapters || []).length,
    studyLogsCount: (state.studyLogs || []).length,
    testsCount: (state.tests || []).length,
    testScoresCount: (state.testScores || []).length,
    actionHistoryCount: includeAuditLogs ? (state.actionHistory || []).length : 0,
  };

  const simpleHash =
    'chk-' +
    summary.chaptersCount +
    '-' +
    summary.studyLogsCount +
    '-' +
    summary.testsCount +
    '-' +
    now.toString(36);

  return {
    version: '2.1.0',
    app: 'PCB-01 NEET Study Console',
    exportedAt: now,
    exportedAtIso: new Date(now).toISOString(),
    schemaType: 'PCB01_FULL_BACKUP_SNAPSHOT',
    summary,
    integrityChecksum: simpleHash,
    data: {
      chapters: state.chapters || [],
      studyLogs: state.studyLogs || [],
      tests: state.tests || [],
      testScores: state.testScores || [],
      settings: state.settings,
      pacingSettings: state.pacingSettings,
      actionHistory: includeAuditLogs ? state.actionHistory || [] : [],
      updatedAt: state.updatedAt || now,
    },
  };
}

export function validateAndRestorePayload(
  payload: any,
  currentState: AppState,
  mode: 'replace' | 'merge' = 'merge'
): { success: boolean; message: string; restoredCounts: Record<string, number> } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup payload: must be a valid JSON object');
  }

  const data = payload.data || payload;
  if (!Array.isArray(data.chapters)) {
    throw new Error('Invalid backup payload: missing or malformed "chapters" array');
  }

  const incomingChapters: Chapter[] = data.chapters;
  const incomingLogs: StudyLog[] = Array.isArray(data.studyLogs) ? data.studyLogs : [];
  const incomingTests: Test[] = Array.isArray(data.tests) ? data.tests : [];
  const incomingScores: TestScore[] = Array.isArray(data.testScores) ? data.testScores : [];

  return {
    success: true,
    message: `Validated ${incomingChapters.length} chapters, ${incomingLogs.length} study logs, and ${incomingTests.length} tests ready for ${mode} restoration.`,
    restoredCounts: {
      chapters: incomingChapters.length,
      studyLogs: incomingLogs.length,
      tests: incomingTests.length,
      testScores: incomingScores.length,
    },
  };
}

// ============================================================================
// 5. PROMPT TEMPLATE RENDERER
// ============================================================================

export function renderPromptTemplate(
  promptName: string,
  state: AppState,
  args: Record<string, any> = {}
): {
  description: string;
  messages: Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>;
} {
  const today = getTodayStr();

  if (promptName === 'generate_neet_revision_plan') {
    const hours = Number(args.hoursAvailable) || 4;
    const overdue = (state.chapters || [])
      .filter((c) => !c.isArchived && c.nextRevisionDate && getDaysDifference(today, c.nextRevisionDate) < 0)
      .slice(0, 8);

    const dueToday = (state.chapters || [])
      .filter((c) => !c.isArchived && c.nextRevisionDate === today)
      .slice(0, 4);

    const overdueList = overdue
      .map(
        (c) =>
          `- [${c.subject}] ${c.name} | Confidence: ${c.currentConfidence}/5 | Overdue by ${Math.abs(getDaysDifference(today, c.nextRevisionDate!))} days`
      )
      .join('\n');

    const dueList = dueToday
      .map((c) => `- [${c.subject}] ${c.name} | Confidence: ${c.currentConfidence}/5 (Due Today)`)
      .join('\n');

    return {
      description: 'Intensive NEET Revision Block Planner',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I am preparing for the NEET UG medical examination. Today is ${today} and I have allocated ${hours} hours for revision.

CURRENT ACTIVE REVISION BACKLOG:
${overdueList || 'No severely overdue chapters.'}

SCHEDULED FOR REVISION TODAY:
${dueList || 'No chapters scheduled specifically for today.'}

Please generate an evidence-backed Pomodoro revision schedule:
1. Divide my ${hours} hours into focused 50-minute study sprints with 10-minute active recovery breaks.
2. Prioritize worst-first: attack high-weight, low-confidence overdue topics first.
3. For each topic, specify the exact study technique (NCERT line-by-line active recall, PYQ drill, or formula sheet derivation).
4. Include 3 critical high-yield pitfalls to avoid for each subject.`,
          },
        },
      ],
    };
  }

  if (promptName === 'diagnose_weak_spots') {
    const weakDiagnosis = diagnoseWeakSpots(state, { limit: 8 });
    const weakList = weakDiagnosis.highPriorityRemediations
      .map(
        (w) =>
          `#${w.rank}. [${w.subject}] ${w.name} (Risk: ${w.compositeRiskScore}/100, Conf: ${w.confidence}/5, Retention: ${w.retentionPct}%, Factor: ${w.primaryRiskFactor})`
      )
      .join('\n');

    return {
      description: 'Clinical NEET Weak Spots & Remediation Diagnosis',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Here is the current algorithmic diagnostic evaluation of my NEET syllabus vulnerabilities as of ${today}:

SYSTEMIC STATUS: ${weakDiagnosis.systemicDiagnosis}

TOP VULNERABLE CHAPTERS:
${weakList}

Please formulate a targeted 7-Day Intensive Recovery Protocol to rescue these chapters from memory decay:
1. Provide a day-by-day intervention plan.
2. For each vulnerable chapter, list the top 3 high-yield concepts most frequently tested in NEET PYQs.
3. Recommend specific active recall methods that prevent recurring silly mistakes and memory fade.`,
          },
        },
      ],
    };
  }

  if (promptName === 'mock_test_postmortem') {
    const testId = args.testId;
    const test = (state.tests || []).find((t) => t.id === testId) || state.tests?.[0];
    const score = (state.testScores || []).find((s) => s.testId === test?.id) || state.testScores?.[0];

    const testInfo = test ? `${test.name} (${test.subjectOrScope}) held on ${test.date}` : 'Recent NEET Mock Exam';
    const scoreInfo = score
      ? `Total Score: ${score.totalScore}/${score.maxScore || 720} (${((score.totalScore / (score.maxScore || 720)) * 100).toFixed(1)}%) | Correct: ${score.correctQuestions}, Incorrect: ${score.incorrectQuestions}, Unattempted: ${score.unattemptedQuestions}`
      : 'Score not recorded yet';

    const errorsInfo = score?.errors
      ? `Errors: Conceptual (${score.errors.conceptualGaps || 0}), Silly Mistakes (${score.errors.sillyMistakes || 0}), Memory Recall (${score.errors.memoryRecall || 0}), Time Pressure (${score.errors.timePressure || 0}), Wild Guessing (${score.errors.guessingWild || 0})`
      : 'No error breakdown recorded.';

    return {
      description: 'Mock Test Error Taxonomy & Score Postmortem',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I just completed a NEET mock test and need a surgical error postmortem.

TEST DETAILS:
${testInfo}
${scoreInfo}
${errorsInfo}

Please conduct a forensic analysis:
1. Classify the root causes of the lost marks (knowledge gap vs exam temperament vs calculation fatigue).
2. Create a targeted Error Log Protocol to ensure these specific mistake patterns are not repeated.
3. Suggest a 48-hour remedial study sequence to address the highest-leverage conceptual deficits identified.`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${promptName}`);
}

// ============================================================================
// 7. WEEKLY AUDIT RECEIPT INTELLIGENCE
// ============================================================================

export interface WeeklyAuditReceiptResult {
  date: string;
  cycleEnding: string;
  totalSessionsLogged: number;
  totalTopicsTouched: number;
  rescuedDecayCount: number;
  criticalDecayCount: number;
  criticalDecayChapters: Array<{ id: string; name: string; subject: Subject; retentionPct: number; daysSinceLastStudied: number }>;
  weeklyTests: Array<{
    id: string;
    name: string;
    date: string;
    isLogged: boolean;
    daysAgo: number;
    score?: {
      totalScore: number;
      maxScore: number;
      percentage: number;
      accuracy?: number;
      sillyMistakes: number;
      conceptualGaps: number;
      memoryRecall: number;
      incorrectQuestions: number;
    };
  }>;
  itemizedSessions: Array<{
    id: string;
    dateStudied: string;
    chapterId: string;
    chapterName: string;
    subject: Subject;
    stage: 'PASS 1' | 'REV 01' | 'REV 02' | string;
    confidence: number;
    completionPercentage: number;
  }>;
  negativeMarksLost: number;
  pacing: {
    paceStatus: string;
    actualWeeklyVelocity: number;
    requiredWeeklyVelocity: number;
    paceDeltaChapters: number;
  };
  disciplineRating: {
    score: number;
    tier: string;
  };
  asciiReceipt: string;
}

export function computeWeeklyAuditReceipt(state: AppState): WeeklyAuditReceiptResult {
  const today = getTodayStr();
  const logs = (state.studyLogs || []).filter((l) => {
    const diff = getDaysDifference(l.dateStudied, today);
    return diff >= 0 && diff <= 7;
  });

  const uniqueChapterIds = new Set(logs.map((l) => l.chapterId));
  const chapterMap = new Map((state.chapters || []).map((c) => [c.id, c]));

  // 7-day tests
  const weekTests = (state.tests || [])
    .filter((t) => {
      const diff = getDaysDifference(t.date, today);
      return diff >= 0 && diff <= 7;
    })
    .map((t) => {
      const score = (state.testScores || []).find((s) => s.testId === t.id);
      const daysAgo = getDaysDifference(t.date, today);
      const scorePct = score
        ? Math.round((score.totalScore / (score.maxScore || 720)) * 100)
        : undefined;
      const scoreAcc = score
        ? (score.totalQuestions && score.totalQuestions > 0 && score.correctQuestions !== undefined)
          ? Math.round((score.correctQuestions / score.totalQuestions) * 100)
          : ((score.correctQuestions || 0) + (score.incorrectQuestions || 0) > 0)
          ? Math.round(((score.correctQuestions || 0) / ((score.correctQuestions || 0) + (score.incorrectQuestions || 0))) * 100)
          : undefined
        : undefined;

      return {
        id: t.id,
        name: t.name,
        date: t.date,
        isLogged: !!score,
        daysAgo,
        score: score
          ? {
              totalScore: score.totalScore,
              maxScore: score.maxScore,
              percentage: scorePct,
              accuracy: scoreAcc,
              sillyMistakes: score.errors?.sillyMistakes || 0,
              conceptualGaps: score.errors?.conceptualGaps || 0,
              memoryRecall: score.errors?.memoryRecall || 0,
              incorrectQuestions: score.incorrectQuestions || 0,
            }
          : undefined,
      };
    });

  // Calculate negative marks
  let negativeMarksLost = 0;
  weekTests.forEach((wt) => {
    if (wt.score) {
      negativeMarksLost += wt.score.incorrectQuestions || 0;
    }
  });

  // Critical decay chapters (<50%)
  const criticalDecayChapters = (state.chapters || [])
    .filter((c) => !c.isArchived)
    .map((c) => ({ chapter: c, retention: calculateMemoryRetention(c, today) }))
    .filter((x) => x.retention.decayStatus === 'critical')
    .map((x) => ({
      id: x.chapter.id,
      name: x.chapter.name,
      subject: x.chapter.subject,
      retentionPct: x.retention.retentionPct,
      daysSinceLastStudied: x.retention.daysSinceLastStudied || 0,
    }));

  const pacing = calculateSyllabusPacing(
    state.chapters || [],
    state.studyLogs || [],
    state.tests || [],
    state.testScores || [],
    state.pacingSettings,
    today
  );

  const itemizedSessions = logs.map((l) => {
    const ch = chapterMap.get(l.chapterId);
    let stage = '1ST PASS';
    if (l.sessionType === 'first_pass_complete' || l.sessionType === 'progress' || l.revisionNumber <= 1) {
      stage = '1ST PASS';
    } else if (l.sessionType === 'revision_round_complete' || l.revisionNumber > 1) {
      stage = `REV ${l.revisionNumber - 1}`;
    }

    return {
      id: l.id,
      dateStudied: l.dateStudied,
      chapterId: l.chapterId,
      chapterName: ch?.name || l.chapterName,
      subject: ch?.subject || l.subject,
      stage,
      confidence: l.confidenceRating || 3,
      completionPercentage: l.completionPercentage !== undefined ? l.completionPercentage : 100,
    };
  });

  // Discipline rating (0-100)
  const disciplineScore = Math.min(
    100,
    Math.round(
      (logs.length >= 7 ? 40 : (logs.length / 7) * 40) +
        (weekTests.length > 0 && weekTests.every((t) => t.isLogged) ? 30 : weekTests.length === 0 ? 25 : 10) +
        (criticalDecayChapters.length === 0 ? 30 : Math.max(0, 30 - criticalDecayChapters.length * 5))
    )
  );

  const tier =
    disciplineScore >= 90
      ? 'APEX S-TIER (SOVEREIGN DISCIPLINE)'
      : disciplineScore >= 75
      ? 'SUPERIOR A-TIER (HIGH ORBIT STABILITY)'
      : disciplineScore >= 60
      ? 'PROFICIENT B-TIER (SOLID FOUNDATION)'
      : 'DEVELOPING C-TIER (URGENT ACCELERATION)';

  // Build plain-text thermal ASCII receipt
  let ascii = '==========================================================\n';
  ascii += '            SOLO LEVELING // NEET UG 2027\n';
  ascii += '             OFFICIAL WEEKLY AUDIT RECEIPT\n';
  ascii += '           TE-TACTICAL PERFORMANCE TERMINAL\n';
  ascii += '==========================================================\n';
  ascii += `DATE:        ${today} 23:59:59 IST\n`;
  ascii += `RECEIPT ID:  #REC-WK7-${today.replace(/-/g, '')}-NEET\n`;
  ascii += `TERMINAL:    #001 (86-CHAPTER CHASSIS)\n`;
  ascii += `DISCIPLINE:  ${tier}\n`;
  ascii += '----------------------------------------------------------\n';
  ascii += `TESTS IN 7D WINDOW:    ${weekTests.length} Scheduled (${weekTests.filter((t) => t.isLogged).length} Logged)\n`;
  weekTests.forEach((t) => {
    ascii += `  * [${t.isLogged ? 'LOGGED' : 'PENDING'}] ${t.name} (${t.date}): ${
      t.score ? `${t.score.totalScore}/${t.score.maxScore} (${t.score.percentage}%)` : 'Score Not Entered'
    }\n`;
  });
  ascii += '----------------------------------------------------------\n';
  ascii += `SESSIONS LOGGED:       ${logs.length} Rounds\n`;
  ascii += `CHAPTERS TOUCHED:      ${uniqueChapterIds.size} Topics\n`;
  ascii += `CRITICAL DECAY:        ${criticalDecayChapters.length} Chapters (<50% stability)\n`;
  ascii += `NEGATIVE ERROR BLEED:  -${negativeMarksLost} Marks\n`;
  ascii += `PACING VELOCITY:       ${pacing.actualWeeklyVelocity} ch/wk vs ${pacing.required1stPassVelocityPerWeek} required\n`;
  ascii += `PACING STATUS:         ${pacing.paceStatus} (${pacing.paceDeltaChapters >= 0 ? `+${pacing.paceDeltaChapters}` : pacing.paceDeltaChapters} chs)\n`;
  ascii += '==========================================================\n';

  return {
    date: today,
    cycleEnding: today,
    totalSessionsLogged: logs.length,
    totalTopicsTouched: uniqueChapterIds.size,
    rescuedDecayCount: 0,
    criticalDecayCount: criticalDecayChapters.length,
    criticalDecayChapters,
    weeklyTests: weekTests,
    itemizedSessions,
    negativeMarksLost,
    pacing: {
      paceStatus: pacing.paceStatus,
      actualWeeklyVelocity: pacing.actualWeeklyVelocity,
      requiredWeeklyVelocity: pacing.required1stPassVelocityPerWeek,
      paceDeltaChapters: pacing.paceDeltaChapters,
    },
    disciplineRating: {
      score: disciplineScore,
      tier,
    },
    asciiReceipt: ascii,
  };
}

// ============================================================================
// 8. 16:9 PANORAMIC RADAR STATUS INTELLIGENCE
// ============================================================================

export interface PanoramicMatrixStatusResult {
  totalChapters: number;
  readyChaptersCount: number;
  readyPercentage: number;
  pinkApexCount: number;
  pinkApexPercentage: number;
  nonPinkTargetsCount: number;
  subjectsBreakdown: {
    physics: { total: number; pinkCount: number; readyCount: number; avgScore: number };
    chemistry: { total: number; pinkCount: number; readyCount: number; avgScore: number };
    botany: { total: number; pinkCount: number; readyCount: number; avgScore: number };
    zoology: { total: number; pinkCount: number; readyCount: number; avgScore: number };
    biology: { total: number; pinkCount: number; readyCount: number; avgScore: number };
  };
  ranksDistribution: Record<string, number>;
  nonPinkTargetChapters: Array<{ id: string; name: string; subject: Subject; currentConfidence: number; lastStudiedDate: string | null }>;
}

export function computePanoramicMatrixStatus(state: AppState): PanoramicMatrixStatusResult {
  const chapters = (state.chapters || []).filter((c) => !c.isArchived);
  const total = chapters.length;

  const physics = chapters.filter((c) => c.subject === 'Physics');
  const chemistry = chapters.filter((c) => c.subject === 'Chemistry');
  const botany = chapters.filter((c) => c.subject === 'Botany');
  const zoology = chapters.filter((c) => c.subject === 'Zoology');
  const biology = chapters.filter((c) => c.subject === 'Botany' || c.subject === 'Zoology');

  // Confidence 5 or 3+ revisions counts towards Apex S
  const isPinkApex = (c: Chapter) => (c.currentConfidence >= 5 && (c.revisionCount || 0) >= 3);
  const isReady = (c: Chapter) => c.currentConfidence >= 4;

  const pinkCount = chapters.filter(isPinkApex).length;
  const readyCount = chapters.filter(isReady).length;
  const nonPink = chapters.filter((c) => !isPinkApex(c));

  const phyPink = physics.filter(isPinkApex).length;
  const chemPink = chemistry.filter(isPinkApex).length;
  const botPink = botany.filter(isPinkApex).length;
  const zooPink = zoology.filter(isPinkApex).length;
  const bioPink = biology.filter(isPinkApex).length;

  return {
    totalChapters: total,
    readyChaptersCount: readyCount,
    readyPercentage: total > 0 ? Math.round((readyCount / total) * 100) : 0,
    pinkApexCount: pinkCount,
    pinkApexPercentage: total > 0 ? Math.round((pinkCount / total) * 100) : 0,
    nonPinkTargetsCount: nonPink.length,
    subjectsBreakdown: {
      physics: {
        total: physics.length,
        pinkCount: phyPink,
        readyCount: physics.filter(isReady).length,
        avgScore: 0,
      },
      chemistry: {
        total: chemistry.length,
        pinkCount: chemPink,
        readyCount: chemistry.filter(isReady).length,
        avgScore: 0,
      },
      botany: {
        total: botany.length,
        pinkCount: botPink,
        readyCount: botany.filter(isReady).length,
        avgScore: 0,
      },
      zoology: {
        total: zoology.length,
        pinkCount: zooPink,
        readyCount: zoology.filter(isReady).length,
        avgScore: 0,
      },
      biology: {
        total: biology.length,
        pinkCount: bioPink,
        readyCount: biology.filter(isReady).length,
        avgScore: 0,
      },
    },
    ranksDistribution: {
      S: pinkCount,
      A: chapters.filter((c) => c.currentConfidence === 4).length,
      B: chapters.filter((c) => c.currentConfidence === 3).length,
      C: chapters.filter((c) => c.currentConfidence === 2).length,
      D: chapters.filter((c) => c.currentConfidence === 1).length,
      F: chapters.filter((c) => c.currentConfidence === 0).length,
    },
    nonPinkTargetChapters: nonPink.slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      currentConfidence: c.currentConfidence,
      lastStudiedDate: c.lastStudiedDate,
    })),
  };
}

