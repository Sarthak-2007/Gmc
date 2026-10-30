import React, { useState } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Sliders,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertCircle,
  Plus,
  Minus,
  Cloud,
  CloudCheck,
  RefreshCw,
  LogIn,
  ShieldCheck,
  User as UserIcon,
  Volume2,
  VolumeX,
  Volume1,
  Moon,
  Sun,
  Zap,
  Terminal,
  Layers,
  CircleDot,
  HelpCircle,
  Sparkles,
  BookOpen,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Palette,
  Maximize2,
  Minimize2,
  Cpu,
  Type,
  Database,
  Copy,
  CheckCheck,
  Crown,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppState, SpacedRepetitionSettings, AppFont } from '../types';
import { exportBackupJSON, importBackupJSON } from '../services/storage';
import { generateOneYearTestingData } from '../services/oneYearData';
import { CloudSyncStatus } from '../services/firebase';
import { sound, MONOLITH_PROFILE } from '../services/soundEffects';
import { useFullscreen } from '../services/fullscreen';
import { AppTheme } from './Header';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onUpdateSettings: (newSettings: SpacedRepetitionSettings) => void;
  onResetSeedData: () => void;
  onImportState: (newState: AppState) => void;
  onOpenTutorial: () => void;
  currentUser: User | null;
  cloudSyncStatus: CloudSyncStatus;
  lastCloudSyncTime: string | null;
  onManualCloudSync: () => Promise<void>;
  onRestoreFromCloud: () => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  theme: AppTheme;
  onSetTheme: (theme: AppTheme) => void;
  font: AppFont;
  onSetFont: (font: AppFont) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appState,
  onUpdateSettings,
  onResetSeedData,
  onImportState,
  onOpenTutorial,
  currentUser,
  cloudSyncStatus,
  lastCloudSyncTime,
  onManualCloudSync,
  onRestoreFromCloud,
  onGoogleLogin,
  onLogout,
  theme,
  onSetTheme,
  font,
  onSetFont,
}) => {
  const [gaps, setGaps] = useState<number[]>([...appState.settings.defaultGaps]);
  const [multipliers, setMultipliers] = useState({ ...appState.settings.confidenceMultipliers });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audio local state
  const [soundVolume, setSoundVolume] = useState<number>(() => sound.getVolume());
  const [isSfxEnabled, setIsSfxEnabled] = useState<boolean>(() => sound.enabled);

  // Methodology accordion expanded state
  const [isMethodologyExpanded, setIsMethodologyExpanded] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // State for copying color codes to clipboard
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = (hex: string) => {
    sound.playKeyClick();
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 2000);
    }).catch(() => {
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 2000);
    });
  };

  const handleGapChange = (index: number, val: number) => {
    const next = [...gaps];
    next[index] = Math.max(1, val);
    setGaps(next);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      defaultGaps: gaps,
      confidenceMultipliers: multipliers,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const [confirmAction, setConfirmAction] = useState<'load_testing' | 'factory_reset' | 'restore_cloud' | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportError(null);
      const newState = await importBackupJSON(file);
      onImportState(newState);
      sound.playCommitSuccess();
      setImportSuccess('Backup restored successfully into system!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse backup JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const handleManualSyncClick = async () => {
    setIsCloudLoading(true);
    setCloudMessage(null);
    try {
      sound.playKeyClick();
      await onManualCloudSync();
      setCloudMessage({ type: 'success', text: 'All data successfully backed up to Cloud Firestore!' });
    } catch (err: any) {
      setCloudMessage({ type: 'error', text: err.message || 'Cloud backup failed' });
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleRestoreCloudClick = async () => {
    if (confirmAction !== 'restore_cloud') {
      sound.playKeyClick();
      setConfirmAction('restore_cloud');
      return;
    }
    setConfirmAction(null);
    setIsCloudLoading(true);
    setCloudMessage(null);
    try {
      sound.playKeyClick();
      await onRestoreFromCloud();
      setCloudMessage({ type: 'success', text: 'Cloud data restored successfully! Updating console...' });
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setCloudMessage({ type: 'error', text: err.message || 'Failed to restore from cloud' });
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    setIsCloudLoading(true);
    setCloudMessage(null);
    try {
      sound.playKeyClick();
      await onGoogleLogin();
      setCloudMessage({ type: 'success', text: 'Signed in with Google! Cloud storage linked to your account.' });
    } catch (err: any) {
      setCloudMessage({ type: 'error', text: err.message || 'Google Sign-In failed.' });
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    setIsCloudLoading(true);
    try {
      sound.playKeyClick();
      await onLogout();
      setCloudMessage({ type: 'success', text: 'Signed out. Switched to local storage mode.' });
    } catch (err: any) {
      setCloudMessage({ type: 'error', text: err.message || 'Logout failed.' });
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleVolumeChange = (vol: number) => {
    setSoundVolume(vol);
    sound.setVolume(vol);
  };

  const handleToggleSfx = () => {
    const next = sound.toggle();
    setIsSfxEnabled(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#141416]/80 backdrop-blur-xs font-mono">
      <div className="te-chassis-card w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#FAF9F6] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] rounded-[6px] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416]">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#FF3B00] text-white rounded-[2px]">
              <SettingsIcon className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[10px] font-bold text-[#A8A49A] uppercase tracking-wider block">SYSTEM CONTROL</span>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Hardware Preferences & Methodology
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playModalClose();
              onClose();
            }}
            className="p-1 hover:bg-[#202024] text-[#D5D2C8] hover:text-white rounded-[2px] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. VISUAL THEME ENGINE (CLASSIC, CRAYON, 30+ SPECTRUM) */}
          <div className="p-4 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[2px_2px_0px_#141416] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D5D2C8] pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Display Engine</span>
                <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#FF3B00]" />
                  <span>Theme Configuration & Color Science</span>
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'classic',
                  name: 'TE Classic',
                  badge: 'Industrial Matte',
                  desc: 'Original Teenage Engineering warm sand chassis, signal orange, cobalt blue, high-contrast black machined borders.',
                  icon: Palette,
                  accent: '#FF3B00',
                  colors: ['#FF3B00', '#0047FF', '#FFB800', '#9333EA', '#DC2626'],
                },
                {
                  id: 'crayon-light',
                  name: 'Crayon Studio',
                  badge: 'Fine Sketchpad',
                  desc: 'Vibrant wax pigment palette on pure white Bristol paper. High-contrast typography, 0% green, effortless readability.',
                  icon: Sun,
                  accent: '#EA580C',
                  colors: ['#2563EB', '#EA580C', '#F59E0B', '#7C3AED', '#DB2777'],
                },
                {
                  id: 'vibrant-prism',
                  name: '30+ Spectrum',
                  badge: 'Ultra Chromatic',
                  desc: 'A multi-color palette with 30+ unique vibrant tones (fuchsia, cobalt, saffron, violet, coral). Strictly zero green.',
                  icon: Sparkles,
                  accent: '#EC4899',
                  colors: ['#0077FF', '#EC4899', '#FBBF24', '#8B5CF6', '#FF5500'],
                },
                {
                  id: 'hyper-chroma',
                  name: 'Hyper-Chroma 15+',
                  badge: 'Hell Yeah Spectrum',
                  desc: '15+ distinct vibrant non-green pigments. Non-white, non-grey, richly saturated chassis and unique page color styling!',
                  icon: Layers,
                  accent: '#8B5CF6',
                  colors: [
                    '#0047FF', '#4F46E5', '#0284C7', '#8B5CF6', '#9333EA',
                    '#D946EF', '#EC4899', '#F43F5E', '#DC2626', '#FF5722',
                    '#FF3B00', '#EA580C', '#FFB800', '#F59E0B', '#831843'
                  ],
                },
              ].map((t) => {
                const isSelected = theme === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      sound.playKeyClick();
                      onSetTheme(t.id as AppTheme);
                    }}
                    className={`p-3.5 rounded-[4px] border-2 text-left cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                      isSelected
                        ? 'border-[#141416] bg-[#FAF9F6] shadow-[2px_2px_0px_#141416] ring-2 ring-[#FF3B00]'
                        : 'border-[#D5D2C8] bg-[#F2EFE9] hover:border-[#141416]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-bold uppercase text-xs text-[#141416]">
                          <Icon className="w-4 h-4" style={{ color: t.accent }} />
                          <span>{t.name}</span>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-[2px] font-bold uppercase ${
                            isSelected ? 'bg-[#FF3B00] text-white' : 'bg-[#DCD8CE] text-[#55534D]'
                          }`}
                        >
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#55534D] leading-relaxed font-sans">
                        {t.desc}
                      </p>

                      {/* Swatch Strip */}
                      <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-[#D5D2C8]/60 flex-wrap">
                        {t.colors.map((c, ci) => (
                          <span
                            key={ci}
                            className="w-3 h-3 rounded-full border border-[#141416]/40 shadow-xs"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#D5D2C8]/60">
                      <span className="text-[9px] font-mono font-bold text-[#8C8A82] uppercase">
                        {isSelected ? '● ACTIVE' : '○ APPLY'}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#FF3B00]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1.25 CHAPTER PROGRESSION & SYSTEM COLOR CODES */}
          <div className="p-4 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[2px_2px_0px_#141416] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D5D2C8] pb-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">System Color Codes</span>
                <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#F04FCB]" />
                  <span>Chapter Progression Ranks & Hardware Color Codes</span>
                </h3>
                <p className="text-[#5C5A52] text-[11px] mt-0.5">
                  Official hex color tokens for all 7 preparation tiers, 4 subjects, and live revision status alerts. Click any token to copy its hex code.
                </p>
              </div>
              {copiedHex && (
                <span className="px-2.5 py-1 rounded-[3px] bg-[#141416] text-[#FEF08A] text-[10px] font-mono font-bold flex items-center gap-1 self-start sm:self-auto shadow-xs animate-bounce">
                  <CheckCheck className="w-3 h-3 text-[#22C55E]" />
                  <span>Copied {copiedHex}!</span>
                </span>
              )}
            </div>

            {/* A. 7 CHAPTER PROGRESSION TIERS (F -> S) */}
            <div className="space-y-2">
              <div className="text-[10.5px] font-bold text-[#141416] uppercase tracking-wide flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-[#F04FCB]" />
                <span>Chapter Mastery Tiers (F → E → D → C → B → A → S)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {[
                  {
                    rank: 'S',
                    name: 'Hot Pink (Apex Grail)',
                    hex: '#F04FCB',
                    title: 'Apex Mastered',
                    desc: 'Peak retention, 100% coverage, 3+ revisions, 5/5 confidence.',
                    textColor: '#FFFFFF',
                    crown: true,
                  },
                  {
                    rank: 'A',
                    name: 'Deep Indigo (Astral Sapphire)',
                    hex: '#493EA4',
                    title: 'Superior Orbit',
                    desc: '≥80% coverage, high retention, solid test performance.',
                    textColor: '#FFFFFF',
                  },
                  {
                    rank: 'B',
                    name: 'Golden Yellow (24K Aureate)',
                    hex: '#E2BC39',
                    title: 'Solid Core',
                    desc: '≥60% coverage, strong fundamentals, structured revisions.',
                    textColor: '#141416',
                  },
                  {
                    rank: 'C',
                    name: 'Rose Pink (Anodized Quartz)',
                    hex: '#C84481',
                    title: 'Developing',
                    desc: '≥35% coverage, basic textbook theory finished.',
                    textColor: '#FFFFFF',
                  },
                  {
                    rank: 'D',
                    name: 'Burnt Orange (Thermal Bronze)',
                    hex: '#E47E35',
                    title: 'Initiated',
                    desc: '≥10% coverage, initial first-pass readings underway.',
                    textColor: '#FFFFFF',
                  },
                  {
                    rank: 'E',
                    name: 'Electric Blue (Conduit Alloy)',
                    hex: '#377ED0',
                    title: 'At Risk / Pending',
                    desc: 'Overdue revision interval or test deficit. Review needed.',
                    textColor: '#FFFFFF',
                  },
                  {
                    rank: 'F',
                    name: 'Slate (Cast-Iron Monolith)',
                    hex: '#34323B',
                    title: 'Uncharted',
                    desc: '0% coverage, uninitiated chapter socket in curriculum.',
                    textColor: '#FFFFFF',
                  },
                ].map((item) => {
                  const isCopied = copiedHex === item.hex;
                  return (
                    <button
                      key={item.rank}
                      type="button"
                      onClick={() => handleCopyHex(item.hex)}
                      className="p-2.5 rounded-[4px] border-2 border-[#141416] bg-white text-left shadow-[2px_2px_0px_#141416] hover:bg-[#FAF9F6] transition-all flex flex-col justify-between cursor-pointer group"
                      title={`Click to copy ${item.hex}`}
                    >
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-[4px] border border-[#141416] flex items-center justify-center font-black font-mono text-sm shrink-0 shadow-xs relative"
                            style={{ backgroundColor: item.hex, color: item.textColor }}
                          >
                            {item.rank}
                            {item.crown && (
                              <Crown className="w-2.5 h-2.5 text-[#FEF08A] absolute -top-1.5 -right-1.5 drop-shadow-xs" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="font-black text-xs text-[#141416] block truncate">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-[#5C5A52] block font-mono truncate">
                              Grade {item.rank} · {item.name.split(' (')[0]}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-1.5 py-0.5 rounded-[2px] font-mono font-bold text-[10px] border flex items-center gap-1 transition-colors shrink-0 ${
                            isCopied
                              ? 'bg-[#141416] text-[#22C55E] border-[#22C55E]'
                              : 'bg-[#F2EFE9] text-[#141416] border-[#D5D2C8] group-hover:bg-[#141416] group-hover:text-white'
                          }`}
                        >
                          {isCopied ? <CheckCheck className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5 text-[#8C8A82]" />}
                          <span>{item.hex}</span>
                        </span>
                      </div>

                      <p className="text-[10px] text-[#5C5A52] leading-tight mt-1.5 line-clamp-2">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. SUBJECT TOKENS & REVISION STATUS TOKENS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#D5D2C8]">
              {/* Subjects */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider block">
                  Subject Color Standards (Zero Green, Zero Purple)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Physics', code: 'PHY', hex: '#0052FF', name: 'Electric Cobalt Blue' },
                    { label: 'Chemistry', code: 'CHE', hex: '#FF4F00', name: 'Radiant Vermilion' },
                    { label: 'Botany', code: 'BOT', hex: '#FFB800', name: 'Golden Solar Amber' },
                    { label: 'Zoology', code: 'ZOO', hex: '#E11D48', name: 'Industrial Magenta' },
                  ].map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => handleCopyHex(s.hex)}
                      className="p-1.5 rounded-[3px] border border-[#141416] bg-white flex items-center justify-between text-left hover:bg-[#FAF9F6] cursor-pointer"
                      title={`Click to copy ${s.hex}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-3.5 h-3.5 rounded-[2px] border border-[#141416] shrink-0" style={{ backgroundColor: s.hex }} />
                        <span className="text-[11px] font-black text-[#141416] truncate">{s.label}</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-[#5C5A52] font-bold">{s.hex}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Alerts */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider block">
                  Revision Cadence & Hazard Alerts
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Overdue Hazard', hex: '#DC2626', note: 'Immediate review required' },
                    { label: 'Due Today', hex: '#D97706', note: 'Spaced repetition due' },
                    { label: 'Up to Date', hex: '#0047FF', note: 'Cadence on track' },
                    { label: 'Not Started', hex: '#8C8A82', note: 'Uninitiated chapter' },
                  ].map((st) => (
                    <button
                      key={st.label}
                      type="button"
                      onClick={() => handleCopyHex(st.hex)}
                      className="p-1.5 rounded-[3px] border border-[#141416] bg-white flex items-center justify-between text-left hover:bg-[#FAF9F6] cursor-pointer"
                      title={`Click to copy ${st.hex}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-3.5 h-3.5 rounded-[2px] border border-[#141416] shrink-0" style={{ backgroundColor: st.hex }} />
                        <span className="text-[11px] font-black text-[#141416] truncate">{st.label}</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-[#5C5A52] font-bold">{st.hex}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 1.5 GLOBAL PURPOSE-DRIVEN FONT SYSTEM ENGINE */}
          <div className="p-4 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[2px_2px_0px_#141416] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D5D2C8] pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Typography Architecture</span>
                <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#0047FF]" />
                  <span>Humanist Clarity Standard (Active Typography Stack)</span>
                </h3>
                <p className="text-[#5C5A52] text-[11px] mt-0.5">
                  Engineered specifically for zero eye fatigue during marathon NEET study sessions with ultra-distinct, humanistic letterforms across Display, Interface UI, and Monospace Telemetry.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <div
                className="p-4 rounded-[4px] border-2 border-[#141416] bg-[#FAF9F6] shadow-[3px_3px_0px_#141416] ring-2 ring-[#0047FF] text-left relative overflow-hidden space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-[#D5D2C8] pb-1.5">
                  <div>
                    <span className="font-black uppercase text-sm text-[#141416] block">
                      Humanist Clarity Standard
                    </span>
                    <span className="text-[10px] text-[#0047FF] font-bold">
                      Ergonomic & High-Legibility · Dedicated Application Stack
                    </span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-[2px] font-bold uppercase bg-[#0047FF] text-white">
                    LOCKED & ACTIVE
                  </span>
                </div>

                {/* Purpose Breakdown Pills */}
                <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                  <div className="bg-white p-1 rounded border border-[#D5D2C8]">
                    <span className="text-[8px] font-bold text-[#8C8A82] uppercase block">Display Headings</span>
                    <strong className="text-[#141416] truncate block font-['Sora']">Sora (Geometric Humanist)</strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-[#D5D2C8]">
                    <span className="text-[8px] font-bold text-[#8C8A82] uppercase block">Interface & Body</span>
                    <strong className="text-[#141416] truncate block font-['Atkinson_Hyperlegible']">Atkinson Hyperlegible</strong>
                  </div>
                  <div className="bg-white p-1 rounded border border-[#D5D2C8]">
                    <span className="text-[8px] font-bold text-[#8C8A82] uppercase block">Telemetry / Numbers</span>
                    <strong className="text-[#141416] truncate block font-mono">Anonymous Pro</strong>
                  </div>
                </div>

                {/* Live 3-Purpose Previews */}
                <div className="p-2.5 bg-white border border-[#D5D2C8] rounded-[3px] space-y-1.5">
                  <div
                    className="font-bold text-xs text-[#141416] truncate"
                    style={{ fontFamily: `'Sora', sans-serif` }}
                  >
                    Mastery Matrix · 97 Syllabus Chapters
                  </div>
                  <p
                    className="text-[11px] text-[#55534D] leading-tight line-clamp-2"
                    style={{ fontFamily: `'Atkinson Hyperlegible', sans-serif` }}
                  >
                    Active recall intervals dynamically scheduled for maximum long-term retention and exam mastery.
                  </p>
                  <div
                    className="text-[10px] font-bold text-[#0047FF] truncate pt-1 border-t border-[#ECEAE4]"
                    style={{ fontFamily: `'Anonymous Pro', monospace` }}
                  >
                    REV_CYCLE: #03 · SCORE: 685/720 · RECALL: 100% · OVERDUE: 0d
                  </div>
                </div>

                <p className="text-[10.5px] text-[#55534D] leading-tight">
                  All alternative fonts removed. Atkinson Hyperlegible guarantees unambiguous numeral differentiation (1 vs l vs I, 0 vs O) for error-free NEET problem review.
                </p>

                <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-[#D5D2C8]/60">
                  <span className="text-[9px] font-mono font-bold text-[#0047FF] uppercase">
                    ● ACTIVE SYSTEM-WIDE TYPOGRAPHY
                  </span>
                  <span className="text-[9px] font-mono font-bold text-[#5C5A52]">
                    100% COMPLIANT
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. FULLSCREEN & IMMERSION DISPLAY ENGINE */}
          <div className="p-4 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[2px_2px_0px_#141416] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D5D2C8] pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Display Immersion</span>
                <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5 text-[#FF3B00]" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-[#0047FF]" />
                  )}
                  <span>Fullscreen Canvas Mode</span>
                </h3>
              </div>

              <span
                className={`text-[9px] px-2 py-0.5 rounded-[2px] font-mono font-bold uppercase ${
                  isFullscreen
                    ? 'bg-[#FF3B00] text-white'
                    : 'bg-[#DCD8CE] text-[#55534D]'
                }`}
              >
                {isFullscreen ? '● IMMERSIVE ACTIVE' : '○ WINDOWED'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAF9F6] border border-[#141416] rounded-[3px]">
              <div>
                <p className="text-xs font-bold text-[#141416]">
                  {isFullscreen ? 'Full Screen Immersion Enabled' : 'Standard Viewport Mode'}
                </p>
                <p className="text-[11px] text-[#55534D] mt-0.5 font-sans">
                  Expand the PCB-01 revision matrix to fill the entire monitor. Press{' '}
                  <kbd className="px-1.5 py-0.5 bg-[#E2DFD7] border border-[#B8B4A8] rounded text-[10px] font-mono font-bold text-[#141416]">
                    F
                  </kbd>{' '}
                  key anytime to toggle, or{' '}
                  <kbd className="px-1.5 py-0.5 bg-[#E2DFD7] border border-[#B8B4A8] rounded text-[10px] font-mono font-bold text-[#141416]">
                    Esc
                  </kbd>{' '}
                  to exit.
                </p>
              </div>

              <button
                type="button"
                onClick={() => toggleFullscreen()}
                className={`px-3 py-2 rounded-[2px] text-xs font-black uppercase tracking-wider cursor-pointer border-2 transition-all flex items-center justify-center gap-2 shrink-0 ${
                  isFullscreen
                    ? 'bg-[#141416] text-[#FAF9F6] border-[#141416] shadow-[2px_2px_0px_#FF3B00]'
                    : 'bg-[#FF3B00] text-white border-[#141416] shadow-[2px_2px_0px_#141416] hover:bg-[#FF5000]'
                }`}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-[#FFB800]" />
                    <span>Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                    <span>Go Full Screen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. ACOUSTIC FEEDBACK & MONOLITH DSP SYNTHESIZER */}
          <div className="p-4 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[2px_2px_0px_#141416] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#D5D2C8] pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Acoustic Feedback</span>
                <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#FF3B00]" />
                  <span>Monolith DSP Sound Engine</span>
                </h3>
                <p className="text-[#5C5A52] text-[11px] mt-0.5 font-sans">
                  Deterministic local Web Audio synthesis. Clean sub-punch and transient snap.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleSfx}
                className={`px-2.5 py-1 rounded-[2px] border text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 ${
                  isSfxEnabled
                    ? 'bg-[#141416] text-white border-[#141416]'
                    : 'bg-[#FAF9F6] text-[#8C8A82] border-[#D5D2C8]'
                }`}
              >
                {isSfxEnabled ? <Volume2 className="w-3 h-3 text-[#FF3B00]" /> : <VolumeX className="w-3 h-3" />}
                <span>{isSfxEnabled ? 'Audio Active' : 'Muted'}</span>
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-3 bg-[#FAF9F6] border border-[#141416] rounded-[3px] flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B00]" />
                  <span className="font-black text-xs uppercase text-[#141416]">{MONOLITH_PROFILE.name}</span>
                  <span className="text-[9px] bg-[#FF3B00]/10 text-[#FF3B00] px-1.5 py-0.2 rounded-[2px] font-bold uppercase">
                    PRIMARY DSP ARCHITECTURE
                  </span>
                </div>
                <p className="text-[11px] text-[#55534D] font-sans">
                  {MONOLITH_PROFILE.description}
                </p>
              </div>
            </div>

            {/* Volume Control & Audition Triggers */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase text-[#55534D] flex items-center gap-1">
                  <Volume1 className="w-3.5 h-3.5" />
                  <span>Master Volume:</span>
                </span>
                {[
                  { label: 'Low', val: 0.35 },
                  { label: 'Med', val: 0.65 },
                  { label: 'High', val: 1.0 },
                ].map((v) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => handleVolumeChange(v.val)}
                    className={`px-2.5 py-1 rounded-[2px] text-[10px] font-bold uppercase cursor-pointer border ${
                      Math.abs(soundVolume - v.val) < 0.1
                        ? 'bg-[#141416] text-white border-[#141416]'
                        : 'bg-[#FAF9F6] text-[#55534D] border-[#D5D2C8] hover:border-[#141416]'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Audition Triggers */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase text-[#706E66]">Audition:</span>
                <button
                  type="button"
                  onClick={() => sound.playKeyClick()}
                  className="te-btn-mechanical px-2 py-0.5 text-[10px] font-bold"
                >
                  Key Snap
                </button>
                <button
                  type="button"
                  onClick={() => sound.playRatingStep(5)}
                  className="te-btn-mechanical px-2 py-0.5 text-[10px] font-bold"
                >
                  Rating
                </button>
                <button
                  type="button"
                  onClick={() => sound.playCommitSuccess()}
                  className="te-btn-mechanical px-2 py-0.5 text-[10px] font-bold"
                >
                  Success
                </button>
                <button
                  type="button"
                  onClick={() => sound.playGeneratorLock()}
                  className="te-btn-mechanical px-2 py-0.5 text-[10px] font-bold"
                >
                  Lock
                </button>
              </div>
            </div>
          </div>

          {/* 3. METHODOLOGY & ALGORITHMIC BLUEPRINT (RELOCATED DEEPER INTO SETTINGS) */}
          <div className="p-4 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[2px_2px_0px_#141416] space-y-3">
            <div className="flex items-center justify-between border-b border-[#D5D2C8] pb-2">
              <div>
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Pedagogical Framework</span>
                <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#0047FF]" />
                  <span>NEET UG Methodology & Algorithmic Blueprint</span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playButtonClick();
                  onClose();
                  onOpenTutorial();
                }}
                className="te-btn-mechanical px-3 py-1 text-[11px] font-black uppercase flex items-center gap-1 bg-[#FAF9F6] text-[#0047FF]"
              >
                <Sparkles className="w-3 h-3" />
                <span>Launch Guide Modal</span>
              </button>
            </div>

            <p className="text-[11px] text-[#55534D] leading-relaxed font-sans">
              The PCB-01 engine operates on a scientific four-pillar framework designed specifically for NEET aspirants starting from 0% syllabus coverage.
            </p>

            {/* Collapsible Deep Blueprint Details */}
            <div className="bg-[#FAF9F6] border border-[#141416] rounded-[3px] overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  sound.playKeyClick();
                  setIsMethodologyExpanded(!isMethodologyExpanded);
                }}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-[#F2EFE9] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#FF3B00]" />
                  <span className="font-bold text-xs uppercase text-[#141416]">
                    View Detailed Pedagogical Blueprint
                  </span>
                </div>
                {isMethodologyExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#55534D]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#55534D]" />
                )}
              </button>

              {isMethodologyExpanded && (
                <div className="p-3.5 border-t border-[#D5D2C8] space-y-4 font-sans text-xs bg-white">
                  {/* Pillar 1: Zero-to-Complete */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#141416] flex items-center gap-1.5 font-mono text-[11px] uppercase">
                      <span className="w-4 h-4 rounded-full bg-[#FF3B00] text-white flex items-center justify-center text-[10px] font-black">1</span>
                      Multi-Day 1st Pass Isolation
                    </h4>
                    <p className="text-[#55534D] text-[11px] pl-5 leading-relaxed">
                      Chapters take multiple days to finish. Set your completion percentage (25%, 50%, 75%, 100%) as you work through lectures and NCERT. Chapters remain isolated and are NEVER pushed to spaced revision queues until you mark them 100% complete.
                    </p>
                  </div>

                  {/* Pillar 2: The 4 NEET Pillars */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#141416] flex items-center gap-1.5 font-mono text-[11px] uppercase">
                      <span className="w-4 h-4 rounded-full bg-[#0047FF] text-white flex items-center justify-center text-[10px] font-black">2</span>
                      The 4 Syllabus Pillars
                    </h4>
                    <ul className="text-[#55534D] text-[11px] pl-5 space-y-1 list-disc list-inside">
                      <li><strong>Video Lectures & Theory:</strong> Complete video/classroom lectures.</li>
                      <li><strong>NCERT Line-by-Line:</strong> Crucial for Biology & Inorganic Chemistry.</li>
                      <li><strong>Class Notes & Formulas:</strong> Formula sheets and concise summary notes.</li>
                      <li><strong>PYQs & Question Practice:</strong> 50–100 past NEET questions solved.</li>
                    </ul>
                  </div>

                  {/* Pillar 3: Nearest Test Lock */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#141416] flex items-center gap-1.5 font-mono text-[11px] uppercase">
                      <span className="w-4 h-4 rounded-full bg-[#FFB800] text-[#141416] flex items-center justify-center text-[10px] font-black">3</span>
                      Nearest Exam Radar Lock
                    </h4>
                    <p className="text-[#55534D] text-[11px] pl-5 leading-relaxed">
                      The Test Radar automatically identifies your closest upcoming test mission (ALLEN / AAKASH / NEET) and generates an alert for zero-coverage chapters required before exam day.
                    </p>
                  </div>

                  {/* Pillar 4: SM-2 Spaced Repetition */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-[#141416] flex items-center gap-1.5 font-mono text-[11px] uppercase">
                      <span className="w-4 h-4 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px] font-black">4</span>
                      SM-2 Confidence Multipliers
                    </h4>
                    <p className="text-[#55534D] text-[11px] pl-5 leading-relaxed">
                      Intervals scale dynamically: Day 3 → 7 → 14 → 30. High confidence ratings (★4–5) extend your next review interval, while lower ratings (★1–2) immediately pull the revision forward.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. CLOUD STORAGE & SYNC (FIRESTORE) */}
          <div className="p-4 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[2px_2px_0px_#141416] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D5D2C8] pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Persistence Engine</span>
                <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-[#0047FF]" />
                  <span>Cloud Storage & Multi-Device Sync</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {currentUser ? (
                  <div className="flex items-center gap-1.5 bg-[#FAF9F6] border border-[#141416] px-2 py-1 rounded-[2px]">
                    <UserIcon className="w-3 h-3 text-[#0047FF]" />
                    <span className="text-[10px] font-bold truncate max-w-[140px] text-[#141416]">
                      {currentUser.email || 'Google User'}
                    </span>
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      disabled={isCloudLoading}
                      className="ml-1 text-[9px] text-[#FF3B00] hover:underline uppercase font-bold"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    disabled={isCloudLoading}
                    className="te-btn-mechanical px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5 bg-[#FAF9F6]"
                  >
                    <LogIn className="w-3 h-3 text-[#0047FF]" />
                    <span>Link Google Account</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C5A52]">
              <div>
                <span>Status: </span>
                <strong className={`uppercase font-bold ${
                  cloudSyncStatus === 'synced' ? 'text-[#0047FF]' : cloudSyncStatus === 'saving' ? 'text-[#FFB800]' : 'text-[#706E66]'
                }`}>
                  {cloudSyncStatus === 'synced' ? 'Continuous Auto-Sync Active' : cloudSyncStatus === 'saving' ? 'Syncing...' : 'Local Storage Mode'}
                </strong>
                {lastCloudSyncTime && (
                  <span className="text-[#8C8A82] block text-[10px]">
                    Last synced: {new Date(lastCloudSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSyncClick}
                  disabled={isCloudLoading}
                  className="te-btn-mechanical px-2.5 py-1 text-[10px] font-bold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isCloudLoading ? 'animate-spin' : ''}`} />
                  <span>Force Push Cloud</span>
                </button>

                <button
                  type="button"
                  onClick={handleRestoreCloudClick}
                  disabled={isCloudLoading}
                  className={`te-btn-mechanical px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 ${
                    confirmAction === 'restore_cloud' ? 'bg-[#FF3B00] text-white border-[#141416]' : ''
                  }`}
                >
                  <CloudCheck className={`w-3 h-3 ${confirmAction === 'restore_cloud' ? 'text-white' : 'text-[#0047FF]'}`} />
                  <span>{confirmAction === 'restore_cloud' ? 'Click Again to Confirm Restore' : 'Restore from Cloud'}</span>
                </button>
              </div>
            </div>

            {cloudMessage && (
              <div
                className={`p-2 rounded-[2px] border text-[11px] flex items-center gap-1.5 font-bold ${
                  cloudMessage.type === 'success'
                    ? 'bg-[#0047FF]/10 border-[#0047FF] text-[#0047FF]'
                    : 'bg-[#FF3B00]/10 border-[#FF3B00] text-[#FF3B00]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{cloudMessage.text}</span>
              </div>
            )}
          </div>

          {/* 5. SPACED REPETITION BASE INTERVALS */}
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Revision Schedule</span>
              </div>
              <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5 mb-1">
                <Sliders className="w-3.5 h-3.5 text-[#0047FF]" />
                <span>Base Revision Intervals (Days)</span>
              </h3>
              <p className="text-[#5C5A52] text-[11px] mb-3 font-sans">
                Number of days between each subsequent revision when studying with moderate confidence.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {gaps.map((gapVal, idx) => (
                  <div key={idx} className="p-3 bg-[#ECEAE4] rounded-[4px] border-2 border-[#141416] text-center shadow-[2px_2px_0px_#141416] flex flex-col items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#5C5A52] tracking-wider block mb-1">
                      {idx === 0 ? 'Rev 1 (Initial)' : idx === 1 ? 'Rev 2' : idx === 2 ? 'Rev 3' : 'Rev 4+'}
                    </span>

                    <div className="flex items-center gap-1 my-1">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playKeyClick();
                          handleGapChange(idx, gapVal - 1);
                        }}
                        className="w-6 h-6 bg-[#FAF9F6] border border-[#141416] rounded-[2px] flex items-center justify-center font-bold hover:bg-[#141416] hover:text-white cursor-pointer shadow-[1px_1px_0px_#141416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="w-10 text-center font-black text-sm text-[#141416] bg-[#FAF9F6] py-0.5 border border-[#141416] rounded-[2px]">
                        {gapVal}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playKeyClick();
                          handleGapChange(idx, gapVal + 1);
                        }}
                        className="w-6 h-6 bg-[#FAF9F6] border border-[#141416] rounded-[2px] flex items-center justify-center font-bold hover:bg-[#141416] hover:text-white cursor-pointer shadow-[1px_1px_0px_#141416] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-[9px] text-[#8C8A82] uppercase">Days Gap</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="te-btn-mechanical px-4 py-2 text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer bg-[#FF3B00] text-white hover:bg-[#E63500] border-[#141416]"
              >
                <Check className="w-4 h-4" />
                <span>Save Algorithmic Intervals</span>
              </button>

              {saveSuccess && (
                <span className="text-[#2563EB] text-xs font-bold flex items-center gap-1 animate-pulse">
                  <Check className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Intervals Saved!</span>
                </span>
              )}
            </div>
          </form>

          {/* 6. DATA BACKUP & RESTORE */}
          <div className="pt-4 border-t-2 border-[#141416] space-y-3">
            <div>
              <span className="text-[10px] font-bold text-[#8C8A82] uppercase tracking-wider">Offline State Export</span>
              <h3 className="text-xs font-black uppercase text-[#141416] flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-[#FFB800]" />
                <span>Local JSON Backup & Data Restore</span>
              </h3>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  sound.playCommitSuccess();
                  exportBackupJSON(appState);
                }}
                className="te-btn-mechanical px-3 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer bg-[#FAF9F6]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Local Backup JSON</span>
              </button>

              <label className="te-btn-mechanical px-3 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer bg-[#FAF9F6]">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  if (confirmAction !== 'load_testing') {
                    sound.playKeyClick();
                    setConfirmAction('load_testing');
                    return;
                  }
                  setConfirmAction(null);
                  try {
                    sound.playCommitSuccess();
                    const oneYearState = generateOneYearTestingData(appState);
                    onImportState(oneYearState);
                    setImportSuccess('1-Year Testing Simulation Loaded! (230+ study sessions, 24 mock tests with score progression 492→680+, and full 52-week activity heatmap populated)');
                    setImportError(null);
                    setTimeout(() => {
                      onClose();
                    }, 800);
                  } catch (err: any) {
                    console.error('Failed to load test data:', err);
                    setImportError('Failed to generate 1-year test data: ' + (err?.message || 'Unknown error'));
                  }
                }}
                className="te-btn-mechanical px-3 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer bg-[#FF3B00] text-white hover:bg-[#E03400] border-[#141416] shadow-[2px_2px_0px_#141416]"
              >
                <Database className="w-3.5 h-3.5 text-white" />
                <span>
                  {confirmAction === 'load_testing'
                    ? 'Confirm Overwrite with 1-Year Data?'
                    : 'Load 1-Year Testing Data'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmAction !== 'factory_reset') {
                    sound.playKeyClick();
                    setConfirmAction('factory_reset');
                    return;
                  }
                  setConfirmAction(null);
                  sound.playTrashVaporize();
                  onResetSeedData();
                  setImportSuccess('Factory syllabus state restored successfully.');
                  setImportError(null);
                  setTimeout(() => {
                    onClose();
                  }, 800);
                }}
                className={`te-btn-mechanical px-3 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer border-[#141416] ${
                  confirmAction === 'factory_reset'
                    ? 'bg-[#E52E2E] text-white'
                    : 'text-[#E52E2E] bg-[#FAF9F6]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {confirmAction === 'factory_reset'
                    ? 'Confirm Factory Reset?'
                    : 'Factory Reset Seed'}
                </span>
              </button>

              {confirmAction && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playModalClose();
                    setConfirmAction(null);
                  }}
                  className="te-btn-mechanical px-2.5 py-1.5 text-xs font-bold cursor-pointer bg-[#ECEAE4] text-[#141416]"
                >
                  Cancel
                </button>
              )}
            </div>

            {importError && (
              <div className="p-2 bg-[#E52E2E]/10 border border-[#E52E2E] text-[#E52E2E] rounded-[2px] text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="p-2 bg-[#0047FF]/10 border border-[#0047FF] text-[#0047FF] rounded-[2px] text-xs font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#141416] text-[#A09D94] text-[10px] flex items-center justify-between border-t border-[#141416]">
          <span>PCB-01 HW v2.5 • SM-2 Dual-Coaching System</span>
          <span>Config changes persist automatically</span>
        </div>
      </div>
    </div>
  );
};
