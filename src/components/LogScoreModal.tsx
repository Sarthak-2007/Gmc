import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Award,
  Check,
  TrendingUp,
  AlertOctagon,
  HelpCircle,
  Flame,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Layers,
  Calculator,
  Edit3,
} from 'lucide-react';
import {
  ErrorBreakdown,
  Subject,
  SubjectErrorBreakdown,
  SubjectQuestionCount,
  Test,
  TestScore,
} from '../types';
import { getTodayStr } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';

interface LogScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: Test[];
  testScores?: TestScore[];
  preselectedTestId?: string;
  onSaveScore: (score: Omit<TestScore, 'id' | 'timestamp'>) => void;
}

const SUBJECTS: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

const SUBJECT_COLORS: Record<Subject, { text: string; bg: string; border: string }> = {
  Physics: { text: 'text-[#0047FF]', bg: 'bg-[#0047FF]/10', border: 'border-[#0047FF]' },
  Chemistry: { text: 'text-[#9333EA]', bg: 'bg-[#9333EA]/10', border: 'border-[#9333EA]' },
  Botany: { text: 'text-[#D97706]', bg: 'bg-[#FFB800]/15', border: 'border-[#FFB800]' },
  Zoology: { text: 'text-[#EA580C]', bg: 'bg-[#EA580C]/10', border: 'border-[#EA580C]' },
};

