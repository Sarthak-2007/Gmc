import { AppState, Chapter, LearningStage, StudyLog, Subject, SyllabusPacingSettings, Test, TestScore } from '../types';
import {
  addDaysToDateStr,
  calculateMemoryRetention,
  calculateSyllabusPacing,
  getDecayPreventedStats,
  getDaysDifference,
  getTodayStr,
} from './spacedRepetition';

export interface FeatureDetail {
  id: string;
  name: string;
  category: string;
  badge: string;
  overview: string;
  howItWorks: string[];
  dataRecordedAndSchema: Record<string, string>;
  formulasAndMath: string[];
  userAndMcpTriggers: string[];
}

export interface AnalyticsMetricDoc {
  name: string;
  category: string;
  description: string;
  mathematicalFormula: string;
  interpretationGuide: string;
}

/**
 * Computes exhaustive, live working analytics across the entire application state.
 */
export function computeLiveAnalytics(state: AppState) {
  const today = getTodayStr();
  const now = Date.now();
  const activeChapters = (state.chapters || []).filter((c) => !c.isArchived);
  const totalChapters = activeChapters.length || 86;

  // 1. Syllabus Stage & Completion
  let completed1stPass = 0;
  let inProgress = 0;
  let notStarted = 0;
  let inRevision = 0;
  let totalCompletionSum = 0;

  activeChapters.forEach((ch) => {
    const stage = ch.learningStage;
    const pct = ch.completionPercentage ?? 0;
    totalCompletionSum += pct;
    if (stage === 'FIRST_PASS_DONE' || stage === 'IN_REVISION' || pct >= 100 || (ch.revisionCount || 0) >= 1) {
      completed1stPass++;
      if (stage === 'IN_REVISION' || (ch.revisionCount || 0) > 1) {
        inRevision++;
      }
    } else if (stage === 'IN_PROGRESS' || pct > 0 || ch.lastStudiedDate) {
      inProgress++;
    } else {
      notStarted++;
    }
  });

  const overallCompletionPercentage = totalChapters > 0 ? Number(((completed1stPass / totalChapters) * 100).toFixed(1)) : 0;
  const avgChapterProgressPercentage = totalChapters > 0 ? Number((totalCompletionSum / totalChapters).toFixed(1)) : 0;

  // 2. Subject Mastery & Telemetry
  const subjects: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
  const subjectTelemetry: Record<Subject, any> = {
    Physics: {},
    Chemistry: {},
    Botany: {},
    Zoology: {},
  };

  subjects.forEach((subj) => {
    const list = activeChapters.filter((c) => c.subject === subj);
    const count = list.length;
    const done = list.filter(
      (c) => c.learningStage === 'FIRST_PASS_DONE' || c.learningStage === 'IN_REVISION' || (c.completionPercentage ?? 0) >= 100
    ).length;
    const prog = list.filter(
      (c) => c.learningStage === 'IN_PROGRESS' || ((c.completionPercentage ?? 0) > 0 && (c.completionPercentage ?? 0) < 100)
    ).length;
    const notDone = count - done - prog;
    const studied = list.filter((c) => c.currentConfidence > 0);
    const avgConf =
      studied.length > 0 ? Number((studied.reduce((sum, c) => sum + c.currentConfidence, 0) / studied.length).toFixed(2)) : 0;
    const strongCount = list.filter((c) => c.currentConfidence >= 4).length;
    const weakCount = list.filter((c) => c.currentConfidence > 0 && c.currentConfidence <= 2).length;
    const unstudiedCount = list.filter((c) => c.currentConfidence === 0).length;

    // Study hours from logs
    const subjLogs = (state.studyLogs || []).filter((l) => l.subject === subj);
    const hours = Number(subjLogs.reduce((sum, l) => sum + (l.hoursSpent || 0), 0).toFixed(1));
    const sessions = subjLogs.length;

    // Trend over recent logs
    let trendDirection = 'steady';
    let trendDelta = 0;
    const sortedSubjLogs = [...subjLogs].sort((a, b) => b.timestamp - a.timestamp);
    if (sortedSubjLogs.length >= 4) {
      const recentAvg = sortedSubjLogs.slice(0, 2).reduce((s, l) => s + l.confidenceRating, 0) / 2;
      const olderAvg =
        sortedSubjLogs.slice(2, 6).reduce((s, l) => s + l.confidenceRating, 0) / Math.min(4, sortedSubjLogs.length - 2);
      trendDelta = Number((recentAvg - olderAvg).toFixed(2));
      if (trendDelta > 0.2) trendDirection = 'improving';
      else if (trendDelta < -0.2) trendDirection = 'declining';
    }

    subjectTelemetry[subj] = {
      totalChapters: count,
      completedChapters: done,
      inProgressChapters: prog,
      notStartedChapters: notDone,
      completionPercentage: count > 0 ? Number(((done / count) * 100).toFixed(1)) : 0,
      averageConfidenceScore: avgConf,
      strongChaptersCount: strongCount,
      weakChaptersCount: weakCount,
      unstudiedChaptersCount: unstudiedCount,
      totalHoursSpent: hours,
      totalStudySessions: sessions,
      confidenceTrend: {
        direction: trendDirection,
        delta: trendDelta,
      },
    };
  });

  // 3. 5-Pillars Coverage
  let lecturesCount = 0;
  let bookCount = 0;
  let notesCount = 0;
  let pyqCount = 0;
  let ankiCount = 0;
  let allFiveCount = 0;

  activeChapters.forEach((ch) => {
    const p = ch.pillars || {};
    const hasBook = Boolean(p.bookReading || p.ncertReading);
    if (p.lectures) lecturesCount++;
    if (hasBook) bookCount++;
    if (p.classNotes) notesCount++;
    if (p.questionPractice) pyqCount++;
    if (p.anki) ankiCount++;
    if (p.lectures && hasBook && p.classNotes && p.questionPractice && p.anki) {
      allFiveCount++;
    }
  });

  const pentaPillarsReadiness = {
    totalChapters,
    videoLectures: {
      count: lecturesCount,
      percentage: totalChapters > 0 ? Number(((lecturesCount / totalChapters) * 100).toFixed(1)) : 0,
    },
    bookReadingNCERT: {
      count: bookCount,
      percentage: totalChapters > 0 ? Number(((bookCount / totalChapters) * 100).toFixed(1)) : 0,
    },
    classNotesAndFormulas: {
      count: notesCount,
      percentage: totalChapters > 0 ? Number(((notesCount / totalChapters) * 100).toFixed(1)) : 0,
    },
    questionPracticePYQs: {
      count: pyqCount,
      percentage: totalChapters > 0 ? Number(((pyqCount / totalChapters) * 100).toFixed(1)) : 0,
    },
    ankiFlashcards: {
      count: ankiCount,
      percentage: totalChapters > 0 ? Number(((ankiCount / totalChapters) * 100).toFixed(1)) : 0,
    },
    pentaPillarMasteredAllFive: {
      count: allFiveCount,
      percentage: totalChapters > 0 ? Number(((allFiveCount / totalChapters) * 100).toFixed(1)) : 0,
    },
    subjectBreakdown: subjects.map((subj) => {
      const list = activeChapters.filter((c) => c.subject === subj);
      const subTotal = list.length;
      let l = 0,
        b = 0,
        n = 0,
        q = 0,
        a = 0,
        full = 0;
      list.forEach((ch) => {
        const p = ch.pillars || {};
        const hb = Boolean(p.bookReading || p.ncertReading);
        if (p.lectures) l++;
        if (hb) b++;
        if (p.classNotes) n++;
        if (p.questionPractice) q++;
        if (p.anki) a++;
        if (p.lectures && hb && p.classNotes && p.questionPractice && p.anki) full++;
      });
      return {
        subject: subj,
        total: subTotal,
        lectures: l,
        bookReading: b,
        classNotes: n,
        pyqs: q,
        anki: a,
        allFive: full,
        allFivePercentage: subTotal > 0 ? Number(((full / subTotal) * 100).toFixed(1)) : 0,
      };
    }),
  };

  // 4. Ebbinghaus Memory Retention Analytics
  let safeCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let unstudiedRetentionCount = 0;
  let retentionSum = 0;
  let studiedRetentionCount = 0;

  const analyzedMemory = activeChapters.map((ch) => {
    const retention = calculateMemoryRetention(ch, today);
    if (retention.decayStatus === 'safe') safeCount++;
    else if (retention.decayStatus === 'warning') warningCount++;
    else if (retention.decayStatus === 'critical') criticalCount++;
    else unstudiedRetentionCount++;

    if (ch.lastStudiedDate && ch.currentConfidence > 0) {
      retentionSum += retention.retentionPct;
      studiedRetentionCount++;
    }

    return { chapter: ch, retention };
  });

  const avgRetention = studiedRetentionCount > 0 ? Number((retentionSum / studiedRetentionCount).toFixed(1)) : 0;
  const decayStats = getDecayPreventedStats(state.chapters || [], state.studyLogs || []);
  const topCriticalDecay = analyzedMemory
    .filter((x) => x.retention.decayStatus === 'critical')
    .sort((a, b) => a.retention.retentionPct - b.retention.retentionPct)
    .slice(0, 10)
    .map((x) => ({
      chapterId: x.chapter.id,
      name: x.chapter.name,
      subject: x.chapter.subject,
      confidence: x.chapter.currentConfidence,
      retentionPercentage: x.retention.retentionPct,
      stabilityDays: x.retention.memoryStabilityDays,
      halfLifeDays: x.retention.halfLifeDays,
      daysSinceLastStudied: x.retention.daysSinceLastStudied,
    }));

  const ebbinghausMemoryRetention = {
    safeCount,
    warningCount,
    criticalCount,
    unstudiedCount: unstudiedRetentionCount,
    safePercentage: totalChapters > 0 ? Number(((safeCount / totalChapters) * 100).toFixed(1)) : 0,
    warningPercentage: totalChapters > 0 ? Number(((warningCount / totalChapters) * 100).toFixed(1)) : 0,
    criticalPercentage: totalChapters > 0 ? Number(((criticalCount / totalChapters) * 100).toFixed(1)) : 0,
    averageRetentionOfStudiedChapters: avgRetention,
    decayPreventedTally: {
      totalRescuedFromCriticalLossCount: decayStats.totalSavedCount,
      recentlyRescuedCount: decayStats.rescuedChapters.length,
      sampleRescued: decayStats.rescuedChapters.slice(0, 5).map((r) => ({
        chapterName: r.chapter.name,
        subject: r.chapter.subject,
        previousConfidence: r.prevConfidence,
        currentConfidence: r.currentConfidence,
        rescuedOn: r.savedDate,
      })),
    },
    topCriticalDecayChapters: topCriticalDecay,
  };

  // 5. Flight Plan Pacing
  const pacingResult = calculateSyllabusPacing(
    state.chapters || [],
    state.studyLogs || [],
    state.tests || [],
    state.testScores || [],
    state.pacingSettings,
    today
  );

  const flightPlanPacing = {
    targetSyllabusDate: pacingResult.targetSyllabusDate,
    targetExamDate: pacingResult.targetExamDate,
    daysUntilSyllabusTarget: pacingResult.daysUntilSyllabusTarget,
    weeksUntilSyllabusTarget: pacingResult.weeksUntilSyllabusTarget,
    daysUntilExam: getDaysDifference(today, pacingResult.targetExamDate),
    totalChapters: pacingResult.totalChapters,
    completed1stPassCount: pacingResult.completed1stPassCount,
    remaining1stPassCount: pacingResult.remaining1stPassCount,
    required1stPassWeeklyVelocity: pacingResult.required1stPassVelocityPerWeek,
    required1stPassDailyVelocity: pacingResult.required1stPassVelocityPerDay,
    actualWeeklyVelocity: pacingResult.actualWeeklyVelocity,
    projectedCompletionDate: pacingResult.projectedCompletionDate,
    projectedDaysDelta: pacingResult.projectedDaysDelta,
    paceStatus: pacingResult.paceStatus,
    paceDeltaChapters: pacingResult.paceDeltaChapters,
    targetRevisionPasses: pacingResult.targetRevisionPasses,
    requiredRevisionWeeklyVelocity: pacingResult.requiredRevisionPassVelocityPerWeek,
    mockTestsPlanned: pacingResult.totalTestsPlanned,
    mockTestsCompleted: pacingResult.testsCompletedCount,
    mockTestsRemaining: pacingResult.testsRemainingCount,
    requiredTestFrequencyDays: pacingResult.requiredTestFrequencyDays,
  };

  // 6. Mock Test Performance & Error Taxonomy
  const scores = state.testScores || [];
  let avgScore = 0;
  let highestScore: any = null;
  let lowestScore: any = null;
  let totalQuestionsSum = 0;
  let correctSum = 0;
  let incorrectSum = 0;
  let unattemptedSum = 0;

  let sillyMistakesTotal = 0;
  let conceptualGapsTotal = 0;
  let memoryRecallTotal = 0;
  let timePressureTotal = 0;
  let wildGuessesTotal = 0;

  const subjectScoresAcc: Record<Subject, { sum: number; count: number }> = {
    Physics: { sum: 0, count: 0 },
    Chemistry: { sum: 0, count: 0 },
    Botany: { sum: 0, count: 0 },
    Zoology: { sum: 0, count: 0 },
  };

  if (scores.length > 0) {
    let scoreSum = 0;
    scores.forEach((s) => {
      scoreSum += s.totalScore;
      if (!highestScore || s.totalScore > highestScore.score) {
        highestScore = { score: s.totalScore, testName: s.testName, date: s.dateRecorded };
      }
      if (!lowestScore || s.totalScore < lowestScore.score) {
        lowestScore = { score: s.totalScore, testName: s.testName, date: s.dateRecorded };
      }

      totalQuestionsSum += s.totalQuestions || 180;
      correctSum += s.correctQuestions || 0;
      incorrectSum += s.incorrectQuestions || 0;
      unattemptedSum += s.unattemptedQuestions || 0;

      if (s.errors) {
        sillyMistakesTotal += s.errors.sillyMistakes || 0;
        conceptualGapsTotal += s.errors.conceptualGaps || 0;
        memoryRecallTotal += s.errors.memoryRecall || 0;
        timePressureTotal += s.errors.timePressure || 0;
        wildGuessesTotal += s.errors.guessingWild || 0;
      }

      if (s.subjectScores) {
        subjects.forEach((subj) => {
          const val = s.subjectScores?.[subj];
          if (typeof val === 'number') {
            subjectScoresAcc[subj].sum += val;
            subjectScoresAcc[subj].count += 1;
          }
        });
      }
    });

    avgScore = Number((scoreSum / scores.length).toFixed(1));
  }

  const totalErrors = sillyMistakesTotal + conceptualGapsTotal + memoryRecallTotal + timePressureTotal + wildGuessesTotal;
  const attemptedTotal = correctSum + incorrectSum;
  const accuracyRate = attemptedTotal > 0 ? Number(((correctSum / attemptedTotal) * 100).toFixed(1)) : 0;
  const attemptRate = totalQuestionsSum > 0 ? Number(((attemptedTotal / totalQuestionsSum) * 100).toFixed(1)) : 0;

  const mockTestIntelligence = {
    totalTestsScheduled: (state.tests || []).length,
    totalScoresLogged: scores.length,
    averageTotalScore720: avgScore,
    averageScorePercentage: Number(((avgScore / 720) * 100).toFixed(1)),
    highestScore: highestScore || 'None recorded',
    lowestScore: lowestScore || 'None recorded',
    subjectAverageScores: {
      Physics: subjectScoresAcc.Physics.count > 0 ? Number((subjectScoresAcc.Physics.sum / subjectScoresAcc.Physics.count).toFixed(1)) : 0,
      Chemistry: subjectScoresAcc.Chemistry.count > 0 ? Number((subjectScoresAcc.Chemistry.sum / subjectScoresAcc.Chemistry.count).toFixed(1)) : 0,
      Botany: subjectScoresAcc.Botany.count > 0 ? Number((subjectScoresAcc.Botany.sum / subjectScoresAcc.Botany.count).toFixed(1)) : 0,
      Zoology: subjectScoresAcc.Zoology.count > 0 ? Number((subjectScoresAcc.Zoology.sum / subjectScoresAcc.Zoology.count).toFixed(1)) : 0,
    },
    questionTelemetry: {
      totalQuestionsPresented: totalQuestionsSum,
      totalCorrectQuestions: correctSum,
      totalIncorrectQuestions: incorrectSum,
      totalUnattemptedQuestions: unattemptedSum,
      overallAccuracyPercentage: accuracyRate,
      overallAttemptRatePercentage: attemptRate,
    },
    errorTaxonomyTotals: {
      totalErrorsLogged: totalErrors,
      sillyMistakes: { count: sillyMistakesTotal, percentage: totalErrors > 0 ? Number(((sillyMistakesTotal / totalErrors) * 100).toFixed(1)) : 0 },
      conceptualGaps: { count: conceptualGapsTotal, percentage: totalErrors > 0 ? Number(((conceptualGapsTotal / totalErrors) * 100).toFixed(1)) : 0 },
      memoryRecallFailures: { count: memoryRecallTotal, percentage: totalErrors > 0 ? Number(((memoryRecallTotal / totalErrors) * 100).toFixed(1)) : 0 },
      timePressureOrPanic: { count: timePressureTotal, percentage: totalErrors > 0 ? Number(((timePressureTotal / totalErrors) * 100).toFixed(1)) : 0 },
      wildGuesses: { count: wildGuessesTotal, percentage: totalErrors > 0 ? Number(((wildGuessesTotal / totalErrors) * 100).toFixed(1)) : 0 },
    },
    recentScoreTrajectory: (() => {
      const sorted = [...scores].sort((a, b) => b.timestamp - a.timestamp);
      if (sorted.length < 2) return 'Insufficient tests to compute trajectory';
      const latest = sorted[0].totalScore;
      const prev = sorted[1].totalScore;
      const diff = latest - prev;
      return {
        latestScore: latest,
        previousScore: prev,
        scoreDelta: diff,
        status: diff > 0 ? `+${diff} marks gain` : diff < 0 ? `${diff} marks drop` : 'Score remained steady',
      };
    })(),
  };

  // 7. Spaced Repetition Queue
  const dueTodayChapters: any[] = [];
  const overdueChapters: any[] = [];
  const dueSoonChapters: any[] = [];
  let scheduledCount = 0;
  let criticalRiskCount = 0;

  activeChapters.forEach((ch) => {
    if (!ch.nextRevisionDate) return;
    const diff = getDaysDifference(today, ch.nextRevisionDate);
    const urgency = Math.abs(Math.min(0, diff)) * 3 + (5 - (ch.currentConfidence || 1)) * 4;
    const item = {
      chapterId: ch.id,
      name: ch.name,
      subject: ch.subject,
      confidence: ch.currentConfidence,
      revisionCount: ch.revisionCount,
      daysDiff: diff,
      urgencyScore: urgency,
    };

    if (diff < 0) {
      overdueChapters.push({ ...item, daysOverdue: Math.abs(diff) });
      if (ch.currentConfidence <= 2) criticalRiskCount++;
    } else if (diff === 0) {
      dueTodayChapters.push(item);
    } else if (diff <= 3) {
      dueSoonChapters.push(item);
    } else {
      scheduledCount++;
    }
  });

  overdueChapters.sort((a, b) => b.urgencyScore - a.urgencyScore);

  const spacedRepetitionQueue = {
    dueTodayCount: dueTodayChapters.length,
    overdueCount: overdueChapters.length,
    dueSoonCount: dueSoonChapters.length,
    scheduledCount,
    criticalRiskCount,
    topOverdueHighUrgency: overdueChapters.slice(0, 8),
    dueTodayList: dueTodayChapters.slice(0, 8),
  };

  // 8. Consistency & Habits
  const logs = state.studyLogs || [];
  const totalHours = Number(logs.reduce((sum, l) => sum + (l.hoursSpent || 0), 0).toFixed(1));
  const avgHours = logs.length > 0 ? Number((totalHours / logs.length).toFixed(1)) : 0;

  const dateSet = new Set<string>();
  logs.forEach((l) => {
    if (l.dateStudied) dateSet.add(l.dateStudied);
  });

  let currentStreak = 0;
  let checkDate = today;
  while (dateSet.has(checkDate)) {
    currentStreak++;
    checkDate = addDaysToDateStr(checkDate, -1);
  }
  if (currentStreak === 0) {
    checkDate = addDaysToDateStr(today, -1);
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = addDaysToDateStr(checkDate, -1);
    }
  }

  const consistencyAndHabits = {
    totalSessionsLogged: logs.length,
    totalHoursSpent: totalHours,
    averageHoursPerSession: avgHours,
    activeStudyDaysCount: dateSet.size,
    currentStreakDays: currentStreak,
  };

  // 9. Forensic Audit History
  const actions = state.actionHistory || [];
  const actionsByType: Record<string, number> = {};
  actions.forEach((a) => {
    actionsByType[a.entityType] = (actionsByType[a.entityType] || 0) + 1;
  });

  const forensicAuditTrail = {
    totalActionsLogged: actions.length,
    actionsByEntityType: actionsByType,
    latestActionsSummary: actions.slice(0, 5).map((a) => ({
      actionType: a.actionType,
      description: a.description,
      entityType: a.entityType,
      timestampIso: a.timestampIso,
    })),
  };

  return {
    syllabusAndCurriculum: {
      totalChapters,
      completed1stPassCount: completed1stPass,
      inProgressCount: inProgress,
      notStartedCount: notStarted,
      inRevisionCount: inRevision,
      overallCompletionPercentage,
      averageChapterProgressPercentage: avgChapterProgressPercentage,
    },
    subjectTelemetry,
    pentaPillarsReadiness,
    ebbinghausMemoryRetention,
    flightPlanPacing,
    mockTestIntelligence,
    spacedRepetitionQueue,
    consistencyAndHabits,
    forensicAuditTrail,
  };
}

