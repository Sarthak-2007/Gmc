import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sliders,
  CheckCircle2,
  Flame,
  CheckSquare,
  Square,
  MessageSquare,
} from 'lucide-react';
import { Chapter, SpacedRepetitionSettings, StudyPillars, StudySessionType, Subject } from '../types';
import { calculateNextGap, getDaysDifference, getTodayStr } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';
import { getConfidenceTier } from '../utils/confidenceColor';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  preselectedChapterId?: string;
  settings: SpacedRepetitionSettings;
  onSaveLog: (
    chapterId: string,
    confidenceRating: number,
    dateStudied: string,
    note?: string,
    sessionType?: StudySessionType,
    completionPercentage?: number,
    pillarsCompleted?: StudyPillars,
    hoursSpent?: number
  ) => void;
}

const CONFIDENCE_LEVELS = [
  {
    value: 1,
    label: '★ 1: Struggling / Confused',
    desc: 'Struggling with formulas or core concepts.',
  },
  {
    value: 2,
    label: '★ 2: Weak / Needs More Practice',
    desc: 'Partial grasp, frequent mistakes in questions.',
  },
  {
    value: 3,
    label: '★ 3: Moderate / Concepts Clear',
    desc: 'Standard understanding, solved moderate Qs.',
  },
  {
    value: 4,
    label: '★ 4: Strong / High Accuracy',
    desc: 'Fast problem solving & high recall.',
  },
  {
    value: 5,
    label: '★ 5: Mastered / Exam Ready',
    desc: 'Flawless recall, PYQs solved with speed.',
  },
];

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  chapters,
  preselectedChapterId,
  settings,
  onSaveLog,
}) => {
  const today = getTodayStr();
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    preselectedChapterId || (chapters.length > 0 ? chapters[0].id : '')
  );

  const [isChangingChapter, setIsChangingChapter] = useState<boolean>(!preselectedChapterId);

  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === selectedChapterId),
    [chapters, selectedChapterId]
  );

  // Initialize progress state based on selected chapter
  const [completionPercentage, setCompletionPercentage] = useState<number>(
    selectedChapter?.completionPercentage ??
      (selectedChapter?.learningStage === 'FIRST_PASS_DONE' || selectedChapter?.learningStage === 'IN_REVISION' ? 100 : 25)
  );

  const [pillars, setPillars] = useState<StudyPillars>(
    selectedChapter?.pillars || {
      lectures: false,
      bookReading: false,
      ncertReading: false,
      classNotes: false,
      questionPractice: false,
      anki: false,
    }
  );

  const [confidence, setConfidence] = useState<number>(selectedChapter?.currentConfidence || 3);
  const [dateStudied, setDateStudied] = useState<string>(today);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showComment, setShowComment] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<Subject | 'All'>('All');

  // Update when selected chapter changes or modal opens
  useEffect(() => {
    if (preselectedChapterId) {
      setSelectedChapterId(preselectedChapterId);
      setIsChangingChapter(false);
    }
  }, [preselectedChapterId]);

  useEffect(() => {
    if (selectedChapter) {
      const isAlreadyDone =
        selectedChapter.learningStage === 'FIRST_PASS_DONE' ||
        selectedChapter.learningStage === 'IN_REVISION' ||
        (selectedChapter.revisionCount || 0) >= 1;

      setCompletionPercentage(
        selectedChapter.completionPercentage ?? (isAlreadyDone ? 100 : 30)
      );
      setPillars(
        selectedChapter.pillars || {
          lectures: isAlreadyDone,
          bookReading: isAlreadyDone,
          ncertReading: isAlreadyDone,
          classNotes: isAlreadyDone,
          questionPractice: isAlreadyDone,
          anki: isAlreadyDone,
        }
      );
      setConfidence(selectedChapter.currentConfidence || 3);
    }
  }, [selectedChapterId]);

  const filteredChapters = useMemo(() => {
    return chapters.filter((c) => {
      if (c.isArchived) return false;
      if (subjectFilter !== 'All' && c.subject !== subjectFilter) return false;
      if (searchQuery.trim() && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [chapters, subjectFilter, searchQuery]);

  // Derive session type from percentage & chapter history
  const isAlreadyFinished1stPass =
    (selectedChapter?.revisionCount || 0) >= 1 ||
    selectedChapter?.learningStage === 'FIRST_PASS_DONE' ||
    selectedChapter?.learningStage === 'IN_REVISION';

  let derivedSessionType: StudySessionType = 'progress';
  if (completionPercentage >= 100) {
    derivedSessionType = isAlreadyFinished1stPass ? 'revision_round_complete' : 'first_pass_complete';
  } else {
    derivedSessionType = 'progress';
  }

  // Days calculations
  const daysActive = selectedChapter?.startedDate
    ? Math.max(1, getDaysDifference(selectedChapter.startedDate, dateStudied) + 1)
    : 1;

  // Next projected gap
  const nextRevCount =
    derivedSessionType === 'progress'
      ? 0
      : isAlreadyFinished1stPass
      ? (selectedChapter?.revisionCount || 1) + 1
      : 1;
  const nextGapDays = calculateNextGap(Math.max(1, nextRevCount), confidence, settings);

  const togglePillar = (pillarKey: keyof StudyPillars) => {
    setPillars((prev) => {
      const willBeChecked = !prev[pillarKey];
      sound.playPillarToggle(willBeChecked);
      const next = { ...prev, [pillarKey]: willBeChecked };
      const checkedCount = Object.values(next).filter(Boolean).length;
      if (checkedCount === 4 && completionPercentage < 100) {
        setCompletionPercentage(100);
      } else if (checkedCount > 0 && completionPercentage === 0) {
        setCompletionPercentage(checkedCount * 25);
      }
      return next;
    });
  };

  const handlePercentageChange = (pct: number) => {
    sound.playKeyClick();
    setCompletionPercentage(pct);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return;
    sound.playCommitSuccess();
    onSaveLog(
      selectedChapterId,
      confidence,
      dateStudied,
      noteText,
      derivedSessionType,
      completionPercentage,
      pillars,
      undefined
    );
    onClose();
  };

  const subjectBadge = (subject?: string) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#0047FF] text-white';
      case 'Chemistry':
        return 'bg-[#9333EA] text-white';
      case 'Botany':
        return 'bg-[#FFB800] text-[#141416] font-black';
      case 'Zoology':
        return 'bg-[#FF3B00] text-white font-black';
      default:
        return 'bg-[#2A2A30] text-white';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141416]/75 backdrop-blur-xs font-mono">
      <div
        id="quick-log-modal-card"
        className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] w-full max-w-xl overflow-hidden flex flex-col max-h-[94vh] relative"
      >
        {/* Corner Industrial Screws */}
        <div className="absolute top-2 left-2 z-10"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2 z-10"><span className="te-screw" /></div>

        {/* Header Strip */}
        <div className="px-5 py-3.5 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416] pl-7 pr-6 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#FF3B00] font-black tracking-wider uppercase">
                PCB STUDY LOGGING TERMINAL
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-[1px] bg-[#2A2A30] text-[#E4E2DC] font-bold">
                PROGRESS ENGINE
              </span>
            </div>
            <h2 className="text-sm font-black uppercase text-white tracking-tight">
              Log Session & Update Chapter Progress
            </h2>
          </div>
          <button
            id="close-quick-log-btn"
            onClick={onClose}
            className="text-[#8C8A82] hover:text-white p-1 rounded hover:bg-[#2A2A30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. Target Chapter Display (Fixed when logged from chapter, switchable on request) */}
          <div className="bg-[#ECEAE4] p-3 rounded-[4px] border-2 border-[#141416]">
            {!isChangingChapter && selectedChapter ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#5C5A52]">Target Chapter</span>
                  <button
                    type="button"
                    onClick={() => setIsChangingChapter(true)}
                    className="text-[10px] font-bold text-[#FF3B00] hover:underline cursor-pointer"
                  >
                    Change Chapter
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-[2px] ${subjectBadge(selectedChapter.subject)}`}>
                    {selectedChapter.subject}
                  </span>
                  <span className="text-[10px] font-bold text-[#5C5A52] px-1.5 py-0.5 bg-[#FAF9F6] rounded border border-[#141416]">
                    Class {selectedChapter.classLevel || '11'} · Unit {selectedChapter.clusterId}
                  </span>
                </div>
                <h3 className="text-sm font-black uppercase text-[#141416]">
                  {selectedChapter.name}
                </h3>
                {selectedChapter.startedDate && (
                  <div className="text-[10px] text-[#5C5A52] flex items-center gap-1.5 pt-0.5">
                    <Flame className="w-3 h-3 text-[#FF3B00]" />
                    <span>Active since {selectedChapter.startedDate} ({daysActive} {daysActive === 1 ? 'day' : 'days'})</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#141416]">
                    Select Target Chapter
                  </label>
                  {preselectedChapterId && (
                    <button
                      type="button"
                      onClick={() => setIsChangingChapter(false)}
                      className="text-[10px] text-[#5C5A52] hover:text-[#141416]"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search chapter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 rounded-[3px] border-2 border-[#141416] bg-[#FAF9F6] text-[#141416] placeholder:text-[#8C8A82] focus:outline-none focus:bg-white font-bold"
                  />
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value as any)}
                    className="text-xs px-2 py-1.5 rounded-[3px] border-2 border-[#141416] bg-[#FAF9F6] text-[#141416] font-bold cursor-pointer"
                  >
                    <option value="All">All Subjects</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Botany">Botany</option>
                    <option value="Zoology">Zoology</option>
                  </select>
                </div>

                <select
                  id="log-chapter-select"
                  value={selectedChapterId}
                  onChange={(e) => {
                    setSelectedChapterId(e.target.value);
                    setIsChangingChapter(false);
                  }}
                  className="w-full text-xs font-bold px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#FAF9F6] text-[#141416] focus:outline-none focus:ring-2 focus:ring-[#FF3B00]"
                  required
                >
                  {filteredChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{(c.subject || '').slice(0, 3).toUpperCase()}] {c.name} — (
                      {c.completionPercentage !== undefined && c.completionPercentage < 100
                        ? `${c.completionPercentage}% In-Progress`
                        : c.revisionCount >= 1
                        ? `100% Done (Rev #${c.revisionCount})`
                        : '0% Unstarted'}
                      , ★{c.currentConfidence ? `${c.currentConfidence}/5` : 'New'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. Chapter Completion Slider & Presets */}
          <div className="bg-[#ECEAE4] p-3.5 rounded-[4px] border-2 border-[#141416] space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#FF3B00]" />
                <span>Chapter Completion Percentage</span>
              </label>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-[2px] border ${
                  completionPercentage >= 100
                    ? 'bg-[#141416] text-white border-[#141416]'
                    : 'bg-[#FF3B00] text-white border-[#141416]'
                }`}
              >
                {completionPercentage}% {completionPercentage >= 100 ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
            </div>

            {/* Interactive Tactile Progress Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={completionPercentage}
                onChange={(e) => handlePercentageChange(Number(e.target.value))}
                className="w-full accent-[#FF3B00] cursor-pointer h-2 bg-[#FAF9F6] rounded border border-[#141416]"
              />
              <div className="flex justify-between text-[10px] text-[#5C5A52] font-bold">
                <span>0%</span>
                <span>25% (Lectures)</span>
                <span>50% (NCERT)</span>
                <span>75% (Practice)</span>
                <span>100% (Mastered)</span>
              </div>
            </div>

            {/* Tactile Quick Percentage Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 25, label: '25% Intro' },
                { val: 50, label: '50% Halfway' },
                { val: 75, label: '75% Advanced' },
                { val: 100, label: '100% Complete' },
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => handlePercentageChange(btn.val)}
                  className={`py-1 px-1 rounded-[2px] text-[10px] font-black uppercase tracking-tight border transition-all cursor-pointer ${
                    completionPercentage === btn.val
                      ? 'bg-[#141416] text-white border-[#141416] shadow-[1px_1px_0px_#FF3B00]'
                      : 'bg-[#FAF9F6] text-[#141416] border-[#141416] hover:bg-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Explanation box: In-Progress vs Spaced Revision Initiation */}
            <div
              className={`p-2.5 rounded-[3px] border-2 text-xs leading-tight ${
                completionPercentage < 100
                  ? 'bg-[#FAF9F6] border-[#141416] text-[#141416]'
                  : 'bg-[#141416] border-[#141416] text-[#FAF9F6]'
              }`}
            >
              {completionPercentage < 100 ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#FF3B00] font-black uppercase text-[11px]">
                    <span>DAILY STUDY PROGRESS (NO REVISION TRIGGER)</span>
                  </div>
                  <p className="text-[11px] text-[#5C5A52]">
                    This chapter will stay in your <strong>Active In-Progress Queue</strong> until you mark it 100%. Spaced repetition will only start once 1st pass is finished.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#FFB800] font-black uppercase text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0047FF]" />
                    <span>100% MILESTONE REACHED — REVISION INITIATED</span>
                  </div>
                  <p className="text-[11px] text-[#C5C3BB]">
                    {isAlreadyFinished1stPass
                      ? `Completed Revision Round #${(selectedChapter?.revisionCount || 1) + 1}. Next review in ${nextGapDays} days.`
                      : `1st Pass completed! Spaced Revision scheduled in ${nextGapDays} days (Day 3).`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. NEET Study Pillars (Checklist) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416]">
                NEET Syllabus Pillars Covered
              </label>
              <span className="text-[10px] text-[#5C5A52]">Tick items covered</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { key: 'lectures', label: '🎥 Theory / Lectures', desc: 'Concept understanding & class' },
                { key: 'bookReading', label: '📖 Book Reading', desc: 'Textbook line-by-line reading' },
                { key: 'classNotes', label: '✍️ Notes & Formulas', desc: 'Summary sheet created' },
                { key: 'questionPractice', label: '🎯 PYQs & Practice', desc: '50-100+ questions solved' },
                { key: 'anki', label: '🗂️ Anki / Flashcards', desc: 'Active recall flashcards deck' },
              ].map((pillar) => {
                const isChecked = Boolean(
                  pillar.key === 'bookReading'
                    ? pillars.bookReading || pillars.ncertReading
                    : pillars[pillar.key as keyof StudyPillars]
                );
                return (
                  <button
                    key={pillar.key}
                    type="button"
                    onClick={() => {
                      if (pillar.key === 'bookReading') {
                        const newVal = !(pillars.bookReading || pillars.ncertReading);
                        setPillars((prev) => ({
                          ...prev,
                          bookReading: newVal,
                          ncertReading: newVal,
                        }));
                      } else {
                        togglePillar(pillar.key as keyof StudyPillars);
                      }
                    }}
                    className={`p-2 rounded-[3px] border-2 text-left transition-all cursor-pointer flex items-start gap-2 ${
                      isChecked
                        ? 'bg-[#141416] text-white border-[#141416] shadow-[2px_2px_0px_#FF3B00]'
                        : 'bg-[#ECEAE4] text-[#141416] border-[#141416] hover:bg-white'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#FF3B00]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8C8A82]" />
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] font-black uppercase leading-tight">{pillar.label}</div>
                      <div className={`text-[9px] ${isChecked ? 'text-[#A8A49A]' : 'text-[#5C5A52]'}`}>
                        {pillar.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Confidence Rating Selector (1-5) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416]">
                Current Confidence Rating
              </label>
              <span className={`text-xs font-black ${getConfidenceTier(confidence).textClass}`}>
                ★ Level {confidence} / 5 ({getConfidenceTier(confidence).label})
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const isSelected = confidence === lvl;
                const tier = getConfidenceTier(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      sound.playRatingStep(lvl);
                      setConfidence(lvl);
                    }}
                    className={`py-2 px-1 rounded-[2px] text-center font-black text-xs uppercase cursor-pointer border transition-all ${
                      isSelected
                        ? `${tier.badgeClass} border-[#141416] shadow-[2px_2px_0px_#141416] -translate-y-0.5 font-black`
                        : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416] hover:bg-white'
                    }`}
                  >
                    ★ {lvl}
                  </button>
                );
              })}
            </div>

            <div className={`text-[10px] bg-[#ECEAE4] p-2 rounded-[2px] border-2 border-[#141416] border-l-4 ${getConfidenceTier(confidence).cardBorderClass}`}>
              <strong className={getConfidenceTier(confidence).textClass}>{CONFIDENCE_LEVELS[confidence - 1].label}:</strong>{' '}
              <span className="text-[#5C5A52]">{CONFIDENCE_LEVELS[confidence - 1].desc}</span>
            </div>
          </div>

          {/* 5. Collapsible Comments Section (Opens on demand only) */}
          <div className="space-y-2 border-t border-[#D5D2C8] pt-2">
            {!showComment ? (
              <button
                type="button"
                onClick={() => setShowComment(true)}
                className="text-xs text-[#5C5A52] hover:text-[#141416] flex items-center gap-1.5 font-bold cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>+ Add Comment (Optional)</span>
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-[#141416] flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5C5A52]" />
                    <span>Comments</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowComment(false);
                      setNoteText('');
                    }}
                    className="text-[10px] text-[#8C8A82] hover:text-[#141416]"
                  >
                    Hide
                  </button>
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Practiced 40 PYQs, focused on ray optics formula exceptions..."
                  rows={2}
                  className="w-full text-xs p-2 rounded-[3px] border-2 border-[#141416] bg-[#FAF9F6] text-[#141416] placeholder:text-[#8C8A82] focus:outline-none focus:bg-white font-medium"
                />
              </div>
            )}
          </div>

          {/* 6. Date Selector */}
          <div className="border-t border-[#D5D2C8] pt-2">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-xs text-[#5C5A52] hover:text-[#141416] flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Studied: {dateStudied === today ? 'Today' : dateStudied}</span>
              {showDatePicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showDatePicker && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="date"
                  value={dateStudied}
                  onChange={(e) => setDateStudied(e.target.value)}
                  className="text-xs px-3 py-1.5 border-2 border-[#141416] rounded-[2px] bg-[#ECEAE4] font-bold"
                />
                <button
                  type="button"
                  onClick={() => setDateStudied(today)}
                  className="px-2 py-1 text-[11px] bg-[#ECEAE4] border border-[#141416] rounded-[2px] font-bold hover:bg-[#141416] hover:text-white"
                >
                  Today
                </button>
              </div>
            )}
          </div>

          {/* 7. Commit Button */}
          <div className="pt-2 sticky bottom-0 bg-[#FAF9F6] pb-1">
            <button
              id="confirm-log-btn"
              type="submit"
              className="w-full py-3 rounded-[3px] bg-[#FF3B00] hover:bg-[#E03400] active:bg-[#C02D00] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141416] shadow-[3px_3px_0px_#141416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#141416] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {completionPercentage < 100
                  ? `Save Progress (${completionPercentage}% In-Progress)`
                  : isAlreadyFinished1stPass
                  ? `Save Revision #${(selectedChapter?.revisionCount || 1) + 1}`
                  : `Commit 1st Pass Milestone (100% Done!)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
