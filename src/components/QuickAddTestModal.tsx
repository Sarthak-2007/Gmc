import React, { useState } from 'react';
import { X, Calendar, Plus, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { Chapter, Subject, Test } from '../types';
import { getTodayStr } from '../services/spacedRepetition';

interface QuickAddTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  existingTests?: Test[];
  onAddTest?: (test: Omit<Test, 'id' | 'createdAt'>) => void;
  onAdd?: (test: Omit<Test, 'id' | 'createdAt'>) => void;
}

export const QuickAddTestModal: React.FC<QuickAddTestModalProps> = ({
  isOpen,
  onClose,
  chapters,
  existingTests = [],
  onAddTest,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [coachingName, setCoachingName] = useState('Allen');
  const [date, setDate] = useState(getTodayStr());
  const [subjectOrScope, setSubjectOrScope] = useState('');
  const [totalMarks, setTotalMarks] = useState(720);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<Subject | 'All'>('All');

  // Check for test date conflict
  const hasDateConflict = existingTests.some((t) => t.date === date);
  const conflictingTests = existingTests.filter((t) => t.date === date);

  const filteredChapters = chapters.filter((c) => {
    if (c.isArchived) return false;
    if (subjectFilter !== 'All' && c.subject !== subjectFilter) return false;
    return true;
  });

  const toggleChapter = (id: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredChapters.map((c) => c.id);
    setSelectedChapterIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearFiltered = () => {
    const idsToClear = new Set(filteredChapters.map((c) => c.id));
    setSelectedChapterIds((prev) => prev.filter((id) => !idsToClear.has(id)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;

    const addFn = onAddTest || onAdd;
    if (addFn) {
      addFn({
        name: name.trim(),
        coachingName: coachingName.trim(),
        date,
        subjectOrScope: subjectOrScope.trim() || 'Custom Syllabus Scope',
        linkedChapterIds: selectedChapterIds,
        totalMarks: Number(totalMarks) || 720,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141416]/75 backdrop-blur-xs font-mono">
      <div
        id="quick-add-test-card"
        className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] relative"
      >
        {/* Corner Screws */}
        <div className="absolute top-2 left-2 z-10"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2 z-10"><span className="te-screw" /></div>

        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416] pl-7 pr-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#0047FF] font-black tracking-wider uppercase">
                Exam Planner
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#0047FF] text-white font-bold">
                Test Calendar
              </span>
            </div>
            <h2 className="text-sm font-black uppercase text-white tracking-tight">
              Schedule Test & Set Deadlines
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C8A82] hover:text-white p-1 rounded hover:bg-[#2A2A30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Test Name & Coaching */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
                1. Test Title
              </label>
              <input
                id="test-name-input"
                type="text"
                required
                placeholder="e.g., Allen Minor Test 05"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] placeholder:text-[#8C8A82] focus:outline-none focus:ring-1 focus:ring-[#FF3B00] font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
                2. Coaching / Source
              </label>
              <select
                value={coachingName}
                onChange={(e) => setCoachingName(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] focus:outline-none"
              >
                <option value="Allen">Allen</option>
                <option value="Aakash">Aakash</option>
                <option value="Self-Test">Self-Mock / Practice</option>
                <option value="Physics Wallah">Physics Wallah</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Date & Conflict Warning */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416]">
                3. Test Date (Sets chapter deadlines)
              </label>
              <span className="text-[10px] text-[#8C8A82]">Earliest date sets priority</span>
            </div>
            <input
              id="test-date-input"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] font-bold focus:outline-none"
            />
            {hasDateConflict && (
              <div className="mt-2 p-2.5 bg-[#FFB800]/20 border-2 border-[#FFB800] rounded-[3px] text-xs text-[#141416] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FFB800] shrink-0 stroke-[2.5]" />
                <div>
                  <span className="font-black uppercase">Schedule Conflict: </span>
                  <span>
                    You already have test(s) scheduled on this date ({conflictingTests.map((t) => t.name).join(', ')}).
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Scope & Total Marks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
                4. Syllabus Scope
              </label>
              <input
                type="text"
                placeholder="e.g., Mechanics + Cell Biology"
                value={subjectOrScope}
                onChange={(e) => setSubjectOrScope(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] placeholder:text-[#8C8A82] focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
                5. Total Marks
              </label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Linked Chapters Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416]">
                6. Included Chapters ({selectedChapterIds.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[10px] text-[#0047FF] hover:underline font-bold cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[#8C8A82]">|</span>
                <button
                  type="button"
                  onClick={clearFiltered}
                  className="text-[10px] text-[#5C5A52] hover:underline font-bold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex gap-1 mb-2 flex-wrap">
              {(['All', 'Physics', 'Chemistry', 'Botany', 'Zoology'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubjectFilter(s)}
                  className={`text-[10px] px-2 py-0.5 rounded-[2px] border cursor-pointer font-bold ${
                    subjectFilter === s
                      ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                      : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="border-2 border-[#141416] rounded-[3px] max-h-44 overflow-y-auto divide-y divide-[#D5D2C8] bg-[#ECEAE4]">
              {filteredChapters.map((c) => {
                const isSelected = selectedChapterIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleChapter(c.id)}
                    className="p-2 flex items-center justify-between hover:bg-[#FAF9F6] cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#0047FF]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8C8A82]" />
                      )}
                      <span className="font-bold text-[#141416] uppercase">{c.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#D5D2C8] text-[#141416] font-bold">
                      {(c.subject || '').slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              id="confirm-add-test-btn"
              type="submit"
              className="w-full py-3 rounded-[3px] bg-[#0047FF] hover:bg-[#0037CC] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141416] shadow-[3px_3px_0px_#141416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#141416] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Schedule Test & Apply Deadlines</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