/**
 * Exhaustive catalog of all 15 core features in the application.
 */
export const FEATURES_LIST: FeatureDetail[] = [
  {
    id: 'NEET_SYLLABUS_MATRIX',
      name: 'NEET UG 86-Chapter Complete Syllabus Matrix',
      category: 'Curriculum Management',
      badge: 'Core Engine',
      overview:
        'Complete curriculum database of 86 high-yield chapters covering Physics (29), Chemistry (30), Botany (13), and Zoology (14) strictly mapped to Class 11 & 12 NEET UG standards and 16 thematic clusters.',
      howItWorks: [
        'Each chapter tracks learning stages: NOT_STARTED -> IN_PROGRESS -> FIRST_PASS_DONE -> IN_REVISION.',
        'When first started, startedDate is auto-assigned (YYYY-MM-DD).',
        'When completionPercentage reaches 100% or user logs first-pass completion, firstPassCompletedDate is sealed and daysTakenToComplete is computed.',
        'Revisions are indexed (revisionCount = 0 for 1st pass, 1 for Pass 1, 2 for Pass 2, etc.).',
        'Chapters can be linked directly to upcoming coaching mock tests to inherit urgent hard deadlines.',
      ],
      dataRecordedAndSchema: {
        id: 'string (e.g. ch-phy-01)',
        name: 'string (e.g. Kinematics & Motion)',
        subject: 'enum (Physics | Chemistry | Botany | Zoology)',
        clusterId: 'number (1 to 16 thematic cluster)',
        clusterName: 'string (e.g. Classical Mechanics)',
        classLevel: 'string (11 | 12)',
        learningStage: 'enum (NOT_STARTED | IN_PROGRESS | FIRST_PASS_DONE | IN_REVISION)',
        completionPercentage: 'number (0 to 100%)',
        startedDate: 'string | null (YYYY-MM-DD format)',
        firstPassCompletedDate: 'string | null (YYYY-MM-DD format)',
        daysTakenToComplete: 'number | null (elapsed days from start to 100%)',
        targetDeadline: 'string | null (target revision or test deadline date)',
        lastStudiedDate: 'string | null (YYYY-MM-DD format)',
        nextRevisionDate: 'string | null (SM-2 calculated next review date)',
        revisionCount: 'number (0 = first pass, 1, 2, 3... = revision rounds)',
        currentConfidence: 'number (0 = unstudied, 1 to 5 confidence rating)',
        isArchived: 'boolean (soft-deleted / excluded from active queue)',
        createdAt: 'string (creation date YYYY-MM-DD)',
        updatedAt: 'number (epoch millisecond timestamp)',
      },
      formulasAndMath: [
        'daysTakenToComplete = max(1, dateDifference(startedDate, firstPassCompletedDate) + 1)',
        'completionPercentage = min(100, max(0, percentage))',
      ],
      userAndMcpTriggers: [
        'UI: Quick Log Modal, Chapter Drawer, Stage Dropdowns, Bulk Deadline Tool',
        'MCP Tools: add_chapter, update_chapter, archive_chapter, update_chapter_pillars',
      ],
    },
    {
      id: 'PENTA_PILLARS_FRAMEWORK',
      name: '5-Pillars Syllabus Readiness Engine',
      category: 'Pedagogy & Active Recall',
      badge: 'Study Method',
      overview:
        'Ensures multi-dimensional mastery across 5 distinct study pillars for every chapter before considering it ready for NEET exam conditions.',
      howItWorks: [
        'Every chapter maintains independent boolean flags for 5 study milestones:',
        '1. Video Lectures (theory & foundation)',
        '2. Book Reading (line-by-line NCERT reading)',
        '3. Class Notes & Formulas (handwritten short notes and formula summaries)',
        '4. Question Practice & PYQs (100+ past-year NEET/AIPMT questions)',
        '5. Anki Flashcards (active spaced retrieval deck reviews)',
        'Penta-Pillar Mastered state is unlocked only when all 5 pillars are simultaneously true.',
        'Logging a study session allows checking any new pillars completed in that session.',
      ],
      dataRecordedAndSchema: {
        'pillars.lectures': 'boolean',
        'pillars.bookReading': 'boolean (with backwards-compatible alias ncertReading)',
        'pillars.classNotes': 'boolean',
        'pillars.questionPractice': 'boolean',
        'pillars.anki': 'boolean',
      },
      formulasAndMath: [
        'pentaPillarMastered = lectures && bookReading && classNotes && questionPractice && anki',
        'pillarCoverageRate = (completedPillarsCount / totalPossiblePillars) * 100%',
      ],
      userAndMcpTriggers: [
        'UI: 5-Pillar matrix checkboxes in Chapter List, Analytics Dashboard, and Quick Log modal',
        'MCP Tools: update_chapter_pillars, log_study_session',
      ],
    },
    {
      id: 'SM2_SPACED_REPETITION',
      name: 'SuperMemo SM-2 Spaced Repetition Scheduling Engine',
      category: 'Cognitive Science',
      badge: 'Core Algorithm',
      overview:
        'Calculates optimal revision intervals so topics resurface right before active memory fades, eliminating the exponential forgetting curve.',
      howItWorks: [
        'Uses an escalating gap schedule: Revision 1 = Day 3, Revision 2 = Day 7, Revision 3 = Day 14, Revision 4+ = Day 30+.',
        'Modulates gaps using user confidence rating (1 to 5):',
        '- Confidence 1 & 2: Multiplier 0.5x (struggling topics resurface twice as fast).',
        '- Confidence 3: Multiplier 1.0x (standard interval).',
        '- Confidence 4 & 5: Multiplier 1.5x (solid mastery topics get breathing room).',
        'Next review date = dateStudied + adjustedGapDays.',
        'Overdue status triggers when todayDate > nextRevisionDate.',
      ],
      dataRecordedAndSchema: {
        defaultGaps: 'number[] (default [3, 7, 14, 30])',
        'confidenceMultipliers.1': 'number (0.5)',
        'confidenceMultipliers.2': 'number (0.5)',
        'confidenceMultipliers.3': 'number (1.0)',
        'confidenceMultipliers.4': 'number (1.5)',
        'confidenceMultipliers.5': 'number (1.5)',
        nextRevisionDate: 'string (YYYY-MM-DD)',
        lastStudiedDate: 'string (YYYY-MM-DD)',
        revisionCount: 'number (current revision pass)',
      },
      formulasAndMath: [
        'gapIndex = min(max(0, revisionNumber - 1), defaultGaps.length - 1)',
        'baseGap = defaultGaps[gapIndex]',
        'adjustedGap = max(1, round(baseGap * confidenceMultiplier[confidenceRating]))',
        'nextRevisionDate = addDays(dateStudied, adjustedGap)',
        'daysOverdue = max(0, dateDifference(nextRevisionDate, todayDate))',
        'urgencyScore = (daysOverdue * 3) + (5 - currentConfidence) * 4',
      ],
      userAndMcpTriggers: [
        'UI: Quick Log Modal, Settings Modal interval configurator',
        'MCP Tools: update_spaced_repetition_settings, log_study_session, list_due_chapters',
      ],
    },
    {
      id: 'EBBINGHAUS_MEMORY_RETENTION',
      name: 'Hermann Ebbinghaus Forgetting Curve & Retention Decay Engine',
      category: 'Memory Telemetry',
      badge: 'Predictive Math',
      overview:
        'Calculates real-time biological memory retention probability for every chapter based on elapsed days, repetition count, and confidence stability.',
      howItWorks: [
        'Implements the exponential decay equation: R(t) = exp(-t / S).',
        'Stability factor (S) scales dynamically with revision pass count and confidence rating.',
        'Classifies memory state into 4 forensic categories: SAFE (>= 70%), WARNING (50% to 69%), CRITICAL (< 50%), and UNSTUDIED.',
        'Computes memory half-life (days until retention drops to 50%) and days until critical threshold.',
        'Tracks Decay Prevention Stats: increments counter whenever a revision rescues a chapter from warning/critical levels.',
      ],
      dataRecordedAndSchema: {
        retentionPct: 'number (0 to 100% current retention)',
        decayStatus: 'enum (safe | warning | critical | unstudied)',
        memoryStabilityDays: 'number (effective stability factor S)',
        halfLifeDays: 'number (days until 50% decay)',
        daysSinceLastStudied: 'number | null (elapsed days)',
        daysUntilCritical: 'number (days remaining before dropping below 50%)',
        projectedRetention7d: 'number (projected retention in 7 days)',
        projectedRetention14d: 'number (projected retention in 14 days)',
        projectedRetention30d: 'number (projected retention in 30 days)',
      },
      formulasAndMath: [
        'S = max(1.5, baseStability * confidenceMultiplier)',
        'baseStability: Pass 1 = 8 days, Pass 2 = 18 days, Pass 3 = 36 days, Pass 4+ = 60 days',
        'confidenceMultiplier: L1=0.45, L2=0.70, L3=1.00, L4=1.50, L5=2.10',
        'R(t) = exp(-elapsedDays / S) * 100%',
        'halfLifeDays = round(S * ln(2)) = round(S * 0.69315)',
        'decayStatus: R >= 70% ? SAFE : R >= 50% ? WARNING : CRITICAL',
      ],
      userAndMcpTriggers: [
        'UI: Strategic Flight Hub, Memory Decay Radar, Analytics Dashboard',
        'MCP Tools: get_app_features_and_analytics, get_study_status, get_everything',
      ],
    },
    {
      id: 'STRATEGIC_FLIGHT_HUB_PACING',
      name: 'Strategic Flight Hub & Syllabus Pacing Engine',
      category: 'Macro Planning',
      badge: 'Pacing Telemetry',
      overview:
        'High-altitude mission control comparing current preparation velocity against target syllabus completion deadline (Dec 31, 2026) and NEET exam day (May 2, 2027).',
      howItWorks: [
        'Calculates required 1st pass weekly velocity to finish all 86 chapters before syllabus cutoff.',
        'Measures actual weekly velocity based on recent 30-day chapter completion rate.',
        'Calculates projected completion date by extrapolating actual velocity.',
        'Computes pace status: AHEAD (>= 7 days buffer), ON_TRACK (+/- 7 days buffer), or BEHIND (< -7 days buffer).',
        'Calculates required revision pass velocity per week for the window between syllabus cutoff and exam date.',
        'Calculates mock test frequency cadence (days between tests).',
      ],
      dataRecordedAndSchema: {
        targetSyllabusDate: 'string (YYYY-MM-DD)',
        targetExamDate: 'string (YYYY-MM-DD)',
        targetRevisionPasses: 'number (default 3)',
        targetMockTestsCount: 'number (default 25)',
        includeAllTestsGoal: 'boolean',
        studyDaysPerWeek: 'number (default 7)',
      },
      formulasAndMath: [
        'remaining1stPass = totalChapters - completed1stPassCount',
        'weeksUntilSyllabus = daysUntilSyllabus / 7',
        'requiredWeeklyVelocity = remaining1stPass / weeksUntilSyllabus',
        'daysNeededAtCurrentPace = remaining1stPass / actualDailyVelocity',
        'projectedCompletionDate = addDays(today, daysNeededAtCurrentPace)',
        'projectedDaysDelta = dateDifference(projectedCompletionDate, targetSyllabusDate)',
        'paceStatus: delta >= 7 ? AHEAD : delta <= -7 ? BEHIND : ON_TRACK',
        'requiredRevisionVelocityPerWeek = (totalChapters * targetRevisionPasses) / weeksFromSyllabusToExam',
      ],
      userAndMcpTriggers: [
        'UI: Strategic Flight Hub view, Pacing Flight Plan drawer, Target editor',
        'MCP Tools: update_pacing_settings, get_study_status, get_everything',
      ],
    },
    {
      id: 'MOCK_TEST_RADAR',
      name: 'Mock Test Radar & Exam Readiness Focus Engine',
      category: 'Exam Readiness',
      badge: 'Radar Focus',
      overview:
        'Integrates national coaching mock tests (Allen, Aakash, Resonance, Self-tests) and maps tested chapters directly into the revision queue with automatic deadline synchronization.',
      howItWorks: [
        'Creates scheduled mock tests with test dates, coaching names, and linked chapter arrays.',
        'Links tested chapters to the mock test, auto-assigning the test date as targetDeadline on all linked chapters.',
        'Calculates pre-test readiness radar: categorizes tested chapters into Not Started, In Progress, Revision Due, and Mastered.',
        'Flags tests within 7 days as high-priority URGENT, highlighting linked chapters with pulsing radar alerts.',
      ],
      dataRecordedAndSchema: {
        id: 'string (test identifier)',
        name: 'string (e.g. Allen Major 04)',
        coachingName: 'string (e.g. Allen, Aakash)',
        date: 'string (YYYY-MM-DD)',
        subjectOrScope: 'string (e.g. Mechanics + Organic Chemistry)',
        linkedChapterIds: 'string[] (array of chapter IDs)',
        totalMarks: 'number (default 720)',
        createdAt: 'string (creation date YYYY-MM-DD)',
        timestamp: 'number (epoch ms)',
      },
      formulasAndMath: [
        'daysAway = dateDifference(todayDate, test.date)',
        'isUrgent = daysAway >= 0 && daysAway <= 7',
        'testReadinessPct = (masteredChaptersCount / linkedChaptersCount) * 100%',
      ],
      userAndMcpTriggers: [
        'UI: Test Manager, Test Radar Focus header tab, Print Schedule modal',
        'MCP Tools: add_test, delete_test, list_tests, get_test_details, link_chapters_to_test',
      ],
    },
    {
      id: 'MOCK_TEST_ERROR_TAXONOMY',
      name: 'Mock Test Scoring & Granular Error Taxonomy',
      category: 'Diagnostic Telemetry',
      badge: 'Score Intelligence',
      overview:
        'NEET 720-mark score recorder featuring multi-subject breakdowns and a 5-vector error taxonomy to identify why marks were lost.',
      howItWorks: [
        'Records total score out of 720, total questions, correct, incorrect, and unattempted.',
        'Logs subject-wise scores for Physics (180), Chemistry (180), Botany (180), Zoology (180).',
        'Classifies lost marks into 5 diagnostic error vectors:',
        '1. Silly Mistakes: calculation slips, misreading question, bubbling errors.',
        '2. Conceptual Gaps: theory unclear, applied incorrect formula.',
        '3. Memory Recall Failures: forgotten reaction, constant, or NCERT exception.',
        '4. Time Pressure & Panic: rushed or unattempted due to clock management.',
        '5. Wild Guesses: negative-mark gambling without elimination.',
        'Computes accuracy rates and chronologically graphs score trajectories over time.',
      ],
      dataRecordedAndSchema: {
        id: 'string (score-timestamp-rand)',
        testId: 'string (linked test ID)',
        testName: 'string (test name)',
        dateRecorded: 'string (YYYY-MM-DD)',
        totalScore: 'number (out of 720)',
        maxScore: 'number (720)',
        totalQuestions: 'number (180)',
        correctQuestions: 'number',
        incorrectQuestions: 'number',
        unattemptedQuestions: 'number',
        'subjectScores.Physics': 'number',
        'subjectScores.Chemistry': 'number',
        'subjectScores.Botany': 'number',
        'subjectScores.Zoology': 'number',
        'errors.sillyMistakes': 'number',
        'errors.conceptualGaps': 'number',
        'errors.memoryRecall': 'number',
        'errors.timePressure': 'number',
        'errors.guessingWild': 'number',
        notes: 'string (qualitative test review notes)',
        timestamp: 'number (epoch ms)',
      },
      formulasAndMath: [
        'accuracyRate = (correctQuestions / (correctQuestions + incorrectQuestions)) * 100%',
        'attemptRate = ((totalQuestions - unattemptedQuestions) / totalQuestions) * 100%',
        'errorSum = sillyMistakes + conceptualGaps + memoryRecall + timePressure + wildGuesses',
        'sillyMistakesPct = (sillyMistakes / errorSum) * 100%',
      ],
      userAndMcpTriggers: [
        'UI: Log Score Modal, Test Manager Performance Analytics view',
        'MCP Tools: add_test_score, get_everything, get_app_features_and_analytics',
      ],
    },
    {
      id: 'STUDY_SESSION_GENERATOR',
      name: 'Intelligent Study Session Generator',
      category: 'Daily Execution',
      badge: 'AI / Heuristic Planner',
      overview:
        'Algorithmic daily planner that allocates available study minutes across highest-priority revision chapters using 3 customizable scheduling modes.',
      howItWorks: [
        'Accepts available minutes (e.g. 60, 120, 240) and preferred subject filter.',
        'Offers 3 strategic modes:',
        '- worst_first: Sorts by lowest confidence rating (1-2) and highest overdue days.',
        '- weighted: Balances subject diversity, nearest test deadlines, and overdue queue.',
        '- random: Randomizes active recall prompts across all studied chapters.',
        'Divides total time into structured Pomodoro blocks with target active recall tasks.',
      ],
      dataRecordedAndSchema: {
        mode: 'enum (worst_first | weighted | random)',
        availableMinutes: 'number',
        subject: 'enum (Physics | Chemistry | Botany | Zoology | All)',
      },
      formulasAndMath: [
        'urgencyWeight = daysOverdue * 3 + (5 - currentConfidence) * 4 + (testWithin7Days ? 15 : 0)',
        'blockMinutes = round(availableMinutes / selectedChaptersCount)',
      ],
      userAndMcpTriggers: [
        'UI: Chapter Selection Generator drawer in Syllabus view',
        'MCP Tools: generate_study_session',
      ],
    },
    {
      id: 'ACTIVITY_HEATMAP_52_WEEK',
      name: '52-Week Study Consistency & Habit Heatmap',
      category: 'Habit Formation',
      badge: 'Consistency Telemetry',
      overview:
        'GitHub-style 52-week activity calendar documenting study regularity, session frequency, daily hours spent, and active study streaks.',
      howItWorks: [
        'Renders 365 daily cells organized into 52 weekly columns.',
        'Aggregates study logs by dateStudied.',
        'Computes daily intensity levels (Level 0 = empty, Level 1 = 1 session, Level 2 = 2-3 sessions, Level 3 = 4+ sessions / high hours).',
        'Calculates current streak of consecutive days and longest recorded streak.',
      ],
      dataRecordedAndSchema: {
        dateStudied: 'string (YYYY-MM-DD)',
        sessionsCount: 'number',
        hoursSpent: 'number',
        intensityLevel: 'number (0 to 3)',
      },
      formulasAndMath: [
        'currentStreak = count of consecutive days with study logs ending on today or yesterday',
        'intensity = hours >= 6 || sessions >= 4 ? 3 : hours >= 3 || sessions >= 2 ? 2 : sessions >= 1 ? 1 : 0',
      ],
      userAndMcpTriggers: [
        'UI: ConsistencyHeatmap in Analytics Dashboard, RevisionHeatmap in Syllabus View',
        'MCP Tools: log_study_session, get_app_features_and_analytics',
      ],
    },
    {
      id: 'WEEKLY_AUDIT_RETROSPECTIVE',
      name: 'Weekly Audit & Diagnostic Retrospective',
      category: 'Metacognition',
      badge: 'Weekly Review',
      overview:
        'Structured Sunday retrospective modal evaluating past 7 days of performance, revision compliance, test scores, and strategic bottlenecks.',
      howItWorks: [
        'Filters study logs, test scores, and chapter changes from the past 7 days.',
        'Summarizes total hours studied, chapters advanced, and mock test scores recorded.',
        'Calculates weekly syllabus velocity delta against required pacing targets.',
        'Surfaces the 3 weakest chapters and 3 most neglected topics for next week.',
      ],
      dataRecordedAndSchema: {
        weeklyHours: 'number',
        weeklyChaptersStudied: 'number',
        weeklyTestsTaken: 'number',
        auditDate: 'string (YYYY-MM-DD)',
      },
      formulasAndMath: [
        'weeklyVelocityDelta = actualChaptersCompletedLast7Days - required1stPassVelocityPerWeek',
        'complianceRate = (actualRevisionsDone / scheduledRevisionsDueLast7Days) * 100%',
      ],
      userAndMcpTriggers: [
        'UI: Weekly Audit button in Header action bar, WeeklyAuditModal',
        'MCP Tools: get_app_features_and_analytics, get_action_history',
      ],
    },
    {
      id: 'PRINTABLE_WALL_SCHEDULE',
      name: 'Printable Wall Battle Plan & Offline Schedule',
      category: 'Physical Environment',
      badge: 'Offline Utility',
      overview:
        'Clean high-contrast printer-friendly layout generator for pinning mock test schedules and chapter milestone checklists to physical study desk walls.',
      howItWorks: [
        'Opens print-optimized layout styling with no dark backgrounds or hardware deck frame.',
        'Formats upcoming test dates, coaching scopes, and linked chapter lists into high-density tables.',
        'Supports standard browser print dialog (Ctrl+P / Cmd+P) and PDF export.',
      ],
      dataRecordedAndSchema: {
        viewMode: 'enum (ALL | UPCOMING | COACHING)',
      },
      formulasAndMath: ['N/A (Formatted CSS print media stylesheet)'],
      userAndMcpTriggers: [
        'UI: Print Schedule button in Test Manager and Test Radar Focus',
      ],
    },
    {
      id: 'FORENSIC_ACTION_AUDIT_LOG',
      name: 'Forensic Action Audit Trail & Event Logging',
      category: 'Telemetry & Compliance',
      badge: 'Event Sourcing',
      overview:
        'Immutable event sourcing audit log recording literally every user and tool interaction with microsecond timestamps, action types, entity references, and metadata.',
      howItWorks: [
        'Every mutation (chapter update, study log, test added, score entered, settings change) calls recordAction().',
        'Assigns unique action ID (act-{timestamp}-{random}).',
        'Records exact millisecond epoch timestamp and human-readable ISO 8601 string.',
        'Logs associated metadata payloads for full rollback auditing and telemetry analysis.',
      ],
      dataRecordedAndSchema: {
        id: 'string (act-timestamp-random)',
        actionType: 'string (e.g. STUDY_SESSION_LOGGED, CHAPTER_UPDATED, TEST_ADDED, etc.)',
        description: 'string (human-readable action summary)',
        entityType: 'enum (chapter | test | score | studyLog | settings | pacing | system)',
        entityId: 'string | undefined (target entity ID)',
        timestamp: 'number (epoch millisecond timestamp)',
        timestampIso: 'string (ISO 8601 UTC timestamp)',
        metadata: 'Record<string, any> (associated payload)',
      },
      formulasAndMath: [
        'timestampIso = new Date(timestamp).toISOString()',
      ],
      userAndMcpTriggers: [
        'UI: All user interactions',
        'MCP Tools: All write tools (log_study_session, add_chapter, add_test, add_test_score, etc.) and query tool get_action_history',
      ],
    },
    {
      id: 'MULTI_TIER_PERSISTENCE',
      name: 'Multi-Tier Data Persistence & Cross-Platform Sync',
      category: 'Data Infrastructure',
      badge: 'Full-Stack Sync',
      overview:
        'Resilient 3-tier persistence architecture spanning browser LocalStorage, server JSON disk persistence, and real-time REST API synchronization.',
      howItWorks: [
        'Tier 1 (Client): Immediate local persistence in browser LocalStorage (pcb01_study_console_state).',
        'Tier 2 (Full-Stack Backend): Debounced state sync to Node/Express server writing to /data/server-state.json.',
        'Tier 3 (MCP Server): MCP server reads and updates the exact same state file so external LLMs and desktop clients operate on live user data.',
      ],
      dataRecordedAndSchema: {
        storageKey: 'pcb01_study_console_state',
        serverDiskPath: '/data/server-state.json',
        syncEndpoints: 'GET /api/state, POST /api/state',
      },
      formulasAndMath: ['Debounce window: 600ms on client state changes'],
      userAndMcpTriggers: [
        'Automatic on state change across both UI and MCP endpoints',
      ],
    },
    {
      id: 'TE_HARDWARE_DECK_AUDIO',
      name: 'Teenage Engineering Hardware Deck & Audio Synthesizer',
      category: 'Industrial Design',
      badge: 'Sensory Feedback',
      overview:
        'Custom tactile UI inspired by Teenage Engineering OP-1 and OP-Z synthesizers with real-time procedural Web Audio synthesis.',
      howItWorks: [
        'Mechanical widgets: Rotary knobs with mouse-drag angular calculation, rocker switches with spring-back physics, and mechanical sliders.',
        'Audio engine: Built on HTML5 Web Audio API using OscillatorNodes and BiquadFilterNodes (zero external MP3 files).',
        'Generates distinct acoustic feedback for key clicks, latch toggles, alert buzzers, and celebratory milestone chimes.',
      ],
      dataRecordedAndSchema: {
        audioMuted: 'boolean (stored in user settings)',
        hapticEnabled: 'boolean',
      },
      formulasAndMath: [
        'Rotary angle = atan2(y - centerY, x - centerX) in radians converted to degrees',
      ],
      userAndMcpTriggers: [
        'UI: Hardware deck controls, button clicks, knob rotations',
      ],
    },
    {
      id: 'MODEL_CONTEXT_PROTOCOL_SERVER',
      name: 'Full Model Context Protocol (MCP) Server Integration',
      category: 'AI & Interoperability',
      badge: 'Open Standard',
      overview:
        'Full implementation of Anthropic’s Model Context Protocol (2024-11-05 standard) providing standard SSE streaming, direct JSON-RPC 2.0 endpoints, and an interactive in-app testing console.',
      howItWorks: [
        'Standard MCP SSE Stream: GET /api/mcp/sse creates a persistent SSEServerTransport stream with dynamic session IDs.',
        'SSE Message Receiver: POST /api/mcp/message routes incoming JSON-RPC calls to the active transport.',
        'Direct HTTP JSON-RPC: POST /api/mcp executes any tool or resource directly for automated curl, test scripts, or in-app playground.',
        'Server Discovery: GET /api/mcp/info returns server health, active connections, and ready-to-copy configs for Claude Desktop and Cursor.',
        'Interactive In-App MCP Console: Hardware-style modal with live ping, endpoint URLs, copy buttons, and interactive tool execution playground.',
      ],
      dataRecordedAndSchema: {
        protocolVersion: '2024-11-05',
        sseEndpoint: '/api/mcp/sse',
        messageEndpoint: '/api/mcp/message',
        directRpcEndpoint: '/api/mcp',
        infoEndpoint: '/api/mcp/info',
      },
      formulasAndMath: ['JSON-RPC 2.0 protocol specifications'],
      userAndMcpTriggers: [
        'UI: MCP Hardware keycap button in Header, McpModal',
        'External: Claude Desktop, Cursor, AI agents via SSE or HTTP',
      ],
    },
  ];

