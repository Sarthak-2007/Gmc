import React from 'react';
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Chapter, Test } from '../types';
import { getChapterRevisionInfo, getTodayStr } from '../services/spacedRepetition';
import { getConfidenceTier } from '../utils/confidenceColor';

interface CriticalRiskListProps {
  chapters: Chapter[];
  tests: Test[];
  onOpenQuickLogForChapter: (chapterId: string) => void;
}

export const CriticalRiskList: React.FC<CriticalRiskListProps> = ({
  chapters,
  tests,
  onOpenQuickLogForChapter,
}) => {
  const todayStr = getTodayStr();

  const criticalChapters = chapters
    .filter((c) => !c.isArchived)
    .map((c) => ({
      chapter: c,
      info: getChapterRevisionInfo(c, tests, todayStr),
    }))
    .filter((item) => item.info.isCriticalRisk)
    .sort((a, b) => a.info.daysDiff - b.info.daysDiff); // Most overdue first

  const subjectBadge = (subject: string) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#2563EB] text-white border-[#18181B]';
      case 'Chemistry':
        return 'bg-[#7C3AED] text-white border-[#18181B]';
      case 'Botany':
        return 'bg-[#F59E0B] text-[#18181B] border-[#18181B] font-bold';
      case 'Zoology':
        return 'bg-[#EA580C] text-white border-[#18181B]';
      default:
        return 'bg-[#27272A] text-white border-[#18181B]';
    }
  };

  if (criticalChapters.length === 0) {
    return (
      <div className="te-chassis-card p-4 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416]">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[3px] bg-[#ECEAE4] border border-[#141416] flex items-center justify-center text-[#141416] shadow-[1px_1px_0px_#141416]">
              <CheckCircle2 className="w-4 h-4 text-[#FF3B00]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase text-[#141416] tracking-tight">
                High Priority Focus: All Clear
              </h3>
              <p className="text-[11px] sm:text-xs text-[#5C5A52]">
                You have no weak chapters that are overdue for revision. Keep it up!
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#FAF9F6] bg-[#141416] px-2.5 py-1 rounded-[3px] border border-[#141416]">
            0 Urgent
          </span>
        </div>
      </div>
    );
  }

  return (
    <div id="critical-risk-section" className="te-chassis-card p-4 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#FF3B00]">
      {/* Corner Screws */}
      <div className="absolute top-2 left-2"><span className="te-screw" /></div>
      <div className="absolute top-2 right-2"><span className="te-screw" /></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#141416] mx-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[3px] bg-[#FF3B00] text-white flex items-center justify-center border border-[#141416] shadow-[1px_1px_0px_#141416]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-black text-[#141416] uppercase tracking-tight flex items-center gap-2">
              <span>High Priority Attention Needed</span>
              <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-[#FF3B00] text-white font-bold">
                {criticalChapters.length} {criticalChapters.length === 1 ? 'Topic' : 'Topics'}
              </span>
            </h3>
            <p className="text-xs text-[#5C5A52] font-mono mt-0.5">
              These chapters have low confidence ratings (Level 1–2) and are past their scheduled revision date.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 mx-2">
        {criticalChapters.map(({ chapter, info }) => {
          const chTier = getConfidenceTier(chapter.currentConfidence);
          return (
            <div
              key={chapter.id}
              className={`p-3 bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] border-l-4 ${chTier.cardBorderClass} flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[2px_2px_0px_#141416] font-mono`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[2px] border ${subjectBadge(chapter.subject)}`}>
                    {chapter.subject}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#141416] uppercase">{chapter.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-[2px] ${chTier.badgeClass}`}>
                    ★ L{chapter.currentConfidence || 0}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#5C5A52] flex-wrap">
                  <span>
                    Confidence:{' '}
                    <strong className={chTier.textClass}>
                      Level {chapter.currentConfidence}/5 ({chTier.label})
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Overdue by <strong className="text-[#FF3B00] font-bold">{Math.abs(info.daysDiff)} {Math.abs(info.daysDiff) === 1 ? 'day' : 'days'}</strong>
                  </span>
                  {info.earliestTestDeadline && (
                    <>
                      <span>•</span>
                      <span className="text-[#0047FF] font-bold">
                        Test in {info.earliestTestDeadline.daysUntil}d ({info.earliestTestDeadline.test.name})
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenQuickLogForChapter(chapter.id)}
                className="self-start sm:self-auto te-btn-orange px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <span>Log Study</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
