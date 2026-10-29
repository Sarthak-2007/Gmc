import React, { useState, useEffect } from 'react';
import { Target, Compass, Calendar, CheckCircle2, TrendingUp, AlertTriangle, Flame, Clock, Sparkles, BookOpen, Layers, Check } from 'lucide-react';
import { Chapter, StudyLog, SyllabusPacingSettings, Test, TestScore } from '../types';
import { calculateSyllabusPacing, getTodayStr } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';
import {
  getConfidenceTier,
  getPercentageConfidenceTier,
  getPaceTier,
  CONFIDENCE_TIERS,
} from '../utils/confidenceColor';

interface SyllabusPacingFlightPlanProps {
  chapters: Chapter[];
  studyLogs: StudyLog[];
  tests: Test[];
  testScores: TestScore[];
  pacingSettings?: SyllabusPacingSettings;
  settings?: SyllabusPacingSettings;
  onUpdatePacingSettings?: (settings: SyllabusPacingSettings) => void;
  onUpdateSettings?: (settings: SyllabusPacingSettings) => void;
  onSelectChapter?: (chapter: Chapter) => void;
  onOpenChapterQuickLog?: (chapterId: string) => void;
}

export const SyllabusPacingFlightPlan: React.FC<SyllabusPacingFlightPlanProps> = ({
  chapters,
  studyLogs,
  tests,
  testScores,
  pacingSettings: propPacingSettings,
  settings: propSettings,
  onUpdatePacingSettings,
  onUpdateSettings,
  onSelectChapter,
  onOpenChapterQuickLog,
}) => {
  const pacingSettings = propPacingSettings || propSettings || {
    targetSyllabusDate: '2026-12-31',
    targetExamDate: '2027-05-02',
    targetRevisionPasses: 3,
    targetMockTestsCount: 25,
    includeAllTestsGoal: true,
    studyDaysPerWeek: 7,
  };

  const handleUpdate = onUpdatePacingSettings || onUpdateSettings || (() => {});

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [targetSyllabusDate, setTargetSyllabusDate] = useState<string>(pacingSettings.targetSyllabusDate || '2026-12-31');
  const [targetExamDate, setTargetExamDate] = useState<string>(pacingSettings.targetExamDate || '2027-05-02');
  const [targetRevisionPasses, setTargetRevisionPasses] = useState<number>(pacingSettings.targetRevisionPasses || 3);
  const [includeAllTestsGoal, setIncludeAllTestsGoal] = useState<boolean>(pacingSettings.includeAllTestsGoal ?? true);

  useEffect(() => {
    if (pacingSettings) {
      setTargetSyllabusDate(pacingSettings.targetSyllabusDate || '2026-12-31');
      setTargetExamDate(pacingSettings.targetExamDate || '2027-05-02');
      setTargetRevisionPasses(pacingSettings.targetRevisionPasses || 3);
      setIncludeAllTestsGoal(pacingSettings.includeAllTestsGoal ?? true);
    }
  }, [pacingSettings]);

  const pacing = calculateSyllabusPacing(
    chapters,
    studyLogs,
    tests,
    testScores,
    pacingSettings,
    getTodayStr()
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    handleUpdate({
      targetSyllabusDate,
      targetExamDate,
      targetRevisionPasses,
      targetMockTestsCount: pacingSettings.targetMockTestsCount || 25,
      includeAllTestsGoal,
      studyDaysPerWeek: 7,
    });
    setIsEditing(false);
    sound.playCommitSuccess();
  };

  // Subject breakdowns
  const subjects = ['Physics', 'Chemistry', 'Botany', 'Zoology'] as const;
  const subjectStats = subjects.map((sub) => {
    const subChs = chapters.filter((c) => c.subject === sub && !c.isArchived);
    const completed = subChs.filter(
      (c) => c.learningStage === 'FIRST_PASS_DONE' || c.learningStage === 'IN_REVISION' || (c.completionPercentage && c.completionPercentage >= 100) || c.revisionCount >= 1
    ).length;
    const total = subChs.length || 1;
    const pct = Math.round((completed / total) * 100);
    return { subject: sub, completed, total, pct };
  });

  return (
    <div id="syllabus-pacing-flight-plan-section" className="space-y-4">
      {/* Top Banner / Mission Directive */}
      <div className="p-4 bg-[#141416] text-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] rounded-[3px] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#FF3B00] font-black uppercase tracking-wider">
              Strategic Flight Plan · Primary Directive
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-[#FF3B00] text-white font-bold">
              100% 1st Pass by {pacingSettings.targetSyllabusDate}
            </span>
          </div>
          <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#FF3B00]" />
            Target Revision Cadence & Pacing Trajectory
          </h3>
          <p className="text-xs text-[#A8A59C]">
            Priority 1: Complete all {pacing.totalChapters} chapters 1st pass before deadline. Priority 2: Execute {pacingSettings.targetRevisionPasses}x full revision cycles before exam.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="edit-flight-plan-btn"
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-2 text-xs font-black uppercase tracking-wider rounded-[2px] bg-[#2A2A30] hover:bg-[#383842] text-white border border-[#444] transition-colors cursor-pointer"
          >
            {isEditing ? 'Cancel Edit' : '⚙ Configure Deadlines'}
          </button>
        </div>
      </div>

      {/* Editing Modal/Form */}
      {isEditing && (
        <form onSubmit={handleSaveSettings} className="p-4 bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] rounded-[3px] space-y-4 font-mono">
          <h4 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5 border-b border-[#D5D2C8] pb-2">
            <Calendar className="w-4 h-4 text-[#FF3B00]" />
            Adjust Mission Deadlines & Revision Parameters
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase text-[#141416] mb-1">
                1st Pass Completion Deadline
              </label>
              <input
                type="date"
                required
                value={targetSyllabusDate}
                onChange={(e) => setTargetSyllabusDate(e.target.value)}
                className="w-full text-xs font-bold p-2 border-2 border-[#141416] rounded-[2px] bg-[#ECEAE4]"
              />
              <span className="text-[9px] text-[#5C5A52]">Goal date for 100% syllabus 1st pass</span>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-[#141416] mb-1">
                Target Exam Date (NEET UG)
              </label>
              <input
                type="date"
                required
                value={targetExamDate}
                onChange={(e) => setTargetExamDate(e.target.value)}
                className="w-full text-xs font-bold p-2 border-2 border-[#141416] rounded-[2px] bg-[#ECEAE4]"
              />
              <span className="text-[9px] text-[#5C5A52]">Final examination target</span>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-[#141416] mb-1">
                Target Revision Passes
              </label>
              <select
                value={targetRevisionPasses}
                onChange={(e) => setTargetRevisionPasses(Number(e.target.value))}
                className="w-full text-xs font-bold p-2 border-2 border-[#141416] rounded-[2px] bg-[#ECEAE4]"
              >
                <option value={1}>1 Full Revision Pass</option>
                <option value={2}>2 Full Revision Passes</option>
                <option value={3}>3 Full Revision Passes (Recommended)</option>
                <option value={4}>4 Full Revision Passes (Intensive)</option>
                <option value={5}>5 Full Revision Passes (Mastery)</option>
              </select>
              <span className="text-[9px] text-[#5C5A52]">Full syllabus review cycles</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#141416]">
              <input
                type="checkbox"
                checked={includeAllTestsGoal}
                onChange={(e) => setIncludeAllTestsGoal(e.target.checked)}
                className="w-4 h-4 accent-[#FF3B00]"
              />
              <span>Include full mock test series in cadence calculation ({tests.length} scheduled tests)</span>
            </label>

            <button
              type="submit"
              className="px-4 py-2 bg-[#FF3B00] text-white text-xs font-black uppercase rounded-[2px] border border-[#141416] shadow-[2px_2px_0px_#141416] cursor-pointer hover:bg-[#E03400]"
            >
              Save Parameters
            </button>
          </div>
        </form>
      )}

      {/* Cadence Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* Metric 1: 1st Pass Velocity */}
        {(() => {
          const compTier = getPercentageConfidenceTier(pacing.completionPercentage);
          return (
            <div className={`p-3 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${compTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">1st Pass Cadence</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${compTier.badgeClass}`}>
                  {compTier.label}
                </span>
              </div>
              <div className={`text-xl font-black ${compTier.textClass}`}>
                {pacing.required1stPassVelocityPerWeek} <span className="text-xs text-[#5C5A52] font-normal">ch/wk</span>
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span>{pacing.remaining1stPassCount} remaining</span>
                <span className="font-bold text-[#DC2626]">{Math.round(pacing.weeksUntilSyllabusTarget)} wks left</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pacing.completionPercentage}%`, backgroundColor: compTier.hex }}
                />
              </div>
            </div>
          );
        })()}

        {/* Metric 2: Post-Syllabus Revision Cadence */}
        {(() => {
          const revCompPct = Math.min(100, Math.round((pacing.completed1stPassCount / (pacing.totalChapters || 1)) * 100));
          const revTier = getPercentageConfidenceTier(revCompPct);
          return (
            <div className={`p-3 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${revTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Revision Cadence</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${CONFIDENCE_TIERS[4].badgeClass}`}>
                  {pacing.targetRevisionPasses}x Cycles
                </span>
              </div>
              <div className="text-xl font-black text-[#141416]">
                {pacing.requiredRevisionPassVelocityPerWeek} <span className="text-xs text-[#5C5A52] font-normal">revs/wk</span>
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span>{Math.round(pacing.weeksFromSyllabusTargetToExam)} revision weeks</span>
                <span className="font-bold text-[#2563EB]">{pacing.daysFromSyllabusTargetToExam} days window</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[#2563EB]"
                  style={{ width: `${revCompPct}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Metric 3: Mock Test Frequency */}
        {(() => {
          const testPct = Math.round((pacing.testsCompletedCount / Math.max(1, pacing.totalTestsPlanned)) * 100);
          const testTier = getPercentageConfidenceTier(testPct);
          return (
            <div className={`p-3 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${testTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Mock Test Pace</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${CONFIDENCE_TIERS[5].badgeClass}`}>
                  {pacing.testsCompletedCount}/{pacing.totalTestsPlanned} Given
                </span>
              </div>
              <div className="text-xl font-black text-[#141416]">
                1 test <span className="text-xs text-[#5C5A52] font-normal">every {pacing.requiredTestFrequencyDays} days</span>
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span>{pacing.testsRemainingCount} tests pending</span>
                <span className={`font-bold ${testTier.textClass}`}>{testPct}% logged</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-[#7C3AED]"
                  style={{ width: `${testPct}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Metric 4: Pacing Status & Trajectory Delta */}
        {(() => {
          const paceTier = getPaceTier(pacing.paceStatus);
          const paceLabel = pacing.paceStatus === 'AHEAD' ? '⚡ Ahead of Pace' : pacing.paceStatus === 'BEHIND' ? '⚠ Behind Target' : '✓ On Target Pace';
          return (
            <div className={`p-3 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${paceTier.cardBorderClass} shadow-[3px_3px_0px_#141416] rounded-[3px] space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#5C5A52]">Trajectory Status</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-[#141416] ${paceTier.badgeClass}`}>
                  {paceLabel}
                </span>
              </div>
              <div className={`text-xl font-black ${paceTier.textClass}`}>
                {pacing.paceDeltaChapters >= 0 ? `+${pacing.paceDeltaChapters}` : pacing.paceDeltaChapters}{' '}
                <span className="text-xs text-[#5C5A52] font-normal">ch vs ideal curve</span>
              </div>
              <div className="text-[11px] text-[#33322E] flex items-center justify-between">
                <span>Projected 100%:</span>
                <span className="font-bold text-[#141416]">{pacing.projectedCompletionDate}</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, pacing.completionPercentage))}%`, backgroundColor: paceTier.hex }}
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Pacing Trajectory Graph (SVG Burn-Up Curve) */}
      <div className="p-4 bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416] rounded-[3px] space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D5D2C8] pb-2">
          <div>
            <div className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#2563EB]" />
              Syllabus Burn-Up Trajectory Curve (86 Chapters Target)
            </div>
            <div className="text-[10px] text-[#5C5A52]">
              Ideal Target Line vs Actual Completed 1st-Pass Velocity
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-[#8C8A82] border-t border-dashed border-[#141416]" /> Ideal Target Line
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 bg-[#2563EB] rounded" /> Actual Progress ({pacing.completed1stPassCount}/86)
            </span>
          </div>
        </div>

        {/* SVG Trajectory Chart */}
        <div className="h-44 w-full relative bg-[#ECEAE4] border border-[#141416] rounded p-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="30" x2="500" y2="30" stroke="#D5D2C8" strokeDasharray="3,3" />
            <line x1="0" y1="60" x2="500" y2="60" stroke="#D5D2C8" strokeDasharray="3,3" />
            <line x1="0" y1="90" x2="500" y2="90" stroke="#D5D2C8" strokeDasharray="3,3" />

            {/* Ideal Target Linear Line (from 0,110 to 500,10) */}
            <line x1="20" y1="110" x2="480" y2="10" stroke="#8C8A82" strokeWidth="2" strokeDasharray="4,4" />

            {/* Actual Curve Area */}
            <polygon
              points={`20,110 ${pacing.trajectoryPoints.map((p, i) => {
                const x = 20 + (i / (pacing.trajectoryPoints.length - 1)) * 460;
                const y = 110 - (p.actual / 86) * 100;
                return `${x},${y}`;
              }).join(' ')} 480,110`}
              fill="#2563EB"
              fillOpacity="0.12"
            />

            {/* Actual Line */}
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pacing.trajectoryPoints.map((p, i) => {
                const x = 20 + (i / (pacing.trajectoryPoints.length - 1)) * 460;
                const y = 110 - (p.actual / 86) * 100;
                return `${x},${y}`;
              })}
            />

            {/* Data points */}
            {pacing.trajectoryPoints.map((p, i) => {
              const x = 20 + (i / (pacing.trajectoryPoints.length - 1)) * 460;
              const y = 110 - (p.actual / 86) * 100;
              const ptTier = getPercentageConfidenceTier(Math.round((p.actual / 86) * 100));
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="4" fill={ptTier.hex} stroke="#141416" strokeWidth="1.5" />
                  <text x={x} y={y - 8} fontSize="8" fontWeight="bold" textAnchor="middle" fill="#141416">
                    {p.actual}
                  </text>
                  <text x={x} y="118" fontSize="7" fill="#5C5A52" textAnchor="middle">
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Subject-Wise 1st-Pass Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {subjectStats.map((st) => {
          const stTier = getPercentageConfidenceTier(st.pct);
          return (
            <div key={st.subject} className={`p-3 bg-[#FAF9F6] border-2 border-[#141416] border-l-4 ${stTier.cardBorderClass} rounded-[3px] space-y-2 shadow-[2px_2px_0px_#141416]`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#141416]">{st.subject}</span>
                <span className={`text-xs font-black px-1.5 py-0.2 rounded border border-[#141416] ${stTier.badgeClass}`}>{st.pct}%</span>
              </div>
              <div className="w-full bg-[#E6E3DB] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${st.pct}%`, backgroundColor: stTier.hex }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#5C5A52]">
                <span><strong className={stTier.textClass}>{st.completed}</strong> completed</span>
                <span>{st.total - st.completed} left of {st.total}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
