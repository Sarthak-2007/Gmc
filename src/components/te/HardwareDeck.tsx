import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, RefreshCw, Plus, CheckCircle, Zap, Activity, Cpu, Sliders, AlertTriangle, Dices, BookOpen, Layers } from 'lucide-react';
import { RockerSwitch } from './RockerSwitch';
import { sound } from '../../services/soundEffects';
import { Chapter, GeneratorMode, Subject, Test } from '../../types';

interface HardwareDeckProps {
  chapters: Chapter[];
  tests: Test[];
  currentMode: GeneratorMode;
  onModeChange: (mode: GeneratorMode) => void;
  selectedSubject: Subject | 'All';
  onSubjectChange: (subj: Subject | 'All') => void;
  onTriggerRoll: () => void;
  onOpenQuickLog: () => void;
  onOpenAddChapter: () => void;
  onOpenAddTest: () => void;
  className?: string;
}

export const HardwareDeck: React.FC<HardwareDeckProps> = ({
  chapters,
  tests,
  currentMode,
  onModeChange,
  selectedSubject,
  onSubjectChange,
  onTriggerRoll,
  onOpenQuickLog,
  onOpenAddChapter,
  onOpenAddTest,
  className = '',
}) => {
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => sound.enabled);
  const [isRollerDepressed, setIsRollerDepressed] = useState<boolean>(false);
  const [urgencyOnly, setUrgencyOnly] = useState<boolean>(false);

  const handleToggleSfx = (enabled: boolean) => {
    setSfxEnabled(enabled);
    sound.setEnabled(enabled);
  };

  const handleRollButton = () => {
    setIsRollerDepressed(true);
    sound.playBleep(680, 0.08);
    onTriggerRoll();
    setTimeout(() => setIsRollerDepressed(false), 120);
  };

  const handleModeClick = (m: GeneratorMode) => {
    sound.playKeyClick();
    onModeChange(m);
  };

  const handleSubjectClick = (s: Subject | 'All') => {
    sound.playKeyClick();
    onSubjectChange(s);
  };

  // Calculate live syllabus stats for LED bargraphs
  const total = chapters.length;
  const studied = chapters.filter((c) => c.revisionCount > 0).length;
  const overdue = chapters.filter((c) => c.isOverdue).length;

  const phyCount = chapters.filter((c) => c.subject === 'Physics').length;
  const phyRev = chapters.filter((c) => c.subject === 'Physics' && c.revisionCount > 0).length;
  const phyPct = phyCount > 0 ? Math.round((phyRev / phyCount) * 100) : 0;

  const chemCount = chapters.filter((c) => c.subject === 'Chemistry').length;
  const chemRev = chapters.filter((c) => c.subject === 'Chemistry' && c.revisionCount > 0).length;
  const chemPct = chemCount > 0 ? Math.round((chemRev / chemCount) * 100) : 0;

  const botCount = chapters.filter((c) => c.subject === 'Botany').length;
  const botRev = chapters.filter((c) => c.subject === 'Botany' && c.revisionCount > 0).length;
  const botPct = botCount > 0 ? Math.round((botRev / botCount) * 100) : 0;

  const zooCount = chapters.filter((c) => c.subject === 'Zoology').length;
  const zooRev = chapters.filter((c) => c.subject === 'Zoology' && c.revisionCount > 0).length;
  const zooPct = zooCount > 0 ? Math.round((zooRev / zooCount) * 100) : 0;

  const subjectsList: { key: Subject | 'All'; label: string; tag: string; activeColor: string }[] = [
    { key: 'All', label: 'All Subjects', tag: 'ALL', activeColor: 'bg-[#18181B] text-white border-[#18181B]' },
    { key: 'Physics', label: 'Physics', tag: 'PHY', activeColor: 'bg-[#2563EB] text-white border-[#18181B]' },
    { key: 'Chemistry', label: 'Chemistry', tag: 'CHE', activeColor: 'bg-[#7C3AED] text-white border-[#18181B]' },
    { key: 'Botany', label: 'Botany', tag: 'BOT', activeColor: 'bg-[#F59E0B] text-[#18181B] border-[#18181B]' },
    { key: 'Zoology', label: 'Zoology', tag: 'ZOO', activeColor: 'bg-[#EA580C] text-white border-[#18181B]' },
  ];

  return (
    <div
      id="pcb-te-hardware-deck"
      className={`te-chassis-card p-4 sm:p-5 bg-[#FAF9F6] relative overflow-hidden font-mono border-2 border-[#141416] shadow-[4px_4px_0px_#141416] ${className}`}
    >
      {/* Industrial Screws */}
      <span className="te-screw absolute top-2 left-2" />
      <span className="te-screw absolute top-2 right-2" />
      <span className="te-screw absolute bottom-2 left-2" />
      <span className="te-screw absolute bottom-2 right-2" />

      {/* Top Deck Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b-2 border-[#141416] gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-[2px] bg-[#FF3B00] border border-[#141416] flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-[0.5px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase text-[#141416] tracking-tight">
                TE-HARDWARE DECK // ANALOG STUDY CONSOLE
              </h2>
              <span className="text-[9px] px-1.5 py-0.2 rounded-[2px] bg-[#FF3B00] text-white font-black">
                OP-PCB
              </span>
            </div>
            <span className="text-[10px] text-[#5C5A52]">
              Single-tap mechanical switches, quick channel banks & real-time telemetry
            </span>
          </div>
        </div>

        {/* SFX Audio Feedback Rocker */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <RockerSwitch
            checked={sfxEnabled}
            onChange={handleToggleSfx}
            label="Audio Clicks"
            sublabel="Mechanical SFX"
            indicatorColor="orange"
          />
        </div>
      </div>

      {/* Hardware Control Section: Mechanical Switch Banks + Roll Trigger + LED VU Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: 2 Mechanical Switch Banks (Mode & Subject Channels) */}
        <div className="lg:col-span-6 bg-[#ECEAE4] p-3.5 rounded-[4px] border-2 border-[#141416] shadow-inner space-y-3">
          {/* Bank 1: Algorithm Selector Keypad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-[#141416] tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-[1px] bg-[#FF3B00]" />
                <span>1. Algorithm Bank</span>
              </span>
              <span className="text-[9px] font-bold text-[#5C5A52] uppercase">
                {currentMode === 'weighted' ? 'Balanced Spaced' : currentMode === 'worst_first' ? 'Weakest Urgent' : 'Random Shuffle'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleModeClick('weighted')}
                className={`py-2 px-2 rounded-[3px] font-black text-[11px] uppercase tracking-tight transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                  currentMode === 'weighted'
                    ? 'bg-[#FF3B00] text-white border-[#141416] shadow-[2px_2px_0px_#141416] translate-y-[-1px]'
                    : 'bg-[#FAF9F6] text-[#5C5A52] border-[#C5C3BB] hover:text-[#141416] hover:border-[#141416]'
                }`}
              >
                <Zap className="w-3 h-3 stroke-[2.5]" />
                <span>Balanced</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeClick('worst_first')}
                className={`py-2 px-2 rounded-[3px] font-black text-[11px] uppercase tracking-tight transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                  currentMode === 'worst_first'
                    ? 'bg-[#141416] text-white border-[#141416] shadow-[2px_2px_0px_#FF3B00] translate-y-[-1px]'
                    : 'bg-[#FAF9F6] text-[#5C5A52] border-[#C5C3BB] hover:text-[#141416] hover:border-[#141416]'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-[#FFB800] stroke-[2.5]" />
                <span>Weakest</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeClick('random')}
                className={`py-2 px-2 rounded-[3px] font-black text-[11px] uppercase tracking-tight transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                  currentMode === 'random'
                    ? 'bg-[#0047FF] text-white border-[#141416] shadow-[2px_2px_0px_#141416] translate-y-[-1px]'
                    : 'bg-[#FAF9F6] text-[#5C5A52] border-[#C5C3BB] hover:text-[#141416] hover:border-[#141416]'
                }`}
              >
                <Dices className="w-3 h-3 stroke-[2.5]" />
                <span>Random</span>
              </button>
            </div>
          </div>

          {/* Bank 2: Subject Channel Selectors */}
          <div className="pt-2 border-t border-[#D4D0C5]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-[#141416] tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-[1px] bg-[#0047FF]" />
                <span>2. Channel Filter</span>
              </span>
              <span className="text-[9px] font-bold text-[#FF3B00] uppercase">
                Active: {selectedSubject}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {subjectsList.map((item) => {
                const isSelected = selectedSubject === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSubjectClick(item.key)}
                    className={`py-1.5 px-1 rounded-[3px] font-black text-[10px] uppercase transition-all cursor-pointer border text-center ${
                      isSelected
                        ? `${item.activeColor} shadow-[2px_2px_0px_#141416] translate-y-[-1px]`
                        : 'bg-[#FAF9F6] text-[#5C5A52] border-[#C5C3BB] hover:text-[#141416] hover:border-[#141416]'
                    }`}
                  >
                    {item.tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Punch-In Mechanical Action Buttons */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <button
            type="button"
            id="te-deck-roll-btn"
            onClick={handleRollButton}
            className={`w-full py-3 px-4 rounded-[4px] bg-[#FF3B00] hover:bg-[#E03400] text-white font-black text-xs uppercase tracking-wider border-2 border-[#141416] shadow-[3px_3px_0px_#141416] transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isRollerDepressed ? 'translate-x-[2px] translate-y-[2px] shadow-none' : ''
            }`}
          >
            <RefreshCw className="w-4 h-4 stroke-[3]" />
            <span>[ROLL CHAPTER]</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                sound.playKeyClick();
                onOpenQuickLog();
              }}
              className="te-btn-mechanical py-2 px-2 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer bg-[#ECEAE4]"
            >
              <CheckCircle className="w-3 h-3 text-[#FF3B00]" />
              <span>+ Log Study</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playKeyClick();
                onOpenAddChapter();
              }}
              className="te-btn-mechanical py-2 px-2 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer bg-[#ECEAE4]"
            >
              <Plus className="w-3 h-3 text-[#0047FF]" />
              <span>+ Chapter</span>
            </button>
          </div>
        </div>

        {/* Right: Real-time 4-Channel LED Segment VU Meters */}
        <div className="lg:col-span-3 bg-[#141416] text-[#FAF9F6] p-3 rounded-[4px] border-2 border-[#3E3E48] shadow-[2px_2px_0px_#141416] space-y-2">
          <div className="flex items-center justify-between border-b border-[#3E3E48] pb-1">
            <span className="text-[9px] font-black text-[#8C8A82] uppercase tracking-widest">
              CHANNEL METERS
            </span>
            <span className="text-[9px] text-[#FF3B00] font-black">
              {Math.round((studied / (total || 1)) * 100)}% REV
            </span>
          </div>

          {/* 4 Subject Channels */}
          <div className="space-y-1 text-[9px] font-mono">
            {/* Physics */}
            <div className="flex items-center gap-1.5">
              <span className="w-6 text-[#0047FF] font-bold">PHY</span>
              <div className="flex-1 te-led-bar">
                {Array.from({ length: 8 }).map((_, i) => {
                  const active = i < Math.ceil((phyPct / 100) * 8);
                  return (
                    <div
                      key={i}
                      className={`te-led-cell ${active ? 'active-blue' : ''}`}
                    />
                  );
                })}
              </div>
              <span className="w-6 text-right text-[8px] text-[#8C8A82]">{phyPct}%</span>
            </div>

            {/* Chemistry */}
            <div className="flex items-center gap-1.5">
              <span className="w-6 text-[#9333EA] font-bold">CHE</span>
              <div className="flex-1 te-led-bar">
                {Array.from({ length: 8 }).map((_, i) => {
                  const active = i < Math.ceil((chemPct / 100) * 8);
                  return (
                    <div
                      key={i}
                      className={`te-led-cell ${active ? 'bg-[#9333EA] border-[#6B21A8]' : ''}`}
                    />
                  );
                })}
              </div>
              <span className="w-6 text-right text-[8px] text-[#8C8A82]">{chemPct}%</span>
            </div>

            {/* Botany */}
            <div className="flex items-center gap-1.5">
              <span className="w-6 text-[#FFB800] font-bold">BOT</span>
              <div className="flex-1 te-led-bar">
                {Array.from({ length: 8 }).map((_, i) => {
                  const active = i < Math.ceil((botPct / 100) * 8);
                  return (
                    <div
                      key={i}
                      className={`te-led-cell ${active ? 'active-yellow' : ''}`}
                    />
                  );
                })}
              </div>
              <span className="w-6 text-right text-[8px] text-[#8C8A82]">{botPct}%</span>
            </div>

            {/* Zoology */}
            <div className="flex items-center gap-1.5">
              <span className="w-6 text-[#FF5000] font-bold">ZOO</span>
              <div className="flex-1 te-led-bar">
                {Array.from({ length: 8 }).map((_, i) => {
                  const active = i < Math.ceil((zooPct / 100) * 8);
                  return (
                    <div
                      key={i}
                      className={`te-led-cell ${active ? 'active-orange' : ''}`}
                    />
                  );
                })}
              </div>
              <span className="w-6 text-right text-[8px] text-[#8C8A82]">{zooPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