export const ANALYTICS_MANUAL: AnalyticsMetricDoc[] = [
  {
    name: 'Overall Syllabus Completion Percentage',
    category: 'Curriculum Progress',
    description: 'Fraction of total 86 active NEET chapters that have reached 100% first-pass completion or revision.',
    mathematicalFormula: 'SyllabusPct = (completed1stPassCount / totalActiveChapters) * 100%',
    interpretationGuide: 'Target is 100% by the target syllabus date (default Dec 31, 2026) to leave ample time for full mock test cycles.',
  },
  {
    name: '5-Pillars Mastery Index (Penta-Pillar)',
    category: 'Pedagogy & Coverage',
    description: 'Percentage of chapters where all 5 learning pillars (Lectures, Book, Notes, PYQs, Anki) have been verified complete.',
    mathematicalFormula: 'PentaPillarPct = (count(ch: lectures && book && notes && pyq && anki) / totalChapters) * 100%',
    interpretationGuide: 'Chapters with missing pillars represent critical exam blind spots. Aim for 80%+ penta-pillar completion before final mock tests.',
  },
  {
    name: 'Hermann Ebbinghaus Memory Retention Probability',
    category: 'Memory Science',
    description: 'The estimated biological recall probability of a chapter right now based on elapsed days since last study session.',
    mathematicalFormula: 'R(t) = exp(-elapsedDays / S) * 100%, where S = baseStability * confidenceMultiplier',
    interpretationGuide: '>= 70% is SAFE, 50-69% is WARNING (schedule soon), < 50% is CRITICAL (severe forgetting in progress).',
  },
  {
    name: 'SuperMemo SM-2 Next Revision Gap',
    category: 'Spaced Scheduling',
    description: 'The number of days to wait before scheduling the next active recall review of a chapter.',
    mathematicalFormula: 'Gap = max(1, round(defaultGaps[min(revisionNumber-1, 3)] * confidenceMultiplier[confidenceRating]))',
    interpretationGuide: 'Default gaps are Day 3 -> Day 7 -> Day 14 -> Day 30. High confidence (4-5) extends intervals by 1.5x; low confidence (1-2) halves them (0.5x).',
  },
  {
    name: 'Overdue Urgency Priority Score',
    category: 'Queue Prioritization',
    description: 'Heuristic ranking metric used to prioritize chapters most in need of immediate review.',
    mathematicalFormula: 'UrgencyScore = (daysOverdue * 3) + (5 - currentConfidence) * 4 + (testWithin7Days ? 15 : 0)',
    interpretationGuide: 'Higher urgency score ranks higher in daily study generation. Overdue low-confidence chapters surface first.',
  },
  {
    name: 'Required 1st Pass Weekly Velocity',
    category: 'Pacing & Timeline',
    description: 'The required rate of completing brand-new chapters per week to reach 100% syllabus coverage by the target deadline.',
    mathematicalFormula: 'RequiredWeeklyVelocity = remaining1stPassChapters / (daysUntilSyllabusTarget / 7)',
    interpretationGuide: 'If your actual velocity is below this number, your pace status is BEHIND and the syllabus will not finish on time without accelerating.',
  },
  {
    name: 'Projected Completion Date & Buffer Delta',
    category: 'Pacing & Timeline',
    description: 'The calendar date when the remaining 1st pass syllabus will be finished based on actual measured daily study velocity.',
    mathematicalFormula: 'ProjectedDate = today + (remaining1stPassChapters / actualDailyVelocity); BufferDelta = targetSyllabusDate - ProjectedDate',
    interpretationGuide: 'Positive buffer delta means you finish before the deadline (AHEAD); negative means you finish after the deadline (BEHIND).',
  },
  {
    name: 'Required Revision Pass Velocity',
    category: 'Revision Pacing',
    description: 'Weekly frequency of full-chapter revision cycles needed during the post-syllabus revision phase before NEET exam day.',
    mathematicalFormula: 'RequiredRevisionVelocity = (totalChapters * targetRevisionPasses) / weeksFromSyllabusTargetToExam',
    interpretationGuide: 'Ensures that every chapter is revised at least 2-3 times in the final 4-5 months leading up to the exam.',
  },
  {
    name: 'Mock Test Accuracy Rate',
    category: 'Test Performance',
    description: 'Percentage of attempted questions that were scored correct on mock tests.',
    mathematicalFormula: 'AccuracyRate = (correctQuestions / (correctQuestions + incorrectQuestions)) * 100%',
    interpretationGuide: 'In NEET UG, negative marks (-1 per wrong question) penalize low accuracy heavily. High-scoring aspirants maintain > 85% accuracy.',
  },
  {
    name: 'Mock Test Attempt Rate',
    category: 'Test Strategy',
    description: 'Percentage of total 180 questions that the student attempted on the exam.',
    mathematicalFormula: 'AttemptRate = ((totalQuestions - unattemptedQuestions) / totalQuestions) * 100%',
    interpretationGuide: 'Low attempt rates indicate either severe time management bottlenecks or deep conceptual omissions.',
  },
  {
    name: 'Diagnostic Error Taxonomy Breakdown',
    category: 'Error Analysis',
    description: 'Distribution of lost marks categorized into silly mistakes, conceptual gaps, recall failures, panic, and wild guessing.',
    mathematicalFormula: 'CategoryPct = (categoryErrorsCount / totalErrorsCount) * 100%',
    interpretationGuide: 'High silly mistakes requires slow bubbling drills; high conceptual gaps requires video lecture re-study; high memory recall requires daily Anki reviews.',
  },
  {
    name: 'Decay Prevention Tally',
    category: 'Efficacy Metric',
    description: 'Cumulative count of chapters where a timely spaced revision rescued a topic from critical memory loss (< 50% retention).',
    mathematicalFormula: 'TotalSavedCount = count(revisions where previousConfidence <= 2 and currentConfidence >= 3 or gap >= 7 days)',
    interpretationGuide: 'Proves the real-world value of adherence to the spaced repetition schedule in preventing knowledge atrophy.',
  },
];

