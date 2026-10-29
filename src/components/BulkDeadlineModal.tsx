import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckSquare, Square, Check, Layers } from 'lucide-react';
import { Chapter, Subject, Test } from '../types';

interface BulkDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  tests?: Test[];
  onApplyBulkDeadline: (targetTestId: string, chapterIdsToLink: string[]) => void;
}

export const BulkDeadlineModal: React.FC<BulkDeadlineModalProps> = ({
  isOpen,
  onClose,
  chapters,
  tests = [],
  onApplyBulkDeadline,
}) => {
  const [selectedTestId, setSelectedTestId] = useState<string>(tests.length > 0 ? tests[0].id : '');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<Subject | 'All'>('All');
  const [clusterFilter, setClusterFilter] = useState<string>('All');

  useEffect(() => {
    if ((!selectedTestId || !tests.some((t) => t.id === selectedTestId)) && tests.length > 0) {
      setSelectedTestId(tests[0].id);
    }
  }, [tests, selectedTestId]);

  const filteredChapters = chapters.filter((c) => {
    if (c.isArchived) return false;
    if (subjectFilter !== 'All' && c.subject !== subjectFilter) return false;
    if (clusterFilter !== 'All' && String(c.clusterId) !== clusterFilter) return false;
    return true;
  });

  const toggleChapter = (id: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = filteredChapters.map((c) => c.id);
    setSelectedChapterIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearAll = () => {
    setSelectedChapterIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId || selectedChapterIds.length === 0) return;
    onApplyBulkDeadline(selectedTestId, selectedChapterIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141416]/75 backdrop-blur-xs font-mono">
      <div className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] relative">
        {/* Corner Screws */}
        <div className="absolute top-2 left-2 z-10"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2 z-10"><span className="te-screw" /></div>

        {/* Header */}
        <div className="px-5 py-3.5 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416] pl-7 pr-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#0047FF] font-black tracking-wider uppercase">
                Bulk Action
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#2A2A30] text-white font-bold border border-[#3E3E48]">
                Batch Assign
              </span>
            </div>
            <h2 className="text-sm font-black uppercase text-white tracking-tight">
              Assign Test Deadlines to Chapters
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
          {/* Target Test Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
              1. Target Test (Sets deadline date)
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] focus:outline-none"
              required
            >
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.coachingName || 'Test'}) — Due: {t.date}
                </option>
              ))}
            </select>
          </div>

          {/* Filters for fast selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-[#141416]">
                2. Select Chapters ({selectedChapterIds.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[10px] text-[#0047FF] hover:underline font-black cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[#8C8A82]">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] text-[#5C5A52] hover:underline font-black cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1 rounded-[3px] border border-[#141416] bg-[#ECEAE4] text-[#141416] font-bold"
              >
                <option value="All">All Subjects</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Botany">Botany</option>
                <option value="Zoology">Zoology</option>
              </select>
            </div>
          </div>

          {/* Chapter Checkboxes */}
          <div className="border-2 border-[#141416] rounded-[3px] max-h-56 overflow-y-auto divide-y divide-[#D5D2C8] bg-[#ECEAE4]">
            {filteredChapters.map((c) => {
              const isSelected = selectedChapterIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleChapter(c.id)}
                  className="p-2.5 flex items-center justify-between hover:bg-[#FAF9F6] cursor-pointer text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#0047FF]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8C8A82]" />
                    )}
                    <span className="font-bold text-[#141416] uppercase">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#D5D2C8] text-[#141416] font-bold">
                      {(c.subject || '').slice(0, 3).toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-[#5C5A52]">
                      Cluster {c.clusterId}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={selectedChapterIds.length === 0}
              className="w-full py-3 rounded-[3px] bg-[#0047FF] hover:bg-[#0037CC] disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider border-2 border-[#141416] shadow-[3px_3px_0px_#141416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#141416] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Apply Deadline to {selectedChapterIds.length} {selectedChapterIds.length === 1 ? 'Chapter' : 'Chapters'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
