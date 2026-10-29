import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckSquare,
  Square,
  Search,
  Layers,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Chapter, StudyLog, Subject } from '../types';
import { getChapterRevisionInfo, getTodayStr } from '../services/spacedRepetition';
import { ConsistencyHeatmap } from './ConsistencyHeatmap';
import {
  getConfidenceTier,
  getPercentageConfidenceTier,
  getCountConfidenceTier,
  getOverdueDaysTier,
  CONFIDENCE_TIERS,
} from '../utils/confidenceColor';

interface AnalyticsDashboardProps {
  chapters: Chapter[];
  studyLogs: StudyLog[];
  tests: any[];
  testScores?: any[];
  pacingSettings?: any;
  onUpdatePacingSettings?: (settings: any) => void;
  onOpenQuickLogForChapter: (chapterId: string) => void;
  onNavigateToStrategy?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  chapters,
  studyLogs,
  tests,
  onOpenQuickLogForChapter,
}) => {
  const todayStr = getTodayStr();
  const activeChapters = useMemo(() => chapters.filter((c) => !c.isArchived), [chapters]);

  // Pillar Filters State
  const [isPillarMatrixCollapsed, setIsPillarMatrixCollapsed] = useState(false);
  const [pillarSearch, setPillarSearch] = useState('');
  const [pillarSubject, setPillarSubject] = useState<'ALL' | Subject>('ALL');
  const [pillarClass, setPillarClass] = useState<'ALL' | '11' | '12'>('ALL');
  const [pillarFilter, setPillarFilter] = useState<
    'ALL' | 'ALL_DONE' | 'INCOMPLETE' | 'MISSING_BOOK' | 'MISSING_ANKI' | 'MISSING_PYQ' | 'MISSING_LECTURES' | 'MISSING_NOTES'
  >('ALL');

  // Overall 5-Pillars Aggregation
  const pillarStats = useMemo(() => {
    const total = activeChapters.length;
    let lectures = 0;
    let book = 0;
    let notes = 0;
    let pyq = 0;
    let anki = 0;
    let allFive = 0;

    activeChapters.forEach((ch) => {
      const p = ch.pillars || {};
      const hasBook = Boolean(p.bookReading || p.ncertReading);
      if (p.lectures) lectures++;
      if (hasBook) book++;
      if (p.classNotes) notes++;
      if (p.questionPractice) pyq++;
      if (p.anki) anki++;
      if (p.lectures && hasBook && p.classNotes && p.questionPractice && p.anki) {
        allFive++;
      }
    });

    return {
      total,
      lectures,
      book,
      notes,
      pyq,
      anki,
      allFive,
      lecturesPct: total > 0 ? Math.round((lectures / total) * 100) : 0,
      bookPct: total > 0 ? Math.round((book / total) * 100) : 0,
      notesPct: total > 0 ? Math.round((notes / total) * 100) : 0,
      pyqPct: total > 0 ? Math.round((pyq / total) * 100) : 0,
      ankiPct: total > 0 ? Math.round((anki / total) * 100) : 0,
      allFivePct: total > 0 ? Math.round((allFive / total) * 100) : 0,
    };
  }, [activeChapters]);

  // Subject-wise Pillar Breakdown
  const subjectPillars = useMemo(() => {
    const subjects: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    return subjects.map((subj) => {
      const subjChapters = activeChapters.filter((c) => c.subject === subj);
      const total = subjChapters.length;
      let lectures = 0;
      let book = 0;
      let notes = 0;
      let pyq = 0;
      let anki = 0;
      let allDone = 0;

      subjChapters.forEach((c) => {
        const p = c.pillars || {};
        const hasBook = Boolean(p.bookReading || p.ncertReading);
        if (p.lectures) lectures++;
        if (hasBook) book++;
        if (p.classNotes) notes++;
        if (p.questionPractice) pyq++;
        if (p.anki) anki++;
        if (p.lectures && hasBook && p.classNotes && p.questionPractice && p.anki) allDone++;
      });

      return {
        subject: subj,
        total,
        lectures,
        book,
        notes,
        pyq,
        anki,
        allDone,
      };
    });
  }, [activeChapters]);

  // Filtered Chapters for Pillar Matrix Table
  const filteredPillarChapters = useMemo(() => {
    return activeChapters.filter((c) => {
      if (pillarSubject !== 'ALL' && c.subject !== pillarSubject) return false;
      if (pillarClass !== 'ALL' && c.classLevel !== pillarClass) return false;

      const p = c.pillars || {};
      const hasBook = Boolean(p.bookReading || p.ncertReading);
      const isAllDone = p.lectures && hasBook && p.classNotes && p.questionPractice && p.anki;

      if (pillarFilter === 'ALL_DONE' && !isAllDone) return false;
      if (pillarFilter === 'INCOMPLETE' && isAllDone) return false;
      if (pillarFilter === 'MISSING_BOOK' && hasBook) return false;
      if (pillarFilter === 'MISSING_ANKI' && p.anki) return false;
      if (pillarFilter === 'MISSING_PYQ' && p.questionPractice) return false;
      if (pillarFilter === 'MISSING_LECTURES' && p.lectures) return false;
      if (pillarFilter === 'MISSING_NOTES' && p.classNotes) return false;

      if (pillarSearch.trim()) {
        const q = pillarSearch.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchUnit = (c.clusterId || '').toLowerCase().includes(q);
        return matchName || matchUnit;
      }

      return true;
    });
  }, [activeChapters, pillarSubject, pillarClass, pillarFilter, pillarSearch]);

  // Subject-wise metrics & confidence distribution
  const subjectMetrics = useMemo(() => {
    const subjects: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    return subjects.map((subj) => {
      const subjChapters = activeChapters.filter((c) => c.subject === subj);
      const total = subjChapters.length;
      const studied = subjChapters.filter((c) => c.currentConfidence > 0);
      const studiedCount = studied.length;

      const avgConfidence =
        studiedCount > 0
          ? Math.round((studied.reduce((sum, c) => sum + c.currentConfidence, 0) / studiedCount) * 10) / 10
          : 0;

      const strongCount = subjChapters.filter((c) => c.currentConfidence >= 4).length;
      const weakCount = subjChapters.filter((c) => c.currentConfidence > 0 && c.currentConfidence <= 2).length;
      const unstudiedCount = subjChapters.filter((c) => c.currentConfidence === 0).length;

      // Calculate confidence delta over recent study logs (last 7 days)
      const subjLogs = studyLogs
        .filter((l) => {
          const ch = chapters.find((c) => c.id === l.chapterId);
          return ch && ch.subject === subj;
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
      let trendDelta = 0;

      if (subjLogs.length >= 2) {
        const recent = subjLogs.slice(0, 3);
        const older = subjLogs.slice(3, 8);
        if (older.length > 0) {
          const recentAvg = recent.reduce((sum, l) => sum + l.confidenceRating, 0) / recent.length;
          const olderAvg = older.reduce((sum, l) => sum + l.confidenceRating, 0) / older.length;
          trendDelta = Math.round((recentAvg - olderAvg) * 10) / 10;
          if (trendDelta > 0.2) trendDirection = 'up';
          else if (trendDelta < -0.2) trendDirection = 'down';
        }
      }

      return {
        subject: subj,
        total,
        studiedCount,
        avgConfidence,
        strongCount,
        weakCount,
        unstudiedCount,
        trendDirection,
        trendDelta: Math.abs(trendDelta),
      };
    });
  }, [activeChapters, chapters, studyLogs]);

  // Critical Risk / Weak chapters that are overdue
  const criticalRiskChapters = useMemo(() => {
    return activeChapters
      .filter((c) => c.currentConfidence > 0 && c.currentConfidence <= 2)
      .map((c) => ({
        chapter: c,
        info: getChapterRevisionInfo(c, tests, todayStr),
      }))
      .filter((x) => x.info.status === 'overdue' || x.info.status === 'due_today' || x.info.status === 'due_soon')
      .sort((a, b) => a.info.daysDiff - b.info.daysDiff);
  }, [activeChapters, tests, todayStr]);

  const subjectBadge = (subject: string) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#0047FF] text-white';
      case 'Chemistry':
        return 'bg-[#9333EA] text-white';
      case 'Botany':
        return 'bg-[#FFB800] text-[#141416] font-black';
      case 'Zoology':
        return 'bg-[#FF5000] text-white font-black';
      default:
        return 'bg-[#141416] text-white';
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* SECTION 1: 52-WEEK STUDY CONSISTENCY HEATMAP */}
      <ConsistencyHeatmap studyLogs={studyLogs} />

      {/* SECTION 2: NEET 4 PILLARS TELEMETRY DASHBOARD */}
      <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b-2 border-[#141416] mx-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#FF3B00] rounded-[1px] animate-pulse"></span>
              <span className="text-xs font-black text-[#FF3B00] uppercase tracking-wider">
                NEET 2026–27 SYLLABUS PILLAR ANALYTICS
              </span>
            </div>
            <h2 className="font-mono text-base sm:text-lg font-black text-[#141416] uppercase tracking-tight flex items-center gap-2 mt-0.5">
              <Layers className="w-4 h-4 text-[#FF3B00]" />
              <span>5-Pillar Syllabus Readiness Engine</span>
            </h2>
            <p className="text-xs text-[#5C5A52] mt-0.5">
              Quantifies multi-pillar coverage across all {pillarStats.total} chapters (Lectures, Book Reading, Notes, PYQs, Anki Flashcards).
            </p>
          </div>

          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border-2 border-[#141416] text-right shrink-0">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">Penta-Pillar Mastered</span>
            {(() => {
              const pentaTier = getPercentageConfidenceTier(pillarStats.allFivePct);
              return (
                <span className={`text-lg font-black block ${pentaTier.textClass}`}>
                  {pillarStats.allFive} / {pillarStats.total} ({pillarStats.allFivePct}%)
                </span>
              );
            })()}
          </div>
        </div>

        {/* 5 Pillars Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 my-4 mx-2">
          {/* Pillar 1 */}
          {(() => {
            const tier = getPercentageConfidenceTier(pillarStats.lecturesPct);
            return (
              <div className={`p-3 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] border-l-4 ${tier.cardBorderClass} shadow-[2px_2px_0px_#141416] space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-[#5C5A52]">Pillar 01</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${tier.badgeClass}`}>
                    {pillarStats.lecturesPct}% Done
                  </span>
                </div>
                <div className="text-xs font-black text-[#141416] uppercase truncate">1. Video Lectures</div>
                <div className={`text-base font-black ${tier.textClass}`}>
                  {pillarStats.lectures} <span className="text-[10px] text-[#5C5A52] font-normal">/ {pillarStats.total} Chs</span>
                </div>
                <div className="w-full bg-[#D6D2C4] h-2 rounded-[2px] overflow-hidden border border-[#141416]">
                  <div className={`h-full ${tier.bgClass}`} style={{ width: `${pillarStats.lecturesPct}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Pillar 2 */}
          {(() => {
            const tier = getPercentageConfidenceTier(pillarStats.bookPct);
            return (
              <div className={`p-3 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] border-l-4 ${tier.cardBorderClass} shadow-[2px_2px_0px_#141416] space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-[#5C5A52]">Pillar 02</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${tier.badgeClass}`}>
                    {pillarStats.bookPct}% Done
                  </span>
                </div>
                <div className="text-xs font-black text-[#141416] uppercase truncate">2. Book Reading</div>
                <div className={`text-base font-black ${tier.textClass}`}>
                  {pillarStats.book} <span className="text-[10px] text-[#5C5A52] font-normal">/ {pillarStats.total} Chs</span>
                </div>
                <div className="w-full bg-[#D6D2C4] h-2 rounded-[2px] overflow-hidden border border-[#141416]">
                  <div className={`h-full ${tier.bgClass}`} style={{ width: `${pillarStats.bookPct}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Pillar 3 */}
          {(() => {
            const tier = getPercentageConfidenceTier(pillarStats.notesPct);
            return (
              <div className={`p-3 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] border-l-4 ${tier.cardBorderClass} shadow-[2px_2px_0px_#141416] space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-[#5C5A52]">Pillar 03</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${tier.badgeClass}`}>
                    {pillarStats.notesPct}% Done
                  </span>
                </div>
                <div className="text-xs font-black text-[#141416] uppercase truncate">3. Notes & Formulas</div>
                <div className={`text-base font-black ${tier.textClass}`}>
                  {pillarStats.notes} <span className="text-[10px] text-[#5C5A52] font-normal">/ {pillarStats.total} Chs</span>
                </div>
                <div className="w-full bg-[#D6D2C4] h-2 rounded-[2px] overflow-hidden border border-[#141416]">
                  <div className={`h-full ${tier.bgClass}`} style={{ width: `${pillarStats.notesPct}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Pillar 4 */}
          {(() => {
            const tier = getPercentageConfidenceTier(pillarStats.pyqPct);
            return (
              <div className={`p-3 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] border-l-4 ${tier.cardBorderClass} shadow-[2px_2px_0px_#141416] space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-[#5C5A52]">Pillar 04</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${tier.badgeClass}`}>
                    {pillarStats.pyqPct}% Done
                  </span>
                </div>
                <div className="text-xs font-black text-[#141416] uppercase truncate">4. PYQs & Practice</div>
                <div className={`text-base font-black ${tier.textClass}`}>
                  {pillarStats.pyq} <span className="text-[10px] text-[#5C5A52] font-normal">/ {pillarStats.total} Chs</span>
                </div>
                <div className="w-full bg-[#D6D2C4] h-2 rounded-[2px] overflow-hidden border border-[#141416]">
                  <div className={`h-full ${tier.bgClass}`} style={{ width: `${pillarStats.pyqPct}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Pillar 5 */}
          {(() => {
            const tier = getPercentageConfidenceTier(pillarStats.ankiPct);
            return (
              <div className={`p-3 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] border-l-4 ${tier.cardBorderClass} shadow-[2px_2px_0px_#141416] space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-[#5C5A52]">Pillar 05</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${tier.badgeClass}`}>
                    {pillarStats.ankiPct}% Done
                  </span>
                </div>
                <div className="text-xs font-black text-[#141416] uppercase truncate">5. Anki Flashcards</div>
                <div className={`text-base font-black ${tier.textClass}`}>
                  {pillarStats.anki} <span className="text-[10px] text-[#5C5A52] font-normal">/ {pillarStats.total} Chs</span>
                </div>
                <div className="w-full bg-[#D6D2C4] h-2 rounded-[2px] overflow-hidden border border-[#141416]">
                  <div className={`h-full ${tier.bgClass}`} style={{ width: `${pillarStats.ankiPct}%` }} />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Subject-Wise Pillars Breakdown Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mx-2 mt-2">
          {subjectPillars.map((sp) => {
            const allDoneTier = getPercentageConfidenceTier(sp.total > 0 ? (sp.allDone / sp.total) * 100 : 0);
            return (
              <div key={sp.subject} className={`p-2.5 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${allDoneTier.cardBorderClass} rounded-[3px] space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-[2px] ${subjectBadge(sp.subject)}`}>
                    {sp.subject} ({sp.total} Chs)
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${allDoneTier.badgeClass}`}>
                    {sp.allDone}/{sp.total} Full
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center text-[9px] pt-1">
                  <div className="p-1 bg-[#ECEAE4] rounded">
                    <div className="text-[#5C5A52]">Lec</div>
                    <div className={`font-black ${getPercentageConfidenceTier(sp.total > 0 ? (sp.lectures / sp.total) * 100 : 0).textClass}`}>{sp.lectures}</div>
                  </div>
                  <div className="p-1 bg-[#ECEAE4] rounded">
                    <div className="text-[#5C5A52]">Book</div>
                    <div className={`font-black ${getPercentageConfidenceTier(sp.total > 0 ? (sp.book / sp.total) * 100 : 0).textClass}`}>{sp.book}</div>
                  </div>
                  <div className="p-1 bg-[#ECEAE4] rounded">
                    <div className="text-[#5C5A52]">Notes</div>
                    <div className={`font-black ${getPercentageConfidenceTier(sp.total > 0 ? (sp.notes / sp.total) * 100 : 0).textClass}`}>{sp.notes}</div>
                  </div>
                  <div className="p-1 bg-[#ECEAE4] rounded">
                    <div className="text-[#5C5A52]">PYQs</div>
                    <div className={`font-black ${getPercentageConfidenceTier(sp.total > 0 ? (sp.pyq / sp.total) * 100 : 0).textClass}`}>{sp.pyq}</div>
                  </div>
                  <div className="p-1 bg-[#ECEAE4] rounded">
                    <div className="text-[#5C5A52]">Anki</div>
                    <div className={`font-black ${getPercentageConfidenceTier(sp.total > 0 ? (sp.anki / sp.total) * 100 : 0).textClass}`}>{sp.anki}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: CHAPTER-WISE PILLAR STATUS MATRIX WITH FILTERS (COLLAPSIBLE) */}
      <div className="te-chassis-card p-4 sm:p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#141416] mx-1">
          <div
            onClick={() => setIsPillarMatrixCollapsed(!isPillarMatrixCollapsed)}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <Filter className="w-4 h-4 text-[#FF3B00]" />
            <h3 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight group-hover:text-[#0047FF] transition-colors">
              Chapter-Wise Pillar Matrix ({filteredPillarChapters.length} Chapters)
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#ECEAE4] border border-[#141416] text-[#5C5A52]">
              {isPillarMatrixCollapsed ? 'Collapsed' : 'Active'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsPillarMatrixCollapsed(!isPillarMatrixCollapsed)}
              className="px-3 py-1.5 text-xs font-bold rounded-[2px] bg-[#ECEAE4] hover:bg-[#141416] hover:text-[#FAF9F6] text-[#141416] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isPillarMatrixCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-[#0047FF]" />
                  <span>Expand Matrix</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-[#FF3B00]" />
                  <span>Collapse Matrix</span>
                </>
              )}
            </button>
          </div>
        </div>

        {!isPillarMatrixCollapsed && (
          <>
            {/* Filter Controls Row */}
            <div className="mt-3 mx-1 space-y-3">
              <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8A82]" />
                  <input
                    type="text"
                    placeholder="Search chapter or unit..."
                    value={pillarSearch}
                    onChange={(e) => setPillarSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] placeholder:text-[#8C8A82] text-[#141416] font-bold focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Subject Selector */}
                <div className="flex items-center bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] p-0.5 overflow-x-auto">
                  {(['ALL', 'Physics', 'Chemistry', 'Botany', 'Zoology'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPillarSubject(s)}
                      className={`px-2 py-1 text-[10px] font-black uppercase rounded-[2px] whitespace-nowrap cursor-pointer transition-all ${
                        pillarSubject === s ? 'bg-[#141416] text-[#FAF9F6]' : 'text-[#5C5A52] hover:text-[#141416]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Class Selector */}
                <div className="flex items-center bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] p-0.5">
                  {(['ALL', '11', '12'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setPillarClass(c)}
                      className={`px-2 py-1 text-[10px] font-black uppercase rounded-[2px] cursor-pointer transition-all ${
                        pillarClass === c ? 'bg-[#141416] text-[#FAF9F6]' : 'text-[#5C5A52] hover:text-[#141416]'
                      }`}
                    >
                      {c === 'ALL' ? 'All Classes' : `Class ${c}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pillar Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Pillars Filter:</span>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'ALL_DONE', label: '✓ All 5 Done' },
                  { id: 'INCOMPLETE', label: '⏳ Incomplete' },
                  { id: 'MISSING_BOOK', label: '📕 Missing Book Reading' },
                  { id: 'MISSING_ANKI', label: '🗂️ Missing Anki' },
                  { id: 'MISSING_PYQ', label: '🎯 Missing PYQs' },
                  { id: 'MISSING_LECTURES', label: '📺 Missing Lectures' },
                  { id: 'MISSING_NOTES', label: '📝 Missing Notes' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPillarFilter(f.id as any)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-[2px] border cursor-pointer transition-all ${
                      pillarFilter === f.id
                        ? 'bg-[#FF3B00] text-white border-[#141416] shadow-sm font-black'
                        : 'bg-[#ECEAE4] text-[#5C5A52] border-[#C5C3BB] hover:text-[#141416]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chapters Pillar List Table */}
            {filteredPillarChapters.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5C5A52] mx-1 mt-4 bg-[#ECEAE4] rounded border border-[#141416]">
                No chapters match the selected pillar filters.
              </div>
            ) : (
              <div className="mt-4 mx-1 space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {filteredPillarChapters.map((ch) => {
                  const p = ch.pillars || {};
                  const pct = ch.completionPercentage || 0;
                  const pctTier = getPercentageConfidenceTier(pct);
                  const confTier = getConfidenceTier(ch.currentConfidence);
                  const hasBook = Boolean(p.bookReading || p.ncertReading);
                  const isAllDone = p.lectures && hasBook && p.classNotes && p.questionPractice && p.anki;

                  return (
                    <div
                      key={ch.id}
                      className={`p-3 rounded-[3px] border-2 border-l-4 ${confTier.cardBorderClass} flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isAllDone
                          ? 'bg-[#FAF9F6] border-[#141416]'
                          : pct > 0
                          ? 'bg-[#FFFDF5] border-[#141416]'
                          : 'bg-[#ECEAE4] border-[#141416]'
                      }`}
                    >
                      {/* Left */}
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${subjectBadge(ch.subject)}`}>
                            {ch.subject}
                          </span>
                          <span className="text-[9px] font-bold text-[#5C5A52] px-1.5 py-0.2 bg-[#FAF9F6] rounded border border-[#141416]">
                            Class {ch.classLevel || '11'} · Unit {ch.clusterId}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${pctTier.badgeClass}`}>
                            {pct}% DONE
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${confTier.badgeClass}`}>
                            L{ch.currentConfidence} {confTier.label}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-black text-[#141416] uppercase">
                          {ch.name}
                        </h4>
                      </div>

                      {/* Middle */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 shrink-0 bg-[#FAF9F6] p-2 rounded-[3px] border border-[#141416]">
                        <div className="flex items-center gap-1 text-[10px]">
                          {p.lectures ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#2563EB]" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#8C8A82]" />
                          )}
                          <span className={p.lectures ? 'font-bold text-[#141416]' : 'text-[#8C8A82]'}>1. Lec</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px]">
                          {hasBook ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#DC2626]" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#8C8A82]" />
                          )}
                          <span className={hasBook ? 'font-bold text-[#DC2626]' : 'text-[#8C8A82]'}>2. Book</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px]">
                          {p.classNotes ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#9333EA]" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#8C8A82]" />
                          )}
                          <span className={p.classNotes ? 'font-bold text-[#9333EA]' : 'text-[#8C8A82]'}>3. Notes</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px]">
                          {p.questionPractice ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#D97706]" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#8C8A82]" />
                          )}
                          <span className={p.questionPractice ? 'font-bold text-[#D97706]' : 'text-[#8C8A82]'}>4. PYQs</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px]">
                          {p.anki ? (
                            <CheckSquare className="w-3.5 h-3.5 text-[#0284C7]" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-[#8C8A82]" />
                          )}
                          <span className={p.anki ? 'font-bold text-[#0284C7]' : 'text-[#8C8A82]'}>5. Anki</span>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenQuickLogForChapter(ch.id)}
                          className="te-btn-orange px-3 py-1.5 text-xs font-black uppercase shadow-[1px_1px_0px_#141416]"
                        >
                          Log Study
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* SECTION 4: SUBJECT MASTERY & CONFIDENCE TRAJECTORIES */}
      <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="pb-3 border-b-2 border-[#141416] mb-4 mx-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0047FF]" />
            <h3 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight">
              Subject Mastery & Confidence Trajectories
            </h3>
          </div>
          <p className="text-xs text-[#5C5A52] mt-0.5">
            Subject confidence trajectories, syllabus coverage, and weak topic clusters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mx-2">
          {subjectMetrics.map((sm) => {
            const studiedPercent = sm.total > 0 ? Math.round((sm.studiedCount / sm.total) * 100) : 0;
            const avgTier = getConfidenceTier(Math.round(sm.avgConfidence));
            const studiedTier = getPercentageConfidenceTier(studiedPercent);

            return (
              <div
                key={sm.subject}
                className={`p-4 rounded-[4px] border-2 border-[#141416] border-l-4 ${avgTier.cardBorderClass} bg-[#ECEAE4] space-y-3 shadow-[2px_2px_0px_#141416]`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-[#141416] uppercase">{sm.subject}</span>
                  {sm.trendDirection === 'up' && (
                    <span className="inline-flex items-center text-[10px] font-bold text-[#FAF9F6] bg-[#141416] px-1.5 py-0.5 rounded-[2px]">
                      <ArrowUpRight className="w-3 h-3 text-[#2563EB]" /> +{sm.trendDelta}
                    </span>
                  )}
                  {sm.trendDirection === 'down' && (
                    <span className="inline-flex items-center text-[10px] font-bold text-white bg-[#DC2626] px-1.5 py-0.5 rounded-[2px]">
                      <ArrowDownRight className="w-3 h-3" /> {sm.trendDelta}
                    </span>
                  )}
                  {sm.trendDirection === 'neutral' && (
                    <span className="inline-flex items-center text-[10px] text-[#5C5A52] bg-[#D5D2C8] px-1.5 py-0.5 rounded-[2px]">
                      <Minus className="w-3 h-3" /> Steady
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-2xl font-black ${avgTier.textClass}`}>
                      {sm.avgConfidence > 0 ? `${sm.avgConfidence}` : '—'}
                    </span>
                    <span className="text-[10px] text-[#8C8A82]">/ 5.0 Scale ({avgTier.label})</span>
                  </div>
                  <div className="text-[11px] text-[#5C5A52] mt-0.5">
                    <strong className={studiedTier.textClass}>{sm.studiedCount}</strong> of {sm.total} chapters covered (<strong className={studiedTier.textClass}>{studiedPercent}%</strong>)
                  </div>
                </div>

                {/* Progress bar for mastery breakdown */}
                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-[#D5D2C8] rounded-[2px] overflow-hidden flex border border-[#141416]">
                    <div
                      style={{ width: `${sm.total > 0 ? (sm.strongCount / sm.total) * 100 : 0}%` }}
                      className="bg-[#2563EB]"
                      title="Strong (4-5)"
                    />
                    <div
                      style={{
                        width: `${
                          sm.total > 0 ? ((sm.studiedCount - sm.strongCount - sm.weakCount) / sm.total) * 100 : 0
                        }%`,
                      }}
                      className="bg-[#D97706]"
                      title="Moderate (3)"
                    />
                    <div
                      style={{ width: `${sm.total > 0 ? (sm.weakCount / sm.total) * 100 : 0}%` }}
                      className="bg-[#DC2626]"
                      title="Weak (1-2)"
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-[#5C5A52] font-bold">
                    <span className="text-[#2563EB]">{sm.strongCount} Strong</span>
                    <span className="text-[#DC2626]">{sm.weakCount} Weak</span>
                    <span className="text-[#64748B]">{sm.unstudiedCount} Unstudied</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: HIGH PRIORITY FOCUS (CONFIDENCE <= 2 & OVERDUE) */}
      <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex items-center justify-between pb-3 border-b-2 border-[#141416] mx-2">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
              <h3 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight">
                High Priority Focus (Confidence ≤ 2 & Overdue)
              </h3>
            </div>
            <p className="text-xs text-[#5C5A52] mt-0.5">
              Chapters with low confidence ratings that are past their scheduled revision date.
            </p>
          </div>
          <span className={`text-xs font-black px-2.5 py-1 rounded-[3px] border border-[#141416] shadow-[1px_1px_0px_#141416] ${criticalRiskChapters.length > 0 ? CONFIDENCE_TIERS[1].badgeClass : CONFIDENCE_TIERS[4].badgeClass}`}>
            {criticalRiskChapters.length} Urgent
          </span>
        </div>

        {criticalRiskChapters.length === 0 ? (
          <div className="py-8 text-center text-[#5C5A52] text-xs flex flex-col items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#2563EB] mb-2" />
            <span>All clear! No weak chapters are overdue for revision.</span>
          </div>
        ) : (
          <div className="mt-3 divide-y-2 divide-[#E4E2DC] mx-2">
            {criticalRiskChapters.map(({ chapter, info }) => {
              const chTier = getConfidenceTier(chapter.currentConfidence);
              const overdueTier = getOverdueDaysTier(Math.abs(info.daysDiff));
              return (
                <div
                  key={chapter.id}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 pl-2 ${chTier.cardBorderClass}`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-[2px] ${subjectBadge(chapter.subject)}`}>
                        {chapter.subject}
                      </span>
                      <span className="text-xs font-black text-[#141416] uppercase">{chapter.name}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-[2px] border border-[#141416] ${overdueTier.badgeClass}`}>
                        Overdue by {Math.abs(info.daysDiff)} {Math.abs(info.daysDiff) === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    <div className="text-xs text-[#5C5A52] mt-1">
                      Confidence:{' '}
                      <strong className={chTier.textClass}>
                        Level {chapter.currentConfidence}/5 ({chTier.label})
                      </strong>{' '}
                      • Last Studied: {info.daysSinceLastStudied !== null ? `${info.daysSinceLastStudied} days ago` : 'Never'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenQuickLogForChapter(chapter.id)}
                    className="te-btn-orange px-3.5 py-1.5 text-xs cursor-pointer self-start sm:self-auto font-bold"
                  >
                    Revise Now
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
