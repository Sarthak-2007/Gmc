import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  ActionLog,
  AppState,
  Chapter,
  ErrorBreakdown,
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
  getDecayPreventedStats,
  getDaysDifference,
  getTodayStr,
} from './spacedRepetition';
import {
  buildAppFeatures,
  buildWorkingAnalytics,
  buildAppFeaturesAndAnalytics,
  computeLiveAnalytics,
} from './featureManifest';
import {
  computeDailySummary,
  computeDecayForecast,
  diagnoseWeakSpots,
  generateBackupPayload,
  validateAndRestorePayload,
  renderPromptTemplate,
  computeWeeklyAuditReceipt,
  computePanoramicMatrixStatus,
} from './mcpExtensions';
export {
  buildAppFeatures,
  buildWorkingAnalytics,
  buildAppFeaturesAndAnalytics,
  computeLiveAnalytics,
  computeDailySummary,
  computeDecayForecast,
  diagnoseWeakSpots,
  generateBackupPayload,
  validateAndRestorePayload,
  renderPromptTemplate,
  computeWeeklyAuditReceipt,
  computePanoramicMatrixStatus,
};

export interface McpExecutionResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Creates an ActionLog entry recording an action with exact timestamps.
 */
function recordAction(
  state: AppState,
  actionType: string,
  description: string,
  entityType: 'chapter' | 'test' | 'score' | 'studyLog' | 'settings' | 'pacing' | 'system',
  entityId?: string,
  metadata?: Record<string, any>
): ActionLog[] {
  const now = Date.now();
  const newAction: ActionLog = {
    id: `act-${now}-${Math.random().toString(36).slice(2, 7)}`,
    actionType,
    description,
    entityType,
    entityId,
    timestamp: now,
    timestampIso: new Date(now).toISOString(),
    metadata,
  };
  return [newAction, ...(state.actionHistory || [])];
}

/**
 * Builds the exhaustive "everything" data dump containing literally all data points,
 * computed metrics, and history.
 */
export function buildEverythingDump(
  state: AppState,
  options?: { subject?: string; includeArchived?: boolean; includeAnalytics?: boolean }
) {
  const today = getTodayStr();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  let chapters = state.chapters || [];
  if (options?.subject && options.subject !== 'All') {
    chapters = chapters.filter((c) => c.subject === options.subject);
  }
  if (options?.includeArchived === false) {
    chapters = chapters.filter((c) => !c.isArchived);
  }

  // Format chapters with full forensic timestamps & status calculations
  const formattedChapters = chapters.map((ch) => {
    const diff = ch.nextRevisionDate ? getDaysDifference(today, ch.nextRevisionDate) : null;
    let currentStatus = 'not_started';
    let daysOverdue = 0;
    if (ch.nextRevisionDate) {
      if (diff! < 0) {
        currentStatus = 'overdue';
        daysOverdue = Math.abs(diff!);
      } else if (diff === 0) {
        currentStatus = 'due_today';
      } else if (diff! <= 3) {
        currentStatus = 'due_soon';
      } else {
        currentStatus = 'scheduled';
      }
    } else if ((ch.completionPercentage ?? 0) > 0 || ch.learningStage === 'IN_PROGRESS') {
      currentStatus = 'in_progress';
    }

    const urgencyScore = (daysOverdue * 3) + (5 - (ch.currentConfidence || 1)) * 4;

    return {
      id: ch.id,
      name: ch.name,
      subject: ch.subject,
      clusterId: ch.clusterId,
      clusterName: ch.clusterName,
      classLevel: ch.classLevel || '11',
      learningStage: ch.learningStage || 'NOT_STARTED',
      completionPercentage: ch.completionPercentage ?? 0,
      currentConfidence: ch.currentConfidence,
      pillars: {
        lectures: !!ch.pillars?.lectures,
        bookReading: !!(ch.pillars?.bookReading ?? ch.pillars?.ncertReading),
        ncertReading: !!(ch.pillars?.bookReading ?? ch.pillars?.ncertReading),
        classNotes: !!ch.pillars?.classNotes,
        questionPractice: !!ch.pillars?.questionPractice,
        anki: !!ch.pillars?.anki,
      },
      startedDate: ch.startedDate || null,
      firstPassCompletedDate: ch.firstPassCompletedDate || null,
      daysTakenToComplete: ch.daysTakenToComplete ?? null,
      targetDeadline: ch.targetDeadline || null,
      lastStudiedDate: ch.lastStudiedDate || null,
      nextRevisionDate: ch.nextRevisionDate || null,
      revisionCount: ch.revisionCount || 0,
      totalStudySessions: ch.totalStudySessions || 0,
      isArchived: !!ch.isArchived,
      notes: ch.notes || '',
      createdAt: ch.createdAt || today,
      updatedAt: ch.updatedAt || now,
      updatedAtIso: ch.updatedAt ? new Date(ch.updatedAt).toISOString() : nowIso,
      currentStatus,
      daysOverdue,
      urgencyScore,
    };
  });

  // Format study logs with timestamps
  const formattedLogs = (state.studyLogs || []).map((l) => ({
    id: l.id,
    chapterId: l.chapterId,
    chapterName: l.chapterName,
    subject: l.subject,
    dateStudied: l.dateStudied,
    sessionType: l.sessionType || 'revision_round_complete',
    completionPercentage: l.completionPercentage,
    pillarsCompleted: l.pillarsCompleted,
    hoursSpent: l.hoursSpent || 1,
    confidenceRating: l.confidenceRating,
    revisionNumber: l.revisionNumber,
    note: l.note || '',
    timestamp: l.timestamp,
    timestampIso: new Date(l.timestamp).toISOString(),
  }));

  // Format tests with timestamps & linked chapter names
  const chapterNameMap = new Map((state.chapters || []).map((c) => [c.id, c.name]));
  const formattedTests = (state.tests || []).map((t) => {
    const daysRemaining = getDaysDifference(today, t.date);
    return {
      id: t.id,
      name: t.name,
      coachingName: t.coachingName || 'Self-Test',
      date: t.date,
      daysRemaining,
      subjectOrScope: t.subjectOrScope,
      linkedChapterIds: t.linkedChapterIds || [],
      linkedChapterNames: (t.linkedChapterIds || []).map((id) => chapterNameMap.get(id) || id),
      totalMarks: t.totalMarks,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || now,
      updatedAtIso: t.updatedAt ? new Date(t.updatedAt).toISOString() : nowIso,
    };
  });

  // Format test scores with full breakdowns
  const formattedScores = (state.testScores || []).map((s) => ({
    id: s.id,
    testId: s.testId,
    testName: s.testName,
    dateRecorded: s.dateRecorded,
    totalScore: s.totalScore,
    maxScore: s.maxScore || 720,
    percentage: ((s.totalScore / (s.maxScore || 720)) * 100).toFixed(1) + '%',
    totalQuestions: s.totalQuestions,
    correctQuestions: s.correctQuestions,
    incorrectQuestions: s.incorrectQuestions,
    unattemptedQuestions: s.unattemptedQuestions,
    subjectScores: s.subjectScores,
    subjectQuestions: s.subjectQuestions,
    errors: s.errors,
    notes: s.notes || '',
    timestamp: s.timestamp,
    timestampIso: new Date(s.timestamp).toISOString(),
  }));

  // Format action audit history
  const formattedActions = (state.actionHistory || []).map((a) => ({
    id: a.id,
    actionType: a.actionType,
    description: a.description,
    entityType: a.entityType,
    entityId: a.entityId,
    timestamp: a.timestamp,
    timestampIso: a.timestampIso,
    metadata: a.metadata,
  }));

  // Subject Statistics
  const subjectBreakdown: Record<Subject, any> = {
    Physics: { total: 0, completed: 0, inProgress: 0, notStarted: 0, totalHours: 0, avgConfidence: 0 },
    Chemistry: { total: 0, completed: 0, inProgress: 0, notStarted: 0, totalHours: 0, avgConfidence: 0 },
    Botany: { total: 0, completed: 0, inProgress: 0, notStarted: 0, totalHours: 0, avgConfidence: 0 },
    Zoology: { total: 0, completed: 0, inProgress: 0, notStarted: 0, totalHours: 0, avgConfidence: 0 },
  };

  const confidenceTotals: Record<Subject, { sum: number; count: number }> = {
    Physics: { sum: 0, count: 0 },
    Chemistry: { sum: 0, count: 0 },
    Botany: { sum: 0, count: 0 },
    Zoology: { sum: 0, count: 0 },
  };

  (state.chapters || []).forEach((c) => {
    const s = c.subject;
    if (subjectBreakdown[s]) {
      subjectBreakdown[s].total += 1;
      if (c.learningStage === 'FIRST_PASS_DONE' || c.learningStage === 'IN_REVISION' || (c.completionPercentage ?? 0) >= 100) {
        subjectBreakdown[s].completed += 1;
      } else if (c.learningStage === 'IN_PROGRESS' || (c.completionPercentage ?? 0) > 0) {
        subjectBreakdown[s].inProgress += 1;
      } else {
        subjectBreakdown[s].notStarted += 1;
      }

      if (c.currentConfidence > 0) {
        confidenceTotals[s].sum += c.currentConfidence;
        confidenceTotals[s].count += 1;
      }
    }
  });

  (state.studyLogs || []).forEach((l) => {
    if (subjectBreakdown[l.subject]) {
      subjectBreakdown[l.subject].totalHours += l.hoursSpent || 0;
    }
  });

  Object.keys(confidenceTotals).forEach((s) => {
    const subj = s as Subject;
    const { sum, count } = confidenceTotals[subj];
    subjectBreakdown[subj].avgConfidence = count > 0 ? Number((sum / count).toFixed(2)) : 0;
  });

  // Pacing calculations
  const pacingInfo = calculateSyllabusPacing(
    state.chapters || [],
    state.studyLogs || [],
    state.tests || [],
    state.testScores || [],
    state.pacingSettings || {
      targetSyllabusDate: '2026-12-31',
      targetExamDate: '2027-05-02',
      targetRevisionPasses: 3,
      targetMockTestsCount: 25,
      includeAllTestsGoal: true,
      studyDaysPerWeek: 7,
    },
    today
  );

  return {
    metadata: {
      appName: 'PCB-01 Teenage Engineering Spaced Repetition Console',
      dumpTimestamp: now,
      dumpTimestampIso: nowIso,
      currentDate: today,
      totalChapters: (state.chapters || []).length,
      totalStudySessionsLogged: (state.studyLogs || []).length,
      totalTestsScheduled: (state.tests || []).length,
      totalTestScoresRecorded: (state.testScores || []).length,
      totalAuditActionsLogged: (state.actionHistory || []).length,
      deviceClientId: state.deviceClientId || null,
      lastStateUpdatedTimestamp: state.updatedAt || now,
      lastStateUpdatedIso: state.updatedAt ? new Date(state.updatedAt).toISOString() : nowIso,
    },
    analytics: computeLiveAnalytics(state),
    chapters: formattedChapters,
    studyLogsHistory: formattedLogs,
    tests: formattedTests,
    testScoresHistory: formattedScores,
    actionHistory: formattedActions,
    settings: {
      spacedRepetition: state.settings,
      pacing: state.pacingSettings,
    },
  };
}

/**
 * Creates the McpServer instance populated with all tools, resources, and prompts.
 */
