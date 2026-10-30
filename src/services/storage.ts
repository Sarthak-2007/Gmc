import { DEFAULT_PACING_SETTINGS, DEFAULT_SETTINGS, INITIAL_CHAPTERS, INITIAL_STUDY_LOGS, INITIAL_TESTS, INITIAL_TEST_SCORES } from '../data/seedData';
import { AppState, Chapter, SpacedRepetitionSettings, StudyLog, SyllabusPacingSettings, Test, TestScore } from '../types';

const STORAGE_KEY = 'pcb01_study_console_state_v4';

function normalizeChapter(ch: Chapter): Chapter {
  const hasBook = Boolean(ch.pillars?.bookReading || ch.pillars?.ncertReading);
  return {
    ...ch,
    startedDate: ch.startedDate || null,
    firstPassCompletedDate: ch.firstPassCompletedDate || null,
    daysTakenToComplete:
      ch.daysTakenToComplete !== undefined && ch.daysTakenToComplete !== null
        ? Number(ch.daysTakenToComplete)
        : null,
    targetDeadline: ch.targetDeadline || null,
    updatedAt: Number(ch.updatedAt) || (ch.lastStudiedDate ? new Date(ch.lastStudiedDate).getTime() : 0),
    pillars: ch.pillars
      ? {
          lectures: !!ch.pillars.lectures,
          bookReading: hasBook,
          ncertReading: hasBook,
          classNotes: !!ch.pillars.classNotes,
          questionPractice: !!ch.pillars.questionPractice,
          anki: !!ch.pillars.anki,
        }
      : { lectures: false, bookReading: false, ncertReading: false, classNotes: false, questionPractice: false, anki: false },
    learningStage:
      ch.learningStage ||
      (ch.completionPercentage && ch.completionPercentage >= 100
        ? 'FIRST_PASS_DONE'
        : ch.completionPercentage && ch.completionPercentage > 0
        ? 'IN_PROGRESS'
        : 'NOT_STARTED'),
    completionPercentage: ch.completionPercentage ?? 0,
  };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getInitialState();
    }
    const parsed = JSON.parse(raw);
    const loadedChapters =
      Array.isArray(parsed.chapters) && parsed.chapters.length > 0
        ? parsed.chapters.map(normalizeChapter)
        : INITIAL_CHAPTERS;

    return {
      chapters: loadedChapters,
      studyLogs: Array.isArray(parsed.studyLogs) ? parsed.studyLogs : INITIAL_STUDY_LOGS,
      tests: Array.isArray(parsed.tests) && parsed.tests.length > 0 ? parsed.tests : INITIAL_TESTS,
      testScores: Array.isArray(parsed.testScores) ? parsed.testScores : INITIAL_TEST_SCORES,
      actionHistory: Array.isArray(parsed.actionHistory) ? parsed.actionHistory : [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
        confidenceMultipliers: {
          ...DEFAULT_SETTINGS.confidenceMultipliers,
          ...(parsed.settings?.confidenceMultipliers || {}),
        },
      },
      pacingSettings: {
        ...DEFAULT_PACING_SETTINGS,
        ...(parsed.pacingSettings || {}),
      },
      tutorialCompleted: !!parsed.tutorialCompleted,
      updatedAt: Number(parsed.updatedAt) || Date.now(),
      deviceClientId: parsed.deviceClientId || undefined,
    };
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return getInitialState();
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
}

export function getInitialState(): AppState {
  return {
    chapters: INITIAL_CHAPTERS,
    studyLogs: INITIAL_STUDY_LOGS,
    tests: INITIAL_TESTS,
    testScores: INITIAL_TEST_SCORES,
    settings: DEFAULT_SETTINGS,
    pacingSettings: DEFAULT_PACING_SETTINGS,
    tutorialCompleted: false,
    updatedAt: Date.now(),
  };
}

export function resetToSeedData(): AppState {
  const fresh = getInitialState();
  saveAppState(fresh);
  return fresh;
}

export function exportBackupJSON(state: AppState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `PCB01_Backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importBackupJSON(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.chapters) || !Array.isArray(parsed.studyLogs) || !Array.isArray(parsed.tests)) {
          throw new Error('Invalid backup file format.');
        }
        const state: AppState = {
          chapters: parsed.chapters.map(normalizeChapter),
          studyLogs: parsed.studyLogs,
          tests: parsed.tests,
          testScores: Array.isArray(parsed.testScores) ? parsed.testScores : [],
          actionHistory: Array.isArray(parsed.actionHistory) ? parsed.actionHistory : [],
          settings: {
            ...DEFAULT_SETTINGS,
            ...(parsed.settings || {}),
            confidenceMultipliers: {
              ...DEFAULT_SETTINGS.confidenceMultipliers,
              ...(parsed.settings?.confidenceMultipliers || {}),
            },
          },
          pacingSettings: {
            ...DEFAULT_PACING_SETTINGS,
            ...(parsed.pacingSettings || {}),
          },
          tutorialCompleted: !!parsed.tutorialCompleted,
          updatedAt: Date.now(),
        };
        saveAppState(state);
        resolve(state);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
