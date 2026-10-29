import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  Check,
  Target,
  BookOpen,
  Filter,
  BarChart3,
  Flame,
  ArrowUpRight,
  ShieldAlert,
  HelpCircle,
  Sparkles,
  Printer,
} from 'lucide-react';
import { Chapter, Subject, Test, TestScore } from '../types';
import { getDaysDifference, getTodayStr } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';
import {
  getConfidenceTier,
  getScoreConfidenceTier,
  getPercentageConfidenceTier,
} from '../utils/confidenceColor';
import { TestSchedulePrintModal } from './TestSchedulePrintModal';

interface TestManagerProps {
  tests: Test[];
  chapters: Chapter[];
  testScores: TestScore[];
  onOpenAddTest?: () => void;
  onOpenLogScore: (testId?: string) => void;
  onOpenQuickLog?: (chapterId?: string) => void;
  onOpenPrintSchedule?: () => void;
}

const SUBJECT_COLORS: Record<Subject, { text: string; bg: string; fill: string; border: string }> = {
  Physics: { text: 'text-[#0047FF]', bg: 'bg-[#0047FF]/10', fill: '#0047FF', border: 'border-[#0047FF]' },
  Chemistry: { text: 'text-[#9333EA]', bg: 'bg-[#9333EA]/10', fill: '#9333EA', border: 'border-[#9333EA]' },
  Botany: { text: 'text-[#D97706]', bg: 'bg-[#FFB800]/15', fill: '#FFB800', border: 'border-[#FFB800]' },
  Zoology: { text: 'text-[#EA580C]', bg: 'bg-[#EA580C]/10', fill: '#EA580C', border: 'border-[#EA580C]' },
};

