import React, { useState, useMemo } from 'react';
import {
  Compass,
  ShieldAlert,
  Target,
  Award,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';
import { Chapter, StudyLog, Subject, SyllabusPacingSettings, Test, TestScore } from '../types';
import {
  addDaysToDateStr,
  calculateMemoryRetention,
  calculateSyllabusPacing,
  getDecayPreventedStats,
  getTodayStr,
} from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';
import {
  getConfidenceTier,
  getPercentageConfidenceTier,
  getPaceTier,
  getDecayStatusTier,
  getRevisionPassTier,
  getCountConfidenceTier,
  CONFIDENCE_TIERS,
} from '../utils/confidenceColor';

interface StrategicFlightHubProps {
  chapters: Chapter[];
  studyLogs: StudyLog[];
  tests: Test[];
  testScores: TestScore[];
  pacingSettings?: SyllabusPacingSettings;
  onUpdatePacingSettings?: (settings: SyllabusPacingSettings) => void;
  onOpenQuickLogForChapter: (chapterId: string) => void;
}

export const StrategicFlightHub: React.FC<StrategicFlightHubProps> = ({
  chapters,
  studyLogs,
  tests,
  testScores,
  pacingSettings = {
    targetSyllabusDate: '2026-12-31',
    targetExamDate: '2027-05-02',
    targetRevisionPasses: 3,
    targetMockTestsCount: 25,
    includeAllTestsGoal: true,
    studyDaysPerWeek: 7,
  },
  onUpdatePacingSettings,
  onOpenQuickLogForChapter,
}) => {
  const todayStr = getTodayStr();
  const activeChapters = useMemo(() => chapters.filter((c) => !c.isArchived), [chapters]);

  // Target Settings Edit Drawer (hidden by default)
  const [isEditingTargets, setIsEditingTargets] = useState<boolean>(false);
  const [editSyllabusDate, setEditSyllabusDate] = useState<string>(pacingSettings.targetSyllabusDate || '2026-12-31');
  const [editExamDate, setEditExamDate] = useState<string>(pacingSettings.targetExamDate || '2027-05-02');
  const [editRevisionPasses, setEditRevisionPasses] = useState<number>(pacingSettings.targetRevisionPasses || 3);
  const [editIncludeTests, setEditIncludeTests] = useState<boolean>(pacingSettings.includeAllTestsGoal ?? true);

  // Memory Decay Filters
  const [decayFilter, setDecayFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'SAFE'>('ALL');
  const [decaySubject, setDecaySubject] = useState<'ALL' | Subject>('ALL');

  // Pacing Calculation
  const pacing = useMemo(() => {
    return calculateSyllabusPacing(chapters, studyLogs, tests, testScores, pacingSettings, todayStr);
  }, [chapters, studyLogs, tests, testScores, pacingSettings, todayStr]);

  // Memory Decay Analysis
  const memoryDecayAnalytics = useMemo(() => {
    let safeCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let unstudiedCount = 0;

    const analyzedList = activeChapters.map((c) => {
      const retention = calculateMemoryRetention(c, todayStr);
      if (retention.decayStatus === 'safe') safeCount++;
      else if (retention.decayStatus === 'warning') warningCount++;
      else if (retention.decayStatus === 'critical') criticalCount++;
      else unstudiedCount++;

      return { chapter: c, retention };
    });

    const criticalList = analyzedList
      .filter((x) => x.retention.decayStatus === 'critical')
      .sort((a, b) => a.retention.retentionPct - b.retention.retentionPct);

    const warningList = analyzedList
      .filter((x) => x.retention.decayStatus === 'warning')
      .sort((a, b) => a.retention.retentionPct - b.retention.retentionPct);

    const filtered = analyzedList.filter(({ chapter, retention }) => {
      if (decaySubject !== 'ALL' && chapter.subject !== decaySubject) return false;
      if (decayFilter === 'CRITICAL' && retention.decayStatus !== 'critical') return false;
      if (decayFilter === 'WARNING' && retention.decayStatus !== 'warning') return false;
      if (decayFilter === 'SAFE' && retention.decayStatus !== 'safe') return false;
      return true;
    });

    const decayPrevented = getDecayPreventedStats(activeChapters, studyLogs);

    return {
      safeCount,
      warningCount,
      criticalCount,
      unstudiedCount,
      criticalList,
      warningList,
      filtered,
      decayPrevented,
    };
  }, [activeChapters, todayStr, decaySubject, decayFilter, studyLogs]);

  // Subject Stats for 1st-Pass Breakdown
  const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'] as const;
  const subjectStats = useMemo(() => {
    return subjects.map((sub) => {
      const subChs = chapters.filter((c) => c.subject === sub && !c.isArchived);
      const completed = subChs.filter(
        (c) =>
          c.learningStage === 'FIRST_PASS_DONE' ||
          c.learningStage === 'IN_REVISION' ||
          (c.completionPercentage && c.completionPercentage >= 100) ||
          c.revisionCount >= 1
      ).length;
      const total = subChs.length || 1;
      const pct = Math.round((completed / total) * 100);
      return { subject: sub, completed, total, pct };
    });
  }, [chapters]);

  const subjectBadge = (subject: Subject) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#0047FF] text-white border-[#141416]';
      case 'Chemistry':
        return 'bg-[#9333EA] text-white border-[#141416]';
      case 'Botany':
        return 'bg-[#FFB800] text-[#141416] border-[#141416] font-black';
      case 'Zoology':
        return 'bg-[#EA580C] text-white border-[#141416]';
      default:
        return 'bg-[#141416] text-white border-[#141416]';
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdatePacingSettings) {
      onUpdatePacingSettings({
        targetSyllabusDate: editSyllabusDate,
        targetExamDate: editExamDate,
        targetRevisionPasses: editRevisionPasses,
        targetMockTestsCount: pacingSettings.targetMockTestsCount || 25,
        includeAllTestsGoal: editIncludeTests,
        studyDaysPerWeek: 7,
      });
    }
    setIsEditingTargets(false);
    sound.playCommitSuccess();
  };

  return (
    <div id="strategic-flight-hub" className="space-y-5 font-mono">
      {/* 1. COMPACT TOP HEADER & TARGET CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#141416]">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase text-[#141416] tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#0047FF]" />
            Syllabus Flight Plan & Cadence Engine
          </h2>
          <p className="text-xs text-[#5C5A52] mt-0.5">
            Real-time syllabus completion velocity, burn-up milestone projections, and memory retention half-life.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="toggle-adjust-targets-btn"
            onClick={() => {
              sound.playKeyClick();
              setIsEditingTargets(!isEditingTargets);
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-[2px] bg-[#ECEAE4] hover:bg-[#141416] hover:text-white text-[#141416] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isEditingTargets ? 'Close Settings' : 'Adjust Targets'}</span>
          </button>
        </div>
      </div>

      {/* Inline Targets Adjustment Panel (only shown when explicitly toggled) */}
      {isEditingTargets && (
        <form
          onSubmit={handleSaveSettings}
          className="border-2 border-[#141416] bg-[#ECEAE4] p-4 rounded-[3px] space-y-3 shadow-[3px_3px_0px_#141416]"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0047FF]" />
              Target Deadlines & Cadence Configuration
            </h4>
            <button
              type="button"
              onClick={() => setIsEditingTargets(false)}
              className="text-[#5C5A52] hover:text-[#141416] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[#141416] mb-1">
                1st Pass Target Date
              </label>
              <input
                type="date"
                required
                value={editSyllabusDate}
                onChange={(e) => setEditSyllabusDate(e.target.value)}
                className="w-full text-xs font-bold p-1.5 border-2 border-[#141416] rounded-[2px] bg-[#FAF9F6]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[#141416] mb-1">
                Target Exam Date
              </label>
              <input
                type="date"
                required
                value={editExamDate}
                onChange={(e) => setEditExamDate(e.target.value)}
                className="w-full text-xs font-bold p-1.5 border-2 border-[#141416] rounded-[2px] bg-[#FAF9F6]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[#141416] mb-1">
                Revision Cycles Goal
              </label>
              <select
                value={editRevisionPasses}
                onChange={(e) => setEditRevisionPasses(Number(e.target.value))}
                className="w-full text-xs font-bold p-1.5 border-2 border-[#141416] rounded-[2px] bg-[#FAF9F6]"
              >
                <option value={1}>1 Full Revision Pass</option>
                <option value={2}>2 Full Revision Passes</option>
                <option value={3}>3 Full Revision Passes (Standard)</option>
                <option value={4}>4 Full Revision Passes (Intensive)</option>
                <option value={5}>5 Full Revision Passes (Mastery)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingTargets(false)}
              className="px-3 py-1.5 text-xs font-bold text-[#5C5A52] hover:text-[#141416] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0047FF] text-white text-xs font-black uppercase rounded-[2px] border border-[#141416] shadow-[2px_2px_0px_#141416] cursor-pointer hover:bg-[#0038CC]"
            >
              Save Target Settings
            </button>
          </div>
        </form>
      )}

      {/* 2. PRIMARY CADENCE METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: 1st Pass Velocity */}
        {(() => {
          const complTier = getPercentageConfidenceTier(pacing.completionPercentage);
          return (
            <div className={`p-3.5 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${complTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">1st Pass Target</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${complTier.badgeClass}`}>
                  {pacing.targetSyllabusDate}
                </span>
              </div>
              <div className={`text-xl font-black ${complTier.textClass}`}>
                {pacing.required1stPassVelocityPerWeek} <span className="text-xs text-[#5C5A52] font-normal">ch/wk needed</span>
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span>{pacing.remaining1stPassCount} of {pacing.totalChapters} remaining</span>
                <span className={`font-bold ${complTier.textClass}`}>{Math.round(pacing.weeksUntilSyllabusTarget)} wks left</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1 border border-[#141416]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${complTier.bgClass}`}
                  style={{ width: `${pacing.completionPercentage}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Metric 2: Actual Pace vs Projected Date */}
        {(() => {
          const paceTier = getPaceTier(pacing.paceStatus);
          return (
            <div className={`p-3.5 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${paceTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Current Velocity</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${paceTier.badgeClass}`}>
                  {pacing.actualWeeklyVelocity} ch/wk
                </span>
              </div>
              <div className={`text-xl font-black ${paceTier.textClass}`}>
                {pacing.projectedCompletionDate}
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span>Projected 100%:</span>
                <span className={`font-black ${paceTier.textClass}`}>
                  {pacing.projectedDaysDelta >= 0
                    ? `${pacing.projectedDaysDelta}d ahead`
                    : `${Math.abs(pacing.projectedDaysDelta)}d behind`}
                </span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1 border border-[#141416]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${paceTier.bgClass}`}
                  style={{ width: `${Math.min(100, Math.max(10, pacing.completionPercentage))}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Metric 3: Revision Runway */}
        {(() => {
          const revTier = getRevisionPassTier(pacing.targetRevisionPasses);
          return (
            <div className={`p-3.5 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${revTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Revision Runway</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${revTier.badgeClass}`}>
                  {pacing.targetRevisionPasses}x Passes
                </span>
              </div>
              <div className={`text-xl font-black ${revTier.textClass}`}>
                {Math.round(pacing.weeksFromSyllabusTargetToExam)} <span className="text-xs text-[#5C5A52] font-normal">weeks</span>
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span>Exam: {pacing.targetExamDate}</span>
                <span className={`font-bold ${revTier.textClass}`}>{pacing.requiredRevisionPassVelocityPerWeek} rev/wk</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1 border border-[#141416]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${revTier.bgClass}`}
                  style={{ width: `${Math.min(100, (pacing.completed1stPassCount / (pacing.totalChapters || 1)) * 100)}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Metric 4: Critical Topics Decay */}
        {(() => {
          const decayTier = memoryDecayAnalytics.criticalCount > 0
            ? CONFIDENCE_TIERS[1]
            : memoryDecayAnalytics.warningCount > 0
            ? CONFIDENCE_TIERS[2]
            : CONFIDENCE_TIERS[4];
          return (
            <div className={`p-3.5 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${decayTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Memory Decay Alert</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${decayTier.badgeClass}`}>
                  {memoryDecayAnalytics.criticalCount > 0 ? `${memoryDecayAnalytics.criticalCount} Critical` : 'All Safe'}
                </span>
              </div>
              <div className={`text-xl font-black ${decayTier.textClass}`}>
                {memoryDecayAnalytics.safeCount} <span className="text-xs text-[#5C5A52] font-normal">/ {activeChapters.length} safe</span>
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span className="text-[#D97706] font-bold">{memoryDecayAnalytics.warningCount} in warning</span>
                <span className="text-[#DC2626] font-bold">{memoryDecayAnalytics.criticalCount} under 50%</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1 border border-[#141416]">
                <div
                  className="bg-[#2563EB] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (memoryDecayAnalytics.safeCount / Math.max(1, activeChapters.length)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* 3. SYLLABUS PACING & COMPLETION PROJECTION (SIMPLIFIED ADVISORY ENGINE) */}
      {(() => {
        const isPacingBehind = pacing.paceStatus === 'BEHIND' || pacing.projectedDaysDelta < 0;
        const paceTier = getPaceTier(pacing.paceStatus);
        const daysBehindOrAhead = Math.abs(pacing.projectedDaysDelta);

        // Dynamic Milestone Window:
        // Default to a 30-day tactical milestone, or capped by the target deadline if less than 30 days remain.
        const recoveryDays = Math.min(30, Math.max(7, pacing.daysUntilSyllabusTarget));
        const recoveryDate = addDaysToDateStr(todayStr, recoveryDays);

        // 1. Chapters required to finish before recoveryDate to stay on track for the target deadline:
        // Daily required velocity = remaining1stPassCount / daysUntilSyllabusTarget.
        // Therefore, chapters in recoveryDays = recoveryDays * required1stPassVelocityPerDay.
        // This is mathematically exact: maintaining this pace guarantees completing 100% on the target date!
        const chaptersToFinishBeforeDate = Math.min(
          pacing.remaining1stPassCount,
          Math.max(1, Math.round(recoveryDays * pacing.required1stPassVelocityPerDay))
        );

        // 2. Projected chapters finished in this same window at current velocity:
        const projectedChaptersInWindow = Math.min(
          pacing.remaining1stPassCount,
          Math.max(0, Math.round((recoveryDays / 7) * pacing.actualWeeklyVelocity))
        );

        // 3. Shortfall / Deficit to bridge over this milestone window:
        const windowShortfall = Math.max(0, chaptersToFinishBeforeDate - projectedChaptersInWindow);

        // 4. Cadence rhythm: days needed per chapter at required velocity
        const daysPerChapter = pacing.required1stPassVelocityPerDay > 0
          ? (1 / pacing.required1stPassVelocityPerDay).toFixed(1)
          : '—';

        return (
          <div className={`te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] border-l-6 ${paceTier.cardBorderClass} shadow-[4px_4px_0px_#141416] space-y-4`}>
            {/* Corner Screws */}
            <div className="absolute top-2 left-2"><span className="te-screw" /></div>
            <div className="absolute top-2 right-2"><span className="te-screw" /></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#141416]">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-[1px] ${isPacingBehind ? 'bg-[#DC2626] animate-pulse' : 'bg-[#2563EB]'}`}></span>
                  <span className={`text-xs font-black uppercase tracking-wider ${paceTier.textClass}`}>
                    {isPacingBehind ? 'PACING ADVISORY // BEHIND SCHEDULE' : 'PACING ADVISORY // ON SCHEDULE'}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] tracking-tight mt-0.5 flex items-center gap-2">
                  <Compass className={`w-4 h-4 ${paceTier.textClass}`} />
                  Syllabus Completion Projection & Cadence Advisor
                </h3>
                <p className="text-xs text-[#5C5A52] mt-0.5">
                  Calculates your projected syllabus finish date from your current weekly velocity and provides exact catch-up targets.
                </p>
              </div>

              <div className="shrink-0">
                <span
                  className={`text-xs font-black uppercase px-3 py-1.5 rounded-[3px] border-2 border-[#141416] shadow-[2px_2px_0px_#141416] inline-flex items-center gap-1.5 ${paceTier.badgeClass}`}
                >
                  {isPacingBehind ? `⚠ Behind by ${daysBehindOrAhead} Days` : `✓ On Schedule (+${daysBehindOrAhead}d)`}
                </span>
              </div>
            </div>

            {/* Dynamic Pacing Alert & Action Recommendation Box */}
            {isPacingBehind ? (
              <div className="p-4 bg-[#FFF5F5] border-2 border-[#DC2626] rounded-[4px] shadow-[2px_2px_0px_#DC2626] space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-xs w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="font-black text-sm uppercase text-[#DC2626]">
                        Action Required: Syllabus Trajectory Behind Target Deadline
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#DC2626] text-white self-start sm:self-auto">
                        {pacing.remaining1stPassCount} chapters remaining · {pacing.daysUntilSyllabusTarget}d left
                      </span>
                    </div>

                    <p className="text-[#141416] leading-relaxed">
                      At your current velocity of <strong className="font-black text-[#DC2626]">{pacing.actualWeeklyVelocity} chapters/week</strong>, you will finish all {pacing.totalChapters} chapters on <strong className="font-black text-[#141416]">{pacing.projectedCompletionDate}</strong> ({daysBehindOrAhead} days after your target deadline of <strong className="underline">{pacing.targetSyllabusDate}</strong>).
                    </p>

                    <div className="p-3 bg-[#FAF9F6] rounded-[3px] border-2 border-[#DC2626] text-[#141416] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#DC2626] uppercase font-black text-xs flex items-center gap-1.5">
                          🎯 Recovery Directive · {recoveryDays}-Day Milestone
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FFF0F0] text-[#DC2626] border border-[#DC2626]">
                          Target Date: {recoveryDate}
                        </span>
                      </div>

                      <p className="text-xs text-[#141416] leading-relaxed font-bold">
                        Complete <strong className="text-[#2563EB] text-sm font-black">{chaptersToFinishBeforeDate} chapters before {recoveryDate}</strong> (maintaining your required cadence of <strong className="text-[#2563EB] font-black">{pacing.required1stPassVelocityPerWeek} ch/wk</strong>, or ~1 chapter every {daysPerChapter} days) to get back on schedule for your {pacing.targetSyllabusDate} 1st-pass target.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#E6E3DB] text-[11px] font-mono">
                        <div className="bg-[#EFF6FF] p-2 rounded border border-[#BFDBFE]">
                          <span className="text-[9px] text-[#2563EB] uppercase font-black block">Milestone Target</span>
                          <span className="text-sm font-black text-[#2563EB]">{chaptersToFinishBeforeDate} chapters</span>
                          <span className="text-[9px] text-[#5C5A52] block">before {recoveryDate} ({pacing.required1stPassVelocityPerWeek} ch/wk)</span>
                        </div>
                        <div className="bg-[#ECEAE4] p-2 rounded border border-[#D5D2C8]">
                          <span className="text-[9px] text-[#5C5A52] uppercase font-black block">At Current Rate</span>
                          <span className="text-sm font-black text-[#141416]">{projectedChaptersInWindow} chapters</span>
                          <span className="text-[9px] text-[#5C5A52] block">projected at {pacing.actualWeeklyVelocity} ch/wk</span>
                        </div>
                        <div className="bg-[#FFF5F5] p-2 rounded border border-[#FECACA]">
                          <span className="text-[9px] text-[#DC2626] uppercase font-black block">Pace Shortfall to Bridge</span>
                          <span className="text-sm font-black text-[#DC2626]">+{windowShortfall} chapters</span>
                          <span className="text-[9px] text-[#5C5A52] block">needed to prevent slippage</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#EFF6FF] border-2 border-[#2563EB] rounded-[4px] shadow-[2px_2px_0px_#2563EB] space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-xs w-full">
                    <div className="font-black text-sm uppercase text-[#2563EB]">
                      On Schedule: 1st-Pass Velocity Aligned with Exam Runway
                    </div>
                    <p className="text-[#141416] leading-relaxed">
                      At your current velocity of <strong className="font-black text-[#2563EB]">{pacing.actualWeeklyVelocity} chapters/week</strong>, you are projected to complete 100% syllabus 1st pass on <strong className="font-black">{pacing.projectedCompletionDate}</strong> ({daysBehindOrAhead} days ahead of your target deadline of <strong className="underline">{pacing.targetSyllabusDate}</strong>).
                    </p>
                    <div className="p-3 bg-[#FAF9F6] rounded-[3px] border border-[#2563EB] text-[#141416] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#2563EB] uppercase font-black text-xs">
                          ✓ Next Milestone · {recoveryDays}-Day Target
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#5C5A52]">
                          Target: {recoveryDate}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-bold">
                        Complete <strong className="text-[#2563EB] text-sm">{chaptersToFinishBeforeDate} chapters before {recoveryDate}</strong> (maintaining <strong className="text-[#2563EB]">{pacing.required1stPassVelocityPerWeek} ch/wk</strong>) to guarantee <strong className="text-[#2563EB]">{Math.round(pacing.weeksFromSyllabusTargetToExam)} weeks ({pacing.daysFromSyllabusTargetToExam} days)</strong> of dedicated review runway for {pacing.targetRevisionPasses}x full syllabus passes before NEET exam on <strong className="text-[#141416]">{pacing.targetExamDate}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4 Telemetry Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {(() => {
                const velTier = getPercentageConfidenceTier((pacing.actualWeeklyVelocity / Math.max(1, pacing.required1stPassVelocityPerWeek)) * 100);
                return (
                  <div className={`p-3 bg-[#ECEAE4] border-2 border-[#141416] border-l-4 ${velTier.cardBorderClass} rounded-[3px] shadow-[2px_2px_0px_#141416] space-y-1`}>
                    <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Current Velocity</span>
                    <div className={`font-black text-base ${velTier.textClass}`}>
                      {pacing.actualWeeklyVelocity} <span className="text-xs font-normal text-[#5C5A52]">ch/week</span>
                    </div>
                    <span className="text-[10px] text-[#5C5A52] block">
                      {pacing.completed1stPassCount} of {pacing.totalChapters} done (<strong className={velTier.textClass}>{pacing.completionPercentage}%</strong>)
                    </span>
                  </div>
                );
              })()}

              {(() => {
                const reqTier = CONFIDENCE_TIERS[4];
                return (
                  <div className={`p-3 bg-[#ECEAE4] border-2 border-[#141416] border-l-4 ${reqTier.cardBorderClass} rounded-[3px] shadow-[2px_2px_0px_#141416] space-y-1`}>
                    <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Required Pacing</span>
                    <div className={`font-black text-base ${reqTier.textClass}`}>
                      {pacing.required1stPassVelocityPerWeek} <span className="text-xs font-normal text-[#5C5A52]">ch/week</span>
                    </div>
                    <span className="text-[10px] text-[#5C5A52] block">
                      To hit {pacing.targetSyllabusDate} deadline
                    </span>
                  </div>
                );
              })()}

              {(() => {
                const projTier = isPacingBehind ? CONFIDENCE_TIERS[1] : CONFIDENCE_TIERS[4];
                return (
                  <div className={`p-3 bg-[#ECEAE4] border-2 border-[#141416] border-l-4 ${projTier.cardBorderClass} rounded-[3px] shadow-[2px_2px_0px_#141416] space-y-1`}>
                    <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Projected Finish Date</span>
                    <div className={`font-black text-base ${projTier.textClass}`}>
                      {pacing.projectedCompletionDate}
                    </div>
                    <span className="text-[10px] text-[#5C5A52] block">
                      Target Goal: {pacing.targetSyllabusDate}
                    </span>
                  </div>
                );
              })()}

              {(() => {
                const bufTier = CONFIDENCE_TIERS[5];
                return (
                  <div className={`p-3 bg-[#ECEAE4] border-2 border-[#141416] border-l-4 ${bufTier.cardBorderClass} rounded-[3px] shadow-[2px_2px_0px_#141416] space-y-1`}>
                    <span className="text-[10px] font-black uppercase text-[#5C5A52] block">Revision Buffer</span>
                    <div className={`font-black text-base ${bufTier.textClass}`}>
                      {Math.round(pacing.weeksFromSyllabusTargetToExam)} <span className="text-xs font-normal text-[#5C5A52]">weeks</span>
                    </div>
                    <span className="text-[10px] text-[#5C5A52] block">
                      {pacing.daysFromSyllabusTargetToExam} days for {pacing.targetRevisionPasses}x passes
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* 4. SUBJECT-WISE 1ST-PASS PROGRESS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {subjectStats.map((sub) => {
          const subTier = getPercentageConfidenceTier(sub.pct);
          return (
            <div
              key={sub.subject}
              className={`p-3 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${subTier.cardBorderClass} rounded-[3px] shadow-[2px_2px_0px_#141416] space-y-1.5`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#141416] uppercase">{sub.subject}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${subTier.badgeClass}`}>
                  {sub.pct}%
                </span>
              </div>
              <div className="text-xs font-bold text-[#5C5A52]">
                <strong className={subTier.textClass}>{sub.completed}</strong> / {sub.total} Chapters Done
              </div>
              <div className="w-full bg-[#ECEAE4] h-1.5 rounded-[1px] overflow-hidden border border-[#141416]">
                <div className={`h-full ${subTier.bgClass}`} style={{ width: `${sub.pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. MEMORY DECAY & RETENTION MATRIX */}
      <div className="space-y-4">
        {/* Chapter Retention Matrix Table */}
        <div className="te-chassis-card p-4 sm:p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#141416]">
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase text-[#141416] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#0047FF]" />
                Chapter Memory Half-Life Matrix ({memoryDecayAnalytics.filtered.length} Topics)
              </h3>
              <p className="text-xs text-[#5C5A52]">
                Dynamic retention calculated from last study intervals and confidence scores.
              </p>
            </div>

            {/* Subject & Status Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] p-0.5">
                {(['ALL', 'Physics', 'Chemistry', 'Botany', 'Zoology'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setDecaySubject(s)}
                    className={`px-2 py-1 text-[10px] font-black uppercase rounded-[2px] transition-all cursor-pointer ${
                      decaySubject === s ? 'bg-[#141416] text-[#FAF9F6]' : 'text-[#5C5A52]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-[#ECEAE4] border-2 border-[#141416] rounded-[3px] p-0.5">
                {(['ALL', 'CRITICAL', 'WARNING', 'SAFE'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDecayFilter(f)}
                    className={`px-2 py-1 text-[10px] font-black uppercase rounded-[2px] transition-all cursor-pointer ${
                      decayFilter === f
                        ? f === 'CRITICAL'
                          ? 'bg-[#FF3B00] text-white'
                          : 'bg-[#141416] text-[#FAF9F6]'
                        : f === 'CRITICAL'
                        ? 'text-[#FF3B00] font-bold'
                        : 'text-[#5C5A52]'
                    }`}
                  >
                    {f === 'CRITICAL' ? `Critical (${memoryDecayAnalytics.criticalCount})` : f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {memoryDecayAnalytics.filtered.map(({ chapter, retention }) => {
              const chTier = getConfidenceTier(chapter.currentConfidence);
              return (
                <div
                  key={chapter.id}
                  className={`p-3 bg-[#ECEAE4] rounded-[3px] border-2 border-[#141416] border-l-4 ${chTier.cardBorderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${subjectBadge(chapter.subject)}`}>
                        {chapter.subject}
                      </span>
                      <span className="text-xs font-black uppercase text-[#141416]">{chapter.name}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${chTier.badgeClass}`}>
                        ★ L{chapter.currentConfidence || 0}
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                          retention.decayStatus === 'critical'
                            ? 'bg-[#FF3B00] text-white'
                            : retention.decayStatus === 'warning'
                            ? 'bg-[#FFB800] text-[#141416]'
                            : 'bg-[#141416] text-[#FAF9F6]'
                        }`}
                      >
                        {retention.decayStatus.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-[#5C5A52]">
                      <span>
                        Last Studied:{' '}
                        <strong>
                          {retention.daysSinceLastStudied !== null ? `${retention.daysSinceLastStudied}d ago` : 'Never'}
                        </strong>
                      </span>
                      <span>
                        Confidence: <strong className={chTier.textClass}>Level {chapter.currentConfidence}/5 ({chTier.label})</strong>
                      </span>
                      <span>
                        Revisions: <strong>{chapter.revisionCount}x</strong>
                      </span>
                    </div>
                  </div>

                  {/* Retention Gauge & Revise Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-28 text-right">
                      <div className="text-xs font-black text-[#141416]">{retention.retentionPct}% Retention</div>
                      <div className="w-full bg-[#D6D2C4] h-1.5 rounded-[1px] overflow-hidden border border-[#141416] mt-0.5">
                        <div
                          className={`h-full ${
                            retention.retentionPct < 50
                              ? 'bg-[#DC2626]'
                              : retention.retentionPct < 70
                              ? 'bg-[#D97706]'
                              : 'bg-[#2563EB]'
                          }`}
                          style={{ width: `${retention.retentionPct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenQuickLogForChapter(chapter.id)}
                      className="px-2.5 py-1 text-[10px] font-black uppercase bg-[#FAF9F6] hover:bg-[#141416] hover:text-[#FAF9F6] border border-[#141416] rounded-[2px] transition-colors cursor-pointer"
                    >
                      Revise
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
