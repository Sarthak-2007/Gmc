import { AppState, Chapter, StudyLog, Test, TestScore, Subject } from '../types';
import { addDaysToDateStr, getTodayStr } from './spacedRepetition';
import { INITIAL_CHAPTERS, INITIAL_TESTS, DEFAULT_SETTINGS, DEFAULT_PACING_SETTINGS } from '../data/seedData';

/**
 * Generates an authentic, comprehensive 1-year (365-day) study history and testing dataset.
 * - 220+ realistic study session logs spanning 52 weeks (fills consistency heatmap & streaks).
 * - 24 bi-weekly mock tests throughout the year with rising score trajectories (490 -> 680+).
 * - Detailed error classifications (silly mistakes, conceptual gaps, recall lapses, time pressure).
 * - Multi-tier chapter mastery across all 4 subjects (Grade S, A, B, C, D, E).
 */
export function generateOneYearTestingData(currentState?: AppState): AppState {
  const todayStr = getTodayStr();
  const baseChapters = (currentState?.chapters && currentState.chapters.length > 0)
    ? currentState.chapters
    : INITIAL_CHAPTERS;

  // 1. Generate 24 Bi-Weekly Mock Tests spread across the past 365 days
  const generatedTests: Test[] = [];
  const generatedScores: TestScore[] = [];

  const coachingNames = ['Allen', 'Aakash', 'All-India Major Mock', 'NEET Pulse Test Series'];

  for (let testIdx = 0; testIdx < 24; testIdx++) {
    // Tests spaced ~15 days apart going back from 8 days ago to ~353 days ago
    const daysAgo = 8 + (23 - testIdx) * 15;
    const testDate = addDaysToDateStr(todayStr, -daysAgo);
    const testId = `test-1yr-sim-${testIdx + 1}`;
    const coaching = coachingNames[testIdx % coachingNames.length];
    const testName = `${coaching} UG Mock Exam #${testIdx + 1}`;

    // Subject/Scope descriptor
    const scope = testIdx < 6
      ? 'Part Syllabus: Mechanics, Atomic Structure, Living World, Animal Diversity'
      : testIdx < 14
      ? 'Half Syllabus: Class 11 Comprehensive Cumulative'
      : testIdx < 20
      ? 'Advanced Cumulative: Class 11 & Class 12 Combined Topics'
      : 'Full Syllabus Grand All-India Mock (NEET Standard)';

    // Random linked chapters from all subjects
    const linkedIds = baseChapters
      .filter((_, idx) => (idx + testIdx) % 3 === 0 || testIdx >= 18)
      .map((c) => c.id);

    generatedTests.push({
      id: testId,
      name: testName,
      coachingName: coaching,
      date: testDate,
      subjectOrScope: scope,
      linkedChapterIds: linkedIds.length > 0 ? linkedIds : baseChapters.map((c) => c.id),
      totalMarks: 720,
      createdAt: addDaysToDateStr(testDate, -7),
      timestamp: new Date(testDate).getTime(),
    });

    // Score progression: starts around 495 in month 1, rises steadily to 682
    const baseProgressRatio = testIdx / 23; // 0 to 1
    const jitter = ((testIdx * 7) % 15) - 7; // -7 to +7 jitter
    const totalScore = Math.min(710, Math.round(492 + baseProgressRatio * 185 + jitter));

    // Subject breakdowns (approx 180 marks each)
    const phyScore = Math.min(180, Math.round(112 + baseProgressRatio * 48 + ((testIdx * 3) % 7) - 3));
    const chmScore = Math.min(180, Math.round(122 + baseProgressRatio * 46 + ((testIdx * 5) % 7) - 3));
    const botScore = Math.min(180, Math.round(132 + baseProgressRatio * 44 + ((testIdx * 2) % 5) - 2));
    const zooScore = totalScore - (phyScore + chmScore + botScore);

    // Questions: total 180
    // Correct questions starts ~125 and rises to ~172
    const correctQ = Math.min(176, Math.max(120, Math.round(124 + baseProgressRatio * 47)));
    const incorrectQ = Math.max(4, Math.round(36 - baseProgressRatio * 26 + ((testIdx * 4) % 5) - 2));
    const unattemptedQ = Math.max(0, 180 - (correctQ + incorrectQ));

    // Error classification declines as preparation improves
    const sillyMistakes = Math.max(1, Math.round(8 - baseProgressRatio * 5));
    const conceptualGaps = Math.max(1, Math.round(14 - baseProgressRatio * 11));
    const memoryRecall = Math.max(1, Math.round(9 - baseProgressRatio * 7));
    const timePressure = Math.max(1, Math.round(5 - baseProgressRatio * 4));

    generatedScores.push({
      id: `score-1yr-sim-${testIdx + 1}`,
      testId,
      testName,
      dateRecorded: testDate,
      totalScore,
      maxScore: 720,
      totalQuestions: 180,
      correctQuestions: correctQ,
      incorrectQuestions: incorrectQ,
      unattemptedQuestions: unattemptedQ,
      subjectScores: {
        Physics: phyScore,
        Chemistry: chmScore,
        Botany: botScore,
        Zoology: zooScore,
      },
      subjectQuestions: {
        Physics: { correct: Math.round(phyScore / 4), incorrect: Math.round(incorrectQ * 0.35), unattempted: Math.round(unattemptedQ * 0.35), score: phyScore },
        Chemistry: { correct: Math.round(chmScore / 4), incorrect: Math.round(incorrectQ * 0.25), unattempted: Math.round(unattemptedQ * 0.25), score: chmScore },
        Botany: { correct: Math.round(botScore / 4), incorrect: Math.round(incorrectQ * 0.2), unattempted: Math.round(unattemptedQ * 0.2), score: botScore },
        Zoology: { correct: Math.round(zooScore / 4), incorrect: Math.round(incorrectQ * 0.2), unattempted: Math.round(unattemptedQ * 0.2), score: zooScore },
      },
      errors: {
        sillyMistakes,
        conceptualGaps,
        memoryRecall,
        timePressure,
        bySubject: {
          Physics: { sillyMistakes: Math.round(sillyMistakes * 0.4), conceptualGaps: Math.round(conceptualGaps * 0.4), memoryRecall: Math.round(memoryRecall * 0.2), timePressure: Math.round(timePressure * 0.5) },
          Chemistry: { sillyMistakes: Math.round(sillyMistakes * 0.3), conceptualGaps: Math.round(conceptualGaps * 0.3), memoryRecall: Math.round(memoryRecall * 0.4), timePressure: Math.round(timePressure * 0.3) },
          Botany: { sillyMistakes: Math.round(sillyMistakes * 0.15), conceptualGaps: Math.round(conceptualGaps * 0.15), memoryRecall: Math.round(memoryRecall * 0.2), timePressure: Math.round(timePressure * 0.1) },
          Zoology: { sillyMistakes: Math.round(sillyMistakes * 0.15), conceptualGaps: Math.round(conceptualGaps * 0.15), memoryRecall: Math.round(memoryRecall * 0.2), timePressure: Math.round(timePressure * 0.1) },
        },
        notes: testIdx > 18
          ? 'High accuracy achieved in Mechanics & Organic Chemistry. Minimized silly calculation blunders.'
          : 'Formula application improved. Identified revision needs in Genetics & Thermodynamics.',
      },
      notes: `Official exam log · Scaled yield: ${totalScore} / 720 (${Math.round((totalScore / 720) * 100)}%)`,
      timestamp: new Date(testDate).getTime(),
    });
  }

  // Combine with future scheduled tests if already present
  const futureTests = (currentState?.tests || INITIAL_TESTS).filter((t) => t.date > todayStr);
  const allTests = [...generatedTests, ...futureTests];

  // 2. Generate 220+ Realistic Study Logs across the 365 Days
  const generatedLogs: StudyLog[] = [];
  const numLogs = 230;

  for (let i = 0; i < numLogs; i++) {
    // Spread evenly across 365 days
    const daysAgo = Math.round(364 - (i / numLogs) * 363);
    const dateStudied = addDaysToDateStr(todayStr, -daysAgo);

    // Pick a chapter rotating through subjects
    const chIndex = (i * 3 + (i % 7)) % baseChapters.length;
    const targetChapter = baseChapters[chIndex];

    const isLateInYear = daysAgo < 90;
    const hoursSpent = Number((1.2 + ((i % 5) * 0.4)).toFixed(1)); // 1.2 to 2.8 hrs
    const confidenceRating = isLateInYear ? Math.min(5, Math.floor(3 + (i % 3))) : Math.min(5, Math.floor(2 + (i % 4)));
    const revisionNumber = Math.min(4, Math.floor(i / 55) + 1);

    generatedLogs.push({
      id: `log-1yr-sim-${i + 1}`,
      chapterId: targetChapter.id,
      chapterName: targetChapter.name,
      subject: targetChapter.subject,
      dateStudied,
      sessionType: i % 4 === 0 ? 'revision_round_complete' : 'progress',
      completionPercentage: Math.min(100, 30 + ((i % 4) + 1) * 20),
      pillarsCompleted: {
        lectures: true,
        bookReading: i % 2 === 0,
        ncertReading: i % 2 === 0,
        classNotes: true,
        questionPractice: i % 3 !== 0,
        anki: isLateInYear,
      },
      hoursSpent,
      confidenceRating,
      revisionNumber,
      note: i % 5 === 0
        ? `Solved 50 PYQs & completed Anki spaced recall cards for ${targetChapter.name}.`
        : `Theory review & NCERT core concepts study session.`,
      timestamp: new Date(`${dateStudied}T18:30:00`).getTime() + (i % 1000),
    });
  }

  // 3. Update Chapters to reflect 1 year of consistent preparation
  const totalCh = baseChapters.length;
  const updatedChapters: Chapter[] = baseChapters.map((ch, idx) => {
    const ratio = idx / Math.max(1, totalCh);

    if (ratio < 0.32) {
      // Grade S (~32% of syllabus: Mastered, 3+ revisions, 5★, 100% complete)
      const daysSince = 1 + (idx % 8);
      const lastStudied = addDaysToDateStr(todayStr, -daysSince);
      const nextRev = addDaysToDateStr(todayStr, 24 - daysSince);
      return {
        ...ch,
        learningStage: 'IN_REVISION',
        completionPercentage: 100,
        currentConfidence: 5,
        revisionCount: 3 + (idx % 2),
        totalStudySessions: 6 + (idx % 4),
        lastStudiedDate: lastStudied,
        nextRevisionDate: nextRev,
        startedDate: addDaysToDateStr(todayStr, -320 + idx * 3),
        firstPassCompletedDate: addDaysToDateStr(todayStr, -260 + idx * 3),
        daysTakenToComplete: 12,
        pillars: { lectures: true, bookReading: true, ncertReading: true, classNotes: true, questionPractice: true, anki: true },
        updatedAt: new Date(lastStudied).getTime(),
      };
    } else if (ratio < 0.62) {
      // Grade A (~30% of syllabus: Strong, 2 revisions, 4★, 100% complete)
      const daysSince = 4 + (idx % 12);
      const lastStudied = addDaysToDateStr(todayStr, -daysSince);
      const nextRev = addDaysToDateStr(todayStr, 18 - daysSince);
      return {
        ...ch,
        learningStage: 'IN_REVISION',
        completionPercentage: 100,
        currentConfidence: 4,
        revisionCount: 2,
        totalStudySessions: 4 + (idx % 3),
        lastStudiedDate: lastStudied,
        nextRevisionDate: nextRev,
        startedDate: addDaysToDateStr(todayStr, -220 + idx * 2),
        firstPassCompletedDate: addDaysToDateStr(todayStr, -170 + idx * 2),
        daysTakenToComplete: 14,
        pillars: { lectures: true, bookReading: true, ncertReading: true, classNotes: true, questionPractice: true, anki: idx % 2 === 0 },
        updatedAt: new Date(lastStudied).getTime(),
      };
    } else if (ratio < 0.80) {
      // Grade B (~18% of syllabus: Foundation, 1 revision, 3-4★, 100% complete)
      const daysSince = 8 + (idx % 14);
      const lastStudied = addDaysToDateStr(todayStr, -daysSince);
      const nextRev = addDaysToDateStr(todayStr, 12 - daysSince);
      return {
        ...ch,
        learningStage: 'IN_REVISION',
        completionPercentage: 100,
        currentConfidence: 3,
        revisionCount: 1,
        totalStudySessions: 3,
        lastStudiedDate: lastStudied,
        nextRevisionDate: nextRev,
        startedDate: addDaysToDateStr(todayStr, -140 + idx * 2),
        firstPassCompletedDate: addDaysToDateStr(todayStr, -90 + idx * 2),
        daysTakenToComplete: 14,
        pillars: { lectures: true, bookReading: true, ncertReading: true, classNotes: true, questionPractice: true, anki: false },
        updatedAt: new Date(lastStudied).getTime(),
      };
    } else if (ratio < 0.90) {
      // Grade C (~10% of syllabus: 1st Pass Done, 0 revisions, 3★, 100% complete)
      const daysSince = 14 + (idx % 10);
      const lastStudied = addDaysToDateStr(todayStr, -daysSince);
      const nextRev = addDaysToDateStr(todayStr, 4);
      return {
        ...ch,
        learningStage: 'FIRST_PASS_DONE',
        completionPercentage: 100,
        currentConfidence: 3,
        revisionCount: 0,
        totalStudySessions: 2,
        lastStudiedDate: lastStudied,
        nextRevisionDate: nextRev,
        startedDate: addDaysToDateStr(todayStr, -60 + idx),
        firstPassCompletedDate: lastStudied,
        daysTakenToComplete: 10,
        pillars: { lectures: true, bookReading: true, ncertReading: true, classNotes: true, questionPractice: false, anki: false },
        updatedAt: new Date(lastStudied).getTime(),
      };
    } else if (ratio < 0.94) {
      // Grade D (~4% of syllabus: In Progress, 60% complete, 2★)
      const daysSince = 2 + (idx % 4);
      const lastStudied = addDaysToDateStr(todayStr, -daysSince);
      return {
        ...ch,
        learningStage: 'IN_PROGRESS',
        completionPercentage: 55 + (idx % 2) * 20,
        currentConfidence: 2,
        revisionCount: 0,
        totalStudySessions: 1,
        lastStudiedDate: lastStudied,
        nextRevisionDate: null,
        startedDate: addDaysToDateStr(todayStr, -18),
        firstPassCompletedDate: null,
        daysTakenToComplete: null,
        pillars: { lectures: true, bookReading: true, ncertReading: true, classNotes: false, questionPractice: false, anki: false },
        updatedAt: new Date(lastStudied).getTime(),
      };
    } else if (ratio < 0.97) {
      // Grade E (~3% of syllabus: Overdue Review, Needs Immediate Attention)
      const daysSince = 36;
      const lastStudied = addDaysToDateStr(todayStr, -daysSince);
      const nextRev = addDaysToDateStr(todayStr, -12); // Overdue by 12 days!
      return {
        ...ch,
        learningStage: 'IN_REVISION',
        completionPercentage: 100,
        currentConfidence: 2,
        revisionCount: 1,
        totalStudySessions: 2,
        lastStudiedDate: lastStudied,
        nextRevisionDate: nextRev,
        startedDate: addDaysToDateStr(todayStr, -180),
        firstPassCompletedDate: addDaysToDateStr(todayStr, -150),
        daysTakenToComplete: 16,
        pillars: { lectures: true, bookReading: false, ncertReading: false, classNotes: true, questionPractice: false, anki: false },
        updatedAt: new Date(lastStudied).getTime(),
      };
    } else {
      // Grade F (~3% of syllabus: Untouched)
      return {
        ...ch,
        learningStage: 'NOT_STARTED',
        completionPercentage: 0,
        currentConfidence: 0,
        revisionCount: 0,
        totalStudySessions: 0,
        lastStudiedDate: null,
        nextRevisionDate: null,
        startedDate: null,
        firstPassCompletedDate: null,
        daysTakenToComplete: null,
        pillars: { lectures: false, bookReading: false, ncertReading: false, classNotes: false, questionPractice: false, anki: false },
        updatedAt: Date.now(),
      };
    }
  });

  return {
    chapters: updatedChapters,
    studyLogs: generatedLogs,
    tests: allTests,
    testScores: generatedScores,
    settings: currentState?.settings || DEFAULT_SETTINGS,
    pacingSettings: currentState?.pacingSettings || DEFAULT_PACING_SETTINGS,
    tutorialCompleted: true,
    updatedAt: Date.now(),
  };
}
