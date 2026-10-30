import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { AppState, Chapter, StudyLog, Test, TestScore } from '../types';
import { DEFAULT_PACING_SETTINGS, DEFAULT_SETTINGS, INITIAL_CHAPTERS, INITIAL_STUDY_LOGS, INITIAL_TESTS, INITIAL_TEST_SCORES } from '../data/seedData';
import firebaseConfigJson from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export type CloudSyncStatus = 'offline' | 'connecting' | 'synced' | 'saving' | 'error';

/**
 * Get or create a unique client device ID for multi-device cross-sync disambiguation.
 */
export function getDeviceClientId(): string {
  try {
    let id = localStorage.getItem('pcb01_device_client_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      localStorage.setItem('pcb01_device_client_id', id);
    }
    return id;
  } catch {
    return 'dev_' + Math.random().toString(36).substring(2, 10);
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  if (app) return app;
  try {
    if (!firebaseConfigJson || !firebaseConfigJson.apiKey) {
      console.warn('Firebase config missing or invalid');
      return null;
    }
    const apps = getApps();
    if (apps.length > 0) {
      app = apps[0];
    } else {
      app = initializeApp({
        apiKey: firebaseConfigJson.apiKey,
        authDomain: firebaseConfigJson.authDomain,
        projectId: firebaseConfigJson.projectId,
        storageBucket: firebaseConfigJson.storageBucket,
        messagingSenderId: firebaseConfigJson.messagingSenderId,
        appId: firebaseConfigJson.appId,
      });
    }
    return app;
  } catch (err) {
    console.error('Failed to initialize Firebase App:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const currentApp = getFirebaseApp();
  if (!currentApp) return null;
  try {
    auth = getAuth(currentApp);
    return auth;
  } catch (err) {
    console.error('Failed to initialize Firebase Auth:', err);
    return null;
  }
}

export function getFirebaseDb(): Firestore | null {
  if (db) return db;
  const currentApp = getFirebaseApp();
  if (!currentApp) return null;
  try {
    const databaseId = firebaseConfigJson.firestoreDatabaseId;
    if (databaseId) {
      db = getFirestore(currentApp, databaseId);
    } else {
      db = getFirestore(currentApp);
    }
    return db;
  } catch (err) {
    console.error('Failed to initialize Firestore:', err);
    return null;
  }
}

/**
 * Initialize anonymous session automatically or listen to current user
 */
export function initAuthListener(onUserChanged: (user: User | null) => void): () => void {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    onUserChanged(null);
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
    if (user) {
      onUserChanged(user);
    } else {
      // Auto sign-in anonymously for instant cloud persistence
      try {
        const cred = await signInAnonymously(currentAuth);
        onUserChanged(cred.user);
      } catch (err) {
        console.warn('Anonymous sign-in failed, running in local-only fallback:', err);
        onUserChanged(null);
      }
    }
  });

  return unsubscribe;
}

export async function loginWithGoogle(): Promise<User | null> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) throw new Error('Firebase Auth is not available');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(currentAuth, provider);
  return result.user;
}

export async function logoutFirebaseAuth(): Promise<void> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) return;
  await signOut(currentAuth);
}

/**
 * Recursively removes all undefined properties and transforms any undefined values
 * into null or omits them, ensuring strict compatibility with Firestore JSON serialization.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized as T;
}

/**
 * Parse raw Firestore data into a clean, complete AppState object
 */