export const DATA_DICTIONARY = {
  Chapter: {
    description: 'Represents a single NEET UG syllabus chapter with all milestone tracking and timestamps.',
    fields: {
      id: 'Unique identifier string (e.g. ch-phy-01)',
      name: 'Official chapter title according to NTA NEET syllabus',
      subject: 'One of Physics, Chemistry, Botany, Zoology',
      clusterId: '1 to 16 thematic unit grouping',
      clusterName: 'Thematic unit label (e.g. Thermodynamics & Kinetic Theory)',
      classLevel: "'11' or '12' NCERT curriculum level",
      learningStage: 'NOT_STARTED | IN_PROGRESS | FIRST_PASS_DONE | IN_REVISION',
      completionPercentage: '0 to 100 percent completion',
      pillars: 'Boolean map: { lectures, bookReading, classNotes, questionPractice, anki }',
      startedDate: 'YYYY-MM-DD string when chapter was first studied',
      firstPassCompletedDate: 'YYYY-MM-DD string when chapter reached 100% first pass',
      daysTakenToComplete: 'Integer elapsed days from startedDate to firstPassCompletedDate',
      targetDeadline: 'YYYY-MM-DD target date (auto-propagated from nearest linked test or user set)',
      updatedAt: 'Epoch millisecond timestamp of last change for cross-device sync',
      totalStudySessions: 'Total count of study sessions logged for this chapter',
      currentConfidence: '0 (unstudied) or 1 to 5 active recall confidence scale',
      lastStudiedDate: 'YYYY-MM-DD string of most recent study session',
      nextRevisionDate: 'YYYY-MM-DD string of next scheduled SuperMemo SM-2 review',
      revisionCount: 'Current revision pass (0 for 1st pass, 1 for Pass 1, 2 for Pass 2, etc.)',
      isArchived: 'Boolean soft-delete flag',
      notes: 'Freeform qualitative formula notes or student memos',
      createdAt: 'YYYY-MM-DD record creation timestamp',
    },
  },
  StudyLog: {
    description: 'Immutable record of an individual study session with forensic timestamps.',
    fields: {
      id: 'Unique identifier string (e.g. log-1718000000000-abc12)',
      chapterId: 'Reference to target Chapter ID',
      chapterName: 'Snapshot of chapter name at time of study',
      subject: 'Physics, Chemistry, Botany, or Zoology',
      dateStudied: 'YYYY-MM-DD date when study occurred',
      sessionType: "'progress' (continuing pass), 'first_pass_complete' (finished 100%), or 'revision_round_complete'",
      completionPercentage: 'Chapter completion percentage after this session',
      pillarsCompleted: 'Map of pillars completed or checked in this session',
      hoursSpent: 'Decimal hours studied (e.g. 1.5, 2.0)',
      confidenceRating: '1 to 5 rating awarded during active recall',
      revisionNumber: 'Revision pass number associated with this session',
      note: 'Student session log notes or active recall commentary',
      timestamp: 'Epoch millisecond timestamp of entry creation',
    },
  },
  Test: {
    description: 'Scheduled mock test or coaching test series entry.',
    fields: {
      id: 'Unique test identifier string (e.g. test-01)',
      name: 'Test title (e.g. Allen Major Test 04 - Full PCB)',
      coachingName: 'Coaching institute name (e.g. Allen, Aakash, Resonance, Self-Test)',
      date: 'YYYY-MM-DD exam date',
      subjectOrScope: 'Syllabus scope description',
      linkedChapterIds: 'Array of Chapter ID strings tested in this mock exam',
      totalMarks: 'Maximum possible marks (default 720)',
      createdAt: 'YYYY-MM-DD creation date',
      updatedAt: 'Epoch millisecond timestamp of last edit',
      timestamp: 'Epoch millisecond creation timestamp',
    },
  },
  TestScore: {
    description: 'Performance scorecard and diagnostic error report for a mock test.',
    fields: {
      id: 'Unique score identifier (e.g. score-1718000000000-xyz)',
      testId: 'Reference to target Test ID',
      testName: 'Snapshot of test name',
      dateRecorded: 'YYYY-MM-DD exam date',
      totalScore: 'Total marks scored (out of 720)',
      maxScore: '720 maximum marks',
      totalQuestions: '180 total questions',
      correctQuestions: 'Count of correct responses (+4 each)',
      incorrectQuestions: 'Count of incorrect responses (-1 each)',
      unattemptedQuestions: 'Count of unattempted responses (0 marks)',
      subjectScores: '{ Physics, Chemistry, Botany, Zoology } marks breakdown (out of 180 each)',
      errors: '{ sillyMistakes, conceptualGaps, memoryRecall, timePressure, guessingWild, bySubject, notes }',
      notes: 'Qualitative diagnostic retrospective notes',
      timestamp: 'Epoch millisecond timestamp of score entry',
    },
  },
  ActionLog: {
    description: 'Forensic audit trail logging literally every user and tool interaction in the application.',
    fields: {
      id: 'Unique audit action ID (act-{timestamp}-{random})',
      actionType: 'Action verb string (STUDY_SESSION_LOGGED, CHAPTER_UPDATED, TEST_ADDED, etc.)',
      description: 'Human-readable summary of the modification',
      entityType: 'chapter | test | score | studyLog | settings | pacing | system',
      entityId: 'Target entity ID modified',
      timestamp: 'Epoch millisecond timestamp',
      timestampIso: 'ISO 8601 UTC timestamp string',
      metadata: 'JSON payload describing exact parameters changed',
    },
  },
};

