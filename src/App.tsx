import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Header, AppTheme } from './components/Header';
import { TestRadarFocus } from './components/TestRadarFocus';
import { ChapterSelectionGenerator } from './components/ChapterSelectionGenerator';
import { HardwareDeck } from './components/te/HardwareDeck';
import { CriticalRiskList } from './components/CriticalRiskList';
import { ChapterList } from './components/ChapterList';
import { TestManager } from './components/TestManager';
import { StrategicFlightHub } from './components/StrategicFlightHub';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { QuickLogModal } from './components/QuickLogModal';
import { QuickAddChapterModal } from './components/QuickAddChapterModal';
import { QuickAddTestModal } from './components/QuickAddTestModal';
import { LogScoreModal } from './components/LogScoreModal';
import { BulkDeadlineModal } from './components/BulkDeadlineModal';
import { SettingsModal } from './components/SettingsModal';
import { TutorialModal } from './components/TutorialModal';
import { WeeklyAuditModal } from './components/WeeklyAuditModal';
import { TestSchedulePrintModal } from './components/TestSchedulePrintModal';
import { McpModal } from './components/McpModal';
import { ShadowArmyMatrix } from './components/ShadowArmyMatrix';
import {
  AppState,
  Chapter,
  GeneratorMode,
  LearningStage,
  SpacedRepetitionSettings,
  StudyPillars,
  StudySessionType,
  Subject,
  Test,
  TestScore,
  AppFont,
} from './types';
import {
  loadAppState,
  saveAppState,
  resetToSeedData,
} from './services/storage';
import { DEFAULT_PACING_SETTINGS, DEFAULT_SETTINGS } from './data/seedData';
import {
  CloudSyncStatus,
  initAuthListener,
  loadStateFromFirestore,
  loginWithGoogle,
  logoutFirebaseAuth,
  saveStateToFirestore,
  mergeLocalAndCloudState,
  subscribeToStateFromFirestore,
  getDeviceClientId,
  parseFirestoreState,
} from './services/firebase';
import {
  addDaysToDateStr,
  applyStudyLogToChapter,
  calculateNextGap,
  getTodayStr,
  recalculateChapterFromRemainingLogs,
} from './services/spacedRepetition';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('radar');
  const [deckMode, setDeckMode] = useState<GeneratorMode>('weighted');
  const [deckSubject, setDeckSubject] = useState<Subject | 'All'>('All');
  const [rollSignal, setRollSignal] = useState<number>(0);

  // Theme state: 'classic', 'crayon-light', 'vibrant-prism', or 'hyper-chroma' (15+ Colors, 0% Green)
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pcb01_theme') as string | null;
      if (saved === 'crayon-light' || saved === 'vibrant-prism' || saved === 'hyper-chroma') {
        return saved as AppTheme;
      }
    }
    return 'classic';
  });

  // Global Font System: Humanist Clarity Standard (Sora Display, Atkinson Hyperlegible Body, Anonymous Pro Mono)
  const [font, setFont] = useState<AppFont>('group-humanist');

  // Apply font family class globally
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const allFontClasses = [
        'font-group-humanist',
        'font-group-editorial',
        'font-group-scholar',
        'font-group-minimalist',
        'font-swiss-modern',
        'font-ibm-plex',
        'font-public-clean',
        'font-tech-terminal',
      ];
      document.documentElement.classList.remove(...allFontClasses);
      document.body.classList.remove(...allFontClasses);

      document.documentElement.classList.add('font-group-humanist');
      document.body.classList.add('font-group-humanist');
      localStorage.setItem('pcb01_font', 'group-humanist');
    }
  }, []);

  // Apply theme class to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const allThemeClasses = [
        'theme-dark',
        'theme-light',
        'theme-classic',
        'theme-crayon-light',
        'theme-crayon-dark',
        'theme-vibrant-prism',
        'theme-hyper-chroma',
        'theme-oled',
        'theme-amber',
        'theme-slate',
      ];
      document.documentElement.classList.remove(...allThemeClasses);
      document.body.classList.remove(...allThemeClasses);

      if (theme === 'crayon-light') {
        document.documentElement.classList.add('theme-crayon-light');
        document.body.classList.add('theme-crayon-light');
      } else if (theme === 'vibrant-prism') {
        document.documentElement.classList.add('theme-vibrant-prism');
        document.body.classList.add('theme-vibrant-prism');
      } else if (theme === 'hyper-chroma') {
        document.documentElement.classList.add('theme-hyper-chroma');
        document.body.classList.add('theme-hyper-chroma');
      } else {
        document.documentElement.classList.add('theme-classic');
        document.body.classList.add('theme-classic');
      }
      localStorage.setItem('pcb01_theme', theme);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'classic') return 'crayon-light';
      if (prev === 'crayon-light') return 'vibrant-prism';
      if (prev === 'vibrant-prism') return 'hyper-chroma';
      return 'classic';
    });
  };

  // Cloud Sync & Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('connecting');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const isInitialCloudLoadDone = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppState>(appState);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Modal states
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [preselectedChapterId, setPreselectedChapterId] = useState<string | undefined>(undefined);

  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  
  const [isLogScoreOpen, setIsLogScoreOpen] = useState(false);
  const [preselectedTestId, setPreselectedTestId] = useState<string | undefined>(undefined);

  const [isBulkDeadlineOpen, setIsBulkDeadlineOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isWeeklyAuditOpen, setIsWeeklyAuditOpen] = useState(false);
  const [isPrintScheduleOpen, setIsPrintScheduleOpen] = useState(false);
  const [isMcpOpen, setIsMcpOpen] = useState(false);

  const isServerHydratedRef = useRef(false);

  // Sync state with server MCP endpoints (merge without losing newer local or server changes)
  const refreshStateFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && Array.isArray(serverData.chapters) && serverData.chapters.length > 0) {
          const parsedServer = parseFirestoreState(serverData);
          const merged = mergeLocalAndCloudState(appStateRef.current, parsedServer);
          appStateRef.current = merged;
          setAppState(merged);
          saveAppState(merged);
        }
      }
    } catch {
      // offline fallback
    } finally {
      isServerHydratedRef.current = true;
    }
  }, []);

  // Hydrate from backend server on initial mount before pushing local state
  useEffect(() => {
    refreshStateFromServer();
  }, [refreshStateFromServer]);

  // Broadcast local changes to backend server so MCP always has latest revision telemetry
  useEffect(() => {
    if (!isServerHydratedRef.current) return;
    const timer = setTimeout(() => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [appState]);

  // 1. Initialize Firebase Auth Listener, Initial Merge & Multi-Device Real-Time Subscription
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = initAuthListener(async (user) => {
      setCurrentUser(user);
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (!user) {
        setCloudSyncStatus('offline');
        return;
      }

      setCloudSyncStatus('connecting');
      try {
        const cloudData = await loadStateFromFirestore(user.uid);
        const localData = loadAppState();

        let unifiedState: AppState;
        if (cloudData && Array.isArray(cloudData.chapters) && cloudData.chapters.length > 0) {
          // Merge local and cloud progress safely to guarantee zero data loss
          unifiedState = mergeLocalAndCloudState(localData, cloudData);
        } else {
          unifiedState = localData;
        }

        unifiedState.updatedAt = Math.max(unifiedState.updatedAt || 0, Date.now());
        unifiedState.deviceClientId = getDeviceClientId();

        isRemoteUpdateRef.current = true;
        setAppState(unifiedState);
        saveAppState(unifiedState);

        // Persist consolidated state to Firestore
        await saveStateToFirestore(user.uid, unifiedState);
        setLastCloudSyncTime(new Date().toISOString());
        setCloudSyncStatus('synced');
      } catch (err) {
        console.error('Initial cloud sync error:', err);
        setCloudSyncStatus('error');
      } finally {
        isInitialCloudLoadDone.current = true;
      }

      // Establish real-time listener for changes made on other devices
      unsubscribeFirestore = subscribeToStateFromFirestore(
        user.uid,
        (remoteState, isFromOtherDevice) => {
          if (isFromOtherDevice) {
            console.log('Cross-device update received from another active device. Merging state...');
            const merged = mergeLocalAndCloudState(appStateRef.current, remoteState);
            merged.deviceClientId = getDeviceClientId();
            isRemoteUpdateRef.current = true;
            setAppState(merged);
            saveAppState(merged);
            setLastCloudSyncTime(new Date().toISOString());
            setCloudSyncStatus('synced');
          }
        },
        (err) => {
          console.error('Real-time subscription error:', err);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // 2. Immediate Local Persistence & Fast Cloud Synchronization
  useEffect(() => {
    // Save to local storage synchronously on every state transition
    saveAppState(appState);

    // If this update was applied from a remote device's push, don't echo it back to Firestore
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (currentUser && isInitialCloudLoadDone.current) {
      setCloudSyncStatus('saving');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const stateToSave = {
            ...appState,
            updatedAt: appState.updatedAt || Date.now(),
            deviceClientId: getDeviceClientId(),
          };
          await saveStateToFirestore(currentUser.uid, stateToSave);
          setLastCloudSyncTime(new Date().toISOString());
          setCloudSyncStatus('synced');
        } catch (err) {
          console.error('Cloud auto-save failed:', err);
          setCloudSyncStatus('error');
        }
      }, 300);
    }
  }, [appState, currentUser]);

  // 3. Flush pending cloud saves on tab close or page hide
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAppState(appStateRef.current);
      if (currentUser) {
        saveStateToFirestore(currentUser.uid, appStateRef.current).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveAppState(appStateRef.current);
        if (currentUser) {
          saveStateToFirestore(currentUser.uid, appStateRef.current).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Cloud action handlers (works for both Google user and seamless guest console backup)
  const handleManualCloudSync = useCallback(async () => {
    try {
      const targetUserId = currentUser?.uid || 'guest_' + getDeviceClientId();
      setCloudSyncStatus('saving');
      await saveStateToFirestore(targetUserId, appState);
      setLastCloudSyncTime(new Date().toISOString());
      setCloudSyncStatus('synced');
    } catch (err: any) {
      setCloudSyncStatus('error');
      console.error('Manual cloud sync failed:', err);
      throw err;
    }
  }, [currentUser, appState]);

  const handleRestoreFromCloud = useCallback(async () => {
    try {
      const targetUserId = currentUser?.uid || 'guest_' + getDeviceClientId();
      setCloudSyncStatus('connecting');
      const cloudData = await loadStateFromFirestore(targetUserId);
      if (!cloudData) {
        throw new Error('No cloud backup found on this account/device yet. Push to cloud first!');
      }
      appStateRef.current = cloudData;
      setAppState(cloudData);
      saveAppState(cloudData);
      setLastCloudSyncTime(new Date().toISOString());
      setCloudSyncStatus('synced');
    } catch (err: any) {
      setCloudSyncStatus('error');
      console.error('Restore from cloud failed:', err);
      throw err;
    }
  }, [currentUser]);

  const handleGoogleLogin = useCallback(async () => {
    const user = await loginWithGoogle();
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutFirebaseAuth();
    setCurrentUser(null);
    setCloudSyncStatus('offline');
  }, []);

  // Check if tutorial should open on first launch
  useEffect(() => {
    const hasSeen = localStorage.getItem('pcb01_tutorial_seen');
    if (!hasSeen) {
      setIsTutorialOpen(true);
    }
  }, []);

  const handleCompleteTutorial = () => {
    localStorage.setItem('pcb01_tutorial_seen', 'true');
  };

  // Handlers for Chapter Operations
  const handleOpenQuickLog = (chapterId?: string) => {
    setPreselectedChapterId(chapterId);
    setIsQuickLogOpen(true);
  };

  const handleSaveStudyLog = (
    chapterId: string,
    confidenceRating: number,
    dateStudied: string,
    note?: string,
    sessionType?: StudySessionType,
    completionPercentage?: number,
    pillarsCompleted?: StudyPillars,
    hoursSpent?: number
  ) => {
    const chapter = appState.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const existingLogsCount = appState.studyLogs.filter((l) => l.chapterId === chapterId).length;

    const { updatedChapter, newLog } = applyStudyLogToChapter(
      chapter,
      confidenceRating,
      dateStudied,
      note,
      existingLogsCount,
      appState.settings,
      sessionType || 'progress',
      completionPercentage,
      pillarsCompleted,
      hoursSpent
    );

    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      chapters: prev.chapters.map((c) => (c.id === updatedChapter.id ? updatedChapter : c)),
      studyLogs: [newLog, ...prev.studyLogs],
    }));
  };

  const handleDeleteStudyLog = (logId: string) => {
    const logToDelete = appState.studyLogs.find((l) => l.id === logId);
    if (!logToDelete) return;

    const remainingLogs = appState.studyLogs.filter((l) => l.id !== logId);
    const targetChapter = appState.chapters.find((c) => c.id === logToDelete.chapterId);

    if (targetChapter) {
      const chapterRemainingLogs = remainingLogs.filter((l) => l.chapterId === targetChapter.id);
      const recalculatedChapter = recalculateChapterFromRemainingLogs(
        targetChapter,
        chapterRemainingLogs,
        appState.settings
      );

      setAppState((prev) => ({
        ...prev,
        updatedAt: Date.now(),
        chapters: prev.chapters.map((c) =>
          c.id === recalculatedChapter.id ? recalculatedChapter : c
        ),
        studyLogs: remainingLogs,
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        updatedAt: Date.now(),
        studyLogs: remainingLogs,
      }));
    }
  };

  const handleResetChapterHistory = (chapterId: string) => {
    const targetChapter = appState.chapters.find((c) => c.id === chapterId);
    if (!targetChapter) return;

    const remainingLogs = appState.studyLogs.filter((l) => l.chapterId !== chapterId);
    const resetChapter: Chapter = {
      ...targetChapter,
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

    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      chapters: prev.chapters.map((c) => (c.id === chapterId ? resetChapter : c)),
      studyLogs: remainingLogs,
    }));
  };

  const handleAddChapter = (newChapterData: Omit<Chapter, 'id' | 'createdAt'> & { revisionCount?: number }) => {
    const newChapter: Chapter = {
      ...newChapterData,
      id: `chap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      revisionCount: newChapterData.revisionCount ?? (newChapterData.currentConfidence > 0 ? 1 : 0),
      createdAt: getTodayStr(),
      updatedAt: Date.now(),
    };

    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      chapters: [...prev.chapters, newChapter],
    }));
  };

  const handleToggleArchiveChapter = (chapterId: string) => {
    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      chapters: prev.chapters.map((c) =>
        c.id === chapterId ? { ...c, isArchived: !c.isArchived, updatedAt: Date.now() } : c
      ),
    }));
  };

  const handleQuickRateChapter = (chapterId: string, rating: number) => {
    const chapter = appState.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const isDone =
      chapter.learningStage === 'FIRST_PASS_DONE' ||
      chapter.learningStage === 'IN_REVISION' ||
      (chapter.revisionCount || 0) >= 1 ||
      (chapter.completionPercentage || 0) >= 100;

    // Use 'progress' sessionType so calibrating confidence updates rating & schedule without fabricating an extra revision pass
    const sessionType: StudySessionType = 'progress';
    const compPct = isDone ? 100 : (chapter.completionPercentage || 50);

    handleSaveStudyLog(
      chapterId,
      rating,
      getTodayStr(),
      'Confidence calibrated',
      sessionType,
      compPct
    );
  };

  const handleQuickUpdateStage = (chapterId: string, stage: LearningStage) => {
    const today = getTodayStr();
    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      chapters: prev.chapters.map((c) => {
        if (c.id !== chapterId) return c;
        if (stage === 'FIRST_PASS_DONE') {
          const revCount = Math.max(1, c.revisionCount || 1);
          const conf = c.currentConfidence || 3;
          const gap = calculateNextGap(revCount, conf, prev.settings);
          const started = c.startedDate || today;
          return {
            ...c,
            learningStage: 'FIRST_PASS_DONE',
            completionPercentage: 100,
            startedDate: started,
            firstPassCompletedDate: c.firstPassCompletedDate || today,
            daysTakenToComplete:
              c.daysTakenToComplete || 1,
            revisionCount: revCount,
            currentConfidence: conf,
            lastStudiedDate: today,
            nextRevisionDate: addDaysToDateStr(today, gap),
            updatedAt: Date.now(),
          };
        } else if (stage === 'IN_REVISION') {
          const revCount = Math.max(2, (c.revisionCount || 1) + 1);
          const conf = c.currentConfidence || 3;
          const gap = calculateNextGap(revCount, conf, prev.settings);
          const started = c.startedDate || today;
          return {
            ...c,
            learningStage: 'IN_REVISION',
            completionPercentage: 100,
            startedDate: started,
            firstPassCompletedDate: c.firstPassCompletedDate || today,
            revisionCount: revCount,
            currentConfidence: conf,
            lastStudiedDate: today,
            nextRevisionDate: addDaysToDateStr(today, gap),
            updatedAt: Date.now(),
          };
        } else if (stage === 'NOT_STARTED') {
          return {
            ...c,
            learningStage: 'NOT_STARTED',
            completionPercentage: 0,
            revisionCount: 0,
            currentConfidence: 0,
            lastStudiedDate: undefined,
            startedDate: undefined,
            firstPassCompletedDate: undefined,
            daysTakenToComplete: undefined,
            nextRevisionDate: null,
            totalStudySessions: 0,
            pillars: {
              lectures: false,
              bookReading: false,
              ncertReading: false,
              classNotes: false,
              questionPractice: false,
              anki: false,
            },
            updatedAt: Date.now(),
          };
        } else {
          return {
            ...c,
            learningStage: stage,
            startedDate: c.startedDate || today,
            completionPercentage:
              c.completionPercentage && c.completionPercentage < 100
                ? c.completionPercentage
                : 25,
            nextRevisionDate: null,
            revisionCount: 0,
            updatedAt: Date.now(),
          };
        }
      }),
    }));
  };

  // Handlers for Test Operations
  const handleAddTest = (newTestData: Omit<Test, 'id' | 'createdAt'>) => {
    const newTest: Test = {
      ...newTestData,
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: getTodayStr(),
    };

    const linkedSet = new Set(newTest.linkedChapterIds || []);

    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      tests: [...prev.tests, newTest],
      chapters:
        linkedSet.size > 0
          ? prev.chapters.map((c) =>
              linkedSet.has(c.id) && (!c.targetDeadline || newTest.date < c.targetDeadline)
                ? { ...c, targetDeadline: newTest.date, updatedAt: Date.now() }
                : c
            )
          : prev.chapters,
    }));
  };

  const handleOpenLogScore = (testId?: string) => {
    setPreselectedTestId(testId);
    setIsLogScoreOpen(true);
  };

  const handleSaveTestScore = (scoreData: Omit<TestScore, 'id' | 'timestamp'>) => {
    const newScore: TestScore = {
      ...scoreData,
      id: `score-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
    };

    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      testScores: [newScore, ...prev.testScores.filter((s) => s.testId !== scoreData.testId)],
    }));
  };

  // Bulk Deadlines
  const handleApplyBulkDeadline = (targetTestId: string, chapterIdsToLink: string[]) => {
    const targetTest = appState.tests.find((t) => t.id === targetTestId);
    if (!targetTest) return;

    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      chapters: prev.chapters.map((c) =>
        chapterIdsToLink.includes(c.id)
          ? { ...c, targetDeadline: targetTest.date, updatedAt: Date.now() }
          : c
      ),
      tests: prev.tests.map((t) =>
        t.id === targetTestId
          ? { ...t, linkedChapterIds: Array.from(new Set([...t.linkedChapterIds, ...chapterIdsToLink])) }
          : t
      ),
    }));
  };

  // Settings & Reset
  const handleUpdateSettings = (newSettings: SpacedRepetitionSettings) => {
    const today = getTodayStr();
    setAppState((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      settings: newSettings,
      chapters: prev.chapters.map((c) => {
        const isCompleted =
          c.learningStage === 'FIRST_PASS_DONE' ||
          c.learningStage === 'IN_REVISION' ||
          (c.revisionCount || 0) >= 1 ||
          (c.completionPercentage || 0) >= 100;
        if (!isCompleted) return c;
        const anchorDate = c.lastStudiedDate || c.firstPassCompletedDate || today;
        const nextGap = calculateNextGap(
          Math.max(1, c.revisionCount || 1),
          c.currentConfidence || 3,
          newSettings
        );
        return {
          ...c,
          nextRevisionDate: addDaysToDateStr(anchorDate, nextGap),
          updatedAt: Date.now(),
        };
      }),
    }));
  };

  const handleResetSeedData = () => {
    const seed = resetToSeedData();
    appStateRef.current = seed;
    setAppState(seed);
    const targetUserId = currentUser?.uid || 'guest_' + getDeviceClientId();
    saveStateToFirestore(targetUserId, seed).catch(() => {});
  };

  const handleImportState = (imported: AppState) => {
    appStateRef.current = imported;
    setAppState(imported);
    saveAppState(imported);
    const targetUserId = currentUser?.uid || 'guest_' + getDeviceClientId();
    saveStateToFirestore(targetUserId, imported).catch((err) => {
      console.warn('Background sync of imported state to cloud failed:', err);
    });
  };

  // Generator Roll Trigger
  const handleTriggerDeckRoll = () => {
    setRollSignal((prev) => prev + 1);
  };

  const filteredGeneratorChapters =
    deckSubject === 'All'
      ? appState.chapters
      : appState.chapters.filter((c) => c.subject === deckSubject);

  return (
    <div className="min-h-screen flex flex-col te-dot-grid">
      {/* Top Main Navigation Header */}
      <Header
        chapters={appState.chapters}
        studyLogs={appState.studyLogs}
        tests={appState.tests}
        testScores={appState.testScores}
        pacingSettings={appState.pacingSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenWeeklyAudit={() => setIsWeeklyAuditOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        cloudSyncStatus={cloudSyncStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenMcp={() => setIsMcpOpen(true)}
      />

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* 0. SCREEN NUMBER ZERO: CHAPTER MASTERY MATRIX */}
        {activeTab === 'shadows' && (
          <ShadowArmyMatrix
            chapters={appState.chapters}
            tests={appState.tests}
            studyLogs={appState.studyLogs}
            testScores={appState.testScores}
            onOpenQuickLogForChapter={handleOpenQuickLog}
            onQuickRateChapter={handleQuickRateChapter}
            onQuickUpdateStage={handleQuickUpdateStage}
          />
        )}

        {/* 1. TEST RADAR & HIGH-PRIORITY DAILY FOCUS */}
        {activeTab === 'radar' && (
          <div className="space-y-6">
            <TestRadarFocus
              chapters={appState.chapters}
              tests={appState.tests}
              studyLogs={appState.studyLogs}
              onOpenQuickLogForChapter={handleOpenQuickLog}
              onOpenAddTest={() => setIsAddTestOpen(true)}
              onOpenPrintSchedule={() => setIsPrintScheduleOpen(true)}
              onQuickUpdateStage={handleQuickUpdateStage}
              onNavigateToSyllabus={() => setActiveTab('chapters')}
              onNavigateToTests={() => setActiveTab('tests')}
            />

            <CriticalRiskList
              chapters={appState.chapters}
              tests={appState.tests}
              onOpenQuickLogForChapter={handleOpenQuickLog}
            />
          </div>
        )}

        {/* 2. SYLLABUS CHAPTER LIST & MATRIX */}
        {activeTab === 'chapters' && (
          <ChapterList
            chapters={appState.chapters}
            tests={appState.tests}
            studyLogs={appState.studyLogs}
            onOpenQuickLogForChapter={handleOpenQuickLog}
            onOpenAddChapter={() => setIsAddChapterOpen(true)}
            onOpenBulkDeadline={() => setIsBulkDeadlineOpen(true)}
            onToggleArchiveChapter={handleToggleArchiveChapter}
            onQuickRateChapter={handleQuickRateChapter}
            onQuickUpdateStage={handleQuickUpdateStage}
            onDeleteStudyLog={handleDeleteStudyLog}
            onResetChapterHistory={handleResetChapterHistory}
          />
        )}

        {/* 3. TEST & EXAM MANAGER */}
        {activeTab === 'tests' && (
          <TestManager
            tests={appState.tests}
            chapters={appState.chapters}
            testScores={appState.testScores}
            onOpenAddTest={() => setIsAddTestOpen(true)}
            onOpenLogScore={handleOpenLogScore}
            onOpenQuickLog={handleOpenQuickLog}
            onOpenPrintSchedule={() => setIsPrintScheduleOpen(true)}
          />
        )}

        {/* 4. CHAPTER PRACTICE GENERATOR & ANALOG STUDY CONSOLE */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            <HardwareDeck
              chapters={appState.chapters}
              tests={appState.tests}
              currentMode={deckMode}
              onModeChange={setDeckMode}
              selectedSubject={deckSubject}
              onSubjectChange={setDeckSubject}
              onTriggerRoll={handleTriggerDeckRoll}
              onOpenQuickLog={() => handleOpenQuickLog()}
              onOpenAddChapter={() => setIsAddChapterOpen(true)}
              onOpenAddTest={() => setIsAddTestOpen(true)}
            />

            <ChapterSelectionGenerator
              chapters={filteredGeneratorChapters}
              tests={appState.tests}
              mode={deckMode}
              onModeChange={setDeckMode}
              onOpenQuickLogForChapter={handleOpenQuickLog}
              rollSignal={rollSignal}
            />
          </div>
        )}

        {/* 5. STRATEGIC FLIGHT HUB & FORENSICS (PACING, DECAY ENGINE, ERROR TAXONOMY, AUDIT) */}
        {activeTab === 'strategy' && (
          <StrategicFlightHub
            chapters={appState.chapters}
            studyLogs={appState.studyLogs}
            tests={appState.tests}
            testScores={appState.testScores}
            pacingSettings={appState.pacingSettings}
            onUpdatePacingSettings={(settings) =>
              setAppState((prev) => ({ ...prev, pacingSettings: settings, updatedAt: Date.now() }))
            }
            onOpenQuickLogForChapter={handleOpenQuickLog}
          />
        )}

        {/* 6. TELEMETRY & SYLLABUS PILLARS DASHBOARD */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            chapters={appState.chapters}
            studyLogs={appState.studyLogs}
            tests={appState.tests}
            testScores={appState.testScores}
            pacingSettings={appState.pacingSettings}
            onUpdatePacingSettings={(settings) =>
              setAppState((prev) => ({ ...prev, pacingSettings: settings, updatedAt: Date.now() }))
            }
            onOpenQuickLogForChapter={handleOpenQuickLog}
            onNavigateToStrategy={() => setActiveTab('strategy')}
          />
        )}
      </main>

      {/* Industrial Hardware Chassis Bottom Bar */}
      <footer className="mt-auto border-t-2 border-[#141416] bg-[#ECEAE4] text-[#55534D] text-xs py-3 px-4 font-mono select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#141416]">PCB-01</span>
            <span>•</span>
            <span>NEET UG Spaced Repetition Engine v2.5</span>
            <span>•</span>
            <span className="text-[#FF3B00] font-bold">Physics • Chemistry • Botany • Zoology</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[#141416] hover:underline font-bold cursor-pointer"
            >
              Methodology & Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isQuickLogOpen && (
        <QuickLogModal
          isOpen={isQuickLogOpen}
          onClose={() => {
            setIsQuickLogOpen(false);
            setPreselectedChapterId(undefined);
          }}
          chapters={appState.chapters}
          preselectedChapterId={preselectedChapterId}
          settings={appState.settings}
          onSaveLog={handleSaveStudyLog}
        />
      )}

      {isAddChapterOpen && (
        <QuickAddChapterModal
          isOpen={isAddChapterOpen}
          onClose={() => setIsAddChapterOpen(false)}
          onAddChapter={handleAddChapter}
          onAdd={handleAddChapter}
        />
      )}

      {isAddTestOpen && (
        <QuickAddTestModal
          isOpen={isAddTestOpen}
          onClose={() => setIsAddTestOpen(false)}
          chapters={appState.chapters}
          existingTests={appState.tests}
          onAddTest={handleAddTest}
          onAdd={handleAddTest}
        />
      )}

      {isLogScoreOpen && (
        <LogScoreModal
          isOpen={isLogScoreOpen}
          onClose={() => {
            setIsLogScoreOpen(false);
            setPreselectedTestId(undefined);
          }}
          tests={appState.tests}
          testScores={appState.testScores}
          preselectedTestId={preselectedTestId}
          onSaveScore={handleSaveTestScore}
        />
      )}

      {isBulkDeadlineOpen && (
        <BulkDeadlineModal
          isOpen={isBulkDeadlineOpen}
          onClose={() => setIsBulkDeadlineOpen(false)}
          chapters={appState.chapters}
          tests={appState.tests}
          onApplyBulkDeadline={handleApplyBulkDeadline}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          appState={appState}
          onUpdateSettings={handleUpdateSettings}
          onResetSeedData={handleResetSeedData}
          onImportState={handleImportState}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          currentUser={currentUser}
          cloudSyncStatus={cloudSyncStatus}
          lastCloudSyncTime={lastCloudSyncTime}
          onManualCloudSync={handleManualCloudSync}
          onRestoreFromCloud={handleRestoreFromCloud}
          onGoogleLogin={handleGoogleLogin}
          onLogout={handleLogout}
          theme={theme}
          onSetTheme={(t) => setTheme(t)}
          font={font}
          onSetFont={(f) => setFont(f)}
        />
      )}

      {isTutorialOpen && (
        <TutorialModal
          isOpen={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
          onComplete={handleCompleteTutorial}
        />
      )}

      {isWeeklyAuditOpen && (
        <WeeklyAuditModal
          isOpen={isWeeklyAuditOpen}
          onClose={() => setIsWeeklyAuditOpen(false)}
          chapters={appState.chapters}
          studyLogs={appState.studyLogs}
          tests={appState.tests}
          testScores={appState.testScores}
          pacingSettings={appState.pacingSettings}
          onOpenQuickLogForChapter={handleOpenQuickLog}
          onOpenLogScoreForTest={(testId) => {
            setIsWeeklyAuditOpen(false);
            setPreselectedTestId(testId);
            setIsLogScoreOpen(true);
          }}
        />
      )}

      {isPrintScheduleOpen && (
        <TestSchedulePrintModal
          isOpen={isPrintScheduleOpen}
          onClose={() => setIsPrintScheduleOpen(false)}
          tests={appState.tests}
          chapters={appState.chapters}
          testScores={appState.testScores}
          studentName={currentUser?.displayName || 'NEET UG ASPIRANT'}
        />
      )}

      {isMcpOpen && (
        <McpModal
          isOpen={isMcpOpen}
          onClose={() => setIsMcpOpen(false)}
          appState={appState}
          onStateRefresh={refreshStateFromServer}
        />
      )}
    </div>
  );
}
