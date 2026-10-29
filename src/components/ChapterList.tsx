import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Layers,
  Archive,
  ArchiveRestore,
  Calendar,
  Plus,
  FileSpreadsheet,
  Eye,
  X,
  History,
  Zap,
  Check,
  CheckCircle2,
  Flame,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Chapter, ClusterInfo, LearningStage, StudyLog, Subject, Test } from '../types';
import { NEET_CLUSTERS } from '../data/seedData';
import { getChapterRevisionInfo, getTodayStr } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';
import {
  getConfidenceTier,
  getPercentageConfidenceTier,
  CONFIDENCE_TIERS,
} from '../utils/confidenceColor';

interface ChapterListProps {
  chapters: Chapter[];
  tests: Test[];
  studyLogs: StudyLog[];
  onOpenQuickLogForChapter: (chapterId: string) => void;
  onOpenAddChapter: () => void;
  onOpenBulkDeadline: () => void;
  onToggleArchiveChapter: (chapterId: string) => void;
  onQuickRateChapter?: (chapterId: string, rating: number) => void;
  onQuickUpdateStage?: (chapterId: string, stage: LearningStage) => void;
  onDeleteStudyLog?: (logId: string) => void;
  onResetChapterHistory?: (chapterId: string) => void;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  tests,
  studyLogs,
  onOpenQuickLogForChapter,
  onOpenAddChapter,
  onOpenBulkDeadline,
  onToggleArchiveChapter,
  onDeleteStudyLog,
  onResetChapterHistory,
}) => {
  const todayStr = getTodayStr();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'All'>('All');
  const [selectedClass, setSelectedClass] = useState<'All' | '11' | '12'>('All');
  const [stageFilter, setStageFilter] = useState<'All' | 'NOT_STARTED' | 'IN_PROGRESS' | 'FIRST_PASS_DONE' | 'IN_REVISION' | 'overdue' | 'ARCHIVED'>('All');
  const [confidenceFilter, setConfidenceFilter] = useState<'All' | number>('All');
  const [sortOption, setSortOption] = useState<'order' | 'urgency' | 'stage' | 'confidence_asc' | 'name'>('order');
  const [groupByCluster, setGroupByCluster] = useState<boolean>(true);
  const [selectedChapterForHistory, setSelectedChapterForHistory] = useState<Chapter | null>(null);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [confirmResetHistory, setConfirmResetHistory] = useState<boolean>(false);

  // Active chapter object reflecting real-time state
  const currentViewingChapter = useMemo(() => {
    if (!selectedChapterForHistory) return null;
    return chapters.find((c) => c.id === selectedChapterForHistory.id) || selectedChapterForHistory;
  }, [chapters, selectedChapterForHistory]);

  // Active chapters & summary telemetry
  const activeChapters = useMemo(() => chapters.filter((c) => !c.isArchived), [chapters]);
  const archivedCount = useMemo(() => chapters.filter((c) => c.isArchived).length, [chapters]);
  const totalCount = activeChapters.length;

  const notStartedCount = activeChapters.filter((c) => {
    const info = getChapterRevisionInfo(c, tests, todayStr);
    return info.learningStage === 'NOT_STARTED';
  }).length;

  const inProgressCount = activeChapters.filter((c) => {
    const info = getChapterRevisionInfo(c, tests, todayStr);
    return info.learningStage === 'IN_PROGRESS';
  }).length;

  const firstPassDoneCount = activeChapters.filter((c) => {
    const info = getChapterRevisionInfo(c, tests, todayStr);
    return info.learningStage === 'FIRST_PASS_DONE' || info.learningStage === 'IN_REVISION';
  }).length;

  const overdueCount = activeChapters.filter((c) => {
    const info = getChapterRevisionInfo(c, tests, todayStr);
    return info.status === 'overdue';
  }).length;

  const syllabusDonePercent = totalCount > 0 ? Math.round((firstPassDoneCount / totalCount) * 100) : 0;

  // Filtered chapters
  const filteredChapters = useMemo(() => {
    let list = chapters.filter((c) => {
      // Archive handling: only show archived chapters when specifically selected
      if (stageFilter === 'ARCHIVED') {
        if (!c.isArchived) return false;
      } else {
        if (c.isArchived) return false;
      }

      const info = getChapterRevisionInfo(c, tests, todayStr);

      // Stage & status filter
      if (stageFilter === 'NOT_STARTED' && info.learningStage !== 'NOT_STARTED') return false;
      if (stageFilter === 'IN_PROGRESS' && info.learningStage !== 'IN_PROGRESS') return false;
      if (stageFilter === 'FIRST_PASS_DONE' && info.learningStage !== 'FIRST_PASS_DONE') return false;
      if (stageFilter === 'IN_REVISION' && info.learningStage !== 'IN_REVISION') return false;
      if (stageFilter === 'overdue' && info.status !== 'overdue') return false;

      // Confidence level filter
      if (confidenceFilter !== 'All' && (c.currentConfidence || 0) !== confidenceFilter) return false;

      // Subject filter
      if (selectedSubject !== 'All' && c.subject !== selectedSubject) return false;

      // Class filter
      if (selectedClass !== 'All' && c.classLevel !== selectedClass) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCluster = c.clusterName.toLowerCase().includes(q);
        const matchSubject = c.subject.toLowerCase().includes(q);
        if (!matchName && !matchCluster && !matchSubject) return false;
      }

      return true;
    });

    // Sorting
    if (sortOption === 'urgency') {
      list = [...list].sort((a, b) => {
        const infoA = getChapterRevisionInfo(a, tests, todayStr);
        const infoB = getChapterRevisionInfo(b, tests, todayStr);
        return infoA.daysDiff - infoB.daysDiff;
      });
    } else if (sortOption === 'stage') {
      const order = { NOT_STARTED: 0, IN_PROGRESS: 1, FIRST_PASS_DONE: 2, IN_REVISION: 3 };
      list = [...list].sort((a, b) => {
        const stageA = getChapterRevisionInfo(a, tests, todayStr).learningStage;
        const stageB = getChapterRevisionInfo(b, tests, todayStr).learningStage;
        return order[stageA] - order[stageB];
      });
    } else if (sortOption === 'confidence_asc') {
      list = [...list].sort((a, b) => a.currentConfidence - b.currentConfidence);
    } else if (sortOption === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [chapters, selectedSubject, selectedClass, stageFilter, searchQuery, sortOption, tests, todayStr]);

  // Group chapters by cluster if enabled
  const groupedByClusterData = useMemo(() => {
    const groups: { cluster: ClusterInfo; chapters: Chapter[] }[] = [];

    NEET_CLUSTERS.forEach((cluster) => {
      const clusterChapters = filteredChapters.filter((c) => c.clusterId === cluster.id);
      if (clusterChapters.length > 0) {
        groups.push({
          cluster,
          chapters: clusterChapters,
        });
      }
    });

    const knownClusterIds = new Set(NEET_CLUSTERS.map((c) => c.id));
    const otherChapters = filteredChapters.filter((c) => !knownClusterIds.has(c.clusterId));
    if (otherChapters.length > 0) {
      groups.push({
        cluster: { id: 99, name: 'Other / Custom Chapters', subject: 'Physics', description: 'Additional topics' },
        chapters: otherChapters,
      });
    }

    return groups;
  }, [filteredChapters]);

  const historyLogs = useMemo(() => {
    if (!selectedChapterForHistory) return [];
    return studyLogs
      .filter((l) => l.chapterId === selectedChapterForHistory.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedChapterForHistory, studyLogs]);

  return (
    <div className="space-y-5 font-mono">
      {/* 1. Mastery Status & Action Header */}
      <div className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#141416] mx-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF3B00] uppercase tracking-wider">NEET Syllabus Matrix</span>
              <h2 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FF3B00]" />
                <span>{totalCount} Chapters · 11th & 12th PCB Coverage</span>
              </h2>
            </div>
            <p className="text-xs text-[#5C5A52] mt-0.5">
              Track multi-day 1st pass study progress, log NCERT/lecture pillars, and view revision readiness.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenBulkDeadline}
              className="te-btn-mechanical px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer bg-[#ECEAE4] font-bold"
              title="Bulk assign target exam dates"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Deadlines</span>
            </button>

            <button
              onClick={onOpenAddChapter}
              className="te-btn-orange px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Custom Chapter</span>
            </button>
          </div>
        </div>

        {/* Syllabus Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 mx-2">
          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">1st Pass Done</span>
            <span className="text-sm sm:text-base font-black text-[#141416] mt-0.5 block">
              {firstPassDoneCount} / {totalCount} ({syllabusDonePercent}%)
            </span>
            <div className="w-full bg-[#D6D2C4] h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-[#0047FF] h-full" style={{ width: `${syllabusDonePercent}%` }} />
            </div>
          </div>

          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">In Progress (Studying)</span>
            <span className="text-sm sm:text-base font-black text-[#FFB800] mt-0.5 block">
              {inProgressCount} Chapters
            </span>
            <div className="text-[9px] text-[#5C5A52] mt-1">Multi-day ongoing study</div>
          </div>

          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">Not Started (Zero)</span>
            <span className="text-sm sm:text-base font-black text-[#FF3B00] mt-0.5 block">
              {notStartedCount} Chapters
            </span>
            <div className="text-[9px] text-[#5C5A52] mt-1">Ready for 1st pass</div>
          </div>

          <div className="p-2.5 bg-[#ECEAE4] rounded-[3px] border border-[#141416]">
            <span className="text-[10px] text-[#5C5A52] font-black uppercase block">Spaced Revision Due</span>
            <span className="text-sm sm:text-base font-black text-[#FF3B00] mt-0.5 block">
              {overdueCount} Due
            </span>
            <div className="text-[9px] text-[#5C5A52] mt-1">Needs review</div>
          </div>
        </div>
      </div>

      {/* 2. Search & Filters Bar */}
      <div className="te-chassis-card p-4 relative overflow-hidden bg-[#FAF9F6]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mx-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#8C8A82] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chapters, concepts, NCERT units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] placeholder:text-[#8C8A82] focus:outline-none focus:bg-white font-bold"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8A82] hover:text-[#141416] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grouping & Sort Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="text-xs px-2.5 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] font-bold cursor-pointer"
            >
              <option value="order">NCERT Syllabus Order</option>
              <option value="stage">Learning Stage (Unstarted First)</option>
              <option value="urgency">Urgency / Overdue First</option>
              <option value="confidence_asc">Lowest Confidence First</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>

            <button
              type="button"
              onClick={() => setGroupByCluster(!groupByCluster)}
              className={`px-3 py-2 rounded-[3px] text-xs font-bold border-2 transition-colors flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#141416] ${
                groupByCluster
                  ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                  : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{groupByCluster ? 'Unit Groups' : 'Flat List'}</span>
            </button>
          </div>
        </div>

        {/* Filter Switch Banks */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t-2 border-[#141416] mx-1 text-xs">
          {/* Subject Switch Bank */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[#5C5A52] font-black uppercase text-[10px] mr-1">Subject:</span>
            {(['All', 'Physics', 'Chemistry', 'Botany', 'Zoology'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-black uppercase transition-all cursor-pointer border ${
                  selectedSubject === s
                    ? s === 'Physics'
                      ? 'bg-[#0047FF] text-white border-[#141416] shadow-[2px_2px_0px_#141416]'
                      : s === 'Chemistry'
                      ? 'bg-[#9333EA] text-white border-[#141416] shadow-[2px_2px_0px_#141416]'
                      : s === 'Botany'
                      ? 'bg-[#FFB800] text-[#141416] border-[#141416] shadow-[2px_2px_0px_#141416]'
                      : s === 'Zoology'
                      ? 'bg-[#FF3B00] text-white border-[#141416] shadow-[2px_2px_0px_#141416]'
                      : 'bg-[#141416] text-[#FAF9F6] border-[#141416] shadow-[2px_2px_0px_#FF3B00]'
                    : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416]'
                }`}
              >
                {s === 'All' ? 'ALL' : s}
              </button>
            ))}
          </div>

          {/* Class Level Switch Bank */}
          <div className="flex items-center gap-1">
            <span className="text-[#5C5A52] font-black uppercase text-[10px] mr-1">Class:</span>
            {(['All', '11', '12'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedClass(c)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-black uppercase transition-all cursor-pointer border ${
                  selectedClass === c
                    ? 'bg-[#141416] text-white border-[#141416] shadow-[2px_2px_0px_#FF3B00]'
                    : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416]'
                }`}
              >
                {c === 'All' ? '11 & 12' : `Class ${c}`}
              </button>
            ))}
          </div>

          {/* Learning Stage Filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[#5C5A52] font-black uppercase text-[10px] mr-1">Stage:</span>
            {[
              { id: 'All', label: 'All' },
              { id: 'NOT_STARTED', label: '0% Unstarted' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'FIRST_PASS_DONE', label: '1st Pass Done' },
              { id: 'overdue', label: 'Overdue' },
              ...(archivedCount > 0 ? [{ id: 'ARCHIVED', label: `Archived (${archivedCount})` }] : []),
            ].map((sf) => (
              <button
                key={sf.id}
                onClick={() => setStageFilter(sf.id as any)}
                className={`px-2 py-0.5 rounded-[2px] text-[11px] font-black uppercase cursor-pointer border ${
                  stageFilter === sf.id
                    ? sf.id === 'NOT_STARTED'
                      ? 'bg-[#FF3B00] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                      : sf.id === 'IN_PROGRESS'
                      ? 'bg-[#FFB800] text-[#141416] border-[#141416] shadow-[1px_1px_0px_#141416]'
                      : 'bg-[#141416] text-[#FAF9F6] border-[#141416] shadow-[1px_1px_0px_#FF3B00]'
                    : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416]'
                }`}
              >
                {sf.label}
              </button>
            ))}
          </div>

          {/* Confidence Level Filter Bank */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[#5C5A52] font-black uppercase text-[10px] mr-1">Confidence:</span>
            <button
              onClick={() => setConfidenceFilter('All')}
              className={`px-2 py-0.5 rounded-[2px] text-[11px] font-black uppercase cursor-pointer border ${
                confidenceFilter === 'All'
                  ? 'bg-[#141416] text-white border-[#141416] shadow-[1px_1px_0px_#FF3B00]'
                  : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416]'
              }`}
            >
              All
            </button>
            {[1, 2, 3, 4, 5, 0].map((lvl) => {
              const tier = CONFIDENCE_TIERS[lvl];
              const isSelected = confidenceFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setConfidenceFilter(lvl)}
                  className={`px-2 py-0.5 rounded-[2px] text-[11px] font-black uppercase cursor-pointer border transition-all ${
                    isSelected
                      ? `${tier.badgeClass} shadow-[1px_1px_0px_#141416] -translate-y-0.5`
                      : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416]'
                  }`}
                >
                  {lvl === 0 ? '★0 Unrated' : `★${lvl}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Chapters Content List */}
      {filteredChapters.length === 0 ? (
        <div className="te-chassis-card p-10 text-center text-[#5C5A52] text-xs bg-[#FAF9F6] border-2 border-[#141416]">
          <p className="font-bold uppercase">No chapters found matching current filters.</p>
          <p className="mt-1 text-[11px]">Try resetting search or filters above.</p>
        </div>
      ) : groupByCluster && sortOption === 'order' ? (
        /* Grouped by NCERT Units */
        <div className="space-y-4">
          {groupedByClusterData.map(({ cluster, chapters: clChapters }) => {
            const clusterDone = clChapters.filter((c) => {
              const info = getChapterRevisionInfo(c, tests, todayStr);
              return info.learningStage === 'FIRST_PASS_DONE' || info.learningStage === 'IN_REVISION';
            }).length;

            return (
              <div key={cluster.id} className="te-chassis-card bg-[#FAF9F6] overflow-hidden border-2 border-[#141416] shadow-[3px_3px_0px_#141416]">
                <div className="bg-[#ECEAE4] px-4 py-2.5 border-b-2 border-[#141416] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black px-2 py-0.5 rounded-[2px] bg-[#141416] text-[#FAF9F6] uppercase">
                      Unit {cluster.id}
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-[#141416] uppercase">{cluster.name}</h3>
                    <span className="text-[11px] text-[#5C5A52]">({cluster.subject})</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-[#5C5A52]">
                      {clChapters.length} Chs · {clusterDone}/{clChapters.length} 1st Pass Done
                    </span>
                  </div>
                </div>

                <div className="divide-y-2 divide-[#E4E2DC]">
                  {clChapters.map((c) => (
                    <ChapterRow
                      key={c.id}
                      chapter={c}
                      tests={tests}
                      todayStr={todayStr}
                      onOpenLog={() => onOpenQuickLogForChapter(c.id)}
                      onViewHistory={() => setSelectedChapterForHistory(c)}
                      onToggleArchive={() => onToggleArchiveChapter(c.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat List View */
        <div className="te-chassis-card bg-[#FAF9F6] overflow-hidden border-2 border-[#141416] shadow-[3px_3px_0px_#141416] divide-y-2 divide-[#E4E2DC]">
          {filteredChapters.map((c) => (
            <ChapterRow
              key={c.id}
              chapter={c}
              tests={tests}
              todayStr={todayStr}
              onOpenLog={() => onOpenQuickLogForChapter(c.id)}
              onViewHistory={() => setSelectedChapterForHistory(c)}
              onToggleArchive={() => onToggleArchiveChapter(c.id)}
            />
          ))}
        </div>
      )}

      {/* 4. Chapter Study History Drawer / Modal */}
      {currentViewingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141416]/75 backdrop-blur-xs">
          <div className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416]">
              <div>
                <span className="text-[10px] text-[#FF3B00] font-black uppercase">Study Logs & Timeline</span>
                <h3 className="text-sm font-black uppercase text-white truncate max-w-sm">
                  {currentViewingChapter.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  sound.playModalClose();
                  setSelectedChapterForHistory(null);
                  setConfirmDeleteLogId(null);
                }}
                className="text-[#8C8A82] hover:text-white p-1 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="p-3 bg-[#ECEAE4] rounded-[3px] border border-[#141416] text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#5C5A52]">Subject:</span>
                  <strong className="text-[#141416]">{currentViewingChapter.subject}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5A52]">Current Confidence:</span>
                  <strong className="text-[#FF3B00]">★ Level {currentViewingChapter.currentConfidence || 0}/5</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5A52]">Completion Status:</span>
                  <strong className="text-[#141416]">
                    {currentViewingChapter.completionPercentage !== undefined
                      ? `${currentViewingChapter.completionPercentage}%`
                      : currentViewingChapter.learningStage === 'FIRST_PASS_DONE'
                      ? '100% Done'
                      : '0% Unstarted'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5A52]">Revisions Logged:</span>
                  <strong className="text-[#0047FF]">{currentViewingChapter.revisionCount || 0} times</strong>
                </div>
                {currentViewingChapter.nextRevisionDate && (
                  <div className="flex justify-between pt-1 border-t border-[#D5D2C8]">
                    <span className="text-[#5C5A52]">Next Scheduled Revision:</span>
                    <strong className="text-[#FF3B00]">{currentViewingChapter.nextRevisionDate}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#FF3B00]" />
                    <span>Logged Sessions ({historyLogs.length})</span>
                  </h4>
                  {onResetChapterHistory && historyLogs.length > 0 && (
                    <div>
                      {confirmResetHistory ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playTrashVaporize();
                              onResetChapterHistory(currentViewingChapter.id);
                              setConfirmResetHistory(false);
                            }}
                            className="px-2 py-0.5 bg-[#FF3B00] text-white text-[10px] font-black uppercase rounded-[2px] border border-[#141416] cursor-pointer shadow-[1px_1px_0px_#141416]"
                          >
                            Confirm Reset All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playModalClose();
                              setConfirmResetHistory(false);
                            }}
                            className="px-2 py-0.5 bg-[#ECEAE4] text-[#141416] text-[10px] font-bold rounded-[2px] border border-[#141416] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playButtonClick();
                            setConfirmResetHistory(true);
                          }}
                          className="text-[10px] text-[#FF3B00] hover:underline font-bold uppercase cursor-pointer"
                          title="Reset entire history and uncomplete this chapter"
                        >
                          Clear All History
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {historyLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#5C5A52] bg-[#ECEAE4] rounded-[3px] border border-dashed border-[#8C8A82]">
                    No individual study sessions logged for this chapter.
                  </div>
                ) : (
                  historyLogs.map((log) => {
                    const logTier = getConfidenceTier(log.confidenceRating);
                    return (
                      <div
                        key={log.id}
                        className={`p-3 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] shadow-[2px_2px_0px_#141416] text-xs space-y-2 border-l-4 ${logTier.cardBorderClass}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-[#141416]">{log.dateStudied}</span>
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-[2px] ${logTier.badgeClass}`}>
                                ★ Level {log.confidenceRating}/5 ({logTier.label})
                              </span>
                              {log.completionPercentage !== undefined && log.completionPercentage !== null && (
                                <span className="text-[10px] text-[#0047FF] font-black px-1.5 py-0.2 bg-[#0047FF]/10 border border-[#0047FF]/30 rounded-[2px]">
                                  {log.completionPercentage}% Progress
                                </span>
                              )}
                            </div>
                            {log.sessionType && (
                              <div className="text-[10px] text-[#5C5A52] uppercase font-bold mt-0.5">
                                Type: {log.sessionType.replace(/_/g, ' ')}
                              </div>
                            )}
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
                                  className="px-2 py-1 bg-[#FF3B00] text-white text-[10px] font-black uppercase rounded-[2px] border border-[#141416] cursor-pointer shadow-[1px_1px_0px_#141416]"
                                  title="Confirm delete this specific log"
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
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playButtonClick();
                                  setConfirmDeleteLogId(log.id);
                                }}
                                className="p-1 rounded-[2px] text-[#8C8A82] hover:text-[#FF3B00] hover:bg-[#ECEAE4] transition-colors cursor-pointer border border-[#D5D2C8] hover:border-[#FF3B00]"
                                title="Delete this specific log entry to fix mistakes"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pillars logged for this session */}
                      {log.pillarsCompleted && (
                        <div className="flex items-center gap-1 text-[9px] text-[#5C5A52] flex-wrap pt-1 border-t border-[#ECEAE4]">
                          <span className={`px-1.5 py-0.2 rounded-[2px] border ${log.pillarsCompleted.lectures ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] text-[#8C8A82] border-[#D5D2C8]'}`}>
                            {log.pillarsCompleted.lectures ? '✓ Lectures' : 'Lectures'}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-[2px] border ${(log.pillarsCompleted.bookReading || log.pillarsCompleted.ncertReading) ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] text-[#8C8A82] border-[#D5D2C8]'}`}>
                            {(log.pillarsCompleted.bookReading || log.pillarsCompleted.ncertReading) ? '✓ Book Reading' : 'Book Reading'}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-[2px] border ${log.pillarsCompleted.classNotes ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] text-[#8C8A82] border-[#D5D2C8]'}`}>
                            {log.pillarsCompleted.classNotes ? '✓ Notes' : 'Notes'}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-[2px] border ${log.pillarsCompleted.questionPractice ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] text-[#8C8A82] border-[#D5D2C8]'}`}>
                            {log.pillarsCompleted.questionPractice ? '✓ PYQs' : 'PYQs'}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-[2px] border ${log.pillarsCompleted.anki ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] text-[#8C8A82] border-[#D5D2C8]'}`}>
                            {log.pillarsCompleted.anki ? '✓ Anki' : 'Anki'}
                          </span>
                        </div>
                      )}

                      {log.note && (
                        <p className="text-[#33322E] italic text-[11px] bg-[#ECEAE4] p-1.5 rounded-[2px] border border-[#D5D2C8]">
                          "{log.note}"
                        </p>
                      )}

                      {confirmDeleteLogId === log.id && (
                        <div className="flex items-center gap-1.5 p-1.5 bg-[#FFF4F0] border border-[#FF3B00] rounded-[2px] text-[10px] text-[#FF3B00] font-bold">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Deleting recalculates confidence and spaced schedule automatically.</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

            <div className="p-3 bg-[#ECEAE4] border-t-2 border-[#141416] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playModalClose();
                  setSelectedChapterForHistory(null);
                  setConfirmDeleteLogId(null);
                }}
                className="te-btn-mechanical px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ChapterRowProps {
  chapter: Chapter;
  tests: Test[];
  todayStr: string;
  onOpenLog: () => void;
  onViewHistory: () => void;
  onToggleArchive: () => void;
}

const ChapterRow: React.FC<ChapterRowProps> = ({
  chapter,
  tests,
  todayStr,
  onOpenLog,
  onViewHistory,
  onToggleArchive,
}) => {
  const info = getChapterRevisionInfo(chapter, tests, todayStr);
  const pillars = chapter.pillars || {};
  const confTier = getConfidenceTier(chapter.currentConfidence);

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

  const stageBadge = () => {
    const pct = chapter.completionPercentage !== undefined ? chapter.completionPercentage : (info.learningStage === 'NOT_STARTED' ? 0 : 100);
    switch (info.learningStage) {
      case 'NOT_STARTED':
        return (
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-[2px] bg-[#ECEAE4] text-[#71717A] border border-[#18181B] uppercase">
            0% Unstarted
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-[2px] bg-[#F59E0B] text-[#18181B] border border-[#18181B] uppercase flex items-center gap-1">
            <span>{pct}% In-Progress</span>
          </span>
        );
      case 'FIRST_PASS_DONE':
        return (
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-[2px] bg-[#2563EB] text-white border border-[#18181B] uppercase">
            100% 1st Pass Done
          </span>
        );
      case 'IN_REVISION':
        return (
          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-[2px] bg-[#18181B] text-[#FAF9F6] border border-[#18181B] uppercase">
            Rev #{chapter.revisionCount}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`p-3 sm:px-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors hover:bg-[#ECEAE4]/60 border-l-4 ${confTier.cardBorderClass}`}>
      {/* Left side: Chapter Details, Tags, Stage Status */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-[2px] border border-[#141416] uppercase ${subjectBadge(chapter.subject)}`}>
            {(chapter.subject || '').slice(0, 3)}
          </span>

          {chapter.classLevel && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#ECEAE4] text-[#141416] border border-[#141416]">
              Class {chapter.classLevel}
            </span>
          )}

          {stageBadge()}

          {/* Unified Confidence Badge */}
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-[2px] ${confTier.badgeClass} flex items-center gap-1`}>
            <span>★ {chapter.currentConfidence > 0 ? `L${chapter.currentConfidence}` : 'L0 Unrated'}</span>
          </span>

          <h4 className="text-xs sm:text-sm font-black text-[#141416] uppercase truncate">
            {chapter.name}
          </h4>

          {chapter.isArchived && (
            <span className="text-[9px] px-1.5 py-0.2 rounded-[2px] bg-[#ECEAE4] text-[#8C8A82] border border-[#141416] font-bold uppercase">
              Archived
            </span>
          )}
        </div>

        {/* Progress & Timing Bar for In-Progress and 1st Pass Done chapters */}
        {info.learningStage === 'IN_PROGRESS' ? (
          <div className="flex items-center gap-3 text-[11px] text-[#5C5A52]">
            <div className="w-28 bg-[#E5E3DC] h-1.5 rounded-[1px] overflow-hidden border border-[#141416]">
              <div
                className="bg-[#FF3B00] h-full"
                style={{ width: `${chapter.completionPercentage || 30}%` }}
              />
            </div>
            <span className="font-mono font-bold text-[#FF3B00] text-[10.5px]">
              {chapter.completionPercentage || 30}% In-Progress
            </span>
            {chapter.startedDate && (
              <span className="text-[#FF3B00] font-bold text-[10px] flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>Day {info.daysActive || 1} active ({chapter.totalStudySessions || 1} sessions)</span>
              </span>
            )}
          </div>
        ) : (info.learningStage === 'FIRST_PASS_DONE' || info.learningStage === 'IN_REVISION') ? (
          <div className="flex items-center gap-3 text-[11px] text-[#5C5A52]">
            <div className="w-28 bg-[#E5E3DC] h-1.5 rounded-[1px] overflow-hidden border border-[#141416]">
              <div className="bg-[#0052FF] h-full w-full" />
            </div>
            <span className="font-mono font-black text-[#0052FF] text-[10.5px] flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>100% 1st Pass Complete {chapter.daysTakenToComplete ? `(in ${chapter.daysTakenToComplete}d)` : ''}</span>
            </span>
          </div>
        ) : null}

        {/* Telemetry metadata */}
        <div className="flex items-center gap-2.5 text-xs text-[#5C5A52] flex-wrap">
          <div>
            Confidence:{' '}
            <strong className={`${confTier.textClass} font-black`}>
              {chapter.currentConfidence ? `★ Level ${chapter.currentConfidence}/5 (${confTier.label})` : 'Unrated (L0)'}
            </strong>
          </div>

          <span>•</span>
          <div>
            Last Studied:{' '}
            <strong className="text-[#141416]">
              {info.daysSinceLastStudied !== null ? `${info.daysSinceLastStudied}d ago` : 'Never'}
            </strong>
          </div>

          <span>•</span>
          <div className="text-[#0052FF] font-bold font-mono">
            {info.learningStage === 'FIRST_PASS_DONE' || info.learningStage === 'IN_REVISION'
              ? '✓ 100% Syllabus Covered'
              : `${chapter.completionPercentage || 0}% Progress`}
          </div>

          {info.learningStage === 'FIRST_PASS_DONE' || info.learningStage === 'IN_REVISION' ? (
            <>
              <span>•</span>
              <div>
                Next Revision:{' '}
                <strong className={`${
                  info.status === 'overdue'
                    ? 'text-[#FF3B00] font-black'
                    : info.status === 'due_today'
                    ? 'text-[#FFB800] font-black'
                    : 'text-[#141416]'
                }`}>
                  {chapter.nextRevisionDate || 'Scheduled'}
                  {info.status === 'overdue' && ` (Overdue by ${Math.abs(info.daysDiff)}d)`}
                  {info.status === 'due_today' && ` (Today!)`}
                </strong>
              </div>
            </>
          ) : null}

          {info.earliestTestDeadline && (
            <>
              <span>•</span>
              <div className="text-[#0047FF] font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  Exam: {info.earliestTestDeadline.test.date} ({info.earliestTestDeadline.daysUntil}d away)
                </span>
              </div>
            </>
          )}
        </div>

        {/* 5 Pillars Mini Pills */}
        <div className="flex items-center gap-1.5 pt-0.5 text-[9px] text-[#5C5A52] flex-wrap">
          <span className={`px-1.5 py-0.2 rounded-[2px] border ${pillars.lectures ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] border-[#D5D2C8]'}`}>
            {pillars.lectures ? '✓ Lec' : 'Lec'}
          </span>
          <span className={`px-1.5 py-0.2 rounded-[2px] border ${(pillars.bookReading || pillars.ncertReading) ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] border-[#D5D2C8]'}`}>
            {(pillars.bookReading || pillars.ncertReading) ? '✓ Book' : 'Book'}
          </span>
          <span className={`px-1.5 py-0.2 rounded-[2px] border ${pillars.classNotes ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] border-[#D5D2C8]'}`}>
            {pillars.classNotes ? '✓ Notes' : 'Notes'}
          </span>
          <span className={`px-1.5 py-0.2 rounded-[2px] border ${pillars.questionPractice ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] border-[#D5D2C8]'}`}>
            {pillars.questionPractice ? '✓ PYQ' : 'PYQ'}
          </span>
          <span className={`px-1.5 py-0.2 rounded-[2px] border ${pillars.anki ? 'bg-[#141416] text-white border-[#141416]' : 'bg-[#ECEAE4] border-[#D5D2C8]'}`}>
            {pillars.anki ? '✓ Anki' : 'Anki'}
          </span>
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
        <button
          type="button"
          onClick={onViewHistory}
          className="p-1.5 rounded-[2px] text-[#5C5A52] hover:text-[#141416] hover:bg-[#ECEAE4] transition-colors cursor-pointer border border-[#141416]"
          title="View study history"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleArchive}
          className="p-1.5 rounded-[2px] text-[#8C8A82] hover:text-[#141416] hover:bg-[#ECEAE4] transition-colors cursor-pointer border border-[#141416]"
          title={chapter.isArchived ? 'Restore chapter' : 'Archive chapter'}
        >
          {chapter.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={onOpenLog}
          className="te-btn-orange px-3 py-1.5 text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#141416]"
          title="Log multi-day study progress or mark 1st pass complete"
        >
          <Zap className="w-3 h-3 fill-white" />
          <span>+ Log Study</span>
        </button>
      </div>
    </div>
  );
};