export const LogScoreModal: React.FC<LogScoreModalProps> = ({
  isOpen,
  onClose,
  tests,
  testScores = [],
  preselectedTestId,
  onSaveScore,
}) => {
  const [selectedTestId, setSelectedTestId] = useState<string>(
    preselectedTestId || (tests.length > 0 ? tests[0].id : '')
  );
  const [dateRecorded, setDateRecorded] = useState<string>(getTodayStr());
  const [entryMode, setEntryMode] = useState<'SUBJECT_WISE' | 'QUICK_TOTAL'>('SUBJECT_WISE');
  const [activeSubjectTab, setActiveSubjectTab] = useState<Subject>('Physics');

  // Subject-wise question counts and scores
  const [subjectData, setSubjectData] = useState<
    Record<
      Subject,
      {
        score: number | '';
        correct: number | '';
        incorrect: number | '';
        unattempted: number | '';
        errors: SubjectErrorBreakdown;
      }
    >
  >({
    Physics: { score: 140, correct: 36, incorrect: 4, unattempted: 5, errors: { sillyMistakes: 1, conceptualGaps: 2, memoryRecall: 0, timePressure: 1, guessingWild: 0 } },
    Chemistry: { score: 145, correct: 37, incorrect: 3, unattempted: 5, errors: { sillyMistakes: 1, conceptualGaps: 1, memoryRecall: 1, timePressure: 0, guessingWild: 0 } },
    Botany: { score: 155, correct: 39, incorrect: 1, unattempted: 5, errors: { sillyMistakes: 0, conceptualGaps: 0, memoryRecall: 1, timePressure: 0, guessingWild: 0 } },
    Zoology: { score: 150, correct: 38, incorrect: 2, unattempted: 5, errors: { sillyMistakes: 1, conceptualGaps: 0, memoryRecall: 1, timePressure: 0, guessingWild: 0 } },
  });

  // Global / Quick Total override states
  const [quickTotalScore, setQuickTotalScore] = useState<number>(590);
  const [quickCorrect, setQuickCorrect] = useState<number | ''>(150);
  const [quickIncorrect, setQuickIncorrect] = useState<number | ''>(10);
  const [quickUnattempted, setQuickUnattempted] = useState<number | ''>(20);

  // Global Error classification
  const [globalErrors, setGlobalErrors] = useState<SubjectErrorBreakdown>({
    sillyMistakes: 3,
    conceptualGaps: 3,
    memoryRecall: 3,
    timePressure: 1,
    guessingWild: 0,
  });

  const [notes, setNotes] = useState<string>('');
  const [errorNotes, setErrorNotes] = useState<string>('');

  const selectedTest = useMemo(() => tests.find((t) => t.id === selectedTestId), [tests, selectedTestId]);
  const maxMarks = selectedTest?.totalMarks || 720;

  // Sync existing score when test or modal changes
  useEffect(() => {
    const targetId = preselectedTestId || (tests.length > 0 ? tests[0].id : '');
    setSelectedTestId(targetId);

    const existing = testScores.find((s) => s.testId === targetId);
    if (existing) {
      setDateRecorded(existing.dateRecorded || getTodayStr());
      setQuickTotalScore(existing.totalScore);
      setNotes(existing.notes || '');

      const subScores = existing.subjectScores || {};
      const subQuestions = existing.subjectQuestions || {};
      const bySubErrors = existing.errors?.bySubject || {};

      const nextData: any = {};
      SUBJECTS.forEach((sub) => {
        const sq = subQuestions[sub] || {};
        const scoreVal = subScores[sub] ?? (sq.score ?? '');
        const cor = sq.correct ?? (scoreVal !== '' ? Math.max(0, Math.floor((Number(scoreVal) + 5) / 4)) : '');
        const incor = sq.incorrect ?? (scoreVal !== '' ? 2 : '');
        const unatt = sq.unattempted ?? '';
        const errs = bySubErrors[sub] || { sillyMistakes: 0, conceptualGaps: 0, memoryRecall: 0, timePressure: 0, guessingWild: 0 };

        nextData[sub] = {
          score: scoreVal,
          correct: cor,
          incorrect: incor,
          unattempted: unatt,
          errors: {
            sillyMistakes: errs.sillyMistakes ?? 0,
            conceptualGaps: errs.conceptualGaps ?? 0,
            memoryRecall: errs.memoryRecall ?? 0,
            timePressure: errs.timePressure ?? 0,
            guessingWild: errs.guessingWild ?? 0,
          },
        };
      });
      setSubjectData(nextData);

      setQuickCorrect(existing.correctQuestions ?? '');
      setQuickIncorrect(existing.incorrectQuestions ?? '');
      setQuickUnattempted(existing.unattemptedQuestions ?? '');

      const err = existing.errors || {};
      setGlobalErrors({
        sillyMistakes: err.sillyMistakes ?? 0,
        conceptualGaps: err.conceptualGaps ?? 0,
        memoryRecall: err.memoryRecall ?? 0,
        timePressure: err.timePressure ?? 0,
        guessingWild: err.guessingWild ?? 0,
      });
      setErrorNotes(err.notes || '');
    } else {
      setDateRecorded(getTodayStr());
      setQuickTotalScore(590);
      setSubjectData({
        Physics: { score: 140, correct: 36, incorrect: 4, unattempted: 5, errors: { sillyMistakes: 1, conceptualGaps: 2, memoryRecall: 0, timePressure: 1, guessingWild: 0 } },
        Chemistry: { score: 145, correct: 37, incorrect: 3, unattempted: 5, errors: { sillyMistakes: 1, conceptualGaps: 1, memoryRecall: 1, timePressure: 0, guessingWild: 0 } },
        Botany: { score: 155, correct: 39, incorrect: 1, unattempted: 5, errors: { sillyMistakes: 0, conceptualGaps: 0, memoryRecall: 1, timePressure: 0, guessingWild: 0 } },
        Zoology: { score: 150, correct: 38, incorrect: 2, unattempted: 5, errors: { sillyMistakes: 1, conceptualGaps: 0, memoryRecall: 1, timePressure: 0, guessingWild: 0 } },
      });
      setQuickCorrect(150);
      setQuickIncorrect(10);
      setQuickUnattempted(20);
      setGlobalErrors({ sillyMistakes: 3, conceptualGaps: 3, memoryRecall: 3, timePressure: 1, guessingWild: 0 });
      setNotes('');
      setErrorNotes('');
    }
  }, [preselectedTestId, isOpen, tests, testScores]);

  // Handle switching test selection
  const handleTestSelectionChange = (newTestId: string) => {
    setSelectedTestId(newTestId);
    const existing = testScores.find((s) => s.testId === newTestId);
    if (existing) {
      setDateRecorded(existing.dateRecorded || getTodayStr());
      setQuickTotalScore(existing.totalScore);
      setNotes(existing.notes || '');

      const subScores = existing.subjectScores || {};
      const subQuestions = existing.subjectQuestions || {};
      const bySubErrors = existing.errors?.bySubject || {};

      const nextData: any = {};
      SUBJECTS.forEach((sub) => {
        const sq = subQuestions[sub] || {};
        const scoreVal = subScores[sub] ?? (sq.score ?? '');
        const cor = sq.correct ?? (scoreVal !== '' ? Math.max(0, Math.floor((Number(scoreVal) + 5) / 4)) : '');
        const incor = sq.incorrect ?? (scoreVal !== '' ? 2 : '');
        const unatt = sq.unattempted ?? '';
        const errs = bySubErrors[sub] || { sillyMistakes: 0, conceptualGaps: 0, memoryRecall: 0, timePressure: 0, guessingWild: 0 };

        nextData[sub] = {
          score: scoreVal,
          correct: cor,
          incorrect: incor,
          unattempted: unatt,
          errors: {
            sillyMistakes: errs.sillyMistakes ?? 0,
            conceptualGaps: errs.conceptualGaps ?? 0,
            memoryRecall: errs.memoryRecall ?? 0,
            timePressure: errs.timePressure ?? 0,
            guessingWild: errs.guessingWild ?? 0,
          },
        };
      });
      setSubjectData(nextData);

      setQuickCorrect(existing.correctQuestions ?? '');
      setQuickIncorrect(existing.incorrectQuestions ?? '');
      setQuickUnattempted(existing.unattemptedQuestions ?? '');

      const err = existing.errors || {};
      setGlobalErrors({
        sillyMistakes: err.sillyMistakes ?? 0,
        conceptualGaps: err.conceptualGaps ?? 0,
        memoryRecall: err.memoryRecall ?? 0,
        timePressure: err.timePressure ?? 0,
        guessingWild: err.guessingWild ?? 0,
      });
      setErrorNotes(err.notes || '');
    }
  };

  // Computations for Subject-Wise Rollup
  const aggregatedSubjectTotals = useMemo(() => {
    let totalScore = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnattempted = 0;
    let silly = 0;
    let conceptual = 0;
    let memory = 0;
    let time = 0;
    let wild = 0;

    SUBJECTS.forEach((sub) => {
      const d = subjectData[sub];
      totalScore += Number(d.score || 0);
      totalCorrect += Number(d.correct || 0);
      totalIncorrect += Number(d.incorrect || 0);
      totalUnattempted += Number(d.unattempted || 0);
      silly += d.errors.sillyMistakes || 0;
      conceptual += d.errors.conceptualGaps || 0;
      memory += d.errors.memoryRecall || 0;
      time += d.errors.timePressure || 0;
      wild += d.errors.guessingWild || 0;
    });

    return {
      totalScore,
      totalCorrect,
      totalIncorrect,
      totalUnattempted,
      silly,
      conceptual,
      memory,
      time,
      wild,
    };
  }, [subjectData]);

  // Updates for Subject Questions & Marks (Auto-calculate score = 4*correct - incorrect)
  const handleSubjectQuestionChange = (
    subject: Subject,
    field: 'correct' | 'incorrect' | 'unattempted' | 'score',
    val: string
  ) => {
    const num = val === '' ? '' : Number(val);
    setSubjectData((prev) => {
      const current = { ...prev[subject] };
      if (field === 'correct') {
        current.correct = num;
        if (num !== '' || current.incorrect !== '') {
          current.score = Number(num || 0) * 4 - Number(current.incorrect || 0);
        }
      } else if (field === 'incorrect') {
        current.incorrect = num;
        if (current.correct !== '' || num !== '') {
          current.score = Number(current.correct || 0) * 4 - Number(num || 0);
        }
      } else if (field === 'unattempted') {
        current.unattempted = num;
      } else if (field === 'score') {
        current.score = num;
      }
      return { ...prev, [subject]: current };
    });
  };

  // Update error count for a specific subject
  const handleSubjectErrorChange = (
    subject: Subject,
    errorType: keyof SubjectErrorBreakdown,
    delta: number
  ) => {
    setSubjectData((prev) => {
      const current = { ...prev[subject] };
      const currentVal = current.errors[errorType] || 0;
      const nextVal = Math.max(0, currentVal + delta);
      current.errors = { ...current.errors, [errorType]: nextVal };
      return { ...prev, [subject]: current };
    });
  };

  const handleGlobalErrorChange = (errorType: keyof SubjectErrorBreakdown, delta: number) => {
    setGlobalErrors((prev) => ({
      ...prev,
      [errorType]: Math.max(0, (prev[errorType] || 0) + delta),
    }));
  };

  // Final Total Score to record
  const effectiveTotalScore = entryMode === 'SUBJECT_WISE' ? aggregatedSubjectTotals.totalScore : quickTotalScore;
  const effectivePercentage = maxMarks > 0 ? Math.round((effectiveTotalScore / maxMarks) * 1000) / 10 : 0;
  const effectiveMarksBleed = entryMode === 'SUBJECT_WISE' ? aggregatedSubjectTotals.totalIncorrect : Number(quickIncorrect || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;

    const subjectScores: Partial<Record<Subject, number>> = {};
    const subjectQuestions: Partial<Record<Subject, SubjectQuestionCount>> = {};
    const bySubjectErrors: Partial<Record<Subject, SubjectErrorBreakdown>> = {};

    SUBJECTS.forEach((sub) => {
      const d = subjectData[sub];
      if (d.score !== '') subjectScores[sub] = Number(d.score);
      subjectQuestions[sub] = {
        correct: d.correct !== '' ? Number(d.correct) : undefined,
        incorrect: d.incorrect !== '' ? Number(d.incorrect) : undefined,
        unattempted: d.unattempted !== '' ? Number(d.unattempted) : undefined,
        score: d.score !== '' ? Number(d.score) : undefined,
      };
      bySubjectErrors[sub] = { ...d.errors };
    });

    const finalErrors: ErrorBreakdown = {
      sillyMistakes:
        entryMode === 'SUBJECT_WISE' ? aggregatedSubjectTotals.silly : globalErrors.sillyMistakes || 0,
      conceptualGaps:
        entryMode === 'SUBJECT_WISE' ? aggregatedSubjectTotals.conceptual : globalErrors.conceptualGaps || 0,
      memoryRecall:
        entryMode === 'SUBJECT_WISE' ? aggregatedSubjectTotals.memory : globalErrors.memoryRecall || 0,
      timePressure:
        entryMode === 'SUBJECT_WISE' ? aggregatedSubjectTotals.time : globalErrors.timePressure || 0,
      guessingWild:
        entryMode === 'SUBJECT_WISE' ? aggregatedSubjectTotals.wild : globalErrors.guessingWild || 0,
      bySubject: bySubjectErrors,
      notes: errorNotes.trim() || undefined,
    };

    onSaveScore({
      testId: selectedTest.id,
      testName: selectedTest.name,
      dateRecorded,
      totalScore: Number(effectiveTotalScore),
      maxScore: maxMarks,
      totalQuestions:
        entryMode === 'SUBJECT_WISE' &&
        aggregatedSubjectTotals.totalCorrect + aggregatedSubjectTotals.totalIncorrect + aggregatedSubjectTotals.totalUnattempted > 0
          ? aggregatedSubjectTotals.totalCorrect + aggregatedSubjectTotals.totalIncorrect + aggregatedSubjectTotals.totalUnattempted
          : Math.max(1, Math.round(maxMarks / 4)),
      correctQuestions:
        entryMode === 'SUBJECT_WISE'
          ? aggregatedSubjectTotals.totalCorrect
          : quickCorrect !== ''
          ? Number(quickCorrect)
          : undefined,
      incorrectQuestions:
        entryMode === 'SUBJECT_WISE'
          ? aggregatedSubjectTotals.totalIncorrect
          : quickIncorrect !== ''
          ? Number(quickIncorrect)
          : undefined,
      unattemptedQuestions:
        entryMode === 'SUBJECT_WISE'
          ? aggregatedSubjectTotals.totalUnattempted
          : quickUnattempted !== ''
          ? Number(quickUnattempted)
          : undefined,
      errors: finalErrors,
      subjectScores: Object.keys(subjectScores).length > 0 ? subjectScores : undefined,
      subjectQuestions: Object.keys(subjectQuestions).length > 0 ? subjectQuestions : undefined,
      notes: notes.trim() || undefined,
    });

    sound.playCommitSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#141416]/75 backdrop-blur-xs font-mono overflow-y-auto">
      <div
        id="log-test-score-card"
        className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] w-full max-w-2xl overflow-hidden relative my-4"
      >
        {/* Corner Screws */}
        <div className="absolute top-2 left-2 z-10"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2 z-10"><span className="te-screw" /></div>

        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416] pl-7 pr-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#FF3B00] font-black tracking-wider uppercase">
                Performance Telemetry
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#FF3B00] text-white font-bold">
                Unified Score & Forensic Logger
              </span>
            </div>
            <h2 className="text-sm font-black uppercase text-white tracking-tight">
              Log Exam Score & Subject Error Audit
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C8A82] hover:text-white p-1 rounded hover:bg-[#2A2A30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* 1. Exam Selector & Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416]">
                1. Select Scheduled Mock Exam
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#5C5A52]">Date:</span>
                <input
                  type="date"
                  required
                  value={dateRecorded}
                  onChange={(e) => setDateRecorded(e.target.value)}
                  className="text-xs font-bold px-2 py-0.5 rounded border border-[#141416] bg-[#ECEAE4] text-[#141416]"
                />
              </div>
            </div>

            <select
              id="score-test-select"
              value={selectedTestId}
              onChange={(e) => handleTestSelectionChange(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] focus:outline-none"
              required
            >
              <optgroup label="── ⚠ UNLOGGED MOCK TESTS (CHRONOLOGICAL) ──">
                {tests
                  .filter((t) => !testScores.some((s) => s.testId === t.id))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      🔴 [PENDING] {t.date} — {t.name} ({t.coachingName || 'Test'})
                    </option>
                  ))}
              </optgroup>
              <optgroup label="── ✓ COMPLETED / LOGGED TESTS ──">
                {tests
                  .filter((t) => testScores.some((s) => s.testId === t.id))
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((t) => {
                    const sc = testScores.find((s) => s.testId === t.id);
                    return (
                      <option key={t.id} value={t.id}>
                        🔵 [LOGGED: {sc?.totalScore}/{sc?.maxScore}] {t.date} — {t.name}
                      </option>
                    );
                  })}
              </optgroup>
            </select>
          </div>

          {/* 2. LIVE INTEGRATED SCORE SUMMARY BOARD */}
          <div className="p-3 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] shadow-[2px_2px_0px_#141416] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#D5D2C8]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Calculated Result:</span>
                <span className="text-xl font-black text-[#FF3B00]">
                  {effectiveTotalScore} <span className="text-xs text-[#5C5A52] font-normal">/ {maxMarks}</span>
                </span>
                <span className="text-xs font-black px-1.5 py-0.5 rounded bg-[#141416] text-[#FAF9F6]">
                  {effectivePercentage}%
                </span>
              </div>

              {effectiveMarksBleed > 0 && (
                <span className="text-[10px] font-black text-white bg-[#DC2626] px-2 py-0.5 rounded-[2px] border border-[#141416] self-start sm:self-auto">
                  -{effectiveMarksBleed} Marks Bleed (Negative Marking)
                </span>
              )}
            </div>

            {/* Subject Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {SUBJECTS.map((sub) => {
                const colors = SUBJECT_COLORS[sub];
                const d = subjectData[sub];
                return (
                  <div
                    key={sub}
                    onClick={() => setActiveSubjectTab(sub)}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      activeSubjectTab === sub ? `${colors.bg} ${colors.border} border-2 font-black` : 'bg-[#ECEAE4] border-[#141416]'
                    }`}
                  >
                    <div className={`text-[10px] font-black uppercase ${colors.text}`}>{sub}</div>
                    <div className="text-sm font-black text-[#141416] mt-0.5">
                      {d.score !== '' ? d.score : 0} <span className="text-[9px] text-[#5C5A52]">/ 180</span>
                    </div>
                    <div className="text-[9px] text-[#5C5A52] mt-0.5">
                      ✓ {d.correct || 0} · ✗ {d.incorrect || 0}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. ENTRY MODE TOGGLE */}
          <div className="flex items-center justify-between gap-2 border-b-2 border-[#141416] pb-2">
            <span className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-[#0047FF]" />
              2. Score & Error Forensics Entry
            </span>
            <div className="flex items-center bg-[#ECEAE4] border border-[#141416] rounded-[3px] p-0.5">
              <button
                type="button"
                onClick={() => setEntryMode('SUBJECT_WISE')}
                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-[2px] cursor-pointer transition-all ${
                  entryMode === 'SUBJECT_WISE' ? 'bg-[#141416] text-white' : 'text-[#5C5A52]'
                }`}
              >
                Subject-Wise Breakdown
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('QUICK_TOTAL')}
                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-[2px] cursor-pointer transition-all ${
                  entryMode === 'QUICK_TOTAL' ? 'bg-[#141416] text-white' : 'text-[#5C5A52]'
                }`}
              >
                Quick Total
              </button>
            </div>
          </div>

          {/* SUBJECT-WISE DETAILED VIEW */}
          {entryMode === 'SUBJECT_WISE' && (
            <div className="space-y-3">
              {/* Subject Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {SUBJECTS.map((sub) => {
                  const isActive = activeSubjectTab === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setActiveSubjectTab(sub)}
                      className={`px-3 py-1 text-xs font-black uppercase rounded-[3px] border-2 cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#141416] text-white border-[#141416] shadow-sm'
                          : 'bg-[#ECEAE4] text-[#5C5A52] border-[#C5C3BB] hover:text-[#141416]'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>

              {/* Active Subject Card */}
              {(() => {
                const sub = activeSubjectTab;
                const d = subjectData[sub];
                const colors = SUBJECT_COLORS[sub];
                return (
                  <div className="p-3.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-[2px] ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {sub} Score & Questions
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#5C5A52]">
                        Calculated Marks: <strong className="text-[#141416] text-sm font-black">{d.score !== '' ? d.score : 0}</strong> / 180
                      </div>
                    </div>

                    {/* Question inputs */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                        <span className="block text-[10px] font-black text-[#0047FF] uppercase">
                          Correct (+4)
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={45}
                          value={d.correct}
                          onChange={(e) => handleSubjectQuestionChange(sub, 'correct', e.target.value)}
                          className="w-full text-center font-black text-sm bg-transparent mt-0.5 focus:outline-none"
                          placeholder="36"
                        />
                      </div>
                      <div className="p-2 bg-[#FEE2E2] rounded border border-[#FF3B00]">
                        <span className="block text-[10px] font-black text-[#DC2626] uppercase">
                          Incorrect (-1)
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={45}
                          value={d.incorrect}
                          onChange={(e) => handleSubjectQuestionChange(sub, 'incorrect', e.target.value)}
                          className="w-full text-center font-black text-sm bg-transparent text-[#DC2626] mt-0.5 focus:outline-none"
                          placeholder="4"
                        />
                      </div>
                      <div className="p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                        <span className="block text-[10px] font-black text-[#5C5A52] uppercase">
                          Left Blank (0)
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={45}
                          value={d.unattempted}
                          onChange={(e) => handleSubjectQuestionChange(sub, 'unattempted', e.target.value)}
                          className="w-full text-center font-black text-sm bg-transparent mt-0.5 focus:outline-none"
                          placeholder="5"
                        />
                      </div>
                    </div>

                    {/* Subject Error Forensic Breakdown */}
                    <div className="pt-2 border-t border-[#D5D2C8] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-[#141416] flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-[#FF3B00]" />
                          {sub} Error Taxonomy ({d.incorrect || 0} Mistakes)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Silly */}
                        <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                          <div>
                            <div className="text-[11px] font-black text-[#141416]">Silly / Calculation Slips</div>
                            <div className="text-[9px] text-[#5C5A52]">Bubbling, misread, unit slips</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'sillyMistakes', -1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-xs text-[#FF3B00]">
                              {d.errors.sillyMistakes || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'sillyMistakes', 1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Conceptual */}
                        <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                          <div>
                            <div className="text-[11px] font-black text-[#141416]">Conceptual Gaps</div>
                            <div className="text-[9px] text-[#5C5A52]">Theory unclear, wrong concept</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'conceptualGaps', -1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-xs text-[#9333EA]">
                              {d.errors.conceptualGaps || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'conceptualGaps', 1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Memory */}
                        <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                          <div>
                            <div className="text-[11px] font-black text-[#141416]">Memory / Fact Recall</div>
                            <div className="text-[9px] text-[#5C5A52]">Forgot NCERT line, formula</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'memoryRecall', -1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-xs text-[#D97706]">
                              {d.errors.memoryRecall || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'memoryRecall', 1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Time Pressure */}
                        <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                          <div>
                            <div className="text-[11px] font-black text-[#141416]">Time Panic / Rushed</div>
                            <div className="text-[9px] text-[#5C5A52]">Ran out of time, rushed</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'timePressure', -1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-xs text-[#2563EB]">
                              {d.errors.timePressure || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSubjectErrorChange(sub, 'timePressure', 1)}
                              className="w-6 h-6 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded font-black text-xs cursor-pointer hover:bg-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* QUICK TOTAL MODE */}
          {entryMode === 'QUICK_TOTAL' && (
            <div className="p-3.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-[#141416] mb-1">
                    Direct Total Score (/ {maxMarks})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={maxMarks}
                    value={quickTotalScore}
                    onChange={(e) => setQuickTotalScore(Number(e.target.value))}
                    className="w-full text-base font-black p-2 border-2 border-[#141416] rounded bg-[#ECEAE4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-[#141416] mb-1">
                    Questions Count (Optional)
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    <input
                      type="number"
                      placeholder="✓ Cor"
                      value={quickCorrect}
                      onChange={(e) => setQuickCorrect(e.target.value === '' ? '' : Number(e.target.value))}
                      className="p-1.5 text-xs text-center border border-[#141416] rounded bg-[#ECEAE4]"
                    />
                    <input
                      type="number"
                      placeholder="✗ Inc"
                      value={quickIncorrect}
                      onChange={(e) => setQuickIncorrect(e.target.value === '' ? '' : Number(e.target.value))}
                      className="p-1.5 text-xs text-center border border-[#FF3B00] rounded bg-[#FEE2E2] text-[#DC2626]"
                    />
                    <input
                      type="number"
                      placeholder="⏳ Left"
                      value={quickUnattempted}
                      onChange={(e) => setQuickUnattempted(e.target.value === '' ? '' : Number(e.target.value))}
                      className="p-1.5 text-xs text-center border border-[#141416] rounded bg-[#ECEAE4]"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Global Error Breakdown */}
              <div className="pt-2 border-t border-[#D5D2C8] space-y-2">
                <span className="text-[11px] font-black uppercase text-[#141416] block">
                  Whole Test Error Classification
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                    <span className="text-[11px] font-bold">Silly Mistakes</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('sillyMistakes', -1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black text-xs text-[#FF3B00]">{globalErrors.sillyMistakes}</span>
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('sillyMistakes', 1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                    <span className="text-[11px] font-bold">Conceptual Gaps</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('conceptualGaps', -1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black text-xs text-[#9333EA]">{globalErrors.conceptualGaps}</span>
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('conceptualGaps', 1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                    <span className="text-[11px] font-bold">Memory Recall</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('memoryRecall', -1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black text-xs text-[#D97706]">{globalErrors.memoryRecall}</span>
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('memoryRecall', 1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-[#ECEAE4] rounded border border-[#141416]">
                    <span className="text-[11px] font-bold">Time Pressure</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('timePressure', -1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black text-xs text-[#2563EB]">{globalErrors.timePressure}</span>
                      <button
                        type="button"
                        onClick={() => handleGlobalErrorChange('timePressure', 1)}
                        className="w-5 h-5 flex items-center justify-center bg-[#FAF9F6] border border-[#141416] rounded text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specific Error Notes & General Notes */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
                Specific Question Error Notes
              </label>
              <input
                type="text"
                placeholder="e.g., Q22 Ray Optics sign convention, Q78 Aldol condensation reagent, Q144 Mendelian cross"
                value={errorNotes}
                onChange={(e) => setErrorNotes(e.target.value)}
                className="w-full text-xs p-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] placeholder:text-[#8C8A82]"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
                Overall Strategy & Test Reflection
              </label>
              <textarea
                rows={2}
                placeholder="e.g., Biology was 100% Book based. Physics speed needs work on Mechanics questions."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] placeholder:text-[#8C8A82] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              id="confirm-save-score-btn"
              type="submit"
              className="w-full py-3 rounded-[3px] bg-[#FF3B00] hover:bg-[#E03400] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141416] shadow-[3px_3px_0px_#141416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#141416] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Score & Error Forensic Telemetry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