export const MCP_TOOLS_DIRECTORY = [
  {
    name: 'get_app_features',
    description:
      'Exhaustive operational manual of EVERY single feature in the PCB-01 NEET Study Console: architectural breakdown of all 15 core features, how each feature works, data schemas recorded with exact timestamps, user interaction triggers, and full data dictionary.',
    parameters: {
      detailedFeature: 'string (default all) - Filter to deep-dive into a specific feature',
    },
  },
  {
    name: 'get_working_analytics',
    description:
      'Exhaustive analytical intelligence tool detailing EVERY working analytics metric in the app, the exact mathematical formulas used (SM-2, Ebbinghaus decay R=e^(-t/S), pacing velocity, error taxonomy), and computes the full live working analytics for the user active database.',
    parameters: {
      subject: 'enum (Physics | Chemistry | Botany | Zoology | All) (default All)',
    },
  },
  {
    name: 'get_everything',
    description:
      'Master tool: Exhaustive all-in-one dump of literally EVERY single data point, timestamp, raw history, AND full live working analytics across all domains in the app.',
    parameters: {
      subject: 'enum (Physics | Chemistry | Botany | Zoology | All)',
      includeArchived: 'boolean',
    },
  },
  {
    name: 'get_study_status',
    description: 'Get high-level NEET preparation overview: syllabus progress per subject, due chapters, high-risk topics, and mock test radar.',
    parameters: {},
  },
  {
    name: 'list_due_chapters',
    description: 'Query chapters currently due or overdue for SuperMemo SM-2 spaced repetition revision.',
    parameters: {
      subject: 'enum (Physics | Chemistry | Botany | Zoology | All)',
      overdueOnly: 'boolean',
      limit: 'number',
    },
  },
  {
    name: 'search_chapters',
    description: 'Search syllabus chapters by topic name, subject, or learning stage.',
    parameters: {
      query: 'string',
      subject: 'string',
      stage: 'string',
      minConfidence: 'number',
      maxConfidence: 'number',
      limit: 'number',
    },
  },
  {
    name: 'get_chapter_details',
    description: 'Retrieve all data points for a specific chapter: all fields, full study logs, linked tests, and timestamps.',
    parameters: {
      chapterId: 'string (required)',
    },
  },
  {
    name: 'add_chapter',
    description: 'Add a new syllabus chapter with full fields and timestamps.',
    parameters: {
      name: 'string (required)',
      subject: 'enum (Physics | Chemistry | Botany | Zoology) (required)',
      clusterName: 'string',
      classLevel: "'11' | '12'",
      targetDeadline: 'string (YYYY-MM-DD)',
      notes: 'string',
    },
  },
  {
    name: 'update_chapter',
    description: 'Update any fields of a chapter (name, stage, confidence, deadline, notes) with timestamps.',
    parameters: {
      chapterId: 'string (required)',
      name: 'string',
      learningStage: 'string',
      completionPercentage: 'number',
      currentConfidence: 'number',
      targetDeadline: 'string',
      notes: 'string',
      nextRevisionDate: 'string',
    },
  },
  {
    name: 'update_chapter_pillars',
    description: 'Update milestone checklist pillars (lectures, bookReading, classNotes, questionPractice, anki) with timestamps.',
    parameters: {
      chapterId: 'string (required)',
      lectures: 'boolean',
      bookReading: 'boolean',
      classNotes: 'boolean',
      questionPractice: 'boolean',
      anki: 'boolean',
    },
  },
  {
    name: 'archive_chapter',
    description: 'Archive or restore a chapter from active spaced repetition scheduling.',
    parameters: {
      chapterId: 'string (required)',
      isArchived: 'boolean (required)',
    },
  },
  {
    name: 'generate_study_session',
    description: 'Algorithmic study session generator that recommends chapters based on urgency and time budget.',
    parameters: {
      mode: "enum ('worst_first' | 'weighted' | 'random')",
      availableMinutes: 'number (e.g. 120)',
      subject: 'enum (Physics | Chemistry | Botany | Zoology | All)',
    },
  },
  {
    name: 'log_study_session',
    description: 'Log a completed study session with exact timestamps, updating SM-2 intervals and audit history.',
    parameters: {
      chapterId: 'string (required)',
      confidenceRating: 'number (1-5) (required)',
      dateStudied: 'string (YYYY-MM-DD)',
      sessionType: "'progress' | 'first_pass_complete' | 'revision_round_complete'",
      completionPercentage: 'number (0-100)',
      hoursSpent: 'number',
      note: 'string',
    },
  },
  {
    name: 'list_tests',
    description: 'List upcoming and historical mock tests with linked chapter counts and score status.',
    parameters: {
      limit: 'number',
    },
  },
  {
    name: 'get_test_details',
    description: 'Get exhaustive details of a test, linked chapters, and recorded scorecard.',
    parameters: {
      testId: 'string (required)',
    },
  },
  {
    name: 'add_test',
    description: 'Schedule a new mock test with target date, coaching institute, and syllabus scope.',
    parameters: {
      name: 'string (required)',
      date: 'string (YYYY-MM-DD) (required)',
      subjectOrScope: 'string (required)',
      coachingName: 'string',
      totalMarks: 'number',
    },
  },
  {
    name: 'delete_test',
    description: 'Remove a mock test and clear associated deadlines from linked chapters.',
    parameters: {
      testId: 'string (required)',
    },
  },
  {
    name: 'link_chapters_to_test',
    description: 'Link syllabus chapters to a test and synchronize target deadlines.',
    parameters: {
      testId: 'string (required)',
      chapterIds: 'string[] (required)',
      syncDeadlines: 'boolean',
    },
  },
  {
    name: 'add_test_score',
    description: 'Record mock test score / 720 with subject marks, question counts, and diagnostic error breakdown.',
    parameters: {
      testId: 'string (required)',
      totalScore: 'number (0-720) (required)',
      physicsScore: 'number',
      chemistryScore: 'number',
      botanyScore: 'number',
      zoologyScore: 'number',
      sillyMistakesCount: 'number',
      conceptualGapsCount: 'number',
      notes: 'string',
    },
  },
  {
    name: 'update_spaced_repetition_settings',
    description: 'Configure default SM-2 interval gaps and confidence multipliers.',
    parameters: {
      defaultGaps: 'number[]',
      confMultiplier1: 'number',
      confMultiplier2: 'number',
      confMultiplier3: 'number',
      confMultiplier4: 'number',
      confMultiplier5: 'number',
    },
  },
  {
    name: 'update_pacing_settings',
    description: 'Configure syllabus pacing goals, exam date, and revision targets.',
    parameters: {
      targetExamDate: 'string (YYYY-MM-DD)',
      targetSyllabusDate: 'string (YYYY-MM-DD)',
      targetRevisionPasses: 'number',
      targetMockTestsCount: 'number',
    },
  },
  {
    name: 'get_action_history',
    description: 'Query the complete chronological audit log of all actions taken in the application with exact timestamps.',
    parameters: {
      limit: 'number',
      entityType: "enum ('chapter' | 'test' | 'score' | 'studyLog' | 'settings' | 'pacing' | 'system' | 'all')",
    },
  },
];

