import React, { useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Zap,
  BookOpen,
  Sparkles,
  Flame,
  CheckSquare,
  Square,
  ShieldAlert,
  Printer,
} from 'lucide-react';
import { Chapter, LearningStage, StudyLog, Test } from '../types';
import { calculateMemoryRetention, getChapterRevisionInfo, getDaysDifference, getTodayStr } from '../services/spacedRepetition';
import { getConfidenceTier } from '../utils/confidenceColor';
import { sound } from '../services/soundEffects';

interface TestRadarFocusProps {
  chapters: Chapter[];
  tests: Test[];
  studyLogs: StudyLog[];
  onOpenQuickLogForChapter: (chapterId: string) => void;
  onOpenAddTest?: () => void;
  onOpenPrintSchedule?: () => void;
  onQuickUpdateStage?: (chapterId: string, newStage: LearningStage) => void;
  onNavigateToSyllabus: () => void;
  onNavigateToTests: () => void;
}

export const TestRadarFocus: React.FC<TestRadarFocusProps> = ({
  chapters,
  tests,
  onOpenQuickLogForChapter,
  onNavigateToSyllabus,
  onOpenPrintSchedule,
}) => {
  const todayStr = getTodayStr();

  // Active chapters
  const activeChapters = useMemo(() => chapters.filter((c) => !c.isArchived), [chapters]);
  const chapterMap = useMemo(() => {
    const map = new Map<string, Chapter>();
    activeChapters.forEach((c) => map.set(c.id, c));
    return map;
  }, [activeChapters]);

  // Telemetry counts
  const notStartedChapters = useMemo(() => {
    return activeChapters.filter((c) => {
      const info = getChapterRevisionInfo(c, tests, todayStr);
      return info.learningStage === 'NOT_STARTED' || (info.completionPercentage === 0 && !c.lastStudiedDate);
    });
  }, [activeChapters, tests, todayStr]);

  const inProgressChapters = useMemo(() => {
    return activeChapters.filter((c) => {
      const info = getChapterRevisionInfo(c, tests, todayStr);
      return info.learningStage === 'IN_PROGRESS' || (info.completionPercentage > 0 && info.completionPercentage < 100);
    });
  }, [activeChapters, tests, todayStr]);

  const completedFirstPassChapters = useMemo(() => {
    return activeChapters.filter((c) => {
      const info = getChapterRevisionInfo(c, tests, todayStr);
      return (
        info.learningStage === 'FIRST_PASS_DONE' ||
        info.learningStage === 'IN_REVISION' ||
        info.completionPercentage >= 100
      );
    });
  }, [activeChapters, tests, todayStr]);

  const syllabusPercent =
    activeChapters.length > 0
      ? Math.round((completedFirstPassChapters.length / activeChapters.length) * 100)
      : 0;

  // Upcoming tests sorted by date - radar always uses the nearest upcoming exam
  const upcomingTests = useMemo(() => {
    return tests
      .map((t) => {
        const daysAway = getDaysDifference(todayStr, t.date);
        return { ...t, daysAway };
      })
      .filter((t) => t.daysAway >= 0)
      .sort((a, b) => a.daysAway - b.daysAway);
  }, [tests, todayStr]);

  const activeTest = upcomingTests.length > 0 ? upcomingTests[0] : null;

  // Breakdown of chapters for the active test
  const testChapterBreakdown = useMemo(() => {
    if (!activeTest) return { notStarted: [], inProgress: [], revisionDue: [], mastered: [], all: [] };

    const testChapters = activeTest.linkedChapterIds
      .map((id) => chapterMap.get(id))
      .filter((c): c is Chapter => Boolean(c));

    const notStarted: Chapter[] = [];
    const inProgress: Chapter[] = [];
    const revisionDue: Chapter[] = [];
    const mastered: Chapter[] = [];

    testChapters.forEach((c) => {
      const info = getChapterRevisionInfo(c, tests, todayStr);
      if (info.learningStage === 'NOT_STARTED' || (info.completionPercentage === 0 && !c.lastStudiedDate)) {
        notStarted.push(c);
      } else if (info.learningStage === 'IN_PROGRESS' || info.completionPercentage < 100) {
        inProgress.push(c);
      } else if (info.status === 'overdue' || info.status === 'due_today' || c.currentConfidence <= 2) {
        revisionDue.push(c);
      } else {
        mastered.push(c);
      }
    });

    return { notStarted, inProgress, revisionDue, mastered, all: testChapters };
  }, [activeTest, chapterMap, tests, todayStr]);

  // Spaced revision queue for ONLY completed 1st pass chapters
  const overdueOrDueTodayChapters = useMemo(() => {
    return completedFirstPassChapters
      .filter((c) => {
        const info = getChapterRevisionInfo(c, tests, todayStr);
        return info.status === 'overdue' || info.status === 'due_today';
      })
      .sort((a, b) => {
        const infoA = getChapterRevisionInfo(a, tests, todayStr);
        const infoB = getChapterRevisionInfo(b, tests, todayStr);
        return infoA.daysDiff - infoB.daysDiff;
      });
  }, [completedFirstPassChapters, tests, todayStr]);

  // Subject pill color helper
  const subjectBadge = (subject: string) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#2563EB] text-white border-[#18181B]';
      case 'Chemistry':
        return 'bg-[#7C3AED] text-white border-[#18181B]';
      case 'Botany':
        return 'bg-[#F59E0B] text-[#18181B] border-[#18181B] font-black';
      case 'Zoology':
        return 'bg-[#EA580C] text-white border-[#18181B] font-black';
      default:
        return 'bg-[#27272A] text-white border-[#18181B]';
    }
  };

  const testReadinessPercent =
    testChapterBreakdown.all.length > 0
      ? Math.round(
          ((testChapterBreakdown.mastered.length + testChapterBreakdown.revisionDue.length) /
            testChapterBreakdown.all.length) *
            100
        )
      : 0;

  // Minimal Critical Decay Indicator for Main Page
  const criticalDecayChapters = useMemo(() => {
    return activeChapters
      .map((c) => ({ chapter: c, retention: calculateMemoryRetention(c, todayStr) }))
      .filter((x) => x.retention.decayStatus === 'critical')
      .sort((a, b) => a.retention.retentionPct - b.retention.retentionPct);
  }, [activeChapters, todayStr]);

  return (
    <div className="space-y-6 font-mono">
      {/* Minimal Critical Decay Alert Banner if any topic is in critical decay (<50%) */}
      {criticalDecayChapters.length > 0 && (
        <div className="p-3 bg-[#FFF5F5] border-2 border-[#FF3B00] rounded-[4px] shadow-[2px_2px_0px_#FF3B00] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FF3B00] shrink-0" />
            <div className="text-xs">
              <span className="font-black text-[#FF3B00] uppercase">Critical Memory Decay Alert: </span>
              <span className="text-[#141416] font-bold">
                {criticalDecayChapters.length} {criticalDecayChapters.length === 1 ? 'topic is' : 'topics are'} below 50% memory retention (Ebbinghaus decay).
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenQuickLogForChapter(criticalDecayChapters[0].chapter.id)}
              className="px-3 py-1 bg-[#FF3B00] hover:bg-[#E03400] text-white text-[11px] font-black uppercase rounded-[2px] border border-[#141416] cursor-pointer"
            >
              Rescue: {criticalDecayChapters[0].chapter.name}
            </button>
          </div>
        </div>
      )}

      {/* 1. Industrial Readiness Telemetry Banner */}
      <div className="te-chassis-card p-4 sm:p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b-2 border-[#141416]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#FF3B00] rounded-[1px] animate-pulse"></span>
              <span className="text-xs font-black text-[#FF3B00] uppercase tracking-wider">
                OP-PCB STUDY MISSION DESK
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-[#141416] uppercase tracking-tight flex items-center gap-2 mt-0.5">
              <span>Zero-to-Complete NEET Study & Exam Radar</span>
            </h2>
            <p className="text-xs text-[#5C5A52] mt-0.5">
              Track multi-day 1st pass study, automatically align to your nearest exam mission, and review spaced revisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToSyllabus}
              className="te-btn-mechanical px-3 py-1.5 text-xs font-bold bg-[#ECEAE4] cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Syllabus ({activeChapters.length})</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">1. In Progress (Active)</span>
            <span className="text-sm sm:text-base font-black text-[#FF3B00] mt-0.5 block">
              {inProgressChapters.length} Chapters
            </span>
            <div className="text-[9px] text-[#5C5A52] mt-1">Multi-day ongoing study</div>
          </div>

          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">2. Not Started (Zero)</span>
            <span className="text-sm sm:text-base font-black text-[#141416] mt-0.5 block">
              {notStartedChapters.length} Chapters
            </span>
            <div className="text-[9px] text-[#5C5A52] mt-1">Ready for 1st pass</div>
          </div>

          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">3. 1st Pass Mastered</span>
            <span className="text-sm sm:text-base font-black text-[#0047FF] mt-0.5 block">
              {completedFirstPassChapters.length} / {activeChapters.length} ({syllabusPercent}%)
            </span>
            <div className="w-full bg-[#D6D2C4] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-[#0047FF] h-full" style={{ width: `${syllabusPercent}%` }} />
            </div>
          </div>

          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">4. Revision Due Today</span>
            <span className="text-sm sm:text-base font-black text-[#141416] mt-0.5 block">
              {overdueOrDueTodayChapters.length} Reviews
            </span>
            <div className="text-[9px] text-[#5C5A52] mt-1">Spaced repetition only</div>
          </div>
        </div>
      </div>

      {/* LANE 1: ACTIVE IN-PROGRESS CHAPTERS */}
      <div id="lane-in-progress" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#141416]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#FF3B00] rounded-[1px]"></span>
            <span className="text-xs font-black uppercase tracking-wider text-[#FF3B00]">LANE 01</span>
            <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] tracking-tight">
              Finish What You Started // Active In-Progress Chapters ({inProgressChapters.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#5C5A52]">
            {inProgressChapters.length === 0 ? 'No active chapters' : 'Complete 1st pass before moving to revision'}
          </span>
        </div>

        {inProgressChapters.length === 0 ? (
          <div className="mt-4 p-6 bg-[#ECEAE4] border-2 border-dashed border-[#C5C3BB] rounded-[4px] text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#141416] flex items-center justify-center mx-auto text-[#FF3B00]">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs text-[#141416] font-black uppercase">
              No Chapters Currently In Progress
            </p>
            <p className="text-[11px] text-[#5C5A52] max-w-md mx-auto">
              Pick an unstarted chapter from your upcoming test mission below to begin your 1st Pass.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {inProgressChapters.map((ch) => {
              const info = getChapterRevisionInfo(ch, tests, todayStr);
              const pct = info.completionPercentage || 25;
              const daysActive = info.daysActive || 1;
              const pillars = ch.pillars || {};

              return (
                <div
                  key={ch.id}
                  className="p-4 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] flex flex-col justify-between space-y-3"
                >
                  {/* Top: Badges & Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-[2px] border ${subjectBadge(
                            ch.subject
                          )}`}
                        >
                          {ch.subject}
                        </span>
                        <span className="text-[10px] font-bold text-[#5C5A52] px-1.5 py-0.5 bg-[#FAF9F6] rounded-[2px] border border-[#141416]">
                          Class {ch.classLevel || '11'} · Unit {ch.clusterId}
                        </span>
                      </div>

                      <span className="text-[10px] font-black px-2 py-0.5 rounded-[2px] bg-[#141416] text-[#FFB800] border border-[#141416]">
                        {pct}% DONE
                      </span>
                    </div>

                    <h4 className="text-sm font-black uppercase text-[#141416] leading-tight">
                      {ch.name}
                    </h4>

                    {/* Days active & sessions tracker */}
                    <div className="flex items-center gap-2 text-[10px] text-[#5C5A52] flex-wrap">
                      <span className="flex items-center gap-1 text-[#FF3B00] font-bold">
                        <Flame className="w-3 h-3" />
                        <span>Day {daysActive} of study</span>
                      </span>
                      <span>•</span>
                      <span>Started: {ch.startedDate || ch.lastStudiedDate || 'Recently'}</span>
                      <span>•</span>
                      <span>{ch.totalStudySessions || 1} session(s) logged</span>
                    </div>
                  </div>

                  {/* Middle: Visual Completion Progress Bar */}
                  <div className="space-y-1 bg-[#FAF9F6] p-2.5 rounded-[3px] border border-[#141416]">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-[#141416]">
                      <span>Chapter Progress</span>
                      <span>{pct}% / 100%</span>
                    </div>
                    <div className="w-full bg-[#E5E3DC] h-2 rounded-[2px] overflow-hidden border border-[#141416]">
                      <div
                        className="bg-[#FF3B00] h-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenQuickLogForChapter(ch.id)}
                      className="te-btn-orange px-3 py-1.5 text-xs font-black cursor-pointer flex-1 flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#141416]"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>+ Continue Study Session</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LANE 2: UPCOMING TEST MISSION RADAR (AUTOMATICALLY ANCHORS TO NEAREST TEST) */}
      <div id="lane-test-mission" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        {/* Header of Test Radar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b-2 border-[#141416]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#0047FF] rounded-[1px]"></span>
              <span className="text-xs font-black uppercase tracking-wider text-[#0047FF]">LANE 02</span>
              <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] tracking-tight">
                Upcoming Exam Mission // Target Test Readiness
              </h3>
            </div>
            <p className="text-xs text-[#5C5A52] mt-0.5">
              Evaluates test syllabus chapters to pinpoint zero-coverage topics you must finish before exam day.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenPrintSchedule && (
              <button
                type="button"
                id="radar-print-test-schedule-btn"
                onClick={() => {
                  sound.playButtonClick();
                  onOpenPrintSchedule();
                }}
                className="te-btn-mechanical px-2.5 py-1 text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer bg-[#FAF9F6] border-2 border-[#141416] hover:bg-[#141416] hover:text-[#FAF9F6] transition-colors"
                title="Printable PDF Test Series Schedule"
              >
                <Printer className="w-3.5 h-3.5 text-[#FF3B00]" />
                <span>Print Schedule (PDF)</span>
              </button>
            )}
          </div>
        </div>

        {activeTest ? (
          <div className="mt-4 space-y-4">
            {/* Active Test Target Card */}
            <div className="p-3.5 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2 py-0.5 rounded-[2px] bg-[#FF3B00] text-white uppercase">
                    {activeTest.daysAway === 0
                      ? 'TODAY'
                      : activeTest.daysAway === 1
                      ? 'TOMORROW'
                      : `EXAM IN ${activeTest.daysAway} DAYS`}
                  </span>
                  <span className="text-xs font-bold text-[#141416]">
                    Date: <strong>{activeTest.date}</strong>
                  </span>
                  {activeTest.coachingName && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#FAF9F6] border border-[#141416] font-bold">
                      {activeTest.coachingName}
                    </span>
                  )}
                </div>

                <h4 className="text-base font-black uppercase text-[#141416]">
                  {activeTest.name}
                </h4>
                <p className="text-xs text-[#5C5A52]">
                  Syllabus: {activeTest.subjectOrScope || `${activeTest.linkedChapterIds.length} Chapters Linked`}
                </p>
              </div>

              {/* Test Readiness Score */}
              <div className="p-3 bg-[#FAF9F6] rounded-[3px] border border-[#141416] text-right shrink-0 min-w-[170px]">
                <div className="text-[10px] font-black uppercase text-[#5C5A52]">Test Syllabus Readiness</div>
                <div className="text-xl font-black text-[#141416] mt-0.5">{testReadinessPercent}%</div>
                <div className="w-full bg-[#ECEAE4] h-1.5 rounded-full overflow-hidden mt-1 border border-[#141416]">
                  <div className="bg-[#0047FF] h-full" style={{ width: `${testReadinessPercent}%` }} />
                </div>
              </div>
            </div>

            {/* CRITICAL ZERO-COVERAGE MISSION ALERT */}
            {testChapterBreakdown.notStarted.length > 0 && (
              <div className="p-3.5 bg-[#FF3B00]/10 rounded-[4px] border-2 border-[#FF3B00] shadow-[2px_2px_0px_#FF3B00] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#FF3B00] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-black uppercase text-[#FF3B00]">
                      🚨 ZERO COVERAGE ALERT: {testChapterBreakdown.notStarted.length} Unstarted Chapters for this Exam!
                    </h5>
                    <p className="text-[11px] text-[#5C5A52] mt-0.5">
                      Prioritize lectures & NCERT readings for these chapters immediately!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4 Categorized Columns for Test Chapters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Column 1: Zero-Coverage / Not Started (URGENT) */}
              <div className="p-3.5 bg-[#FAF9F6] rounded-[4px] border-2 border-[#FF3B00] shadow-[2px_2px_0px_#FF3B00] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#FF3B00]/30 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#FF3B00] uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#FF3B00]"></span>
                    <span>1. Zero Coverage / Not Started ({testChapterBreakdown.notStarted.length})</span>
                  </div>
                  <span className="text-[10px] text-[#5C5A52] font-bold">Priority #1</span>
                </div>

                {testChapterBreakdown.notStarted.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#0047FF] font-bold bg-[#ECEAE4] rounded-[2px]">
                    ✓ No unstudied chapters! You've started or finished all syllabus.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {testChapterBreakdown.notStarted.map((ch) => (
                      <div
                        key={ch.id}
                        className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416] flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${subjectBadge(ch.subject)}`}>
                              {ch.subject}
                            </span>
                            <span className="text-[9px] text-[#5C5A52] font-bold">Class {ch.classLevel || '11'}</span>
                          </div>
                          <div className="text-xs font-black text-[#141416]">{ch.name}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenQuickLogForChapter(ch.id)}
                          className="te-btn-orange px-2.5 py-1 text-[10px] font-black uppercase shrink-0 shadow-[1px_1px_0px_#141416]"
                        >
                          Start 1st Pass
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: In Progress for Test */}
              <div className="p-3.5 bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#141416] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#141416] uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#FFB800]"></span>
                    <span>2. In Progress ({testChapterBreakdown.inProgress.length})</span>
                  </div>
                  <span className="text-[10px] text-[#5C5A52] font-bold">Finish 1st Pass</span>
                </div>

                {testChapterBreakdown.inProgress.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#5C5A52] font-bold bg-[#ECEAE4] rounded-[2px]">
                    No chapters currently midway for this exam.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {testChapterBreakdown.inProgress.map((ch) => {
                      const pct = ch.completionPercentage || 25;
                      return (
                        <div
                          key={ch.id}
                          className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416] flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${subjectBadge(ch.subject)}`}>
                                {ch.subject}
                              </span>
                              <span className="text-[9px] font-bold text-[#FF3B00]">{pct}% Done</span>
                            </div>
                            <div className="text-xs font-black text-[#141416] truncate">{ch.name}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenQuickLogForChapter(ch.id)}
                            className="te-btn-mechanical px-2.5 py-1 text-[10px] font-black uppercase shrink-0 bg-[#FAF9F6]"
                          >
                            Continue
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Column 3: Revision Due for Test */}
              <div className="p-3.5 bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#141416] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#141416] uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#0047FF]"></span>
                    <span>3. Revision Due / Weak ({testChapterBreakdown.revisionDue.length})</span>
                  </div>
                  <span className="text-[10px] text-[#5C5A52] font-bold">Refresher Needed</span>
                </div>

                {testChapterBreakdown.revisionDue.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#5C5A52] font-bold bg-[#ECEAE4] rounded-[2px]">
                    No test chapters overdue for revision.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {testChapterBreakdown.revisionDue.map((ch) => {
                      const chTier = getConfidenceTier(ch.currentConfidence);
                      return (
                        <div
                          key={ch.id}
                          className={`p-2.5 bg-[#ECEAE4] rounded-[3px] border-2 border-[#141416] border-l-4 ${chTier.cardBorderClass} flex items-center justify-between gap-2`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${subjectBadge(ch.subject)}`}>
                                {ch.subject}
                              </span>
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${chTier.badgeClass}`}>
                                ★ L{ch.currentConfidence || 0}
                              </span>
                            </div>
                            <div className="text-xs font-black text-[#141416]">{ch.name}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenQuickLogForChapter(ch.id)}
                            className="te-btn-mechanical px-2.5 py-1 text-[10px] font-black uppercase shrink-0 bg-[#FAF9F6]"
                          >
                            Revise
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Column 4: Mastered / Exam Ready */}
              <div className="p-3.5 bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#141416] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#0047FF] uppercase">
                    <CheckCircle className="w-3.5 h-3.5 text-[#0047FF]" />
                    <span>4. Exam Ready / Mastered ({testChapterBreakdown.mastered.length})</span>
                  </div>
                  <span className="text-[10px] text-[#5C5A52] font-bold">Locked In</span>
                </div>

                {testChapterBreakdown.mastered.length === 0 ? (
                  <div className="text-center py-4 text-xs text-[#5C5A52] font-bold bg-[#ECEAE4] rounded-[2px]">
                    No chapters at ★4–5 yet. Keep practicing!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {testChapterBreakdown.mastered.map((ch) => {
                      const chTier = getConfidenceTier(ch.currentConfidence);
                      return (
                        <div
                          key={ch.id}
                          className={`p-2.5 bg-[#ECEAE4] rounded-[3px] border-2 border-[#141416] border-l-4 ${chTier.cardBorderClass} flex items-center justify-between gap-2`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${subjectBadge(ch.subject)}`}>
                                {ch.subject}
                              </span>
                              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${chTier.badgeClass}`}>
                                ★ L{ch.currentConfidence || 0}
                              </span>
                            </div>
                            <div className="text-xs font-black text-[#141416]">{ch.name}</div>
                          </div>

                          <span className="text-[10px] font-black text-[#0047FF] px-2 py-0.5 bg-[#FAF9F6] rounded border border-[#141416]">
                            ✓ Locked
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-8 text-center bg-[#ECEAE4] rounded-[4px] border-2 border-dashed border-[#141416] space-y-3">
            <Calendar className="w-8 h-8 mx-auto text-[#FF3B00]" />
            <div className="text-sm font-black uppercase text-[#141416]">No Upcoming Tests Linked</div>
            <p className="text-xs text-[#5C5A52] max-w-md mx-auto">
              All upcoming mock exam missions are tracked here automatically.
            </p>
          </div>
        )}
      </div>

      {/* LANE 3: SPACED REPETITION RADAR (ONLY 100% COMPLETED CHAPTERS) */}
      <div id="lane-spaced-repetition" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#141416]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#9333EA] rounded-[1px]"></span>
            <span className="text-xs font-black uppercase tracking-wider text-[#9333EA]">LANE 03</span>
            <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] tracking-tight">
              Spaced Repetition Radar // 100% Completed Chapters ({completedFirstPassChapters.length})
            </h3>
          </div>
          <span className="text-[11px] text-[#5C5A52]">
            Cycles: Day 3 → 7 → 14 → 30 (Active only after 1st pass is finished)
          </span>
        </div>

        {overdueOrDueTodayChapters.length === 0 ? (
          <div className="mt-4 p-5 bg-[#ECEAE4] rounded-[4px] border border-[#141416] text-center text-xs text-[#5C5A52]">
            ✓ All completed chapters are up to date on their revision schedule!
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {overdueOrDueTodayChapters.map((ch) => {
              const info = getChapterRevisionInfo(ch, tests, todayStr);
              const isOverdue = info.status === 'overdue';
              const chTier = getConfidenceTier(ch.currentConfidence);

              return (
                <div
                  key={ch.id}
                  className={`p-3 bg-[#ECEAE4] rounded-[3px] border-2 border-[#141416] border-l-4 ${chTier.cardBorderClass} shadow-[2px_2px_0px_#141416] flex flex-col sm:flex-row sm:items-center justify-between gap-2`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-[2px] ${subjectBadge(ch.subject)}`}>
                        {ch.subject}
                      </span>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-[2px] border ${
                          isOverdue
                            ? 'bg-[#FF3B00] text-white border-[#141416] animate-pulse'
                            : 'bg-[#FFB800] text-[#141416] border-[#141416]'
                        }`}
                      >
                        {isOverdue ? `OVERDUE BY ${Math.abs(info.daysDiff)} DAYS` : 'DUE TODAY'}
                      </span>

                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${chTier.badgeClass}`}>
                        Rev #{ch.revisionCount || 1} · ★ L{ch.currentConfidence || 0}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black uppercase text-[#141416]">
                      {ch.name}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenQuickLogForChapter(ch.id)}
                    className="te-btn-orange px-3 py-1.5 text-xs font-black uppercase shrink-0 shadow-[1px_1px_0px_#141416]"
                  >
                    Log Revision Round
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LANE 4: EBBINGHAUS MEMORY DECAY & RECALL RESCUE WATCHLIST */}
      <div id="lane-critical-memory-decay" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] space-y-4">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#141416]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#FF3B00] rounded-[1px] animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-wider text-[#FF3B00]">LANE 04 // MEMORY WATCHLIST</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#141416] text-[#FAF9F6] font-bold uppercase">
                R(t) = e^(-t/S)
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] tracking-tight mt-0.5 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#FF3B00]" />
              Critical Memory Decay Watchlist & Recall Rescues ({criticalDecayChapters.length} Critical)
            </h3>
          </div>
          <span className="text-[11px] text-[#5C5A52]">
            Chapters dropping below 50% retention risk rapid recall breakdown in mock exams
          </span>
        </div>

        {criticalDecayChapters.length === 0 ? (
          <div className="p-6 text-center bg-[#ECEAE4] rounded-[4px] border border-[#141416] text-xs text-[#0047FF] font-bold flex flex-col sm:flex-row items-center justify-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#0047FF]" />
            <span>Zero topics in critical decay! All studied topics currently maintain &gt;50% memory retention stability.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-[#5C5A52]">
              These topics were studied previously but have exceeded their memory half-life without a spaced revision. Rescue them before they become complete recall liabilities:
            </p>
            <div className="divide-y-2 divide-[#D5D2C8] border-2 border-[#141416] rounded-[3px] bg-[#FAF9F6] max-h-80 overflow-y-auto">
              {criticalDecayChapters.map(({ chapter, retention }) => {
                const chTier = getConfidenceTier(chapter.currentConfidence);
                return (
                  <div
                    key={chapter.id}
                    className={`p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#FFFDF5] transition-colors border-l-4 ${chTier.cardBorderClass}`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${subjectBadge(chapter.subject)}`}>
                          {chapter.subject}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-[#FF3B00] text-white">
                          {retention.retentionPct}% RETENTION
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${chTier.badgeClass}`}>
                          ★ L{chapter.currentConfidence || 0}
                        </span>
                        <span className="text-[10px] font-bold text-[#5C5A52] px-1.5 py-0.2 bg-[#ECEAE4] rounded border border-[#141416]">
                          Class {chapter.classLevel || '11'} · Unit {chapter.clusterId}
                        </span>
                        <span className="text-[10px] font-bold text-[#FF3B00]">
                          Elapsed: {retention.daysSinceLastStudied} days (Half-life: {retention.halfLifeDays}d)
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-black uppercase text-[#141416]">
                        {chapter.name}
                      </h4>

                      {/* Retention Progress Bar */}
                      <div className="w-full max-w-md bg-[#D6D2C4] h-1.5 rounded-[2px] overflow-hidden border border-[#141416]">
                        <div
                          className="bg-[#DC2626] h-full transition-all"
                          style={{ width: `${retention.retentionPct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenQuickLogForChapter(chapter.id)}
                      className="px-3.5 py-2 bg-[#FF3B00] hover:bg-[#E03400] text-white text-xs font-black uppercase tracking-wider rounded-[2px] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] cursor-pointer shrink-0 transition-all active:translate-x-0.5 active:translate-y-0.5"
                    >
                      Rescue & Log Revision
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
