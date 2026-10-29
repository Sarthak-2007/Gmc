import React, { useState } from 'react';
import {
  Flame,
  Settings as SettingsIcon,
  Radio,
  BookOpen,
  Calendar,
  Dices,
  BarChart3,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Volume2,
  VolumeX,
  Palette,
  Sparkles,
  Sun,
  Layers,
  Compass,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Cpu,
  Crown,
  LayoutGrid,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Chapter, StudyLog, SyllabusPacingSettings, Test, TestScore } from '../types';
import { calculateMemoryRetention, calculateSyllabusPacing, getChapterRevisionInfo, getTodayStr } from '../services/spacedRepetition';
import { CloudSyncStatus } from '../services/firebase';
import { sound } from '../services/soundEffects';
import { useFullscreen } from '../services/fullscreen';
import {
  getStreakTier,
  getPercentageConfidenceTier,
  getPaceTier,
} from '../utils/confidenceColor';

export type AppTheme = 'classic' | 'crayon-light' | 'vibrant-prism' | 'hyper-chroma';

interface HeaderProps {
  chapters: Chapter[];
  studyLogs: StudyLog[];
  tests: Test[];
  testScores?: TestScore[];
  pacingSettings?: SyllabusPacingSettings;
  onOpenSettings: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  cloudSyncStatus: CloudSyncStatus;
  theme: AppTheme;
  onToggleTheme: () => void;
  onOpenWeeklyAudit?: () => void;
  onOpenMcp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  chapters,
  studyLogs,
  tests,
  testScores = [],
  pacingSettings = {
    targetSyllabusDate: '2026-12-31',
    targetExamDate: '2027-05-02',
    targetRevisionPasses: 3,
    targetMockTestsCount: 25,
    includeAllTestsGoal: true,
    studyDaysPerWeek: 7,
  },
  onOpenSettings,
  activeTab,
  setActiveTab,
  currentUser,
  cloudSyncStatus,
  theme,
  onToggleTheme,
  onOpenWeeklyAudit,
  onOpenMcp,
}) => {
  const [sfxEnabled, setSfxEnabled] = useState(sound.enabled);
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const todayStr = getTodayStr();

  const handleToggleSfx = () => {
    const next = sound.toggle();
    setSfxEnabled(next);
  };

  // Compute streak
  const uniqueStudyDays = new Set(studyLogs.map((l) => l.dateStudied));
  let streak = 0;
  let checkDate = new Date();
  
  const todayStudied = uniqueStudyDays.has(todayStr);
  if (!todayStudied) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (uniqueStudyDays.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Chapter statistics
  const activeChapters = chapters.filter((c) => !c.isArchived);
  let notStartedCount = 0;
  let inProgressCount = 0;
  let firstPassDoneCount = 0;
  let overdueCount = 0;
  let criticalDecayCount = 0;

  activeChapters.forEach((c) => {
    const info = getChapterRevisionInfo(c, tests, todayStr);
    if (info.learningStage === 'NOT_STARTED') notStartedCount++;
    else if (info.learningStage === 'IN_PROGRESS') inProgressCount++;
    else firstPassDoneCount++;

    if (info.status === 'overdue') overdueCount++;

    const retention = calculateMemoryRetention(c, todayStr);
    if (retention.decayStatus === 'critical') criticalDecayCount++;
  });

  const completionPercent = activeChapters.length > 0 ? Math.round((firstPassDoneCount / activeChapters.length) * 100) : 0;

  // Pacing trajectory summary
  const pacing = calculateSyllabusPacing(chapters, studyLogs, tests, testScores, pacingSettings, todayStr);

  const handleTabClick = (tabId: string) => {
    sound.playTabSwitch();
    setActiveTab(tabId);
  };

  const getThemeIcon = () => {
    if (theme === 'classic') return <Palette className="w-3.5 h-3.5 text-[#FFB800]" />;
    if (theme === 'crayon-light') return <Sun className="w-3.5 h-3.5 text-[#EA580C]" />;
    if (theme === 'vibrant-prism') return <Sparkles className="w-3.5 h-3.5 text-[#EC4899]" />;
    return <Layers className="w-3.5 h-3.5 text-[#8B5CF6]" />;
  };

  const getThemeLabel = () => {
    if (theme === 'classic') return 'TE Classic';
    if (theme === 'crayon-light') return 'Crayon Studio';
    if (theme === 'vibrant-prism') return '30+ Spectrum';
    return 'Hyper-Chroma';
  };

  return (
    <header id="header-main" className="bg-[#141416] text-[#FAF9F6] border-b-2 border-[#141416] shadow-sm select-none font-mono">
      {/* 1. TOP HARDWARE STATUS STRIP */}
      <div className="bg-[#0C0C0E] border-b border-[#202024] px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-[#A09D94] gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF3B00] animate-pulse" />
            <span className="font-bold text-white tracking-wider">PCB-01</span>
            <span className="text-[#68665E]">/</span>
            <span className="text-[#D5D2C8] uppercase font-bold text-[10px]">SM-2 REVISION CONSOLE</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[10px] text-[#706E66] border-l border-[#26262C] pl-3">
            <span>DSP AUDIO:</span>
            <span className="text-[#FF3B00] font-bold uppercase">MONOLITH</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Sound Mute Button */}
          <button
            id="header-sfx-toggle"
            onClick={handleToggleSfx}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold bg-[#18181C] px-2 py-0.5 rounded-[2px] border border-[#2E2E36]"
            title="Toggle Monolith DSP Audio Feedback"
          >
            {sfxEnabled ? (
              <>
                <Volume2 className="w-3 h-3 text-[#FF3B00]" />
                <span className="text-[#D5D2C8]">SFX ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-[#8C8A82]" />
                <span className="text-[#8C8A82]">MUTED</span>
              </>
            )}
          </button>

          {/* Theme Quick Toggle Button */}
          <button
            id="header-theme-toggle"
            onClick={() => {
              sound.playKeyClick();
              onToggleTheme();
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold bg-[#18181C] px-2 py-0.5 rounded-[2px] border border-[#2E2E36]"
            title={`Switch Theme: Classic -> Crayon Light -> 30+ Spectrum (Current: ${getThemeLabel()})`}
          >
            {getThemeIcon()}
            <span className="text-[#D5D2C8]">{getThemeLabel()}</span>
          </button>

          {/* Fullscreen Quick Toggle Button */}
          <button
            id="header-fullscreen-toggle"
            onClick={() => toggleFullscreen()}
            className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold px-2 py-0.5 rounded-[2px] border ${
              isFullscreen
                ? 'bg-[#FF3B00]/20 text-[#FF5000] border-[#FF3B00]/50 shadow-xs'
                : 'bg-[#18181C] text-[#D5D2C8] border-[#2E2E36]'
            }`}
            title={isFullscreen ? 'Exit Fullscreen Immersion (or press Esc / F)' : 'Enter Fullscreen Immersion Mode (or press F)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3 h-3 text-[#FF5000]" />
                <span className="text-[#FF5000] hidden sm:inline">EXIT FULLSCREEN</span>
                <span className="text-[#FF5000] sm:hidden">EXIT</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-[#FFB800]" />
                <span className="text-[#D5D2C8] hidden sm:inline">FULLSCREEN</span>
                <span className="text-[#D5D2C8] sm:hidden">FULL</span>
              </>
            )}
          </button>

          {/* Cloud Firestore Sync Status Indicator */}
          <div className="flex items-center gap-1.5 border-l border-[#26262C] pl-3">
            {cloudSyncStatus === 'synced' && (
              <span className="flex items-center gap-1 text-[#60A5FA]" title={currentUser ? `Cloud Synced to ${currentUser.email || 'account'}` : 'Cloud Storage Connected'}>
                <CloudCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="hidden sm:inline text-[10px] font-bold uppercase text-[#93C5FD]">Cloud Synced</span>
              </span>
            )}
            {cloudSyncStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[#FFB800] animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline text-[10px] font-bold uppercase">Syncing...</span>
              </span>
            )}
            {cloudSyncStatus === 'connecting' && (
              <span className="flex items-center gap-1 text-[#4D82FF]">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline text-[10px] font-bold uppercase">Connecting...</span>
              </span>
            )}
            {cloudSyncStatus === 'offline' && (
              <span className="flex items-center gap-1 text-[#8C8A82]" title="Local-only mode (Sign in via Settings to link Google Account)">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] font-bold uppercase">Local Mode</span>
              </span>
            )}
            {cloudSyncStatus === 'error' && (
              <span className="flex items-center gap-1 text-[#FF3B00]" title="Cloud Sync Warning - local persistence active">
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px] font-bold uppercase">Sync Warning</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER BAR */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Logo & Headline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[4px] bg-[#FF3B00] border-2 border-[#FAF9F6] flex items-center justify-center font-black text-white text-base shadow-[2px_2px_0px_#FAF9F6] shrink-0">
              01
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight uppercase text-white font-display">
                  PCB-01 Study Console
                </h1>
                <span className="text-[9px] bg-[#FF3B00] text-white px-1.5 py-0.2 rounded-[2px] font-bold uppercase">
                  NEET UG
                </span>
              </div>

              {/* High-contrast metrics pill row with Minimal Pacing & Decay */}
              <div className="text-[11px] text-[#A8A49A] flex items-center gap-2 mt-0.5 flex-wrap">
                {(() => {
                  const streakTier = getStreakTier(streak);
                  return (
                    <div className="flex items-center gap-1 bg-[#202024] px-1.5 py-0.2 rounded-[2px] border border-[#32323A]">
                      <Flame className={`w-3 h-3 ${streak > 0 ? streakTier.textClass : 'text-[#8C8A82]'}`} />
                      <span>Streak: <strong className={`font-black ${streakTier.textClass}`}>{streak}d</strong></span>
                    </div>
                  );
                })()}

                {(() => {
                  const syllTier = getPercentageConfidenceTier(completionPercent);
                  return (
                    <div className="flex items-center gap-1 bg-[#202024] px-1.5 py-0.2 rounded-[2px] border border-[#32323A]">
                      <span>Syllabus: <strong className={`font-black ${syllTier.textClass}`}>{completionPercent}%</strong></span>
                    </div>
                  );
                })()}

                {/* Minimal Pacing Indicator in Header */}
                {(() => {
                  const paceTier = getPaceTier(pacing.paceStatus);
                  return (
                    <button
                      onClick={() => setActiveTab('strategy')}
                      className="flex items-center gap-1 bg-[#202024] hover:bg-[#2A2A32] px-1.5 py-0.2 rounded-[2px] border border-[#32323A] cursor-pointer transition-colors"
                      title="Click to inspect Syllabus Pacing Flight Plan in Strategic Hub"
                    >
                      <Compass className={`w-3 h-3 ${paceTier.textClass}`} />
                      <span>Pace: <strong className={paceTier.textClass}>
                        {pacing.paceStatus === 'AHEAD' ? 'Ahead' : pacing.paceStatus === 'BEHIND' ? `Behind (${Math.abs(pacing.paceDeltaChapters)} chs)` : 'On Track'}
                      </strong> ({pacing.required1stPassVelocityPerWeek} ch/wk)</span>
                    </button>
                  );
                })()}

                {/* Minimal Critical Decay indicator */}
                {criticalDecayCount > 0 && (
                  <button
                    onClick={() => setActiveTab('strategy')}
                    className="flex items-center gap-1 bg-[#DC2626]/20 hover:bg-[#DC2626]/30 text-[#DC2626] px-1.5 py-0.2 rounded-[2px] border border-[#DC2626]/50 font-black animate-pulse cursor-pointer"
                    title="Click to open Critical Memory Decay matrix in Strategic Hub"
                  >
                    <ShieldAlert className="w-3 h-3 text-[#DC2626]" />
                    <span>Decay Alert: <strong className="text-[#DC2626] font-black">{criticalDecayCount} Topics</strong></span>
                  </button>
                )}

                {overdueCount > 0 && criticalDecayCount === 0 && (
                  <div className="px-1.5 py-0.2 rounded-[2px] bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/50 font-black animate-pulse">
                    Overdue: <strong className="text-[#FF6B00] font-black">{overdueCount}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto flex-wrap">
            {onOpenWeeklyAudit && (
              <button
                id="header-weekly-audit-btn"
                onClick={onOpenWeeklyAudit}
                className="te-btn-orange px-3 py-1.5 text-xs cursor-pointer flex items-center gap-1.5 font-black shadow-[1px_1px_0px_#FAF9F6]"
                title="Open 7-Day Strategic Flight Audit & Performance Brief"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Weekly Audit</span>
              </button>
            )}

            {onOpenMcp && (
              <button
                id="header-mcp-btn"
                onClick={onOpenMcp}
                className="te-btn-mechanical px-3 py-1.5 text-xs cursor-pointer bg-[#ECEAE4] flex items-center gap-1.5 font-black shadow-[1px_1px_0px_#FAF9F6] border-2 border-[#141416]"
                title="Open Model Context Protocol (MCP) Server Interface & Diagnostics"
              >
                <Cpu className="w-3.5 h-3.5 text-[#FF3B00]" />
                <span className="flex items-center gap-1">
                  MCP
                </span>
              </button>
            )}

            <button
              id="header-settings-btn"
              onClick={onOpenSettings}
              className="te-btn-mechanical px-3 py-1.5 text-xs cursor-pointer bg-[#ECEAE4] flex items-center gap-1.5 font-black shadow-[1px_1px_0px_#FAF9F6]"
              title="System Control, Methodology & Hardware Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#141416]" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* 3. Primary Machined Navigation Deck */}
        <nav id="header-nav-tabs" className="flex items-center gap-1.5 mt-2.5 border-t border-[#26262B] pt-2 overflow-x-auto">
          {[
            { id: 'shadows', code: '00', label: 'Mastery Matrix', icon: LayoutGrid, activeColor: 'bg-[#FF3B00]', activeBorder: 'shadow-[2px_2px_0px_#FF3B00]', iconColor: 'text-[#FF3B00]' },
            { id: 'radar', code: '01', label: 'Test Radar & Focus', icon: Radio, activeColor: 'bg-[#FF3B00]', activeBorder: 'shadow-[2px_2px_0px_#FF3B00]', iconColor: 'text-[#FF3B00]' },
            { id: 'chapters', code: '02', label: `Syllabus Matrix (${activeChapters.length})`, icon: BookOpen, activeColor: 'bg-[#0047FF]', activeBorder: 'shadow-[2px_2px_0px_#0047FF]', iconColor: 'text-[#0047FF]' },
            { id: 'tests', code: '03', label: `Exams & Mocks (${tests.length})`, icon: Calendar, activeColor: 'bg-[#DC2626]', activeBorder: 'shadow-[2px_2px_0px_#DC2626]', iconColor: 'text-[#DC2626]' },
            { id: 'generator', code: '04', label: 'Practice Generator', icon: Dices, activeColor: 'bg-[#D97706]', activeBorder: 'shadow-[2px_2px_0px_#D97706]', iconColor: 'text-[#D97706]' },
            { id: 'strategy', code: '05', label: 'Flight Plan & Forensics', icon: Compass, activeColor: 'bg-[#4F46E5]', activeBorder: 'shadow-[2px_2px_0px_#4F46E5]', iconColor: 'text-[#4F46E5]' },
            { id: 'analytics', code: '06', label: 'Telemetry & Pillars', icon: BarChart3, activeColor: 'bg-[#EC4899]', activeBorder: 'shadow-[2px_2px_0px_#EC4899]', iconColor: 'text-[#EC4899]' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className={`px-3 py-1.5 rounded-[3px] text-xs font-black tracking-tight transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1.5 ${
                  isActive
                    ? `bg-[#FAF9F6] text-[#141416] border-[#FAF9F6] ${tab.activeBorder}`
                    : 'bg-[#1C1C20] text-[#8C8A82] border-[#2C2C32] hover:text-[#FAF9F6] hover:bg-[#25252B]'
                }`}
              >
                <span className={`text-[10px] px-1 py-0.2 rounded-[1px] ${isActive ? `${tab.activeColor} text-white` : 'bg-[#2A2A30] text-[#8C8A82]'}`}>
                  {tab.code}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? tab.iconColor : 'text-[#8C8A82]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