export function parseFirestoreState(data: any): AppState {
  return {
    chapters: Array.isArray(data.chapters)
      ? data.chapters.map((ch: any) => ({
          ...ch,
          id: ch.id || '',
          name: ch.name || '',
          subject: ch.subject || 'Physics',
          clusterId: Number(ch.clusterId) || 1,
          clusterName: ch.clusterName || '',
          classLevel: ch.classLevel === '12' ? '12' : '11',
          learningStage:
            ch.learningStage ||
            (Number(ch.completionPercentage) >= 100
              ? 'FIRST_PASS_DONE'
              : Number(ch.completionPercentage) > 0
              ? 'IN_PROGRESS'
              : 'NOT_STARTED'),
          completionPercentage: Math.max(0, Math.min(100, Number(ch.completionPercentage) || 0)),
          pillars: ch.pillars
            ? {
                lectures: !!ch.pillars.lectures,
                bookReading: !!(ch.pillars.bookReading || ch.pillars.ncertReading),
                ncertReading: !!(ch.pillars.bookReading || ch.pillars.ncertReading),
                classNotes: !!ch.pillars.classNotes,
                questionPractice: !!ch.pillars.questionPractice,
                anki: !!ch.pillars.anki,
              }
            : {
                lectures: false,
                bookReading: false,
                ncertReading: false,
                classNotes: false,
                questionPractice: false,
                anki: false,
              },
          startedDate: ch.startedDate || null,
          firstPassCompletedDate: ch.firstPassCompletedDate || null,
          daysTakenToComplete:
            ch.daysTakenToComplete !== undefined && ch.daysTakenToComplete !== null
              ? Number(ch.daysTakenToComplete)
              : null,
          targetDeadline: ch.targetDeadline || null,
          updatedAt: Number(ch.updatedAt) || (ch.lastStudiedDate ? new Date(ch.lastStudiedDate).getTime() : 0),
          totalStudySessions: Number(ch.totalStudySessions) || 0,
          currentConfidence: Number(ch.currentConfidence) || 0,
          lastStudiedDate: ch.lastStudiedDate || null,
          nextRevisionDate: ch.nextRevisionDate || null,
          revisionCount: Number(ch.revisionCount) || 0,
          isArchived: !!ch.isArchived,
          notes: ch.notes || '',
          createdAt: ch.createdAt || new Date().toISOString(),
        }))
      : INITIAL_CHAPTERS,
    studyLogs: Array.isArray(data.studyLogs) ? data.studyLogs : INITIAL_STUDY_LOGS,
    tests: Array.isArray(data.tests) ? data.tests : INITIAL_TESTS,
    testScores: Array.isArray(data.testScores) ? data.testScores : INITIAL_TEST_SCORES,
    actionHistory: Array.isArray(data.actionHistory) ? data.actionHistory : [],
    settings: data.settings || DEFAULT_SETTINGS,
    pacingSettings: data.pacingSettings || DEFAULT_PACING_SETTINGS,
    tutorialCompleted: !!data.tutorialCompleted,
    updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt).getTime() : Number(data.updatedAt) || Date.now(),
    deviceClientId: data.deviceClientId || '',
  };
}

/**
 * Intelligent merger that combines local state and cloud state without losing any user progress.
 */
