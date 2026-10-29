export type Subject = 'Physics' | 'Chemistry' | 'Botany' | 'Zoology';

export type GeneratorMode = 'weighted' | 'random' | 'worst_first';

export type LearningStage = 'NOT_STARTED' | 'IN_PROGRESS' | 'FIRST_PASS_DONE' | 'IN_REVISION';

export interface StudyPillars {
  lectures?: boolean;
  bookReading?: boolean; // Replaced NCERT Reading with Book Reading
  ncertReading?: boolean; // Backwards compatible alias
  classNotes?: boolean;
  questionPractice?: boolean;
  anki?: boolean; // New Anki Flashcards pillar
}

export interface Chapter {
  id: string;
  name: string;
  subject: Subject;
  clusterId: number; // 1 to 16
  clusterName: string;
  classLevel?: '11' | '12';
  learningStage?: LearningStage;
  completionPercentage?: number; // 0 to 100%
  pillars?: StudyPillars;
  startedDate?: string | null; // YYYY-MM-DD
  firstPassCompletedDate?: string | null; // YYYY-MM-DD
  daysTakenToComplete?: number | null; // number of days taken from start to 100% first pass
  targetDeadline?: string | null; // YYYY-MM-DD or linked test deadline
  updatedAt?: number; // epoch ms timestamp of last change for cross-device sync
  totalStudySessions?: number;
  currentConfidence: number; // 0 = unstudied, 1 to 5
  lastStudiedDate: string | null; // YYYY-MM-DD
  nextRevisionDate: string | null; // YYYY-MM-DD
  revisionCount: number; // 0 (1st pass in progress), 1, 2, 3...
  isArchived: boolean;
  notes?: string;
  createdAt: string;
}

export type StudySessionType = 'progress' | 'first_pass_complete' | 'revision_round_complete';

export interface StudyLog {
  id: string;
  chapterId: string;
  chapterName: string;
  subject: Subject;
  dateStudied: string; // YYYY-MM-DD
  sessionType?: StudySessionType; // 'progress' = continuing study (no revision bump); 'first_pass_complete' | 'revision_round_complete' = full round done
  completionPercentage?: number; // 0 to 100%
  pillarsCompleted?: StudyPillars;
  hoursSpent?: number;
  confidenceRating: number; // 1 to 5
  revisionNumber: number; // 0 for progress, 1, 2, 3... for revision rounds
  note?: string;
  timestamp: number; // epoch ms
}

export interface Test {
  id: string;
  name: string;
  coachingName?: string; // e.g., 'Allen', 'Aakash', 'Self-Test'
  date: string; // YYYY-MM-DD
  subjectOrScope: string;
  linkedChapterIds: string[];
  totalMarks: number;
  createdAt: string;
  updatedAt?: number;
  timestamp?: number;
}

export interface SubjectErrorBreakdown {
  sillyMistakes?: number; // calculation / misread / bubbling slips
  conceptualGaps?: number; // theory unclear / formula wrong
  memoryRecall?: number; // forgot fact / forgotten reaction or value
  timePressure?: number; // rushed / unattempted / panicking
  guessingWild?: number; // wild guess / overconfidence
}

export interface ErrorBreakdown {
  sillyMistakes?: number; // calculation / misread / bubbling slips (overall)
  conceptualGaps?: number; // theory unclear / formula wrong (overall)
  memoryRecall?: number; // forgot fact / forgotten reaction or value (overall)
  timePressure?: number; // rushed / unattempted / panicking (overall)
  guessingWild?: number; // wild guess / overconfidence (overall)
  bySubject?: Partial<Record<Subject, SubjectErrorBreakdown>>;
  notes?: string;
}

export interface SubjectQuestionCount {
  correct?: number;
  incorrect?: number;
  unattempted?: number;
  score?: number;
}

export interface TestScore {
  id: string;
  testId: string;
  testName: string;
  dateRecorded: string;
  totalScore: number;
  maxScore: number;
  totalQuestions?: number;
  correctQuestions?: number;
  incorrectQuestions?: number;
  unattemptedQuestions?: number;
  errors?: ErrorBreakdown;
  subjectScores?: Partial<Record<Subject, number>>;
  subjectQuestions?: Partial<Record<Subject, SubjectQuestionCount>>;
  notes?: string;
  timestamp: number;
}

export interface SyllabusPacingSettings {
  targetSyllabusDate: string; // YYYY-MM-DD
  targetExamDate: string; // YYYY-MM-DD
  targetRevisionPasses: number; // e.g. 2, 3, 4
  targetMockTestsCount: number; // e.g. 25
  includeAllTestsGoal: boolean;
  studyDaysPerWeek?: number;
}

export interface SpacedRepetitionSettings {
  defaultGaps: number[]; // e.g. [3, 7, 14, 30]
  confidenceMultipliers: {
    1: number; // 0.5
    2: number; // 0.5
    3: number; // 1.0
    4: number; // 1.5
    5: number; // 1.5
  };
}

export interface ClusterInfo {
  id: number;
  name: string;
  subject: Subject;
  description: string;
}

export interface ActionLog {
  id: string;
  actionType: string; // e.g. 'STUDY_SESSION_LOGGED', 'CHAPTER_UPDATED', 'TEST_ADDED', etc.
  description: string;
  entityType: 'chapter' | 'test' | 'score' | 'studyLog' | 'settings' | 'pacing' | 'system';
  entityId?: string;
  timestamp: number; // epoch ms
  timestampIso: string; // ISO 8601 string
  metadata?: Record<string, any>;
}

export interface AppState {
  chapters: Chapter[];
  studyLogs: StudyLog[];
  tests: Test[];
  testScores: TestScore[];
  actionHistory?: ActionLog[];
  settings: SpacedRepetitionSettings;
  pacingSettings?: SyllabusPacingSettings;
  tutorialCompleted: boolean;
  updatedAt?: number; // epoch ms of last state change
  deviceClientId?: string; // client session id to prevent echo loop
}

export type AppFont = 'group-humanist';
