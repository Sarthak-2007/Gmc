import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Dices,
  AlertTriangle,
  RefreshCw,
  Zap,
  Target,
  BookOpen,
  Layers,
  Flame,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Chapter, GeneratorMode, Test } from '../types';
import { generateNextChapter, GeneratorResult } from '../services/generator';
import { sound } from '../services/soundEffects';
import {
  getConfidenceTier,
  getRevisionPassTier,
} from '../utils/confidenceColor';

interface ChapterSelectionGeneratorProps {
  chapters: Chapter[];
  tests: Test[];
  onOpenQuickLogForChapter: (chapterId: string) => void;
  mode?: GeneratorMode;
  onModeChange?: (mode: GeneratorMode) => void;
  rollSignal?: number;
}

export const ChapterSelectionGenerator: React.FC<ChapterSelectionGeneratorProps> = ({
  chapters,
  tests,
  onOpenQuickLogForChapter,
  mode: controlledMode,
  onModeChange: setControlledMode,
  rollSignal,
}) => {
  const [internalMode, setInternalMode] = useState<GeneratorMode>('weighted');
  const activeMode = controlledMode !== undefined ? controlledMode : internalMode;

  const [currentResult, setCurrentResult] = useState<GeneratorResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerate = useCallback((targetMode: GeneratorMode = activeMode) => {
    setIsGenerating(true);
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      setTimeout(() => {
        sound.playGeneratorRatchet(i, steps);
        if (chapters.length > 0) {
          const rand = chapters[Math.floor(Math.random() * chapters.length)];
          setCurrentResult({
            chapter: rand,
            mode: targetMode,
            explanation: 'Analog rotary matrix selector rolling...',
            isOverdue: false,
            daysSinceStudied: null,
            confidence: rand.currentConfidence,
          });
        }
      }, i * 35);
    }

    setTimeout(() => {
      const res = generateNextChapter(chapters, tests, targetMode, currentResult?.chapter.id);
      setCurrentResult(res);
      setIsGenerating(false);
      sound.playGeneratorLock();
    }, steps * 35 + 30);
  }, [chapters, tests, activeMode, currentResult?.chapter.id]);

  // Handle mode change
  const handleModeSwitch = (newMode: GeneratorMode) => {
    sound.playKeyClick();
    if (setControlledMode) {
      setControlledMode(newMode);
    } else {
      setInternalMode(newMode);
    }
    handleGenerate(newMode);
  };

  // Initial load or chapters change
  useEffect(() => {
    handleGenerate(activeMode);
  }, [chapters, tests]);

  // Roll signal trigger from HardwareDeck
  useEffect(() => {
    if (rollSignal && rollSignal > 0) {
      handleGenerate(activeMode);
    }
  }, [rollSignal]);

  const subjectBadge = (subject: string) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#0047FF] text-white border-[#141416]';
      case 'Chemistry':
        return 'bg-[#9333EA] text-white border-[#141416]';
      case 'Botany':
        return 'bg-[#FFB800] text-[#141416] border-[#141416] font-black';
      case 'Zoology':
        return 'bg-[#FF3B00] text-white border-[#141416] font-black';
      default:
        return 'bg-[#2A2A30] text-white border-[#141416]';
    }
  };

  return (
    <div id="chapter-generator-card" className="te-chassis-card p-5 relative overflow-hidden bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
      {/* Corner Industrial Screws */}
      <div className="absolute top-2 left-2"><span className="te-screw" /></div>
      <div className="absolute top-2 right-2"><span className="te-screw" /></div>
      <div className="absolute bottom-2 left-2"><span className="te-screw" /></div>
      <div className="absolute bottom-2 right-2"><span className="te-screw" /></div>

      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b-2 border-[#141416] pl-2 pr-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#FF3B00] rounded-[1px] animate-pulse"></span>
            <span className="font-mono text-xs font-bold text-[#FF3B00] uppercase tracking-wider">Practice Output Console</span>
            <h2 className="font-mono text-base sm:text-lg font-black text-[#141416] uppercase tracking-tight">
              Selected Topic Target
            </h2>
          </div>
          <p className="text-xs text-[#5C5A52] font-mono mt-0.5">
            Real-time algorithmic topic selection for surprise problem solving, quick PYQ testing, or formula recalls.
          </p>
        </div>

        {/* 3-Mode Selector Mechanical Switches */}
        <div id="generator-mode-selector" className="flex items-center gap-1.5 p-1 bg-[#ECEAE4] rounded-[4px] border border-[#141416] shadow-inner self-start md:self-auto">
          <button
            type="button"
            id="generator-mode-weighted-btn"
            onClick={() => handleModeSwitch('weighted')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-mono font-bold tracking-tight transition-all cursor-pointer border ${
              activeMode === 'weighted'
                ? 'bg-[#FF3B00] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                : 'text-[#5C5A52] border-transparent hover:text-[#141416]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Balanced</span>
            </span>
          </button>

          <button
            type="button"
            id="generator-mode-worst-first-btn"
            onClick={() => handleModeSwitch('worst_first')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-mono font-bold tracking-tight transition-all cursor-pointer border ${
              activeMode === 'worst_first'
                ? 'bg-[#141416] text-white border-[#141416] shadow-[1px_1px_0px_#FF3B00]'
                : 'text-[#5C5A52] border-transparent hover:text-[#141416]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#FFB800] stroke-[2.5]" />
              <span>Weakest First</span>
            </span>
          </button>

          <button
            type="button"
            id="generator-mode-random-btn"
            onClick={() => handleModeSwitch('random')}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-mono font-bold tracking-tight transition-all cursor-pointer border ${
              activeMode === 'random'
                ? 'bg-[#141416] text-white border-[#141416] shadow-[1px_1px_0px_#FF3B00]'
                : 'text-[#5C5A52] border-transparent hover:text-[#141416]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Dices className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Pure Random</span>
            </span>
          </button>
        </div>
      </div>

      {/* Main Selected Card Body */}
      {currentResult ? (
        (() => {
          const confTier = getConfidenceTier(currentResult.chapter.currentConfidence);
          const revTier = getRevisionPassTier(currentResult.chapter.revisionCount || 0);

          return (
            <div className={`mt-4 p-4 rounded-[4px] bg-[#ECEAE4] border-2 border-[#141416] border-l-6 ${confTier.cardBorderClass} shadow-[2px_2px_0px_#141416] transition-all`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Chapter info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-[2px] border ${subjectBadge(
                        currentResult.chapter.subject
                      )}`}
                    >
                      {currentResult.chapter.subject}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-[#5C5A52] px-2 py-0.5 bg-[#FAF9F6] rounded-[2px] border border-[#141416]">
                      Unit {currentResult.chapter.clusterId}: {currentResult.chapter.clusterName}
                    </span>

                    {currentResult.chapter.classLevel && (
                      <span className="text-[10px] font-mono font-bold text-[#141416] px-1.5 py-0.5 bg-[#FAF9F6] rounded-[2px] border border-[#141416]">
                        Class {currentResult.chapter.classLevel}
                      </span>
                    )}

                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-[2px] border ${revTier.badgeClass}`}>
                      Rev #{currentResult.chapter.revisionCount || 0}
                    </span>

                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-[2px] border ${confTier.badgeClass}`}>
                      ★ Level {currentResult.chapter.currentConfidence}/5 ({confTier.label})
                    </span>
                  </div>

                  <h3 className="font-mono text-base sm:text-xl font-black text-[#141416] tracking-tight uppercase">
                    {currentResult.chapter.name}
                  </h3>

                  <p className="font-mono text-xs text-[#5C5A52] flex items-center gap-1.5">
                    <Target className={`w-4 h-4 ${confTier.textClass} shrink-0`} />
                    <span>{currentResult.explanation}</span>
                  </p>
                </div>

                {/* Actions: Re-roll or Log */}
                <div className="flex items-center gap-2.5 self-end lg:self-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    id="generator-roll-next-btn"
                    onClick={() => handleGenerate()}
                    disabled={isGenerating}
                    className="te-btn-mechanical px-4 py-2.5 text-xs font-mono font-black cursor-pointer bg-[#FAF9F6] flex items-center gap-1.5 hover:bg-[#141416] hover:text-white transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Roll Next Target</span>
                  </button>

                  <button
                    type="button"
                    id="generator-log-session-btn"
                    onClick={() => onOpenQuickLogForChapter(currentResult.chapter.id)}
                    className="te-btn-orange px-4 py-2.5 text-xs font-mono font-black cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_#141416]"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Log Practice Round</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="p-8 text-center text-xs font-mono text-[#5C5A52]">
          No chapter available for generation matching your selected subject channel.
        </div>
      )}
    </div>
  );
};