export function createStudyConsoleMcpServer(
  getState: () => AppState,
  updateState: (updater: (prev: AppState) => AppState) => AppState
): McpServer {
  const server = new McpServer({
    name: 'pcb01-study-console',
    version: '2.0.0',
  });

  // =========================================================================
  // MASTER MANIFEST & ANALYTICS TOOL: get_app_features_and_analytics
  // =========================================================================
  server.tool(
    'get_app_features_and_analytics',
    'Exhaustive documentation of EVERY single feature in the PCB-01 NEET Study Console, with microscopic explanations of exactly how each feature operates, the underlying mathematical formulas (SM-2, Ebbinghaus decay, pacing flight plan), full data schemas recorded with exact timestamps, PLUS real-time live computed analytics for the current user state.',
    {
      includeLiveAnalytics: z.boolean().optional().default(true).describe('Include live computed analytics calculated from the current database state'),
      detailedFeature: z.enum(['all', 'spaced_repetition', 'pacing_engine', 'error_taxonomy', '5_pillars', 'mock_tests', 'mcp_server', 'audit_logging']).optional().default('all').describe('Filter to deep dive into a specific subsystem or all'),
    },
    async ({ includeLiveAnalytics, detailedFeature }) => {
      const state = getState();
      const manifest = buildAppFeaturesAndAnalytics(state, { includeLiveAnalytics, detailedFeature });
      return {
        content: [{ type: 'text', text: JSON.stringify(manifest, null, 2) }],
      };
    }
  );

  server.tool(
    'get_feature_manifest',
    'Alias for get_app_features_and_analytics: Exhaustive guide to all app features, mechanisms, data recorded, and working analytics.',
    {
      includeLiveAnalytics: z.boolean().optional().default(true).describe('Include live computed analytics'),
    },
    async ({ includeLiveAnalytics }) => {
      const state = getState();
      const manifest = buildAppFeaturesAndAnalytics(state, { includeLiveAnalytics });
      return {
        content: [{ type: 'text', text: JSON.stringify(manifest, null, 2) }],
      };
    }
  );

  server.tool(
    'get_analytics_breakdown',
    'Deep-dive live analytical intelligence engine computing all NEET study metrics: syllabus progress, 5-pillar mastery, Hermann Ebbinghaus retention curve, memory decay risk, SM-2 overdue velocity, flight plan pacing, and mock test error taxonomy.',
    {
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology', 'All']).optional().default('All').describe('Filter live analytics by subject or All'),
    },
    async ({ subject }) => {
      const state = getState();
      const manifest = buildAppFeaturesAndAnalytics(state, { includeLiveAnalytics: true });
      return {
        content: [{ type: 'text', text: JSON.stringify({ metadata: manifest.metadata, liveWorkingAnalytics: manifest.liveWorkingAnalytics }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // MASTER TOOL: get_everything (The all-in-one data & history tool)
  // =========================================================================
  server.tool(
    'get_everything',
    'Exhaustive, all-in-one data export returning literally EVERY single data point in the app: all chapters (with every field, status, and timestamps), full study log history, full mock tests, all test scores with error breakdowns, the entire action audit history, pacing settings, and live analytics.',
    {
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology', 'All']).optional().default('All').describe('Filter by NEET subject or All'),
      includeArchived: z.boolean().optional().default(true).describe('Include archived chapters in the dump'),
    },
    async ({ subject, includeArchived }) => {
      const state = getState();
      const dump = buildEverythingDump(state, { subject, includeArchived });
      return {
        content: [{ type: 'text', text: JSON.stringify(dump, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: get_study_status
  // =========================================================================
  server.tool(
    'get_study_status',
    'Get overall NEET preparation status, including syllabus progress per subject, due chapters, high-risk topics, and mock test radar.',
    {},
    async () => {
      const state = getState();
      const dump = buildEverythingDump(state);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                metadata: dump.metadata,
                analytics: dump.analytics,
                topUpcomingTests: dump.tests.slice(0, 3),
                topDueChapters: dump.chapters.filter((c) => c.currentStatus === 'due_today' || c.currentStatus === 'overdue').slice(0, 5),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // =========================================================================
  // TOOL: list_due_chapters
  // =========================================================================
  server.tool(
    'list_due_chapters',
    'List chapters due or overdue for spaced repetition revision. Supports subject filtering and limit.',
    {
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology', 'All']).optional().describe('Filter by NEET subject or All'),
      overdueOnly: z.boolean().optional().describe('Only return chapters that are strictly past their review date'),
      limit: z.number().min(1).max(100).optional().default(20).describe('Maximum number of items to return'),
    },
    async ({ subject, overdueOnly, limit = 20 }) => {
      const state = getState();
      const dump = buildEverythingDump(state, { subject });
      let list = dump.chapters.filter((c) => !c.isArchived);

      if (overdueOnly) {
        list = list.filter((c) => c.currentStatus === 'overdue');
      } else {
        list = list.filter((c) => c.currentStatus === 'overdue' || c.currentStatus === 'due_today');
      }

      list.sort((a, b) => b.urgencyScore - a.urgencyScore);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: list.length, today: dump.metadata.currentDate, chapters: list.slice(0, limit) }, null, 2),
          },
        ],
      };
    }
  );

  // =========================================================================
  // TOOL: search_chapters
  // =========================================================================
  server.tool(
    'search_chapters',
    'Search syllabus chapters by topic name, subject, learning stage, cluster, or confidence rating.',
    {
      query: z.string().optional().describe('Keyword in chapter name or cluster'),
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology', 'All']).optional(),
      stage: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'FIRST_PASS_DONE', 'IN_REVISION']).optional(),
      maxConfidence: z.number().min(0).max(5).optional(),
      minConfidence: z.number().min(0).max(5).optional(),
      limit: z.number().min(1).max(100).optional().default(30),
    },
    async ({ query, subject, stage, maxConfidence, minConfidence, limit = 30 }) => {
      const state = getState();
      const dump = buildEverythingDump(state, { subject });
      let list = dump.chapters;

      if (stage) list = list.filter((c) => c.learningStage === stage);
      if (maxConfidence !== undefined) list = list.filter((c) => c.currentConfidence <= maxConfidence);
      if (minConfidence !== undefined) list = list.filter((c) => c.currentConfidence >= minConfidence);
      if (query && query.trim()) {
        const q = query.toLowerCase().trim();
        list = list.filter((c) => c.name.toLowerCase().includes(q) || c.clusterName.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ count: list.length, chapters: list.slice(0, limit) }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: get_chapter_details
  // =========================================================================
  server.tool(
    'get_chapter_details',
    'Retrieve all forensic data for a single chapter: all fields, complete study logs history, linked tests, and timestamps.',
    {
      chapterId: z.string().describe('ID of the chapter (e.g., ch-phy-01 or keyword match)'),
    },
    async ({ chapterId }) => {
      const state = getState();
      const chapters = state.chapters || [];
      const ch = chapters.find((c) => c.id === chapterId || c.name.toLowerCase().includes(chapterId.toLowerCase()));
      if (!ch) {
        throw new Error(`Chapter not found for identifier: ${chapterId}`);
      }

      const chapterLogs = (state.studyLogs || []).filter((l) => l.chapterId === ch.id);
      const linkedTests = (state.tests || []).filter((t) => (t.linkedChapterIds || []).includes(ch.id));

      const now = Date.now();
      const detail = {
        chapter: ch,
        timestamps: {
          createdAt: ch.createdAt,
          updatedAt: ch.updatedAt || now,
          updatedAtIso: new Date(ch.updatedAt || now).toISOString(),
          startedDate: ch.startedDate,
          firstPassCompletedDate: ch.firstPassCompletedDate,
          lastStudiedDate: ch.lastStudiedDate,
          nextRevisionDate: ch.nextRevisionDate,
        },
        studyLogsHistory: chapterLogs,
        linkedTests: linkedTests.map((t) => ({ id: t.id, name: t.name, date: t.date })),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: add_chapter
  // =========================================================================
  server.tool(
    'add_chapter',
    'Add a new syllabus chapter with all data fields and millisecond timestamps.',
    {
      name: z.string().describe('Name of the new chapter'),
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology']),
      clusterName: z.string().optional().default('General Core'),
      classLevel: z.enum(['11', '12']).optional().default('11'),
      targetDeadline: z.string().optional().describe('Target deadline YYYY-MM-DD'),
      notes: z.string().optional(),
    },
    async ({ name, subject, clusterName = 'General Core', classLevel = '11', targetDeadline, notes }) => {
      const now = Date.now();
      const today = getTodayStr();
      const newId = `custom-${subject.toLowerCase().slice(0, 3)}-${now.toString(36)}`;

      const newChapter: Chapter = {
        id: newId,
        name,
        subject,
        clusterId: 99,
        clusterName,
        classLevel,
        learningStage: 'NOT_STARTED',
        completionPercentage: 0,
        pillars: { lectures: false, bookReading: false, ncertReading: false, classNotes: false, questionPractice: false, anki: false },
        startedDate: null,
        firstPassCompletedDate: null,
        daysTakenToComplete: null,
        targetDeadline: targetDeadline || null,
        currentConfidence: 0,
        lastStudiedDate: null,
        nextRevisionDate: null,
        revisionCount: 0,
        totalStudySessions: 0,
        isArchived: false,
        notes: notes || '',
        createdAt: today,
        updatedAt: now,
      };

      updateState((prev) => {
        const nextState = {
          ...prev,
          chapters: [...prev.chapters, newChapter],
          updatedAt: now,
        };
        nextState.actionHistory = recordAction(
          nextState,
          'CHAPTER_CREATED',
          `Added new chapter: ${name} (${subject})`,
          'chapter',
          newId,
          { name, subject, clusterName }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, createdChapter: newChapter }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: update_chapter
  // =========================================================================
  server.tool(
    'update_chapter',
    'Update any fields of a chapter (name, stage, confidence, deadline, notes) with automatic timestamping and audit logging.',
    {
      chapterId: z.string().describe('ID of chapter to update'),
      name: z.string().optional(),
      learningStage: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'FIRST_PASS_DONE', 'IN_REVISION']).optional(),
      completionPercentage: z.number().min(0).max(100).optional(),
      currentConfidence: z.number().min(0).max(5).optional(),
      targetDeadline: z.string().optional().describe('YYYY-MM-DD or empty to clear'),
      notes: z.string().optional(),
      nextRevisionDate: z.string().optional().describe('Override next revision date YYYY-MM-DD'),
    },
    async ({ chapterId, name, learningStage, completionPercentage, currentConfidence, targetDeadline, notes, nextRevisionDate }) => {
      const now = Date.now();
      let updated: Chapter | undefined;

      updateState((prev) => {
        const chapters = [...prev.chapters];
        const idx = chapters.findIndex((c) => c.id === chapterId);
        if (idx === -1) throw new Error(`Chapter not found: ${chapterId}`);

        const ch = { ...chapters[idx] };
        if (name !== undefined) ch.name = name;
        if (learningStage !== undefined) ch.learningStage = learningStage;
        if (completionPercentage !== undefined) ch.completionPercentage = completionPercentage;
        if (currentConfidence !== undefined) ch.currentConfidence = currentConfidence;
        if (targetDeadline !== undefined) ch.targetDeadline = targetDeadline || null;
        if (notes !== undefined) ch.notes = notes;
        if (nextRevisionDate !== undefined) ch.nextRevisionDate = nextRevisionDate;
        ch.updatedAt = now;

        chapters[idx] = ch;
        updated = ch;

        const nextState = { ...prev, chapters, updatedAt: now };
        nextState.actionHistory = recordAction(
          nextState,
          'CHAPTER_UPDATED',
          `Updated chapter ${ch.name}`,
          'chapter',
          ch.id,
          { chapterId, learningStage, currentConfidence, completionPercentage }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, updatedChapter: updated }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: update_chapter_pillars
  // =========================================================================
  server.tool(
    'update_chapter_pillars',
    'Update study milestone checklist pillars (Lectures, Book Reading, Notes, Question Practice, Anki) for a chapter with timestamping.',
    {
      chapterId: z.string().describe('ID of the chapter'),
      lectures: z.boolean().optional(),
      bookReading: z.boolean().optional(),
      classNotes: z.boolean().optional(),
      questionPractice: z.boolean().optional(),
      anki: z.boolean().optional(),
    },
    async ({ chapterId, lectures, bookReading, classNotes, questionPractice, anki }) => {
      const now = Date.now();
      let updated: Chapter | undefined;

      updateState((prev) => {
        const chapters = [...prev.chapters];
        const idx = chapters.findIndex((c) => c.id === chapterId);
        if (idx === -1) throw new Error(`Chapter not found: ${chapterId}`);

        const ch = { ...chapters[idx] };
        const p = ch.pillars || { lectures: false, bookReading: false, classNotes: false, questionPractice: false, anki: false };
        const newPillars: StudyPillars = {
          lectures: lectures !== undefined ? lectures : p.lectures,
          bookReading: bookReading !== undefined ? bookReading : p.bookReading,
          classNotes: classNotes !== undefined ? classNotes : p.classNotes,
          questionPractice: questionPractice !== undefined ? questionPractice : p.questionPractice,
          anki: anki !== undefined ? anki : p.anki,
        };

        let completedCount = 0;
        if (newPillars.lectures) completedCount += 1;
        if (newPillars.bookReading) completedCount += 1;
        if (newPillars.classNotes) completedCount += 1;
        if (newPillars.questionPractice) completedCount += 1;
        if (newPillars.anki) completedCount += 1;

        const pct = Math.round((completedCount / 5) * 100);
        ch.pillars = newPillars;
        ch.completionPercentage = pct;
        if (pct >= 100 && ch.learningStage !== 'IN_REVISION') {
          ch.learningStage = 'FIRST_PASS_DONE';
          if (!ch.firstPassCompletedDate) ch.firstPassCompletedDate = getTodayStr();
        } else if (pct > 0 && ch.learningStage === 'NOT_STARTED') {
          ch.learningStage = 'IN_PROGRESS';
          if (!ch.startedDate) ch.startedDate = getTodayStr();
        }
        ch.updatedAt = now;

        chapters[idx] = ch;
        updated = ch;

        const nextState = { ...prev, chapters, updatedAt: now };
        nextState.actionHistory = recordAction(
          nextState,
          'PILLARS_UPDATED',
          `Updated study pillars for ${ch.name} (${pct}% completed)`,
          'chapter',
          ch.id,
          { pillars: newPillars, completionPercentage: pct }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, chapter: updated }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: archive_chapter
  // =========================================================================
  server.tool(
    'archive_chapter',
    'Archive or restore a syllabus chapter with timestamping.',
    {
      chapterId: z.string().describe('ID of chapter to archive/restore'),
      isArchived: z.boolean().describe('True to archive, false to restore'),
    },
    async ({ chapterId, isArchived }) => {
      const now = Date.now();
      let updated: Chapter | undefined;

      updateState((prev) => {
        const chapters = [...prev.chapters];
        const idx = chapters.findIndex((c) => c.id === chapterId);
        if (idx === -1) throw new Error(`Chapter not found: ${chapterId}`);

        const ch = { ...chapters[idx], isArchived, updatedAt: now };
        chapters[idx] = ch;
        updated = ch;

        const nextState = { ...prev, chapters, updatedAt: now };
        nextState.actionHistory = recordAction(
          nextState,
          isArchived ? 'CHAPTER_ARCHIVED' : 'CHAPTER_RESTORED',
          `${isArchived ? 'Archived' : 'Restored'} chapter ${ch.name}`,
          'chapter',
          ch.id
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, chapter: updated }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: generate_study_session
  // =========================================================================
  server.tool(
    'generate_study_session',
    'Algorithmically generate a recommended study session based on spaced repetition priorities, weak areas, or high-yield NEET focus.',
    {
      mode: z.enum(['worst_first', 'weighted', 'random']).default('worst_first'),
      availableMinutes: z.number().min(15).max(480).default(120),
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology', 'All']).optional(),
    },
    async ({ mode, availableMinutes, subject }) => {
      const state = getState();
      const today = getTodayStr();
      let pool = (state.chapters || []).filter((ch) => !ch.isArchived);

      if (subject && subject !== 'All') pool = pool.filter((ch) => ch.subject === subject);

      const scored = pool.map((ch) => {
        let score = 50;
        const diff = ch.nextRevisionDate ? getDaysDifference(today, ch.nextRevisionDate) : -1;
        if (diff < 0) score += Math.min(50, Math.abs(diff) * 6);
        else if (diff === 0) score += 30;

        const conf = ch.currentConfidence || 1;
        score += (5 - conf) * 12;
        if (mode === 'random') score = Math.random() * 100;
        return { chapter: ch, score, daysOverdue: diff < 0 ? Math.abs(diff) : 0 };
      });

      scored.sort((a, b) => b.score - a.score);
      const maxSlots = Math.max(1, Math.floor(availableMinutes / 35));
      const picked = scored.slice(0, maxSlots);
      const minsPerSlot = Math.floor(availableMinutes / picked.length);

      const plan = picked.map((item, idx) => ({
        slot: idx + 1,
        chapterId: item.chapter.id,
        chapterName: item.chapter.name,
        subject: item.chapter.subject,
        allocatedMinutes: minsPerSlot,
        confidence: item.chapter.currentConfidence,
        revisionCount: item.chapter.revisionCount,
        recommendedAction:
          item.chapter.currentConfidence <= 2
            ? 'NCERT Line-by-Line Review + 25 Core PYQs'
            : item.chapter.currentConfidence === 3
            ? 'Active Recall Formula Flashcards + Timed Error Drill'
            : 'Rapid 15-min Formula Sheet Refresh + High-Difficulty Test Questions',
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ mode, totalMinutes: availableMinutes, schedule: plan }, null, 2),
          },
        ],
      };
    }
  );

  // =========================================================================
  // TOOL: log_study_session
  // =========================================================================
  server.tool(
    'log_study_session',
    'Log a completed study session with exact timestamps, compute new SM-2 intervals, and update history.',
    {
      chapterId: z.string().describe('ID of the chapter studied'),
      confidenceRating: z.number().min(1).max(5).describe('1 (Total blank) to 5 (Instant recall)'),
      hoursSpent: z.number().min(0.1).max(12).optional().default(1),
      sessionType: z.enum(['progress', 'first_pass_complete', 'revision_round_complete']).optional().default('revision_round_complete'),
      note: z.string().optional(),
    },
    async ({ chapterId, confidenceRating, hoursSpent, sessionType, note }) => {
      let matchedChapter: Chapter | undefined;
      const today = getTodayStr();
      const now = Date.now();
      const newLogId = `log-${now}-${Math.random().toString(36).slice(2, 7)}`;

      updateState((prev) => {
        const chapters = [...prev.chapters];
        const idx = chapters.findIndex((c) => c.id === chapterId || c.name.toLowerCase() === chapterId.toLowerCase());
        if (idx === -1) throw new Error(`Chapter not found with identifier: "${chapterId}"`);

        const ch = { ...chapters[idx] };
        const newRevCount = sessionType === 'progress' ? ch.revisionCount : ch.revisionCount + 1;
        const gapDays = calculateNextGap(newRevCount, confidenceRating, prev.settings);
        const nextDate = addDaysToDateStr(today, gapDays);

        ch.lastStudiedDate = today;
        ch.nextRevisionDate = nextDate;
        ch.currentConfidence = confidenceRating;
        ch.revisionCount = newRevCount;
        ch.totalStudySessions = (ch.totalStudySessions || 0) + 1;
        ch.updatedAt = now;

        if (sessionType === 'first_pass_complete') {
          ch.learningStage = 'FIRST_PASS_DONE';
          ch.completionPercentage = 100;
          if (!ch.firstPassCompletedDate) ch.firstPassCompletedDate = today;
        } else if (sessionType === 'revision_round_complete') {
          ch.learningStage = 'IN_REVISION';
          ch.completionPercentage = 100;
        }

        chapters[idx] = ch;
        matchedChapter = ch;

        const newLog: StudyLog = {
          id: newLogId,
          chapterId: ch.id,
          chapterName: ch.name,
          subject: ch.subject,
          dateStudied: today,
          sessionType,
          hoursSpent: hoursSpent || 1,
          confidenceRating,
          revisionNumber: newRevCount,
          note: note || '',
          timestamp: now,
        };

        const nextState = {
          ...prev,
          chapters,
          studyLogs: [newLog, ...(prev.studyLogs || [])],
          updatedAt: now,
        };

        nextState.actionHistory = recordAction(
          nextState,
          'STUDY_SESSION_LOGGED',
          `Logged study session for ${ch.name} (Rating ${confidenceRating}/5, next review in ${gapDays} days)`,
          'studyLog',
          newLogId,
          { chapterId: ch.id, confidenceRating, gapDays, nextRevisionDate: nextDate, hoursSpent }
        );

        return nextState;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Logged study session for ${matchedChapter?.name}`,
                timestamp: now,
                timestampIso: new Date(now).toISOString(),
                chapter: matchedChapter,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // =========================================================================
  // TOOL: list_tests
  // =========================================================================
  server.tool(
    'list_tests',
    'List all scheduled NEET mock tests with linked chapters and score histories.',
    {
      limit: z.number().min(1).max(50).optional().default(20),
    },
    async ({ limit = 20 }) => {
      const state = getState();
      const dump = buildEverythingDump(state);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: dump.tests.length, tests: dump.tests.slice(0, limit), scores: dump.testScoresHistory.slice(0, 5) }, null, 2),
          },
        ],
      };
    }
  );

  // =========================================================================
  // TOOL: get_test_details
  // =========================================================================
  server.tool(
    'get_test_details',
    'Get full details for a specific mock test, all linked syllabus chapters, and recorded scores.',
    {
      testId: z.string().describe('ID of test to inspect'),
    },
    async ({ testId }) => {
      const state = getState();
      const test = (state.tests || []).find((t) => t.id === testId);
      if (!test) throw new Error(`Test not found: ${testId}`);

      const linkedChapters = (state.chapters || []).filter((c) => (test.linkedChapterIds || []).includes(c.id));
      const testScores = (state.testScores || []).filter((s) => s.testId === test.id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ test, linkedChapters, scores: testScores }, null, 2),
          },
        ],
      };
    }
  );

  // =========================================================================
  // TOOL: add_test
  // =========================================================================
  server.tool(
    'add_test',
    'Schedule a new mock test with target date, linked chapters, coaching name, and timestamps.',
    {
      name: z.string().describe('Name of the exam (e.g. Allen Minor Test 04)'),
      date: z.string().describe('Exam date YYYY-MM-DD'),
      subjectOrScope: z.string().describe('Syllabus scope (e.g. Kinematics, GOC, Cell Biology)'),
      coachingName: z.string().optional().default('Custom'),
      linkedChapterIds: z.array(z.string()).optional().default([]),
      totalMarks: z.number().optional().default(720),
    },
    async ({ name, date, subjectOrScope, coachingName = 'Custom', linkedChapterIds = [], totalMarks = 720 }) => {
      const now = Date.now();
      const newTestId = `test-${now}-${Math.random().toString(36).slice(2, 6)}`;

      const newTest: Test = {
        id: newTestId,
        name,
        date,
        subjectOrScope,
        coachingName,
        linkedChapterIds,
        totalMarks,
        createdAt: getTodayStr(),
        updatedAt: now,
        timestamp: now,
      };

      updateState((prev) => {
        const nextState = {
          ...prev,
          tests: [newTest, ...(prev.tests || [])],
          updatedAt: now,
        };
        nextState.actionHistory = recordAction(
          nextState,
          'TEST_CREATED',
          `Scheduled test: ${name} on ${date}`,
          'test',
          newTestId,
          { name, date, linkedChapterIds }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, createdTest: newTest }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: delete_test
  // =========================================================================
  server.tool(
    'delete_test',
    'Delete a mock test and unlink chapters with timestamping.',
    {
      testId: z.string().describe('ID of test to delete'),
    },
    async ({ testId }) => {
      const now = Date.now();
      let deletedName = '';

      updateState((prev) => {
        const target = (prev.tests || []).find((t) => t.id === testId);
        if (!target) throw new Error(`Test not found: ${testId}`);
        deletedName = target.name;

        const nextState = {
          ...prev,
          tests: (prev.tests || []).filter((t) => t.id !== testId),
          updatedAt: now,
        };
        nextState.actionHistory = recordAction(
          nextState,
          'TEST_DELETED',
          `Deleted test: ${deletedName}`,
          'test',
          testId
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Deleted test ${deletedName}` }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: link_chapters_to_test
  // =========================================================================
  server.tool(
    'link_chapters_to_test',
    'Bulk assign chapters to an upcoming test and sync target deadlines with timestamps.',
    {
      testId: z.string().describe('ID of test'),
      chapterIds: z.array(z.string()).describe('Array of chapter IDs to link'),
      syncDeadlines: z.boolean().optional().default(true).describe('Also set chapter targetDeadline to test date'),
    },
    async ({ testId, chapterIds, syncDeadlines = true }) => {
      const now = Date.now();
      let testName = '';

      updateState((prev) => {
        const test = (prev.tests || []).find((t) => t.id === testId);
        if (!test) throw new Error(`Test not found: ${testId}`);
        testName = test.name;

        const updatedLinkedIds = Array.from(new Set([...(test.linkedChapterIds || []), ...chapterIds]));
        const updatedTests = (prev.tests || []).map((t) => (t.id === testId ? { ...t, linkedChapterIds: updatedLinkedIds, updatedAt: now } : t));

        const updatedChapters = (prev.chapters || []).map((c) => {
          if (chapterIds.includes(c.id) && syncDeadlines) {
            return { ...c, targetDeadline: test.date, updatedAt: now };
          }
          return c;
        });

        const nextState = {
          ...prev,
          tests: updatedTests,
          chapters: updatedChapters,
          updatedAt: now,
        };
        nextState.actionHistory = recordAction(
          nextState,
          'CHAPTERS_LINKED_TO_TEST',
          `Linked ${chapterIds.length} chapters to test ${testName}`,
          'test',
          testId,
          { testId, count: chapterIds.length }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Linked ${chapterIds.length} chapters to ${testName}` }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: add_test_score
  // =========================================================================
  server.tool(
    'add_test_score',
    'Record a full mock test result (out of 720) with subject scores, question accuracy breakdown, mistake categories, and timestamps.',
    {
      testId: z.string().describe('ID of the test'),
      totalScore: z.number().min(0).max(720).describe('Total score'),
      testName: z.string().optional().describe('Name of test'),
      physicsScore: z.number().min(0).max(180).optional(),
      chemistryScore: z.number().min(0).max(180).optional(),
      botanyScore: z.number().min(0).max(180).optional(),
      zoologyScore: z.number().min(0).max(180).optional(),
      correctQuestions: z.number().min(0).max(180).optional(),
      incorrectQuestions: z.number().min(0).max(180).optional(),
      unattemptedQuestions: z.number().min(0).max(180).optional(),
      sillyMistakesCount: z.number().min(0).optional(),
      conceptualGapsCount: z.number().min(0).optional(),
      notes: z.string().optional(),
    },
    async ({
      testId,
      totalScore,
      testName,
      physicsScore,
      chemistryScore,
      botanyScore,
      zoologyScore,
      correctQuestions,
      incorrectQuestions,
      unattemptedQuestions,
      sillyMistakesCount,
      conceptualGapsCount,
      notes,
    }) => {
      const now = Date.now();
      const today = getTodayStr();
      const scoreId = `score-${now}-${Math.random().toString(36).slice(2, 6)}`;

      const errorBreakdown: ErrorBreakdown | undefined =
        sillyMistakesCount !== undefined || conceptualGapsCount !== undefined || notes
          ? {
              sillyMistakes: sillyMistakesCount,
              conceptualGaps: conceptualGapsCount,
              notes,
            }
          : undefined;

      const newScore: TestScore = {
        id: scoreId,
        testId,
        testName: testName || testId,
        dateRecorded: today,
        totalScore,
        maxScore: 720,
        totalQuestions: 180,
        correctQuestions,
        incorrectQuestions,
        unattemptedQuestions,
        subjectScores: {
          Physics: physicsScore,
          Chemistry: chemistryScore,
          Botany: botanyScore,
          Zoology: zoologyScore,
        },
        errors: errorBreakdown,
        notes: notes || undefined,
        timestamp: now,
      };

      updateState((prev) => {
        const nextState = {
          ...prev,
          testScores: [newScore, ...(prev.testScores || [])],
          updatedAt: now,
        };
        nextState.actionHistory = recordAction(
          nextState,
          'TEST_SCORE_RECORDED',
          `Recorded test score ${totalScore}/720 for ${testName || testId}`,
          'score',
          scoreId,
          { testId, totalScore, physicsScore, chemistryScore, botanyScore, zoologyScore }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, recordedScore: newScore }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: update_spaced_repetition_settings
  // =========================================================================
  server.tool(
    'update_spaced_repetition_settings',
    'Update SM-2 default revision gaps and confidence multipliers with timestamps.',
    {
      defaultGaps: z.array(z.number()).optional().describe('e.g. [3, 7, 14, 30]'),
      confMultiplier1: z.number().optional().describe('Multiplier for confidence 1 (e.g. 0.5)'),
      confMultiplier2: z.number().optional().describe('Multiplier for confidence 2 (e.g. 0.5)'),
      confMultiplier3: z.number().optional().describe('Multiplier for confidence 3 (e.g. 1.0)'),
      confMultiplier4: z.number().optional().describe('Multiplier for confidence 4 (e.g. 1.5)'),
      confMultiplier5: z.number().optional().describe('Multiplier for confidence 5 (e.g. 1.5)'),
    },
    async ({ defaultGaps, confMultiplier1, confMultiplier2, confMultiplier3, confMultiplier4, confMultiplier5 }) => {
      const now = Date.now();
      let updatedSettings: SpacedRepetitionSettings | undefined;

      updateState((prev) => {
        const curr = prev.settings;
        const newSettings: SpacedRepetitionSettings = {
          defaultGaps: defaultGaps || curr.defaultGaps,
          confidenceMultipliers: {
            1: confMultiplier1 !== undefined ? confMultiplier1 : curr.confidenceMultipliers[1],
            2: confMultiplier2 !== undefined ? confMultiplier2 : curr.confidenceMultipliers[2],
            3: confMultiplier3 !== undefined ? confMultiplier3 : curr.confidenceMultipliers[3],
            4: confMultiplier4 !== undefined ? confMultiplier4 : curr.confidenceMultipliers[4],
            5: confMultiplier5 !== undefined ? confMultiplier5 : curr.confidenceMultipliers[5],
          },
        };

        updatedSettings = newSettings;
        const nextState = { ...prev, settings: newSettings, updatedAt: now };
        nextState.actionHistory = recordAction(
          nextState,
          'SETTINGS_UPDATED',
          'Updated SM-2 spaced repetition settings',
          'settings',
          undefined,
          newSettings
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, settings: updatedSettings }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: update_pacing_settings
  // =========================================================================
  server.tool(
    'update_pacing_settings',
    'Update target NEET exam date, syllabus completion deadline, and revision targets with timestamps.',
    {
      targetExamDate: z.string().optional().describe('Target exam date YYYY-MM-DD'),
      targetSyllabusDate: z.string().optional().describe('Target 1st pass syllabus completion YYYY-MM-DD'),
      targetRevisionPasses: z.number().min(1).max(10).optional(),
      targetMockTestsCount: z.number().min(1).max(100).optional(),
      studyDaysPerWeek: z.number().min(1).max(7).optional(),
    },
    async ({ targetExamDate, targetSyllabusDate, targetRevisionPasses, targetMockTestsCount, studyDaysPerWeek }) => {
      const now = Date.now();
      let updatedPacing: SyllabusPacingSettings | undefined;

      updateState((prev) => {
        const curr = prev.pacingSettings || {
          targetSyllabusDate: '2026-12-31',
          targetExamDate: '2027-05-02',
          targetRevisionPasses: 3,
          targetMockTestsCount: 25,
          includeAllTestsGoal: true,
          studyDaysPerWeek: 7,
        };

        const newPacing: SyllabusPacingSettings = {
          ...curr,
          targetExamDate: targetExamDate || curr.targetExamDate,
          targetSyllabusDate: targetSyllabusDate || curr.targetSyllabusDate,
          targetRevisionPasses: targetRevisionPasses !== undefined ? targetRevisionPasses : curr.targetRevisionPasses,
          targetMockTestsCount: targetMockTestsCount !== undefined ? targetMockTestsCount : curr.targetMockTestsCount,
          studyDaysPerWeek: studyDaysPerWeek !== undefined ? studyDaysPerWeek : curr.studyDaysPerWeek,
        };

        updatedPacing = newPacing;
        const nextState = { ...prev, pacingSettings: newPacing, updatedAt: now };
        nextState.actionHistory = recordAction(
          nextState,
          'PACING_UPDATED',
          `Updated pacing settings (Exam: ${newPacing.targetExamDate}, Syllabus: ${newPacing.targetSyllabusDate})`,
          'pacing',
          undefined,
          newPacing
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, pacingSettings: updatedPacing }, null, 2) }],
      };
    }
  );

  // =========================================================================
  // TOOL: get_action_history
  // =========================================================================
  server.tool(
    'get_action_history',
    'Query the complete chronological audit log of all actions taken in the application with exact timestamps.',
    {
      limit: z.number().min(1).max(200).optional().default(50),
      entityType: z.enum(['chapter', 'test', 'score', 'studyLog', 'settings', 'pacing', 'system', 'all']).optional().default('all'),
    },
    async ({ limit = 50, entityType = 'all' }) => {
      const state = getState();
      let list = state.actionHistory || [];
      if (entityType && entityType !== 'all') {
        list = list.filter((a) => a.entityType === entityType);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: list.length, actionHistory: list.slice(0, limit) }, null, 2),
          },
        ],
      };
    }
  );

  // =========================================================================
  // ADVANCED INTELLIGENCE TOOLS
  // =========================================================================

  // TOOL: get_daily_summary
  server.tool(
    'get_daily_summary',
    "Get an instant high-level snapshot of today's NEET study productivity: total hours logged, sessions completed, chapters reviewed, remaining due items, current study streak, and daily syllabus pacing velocity.",
    {
      date: z.string().optional().describe('Date to inspect in YYYY-MM-DD format (defaults to today)'),
    },
    async ({ date }) => {
      const state = getState();
      const summary = computeDailySummary(state, date);
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  // TOOL: simulate_decay_forecast
  server.tool(
    'simulate_decay_forecast',
    'Simulates Hermann Ebbinghaus forgetting curve retention at +7, +14, +30, and +60 days for all syllabus chapters. Detects topics headed for critical memory drop-offs (<50%) and ranks the recommended salvage sequence.',
    {
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology', 'All']).optional().default('All').describe('Filter projection by subject or All'),
      daysAhead: z.number().min(1).max(90).optional().default(30).describe('Projection horizon in days'),
    },
    async ({ subject, daysAhead }) => {
      const state = getState();
      const forecast = computeDecayForecast(state, { subject, daysAhead });
      return {
        content: [{ type: 'text', text: JSON.stringify(forecast, null, 2) }],
      };
    }
  );

  // TOOL: diagnose_weak_spots
  server.tool(
    'diagnose_weak_spots',
    'Clinical diagnostic engine that scans confidence ratings, overdue days, memory retention, and missing 5-pillar milestones to pinpoint the Top High-Priority Danger Topics requiring urgent remediation.',
    {
      subject: z.enum(['Physics', 'Chemistry', 'Botany', 'Zoology', 'All']).optional().default('All').describe('Filter by subject or All'),
      limit: z.number().min(1).max(50).optional().default(10).describe('Maximum weak topics to return'),
    },
    async ({ subject, limit }) => {
      const state = getState();
      const diagnosis = diagnoseWeakSpots(state, { subject, limit });
      return {
        content: [{ type: 'text', text: JSON.stringify(diagnosis, null, 2) }],
      };
    }
  );

  // TOOL: batch_log_study_sessions
  server.tool(
    'batch_log_study_sessions',
    'Log multiple completed study sessions in a single atomic operation (e.g. after a multi-chapter study marathon), auto-updating SM-2 intervals, timestamps, and audit history.',
    {
      sessions: z
        .array(
          z.object({
            chapterId: z.string().describe('ID of chapter studied'),
            confidenceRating: z.number().min(1).max(5).describe('Confidence score 1 to 5'),
            hoursSpent: z.number().min(0.1).max(12).optional().default(1).describe('Hours studied'),
            sessionType: z.enum(['progress', 'first_pass_complete', 'revision_round_complete']).optional().default('revision_round_complete'),
            note: z.string().optional(),
          })
        )
        .describe('List of study session records to commit'),
    },
    async ({ sessions }) => {
      const today = getTodayStr();
      const now = Date.now();
      let committedCount = 0;

      updateState((prev) => {
        let currentChapters = [...prev.chapters];
        let currentLogs = [...(prev.studyLogs || [])];
        const settings = prev.settings || {
          defaultGaps: [3, 7, 14, 30],
          confidenceMultipliers: { 1: 0.5, 2: 0.5, 3: 1.0, 4: 1.5, 5: 1.5 },
        };

        sessions.forEach((item) => {
          const chIndex = currentChapters.findIndex((c) => c.id === item.chapterId);
          if (chIndex >= 0) {
            const ch = currentChapters[chIndex];
            const logsForCh = currentLogs.filter((l) => l.chapterId === ch.id).length;
            const hours = item.hoursSpent ?? 1;

            let nextGap = calculateNextGap(
              item.sessionType === 'revision_round_complete' ? (ch.revisionCount || 1) + 1 : 1,
              item.confidenceRating,
              settings
            );

            let newStage = ch.learningStage;
            let newRevisionCount = ch.revisionCount || 0;
            let nextRevisionDate = ch.nextRevisionDate;

            if (item.sessionType === 'first_pass_complete') {
              newStage = 'FIRST_PASS_DONE';
              newRevisionCount = Math.max(1, ch.revisionCount || 1);
              nextRevisionDate = addDaysToDateStr(today, nextGap);
            } else if (item.sessionType === 'revision_round_complete') {
              newStage = 'IN_REVISION';
              newRevisionCount = (ch.revisionCount || 1) + 1;
              nextRevisionDate = addDaysToDateStr(today, nextGap);
            } else {
              newStage = 'IN_PROGRESS';
            }

            const updatedCh: Chapter = {
              ...ch,
              learningStage: newStage,
              currentConfidence: item.confidenceRating,
              lastStudiedDate: today,
              nextRevisionDate,
              revisionCount: newRevisionCount,
              totalStudySessions: (ch.totalStudySessions || 0) + 1,
              updatedAt: now,
            };

            const newLog: StudyLog = {
              id: 'log-' + now + '-' + Math.random().toString(36).substring(2, 6),
              chapterId: ch.id,
              chapterName: ch.name,
              subject: ch.subject,
              dateStudied: today,
              sessionType: item.sessionType,
              confidenceRating: item.confidenceRating,
              hoursSpent: hours,
              revisionNumber: newRevisionCount,
              note: item.note || 'Batch logged study session',
              timestamp: now,
            };

            currentChapters[chIndex] = updatedCh;
            currentLogs.unshift(newLog);
            committedCount++;
          }
        });

        const nextState = {
          ...prev,
          chapters: currentChapters,
          studyLogs: currentLogs,
          updatedAt: now,
        };

        nextState.actionHistory = recordAction(
          nextState,
          'BATCH_STUDY_SESSIONS_LOGGED',
          `Logged ${committedCount} study sessions in batch`,
          'studyLog',
          undefined,
          { committedCount, sessionIds: sessions.map((s) => s.chapterId) }
        );

        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, committedSessionsCount: committedCount, date: today }, null, 2) }],
      };
    }
  );

  // TOOL: batch_update_chapters
  server.tool(
    'batch_update_chapters',
    'Bulk-update properties across multiple chapters (e.g. learning stage, confidence, target deadline, archive status) with timestamps.',
    {
      chapterIds: z.array(z.string()).describe('List of chapter IDs to update'),
      learningStage: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'FIRST_PASS_DONE', 'IN_REVISION']).optional(),
      currentConfidence: z.number().min(0).max(5).optional(),
      targetDeadline: z.string().optional().describe('Deadline YYYY-MM-DD'),
      isArchived: z.boolean().optional(),
    },
    async ({ chapterIds, learningStage, currentConfidence, targetDeadline, isArchived }) => {
      const now = Date.now();
      let affectedCount = 0;

      updateState((prev) => {
        const idSet = new Set(chapterIds);
        const updatedChapters = (prev.chapters || []).map((ch) => {
          if (idSet.has(ch.id)) {
            affectedCount++;
            return {
              ...ch,
              ...(learningStage !== undefined ? { learningStage } : {}),
              ...(currentConfidence !== undefined ? { currentConfidence } : {}),
              ...(targetDeadline !== undefined ? { targetDeadline } : {}),
              ...(isArchived !== undefined ? { isArchived } : {}),
              updatedAt: now,
            };
          }
          return ch;
        });

        const nextState = { ...prev, chapters: updatedChapters, updatedAt: now };
        nextState.actionHistory = recordAction(
          nextState,
          'BATCH_CHAPTERS_UPDATED',
          `Bulk updated ${affectedCount} chapters`,
          'chapter',
          undefined,
          { chapterIds, learningStage, currentConfidence, targetDeadline, isArchived }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, affectedCount }, null, 2) }],
      };
    }
  );

  // TOOL: reset_chapter_progress
  server.tool(
    'reset_chapter_progress',
    'Safely reset study progress and revision intervals for a specific chapter back to NOT_STARTED for a fresh study restart.',
    {
      chapterId: z.string().describe('ID of chapter to reset'),
      resetPillars: z.boolean().optional().default(false).describe('Also reset 5-pillar study checklist to unchecked'),
    },
    async ({ chapterId, resetPillars }) => {
      const now = Date.now();
      let chapterName = '';

      updateState((prev) => {
        const updatedChapters = (prev.chapters || []).map((ch) => {
          if (ch.id === chapterId) {
            chapterName = ch.name;
            return {
              ...ch,
              learningStage: 'NOT_STARTED' as LearningStage,
              completionPercentage: 0,
              currentConfidence: 0,
              revisionCount: 0,
              lastStudiedDate: null,
              nextRevisionDate: null,
              startedDate: null,
              firstPassCompletedDate: null,
              daysTakenToComplete: null,
              ...(resetPillars
                ? {
                    pillars: {
                      lectures: false,
                      bookReading: false,
                      ncertReading: false,
                      classNotes: false,
                      questionPractice: false,
                      anki: false,
                    },
                  }
                : {}),
              updatedAt: now,
            };
          }
          return ch;
        });

        const nextState = { ...prev, chapters: updatedChapters, updatedAt: now };
        nextState.actionHistory = recordAction(
          nextState,
          'CHAPTER_PROGRESS_RESET',
          `Reset progress for chapter: ${chapterName || chapterId}`,
          'chapter',
          chapterId,
          { resetPillars }
        );
        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, chapterId, chapterName, resetPillars }, null, 2) }],
      };
    }
  );

  // TOOL: export_backup_data
  server.tool(
    'export_backup_data',
    'Generate a full portable JSON backup payload of all chapters, logs, tests, scores, and settings with verification checksum.',
    {
      includeAuditLogs: z.boolean().optional().default(true).describe('Include historical audit logs in backup'),
    },
    async ({ includeAuditLogs = true }) => {
      const state = getState();
      const payload = generateBackupPayload(state, includeAuditLogs);
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
      };
    }
  );

  // TOOL: import_restore_data
  server.tool(
    'import_restore_data',
    'Restore or safely merge application data from a previous JSON backup payload with schema validation and audit logging.',
    {
      backupPayload: z.any().describe('The JSON backup object previously exported via export_backup_data or get_everything'),
      mode: z.enum(['replace', 'merge']).optional().default('merge').describe('Merge with current data or full replace'),
    },
    async ({ backupPayload, mode = 'merge' }) => {
      const state = getState();
      const validation = validateAndRestorePayload(backupPayload, state, mode);
      const now = Date.now();
      const data = backupPayload.data || backupPayload;

      updateState((prev) => {
        let nextChapters = prev.chapters;
        let nextLogs = prev.studyLogs;
        let nextTests = prev.tests;
        let nextScores = prev.testScores;

        if (mode === 'replace') {
          nextChapters = data.chapters || prev.chapters;
          nextLogs = data.studyLogs || prev.studyLogs;
          nextTests = data.tests || prev.tests;
          nextScores = data.testScores || prev.testScores;
        } else {
          // Merge chapters by ID
          const chMap = new Map((prev.chapters || []).map((c) => [c.id, c]));
          (data.chapters || []).forEach((c: Chapter) => {
            if (!chMap.has(c.id) || (c.updatedAt && c.updatedAt > (chMap.get(c.id)?.updatedAt || 0))) {
              chMap.set(c.id, c);
            }
          });
          nextChapters = Array.from(chMap.values());

          // Merge logs by ID
          const logMap = new Map((prev.studyLogs || []).map((l) => [l.id, l]));
          (data.studyLogs || []).forEach((l: StudyLog) => {
            logMap.set(l.id, l);
          });
          nextLogs = Array.from(logMap.values());
        }

        const nextState = {
          ...prev,
          chapters: nextChapters,
          studyLogs: nextLogs,
          tests: nextTests,
          testScores: nextScores,
          updatedAt: now,
        };

        nextState.actionHistory = recordAction(
          nextState,
          'DATA_RESTORED_FROM_BACKUP',
          `Restored data from backup in ${mode} mode`,
          'system',
          undefined,
          { mode, validation }
        );

        return nextState;
      });

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, mode, validation }, null, 2) }],
      };
    }
  );

  // TOOL: get_weekly_audit_receipt
  server.tool(
    'get_weekly_audit_receipt',
    'Generate the official 7-day tactical performance audit receipt: scheduled tests in week (logged vs unlogged), itemized study rounds with standardized stages, error forensics, memory decay alerts, and ready-to-display ASCII receipt.',
    {},
    async () => {
      const state = getState();
      const receipt = computeWeeklyAuditReceipt(state);
      return {
        content: [{ type: 'text', text: JSON.stringify(receipt, null, 2) }],
      };
    }
  );

  // TOOL: get_panoramic_matrix_status
  server.tool(
    'get_panoramic_matrix_status',
    'Get real-time status of the 16:9 all-syllabus panoramic radar: Physics, Chemistry, Botany, Zoology side-by-side, pink S-rank dominance count, and chapters requiring remediation.',
    {},
    async () => {
      const state = getState();
      const radar = computePanoramicMatrixStatus(state);
      return {
        content: [{ type: 'text', text: JSON.stringify(radar, null, 2) }],
      };
    }
  );

  // =========================================================================
  // RESOURCES
  // =========================================================================
  server.resource('everything', 'neet://everything', async (uri) => {
    const state = getState();
    const dump = buildEverythingDump(state);
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(dump, null, 2) }],
    };
  });

  server.resource('daily-summary', 'neet://daily/summary', async (uri) => {
    const state = getState();
    const summary = computeDailySummary(state);
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(summary, null, 2) }],
    };
  });

  server.resource('decay-forecast', 'neet://forecast/decay', async (uri) => {
    const state = getState();
    const forecast = computeDecayForecast(state);
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(forecast, null, 2) }],
    };
  });

  server.resource('weak-spots', 'neet://weak-spots', async (uri) => {
    const state = getState();
    const diagnosis = diagnoseWeakSpots(state);
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(diagnosis, null, 2) }],
    };
  });

  server.resource('syllabus-overview', 'neet://syllabus/overview', async (uri) => {
    const state = getState();
    const dump = buildEverythingDump(state);
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(dump.analytics.syllabusAndCurriculum, null, 2) }],
    };
  });

  server.resource('due-today', 'neet://due-today', async (uri) => {
    const state = getState();
    const dump = buildEverythingDump(state);
    const due = dump.chapters.filter((c) => c.currentStatus === 'due_today' || c.currentStatus === 'overdue');
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ today: dump.metadata.currentDate, count: due.length, chapters: due }, null, 2) }],
    };
  });

  server.resource('upcoming-tests', 'neet://tests/upcoming', async (uri) => {
    const state = getState();
    const dump = buildEverythingDump(state);
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ tests: dump.tests }, null, 2) }],
    };
  });

  server.resource('action-history', 'neet://history/actions', async (uri) => {
    const state = getState();
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ actions: (state.actionHistory || []).slice(0, 100) }, null, 2) }],
    };
  });

  server.resource('features-and-analytics', 'neet://system/features-and-analytics', async (uri) => {
    const state = getState();
    const manifest = buildAppFeaturesAndAnalytics(state, { includeLiveAnalytics: true });
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(manifest, null, 2) }],
    };
  });

  // =========================================================================
  // PROMPTS
  // =========================================================================
  server.prompt(
    'generate_neet_revision_plan',
    'Generate an intensive NEET revision schedule based on currently overdue topics and student confidence ratings.',
    {
      hoursAvailable: z.number().min(1).max(16).default(4).describe('Total study hours available today'),
    },
    async ({ hoursAvailable }) => {
      const state = getState();
      const rendered = renderPromptTemplate('generate_neet_revision_plan', state, { hoursAvailable });
      return { messages: rendered.messages };
    }
  );

  server.prompt(
    'diagnose_weak_spots',
    'Clinical analysis prompt identifying high-risk low-retention topics and generating a 7-day recovery protocol.',
    {},
    async () => {
      const state = getState();
      const rendered = renderPromptTemplate('diagnose_weak_spots', state);
      return { messages: rendered.messages };
    }
  );

  server.prompt(
    'mock_test_postmortem',
    'Diagnostic prompt conducting forensic error postmortem for a recent mock exam (conceptual vs silly vs time pressure).',
    {
      testId: z.string().optional().describe('Specific mock test ID to analyze (defaults to latest)'),
    },
    async ({ testId }) => {
      const state = getState();
      const rendered = renderPromptTemplate('mock_test_postmortem', state, { testId });
      return { messages: rendered.messages };
    }
  );

  return server;
}

/**
 * Direct execution helper for HTTP POST /api/mcp and the interactive in-app playground.
 */
export async function executeMcpDirect(
  reqBody: {
    jsonrpc?: string;
    id?: string | number | null;
    method: string;
    params?: any;
  },
  getState: () => AppState,
  updateState: (updater: (prev: AppState) => AppState) => AppState
): Promise<{ jsonrpc: string; id: string | number | null; result?: any; error?: any }> {
  const id = reqBody.id !== undefined ? reqBody.id : 1;
  const method = reqBody.method;
  const params = reqBody.params || {};
  const state = getState();

  try {
    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'pcb01-study-console', version: '2.0.0' },
        },
      };
    }

    if (method === 'notifications/initialized') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'get_app_features_and_analytics',
              description:
                'Exhaustive documentation of EVERY single feature in the PCB-01 NEET Study Console, with microscopic explanations of exactly how each feature operates, the underlying mathematical formulas (SM-2, Ebbinghaus decay, pacing flight plan), full data schemas recorded with exact timestamps, PLUS real-time live computed analytics for the current user state.',
              inputSchema: {
                type: 'object',
                properties: {
                  includeLiveAnalytics: { type: 'boolean', description: 'Include live computed analytics calculated from the current database state' },
                  detailedFeature: {
                    type: 'string',
                    enum: ['all', 'spaced_repetition', 'pacing_engine', 'error_taxonomy', '5_pillars', 'mock_tests', 'mcp_server', 'audit_logging'],
                    description: 'Filter to deep dive into a specific subsystem or all',
                  },
                },
              },
            },
            {
              name: 'get_feature_manifest',
              description: 'Alias for get_app_features_and_analytics: Exhaustive guide to all app features, mechanisms, data recorded, and working analytics.',
              inputSchema: {
                type: 'object',
                properties: {
                  includeLiveAnalytics: { type: 'boolean', description: 'Include live computed analytics' },
                },
              },
            },
            {
              name: 'get_analytics_breakdown',
              description:
                'Deep-dive live analytical intelligence engine computing all NEET study metrics: syllabus progress, 5-pillar mastery, Hermann Ebbinghaus retention curve, memory decay risk, SM-2 overdue velocity, flight plan pacing, and mock test error taxonomy.',
              inputSchema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology', 'All'] },
                },
              },
            },
            {
              name: 'get_everything',
              description: 'Exhaustive all-in-one dump of literally EVERY single data point, timestamp, and history in the app.',
              inputSchema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology', 'All'] },
                  includeArchived: { type: 'boolean' },
                },
              },
            },
            {
              name: 'get_study_status',
              description: 'Get overall NEET preparation status, syllabus progress, due chapters, and test radar.',
              inputSchema: { type: 'object', properties: {} },
            },
            {
              name: 'list_due_chapters',
              description: 'List chapters due or overdue for spaced repetition revision.',
              inputSchema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology', 'All'] },
                  overdueOnly: { type: 'boolean' },
                  limit: { type: 'number' },
                },
              },
            },
            {
              name: 'search_chapters',
              description: 'Search syllabus chapters by topic name, subject, or learning stage.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology', 'All'] },
                  stage: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'FIRST_PASS_DONE', 'IN_REVISION'] },
                  maxConfidence: { type: 'number' },
                  minConfidence: { type: 'number' },
                  limit: { type: 'number' },
                },
              },
            },
            {
              name: 'get_chapter_details',
              description: 'Retrieve all data points for a specific chapter: all fields, full study logs, linked tests, timestamps.',
              inputSchema: { type: 'object', required: ['chapterId'], properties: { chapterId: { type: 'string' } } },
            },
            {
              name: 'add_chapter',
              description: 'Add a new syllabus chapter with full fields and timestamps.',
              inputSchema: {
                type: 'object',
                required: ['name', 'subject'],
                properties: {
                  name: { type: 'string' },
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology'] },
                  clusterName: { type: 'string' },
                  classLevel: { type: 'string', enum: ['11', '12'] },
                  targetDeadline: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
            {
              name: 'update_chapter',
              description: 'Update any fields of a chapter (name, stage, confidence, deadline, notes) with timestamps.',
              inputSchema: {
                type: 'object',
                required: ['chapterId'],
                properties: {
                  chapterId: { type: 'string' },
                  name: { type: 'string' },
                  learningStage: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'FIRST_PASS_DONE', 'IN_REVISION'] },
                  completionPercentage: { type: 'number' },
                  currentConfidence: { type: 'number' },
                  targetDeadline: { type: 'string' },
                  notes: { type: 'string' },
                  nextRevisionDate: { type: 'string' },
                },
              },
            },
            {
              name: 'update_chapter_pillars',
              description: 'Update milestone checklist pillars (lectures, bookReading, notes, questions, anki) with timestamps.',
              inputSchema: {
                type: 'object',
                required: ['chapterId'],
                properties: {
                  chapterId: { type: 'string' },
                  lectures: { type: 'boolean' },
                  bookReading: { type: 'boolean' },
                  classNotes: { type: 'boolean' },
                  questionPractice: { type: 'boolean' },
                  anki: { type: 'boolean' },
                },
              },
            },
            {
              name: 'archive_chapter',
              description: 'Archive or restore a chapter with timestamps.',
              inputSchema: {
                type: 'object',
                required: ['chapterId', 'isArchived'],
                properties: { chapterId: { type: 'string' }, isArchived: { type: 'boolean' } },
              },
            },
            {
              name: 'generate_study_session',
              description: 'Algorithmically generate an optimal NEET study block (worst_first, weighted, or random).',
              inputSchema: {
                type: 'object',
                properties: {
                  mode: { type: 'string', enum: ['worst_first', 'weighted', 'random'] },
                  availableMinutes: { type: 'number' },
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology', 'All'] },
                },
              },
            },
            {
              name: 'log_study_session',
              description: 'Log a completed study session with timestamps, auto-updating SM-2 intervals and action history.',
              inputSchema: {
                type: 'object',
                required: ['chapterId', 'confidenceRating'],
                properties: {
                  chapterId: { type: 'string' },
                  confidenceRating: { type: 'number' },
                  hoursSpent: { type: 'number' },
                  sessionType: { type: 'string', enum: ['progress', 'first_pass_complete', 'revision_round_complete'] },
                  note: { type: 'string' },
                },
              },
            },
            {
              name: 'list_tests',
              description: 'List all scheduled NEET mock tests with linked chapters and score history.',
              inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
            },
            {
              name: 'get_test_details',
              description: 'Get full details of a specific test, linked chapters, and recorded scores.',
              inputSchema: { type: 'object', required: ['testId'], properties: { testId: { type: 'string' } } },
            },
            {
              name: 'add_test',
              description: 'Schedule a new mock test with target date, linked chapters, coaching name, and timestamps.',
              inputSchema: {
                type: 'object',
                required: ['name', 'date', 'subjectOrScope'],
                properties: {
                  name: { type: 'string' },
                  date: { type: 'string' },
                  subjectOrScope: { type: 'string' },
                  coachingName: { type: 'string' },
                  linkedChapterIds: { type: 'array', items: { type: 'string' } },
                  totalMarks: { type: 'number' },
                },
              },
            },
            {
              name: 'delete_test',
              description: 'Delete a mock test with timestamping.',
              inputSchema: { type: 'object', required: ['testId'], properties: { testId: { type: 'string' } } },
            },
            {
              name: 'link_chapters_to_test',
              description: 'Bulk link chapters to a test deadline with timestamps.',
              inputSchema: {
                type: 'object',
                required: ['testId', 'chapterIds'],
                properties: {
                  testId: { type: 'string' },
                  chapterIds: { type: 'array', items: { type: 'string' } },
                  syncDeadlines: { type: 'boolean' },
                },
              },
            },
            {
              name: 'add_test_score',
              description: 'Record a mock test result (out of 720) with subject scores, questions, error breakdown, timestamps.',
              inputSchema: {
                type: 'object',
                required: ['testId', 'totalScore'],
                properties: {
                  testId: { type: 'string' },
                  testName: { type: 'string' },
                  totalScore: { type: 'number' },
                  physicsScore: { type: 'number' },
                  chemistryScore: { type: 'number' },
                  botanyScore: { type: 'number' },
                  zoologyScore: { type: 'number' },
                  correctQuestions: { type: 'number' },
                  incorrectQuestions: { type: 'number' },
                  unattemptedQuestions: { type: 'number' },
                  sillyMistakesCount: { type: 'number' },
                  conceptualGapsCount: { type: 'number' },
                  notes: { type: 'string' },
                },
              },
            },
            {
              name: 'update_spaced_repetition_settings',
              description: 'Update SM-2 default gaps and confidence multipliers with timestamps.',
              inputSchema: {
                type: 'object',
                properties: {
                  defaultGaps: { type: 'array', items: { type: 'number' } },
                  confMultiplier1: { type: 'number' },
                  confMultiplier2: { type: 'number' },
                  confMultiplier3: { type: 'number' },
                  confMultiplier4: { type: 'number' },
                  confMultiplier5: { type: 'number' },
                },
              },
            },
            {
              name: 'update_pacing_settings',
              description: 'Update NEET target dates (exam, syllabus deadline) and targets with timestamps.',
              inputSchema: {
                type: 'object',
                properties: {
                  targetExamDate: { type: 'string' },
                  targetSyllabusDate: { type: 'string' },
                  targetRevisionPasses: { type: 'number' },
                  targetMockTestsCount: { type: 'number' },
                  studyDaysPerWeek: { type: 'number' },
                },
              },
            },
            {
              name: 'get_action_history',
              description: 'Query the chronological audit history of all user actions with exact millisecond timestamps.',
              inputSchema: {
                type: 'object',
                properties: {
                  limit: { type: 'number' },
                  entityType: { type: 'string', enum: ['chapter', 'test', 'score', 'studyLog', 'settings', 'pacing', 'system', 'all'] },
                },
              },
            },
            {
              name: 'get_daily_summary',
              description: "Instant snapshot of today's study productivity: study hours, sessions logged, chapters reviewed, remaining due items, streak, and pacing status.",
              inputSchema: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'YYYY-MM-DD date to inspect (defaults to today)' },
                },
              },
            },
            {
              name: 'simulate_decay_forecast',
              description: 'Calculates predicted Hermann Ebbinghaus memory retention at 7, 14, 30, and 60 days into the future and lists impending critical memory drop-offs.',
              inputSchema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology', 'All'] },
                  daysAhead: { type: 'number' },
                },
              },
            },
            {
              name: 'diagnose_weak_spots',
              description: 'Scans confidence, overdue days, retention, and missing milestones to pinpoint Top High-Priority Danger Topics requiring urgent remediation.',
              inputSchema: {
                type: 'object',
                properties: {
                  subject: { type: 'string', enum: ['Physics', 'Chemistry', 'Botany', 'Zoology', 'All'] },
                  limit: { type: 'number' },
                },
              },
            },
            {
              name: 'batch_log_study_sessions',
              description: 'Log multiple completed study sessions in one atomic call, updating SM-2 intervals and audit history.',
              inputSchema: {
                type: 'object',
                required: ['sessions'],
                properties: {
                  sessions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['chapterId', 'confidenceRating'],
                      properties: {
                        chapterId: { type: 'string' },
                        confidenceRating: { type: 'number' },
                        hoursSpent: { type: 'number' },
                        sessionType: { type: 'string', enum: ['progress', 'first_pass_complete', 'revision_round_complete'] },
                        note: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            {
              name: 'batch_update_chapters',
              description: 'Bulk update learning stage, confidence, target deadline, or archive status across multiple chapters.',
              inputSchema: {
                type: 'object',
                required: ['chapterIds'],
                properties: {
                  chapterIds: { type: 'array', items: { type: 'string' } },
                  learningStage: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'FIRST_PASS_DONE', 'IN_REVISION'] },
                  currentConfidence: { type: 'number' },
                  targetDeadline: { type: 'string' },
                  isArchived: { type: 'boolean' },
                },
              },
            },
            {
              name: 'reset_chapter_progress',
              description: 'Safely reset study progress and revision intervals for a specific chapter back to NOT_STARTED for a fresh restart.',
              inputSchema: {
                type: 'object',
                required: ['chapterId'],
                properties: {
                  chapterId: { type: 'string' },
                  resetPillars: { type: 'boolean' },
                },
              },
            },
            {
              name: 'export_backup_data',
              description: 'Generate portable JSON backup payload of all chapters, logs, tests, scores, and settings with verification checksum.',
              inputSchema: {
                type: 'object',
                properties: {
                  includeAuditLogs: { type: 'boolean' },
                },
              },
            },
            {
              name: 'import_restore_data',
              description: 'Restore or safely merge application data from a previous JSON backup payload.',
              inputSchema: {
                type: 'object',
                required: ['backupPayload'],
                properties: {
                  backupPayload: { type: 'object' },
                  mode: { type: 'string', enum: ['replace', 'merge'] },
                },
              },
            },
            {
              name: 'get_weekly_audit_receipt',
              description: 'Generate the official 7-day tactical performance audit receipt: tests in week (logged vs unlogged), study rounds with standardized stages, error forensics, and ASCII receipt.',
              inputSchema: { type: 'object', properties: {} },
            },
            {
              name: 'get_panoramic_matrix_status',
              description: 'Get real-time status of the 16:9 all-syllabus panoramic radar: Physics, Chemistry, Botany, Zoology side-by-side, pink S-rank dominance count, and chapter mastery telemetry.',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        },
      };
    }

    if (method === 'resources/templates/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          resourceTemplates: [
            {
              uriTemplate: 'neet://chapter/{chapterId}',
              name: 'Specific Chapter Data',
              description: 'Direct query for a single syllabus chapter with full SM-2 stats and study logs',
              mimeType: 'application/json',
            },
            {
              uriTemplate: 'neet://test/{testId}',
              name: 'Specific Mock Test Data',
              description: 'Direct query for a single mock test with scores and error breakdown',
              mimeType: 'application/json',
            },
          ],
        },
      };
    }

    if (method === 'resources/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          resources: [
            { uri: 'neet://system/features-and-analytics', name: 'App Features & Working Analytics', mimeType: 'application/json' },
            { uri: 'neet://everything', name: 'Exhaustive Data Dump & All History', mimeType: 'application/json' },
            { uri: 'neet://daily/summary', name: "Today's Study Productivity Summary", mimeType: 'application/json' },
            { uri: 'neet://forecast/decay', name: 'Ebbinghaus Memory Decay Forecast', mimeType: 'application/json' },
            { uri: 'neet://weak-spots', name: 'Clinical Weak Spots & Danger Ranking', mimeType: 'application/json' },
            { uri: 'neet://syllabus/overview', name: 'Syllabus Overview', mimeType: 'application/json' },
            { uri: 'neet://due-today', name: 'Due Today Revision Queue', mimeType: 'application/json' },
            { uri: 'neet://tests/upcoming', name: 'Upcoming Mock Tests', mimeType: 'application/json' },
            { uri: 'neet://history/actions', name: 'Action Audit Log', mimeType: 'application/json' },
          ],
        },
      };
    }

    if (method === 'resources/read') {
      const uri = params.uri;
      const state = getState();
      if (uri === 'neet://system/features-and-analytics') {
        const manifest = buildAppFeaturesAndAnalytics(state, { includeLiveAnalytics: true });
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(manifest, null, 2) }] } };
      }
      if (uri === 'neet://everything') {
        const dump = buildEverythingDump(state);
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(dump, null, 2) }] } };
      }
      if (uri === 'neet://daily/summary') {
        const summary = computeDailySummary(state);
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(summary, null, 2) }] } };
      }
      if (uri === 'neet://forecast/decay') {
        const forecast = computeDecayForecast(state);
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(forecast, null, 2) }] } };
      }
      if (uri === 'neet://weak-spots') {
        const diagnosis = diagnoseWeakSpots(state);
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(diagnosis, null, 2) }] } };
      }
      if (uri === 'neet://due-today') {
        const dump = buildEverythingDump(state);
        const due = dump.chapters.filter((c) => c.currentStatus === 'due_today' || c.currentStatus === 'overdue');
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ today: dump.metadata.currentDate, count: due.length, chapters: due }, null, 2) }] } };
      }
      if (uri === 'neet://tests/upcoming') {
        const dump = buildEverythingDump(state);
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(dump.tests, null, 2) }] } };
      }
      if (uri === 'neet://history/actions') {
        return { jsonrpc: '2.0', id, result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(state.actionHistory || [], null, 2) }] } };
      }
      if (typeof uri === 'string' && uri.startsWith('neet://chapter/')) {
        const chId = uri.replace('neet://chapter/', '');
        const ch = (state.chapters || []).find((c) => c.id === chId);
        if (!ch) throw new Error(`Chapter not found with ID: ${chId}`);
        const logs = (state.studyLogs || []).filter((l) => l.chapterId === chId);
        const retention = calculateMemoryRetention(ch);
        return {
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ chapter: ch, retention, studyLogsHistory: logs }, null, 2) }] },
        };
      }
      if (typeof uri === 'string' && uri.startsWith('neet://test/')) {
        const tId = uri.replace('neet://test/', '');
        const test = (state.tests || []).find((t) => t.id === tId);
        if (!test) throw new Error(`Test not found with ID: ${tId}`);
        const score = (state.testScores || []).find((s) => s.testId === tId);
        return {
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ test, scoreHistory: score ? [score] : [] }, null, 2) }] },
        };
      }
      throw new Error(`Unknown resource URI: ${uri}`);
    }

    if (method === 'prompts/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          prompts: [
            {
              name: 'generate_neet_revision_plan',
              description: 'Generate an intensive revision schedule based on overdue spaced repetition topics.',
              arguments: [{ name: 'hoursAvailable', description: 'Total study hours available today', required: false }],
            },
            {
              name: 'diagnose_weak_spots',
              description: 'Clinical analysis prompt identifying high-risk low-retention topics and generating a 7-day recovery protocol.',
              arguments: [{ name: 'subject', description: 'Filter by NEET subject or All', required: false }],
            },
            {
              name: 'mock_test_postmortem',
              description: 'Diagnostic prompt conducting forensic error postmortem for a recent mock exam (conceptual vs silly vs time pressure).',
              arguments: [{ name: 'testId', description: 'Specific mock test ID to analyze (defaults to latest)', required: false }],
            },
          ],
        },
      };
    }

    if (method === 'prompts/get') {
      const promptName = params.name;
      const promptArgs = params.arguments || {};
      const rendered = renderPromptTemplate(promptName, state, promptArgs);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          description: rendered.description,
          messages: rendered.messages,
        },
      };
    }

    if (method === 'tools/call') {
      const toolName = params.name;
      const toolArgs = params.arguments || {};
      const state = getState();
      const today = getTodayStr();
      const now = Date.now();

      // Master manifest & live analytics tool
      if (
        toolName === 'get_app_features_and_analytics' ||
        toolName === 'get_feature_manifest' ||
        toolName === 'get_app_features' ||
        toolName === 'get_features'
      ) {
        const manifest = buildAppFeaturesAndAnalytics(state, toolArgs);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(manifest, null, 2) }] } };
      }

      // Deep analytics breakdown tool
      if (toolName === 'get_analytics_breakdown') {
        const manifest = buildAppFeaturesAndAnalytics(state, { includeLiveAnalytics: true });
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { metadata: manifest.metadata, liveWorkingAnalytics: manifest.liveWorkingAnalytics },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      // Master dump tool
      if (toolName === 'get_everything') {
        const dump = buildEverythingDump(state, toolArgs);
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(dump, null, 2) }] } };
      }

      if (toolName === 'get_study_status') {
        const dump = buildEverythingDump(state);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    metadata: dump.metadata,
                    analytics: dump.analytics,
                    topUpcomingTests: dump.tests.slice(0, 3),
                    topDueChapters: dump.chapters.filter((c) => c.currentStatus === 'due_today' || c.currentStatus === 'overdue').slice(0, 5),
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'list_due_chapters') {
        const { subject, overdueOnly, limit = 20 } = toolArgs;
        const dump = buildEverythingDump(state, { subject });
        let list = dump.chapters.filter((c) => !c.isArchived);
        if (overdueOnly) list = list.filter((c) => c.currentStatus === 'overdue');
        else list = list.filter((c) => c.currentStatus === 'overdue' || c.currentStatus === 'due_today');
        list.sort((a, b) => b.urgencyScore - a.urgencyScore);

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ count: list.length, today, chapters: list.slice(0, limit) }, null, 2) }] },
        };
      }

      if (toolName === 'search_chapters') {
        const { query = '', subject, stage, maxConfidence, minConfidence, limit = 30 } = toolArgs;
        const dump = buildEverythingDump(state, { subject });
        let list = dump.chapters;
        if (stage) list = list.filter((c) => c.learningStage === stage);
        if (maxConfidence !== undefined) list = list.filter((c) => c.currentConfidence <= maxConfidence);
        if (minConfidence !== undefined) list = list.filter((c) => c.currentConfidence >= minConfidence);
        if (query) {
          const q = query.toLowerCase();
          list = list.filter((c) => c.name.toLowerCase().includes(q) || c.clusterName.toLowerCase().includes(q));
        }

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ count: list.length, chapters: list.slice(0, limit) }, null, 2) }] },
        };
      }

      if (toolName === 'get_chapter_details') {
        const { chapterId } = toolArgs;
        const chapters = state.chapters || [];
        const ch = chapters.find((c) => c.id === chapterId || c.name.toLowerCase().includes(chapterId.toLowerCase()));
        if (!ch) throw new Error(`Chapter not found: ${chapterId}`);

        const chapterLogs = (state.studyLogs || []).filter((l) => l.chapterId === ch.id);
        const linkedTests = (state.tests || []).filter((t) => (t.linkedChapterIds || []).includes(ch.id));

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    chapter: ch,
                    timestamps: { createdAt: ch.createdAt, updatedAt: ch.updatedAt || now, updatedAtIso: new Date(ch.updatedAt || now).toISOString() },
                    studyLogsHistory: chapterLogs,
                    linkedTests,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'add_chapter') {
        const { name, subject, clusterName = 'General Core', classLevel = '11', targetDeadline, notes } = toolArgs;
        const newId = `custom-${subject.toLowerCase().slice(0, 3)}-${now.toString(36)}`;
        const newChapter: Chapter = {
          id: newId,
          name,
          subject,
          clusterId: 99,
          clusterName,
          classLevel,
          learningStage: 'NOT_STARTED',
          completionPercentage: 0,
          pillars: { lectures: false, bookReading: false, ncertReading: false, classNotes: false, questionPractice: false, anki: false },
          startedDate: null,
          firstPassCompletedDate: null,
          daysTakenToComplete: null,
          targetDeadline: targetDeadline || null,
          currentConfidence: 0,
          lastStudiedDate: null,
          nextRevisionDate: null,
          revisionCount: 0,
          totalStudySessions: 0,
          isArchived: false,
          notes: notes || '',
          createdAt: today,
          updatedAt: now,
        };

        updateState((prev) => {
          const nextState = { ...prev, chapters: [...prev.chapters, newChapter], updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'CHAPTER_CREATED', `Added new chapter: ${name}`, 'chapter', newId, { name, subject });
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, createdChapter: newChapter }, null, 2) }] },
        };
      }

      if (toolName === 'update_chapter') {
        const { chapterId, name, learningStage, completionPercentage, currentConfidence, targetDeadline, notes, nextRevisionDate } = toolArgs;
        let updated: Chapter | undefined;

        updateState((prev) => {
          const chapters = [...prev.chapters];
          const idx = chapters.findIndex((c) => c.id === chapterId);
          if (idx === -1) throw new Error(`Chapter not found: ${chapterId}`);

          const ch = { ...chapters[idx] };
          if (name !== undefined) ch.name = name;
          if (learningStage !== undefined) ch.learningStage = learningStage;
          if (completionPercentage !== undefined) ch.completionPercentage = completionPercentage;
          if (currentConfidence !== undefined) ch.currentConfidence = currentConfidence;
          if (targetDeadline !== undefined) ch.targetDeadline = targetDeadline || null;
          if (notes !== undefined) ch.notes = notes;
          if (nextRevisionDate !== undefined) ch.nextRevisionDate = nextRevisionDate;
          ch.updatedAt = now;

          chapters[idx] = ch;
          updated = ch;

          const nextState = { ...prev, chapters, updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'CHAPTER_UPDATED', `Updated chapter ${ch.name}`, 'chapter', ch.id, { chapterId });
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, updatedChapter: updated }, null, 2) }] },
        };
      }

      if (toolName === 'update_chapter_pillars') {
        const { chapterId, lectures, bookReading, classNotes, questionPractice, anki } = toolArgs;
        let updated: Chapter | undefined;

        updateState((prev) => {
          const chapters = [...prev.chapters];
          const idx = chapters.findIndex((c) => c.id === chapterId);
          if (idx === -1) throw new Error(`Chapter not found: ${chapterId}`);

          const ch = { ...chapters[idx] };
          const p = ch.pillars || { lectures: false, bookReading: false, classNotes: false, questionPractice: false, anki: false };
          const newP: StudyPillars = {
            lectures: lectures !== undefined ? lectures : p.lectures,
            bookReading: bookReading !== undefined ? bookReading : p.bookReading,
            classNotes: classNotes !== undefined ? classNotes : p.classNotes,
            questionPractice: questionPractice !== undefined ? questionPractice : p.questionPractice,
            anki: anki !== undefined ? anki : p.anki,
          };

          let completedCount = 0;
          if (newP.lectures) completedCount += 1;
          if (newP.bookReading) completedCount += 1;
          if (newP.classNotes) completedCount += 1;
          if (newP.questionPractice) completedCount += 1;
          if (newP.anki) completedCount += 1;

          const pct = Math.round((completedCount / 5) * 100);
          ch.pillars = newP;
          ch.completionPercentage = pct;
          ch.updatedAt = now;
          chapters[idx] = ch;
          updated = ch;

          const nextState = { ...prev, chapters, updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'PILLARS_UPDATED', `Updated pillars for ${ch.name} (${pct}%)`, 'chapter', ch.id, { pillars: newP });
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, chapter: updated }, null, 2) }] },
        };
      }

      if (toolName === 'archive_chapter') {
        const { chapterId, isArchived } = toolArgs;
        let updated: Chapter | undefined;

        updateState((prev) => {
          const chapters = [...prev.chapters];
          const idx = chapters.findIndex((c) => c.id === chapterId);
          if (idx === -1) throw new Error(`Chapter not found: ${chapterId}`);

          const ch = { ...chapters[idx], isArchived, updatedAt: now };
          chapters[idx] = ch;
          updated = ch;

          const nextState = { ...prev, chapters, updatedAt: now };
          nextState.actionHistory = recordAction(nextState, isArchived ? 'CHAPTER_ARCHIVED' : 'CHAPTER_RESTORED', `${isArchived ? 'Archived' : 'Restored'} ${ch.name}`, 'chapter', ch.id);
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, chapter: updated }, null, 2) }] },
        };
      }

      if (toolName === 'generate_study_session') {
        const { mode = 'worst_first', availableMinutes = 120, subject } = toolArgs;
        let pool = (state.chapters || []).filter((ch) => !ch.isArchived);
        if (subject && subject !== 'All') pool = pool.filter((ch) => ch.subject === subject);

        const scored = pool.map((ch) => {
          let score = (5 - (ch.currentConfidence || 1)) * 10;
          if (ch.nextRevisionDate) {
            const diff = getDaysDifference(today, ch.nextRevisionDate);
            if (diff < 0) score += Math.abs(diff) * 5;
          }
          return { ch, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const count = Math.max(1, Math.floor(availableMinutes / 35));
        const picked = scored.slice(0, count);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    mode,
                    availableMinutes,
                    schedule: picked.map((p, i) => ({
                      slot: i + 1,
                      chapterId: p.ch.id,
                      name: p.ch.name,
                      subject: p.ch.subject,
                      allocatedMinutes: Math.floor(availableMinutes / picked.length),
                      currentConfidence: p.ch.currentConfidence,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'log_study_session') {
        const { chapterId, confidenceRating, hoursSpent = 1, sessionType = 'revision_round_complete', note = '' } = toolArgs;
        let updatedChapter: Chapter | undefined;
        const newLogId = `log-${now}-${Math.random().toString(36).slice(2, 6)}`;

        updateState((prev) => {
          const chapters = [...prev.chapters];
          const idx = chapters.findIndex((c) => c.id === chapterId || c.name.toLowerCase() === chapterId.toLowerCase());
          if (idx === -1) throw new Error(`Chapter not found: ${chapterId}`);

          const ch = { ...chapters[idx] };
          const newRev = sessionType === 'progress' ? ch.revisionCount : ch.revisionCount + 1;
          const gap = calculateNextGap(newRev, confidenceRating, prev.settings);
          const nextDate = addDaysToDateStr(today, gap);

          ch.lastStudiedDate = today;
          ch.nextRevisionDate = nextDate;
          ch.currentConfidence = confidenceRating;
          ch.revisionCount = newRev;
          ch.totalStudySessions = (ch.totalStudySessions || 0) + 1;
          ch.updatedAt = now;
          chapters[idx] = ch;
          updatedChapter = ch;

          const newLog: StudyLog = {
            id: newLogId,
            chapterId: ch.id,
            chapterName: ch.name,
            subject: ch.subject,
            dateStudied: today,
            sessionType,
            hoursSpent,
            confidenceRating,
            revisionNumber: newRev,
            note,
            timestamp: now,
          };

          const nextState = { ...prev, chapters, studyLogs: [newLog, ...(prev.studyLogs || [])], updatedAt: now };
          nextState.actionHistory = recordAction(
            nextState,
            'STUDY_SESSION_LOGGED',
            `Logged revision for ${ch.name} (confidence: ${confidenceRating}/5)`,
            'studyLog',
            newLogId,
            { confidenceRating, gap, nextRevisionDate: nextDate }
          );
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: true,
                    message: `Logged session for ${updatedChapter?.name}`,
                    timestamp: now,
                    timestampIso: new Date(now).toISOString(),
                    chapter: updatedChapter,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'list_tests') {
        const dump = buildEverythingDump(state);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ count: dump.tests.length, tests: dump.tests }, null, 2) }] },
        };
      }

      if (toolName === 'get_test_details') {
        const { testId } = toolArgs;
        const test = (state.tests || []).find((t) => t.id === testId);
        if (!test) throw new Error(`Test not found: ${testId}`);
        const linkedChapters = (state.chapters || []).filter((c) => (test.linkedChapterIds || []).includes(c.id));
        const scores = (state.testScores || []).filter((s) => s.testId === test.id);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ test, linkedChapters, scores }, null, 2) }] },
        };
      }

      if (toolName === 'add_test') {
        const { name, date, subjectOrScope, coachingName = 'Custom', linkedChapterIds = [], totalMarks = 720 } = toolArgs;
        const newTestId = `test-${now}-${Math.random().toString(36).slice(2, 6)}`;
        const newTest: Test = {
          id: newTestId,
          name,
          date,
          subjectOrScope,
          coachingName,
          linkedChapterIds,
          totalMarks,
          createdAt: today,
          updatedAt: now,
          timestamp: now,
        };

        updateState((prev) => {
          const nextState = { ...prev, tests: [newTest, ...(prev.tests || [])], updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'TEST_CREATED', `Created test ${name} on ${date}`, 'test', newTestId);
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, createdTest: newTest }, null, 2) }] },
        };
      }

      if (toolName === 'delete_test') {
        const { testId } = toolArgs;
        updateState((prev) => {
          const nextState = { ...prev, tests: (prev.tests || []).filter((t) => t.id !== testId), updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'TEST_DELETED', `Deleted test ${testId}`, 'test', testId);
          return nextState;
        });
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ success: true, deletedTestId: testId }, null, 2) }] } };
      }

      if (toolName === 'link_chapters_to_test') {
        const { testId, chapterIds, syncDeadlines = true } = toolArgs;
        updateState((prev) => {
          const test = (prev.tests || []).find((t) => t.id === testId);
          if (!test) throw new Error(`Test not found: ${testId}`);

          const linkedIds = Array.from(new Set([...(test.linkedChapterIds || []), ...chapterIds]));
          const tests = (prev.tests || []).map((t) => (t.id === testId ? { ...t, linkedChapterIds: linkedIds, updatedAt: now } : t));
          const chapters = (prev.chapters || []).map((c) => (chapterIds.includes(c.id) && syncDeadlines ? { ...c, targetDeadline: test.date, updatedAt: now } : c));

          const nextState = { ...prev, tests, chapters, updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'CHAPTERS_LINKED_TO_TEST', `Linked ${chapterIds.length} chapters to test ${test.name}`, 'test', testId);
          return nextState;
        });

        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ success: true, testId, linkedCount: chapterIds.length }, null, 2) }] } };
      }

      if (toolName === 'add_test_score') {
        const {
          testId,
          totalScore,
          testName,
          physicsScore,
          chemistryScore,
          botanyScore,
          zoologyScore,
          correctQuestions,
          incorrectQuestions,
          unattemptedQuestions,
          sillyMistakesCount,
          conceptualGapsCount,
          notes,
        } = toolArgs;
        const scoreId = `score-${now}-${Math.random().toString(36).slice(2, 6)}`;
        const newScore: TestScore = {
          id: scoreId,
          testId,
          testName: testName || testId,
          dateRecorded: today,
          totalScore,
          maxScore: 720,
          totalQuestions: 180,
          correctQuestions,
          incorrectQuestions,
          unattemptedQuestions,
          subjectScores: { Physics: physicsScore, Chemistry: chemistryScore, Botany: botanyScore, Zoology: zoologyScore },
          errors:
            sillyMistakesCount !== undefined || conceptualGapsCount !== undefined || notes
              ? { sillyMistakes: sillyMistakesCount, conceptualGaps: conceptualGapsCount, notes }
              : undefined,
          notes: notes || undefined,
          timestamp: now,
        };

        updateState((prev) => {
          const nextState = { ...prev, testScores: [newScore, ...(prev.testScores || [])], updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'TEST_SCORE_RECORDED', `Logged score ${totalScore}/720 for ${testName || testId}`, 'score', scoreId);
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, score: newScore }, null, 2) }] },
        };
      }

      if (toolName === 'update_spaced_repetition_settings') {
        const { defaultGaps, confMultiplier1, confMultiplier2, confMultiplier3, confMultiplier4, confMultiplier5 } = toolArgs;
        let newS: SpacedRepetitionSettings | undefined;

        updateState((prev) => {
          const curr = prev.settings;
          newS = {
            defaultGaps: defaultGaps || curr.defaultGaps,
            confidenceMultipliers: {
              1: confMultiplier1 ?? curr.confidenceMultipliers[1],
              2: confMultiplier2 ?? curr.confidenceMultipliers[2],
              3: confMultiplier3 ?? curr.confidenceMultipliers[3],
              4: confMultiplier4 ?? curr.confidenceMultipliers[4],
              5: confMultiplier5 ?? curr.confidenceMultipliers[5],
            },
          };
          const nextState = { ...prev, settings: newS, updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'SETTINGS_UPDATED', 'Updated SM-2 intervals and multipliers', 'settings');
          return nextState;
        });

        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ success: true, settings: newS }, null, 2) }] } };
      }

      if (toolName === 'update_pacing_settings') {
        const { targetExamDate, targetSyllabusDate, targetRevisionPasses, targetMockTestsCount, studyDaysPerWeek } = toolArgs;
        let newP: SyllabusPacingSettings | undefined;

        updateState((prev) => {
          const curr = prev.pacingSettings || {
            targetSyllabusDate: '2026-12-31',
            targetExamDate: '2027-05-02',
            targetRevisionPasses: 3,
            targetMockTestsCount: 25,
            includeAllTestsGoal: true,
            studyDaysPerWeek: 7,
          };
          newP = {
            ...curr,
            targetExamDate: targetExamDate || curr.targetExamDate,
            targetSyllabusDate: targetSyllabusDate || curr.targetSyllabusDate,
            targetRevisionPasses: targetRevisionPasses ?? curr.targetRevisionPasses,
            targetMockTestsCount: targetMockTestsCount ?? curr.targetMockTestsCount,
            studyDaysPerWeek: studyDaysPerWeek ?? curr.studyDaysPerWeek,
          };
          const nextState = { ...prev, pacingSettings: newP, updatedAt: now };
          nextState.actionHistory = recordAction(nextState, 'PACING_UPDATED', 'Updated syllabus pacing targets', 'pacing');
          return nextState;
        });

        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ success: true, pacingSettings: newP }, null, 2) }] } };
      }

      if (toolName === 'get_action_history') {
        const { limit = 50, entityType = 'all' } = toolArgs;
        let list = state.actionHistory || [];
        if (entityType && entityType !== 'all') list = list.filter((a) => a.entityType === entityType);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ count: list.length, actionHistory: list.slice(0, limit) }, null, 2) }] },
        };
      }

      if (toolName === 'get_daily_summary') {
        const { date } = toolArgs;
        const summary = computeDailySummary(state, date);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] },
        };
      }

      if (toolName === 'simulate_decay_forecast') {
        const { subject, daysAhead } = toolArgs;
        const forecast = computeDecayForecast(state, { subject, daysAhead });
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(forecast, null, 2) }] },
        };
      }

      if (toolName === 'diagnose_weak_spots') {
        const { subject, limit } = toolArgs;
        const diagnosis = diagnoseWeakSpots(state, { subject, limit });
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(diagnosis, null, 2) }] },
        };
      }

      if (toolName === 'batch_log_study_sessions') {
        const { sessions = [] } = toolArgs;
        let committedCount = 0;

        updateState((prev) => {
          let currentChapters = [...prev.chapters];
          let currentLogs = [...(prev.studyLogs || [])];
          const settings = prev.settings || {
            defaultGaps: [3, 7, 14, 30],
            confidenceMultipliers: { 1: 0.5, 2: 0.5, 3: 1.0, 4: 1.5, 5: 1.5 },
          };

          sessions.forEach((item: any) => {
            const chIndex = currentChapters.findIndex((c) => c.id === item.chapterId);
            if (chIndex >= 0) {
              const ch = currentChapters[chIndex];
              const hours = item.hoursSpent ?? 1;

              let nextGap = calculateNextGap(
                item.sessionType === 'revision_round_complete' ? (ch.revisionCount || 1) + 1 : 1,
                item.confidenceRating,
                settings
              );

              let newStage = ch.learningStage;
              let newRevisionCount = ch.revisionCount || 0;
              let nextRevisionDate = ch.nextRevisionDate;

              if (item.sessionType === 'first_pass_complete') {
                newStage = 'FIRST_PASS_DONE';
                newRevisionCount = Math.max(1, ch.revisionCount || 1);
                nextRevisionDate = addDaysToDateStr(today, nextGap);
              } else if (item.sessionType === 'revision_round_complete') {
                newStage = 'IN_REVISION';
                newRevisionCount = (ch.revisionCount || 1) + 1;
                nextRevisionDate = addDaysToDateStr(today, nextGap);
              } else {
                newStage = 'IN_PROGRESS';
              }

              const updatedCh: Chapter = {
                ...ch,
                learningStage: newStage,
                currentConfidence: item.confidenceRating,
                lastStudiedDate: today,
                nextRevisionDate,
                revisionCount: newRevisionCount,
                totalStudySessions: (ch.totalStudySessions || 0) + 1,
                updatedAt: now,
              };

              const newLog: StudyLog = {
                id: 'log-' + now + '-' + Math.random().toString(36).substring(2, 6),
                chapterId: ch.id,
                chapterName: ch.name,
                subject: ch.subject,
                dateStudied: today,
                sessionType: item.sessionType || 'revision_round_complete',
                confidenceRating: item.confidenceRating,
                hoursSpent: hours,
                revisionNumber: newRevisionCount,
                note: item.note || 'Batch logged study session',
                timestamp: now,
              };

              currentChapters[chIndex] = updatedCh;
              currentLogs.unshift(newLog);
              committedCount++;
            }
          });

          const nextState = {
            ...prev,
            chapters: currentChapters,
            studyLogs: currentLogs,
            updatedAt: now,
          };

          nextState.actionHistory = recordAction(
            nextState,
            'BATCH_STUDY_SESSIONS_LOGGED',
            `Logged ${committedCount} study sessions in batch`,
            'studyLog',
            undefined,
            { committedCount }
          );

          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, committedSessionsCount: committedCount, date: today }, null, 2) }] },
        };
      }

      if (toolName === 'batch_update_chapters') {
        const { chapterIds = [], learningStage, currentConfidence, targetDeadline, isArchived } = toolArgs;
        let affectedCount = 0;

        updateState((prev) => {
          const idSet = new Set(chapterIds);
          const updatedChapters = (prev.chapters || []).map((ch) => {
            if (idSet.has(ch.id)) {
              affectedCount++;
              return {
                ...ch,
                ...(learningStage !== undefined ? { learningStage } : {}),
                ...(currentConfidence !== undefined ? { currentConfidence } : {}),
                ...(targetDeadline !== undefined ? { targetDeadline } : {}),
                ...(isArchived !== undefined ? { isArchived } : {}),
                updatedAt: now,
              };
            }
            return ch;
          });

          const nextState = { ...prev, chapters: updatedChapters, updatedAt: now };
          nextState.actionHistory = recordAction(
            nextState,
            'BATCH_CHAPTERS_UPDATED',
            `Bulk updated ${affectedCount} chapters`,
            'chapter',
            undefined,
            { chapterIds, learningStage, currentConfidence, targetDeadline, isArchived }
          );
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, affectedCount }, null, 2) }] },
        };
      }

      if (toolName === 'reset_chapter_progress') {
        const { chapterId, resetPillars } = toolArgs;
        let chapterName = '';

        updateState((prev) => {
          const updatedChapters = (prev.chapters || []).map((ch) => {
            if (ch.id === chapterId) {
              chapterName = ch.name;
              return {
                ...ch,
                learningStage: 'NOT_STARTED' as LearningStage,
                completionPercentage: 0,
                currentConfidence: 0,
                revisionCount: 0,
                lastStudiedDate: null,
                nextRevisionDate: null,
                startedDate: null,
                firstPassCompletedDate: null,
                daysTakenToComplete: null,
                ...(resetPillars
                  ? {
                      pillars: {
                        lectures: false,
                        bookReading: false,
                        ncertReading: false,
                        classNotes: false,
                        questionPractice: false,
                        anki: false,
                      },
                    }
                  : {}),
                updatedAt: now,
              };
            }
            return ch;
          });

          const nextState = { ...prev, chapters: updatedChapters, updatedAt: now };
          nextState.actionHistory = recordAction(
            nextState,
            'CHAPTER_PROGRESS_RESET',
            `Reset progress for chapter: ${chapterName || chapterId}`,
            'chapter',
            chapterId,
            { resetPillars }
          );
          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, chapterId, chapterName, resetPillars }, null, 2) }] },
        };
      }

      if (toolName === 'export_backup_data') {
        const { includeAuditLogs = true } = toolArgs;
        const payload = generateBackupPayload(state, includeAuditLogs);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] },
        };
      }

      if (toolName === 'import_restore_data') {
        const { backupPayload, mode = 'merge' } = toolArgs;
        const validation = validateAndRestorePayload(backupPayload, state, mode);
        const data = backupPayload.data || backupPayload;

        updateState((prev) => {
          let nextChapters = prev.chapters;
          let nextLogs = prev.studyLogs;
          let nextTests = prev.tests;
          let nextScores = prev.testScores;

          if (mode === 'replace') {
            nextChapters = data.chapters || prev.chapters;
            nextLogs = data.studyLogs || prev.studyLogs;
            nextTests = data.tests || prev.tests;
            nextScores = data.testScores || prev.testScores;
          } else {
            const chMap = new Map((prev.chapters || []).map((c) => [c.id, c]));
            (data.chapters || []).forEach((c: Chapter) => {
              if (!chMap.has(c.id) || (c.updatedAt && c.updatedAt > (chMap.get(c.id)?.updatedAt || 0))) {
                chMap.set(c.id, c);
              }
            });
            nextChapters = Array.from(chMap.values());

            const logMap = new Map((prev.studyLogs || []).map((l) => [l.id, l]));
            (data.studyLogs || []).forEach((l: StudyLog) => {
              logMap.set(l.id, l);
            });
            nextLogs = Array.from(logMap.values());
          }

          const nextState = {
            ...prev,
            chapters: nextChapters,
            studyLogs: nextLogs,
            tests: nextTests,
            testScores: nextScores,
            updatedAt: now,
          };

          nextState.actionHistory = recordAction(
            nextState,
            'DATA_RESTORED_FROM_BACKUP',
            `Restored data from backup in ${mode} mode`,
            'system',
            undefined,
            { mode, validation }
          );

          return nextState;
        });

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify({ success: true, mode, validation }, null, 2) }] },
        };
      }

      if (toolName === 'get_weekly_audit_receipt') {
        const receipt = computeWeeklyAuditReceipt(state);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(receipt, null, 2) }] },
        };
      }

      if (toolName === 'get_panoramic_matrix_status') {
        const radar = computePanoramicMatrixStatus(state);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(radar, null, 2) }] },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method or tool not found: ${toolName}` },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unsupported method: ${method}` },
    };
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err?.message || 'Internal MCP Error' },
    };
  }
}