export function mergeLocalAndCloudState(local: AppState, cloud: AppState): AppState {
  if (!cloud || !Array.isArray(cloud.chapters) || cloud.chapters.length === 0) {
    return local;
  }
  if (!local || !Array.isArray(local.chapters) || local.chapters.length === 0) {
    return cloud;
  }

  // 1. Merge study logs (union by ID, sorted newest timestamp first)
  const logMap = new Map<string, StudyLog>();
  for (const log of cloud.studyLogs || []) {
    if (log && log.id) logMap.set(log.id, log);
  }
  for (const log of local.studyLogs || []) {
    if (log && log.id) logMap.set(log.id, log);
  }
  const mergedStudyLogs = Array.from(logMap.values()).sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  // 2. Merge tests (union by ID, merging linkedChapterIds)
  const testMap = new Map<string, Test>();
  for (const t of cloud.tests || []) {
    if (t && t.id) testMap.set(t.id, t);
  }
  for (const t of local.tests || []) {
    if (t && t.id) {
      const existing = testMap.get(t.id);
      if (existing) {
        const mergedLinkedChapters = Array.from(
          new Set([...(existing.linkedChapterIds || []), ...(t.linkedChapterIds || [])])
        );
        testMap.set(t.id, { ...existing, ...t, linkedChapterIds: mergedLinkedChapters });
      } else {
        testMap.set(t.id, t);
      }
    }
  }
  const mergedTests = Array.from(testMap.values());

  // 3. Merge test scores (union by ID, newest first)
  const scoreMap = new Map<string, TestScore>();
  for (const s of cloud.testScores || []) {
    if (s && s.id) scoreMap.set(s.id, s);
  }
  for (const s of local.testScores || []) {
    if (s && s.id) scoreMap.set(s.id, s);
  }
  const mergedTestScores = Array.from(scoreMap.values()).sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  // 4. Merge chapters across the complete union of IDs to prevent missing chapters
  const allChapterIds = Array.from(
    new Set([
      ...local.chapters.map((c) => c.id),
      ...cloud.chapters.map((c) => c.id),
    ])
  );

  const localMap = new Map(local.chapters.map((c) => [c.id, c]));
  const cloudMap = new Map(cloud.chapters.map((c) => [c.id, c]));

  const mergedChapters: Chapter[] = allChapterIds.map((id) => {
    const localCh = localMap.get(id);
    const cloudCh = cloudMap.get(id);

    if (!localCh && cloudCh) return cloudCh;
    if (localCh && !cloudCh) return localCh;
    if (!localCh && !cloudCh) return INITIAL_CHAPTERS[0];

    const localUpdatedAt = Number(localCh.updatedAt) || 0;
    const cloudUpdatedAt = Number(cloudCh.updatedAt) || 0;

    let base: Chapter;
    let other: Chapter;

    if (localUpdatedAt > 0 && cloudUpdatedAt > 0 && localUpdatedAt !== cloudUpdatedAt) {
      base = cloudUpdatedAt > localUpdatedAt ? cloudCh : localCh;
      other = base === cloudCh ? localCh : cloudCh;
    } else {
      const localProgressScore =
        (localCh.revisionCount || 0) * 100 +
        (localCh.completionPercentage || 0) +
        (localCh.totalStudySessions || 0) * 10;
      const cloudProgressScore =
        (cloudCh.revisionCount || 0) * 100 +
        (cloudCh.completionPercentage || 0) +
        (cloudCh.totalStudySessions || 0) * 10;

      // On tie, favor cloud so stale local browsers don't wipe active devices
      base = cloudProgressScore >= localProgressScore ? cloudCh : localCh;
      other = base === cloudCh ? localCh : cloudCh;
    }

    // Merge pillars (keep completed if either side marked it)
    const mergedPillars = {
      lectures: !!(base.pillars?.lectures || other.pillars?.lectures),
      bookReading: !!(base.pillars?.bookReading || other.pillars?.bookReading || base.pillars?.ncertReading || other.pillars?.ncertReading),
      ncertReading: !!(base.pillars?.bookReading || other.pillars?.bookReading || base.pillars?.ncertReading || other.pillars?.ncertReading),
      classNotes: !!(base.pillars?.classNotes || other.pillars?.classNotes),
      questionPractice: !!(base.pillars?.questionPractice || other.pillars?.questionPractice),
      anki: !!(base.pillars?.anki || other.pillars?.anki),
    };

    // CRITICAL: Preserve milestone dates if either device has recorded them
    const finalFirstPassCompletedDate =
      base.firstPassCompletedDate || other.firstPassCompletedDate || null;
    const finalStartedDate =
      base.startedDate || other.startedDate || null;
    const finalDaysTaken =
      base.daysTakenToComplete !== undefined && base.daysTakenToComplete !== null
        ? base.daysTakenToComplete
        : other.daysTakenToComplete !== undefined && other.daysTakenToComplete !== null
        ? other.daysTakenToComplete
        : null;
    const finalTargetDeadline =
      base.targetDeadline || other.targetDeadline || null;
    const finalNotes = base.notes || other.notes || '';

    const finalLastStudiedDate =
      base.lastStudiedDate && other.lastStudiedDate
        ? base.lastStudiedDate > other.lastStudiedDate
          ? base.lastStudiedDate
          : other.lastStudiedDate
        : base.lastStudiedDate || other.lastStudiedDate || null;

    return {
      ...base,
      pillars: mergedPillars,
      startedDate: finalStartedDate,
      firstPassCompletedDate: finalFirstPassCompletedDate,
      daysTakenToComplete: finalDaysTaken,
      targetDeadline: finalTargetDeadline,
      notes: finalNotes,
      lastStudiedDate: finalLastStudiedDate,
      updatedAt: Math.max(localUpdatedAt, cloudUpdatedAt),
    };
  });

  const isCloudNewer = (cloud.updatedAt || 0) >= (local.updatedAt || 0);

  return {
    chapters: mergedChapters,
    studyLogs: mergedStudyLogs,
    tests: mergedTests,
    testScores: mergedTestScores,
    actionHistory: isCloudNewer
      ? cloud.actionHistory || local.actionHistory || []
      : local.actionHistory || cloud.actionHistory || [],
    settings: isCloudNewer ? (cloud.settings || local.settings || DEFAULT_SETTINGS) : (local.settings || cloud.settings || DEFAULT_SETTINGS),
    pacingSettings: isCloudNewer ? (cloud.pacingSettings || local.pacingSettings || DEFAULT_PACING_SETTINGS) : (local.pacingSettings || cloud.pacingSettings || DEFAULT_PACING_SETTINGS),
    tutorialCompleted: !!(local.tutorialCompleted || cloud.tutorialCompleted),
    updatedAt: Math.max(local.updatedAt || 0, cloud.updatedAt || 0, Date.now()),
  };
}