export const TestManager: React.FC<TestManagerProps> = ({
  tests,
  chapters,
  testScores,
  onOpenAddTest,
  onOpenLogScore,
  onOpenQuickLog,
  onOpenPrintSchedule,
}) => {
  const todayStr = getTodayStr();

  // Top Section Switcher: Schedule vs Analytics
  const [activeSubView, setActiveSubView] = useState<'SCHEDULE' | 'ANALYTICS'>('SCHEDULE');
  const [isInternalPrintOpen, setIsInternalPrintOpen] = useState(false);

  const handleOpenPrint = () => {
    sound.playButtonClick();
    if (onOpenPrintSchedule) {
      onOpenPrintSchedule();
    } else {
      setIsInternalPrintOpen(true);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [coachingFilter, setCoachingFilter] = useState<'ALL' | 'ALLEN' | 'AAKASH'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNFILLED' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [selectedAnalyticsTestId, setSelectedAnalyticsTestId] = useState<string | 'ALL'>('ALL');

  // Map chapters for quick lookup
  const chapterMap = useMemo(() => {
    const map = new Map<string, Chapter>();
    chapters.forEach((ch) => map.set(ch.id, ch));
    return map;
  }, [chapters]);

  // Quick lookup for score by testId
  const scoreMap = useMemo(() => {
    const map = new Map<string, TestScore>();
    testScores.forEach((s) => map.set(s.testId, s));
    return map;
  }, [testScores]);

  // Chronologically sorted scores for graphing
  const sortedScores = useMemo(() => {
    return [...testScores].sort((a, b) => (a.dateRecorded || '').localeCompare(b.dateRecorded || ''));
  }, [testScores]);

  // Only PAST tests that are unfilled (already taken, waiting for marks)
  const pendingPastUnfilledTests = useMemo(() => {
    return tests
      .filter((t) => !scoreMap.has(t.id) && getDaysDifference(todayStr, t.date) <= 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [tests, scoreMap, todayStr]);

  // Filtered tests for the main timeline list
  const filteredTests = useMemo(() => {
    return tests
      .filter((t) => {
        // Coaching filter
        if (coachingFilter === 'ALLEN' && !t.coachingName?.toUpperCase().includes('ALLEN') && !t.name.toUpperCase().includes('ALLEN')) {
          return false;
        }
        if (
          coachingFilter === 'AAKASH' &&
          !t.coachingName?.toUpperCase().includes('AAKASH') &&
          !t.name.toUpperCase().includes('AAKASH') &&
          !t.name.toUpperCase().includes('AIATS') &&
          !t.name.toUpperCase().includes('TYM') &&
          !t.name.toUpperCase().includes('NBTS')
        ) {
          return false;
        }

        // Status filter
        const daysAway = getDaysDifference(todayStr, t.date);
        const hasScore = scoreMap.has(t.id);

        if (statusFilter === 'UNFILLED' && (hasScore || daysAway > 0)) return false;
        if (statusFilter === 'UPCOMING' && (daysAway < 0 || hasScore)) return false;
        if (statusFilter === 'COMPLETED' && !hasScore) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchScope = t.subjectOrScope.toLowerCase().includes(q);
          const matchDate = t.date.toLowerCase().includes(q);
          const matchCoaching = (t.coachingName || '').toLowerCase().includes(q);
          const matchChapter = t.linkedChapterIds.some((id) => {
            const ch = chapterMap.get(id);
            return ch && ch.name.toLowerCase().includes(q);
          });
          return matchName || matchScope || matchDate || matchCoaching || matchChapter;
        }

        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tests, coachingFilter, statusFilter, searchQuery, todayStr, chapterMap, scoreMap]);

  // Subject scores average & trend
  const subjectAverages = useMemo(() => {
    const totals: Record<Subject, { sum: number; count: number }> = {
      Physics: { sum: 0, count: 0 },
      Chemistry: { sum: 0, count: 0 },
      Botany: { sum: 0, count: 0 },
      Zoology: { sum: 0, count: 0 },
    };

    testScores.forEach((score) => {
      if (score.subjectScores) {
        (['Physics', 'Chemistry', 'Botany', 'Zoology'] as Subject[]).forEach((s) => {
          if (score.subjectScores?.[s] !== undefined) {
            totals[s].sum += score.subjectScores[s]!;
            totals[s].count += 1;
          }
        });
      }
    });

    return {
      Physics: totals.Physics.count > 0 ? Math.round(totals.Physics.sum / totals.Physics.count) : null,
      Chemistry: totals.Chemistry.count > 0 ? Math.round(totals.Chemistry.sum / totals.Chemistry.count) : null,
      Botany: totals.Botany.count > 0 ? Math.round(totals.Botany.sum / totals.Botany.count) : null,
      Zoology: totals.Zoology.count > 0 ? Math.round(totals.Zoology.sum / totals.Zoology.count) : null,
    };
  }, [testScores]);

  // Forensic Error Classification & Negative Marking Bleed
  const errorForensics = useMemo(() => {
    let totalMarksBleed = 0;
    let totalSillyMistakes = 0;
    let totalConceptualGaps = 0;
    let totalMemoryRecallDeficits = 0;
    let totalTimePressureSlips = 0;
    let totalWildGuesses = 0;
    let totalAttempted = 0;
    let totalCorrect = 0;

    // Subject-wise error accumulator
    const subjectErrors: Record<Subject, { silly: number; conceptual: number; memory: number; time: number; wild: number; total: number }> = {
      Physics: { silly: 0, conceptual: 0, memory: 0, time: 0, wild: 0, total: 0 },
      Chemistry: { silly: 0, conceptual: 0, memory: 0, time: 0, wild: 0, total: 0 },
      Botany: { silly: 0, conceptual: 0, memory: 0, time: 0, wild: 0, total: 0 },
      Zoology: { silly: 0, conceptual: 0, memory: 0, time: 0, wild: 0, total: 0 },
    };

    testScores.forEach((score) => {
      totalMarksBleed += score.incorrectQuestions || 0;
      if (score.correctQuestions) totalCorrect += score.correctQuestions;
      if (score.correctQuestions && score.incorrectQuestions) {
        totalAttempted += score.correctQuestions + score.incorrectQuestions;
      }
      if (score.errors) {
        totalSillyMistakes += score.errors.sillyMistakes || 0;
        totalConceptualGaps += score.errors.conceptualGaps || 0;
        totalMemoryRecallDeficits += score.errors.memoryRecall || 0;
        totalTimePressureSlips += score.errors.timePressure || 0;
        totalWildGuesses += score.errors.guessingWild || 0;

        if (score.errors.bySubject) {
          (['Physics', 'Chemistry', 'Botany', 'Zoology'] as Subject[]).forEach((sub) => {
            const se = score.errors?.bySubject?.[sub];
            if (se) {
              const s = se.sillyMistakes || 0;
              const c = se.conceptualGaps || 0;
              const m = se.memoryRecall || 0;
              const t = se.timePressure || 0;
              const w = se.guessingWild || 0;
              subjectErrors[sub].silly += s;
              subjectErrors[sub].conceptual += c;
              subjectErrors[sub].memory += m;
              subjectErrors[sub].time += t;
              subjectErrors[sub].wild += w;
              subjectErrors[sub].total += s + c + m + t + w;
            }
          });
        }
      }
    });

    const totalErrorsLogged =
      totalSillyMistakes +
      totalConceptualGaps +
      totalMemoryRecallDeficits +
      totalTimePressureSlips +
      totalWildGuesses;

    const accuracyPct =
      totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 85;

    const avgScorePct =
      testScores.length > 0
        ? Math.round(
            (testScores.reduce((sum, s) => sum + s.totalScore, 0) /
              testScores.reduce((sum, s) => sum + s.maxScore, 0)) *
              100
          )
        : 0;

    const avgScoreMarks =
      testScores.length > 0
        ? Math.round(testScores.reduce((sum, s) => sum + s.totalScore, 0) / testScores.length)
        : 0;

    const highestScore =
      testScores.length > 0 ? Math.max(...testScores.map((s) => s.totalScore)) : 0;

    return {
      totalMarksBleed,
      totalSillyMistakes,
      totalConceptualGaps,
      totalMemoryRecallDeficits,
      totalTimePressureSlips,
      totalWildGuesses,
      totalErrorsLogged,
      totalAttempted,
      totalCorrect,
      accuracyPct,
      avgScorePct,
      avgScoreMarks,
      highestScore,
      subjectErrors,
      testCount: testScores.length,
    };
  }, [testScores]);

  const toggleExpand = (testId: string) => {
    setExpandedTestId(expandedTestId === testId ? null : testId);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Top Section Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] shadow-[4px_4px_0px_#141416]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#FF3B00] rounded-[1px] animate-pulse"></span>
            <span className="text-xs font-black text-[#FF3B00] uppercase tracking-wider">
              EXAM SCHEDULE & MOCK TEST CENTER
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-black uppercase text-[#141416] tracking-tight mt-0.5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#FF3B00]" />
            Mock Test Manager & Performance Forensics
          </h1>
          <p className="text-xs text-[#5C5A52]">
            2026–27 Test Series Schedule, Unified Score Logging, Progression Graphs, and Forensic Error Taxonomy.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] self-start sm:self-auto">
          <button
            onClick={() => {
              sound.playKeyClick();
              setActiveSubView('SCHEDULE');
            }}
            className={`px-3 py-1.5 text-xs font-black uppercase rounded-[2px] cursor-pointer flex items-center gap-1.5 transition-all ${
              activeSubView === 'SCHEDULE'
                ? 'bg-[#141416] text-[#FAF9F6] shadow-sm'
                : 'text-[#5C5A52] hover:text-[#141416]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Test Schedule ({tests.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playKeyClick();
              setActiveSubView('ANALYTICS');
            }}
            className={`px-3 py-1.5 text-xs font-black uppercase rounded-[2px] cursor-pointer flex items-center gap-1.5 transition-all ${
              activeSubView === 'ANALYTICS'
                ? 'bg-[#141416] text-[#FAF9F6] shadow-sm'
                : 'text-[#5C5A52] hover:text-[#141416]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#FF3B00]" />
            <span>Mock Analytics & Score Graphs ({testScores.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TEST SCHEDULE & TIMELINE */}
      {/* ========================================================================= */}
      {activeSubView === 'SCHEDULE' && (
        <div className="space-y-6">
          {/* 1. Pending Past Test Results Logger */}
          <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
            {/* Corner Screws */}
            <div className="absolute top-2 left-2"><span className="te-screw" /></div>
            <div className="absolute top-2 right-2"><span className="te-screw" /></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#141416] mx-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-[2px] bg-[#FF3B00] text-white tracking-wider uppercase">
                    Direct Result Logger
                  </span>
                  <span className="text-xs font-bold text-[#5C5A52]">
                    {pendingPastUnfilledTests.length} Past Exam{pendingPastUnfilledTests.length === 1 ? '' : 's'} Pending Marks
                  </span>
                </div>
                <h2 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#FF3B00] fill-[#FF3B00]" />
                  <span>Pending Past Mock Results</span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenLogScore()}
                  className="te-btn-orange px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold shrink-0"
                >
                  <Award className="w-4 h-4 stroke-[2.5]" />
                  <span>Log Any Exam Score</span>
                </button>
              </div>
            </div>

            {/* Pending Past Tests List */}
            {pendingPastUnfilledTests.length === 0 ? (
              <div className="py-6 px-4 text-center mx-2 mt-3 bg-[#ECEAE4] border border-[#141416] rounded-[3px]">
                <CheckCircle2 className="w-7 h-7 text-[#0047FF] mx-auto mb-1" />
                <p className="text-xs font-black text-[#141416] uppercase">No Past Test Results Pending</p>
                <p className="text-[11px] text-[#5C5A52] mt-0.5">
                  All completed test marks have been logged. Future tests will appear here once their exam date arrives.
                </p>
              </div>
            ) : (
              <div className="mt-3 mx-2">
                <p className="text-xs text-[#5C5A52] mb-2.5">
                  These tests have already taken place. Tap below to record your subject scores and error audit:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {pendingPastUnfilledTests.map((test) => {
                    const daysAway = getDaysDifference(todayStr, test.date);
                    return (
                      <div
                        key={test.id}
                        className="p-3 bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] shadow-[2px_2px_0px_#141416] flex flex-col justify-between space-y-2 hover:border-[#FF3B00] transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-black px-1.5 py-0.2 rounded bg-[#141416] text-[#FAF9F6] uppercase">
                              {test.coachingName || 'Test'}
                            </span>
                            <span className="font-bold text-[#FF3B00]">{Math.abs(daysAway)}d ago</span>
                          </div>

                          <h4 className="text-xs font-black text-[#141416] uppercase mt-1 line-clamp-1">{test.name}</h4>
                          <p className="text-[11px] text-[#5C5A52] mt-0.5 line-clamp-2">{test.subjectOrScope}</p>
                        </div>

                        <button
                          onClick={() => onOpenLogScore(test.id)}
                          className="w-full py-1.5 text-xs font-black uppercase bg-[#FF3B00] hover:bg-[#E03400] text-white rounded-[2px] border border-[#141416] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Log Score & Errors</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Full Test Series Schedule */}
          <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b-2 border-[#141416]">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0047FF]" />
                  <span>2026–27 Test Series Timeline ({filteredTests.length} Tests)</span>
                </h3>
                <p className="text-xs text-[#5C5A52] mt-0.5">
                  Chronological test calendar with linked syllabus scope and score diagnostics.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="print-test-schedule-btn"
                  onClick={handleOpenPrint}
                  className="te-btn-mechanical px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer bg-[#FAF9F6] border-2 border-[#141416] hover:bg-[#141416] hover:text-[#FAF9F6] transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-[#FF3B00]" />
                  <span>Print Schedule (PDF)</span>
                </button>

                {onOpenAddTest && (
                  <button
                    onClick={onOpenAddTest}
                    className="te-btn-mechanical px-3 py-1.5 text-xs font-black uppercase cursor-pointer bg-[#ECEAE4]"
                  >
                    + Add Custom Test
                  </button>
                )}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C8A82]" />
                <input
                  type="text"
                  placeholder="Search tests by name, syllabus scope, or chapter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-bold bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-[#ECEAE4] border border-[#141416] rounded p-0.5 text-[10px] font-bold">
                  {(['ALL', 'ALLEN', 'AAKASH'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCoachingFilter(c)}
                      className={`px-2 py-1 rounded-[2px] transition-all cursor-pointer ${
                        coachingFilter === c ? 'bg-[#141416] text-white' : 'text-[#5C5A52]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-[#ECEAE4] border border-[#141416] rounded p-0.5 text-[10px] font-bold">
                  {(['ALL', 'UNFILLED', 'UPCOMING', 'COMPLETED'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2 py-1 rounded-[2px] transition-all cursor-pointer ${
                        statusFilter === s ? 'bg-[#141416] text-white' : 'text-[#5C5A52]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tests List */}
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {filteredTests.map((test) => {
                const daysAway = getDaysDifference(todayStr, test.date);
                const score = scoreMap.get(test.id);
                const isExpanded = expandedTestId === test.id;
                const isPast = daysAway < 0;
                const isToday = daysAway === 0;
                const scoreTier = score ? getScoreConfidenceTier(score.totalScore, score.maxScore) : null;

                return (
                  <div
                    key={test.id}
                    className={`p-3.5 rounded-[3px] border-2 transition-all ${
                      score && scoreTier
                        ? `bg-[#FAF9F6] border-[#141416] border-l-4 ${scoreTier.cardBorderClass}`
                        : isToday
                        ? 'bg-[#FFF5F5] border-[#FF3B00] shadow-[2px_2px_0px_#FF3B00]'
                        : isPast
                        ? 'bg-[#ECEAE4] border-[#141416]'
                        : 'bg-[#FAF9F6] border-[#141416]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#141416] text-white uppercase">
                            {test.coachingName || 'Test'}
                          </span>
                          <span className="text-xs font-black uppercase text-[#141416]">{test.name}</span>
                          {score && scoreTier && (
                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${scoreTier.badgeClass}`}>
                              ✓ {score.totalScore}/{score.maxScore} ({scoreTier.label})
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#5C5A52]">{test.subjectOrScope}</p>

                        <div className="text-[11px] text-[#5C5A52]">
                          Date: <strong className="text-[#141416]">{test.date}</strong> ·{' '}
                          {isToday ? (
                            <strong className="text-[#FF3B00]">Today!</strong>
                          ) : isPast ? (
                            <span>{Math.abs(daysAway)} days ago</span>
                          ) : (
                            <strong className="text-[#0047FF]">in {daysAway} days</strong>
                          )}
                          {test.linkedChapterIds.length > 0 && (
                            <span> · {test.linkedChapterIds.length} chapters linked</span>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {score && scoreTier ? (
                          <div className="text-right">
                            <span className={`text-sm font-black block ${scoreTier.textClass}`}>
                              {score.totalScore} / {score.maxScore}
                            </span>
                            <span className="text-[10px] text-[#5C5A52] font-bold">
                              {Math.round((score.totalScore / score.maxScore) * 100)}% Logged
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => onOpenLogScore(test.id)}
                            className="te-btn-orange px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_#141416] cursor-pointer"
                          >
                            Log Score
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpand(test.id)}
                          className="p-1.5 text-[#5C5A52] hover:text-[#141416] rounded border border-[#141416] bg-[#ECEAE4] cursor-pointer"
                          title="Expand Syllabus"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Linked Chapters */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#D5D2C8] space-y-2">
                        <h5 className="text-[10px] font-black uppercase text-[#5C5A52]">
                          Exam Syllabus Chapters ({test.linkedChapterIds.length}):
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {test.linkedChapterIds.map((chId) => {
                            const ch = chapterMap.get(chId);
                            if (!ch) return null;
                            const chConf = getConfidenceTier(ch.currentConfidence);
                            return (
                              <div
                                key={chId}
                                className={`p-2 bg-[#FAF9F6] border border-[#141416] rounded flex items-center justify-between text-xs border-l-4 ${chConf.cardBorderClass}`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-[#141416]">{ch.name}</span>
                                    <span className={`text-[9px] font-black px-1 py-0.2 rounded-[2px] ${chConf.badgeClass}`}>
                                      ★ L{ch.currentConfidence || 0}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-[#5C5A52] block">
                                    {ch.subject} · Class {ch.classLevel}
                                  </span>
                                </div>
                                {onOpenQuickLog && (
                                  <button
                                    onClick={() => onOpenQuickLog(chId)}
                                    className="px-2 py-0.5 text-[10px] font-bold bg-[#ECEAE4] hover:bg-[#FAF9F6] rounded border border-[#141416] cursor-pointer"
                                  >
                                    Revise
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MOCK TEST ANALYTICS, SCORE GRAPHS & ERROR FORENSICS */}
      {/* ========================================================================= */}
      {activeSubView === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* Top Forensic Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-[#FFF5F5] border-2 border-[#FF3B00] rounded-[3px] shadow-[2px_2px_0px_#141416]">
              <div className="text-[10px] font-black uppercase text-[#FF3B00] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Negative Marks Bleed
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#FF3B00] mt-1">
                -{errorForensics.totalMarksBleed} MARKS
              </div>
              <div className="text-[10px] text-[#5C5A52] mt-0.5">Directly recoverable marks from penalties</div>
            </div>

            <div className="p-3.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] shadow-[2px_2px_0px_#141416]">
              <div className="text-[10px] font-black uppercase text-[#141416] flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-[#0047FF]" />
                Attempt Precision
              </div>
              <div className={`text-xl sm:text-2xl font-black mt-1 ${getPercentageConfidenceTier(errorForensics.accuracyPct).textClass}`}>
                {errorForensics.accuracyPct}%
              </div>
              <div className="text-[10px] text-[#5C5A52] mt-0.5">
                {errorForensics.totalCorrect} / {errorForensics.totalAttempted} answered accurately
              </div>
            </div>

            <div className="p-3.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] shadow-[2px_2px_0px_#141416]">
              <div className="text-[10px] font-black uppercase text-[#141416] flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#9333EA]" />
                Peak Score / Average
              </div>
              <div className="text-xl sm:text-2xl font-black mt-1">
                <span className={getScoreConfidenceTier(errorForensics.highestScore).textClass}>
                  {errorForensics.highestScore}
                </span>{' '}
                <span className="text-xs text-[#5C5A52] font-normal">
                  / <strong className={getScoreConfidenceTier(errorForensics.avgScoreMarks).textClass}>{errorForensics.avgScoreMarks}</strong> avg
                </span>
              </div>
              <div className="text-[10px] text-[#5C5A52] mt-0.5">Out of 720 maximum marks</div>
            </div>

            <div className="p-3.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] shadow-[2px_2px_0px_#141416]">
              <div className="text-[10px] font-black uppercase text-[#141416] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#EA580C]" />
                Error Taxonomy Count
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#EA580C] mt-1">
                {errorForensics.totalErrorsLogged} Errors
              </div>
              <div className="text-[10px] text-[#5C5A52] mt-0.5">Across {errorForensics.testCount} logged tests</div>
            </div>
          </div>

          {/* SCORE PROGRESSION GRAPH & ANALYTICS */}
          <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] space-y-4">
            <div className="pb-3 border-b-2 border-[#141416]">
              <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0047FF]" />
                <span>Mock Score Progression & Trajectory</span>
              </h3>
              <p className="text-xs text-[#5C5A52]">
                Chronological test score yield and performance progression over time.
              </p>
            </div>

            {sortedScores.length === 0 ? (
              <div className="py-12 text-center text-[#5C5A52] text-xs bg-[#ECEAE4] border border-[#141416] rounded-[3px]">
                No mock test scores logged yet. Record your test scores to generate the score progression graph!
              </div>
            ) : (
              <div className="space-y-3">
                {/* Score Summary Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {(() => {
                    const latest = sortedScores[sortedScores.length - 1];
                    const latestTier = getScoreConfidenceTier(latest.totalScore, latest.maxScore || 720);
                    return (
                      <div className="p-2.5 bg-[#ECEAE4] border border-[#141416] rounded-[2px]">
                        <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Latest Score</span>
                        <span className={`text-base font-black ${latestTier.textClass}`}>
                          {latest.totalScore}
                          <span className="text-[10px] font-normal text-[#5C5A52]">/{latest.maxScore || 720}</span>
                        </span>
                      </div>
                    );
                  })()}

                  {(() => {
                    const avg = Math.round(sortedScores.reduce((acc, s) => acc + s.totalScore, 0) / sortedScores.length);
                    const avgTier = getScoreConfidenceTier(avg, 720);
                    return (
                      <div className="p-2.5 bg-[#ECEAE4] border border-[#141416] rounded-[2px]">
                        <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Average Score</span>
                        <span className={`text-base font-black ${avgTier.textClass}`}>
                          {avg}
                          <span className="text-[10px] font-normal text-[#5C5A52]">/720</span>
                        </span>
                      </div>
                    );
                  })()}

                  {(() => {
                    const peak = Math.max(...sortedScores.map((s) => s.totalScore));
                    const peakTier = getScoreConfidenceTier(peak, 720);
                    return (
                      <div className="p-2.5 bg-[#ECEAE4] border border-[#141416] rounded-[2px]">
                        <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Peak Score</span>
                        <span className={`text-base font-black ${peakTier.textClass}`}>
                          {peak}
                          <span className="text-[10px] font-normal text-[#5C5A52]">/720</span>
                        </span>
                      </div>
                    );
                  })()}

                  <div className="p-2.5 bg-[#ECEAE4] border border-[#141416] rounded-[2px]">
                    <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Score Delta (T1 → Now)</span>
                    {(() => {
                      const delta = sortedScores[sortedScores.length - 1].totalScore - sortedScores[0].totalScore;
                      return (
                        <span
                          className={`text-base font-black ${
                            delta >= 0 ? 'text-[#0047FF]' : 'text-[#DC2626]'
                          }`}
                        >
                          {delta >= 0 ? `+${delta}` : delta} pts
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* SVG Line Chart (Clean, No Cutoff Trajectory Lines) */}
                <div className="h-64 w-full relative bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] p-3">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 170" preserveAspectRatio="none">
                    {/* Horizontal grid lines & Y-axis labels */}
                    {[
                      { val: 720, y: 15, label: '720' },
                      { val: 540, y: 48, label: '540' },
                      { val: 360, y: 81, label: '360' },
                      { val: 180, y: 114, label: '180' },
                      { val: 0, y: 145, label: '0' },
                    ].map((g) => (
                      <g key={g.val}>
                        <line x1="45" y1={g.y} x2="590" y2={g.y} stroke="#D5D2C8" strokeDasharray="3,3" />
                        <text x="5" y={g.y + 3} fill="#5C5A52" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {g.label}
                        </text>
                      </g>
                    ))}

                    {/* Baseline Line */}
                    <line x1="45" y1="145" x2="590" y2="145" stroke="#141416" strokeWidth="1.5" />

                    {/* Area under score curve */}
                    {sortedScores.length > 1 && (
                      <polygon
                        points={`45,145 ${sortedScores
                          .map((s, i) => {
                            const x = 45 + (i / Math.max(1, sortedScores.length - 1)) * 535;
                            const y = 145 - (s.totalScore / (s.maxScore || 720)) * 130;
                            return `${x},${y}`;
                          })
                          .join(' ')} 580,145`}
                        fill="#0047FF"
                        fillOpacity="0.12"
                      />
                    )}

                    {/* Score Trend Polyline */}
                    {sortedScores.length > 1 && (
                      <polyline
                        points={sortedScores
                          .map((s, i) => {
                            const x = 45 + (i / Math.max(1, sortedScores.length - 1)) * 535;
                            const y = 145 - (s.totalScore / (s.maxScore || 720)) * 130;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#0047FF"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points and Marks */}
                    {sortedScores.map((s, i) => {
                      const x = sortedScores.length === 1 ? 315 : 45 + (i / Math.max(1, sortedScores.length - 1)) * 535;
                      const y = 145 - (s.totalScore / (s.maxScore || 720)) * 130;
                      const scoreTier = getScoreConfidenceTier(s.totalScore, s.maxScore || 720);

                      return (
                        <g key={s.id} className="cursor-pointer">
                          {/* Point marker matching confidence score color */}
                          <circle cx={x} cy={y} r="6" fill={scoreTier.hex} stroke="#141416" strokeWidth="2" />
                          
                          {/* Score tag above point */}
                          <rect
                            x={x - 22}
                            y={Math.max(4, y - 22)}
                            width="44"
                            height="15"
                            rx="2"
                            fill="#141416"
                            stroke={scoreTier.hex}
                            strokeWidth="1.5"
                          />
                          <text
                            x={x}
                            y={Math.max(15, y - 11)}
                            fill={scoreTier.hex}
                            fontSize="9"
                            fontWeight="900"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {s.totalScore}
                          </text>

                          {/* Test Number on X-Axis */}
                          <text
                            x={x}
                            y="158"
                            fill="#141416"
                            fontSize="9"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            T{i + 1}
                          </text>
                          <text
                            x={x}
                            y="167"
                            fill="#5C5A52"
                            fontSize="7.5"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {(s.dateRecorded || '').slice(5) || `T${i + 1}`}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Score Chart Legend & Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-[#5C5A52] pt-1">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B00] border border-[#141416]" /> Test Score Yield
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#0047FF]" /> Performance Trajectory
                    </span>
                  </div>

                  <span>{sortedScores.length} Tests Logged Chronologically</span>
                </div>
              </div>
            )}
          </div>

          {/* SUBJECT SCORE AVERAGES & SUBJECT ERROR RADAR */}
          <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] space-y-4">
            <div className="pb-3 border-b-2 border-[#141416]">
              <h3 className="text-sm sm:text-base font-black uppercase text-[#141416]">
                Subject Yields & Cross-Subject Error Taxonomy
              </h3>
              <p className="text-xs text-[#5C5A52]">
                Detailed breakdown of marks and error distribution across Physics, Chemistry, Botany, and Zoology.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(['Physics', 'Chemistry', 'Botany', 'Zoology'] as Subject[]).map((subj) => {
                const colors = SUBJECT_COLORS[subj];
                const avg = subjectAverages[subj];
                const se = errorForensics.subjectErrors[subj];
                const avgPct = avg !== null ? Math.round((avg / 180) * 100) : 0;
                const pctTier = getPercentageConfidenceTier(avgPct);
                const scoreTier = avg !== null ? getScoreConfidenceTier(avg, 180) : null;

                return (
                  <div
                    key={subj}
                    className={`p-3.5 bg-[#ECEAE4] rounded-[3px] border-2 ${colors.border} shadow-[2px_2px_0px_#141416] space-y-2`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-black uppercase ${colors.text}`}>{subj}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded border border-[#141416] ${pctTier.badgeClass}`}>
                        {avg !== null ? `${avgPct}%` : '—'}
                      </span>
                    </div>

                    <div className="text-lg font-black text-[#141416]">
                      {avg !== null && scoreTier ? (
                        <span className={scoreTier.textClass}>{avg}</span>
                      ) : (
                        '—'
                      )}{' '}
                      <span className="text-[10px] text-[#5C5A52] font-normal">/ 180 avg</span>
                    </div>

                    {/* Mini Error Breakdown for Subject */}
                    <div className="pt-2 border-t border-[#D5D2C8] space-y-1 text-[10px]">
                      <div className="flex justify-between text-[#5C5A52]">
                        <span>Silly Mistakes:</span>
                        <strong className="text-[#FF3B00]">{se.silly}</strong>
                      </div>
                      <div className="flex justify-between text-[#5C5A52]">
                        <span>Conceptual Gaps:</span>
                        <strong className="text-[#9333EA]">{se.conceptual}</strong>
                      </div>
                      <div className="flex justify-between text-[#5C5A52]">
                        <span>Memory Recall:</span>
                        <strong className="text-[#D97706]">{se.memory}</strong>
                      </div>
                      <div className="flex justify-between text-[#5C5A52]">
                        <span>Time Pressure:</span>
                        <strong className="text-[#2563EB]">{se.time}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROOT CAUSE ERROR TAXONOMY */}
          <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] space-y-4">
            <div className="pb-3 border-b-2 border-[#141416]">
              <h3 className="text-sm sm:text-base font-black uppercase text-[#141416]">
                Root-Cause Error Distribution & Diagnostic Taxonomy
              </h3>
              <p className="text-xs text-[#5C5A52]">
                Breakdown of where marks were bled across mock tests. Silly mistakes and memory lapses represent direct low-hanging score gains.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  title: 'Silly Mistakes (Calculation/Reading)',
                  count: errorForensics.totalSillyMistakes,
                  color: 'bg-[#FF3B00]',
                  border: 'border-[#FF3B00]',
                  textColor: 'text-[#FF3B00]',
                  desc: 'Misread question, calculation blunders, incorrect option bubble',
                  tactics: 'Enforce question underline ritual & 2-pass option check',
                },
                {
                  title: 'Conceptual Gaps (Theory/Understanding)',
                  count: errorForensics.totalConceptualGaps,
                  color: 'bg-[#4D82FF]',
                  border: 'border-[#4D82FF]',
                  textColor: 'text-[#4D82FF]',
                  desc: 'Fundamentally misunderstood underlying physics/chem concept',
                  tactics: 'Review classroom lecture notes & solve 15 targeted PYQs',
                },
                {
                  title: 'Memory Recall Deficits (Book Facts)',
                  count: errorForensics.totalMemoryRecallDeficits,
                  color: 'bg-[#9333EA]',
                  border: 'border-[#9333EA]',
                  textColor: 'text-[#9333EA]',
                  desc: 'Forgot organic reaction reagent, biological example, or formula',
                  tactics: 'Log immediate spaced repetition review round & Anki cards',
                },
                {
                  title: 'Time Pressure Slips (Panic/Rushing)',
                  count: errorForensics.totalTimePressureSlips,
                  color: 'bg-[#EA580C]',
                  border: 'border-[#EA580C]',
                  textColor: 'text-[#EA580C]',
                  desc: 'Rushed in the last 20 minutes due to poor time allocation',
                  tactics: 'Practice strict sectional timer limits: Bio 45m, Chem 50m, Phys 70m',
                },
                {
                  title: 'Wild Guesses (Low Confidence Attempts)',
                  count: errorForensics.totalWildGuesses,
                  color: 'bg-[#71717A]',
                  border: 'border-[#71717A]',
                  textColor: 'text-[#71717A]',
                  desc: 'Attempted questions without eliminating at least 2 options',
                  tactics: 'Leave unattempted unless confident in 50/50 elimination',
                },
              ].map((item, idx) => {
                const pct =
                  errorForensics.totalErrorsLogged > 0
                    ? Math.round((item.count / errorForensics.totalErrorsLogged) * 100)
                    : 0;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 bg-[#ECEAE4] rounded-[3px] border-2 ${item.border} shadow-[2px_2px_0px_#141416] space-y-2`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-[#141416]">{item.title}</span>
                      <span className={`text-xs font-black ${item.textColor}`}>
                        {item.count} errors ({pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-[#D6D2C4] h-1.5 rounded-[1px] overflow-hidden border border-[#141416]">
                      <div className={`${item.color} h-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>

                    <p className="text-[10px] text-[#5C5A52]">{item.desc}</p>

                    <div className="pt-1 border-t border-[#D5D2C8] text-[10px] font-bold text-[#141416]">
                      <span className="text-[#FF3B00]">Action:</span> {item.tactics}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DETAILED RECORDED SCORES TABLE */}
          <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#141416]">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-[#141416]">
                  Recorded Test Results History ({testScores.length} Exam Attempts)
                </h3>
                <p className="text-xs text-[#5C5A52]">Complete log of mock scores, negative marks, and test notes.</p>
              </div>

              <button
                onClick={() => onOpenLogScore()}
                className="te-btn-orange px-3.5 py-1.5 text-xs font-black uppercase cursor-pointer shrink-0"
              >
                + Record New Score
              </button>
            </div>

            {testScores.length === 0 ? (
              <div className="py-6 text-center text-[#5C5A52] text-xs bg-[#ECEAE4] border border-[#141416] rounded">
                No mock test scores logged yet.
              </div>
            ) : (
              <div className="divide-y-2 divide-[#E4E2DC] border-2 border-[#141416] rounded-[3px] bg-[#FAF9F6] max-h-80 overflow-y-auto">
                {[...testScores]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((score) => {
                    const percent = Math.round((score.totalScore / score.maxScore) * 100);
                    const sTier = getScoreConfidenceTier(score.totalScore, score.maxScore);
                    return (
                      <div key={score.id} className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FFFDF5] border-l-4 ${sTier.cardBorderClass}`}>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-[#141416] uppercase">{score.testName}</span>
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#141416] text-[#FAF9F6]">
                              {score.dateRecorded}
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${sTier.badgeClass}`}>
                              {score.totalScore} / {score.maxScore} ({percent}%) · {sTier.label}
                            </span>
                            {score.incorrectQuestions !== undefined && score.incorrectQuestions > 0 && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#DC2626] text-white">
                                -{score.incorrectQuestions} Bleed
                              </span>
                            )}
                          </div>

                          {/* Subject Scores strip */}
                          {score.subjectScores && (
                            <div className="flex items-center gap-2 text-[10px] font-bold pt-0.5 flex-wrap">
                              {(['Physics', 'Chemistry', 'Botany', 'Zoology'] as Subject[]).map((sub) => {
                                const marks = score.subjectScores?.[sub];
                                if (marks === undefined) return null;
                                return (
                                  <span key={sub} className="bg-[#ECEAE4] px-1.5 py-0.2 rounded border border-[#C5C3BB]">
                                    {sub}: <strong>{marks}</strong>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {score.errors && (
                            <div className="text-[10px] text-[#5C5A52] flex items-center gap-3 pt-0.5 flex-wrap">
                              <span>Silly: <strong className="text-[#FF3B00]">{score.errors.sillyMistakes || 0}</strong></span>
                              <span>Conceptual: <strong className="text-[#4D82FF]">{score.errors.conceptualGaps || 0}</strong></span>
                              <span>Memory: <strong className="text-[#9333EA]">{score.errors.memoryRecall || 0}</strong></span>
                              <span>Time: <strong className="text-[#EA580C]">{score.errors.timePressure || 0}</strong></span>
                            </div>
                          )}

                          {score.notes && (
                            <p className="text-[11px] text-[#5C5A52] italic bg-[#ECEAE4] px-2 py-0.5 rounded border border-[#D5D2C8] mt-1">
                              "{score.notes}"
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <button
                            onClick={() => onOpenLogScore(score.testId)}
                            className="px-3 py-1 text-xs font-black uppercase bg-[#ECEAE4] hover:bg-[#FAF9F6] border border-[#141416] rounded-[2px] cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Test Schedule Modal */}
      {isInternalPrintOpen && (
        <TestSchedulePrintModal
          isOpen={isInternalPrintOpen}
          onClose={() => setIsInternalPrintOpen(false)}
          tests={tests}
          chapters={chapters}
          testScores={testScores}
        />
      )}
    </div>
  );
};