/**
 * Builds the dedicated app features manual and data dictionary (separated from analytics).
 */
export function buildAppFeatures(
  state: AppState,
  options?: {
    detailedFeature?: string;
  }
) {
  const today = getTodayStr();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const filteredFeatures =
    options?.detailedFeature && options.detailedFeature !== 'all'
      ? FEATURES_LIST.filter((f) => f.id.toLowerCase().includes(options.detailedFeature!.toLowerCase()))
      : FEATURES_LIST;

  return {
    metadata: {
      appName: 'PCB-01 Teenage Engineering Spaced Repetition Console (NEET UG Edition)',
      version: '2.2.0',
      manifestType: 'APP_FEATURES_AND_DATA_SCHEMAS',
      generatedAt: now,
      generatedAtIso: nowIso,
      currentDate: today,
      protocolVersion: '2024-11-05',
      totalFeaturesDocumented: filteredFeatures.length,
      deviceClientId: state.deviceClientId || null,
      lastStateUpdatedTimestamp: state.updatedAt || now,
      lastStateUpdatedIso: state.updatedAt ? new Date(state.updatedAt).toISOString() : nowIso,
    },
    appPhilosophyAndDesignSystem: {
      designEthos:
        'Tactile, distraction-free Teenage Engineering hardware simulator created specifically for NEET UG medical aspirants facing the rigorous 86-chapter syllabus.',
      chassisAesthetic:
        'Anodized aluminum body, mechanical Philips-head chassis screws, 1-bit high-contrast monochrome palettes with industrial safety orange (#FF3B00) accenting, retro LCD dot-matrix and segmented telemetry.',
      tactileControls:
        'Mechanical rotary knobs with radial drag physics, two/three-state rocker switches, and spring-resistance mechanical sliders.',
      audioSynthesis:
        'Procedural sound synthesizer built purely on HTML5 Web Audio API (zero external sound files) providing mechanical clicks, latches, warning buzzers, and harmonic completion chimes.',
    },
    featureCatalog: filteredFeatures,
    whatIsRecordedDataDictionary: DATA_DICTIONARY,
    mcpToolsDirectory: MCP_TOOLS_DIRECTORY,
  };
}

