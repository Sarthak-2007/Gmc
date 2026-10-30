import React, { useState } from 'react';
import { X, Plus, BookOpen, Layers } from 'lucide-react';
import { NEET_CLUSTERS } from '../data/seedData';
import { Chapter, Subject } from '../types';
import { addDaysToDateStr, calculateNextGap, getTodayStr } from '../services/spacedRepetition';

interface QuickAddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddChapter?: (chapter: Omit<Chapter, 'id' | 'createdAt'>) => void;
  onAdd?: (chapter: Omit<Chapter, 'id' | 'createdAt'>) => void;
}

export const QuickAddChapterModal: React.FC<QuickAddChapterModalProps> = ({
  isOpen,
  onClose,
  onAddChapter,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState<Subject>('Physics');
  const [clusterId, setClusterId] = useState<number>(1);
  const [initialConfidence, setInitialConfidence] = useState<number>(0);

  const availableClusters = NEET_CLUSTERS.filter((c) => c.subject === subject);

  const handleSubjectChange = (newSubject: Subject) => {
    setSubject(newSubject);
    const firstCluster = NEET_CLUSTERS.find((c) => c.subject === newSubject);
    if (firstCluster) {
      setClusterId(firstCluster.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cluster = NEET_CLUSTERS.find((c) => c.id === clusterId);
    const clusterName = cluster ? cluster.name : 'General Cluster';
    const today = getTodayStr();
    const isCompleted = initialConfidence > 0;
    const addFn = onAddChapter || onAdd;

    if (addFn) {
      addFn({
        name: name.trim(),
        subject,
        clusterId,
        clusterName,
        classLevel: clusterId <= 3 || clusterId === 6 || clusterId === 9 || clusterId === 12 ? '11' : '12',
        learningStage: isCompleted ? 'FIRST_PASS_DONE' : 'NOT_STARTED',
        completionPercentage: isCompleted ? 100 : 0,
        startedDate: isCompleted ? today : undefined,
        firstPassCompletedDate: isCompleted ? today : undefined,
        daysTakenToComplete: isCompleted ? 1 : undefined,
        currentConfidence: initialConfidence,
        lastStudiedDate: isCompleted ? today : null,
        nextRevisionDate: isCompleted ? addDaysToDateStr(today, calculateNextGap(1, initialConfidence)) : null,
        revisionCount: isCompleted ? 1 : 0,
        isArchived: false,
      });
    }

    setName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141416]/75 backdrop-blur-xs font-mono">
      <div
        id="quick-add-chapter-card"
        className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] w-full max-w-md overflow-hidden flex flex-col relative"
      >
        {/* Corner Screws */}
        <div className="absolute top-2 left-2 z-10"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2 z-10"><span className="te-screw" /></div>

        {/* Header Strip */}
        <div className="px-5 py-3.5 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416] pl-7 pr-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#FF3B00] font-black tracking-wider uppercase">
                Syllabus
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#2A2A30] text-white font-bold border border-[#3E3E48]">
                Fast Add
              </span>
            </div>
            <h2 className="text-sm font-black uppercase text-white tracking-tight">
              Add New Chapter
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C8A82] hover:text-white p-1 rounded hover:bg-[#2A2A30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Chapter Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
              1. Chapter Name / Topic
            </label>
            <input
              id="new-chapter-name-input"
              type="text"
              required
              autoFocus
              placeholder="e.g., Electromagnetic Induction"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] placeholder:text-[#8C8A82] focus:outline-none focus:ring-1 focus:ring-[#FF3B00] font-bold"
            />
          </div>

          {/* Subject Selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
              2. Subject
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Physics', 'Chemistry', 'Botany', 'Zoology'] as Subject[]).map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => handleSubjectChange(subj)}
                  className={`py-2 px-1 text-xs font-black rounded-[3px] border-2 text-center transition-all cursor-pointer ${
                    subject === subj
                      ? 'bg-[#141416] text-[#FAF9F6] border-[#141416] shadow-[2px_2px_0px_#FF3B00]'
                      : 'bg-[#ECEAE4] hover:bg-[#FAF9F6] text-[#5C5A52] border-[#141416]'
                  }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          </div>

          {/* Cluster Selection (16 NEET clusters) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
              3. NEET Unit / Cluster
            </label>
            <select
              value={clusterId}
              onChange={(e) => setClusterId(Number(e.target.value))}
              className="w-full text-xs font-bold px-3 py-2 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] text-[#141416] focus:outline-none focus:ring-1 focus:ring-[#FF3B00]"
            >
              {availableClusters.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  Cluster {cl.id}: {cl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Initial Confidence */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#141416] mb-1">
              4. Current Confidence
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[
                { val: 0, label: '0 (New)' },
                { val: 1, label: '1 (Low)' },
                { val: 2, label: '2 (Weak)' },
                { val: 3, label: '3 (Med)' },
                { val: 4, label: '4 (Good)' },
                { val: 5, label: '5 (High)' },
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => setInitialConfidence(c.val)}
                  className={`py-2 text-[10px] font-black rounded-[2px] border text-center cursor-pointer transition-all ${
                    initialConfidence === c.val
                      ? 'bg-[#FF3B00] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                      : 'bg-[#ECEAE4] text-[#5C5A52] border-[#141416] hover:text-[#141416]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              id="confirm-add-chapter-btn"
              type="submit"
              className="w-full py-3 rounded-[3px] bg-[#FF3B00] hover:bg-[#E03400] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141416] shadow-[3px_3px_0px_#141416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_#141416] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Chapter to Syllabus</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