/**
 * Save complete application state to user's Firestore cloud document
 */
export async function saveStateToFirestore(userId: string, state: AppState): Promise<void> {
  const firestore = getFirebaseDb();
  if (!firestore) throw new Error('Cloud Firestore database not connected');
  if (!userId) throw new Error('User identity missing for cloud backup');

  const docRef = doc(firestore, 'users', userId, 'consoleData', 'state');
  const clientDeviceId = state.deviceClientId || getDeviceClientId();
  const currentTimestamp = Date.now();
  
  // Clean state to ensure JSON serializable without any undefined values
  const payload = {
    userId,
    updatedAt: state.updatedAt || currentTimestamp,
    updatedAtIso: new Date(state.updatedAt || currentTimestamp).toISOString(),
    deviceClientId: clientDeviceId,
    chapters: (state.chapters || []).map((ch) => ({
      id: ch.id || '',
      name: ch.name || '',
      subject: ch.subject || 'Physics',
      clusterId: Number(ch.clusterId) || 1,
      clusterName: ch.clusterName || '',
      classLevel: ch.classLevel === '12' ? '12' : '11',
      learningStage:
        ch.learningStage ||
        (Number(ch.completionPercentage) >= 100
          ? 'FIRST_PASS_DONE'
          : Number(ch.completionPercentage) > 0
          ? 'IN_PROGRESS'
          : 'NOT_STARTED'),
      completionPercentage: Math.max(0, Math.min(100, Number(ch.completionPercentage) || 0)),
      pillars: {
        lectures: !!ch.pillars?.lectures,
        bookReading: !!(ch.pillars?.bookReading || ch.pillars?.ncertReading),
        ncertReading: !!(ch.pillars?.bookReading || ch.pillars?.ncertReading),
        classNotes: !!ch.pillars?.classNotes,
        questionPractice: !!ch.pillars?.questionPractice,
        anki: !!ch.pillars?.anki,
      },
      startedDate: ch.startedDate || null,
      firstPassCompletedDate: ch.firstPassCompletedDate || null,
      daysTakenToComplete:
        ch.daysTakenToComplete !== undefined && ch.daysTakenToComplete !== null
          ? Number(ch.daysTakenToComplete)
          : null,
      targetDeadline: ch.targetDeadline || null,
      updatedAt: Number(ch.updatedAt) || 0,
      totalStudySessions: Number(ch.totalStudySessions) || 0,
      currentConfidence: Number(ch.currentConfidence) || 0,
      lastStudiedDate: ch.lastStudiedDate || null,
      nextRevisionDate: ch.nextRevisionDate || null,
      revisionCount: Number(ch.revisionCount) || 0,
      isArchived: !!ch.isArchived,
      notes: ch.notes || '',
      createdAt: ch.createdAt || new Date().toISOString(),
    })),
    studyLogs: (state.studyLogs || []).map((l) => ({
      id: l.id || `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      chapterId: l.chapterId || '',
      chapterName: l.chapterName || '',
      subject: l.subject || 'Physics',
      dateStudied: l.dateStudied || new Date().toISOString().split('T')[0],
      sessionType: l.sessionType || 'progress',
      completionPercentage:
        l.completionPercentage !== undefined && l.completionPercentage !== null
          ? Number(l.completionPercentage)
          : null,
      pillarsCompleted: l.pillarsCompleted
        ? {
            lectures: !!l.pillarsCompleted.lectures,
            bookReading: !!(l.pillarsCompleted.bookReading || l.pillarsCompleted.ncertReading),
            ncertReading: !!(l.pillarsCompleted.bookReading || l.pillarsCompleted.ncertReading),
            classNotes: !!l.pillarsCompleted.classNotes,
            questionPractice: !!l.pillarsCompleted.questionPractice,
            anki: !!l.pillarsCompleted.anki,
          }
        : null,
      hoursSpent: l.hoursSpent !== undefined && l.hoursSpent !== null ? Number(l.hoursSpent) : null,
      confidenceRating: Number(l.confidenceRating) || 3,
      revisionNumber: Number(l.revisionNumber) || 0,
      note: l.note || '',
      timestamp: Number(l.timestamp) || Date.now(),
    })),
    tests: (state.tests || []).map((t) => ({
      id: t.id || `test-${Date.now()}`,
      name: t.name || 'Mock Test',
      coachingName: t.coachingName || '',
      date: t.date || new Date().toISOString().split('T')[0],
      subjectOrScope: t.subjectOrScope || 'Full Syllabus',
      linkedChapterIds: Array.isArray(t.linkedChapterIds) ? t.linkedChapterIds : [],
      totalMarks: Number(t.totalMarks) || 720,
      createdAt: t.createdAt || new Date().toISOString(),
    })),
    testScores: (state.testScores || []).map((s) => ({
      id: s.id || `score-${Date.now()}`,
      testId: s.testId || '',
      testName: s.testName || '',
      dateRecorded: s.dateRecorded || new Date().toISOString().split('T')[0],
      totalScore: Number(s.totalScore) || 0,
      maxScore: Number(s.maxScore) || 720,
      totalQuestions:
        s.totalQuestions !== undefined && s.totalQuestions !== null ? Number(s.totalQuestions) : null,
      correctQuestions:
        s.correctQuestions !== undefined && s.correctQuestions !== null
          ? Number(s.correctQuestions)
          : null,
      incorrectQuestions:
        s.incorrectQuestions !== undefined && s.incorrectQuestions !== null
          ? Number(s.incorrectQuestions)
          : null,
      unattemptedQuestions:
        s.unattemptedQuestions !== undefined && s.unattemptedQuestions !== null
          ? Number(s.unattemptedQuestions)
          : null,
      errors: s.errors
        ? {
            sillyMistakes: Number(s.errors.sillyMistakes) || 0,
            conceptualGaps: Number(s.errors.conceptualGaps) || 0,
            memoryRecall: Number(s.errors.memoryRecall) || 0,
            timePressure: Number(s.errors.timePressure) || 0,
            guessingWild: Number(s.errors.guessingWild) || 0,
            bySubject: s.errors.bySubject || {},
            notes: s.errors.notes || '',
          }
        : null,
      subjectScores: s.subjectScores || {},
      subjectQuestions: s.subjectQuestions || {},
      notes: s.notes || '',
      timestamp: Number(s.timestamp) || Date.now(),
    })),
    settings: {
      defaultGaps: state.settings?.defaultGaps || [3, 7, 14, 30],
      confidenceMultipliers: state.settings?.confidenceMultipliers || {
        1: 0.5,
        2: 0.5,
        3: 1.0,
        4: 1.5,
        5: 1.5,
      },
    },
    pacingSettings: {
      targetSyllabusDate: state.pacingSettings?.targetSyllabusDate || DEFAULT_PACING_SETTINGS.targetSyllabusDate,
      targetExamDate: state.pacingSettings?.targetExamDate || DEFAULT_PACING_SETTINGS.targetExamDate,
      targetRevisionPasses: Number(state.pacingSettings?.targetRevisionPasses) || DEFAULT_PACING_SETTINGS.targetRevisionPasses,
      targetMockTestsCount: Number(state.pacingSettings?.targetMockTestsCount) || DEFAULT_PACING_SETTINGS.targetMockTestsCount,
      includeAllTestsGoal: state.pacingSettings?.includeAllTestsGoal !== false,
      studyDaysPerWeek: Number(state.pacingSettings?.studyDaysPerWeek) || DEFAULT_PACING_SETTINGS.studyDaysPerWeek,
    },
    actionHistory: Array.isArray(state.actionHistory) ? state.actionHistory.slice(0, 50) : [],
    tutorialCompleted: !!state.tutorialCompleted,
  };

  const cleanPayload = sanitizeForFirestore(payload);
  
  // Primary save: users/{userId}/consoleData/state
  await setDoc(docRef, cleanPayload, { merge: true });

  // Secondary redundant backup: cloudBackups/{userId} for instant multi-device / fallback retrieval
  try {
    const backupDocRef = doc(firestore, 'cloudBackups', userId);
    await setDoc(backupDocRef, cleanPayload, { merge: true });
    // If guest, also maintain latest guest backup pointer
    if (userId.startsWith('guest_')) {
      const guestGlobalRef = doc(firestore, 'cloudBackups', 'guest_latest');
      await setDoc(guestGlobalRef, cleanPayload, { merge: true });
    }
  } catch (backupErr) {
    console.warn('Redundant cloud backup copy non-fatal warning:', backupErr);
  }
}

/**
 * Fetch state from user's Firestore cloud document with multi-point fallback
 */
export async function loadStateFromFirestore(userId: string): Promise<AppState | null> {
  const firestore = getFirebaseDb();
  if (!firestore) throw new Error('Cloud Firestore database not connected');
  if (!userId) throw new Error('User identifier missing for cloud restore');

  try {
    // 1. Try primary user path: users/{userId}/consoleData/state
    const docRef = doc(firestore, 'users', userId, 'consoleData', 'state');
    let snap = await getDoc(docRef);

    // 2. If not found, try backup collection: cloudBackups/{userId}
    if (!snap.exists()) {
      const backupRef = doc(firestore, 'cloudBackups', userId);
      snap = await getDoc(backupRef);
    }

    // 3. If guest and still not found, try global guest backup: cloudBackups/guest_latest
    if (!snap.exists() && userId.startsWith('guest_')) {
      const guestGlobalRef = doc(firestore, 'cloudBackups', 'guest_latest');
      snap = await getDoc(guestGlobalRef);
    }

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    if (!data || !Array.isArray(data.chapters) || data.chapters.length === 0) {
      return null;
    }

    return parseFirestoreState(data);
  } catch (err: any) {
    console.error('Failed to load state from Firestore:', err);
    throw new Error(err?.message || 'Failed to read data from cloud database');
  }
}

/**
 * Real-time subscription to cloud state for instant multi-device synchronization.
 * Notifies when changes are committed from another device.
 */
export function subscribeToStateFromFirestore(
  userId: string,
  onRemoteStateChange: (remoteState: AppState, isFromOtherDevice: boolean) => void,
  onError?: (err: any) => void
): () => void {
  const firestore = getFirebaseDb();
  if (!firestore || !userId) return () => {};

  const docRef = doc(firestore, 'users', userId, 'consoleData', 'state');
  const myDeviceId = getDeviceClientId();

  const unsubscribe = onSnapshot(
    docRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      // If local pending writes are occurring, do not treat our own local echo as a remote update
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }
      if (!snapshot.exists()) {
        return;
      }
      const data = snapshot.data();
      if (!data || !Array.isArray(data.chapters) || data.chapters.length === 0) {
        return;
      }

      const remoteState = parseFirestoreState(data);
      const isFromOtherDevice = !!data.deviceClientId && data.deviceClientId !== myDeviceId;
      onRemoteStateChange(remoteState, isFromOtherDevice);
    },
    (err) => {
      console.error('Real-time Firestore sync error:', err);
      if (onError) onError(err);
    }
  );

  return unsubscribe;
}