/**
 * Builds the dedicated working analytics manual and live computed analytics (separated from features).
 */
export function buildWorkingAnalytics(
  state: AppState,
  options?: {
    subject?: string;
  }
) {
  const today = getTodayStr();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const liveAnalytics = computeLiveAnalytics(state);

  return {
    metadata: {
      appName: 'PCB-01 Teenage Engineering Spaced Repetition Console (NEET UG Edition)',
      version: '2.2.0',
      manifestType: 'WORKING_ANALYTICS_INTELLIGENCE',
      generatedAt: now,
      generatedAtIso: nowIso,
      currentDate: today,
      protocolVersion: '2024-11-05',
      totalWorkingAnalyticsMetrics: ANALYTICS_MANUAL.length,
      deviceClientId: state.deviceClientId || null,
      lastStateUpdatedTimestamp: state.updatedAt || now,
      lastStateUpdatedIso: state.updatedAt ? new Date(state.updatedAt).toISOString() : nowIso,
    },
    workingAnalyticsEngineManual: ANALYTICS_MANUAL,
    liveWorkingAnalytics: liveAnalytics,
    subjectFilterApplied: options?.subject || 'All',
  };
}

/**
 * Combined helper for backward compatibility.
 */
export function buildAppFeaturesAndAnalytics(
  state: AppState,
  options?: {
    includeLiveAnalytics?: boolean;
    detailedFeature?: string;
  }
) {
  const features = buildAppFeatures(state, { detailedFeature: options?.detailedFeature });
  const analytics = buildWorkingAnalytics(state);

  return {
    metadata: {
      ...features.metadata,
      manifestType: 'FULL_FEATURE_CATALOG_AND_WORKING_ANALYTICS',
      totalWorkingAnalyticsMetrics: ANALYTICS_MANUAL.length,
    },
    appPhilosophyAndDesignSystem: features.appPhilosophyAndDesignSystem,
    featureCatalog: features.featureCatalog,
    whatIsRecordedDataDictionary: features.whatIsRecordedDataDictionary,
    workingAnalyticsEngineManual: analytics.workingAnalyticsEngineManual,
    liveWorkingAnalytics: options?.includeLiveAnalytics !== false ? analytics.liveWorkingAnalytics : null,
    mcpToolsDirectory: features.mcpToolsDirectory,
  };
}
