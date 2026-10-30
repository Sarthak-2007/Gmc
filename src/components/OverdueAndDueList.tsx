import React, { useState } from 'react';
import { AlertCircle, Clock, Calendar, CheckCircle2, History, ArrowRight, Trash2 } from 'lucide-react';
import { Chapter, StudyLog, Test } from '../types';
import { getChapterRevisionInfo, getTodayStr } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';
import {
  getConfidenceTier,
  getRevisionPassTier,
  getOverdueDaysTier,
  CONFIDENCE_TIERS,
} from '../utils/confidenceColor';

interface OverdueAndDueListProps {
  chapters: Chapter[];
  tests: Test[];
  studyLogs: StudyLog[];
  onOpenQuickLogForChapter: (chapterId: string) => void;
  onDeleteStudyLog?: (logId: string) => void;
}

export const OverdueAndDueList: React.FC<OverdueAndDueListProps> = ({
  chapters,
  tests,
  studyLogs,
  onOpenQuickLogForChapter,
  onDeleteStudyLog,
}) => {
  const todayStr = getTodayStr();
  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'due_today' | 'due_soon'>('all');
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  const activeChapters = chapters.filter((c) => !c.isArchived);

  // Group chapters by revision status
  const chapterItems = activeChapters.map((c) => ({
    chapter: c,
    info: getChapterRevisionInfo(c, tests, todayStr),
  }));

  const overdueList = chapterItems.filter((i) => i.info.status === 'overdue');
  const dueTodayList = chapterItems.filter((i) => i.info.status === 'due_today');
  const dueSoonList = chapterItems.filter((i) => i.info.status === 'due_soon');

  // Distinct Upcoming Test Deadlines (inside next 7 days)
  const testDeadlinesList = chapterItems.filter(
    (i) => i.info.earliestTestDeadline && i.info.earliestTestDeadline.isUrgent
  );

  const displayedList = (() => {
    switch (activeFilter) {
      case 'overdue':
        return overdueList;
      case 'due_today':
        return dueTodayList;
      case 'due_soon':
        return dueSoonList;
      case 'all':
      default:
        return [...overdueList, ...dueTodayList, ...dueSoonList];
    }
  })();

  // Sort by urgency: overdue first (most days overdue), then due today, then due soon
  displayedList.sort((a, b) => a.info.daysDiff - b.info.daysDiff);

  const recentLogs = [...studyLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  const subjectBadge = (subject: string) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#0047FF] text-white';
      case 'Chemistry':
        return 'bg-[#9333EA] text-white';
      case 'Botany':
        return 'bg-[#FFB800] text-[#141416] font-bold';
      case 'Zoology':
        return 'bg-[#FF5000] text-white';
      default:
        return 'bg-[#2A2A30] text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Spaced Repetition Due & Overdue Console */}
      <div id="spaced-repetition-due-section" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>
        <div className="absolute bottom-2 left-2"><span className="te-screw" /></div>
        <div className="absolute bottom-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#141416] mx-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#FF3B00] uppercase tracking-wider">Scheduled Revisions</span>
              <h2 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF3B00]" />
                <span>Chapters Due for Revision</span>
              </h2>
            </div>
            <p className="text-xs text-[#5C5A52] font-mono mt-0.5">
              Reviewing at calculated intervals locks concepts into your long-term memory.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap font-mono">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-[3px] text-xs font-bold transition-all cursor-pointer border ${
                activeFilter === 'all'
                  ? 'bg-[#141416] text-[#FAF9F6] border-[#141416] shadow-[1px_1px_0px_#FF3B00]'
                  : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416]'
              }`}
            >
              All ({overdueList.length + dueTodayList.length + dueSoonList.length})
            </button>
            <button
              onClick={() => setActiveFilter('overdue')}
              className={`px-3 py-1 rounded-[3px] text-xs font-bold transition-all cursor-pointer border ${
                activeFilter === 'overdue'
                  ? 'bg-[#FF3B00] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                  : 'bg-[#FAF9F6] text-[#FF3B00] border-[#FF3B00]/60 hover:bg-[#FF3B00]/10'
              }`}
            >
              Overdue ({overdueList.length})
            </button>
            <button
              onClick={() => setActiveFilter('due_today')}
              className={`px-3 py-1 rounded-[3px] text-xs font-bold transition-all cursor-pointer border ${
                activeFilter === 'due_today'
                  ? 'bg-[#FFB800] text-[#141416] border-[#141416] shadow-[1px_1px_0px_#141416]'
                  : 'bg-[#FAF9F6] text-[#B38000] border-[#FFB800]/60 hover:bg-[#FFB800]/10'
              }`}
            >
              Due Today ({dueTodayList.length})
            </button>
            <button
              onClick={() => setActiveFilter('due_soon')}
              className={`px-3 py-1 rounded-[3px] text-xs font-bold transition-all cursor-pointer border ${
                activeFilter === 'due_soon'
                  ? 'bg-[#0047FF] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                  : 'bg-[#FAF9F6] text-[#0047FF] border-[#0047FF]/60 hover:bg-[#0047FF]/10'
              }`}
            >
              Due in ≤2 Days ({dueSoonList.length})
            </button>
          </div>
        </div>

        {displayedList.length === 0 ? (
          <div className="py-8 text-center text-[#5C5A52] font-mono text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-[#141416] mb-2" />
            Great job! You have no chapters due for review in this category right now.
          </div>
        ) : (
          <div className="mt-3 divide-y-2 divide-[#E4E2DC] mx-2 font-mono">
            {displayedList.map(({ chapter, info }) => {
              const isOverdue = info.status === 'overdue';
              const isDueToday = info.status === 'due_today';
              const isDueSoon = info.status === 'due_soon';
              const confTier = getConfidenceTier(chapter.currentConfidence);
              const revTier = getRevisionPassTier(chapter.revisionCount || 0);
              const overdueTier = getOverdueDaysTier(info.daysDiff);

              return (
                <div
                  key={chapter.id}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#ECEAE4]/50 px-2 rounded-[3px] transition-colors border-l-4 ${confTier.cardBorderClass}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isOverdue && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-[2px] font-black border border-[#141416] ${overdueTier.badgeClass}`}>
                          Overdue by {Math.abs(info.daysDiff)} {Math.abs(info.daysDiff) === 1 ? 'day' : 'days'}
                        </span>
                      )}
                      {isDueToday && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-[2px] font-black border border-[#141416] ${CONFIDENCE_TIERS[3].badgeClass}`}>
                          Due Today
                        </span>
                      )}
                      {isDueSoon && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-[2px] font-black border border-[#141416] ${CONFIDENCE_TIERS[4].badgeClass}`}>
                          Due in {info.daysDiff} {info.daysDiff === 1 ? 'day' : 'days'}
                        </span>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[2px] border border-[#141416] ${subjectBadge(chapter.subject)}`}>
                        {chapter.subject}
                      </span>
                      <span className="text-sm font-black text-[#141416] uppercase">{chapter.name}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#5C5A52] flex-wrap">
                      <span>
                        Confidence:{' '}
                        <strong className={confTier.textClass}>
                          Level {chapter.currentConfidence}/5 ({confTier.label})
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Revisions Completed:{' '}
                        <strong className={revTier.textClass}>#{chapter.revisionCount}</strong>
                      </span>
                      {info.daysSinceLastStudied !== null && (
                        <>
                          <span>•</span>
                          <span>Last revised {info.daysSinceLastStudied} days ago</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenQuickLogForChapter(chapter.id)}
                    className="self-start sm:self-auto te-btn-mechanical px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer bg-[#ECEAE4] font-bold"
                  >
                    <span>Mark Revised</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Distinct Coaching Test Deadlines */}
      <div id="urgent-test-deadlines-section" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex items-center justify-between pb-3 border-b-2 border-[#141416] mx-2 font-mono">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0047FF] uppercase tracking-wider">Upcoming Deadlines</span>
              <h2 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0047FF]" />
                <span>Coaching Test Deadlines (Next 7 Days)</span>
              </h2>
            </div>
            <p className="text-xs text-[#5C5A52] mt-0.5">
              Chapters linked to upcoming test dates so you finish your syllabus in time.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-[3px] bg-[#0047FF] text-white border border-[#141416] shadow-[1px_1px_0px_#141416]">
            {testDeadlinesList.length} Chapters in Scope
          </span>
        </div>

        {testDeadlinesList.length === 0 ? (
          <div className="py-6 text-center text-[#5C5A52] font-mono text-xs">
            No test deadlines scheduled in the next 7 days.
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 mx-2 font-mono">
            {testDeadlinesList.map(({ chapter, info }) => {
              const confTier = getConfidenceTier(chapter.currentConfidence);
              return (
                <div
                  key={chapter.id}
                  className={`p-3 rounded-[4px] border border-[#141416] border-l-4 ${confTier.cardBorderClass} bg-[#ECEAE4] flex items-center justify-between gap-2 shadow-[2px_2px_0px_#141416]`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#141416] text-[#FAF9F6] uppercase">
                        {info.earliestTestDeadline?.test.coachingName || 'TEST'}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-[2px] ${confTier.badgeClass}`}>
                        L{chapter.currentConfidence}
                      </span>
                      <span className="text-xs font-black text-[#141416] uppercase">{chapter.name}</span>
                    </div>
                    <div className="text-xs text-[#5C5A52] mt-1">
                      Test in <strong className="text-[#0047FF] font-bold">{info.earliestTestDeadline?.daysUntil} {info.earliestTestDeadline?.daysUntil === 1 ? 'day' : 'days'}</strong> ({info.earliestTestDeadline?.test.date})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenQuickLogForChapter(chapter.id)}
                    className="te-btn-mechanical px-2.5 py-1 text-xs cursor-pointer bg-[#FAF9F6] font-bold"
                  >
                    Log Study
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Recent Study Activity Feed */}
      <div id="recent-study-logs-section" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex items-center justify-between pb-3 border-b-2 border-[#141416] mx-2 font-mono">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#141416]" />
            <h2 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight">Recent Study Sessions</h2>
          </div>
          <span className="text-[10px] text-[#5C5A52] font-mono font-semibold bg-[#ECEAE4] px-2 py-0.5 rounded-[2px] border border-[#141416]">
            Last 5 Sessions
          </span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-6 text-center text-[#5C5A52] font-mono text-xs">
            No study sessions logged yet. Tap "Log Study Session" to start tracking.
          </div>
        ) : (
          <div className="mt-3 divide-y-2 divide-[#E4E2DC] mx-2 font-mono">
            {recentLogs.map((log) => {
              const logTier = getConfidenceTier(log.confidenceRating);
              const revTier = getRevisionPassTier(log.revisionNumber);

              return (
                <div key={log.id} className={`py-2.5 flex items-start justify-between gap-3 text-xs border-l-4 pl-2 ${logTier.cardBorderClass}`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-[#141416] uppercase">{log.chapterName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-[2px] border border-[#141416] ${subjectBadge(log.subject)}`}>
                        {log.subject}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-[2px] ${revTier.badgeClass}`}>
                        Revision #{log.revisionNumber}
                      </span>
                    </div>
                    {log.note && (
                      <p className="text-[#5C5A52] text-xs bg-[#ECEAE4] p-1.5 rounded-[2px] border border-[#D5D2C8] mt-1">
                        "{log.note}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className={`inline-block font-black text-xs px-2 py-0.5 rounded-[2px] border border-[#141416] ${logTier.badgeClass}`}>
                        Level {log.confidenceRating}/5 ({logTier.label})
                      </span>
                      <div className="text-[10px] text-[#8C8A82] mt-0.5">{log.dateStudied}</div>
                    </div>

                    {onDeleteStudyLog && (
                      <div>
                        {confirmDeleteLogId === log.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playTrashVaporize();
                                onDeleteStudyLog(log.id);
                                setConfirmDeleteLogId(null);
                              }}
                              className="px-2 py-1 bg-[#DC2626] text-white text-[10px] font-black uppercase rounded-[2px] border border-[#141416] cursor-pointer shadow-[1px_1px_0px_#141416]"
                              title="Confirm delete session"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                sound.playModalClose();
                                setConfirmDeleteLogId(null);
                              }}
                              className="px-2 py-1 bg-[#ECEAE4] text-[#141416] text-[10px] font-bold rounded-[2px] border border-[#141416] cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              sound.playButtonClick();
                              setConfirmDeleteLogId(log.id);
                            }}
                            className="p-1 rounded-[2px] text-[#8C8A82] hover:text-[#DC2626] hover:bg-[#ECEAE4] transition-colors cursor-pointer border border-[#D5D2C8] hover:border-[#DC2626]"
                            title="Delete this study session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
