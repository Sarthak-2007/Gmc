import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Calculator,
  HelpCircle,
  Volume2,
  VolumeX,
  LayoutGrid,
  TrendingUp,
  Star,
  Award,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Check,
  Compass,
  ArrowUpDown,
  Filter,
  CheckCircle,
  Zap,
  Table as TableIcon,
  Info,
  SlidersHorizontal,
  Crosshair,
  Activity,
  Sparkles,
  Target,
  Crown,
  Tv,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Type,
  Columns,
  Grid3X3,
  Printer,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { Chapter, LearningStage, StudyLog, Subject, Test, TestScore } from '../types';
import { getChapterRevisionInfo, getTodayStr, calculateSyllabusPacing, getDaysDifference } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';
import { CONFIDENCE_TIERS, getConfidenceTier } from '../utils/confidenceColor';

export type ChapterRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface RankProfile {
  rank: ChapterRank;
  label: string;
  summary: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  keycapBg: string;
  textColor: string;
  explanation: string;
}

// EXACT USER PROGRESSION GAMIFICATION PALETTE:
// F — Slate               #34323B
// E — Electric Blue       #377ED0
// D — Burnt Orange        #E47E35
// C — Rose Pink           #C84481
// B — Golden Yellow       #E2BC39
// A — Deep Indigo         #493EA4
// S — Hot Pink            #F04FCB
export const CHAPTER_RANKS: Record<ChapterRank, RankProfile> = {
  S: {
    rank: 'S',
    label: 'Apex Mastered',
    summary: 'Peak Retention · 100% Coverage · Active Mastery · Verified Tests',
    color: '#F04FCB', // Hot Pink (The Apex Grail - Most Coveted Rank)
    badgeBg: 'bg-[#FDF2F8]',
    badgeBorder: 'border-[#F04FCB]',
    keycapBg: 'bg-[#F04FCB]',
    textColor: 'text-white',
    explanation: 'Peak examination readiness. Rapid recall under timed conditions, notes verified, full syllabus questions mastered.',
  },
  A: {
    rank: 'A',
    label: 'Superior Orbit',
    summary: 'High Retention · ≥80% Coverage · Deep Mastery',
    color: '#493EA4', // Deep Indigo (Cosmic Astral Sapphire)
    badgeBg: 'bg-[#EEF2FF]',
    badgeBorder: 'border-[#493EA4]',
    keycapBg: 'bg-[#493EA4]',
    textColor: 'text-white',
    explanation: 'Deep theoretical foundation with solid numerical velocity. Mock test scores high and spaced intervals maintained.',
  },
  B: {
    rank: 'B',
    label: 'Solid Core',
    summary: 'Active Drills · ≥60% Coverage · Solid Fundamentals',
    color: '#E2BC39', // Golden Yellow (24K Gilded Aureate Ingot)
    badgeBg: 'bg-[#FEFCE8]',
    badgeBorder: 'border-[#E2BC39]',
    keycapBg: 'bg-[#E2BC39]',
    textColor: 'text-[#141416]',
    explanation: 'Core formulas and concepts clear with structured revisions. Needs ongoing question drills and test validation.',
  },
  C: {
    rank: 'C',
    label: 'Developing',
    summary: 'Theory Done · ≥35% Coverage · Practice Needed',
    color: '#C84481', // Rose Pink (Anodized Quartz Titanium)
    badgeBg: 'bg-[#FDF2F8]',
    badgeBorder: 'border-[#C84481]',
    keycapBg: 'bg-[#C84481]',
    textColor: 'text-white',
    explanation: 'Lectures and basic textbook readings finished. Needs consistent question practice and first scheduled spaced revisions.',
  },
  D: {
    rank: 'D',
    label: 'Initiated',
    summary: 'First Pass in Progress · ≥10% Coverage',
    color: '#E47E35', // Burnt Orange (Forged Thermal Bronze)
    badgeBg: 'bg-[#FFF7ED]',
    badgeBorder: 'border-[#E47E35]',
    keycapBg: 'bg-[#E47E35]',
    textColor: 'text-white',
    explanation: 'Initial lecture or reading underway. Prioritize completing first pass theory before scheduled spaced review cycles.',
  },
  E: {
    rank: 'E',
    label: 'At Risk / Pending',
    summary: 'Overdue Review · Test Deficit · Review Needed',
    color: '#377ED0', // Electric Blue (Conduit Alloy)
    badgeBg: 'bg-[#EFF6FF]',
    badgeBorder: 'border-[#377ED0]',
    keycapBg: 'bg-[#377ED0]',
    textColor: 'text-white',
    explanation: 'Scheduled revision interval was missed or recent test had high errors. Review immediately to restore points.',
  },
  F: {
    rank: 'F',
    label: 'Uncharted',
    summary: 'Chassis Socket · 0% Complete · Not Started',
    color: '#34323B', // Slate (Industrial Cast-Iron Monolith)
    badgeBg: 'bg-[#2B2930]',
    badgeBorder: 'border-[#34323B]',
    keycapBg: 'bg-[#34323B]',
    textColor: 'text-[#E2E8F0]',
    explanation: 'Not started yet. Add to your upcoming study schedule to begin your first syllabus pass.',
  },
};

// IMMERSIVE GRADE-SATURATED CHAPTER VIEWING THEMES (ZERO-WHITE, HIGH-CONTRAST ATMOSPHERIC PANELS)
export interface GradeViewingTheme {
  modalBg: string;
  cardBg: string;
  cardBorder: string;
  metricBorder: string;
  glowShadow: string;
  headerGradient: string;
  accentColor: string;
  textColor: string;
  subtextColor: string;
  gaugeLitColor: string;
  badgeBg: string;
  badgeText: string;
}

export const GRADE_VIEWING_THEMES: Record<ChapterRank, GradeViewingTheme> = {
  S: {
    modalBg: 'linear-gradient(160deg, #2c0521 0%, #170212 100%)',
    cardBg: 'rgba(240, 79, 203, 0.12)',
    cardBorder: 'border-[#F04FCB]',
    metricBorder: 'border-[#F04FCB]',
    glowShadow: '0 0 50px rgba(240, 79, 203, 0.75)',
    headerGradient: 'linear-gradient(135deg, #ff70e4 0%, #F04FCB 50%, #b80d8f 100%)',
    accentColor: '#F04FCB',
    textColor: 'text-white',
    subtextColor: 'text-[#FCE7F3]',
    gaugeLitColor: '#FFFFFF',
    badgeBg: 'bg-[#F04FCB]',
    badgeText: 'text-white',
  },
  A: {
    modalBg: 'linear-gradient(160deg, #1d1746 0%, #0d0a24 100%)',
    cardBg: 'rgba(73, 62, 164, 0.16)',
    cardBorder: 'border-[#493EA4]',
    metricBorder: 'border-[#493EA4]',
    glowShadow: '0 0 40px rgba(73, 62, 164, 0.65)',
    headerGradient: 'linear-gradient(135deg, #6456cc 0%, #493EA4 50%, #2f257a 100%)',
    accentColor: '#493EA4',
    textColor: 'text-white',
    subtextColor: 'text-[#E0E7FF]',
    gaugeLitColor: '#A5B4FC',
    badgeBg: 'bg-[#493EA4]',
    badgeText: 'text-white',
  },
  B: {
    modalBg: 'linear-gradient(160deg, #2b2304 0%, #151101 100%)',
    cardBg: 'rgba(226, 188, 57, 0.14)',
    cardBorder: 'border-[#E2BC39]',
    metricBorder: 'border-[#E2BC39]',
    glowShadow: '0 0 40px rgba(226, 188, 57, 0.65)',
    headerGradient: 'linear-gradient(135deg, #fae25c 0%, #E2BC39 50%, #bd9315 100%)',
    accentColor: '#E2BC39',
    textColor: 'text-[#FEF08A]',
    subtextColor: 'text-[#FEF9C3]',
    gaugeLitColor: '#E2BC39',
    badgeBg: 'bg-[#E2BC39]',
    badgeText: 'text-[#141416]',
  },
  C: {
    modalBg: 'linear-gradient(160deg, #280b19 0%, #14050d 100%)',
    cardBg: 'rgba(200, 68, 129, 0.14)',
    cardBorder: 'border-[#C84481]',
    metricBorder: 'border-[#C84481]',
    glowShadow: '0 0 35px rgba(200, 68, 129, 0.55)',
    headerGradient: 'linear-gradient(135deg, #dc5193 0%, #C84481 50%, #9e255d 100%)',
    accentColor: '#C84481',
    textColor: 'text-white',
    subtextColor: 'text-[#FCE7F3]',
    gaugeLitColor: '#FBCFE8',
    badgeBg: 'bg-[#C84481]',
    badgeText: 'text-white',
  },
  D: {
    modalBg: 'linear-gradient(160deg, #291104 0%, #140801 100%)',
    cardBg: 'rgba(228, 126, 53, 0.14)',
    cardBorder: 'border-[#E47E35]',
    metricBorder: 'border-[#E47E35]',
    glowShadow: '0 0 35px rgba(228, 126, 53, 0.55)',
    headerGradient: 'linear-gradient(135deg, #f29049 0%, #E47E35 50%, #bd5d16 100%)',
    accentColor: '#E47E35',
    textColor: 'text-white',
    subtextColor: 'text-[#FFEDD5]',
    gaugeLitColor: '#FFEDD5',
    badgeBg: 'bg-[#E47E35]',
    badgeText: 'text-white',
  },
  E: {
    modalBg: 'linear-gradient(160deg, #091c32 0%, #030d17 100%)',
    cardBg: 'rgba(55, 126, 208, 0.14)',
    cardBorder: 'border-[#377ED0]',
    metricBorder: 'border-[#377ED0]',
    glowShadow: '0 0 35px rgba(55, 126, 208, 0.55)',
    headerGradient: 'linear-gradient(135deg, #488fe0 0%, #377ED0 50%, #2061ab 100%)',
    accentColor: '#377ED0',
    textColor: 'text-white',
    subtextColor: 'text-[#DBEAFE]',
    gaugeLitColor: '#BFDBFE',
    badgeBg: 'bg-[#377ED0]',
    badgeText: 'text-white',
  },
  F: {
    modalBg: 'linear-gradient(160deg, #26242b 0%, #161519 100%)',
    cardBg: 'rgba(52, 50, 59, 0.45)',
    cardBorder: 'border-[#54505f]',
    metricBorder: 'border-[#54505f]',
    glowShadow: '0 0 30px rgba(52, 50, 59, 0.65)',
    headerGradient: 'linear-gradient(135deg, #484552 0%, #34323B 50%, #25242a 100%)',
    accentColor: '#34323B',
    textColor: 'text-[#F1F0F5]',
    subtextColor: 'text-[#A29EAE]',
    gaugeLitColor: '#D4D2DC',
    badgeBg: 'bg-[#34323B]',
    badgeText: 'text-[#E2E8F0]',
  },
};

// SUBJECT COLOR TOKENS (UNIVERSALLY SYNCHRONIZED ACROSS PCB-01 - ZERO GREEN, ZERO PURPLE)
export const SUBJECT_COLOR_THEMES: Record<Subject, {
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  cardBorder: string;
  shortCode: string;
}> = {
  Physics: {
    color: '#0052FF', // Electric Cobalt Blue
    badgeBg: 'bg-[#EFF6FF]',
    badgeBorder: 'border-[#0052FF]',
    badgeText: 'text-[#0052FF]',
    cardBorder: 'border-l-[#0052FF]',
    shortCode: 'PHY',
  },
  Chemistry: {
    color: '#FF4F00', // Radiant Flame Orange/Vermilion
    badgeBg: 'bg-[#FFF7ED]',
    badgeBorder: 'border-[#FF4F00]',
    badgeText: 'text-[#FF4F00]',
    cardBorder: 'border-l-[#FF4F00]',
    shortCode: 'CHE',
  },
  Botany: {
    color: '#FFB800', // Golden Solar Amber (Strict Zero-Green)
    badgeBg: 'bg-[#FFFBEB]',
    badgeBorder: 'border-[#FFB800]',
    badgeText: 'text-[#FFB800]',
    cardBorder: 'border-l-[#FFB800]',
    shortCode: 'BOT',
  },
  Zoology: {
    color: '#E11D48', // Vibrant Industrial Tech Rose / Magenta (Strict Zero-Purple)
    badgeBg: 'bg-[#FFF1F2]',
    badgeBorder: 'border-[#E11D48]',
    badgeText: 'text-[#E11D48]',
    cardBorder: 'border-l-[#E11D48]',
    shortCode: 'ZOO',
  },
};

// STATUS COLORS
export const STATUS_COLOR_THEMES = {
  OVERDUE: {
    label: 'Overdue',
    color: '#DC2626',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#DC2626]',
    border: 'border-[#DC2626]',
  },
  DUE_TODAY: {
    label: 'Due Today',
    color: '#D97706',
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#D97706]',
    border: 'border-[#D97706]',
  },
  UP_TO_DATE: {
    label: 'Up to Date',
    color: '#0047FF',
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#0047FF]',
    border: 'border-[#0047FF]',
  },
  NOT_STARTED: {
    label: 'Not Started',
    color: '#8C8A82',
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#8C8A82]',
    border: 'border-[#8C8A82]',
  },
};

export interface ChapterAnalysis {
  chapter: Chapter;
  chapterNumber: number;
  rank: ChapterRank;
  profile: RankProfile;
  masteryScore: number; // 0 to 1000 points
  breakdown: {
    syllabusCoveragePoints: number; // 0 to 350
    revisionPoints: number; // 0 to 300
    confidencePoints: number; // 0 to 200
    testPerformanceFactor: number; // -150 to +150
    recallErrorPenalty: number; // 0 to 40 pts
    overduePenalty: number; // 0 to 140 pts
    isOverdueResolved: boolean;
    pacingVelocityBonus: number; // -20 to +20
    linkedTestAveragePercent: number | null;
    linkedTestCount: number;
  };
  status: 'UP_TO_DATE' | 'DUE_TODAY' | 'OVERDUE' | 'NOT_STARTED';
  statusLabel: string;
  completionPercent: number;
  revisionCount: number;
  confidence: number;
  daysSinceLastStudied: number | null;
  daysDiff: number;
  subjectColor: string;
  subjectShortCode: string;
  confidenceTierHex: string;
}

// 16:9 HIGH-DEFINITION GRAPHIC POSTER & PRINT GENERATOR (HTML5 CANVAS)
export function exportPanoramicCanvas(
  chapters: ChapterAnalysis[],
  todayStr: string,
  includeTitles: boolean,
  sCount: number,
  totalCount: number,
  theme: 'cyber' = 'cyber'
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Cyber Chromatic Background Gradient (Rich, vibrant, not black, not white)
  const bg = ctx.createLinearGradient(0, 0, 1920, 1080);
  bg.addColorStop(0, '#2a0845');
  bg.addColorStop(0.35, '#4b1248');
  bg.addColorStop(0.7, '#641c39');
  bg.addColorStop(1, '#1a1a40');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1920, 1080);

  // 2. Atmospheric Light Orbs Linked to Disciplines & S-Rank Pink
  const drawOrb = (cx: number, cy: number, r: number, color: string) => {
    const rad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    rad.addColorStop(0, color);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 1920, 1080);
  };
  drawOrb(280, 260, 420, 'rgba(0, 82, 255, 0.28)'); // Physics
  drawOrb(740, 260, 420, 'rgba(255, 79, 0, 0.24)'); // Chemistry
  drawOrb(1200, 260, 420, 'rgba(234, 179, 8, 0.24)'); // Botany
  drawOrb(1660, 260, 420, 'rgba(225, 29, 72, 0.26)'); // Zoology
  drawOrb(960, 540, 550, 'rgba(240, 79, 203, 0.25)'); // Apex Pink

  // Helper rounded rect
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // 3. Top Header Bar
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText('★ NEET UG 2027 · TACTICAL 16:9 MASTERY RADAR ★', 60, 75);

  const pct = totalCount > 0 ? Math.round((sCount / totalCount) * 100) : 0;
  ctx.fillStyle = '#F04FCB';
  ctx.font = 'bold 20px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillText(`👑 UNCOVERED: ${sCount} / ${totalCount} APEX PINK TILES (${pct}%)`, 60, 112);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`CYCLE: ${todayStr} IST · ALL 4 DISCIPLINES`, 1860, 75);
  ctx.fillStyle = '#F04FCB';
  ctx.fillText(`TACTICAL OBJECTIVE: 100% UNIFIED PINK GRAIL`, 1860, 112);
  ctx.textAlign = 'left';

  // Luminous Horizon Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, 130);
  ctx.lineTo(1860, 130);
  ctx.stroke();

  // 4. Four Distinct Disciplines Side-by-Side (Zero Clubbing)
  const subjects: { name: string; key: Subject; color: string; code: string }[] = [
    { name: 'PHYSICS', key: 'Physics', color: '#0052FF', code: 'PHY' },
    { name: 'CHEMISTRY', key: 'Chemistry', color: '#FF4F00', code: 'CHE' },
    { name: 'BOTANY', key: 'Botany', color: '#EAB308', code: 'BOT' },
    { name: 'ZOOLOGY', key: 'Zoology', color: '#E11D48', code: 'ZOO' },
  ];

  const colWidth = 432;
  const colGap = 16;
  const startX = 60;
  const startY = 150;
  const colHeight = 860;

  subjects.forEach((sub, sIdx) => {
    const x = startX + sIdx * (colWidth + colGap);
    const subItems = chapters.filter((c) => c.chapter.subject === sub.key);
    const subSCount = subItems.filter((i) => i.rank === 'S').length;

    // Outer Glass Enclosure
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = sub.color;
    ctx.lineWidth = 2;
    drawRoundedRect(x, startY, colWidth, colHeight, 14);
    ctx.fill();
    ctx.stroke();

    // Subject Header Box
    ctx.fillStyle = sub.color;
    drawRoundedRect(x + 16, startY + 16, 48, 24, 4);
    ctx.fill();
    ctx.fillStyle = sub.key === 'Botany' ? '#141416' : '#FFFFFF';
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.fillText(sub.code, x + 24, startY + 33);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px ui-monospace, monospace';
    ctx.fillText(sub.name, x + 72, startY + 34);

    ctx.fillStyle = '#F04FCB';
    ctx.font = 'bold 13px ui-monospace, monospace';
    ctx.fillText(`👑 ${subSCount}/${subItems.length} Pink`, x + 276, startY + 34);

    // Tiles Grid inside Subject
    const colsInGrid = 4;
    const tileW = 92;
    const tileH = includeTitles ? 86 : 54;
    const tileGap = 8;
    const gridX = x + 16;
    const gridY = startY + 56;

    subItems.forEach((item, tIdx) => {
      const gx = tIdx % colsInGrid;
      const gy = Math.floor(tIdx / colsInGrid);
      const tx = gridX + gx * (tileW + tileGap);
      const ty = gridY + gy * (tileH + tileGap);

      const isS = item.rank === 'S';
      const isA = item.rank === 'A';
      const isB = item.rank === 'B';
      const isC = item.rank === 'C';
      const isD = item.rank === 'D';
      const isE = item.rank === 'E';

      // 1. 3D Keycap Drop Shadow (matching app feel)
      ctx.fillStyle = isS
        ? 'rgba(117, 5, 93, 0.85)'
        : isA
        ? 'rgba(26, 19, 74, 0.85)'
        : isB
        ? 'rgba(108, 82, 3, 0.85)'
        : 'rgba(0, 0, 0, 0.65)';
      drawRoundedRect(tx, ty + 3, tileW, tileH, 8);
      ctx.fill();

      // 2. Beveled Gradient Face (exact match to ChapterKeycapTile)
      const tileGrad = ctx.createLinearGradient(tx, ty, tx + tileW, ty + tileH);
      if (isS) {
        tileGrad.addColorStop(0, '#ff70e4');
        tileGrad.addColorStop(0.42, '#F04FCB');
        tileGrad.addColorStop(1, '#cc17a3');
      } else if (isA) {
        tileGrad.addColorStop(0, '#6456cc');
        tileGrad.addColorStop(0.5, '#493EA4');
        tileGrad.addColorStop(1, '#2f257a');
      } else if (isB) {
        tileGrad.addColorStop(0, '#fae25c');
        tileGrad.addColorStop(0.5, '#E2BC39');
        tileGrad.addColorStop(1, '#bd9315');
      } else if (isC) {
        tileGrad.addColorStop(0, '#dc5193');
        tileGrad.addColorStop(0.5, '#C84481');
        tileGrad.addColorStop(1, '#9e255d');
      } else if (isD) {
        tileGrad.addColorStop(0, '#f29049');
        tileGrad.addColorStop(0.5, '#E47E35');
        tileGrad.addColorStop(1, '#bd5d16');
      } else if (isE) {
        tileGrad.addColorStop(0, '#488fe0');
        tileGrad.addColorStop(0.5, '#377ED0');
        tileGrad.addColorStop(1, '#2061ab');
      } else {
        tileGrad.addColorStop(0, '#3f3c46');
        tileGrad.addColorStop(0.55, '#34323B');
        tileGrad.addColorStop(1, '#25242a');
      }

      ctx.fillStyle = tileGrad;
      drawRoundedRect(tx, ty, tileW, tileH, 8);
      ctx.fill();

      // Outer border matching tactile keycap
      ctx.strokeStyle = isS
        ? '#940875'
        : isA
        ? '#201859'
        : isB
        ? '#806207'
        : isC
        ? '#6c1a40'
        : isD
        ? '#7a3206'
        : isE
        ? '#164375'
        : '#242229';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top Specular Highlight line
      ctx.strokeStyle = isB ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + 6, ty + 2);
      ctx.lineTo(tx + tileW - 6, ty + 2);
      ctx.stroke();

      // 3. Header Row: Code (Left) & 5-Segment Metallic Power Gauge (Right)
      const code = `${sub.code[0]}${String(item.chapterNumber).padStart(2, '0')}`;
      ctx.fillStyle = isB ? '#161304' : '#FFFFFF';
      ctx.font = 'bold 9px ui-monospace, monospace';
      ctx.fillText(code, tx + 6, ty + 13);

      // Power Gauge bezel
      const gaugeX = tx + tileW - 32;
      const gaugeY = ty + 6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      drawRoundedRect(gaugeX, gaugeY, 26, 7, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // 5 miniature lit power segments
      const litColor = isB ? '#161304' : isS ? '#FFFFFF' : isA ? '#A5B4FC' : '#FFFFFF';
      for (let lvl = 1; lvl <= 5; lvl++) {
        const segX = gaugeX + 2 + (lvl - 1) * 4.6;
        const isLit = item.confidence >= lvl;
        ctx.fillStyle = isLit ? litColor : 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(segX, gaugeY + 1.5, 3.2, 4);
      }

      // 4. Rank Letter & Crown
      ctx.fillStyle = isB ? '#161304' : '#FFFFFF';
      ctx.font = includeTitles ? '900 16px ui-monospace, monospace' : '900 20px ui-monospace, monospace';
      ctx.textAlign = 'center';
      const rankCenterY = includeTitles ? ty + 27 : ty + 32;
      ctx.fillText(item.rank, tx + tileW / 2, rankCenterY);

      if (isS) {
        ctx.font = 'bold 10px ui-monospace, monospace';
        ctx.fillStyle = '#FEF08A';
        ctx.fillText('👑', tx + tileW / 2 + 11, rankCenterY - 7);
      }
      ctx.textAlign = 'left';

      // 5. Complete Full Chapter Name (Zero Truncation / No Ellipsis) & Bottom Telemetry
      if (includeTitles) {
        ctx.fillStyle = isB ? '#161304' : 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 6.8px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

        // Word-wrap full name cleanly across multiple lines so NO letters are truncated
        const words = item.chapter.name.split(' ');
        const lines: string[] = [];
        let curLine = '';
        for (const w of words) {
          if (!curLine) {
            curLine = w;
          } else if ((curLine + ' ' + w).length <= 16) {
            curLine += ' ' + w;
          } else {
            lines.push(curLine);
            curLine = w;
          }
        }
        if (curLine) lines.push(curLine);

        const textStartY = ty + 38;
        const lineHeight = 8;
        lines.forEach((lineText, lIdx) => {
          ctx.fillText(lineText, tx + 6, textStartY + lIdx * lineHeight);
        });

        ctx.fillStyle = isB ? '#161304' : 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 7px ui-monospace, monospace';
        ctx.fillText(`${item.masteryScore} pts`, tx + 6, ty + tileH - 5);
        ctx.textAlign = 'right';
        ctx.fillText(`${item.completionPercent}%`, tx + tileW - 6, ty + tileH - 5);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = isB ? '#161304' : 'rgba(255, 255, 255, 0.8)';
        ctx.font = '7.5px ui-monospace, monospace';
        ctx.fillText(`${item.masteryScore} pts`, tx + 6, ty + 46);
        ctx.textAlign = 'right';
        ctx.fillText(`${item.completionPercent}%`, tx + tileW - 6, ty + 46);
        ctx.textAlign = 'left';
      }
    });
  });

  // Footer Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = 'bold 12px ui-monospace, monospace';
  ctx.fillText('SOLO LEVELING NEET UG 2027 · TACTICAL MASTERY HORIZON', 60, 1050);
  ctx.textAlign = 'right';
  ctx.fillText('TACTICAL GRAIL: ALL 86 CHAPTERS HOT PINK S-RANK', 1860, 1050);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

interface ShadowArmyMatrixProps {
  chapters: Chapter[];
  tests: Test[];
  studyLogs: StudyLog[];
  testScores?: TestScore[];
  onOpenQuickLogForChapter?: (chapterId: string) => void;
  onQuickRateChapter?: (chapterId: string, rating: number) => void;
  onQuickUpdateStage?: (chapterId: string, stage: LearningStage) => void;
}

export const ShadowArmyMatrix: React.FC<ShadowArmyMatrixProps> = ({
  chapters,
  tests,
  studyLogs,
  testScores = [],
  onOpenQuickLogForChapter,
  onQuickRateChapter,
  onQuickUpdateStage,
}) => {
  // Minimal Filters (Always in syllabus sequence and subject-wise)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRank, setSelectedRank] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Selected Chapter for Zero-Scroll Inspection Drawer Modal (Centered Over Viewport)
  const [inspectedChapterId, setInspectedChapterId] = useState<string | null>(null);

  // Collapsible sections in inspection drawer modal (Collapsed by default as requested)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    breakdown: true,
    tests: true,
    logs: true,
  });

  const toggleSection = (id: string) => {
    sound.playKeyClick();
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Consolidated System Guide, Mastery Calculation & Color Codex Modal
  const [isCodexModalOpen, setIsCodexModalOpen] = useState(false);
  const [codexTab, setCodexTab] = useState<'colors' | 'formula' | 'guide'>('colors');

  // Collapsible Chapter Readiness Header (Persisted to localStorage, minimal button with no text)
  const [isReadinessCollapsed, setIsReadinessCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('te_matrix_readiness_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleReadinessCollapsed = () => {
    sound.playKeyClick();
    setIsReadinessCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('te_matrix_readiness_collapsed', String(next));
      } catch {
        // no-op
      }
      return next;
    });
  };

  // Matrix View Mode: 'standard' | 'panoramic169' (Persisted to localStorage)
  const [matrixViewMode, setMatrixViewMode] = useState<'standard' | 'panoramic169'>(() => {
    try {
      return (localStorage.getItem('te_matrix_view_mode') as 'standard' | 'panoramic169') || 'standard';
    } catch {
      return 'standard';
    }
  });

  const handleSetMatrixViewMode = (mode: 'standard' | 'panoramic169') => {
    sound.playKeyClick();
    setMatrixViewMode(mode);
    try {
      localStorage.setItem('te_matrix_view_mode', mode);
    } catch {
      // no-op
    }
  };

  // 16:9 Panoramic Radar View Options
  const [isFullscreen169, setIsFullscreen169] = useState<boolean>(false);
  const panoramicContainerRef = useRef<HTMLDivElement | null>(null);

  // Minimal toggle to show chapter names or not (persisted to localStorage)
  const [showChapterTitles, setShowChapterTitles] = useState<boolean>(() => {
    try {
      return localStorage.getItem('te_matrix_show_titles') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleShowChapterTitles = () => {
    sound.playKeyClick();
    setShowChapterTitles((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('te_matrix_show_titles', String(next));
      } catch {
        // no-op
      }
      return next;
    });
  };

  // Panoramic Layout Structure: 'mosaic' (Dense Widescreen Mosaic) | '4col' (4 Parallel Streams) | 'quad' (2x2 Quad Command Horizon)
  const [panoramicLayout, setPanoramicLayout] = useState<'mosaic' | '4col' | 'quad'>(() => {
    try {
      const saved = localStorage.getItem('te_panoramic_layout');
      if (saved === 'mosaic' || saved === '4col' || saved === 'quad') return saved;
      return 'mosaic';
    } catch {
      return 'mosaic';
    }
  });

  const cyclePanoramicLayout = () => {
    sound.playKeyClick();
    setPanoramicLayout((prev) => {
      const next = prev === 'mosaic' ? '4col' : prev === '4col' ? 'quad' : 'mosaic';
      try {
        localStorage.setItem('te_panoramic_layout', next);
      } catch {
        // no-op
      }
      return next;
    });
  };

  // Panoramic Canvas Palette Theme: Strictly Cyber per user request
  const panoramicTheme = 'cyber';

  // 16:9 Poster & Print Export Modal State

  // 16:9 Poster & Print Export Modal State
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [posterIncludeTitles, setPosterIncludeTitles] = useState<boolean>(() => showChapterTitles);

  // Bulletproof Fullscreen Horizon Handler (Native requestFullscreen + Full Viewport React Portal Overlay)
  const toggleFullscreen169 = () => {
    sound.playKeyClick();
    setIsFullscreen169((prev) => {
      const next = !prev;
      if (next) {
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch {
          // fallback to viewport portal overlay
        }
      } else {
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {
          // fallback
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen169) {
        setIsFullscreen169(false);
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {
          // no-op
        }
      }
    };

    if (isFullscreen169) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFullscreen169]);

  const todayStr = useMemo(() => getTodayStr(), []);

  // Borrow Syllabus Flight Pacing from the central engine to ensure total system consistency
  const syllabusPacing = useMemo(() => {
    return calculateSyllabusPacing(chapters, studyLogs, tests, testScores, undefined, todayStr);
  }, [chapters, studyLogs, tests, testScores, todayStr]);

  // Compute 0-1000 Mastery Score & Dynamic Non-Fixed Ranks for every chapter
  const analyzedChapters: ChapterAnalysis[] = useMemo(() => {
    return chapters
      .filter((c) => !c.isArchived)
      .map((ch, idx) => {
        const info = getChapterRevisionInfo(ch, tests, todayStr);

        // Find relevant chapter study logs to check if recently studied or revised
        const chapterLogs = (studyLogs || []).filter((l) => l.chapterId === ch.id);
        const latestLog = chapterLogs.length > 0
          ? [...chapterLogs].sort((a, b) => b.timestamp - a.timestamp)[0]
          : null;
        const effectiveLastStudied = latestLog?.dateStudied || ch.lastStudiedDate || null;
        const daysSinceLastStudied = effectiveLastStudied ? getDaysDifference(effectiveLastStudied, todayStr) : null;

        // Dynamic parameters derived simultaneously from chapter and latest logs
        const effectiveConfidence = ch.currentConfidence ?? latestLog?.confidenceRating ?? 0;
        const effectiveRevisionCount = Math.max(ch.revisionCount || 0, latestLog?.revisionNumber || 0);

        // 1. Syllabus Theory Coverage (Max 350 pts)
        // If First Pass is Done or chapter is in revision or marked 100%, count full 100% (350 pts)!
        const isFirstPassDone =
          ch.learningStage === 'FIRST_PASS_DONE' ||
          ch.learningStage === 'IN_REVISION' ||
          effectiveRevisionCount >= 1 ||
          (ch.completionPercentage !== undefined && ch.completionPercentage >= 100) ||
          (latestLog?.completionPercentage !== undefined && latestLog.completionPercentage >= 100);
        const comp = isFirstPassDone ? 100 : Math.min(100, Math.max(0, ch.completionPercentage ?? latestLog?.completionPercentage ?? 0));

        let syllabusCoveragePoints = Math.round(comp * 3.5);
        if (comp >= 100 || isFirstPassDone) {
          syllabusCoveragePoints = 350;
        }

        // 2. Revision Depth with Diminishing Returns (Max 300 pts)
        const rev = effectiveRevisionCount;
        let revisionPoints = 0;
        if (rev >= 1) revisionPoints += 120; // 1st round milestone
        if (rev >= 2) revisionPoints += 100; // 2nd round reinforcement
        if (rev >= 3) revisionPoints += Math.min(80, (rev - 2) * 40); // 3rd+ rounds
        revisionPoints = Math.min(300, Math.round(revisionPoints));

        // 3. Self-Confidence Rating (Max 200 pts)
        const conf = Math.min(5, Math.max(0, effectiveConfidence));
        const confidenceTable = [0, 30, 70, 120, 165, 200];
        const confidencePoints = confidenceTable[conf];

        // 4. Linked Mock Test Performance & Diagnostic Error Factors (-150 pts to +150 pts)
        let testPerformanceFactor = 0;
        let linkedTestAveragePercent: number | null = null;
        let linkedTestCount = 0;
        let recallErrorPenalty = 0;

        const linkedCompletedTests = tests.filter((t) =>
          t.linkedChapterIds?.includes(ch.id) && t.date <= todayStr
        );

        if (linkedCompletedTests.length > 0) {
          const testScoresList = linkedCompletedTests
            .map((t) => {
              const s = (testScores || []).find((sc) => sc.testId === t.id);
              if (!s) return null;
              const totalMarks = t.totalMarks || 720;
              // If errors recorded specifically flag memory recall issues, check if resolved by later revision:
              if (s.errors?.memoryRecall && s.errors.memoryRecall > 2) {
                // If chapter was studied/revised on or after the test date, OR user has high confidence (>=4), the error is resolved!
                const isResolvedByRevision =
                  (effectiveLastStudied && effectiveLastStudied >= t.date) ||
                  conf >= 4;
                if (!isResolvedByRevision) {
                  recallErrorPenalty += Math.min(40, (s.errors.memoryRecall - 2) * 10);
                }
              }
              return (s.totalScore / totalMarks) * 100;
            })
            .filter((pct): pct is number => pct !== null);

          linkedTestCount = testScoresList.length;

          if (testScoresList.length > 0) {
            const avgPct = testScoresList.reduce((a, b) => a + b, 0) / testScoresList.length;
            linkedTestAveragePercent = Math.round(avgPct);

            if (avgPct >= 85) {
              testPerformanceFactor = +150; // Elite test validation
            } else if (avgPct >= 70) {
              testPerformanceFactor = +100; // High examination proficiency
            } else if (avgPct >= 55) {
              testPerformanceFactor = +40; // Adequate baseline
            } else if (avgPct >= 40) {
              testPerformanceFactor = -60; // Mock test deficit
            } else {
              testPerformanceFactor = -150; // Severe mock test failure
            }
          }
        }

        // 5. Overdue Spaced Repetition Penalty (REMOVED IMMEDIATELY WHEN REVISED OR RESOLVED!)
        // Check if the reason for penalty is resolved:
        // A) info.status is not overdue
        // B) Chapter was studied/revised recently (today or within 2 days)
        // C) effectiveLastStudied is on or after nextRevisionDate
        const isOverdueResolved =
          info.status !== 'overdue' ||
          (effectiveLastStudied !== null && getDaysDifference(effectiveLastStudied, todayStr) <= 2) ||
          (ch.lastStudiedDate !== null && getDaysDifference(ch.lastStudiedDate, todayStr) <= 2) ||
          (effectiveLastStudied !== null && ch.nextRevisionDate !== null && effectiveLastStudied >= (ch.nextRevisionDate || ''));

        let overduePenalty = 0;
        if (!isOverdueResolved) {
          const overdueDays = Math.abs(info.daysDiff);
          overduePenalty = Math.min(140, 35 + overdueDays * 12);
        } else if (info.status === 'due_today' && (daysSinceLastStudied === null || daysSinceLastStudied > 0)) {
          overduePenalty = 10; // Mild reminder penalty for today's review
        }

        // 6. Syllabus Flight Plan Momentum Factor
        const pacingVelocityBonus =
          syllabusPacing.paceStatus === 'AHEAD' ? 20 : syllabusPacing.paceStatus === 'BEHIND' ? -20 : 0;

        // Composite Mastery Score (0 to 1,000 pts)
        // Clean, transparent, direct reflection of mastery!
        const basePoints = syllabusCoveragePoints + revisionPoints + confidencePoints;
        const totalPoints = basePoints + testPerformanceFactor + pacingVelocityBonus - overduePenalty - recallErrorPenalty;
        const masteryScore = Math.max(0, Math.min(1000, Math.round(totalPoints)));

        // Determine Dynamic Rank (S, A, B, C, D, E, F)
        // Ranks reflect actual current mastery and level of retention!
        let rank: ChapterRank = 'F';
        const isUntouchedChapter =
          conf === 0 &&
          rev === 0 &&
          comp === 0 &&
          (!ch.learningStage || ch.learningStage === 'NOT_STARTED');

        if (isUntouchedChapter) {
          rank = 'F';
        } else if (
          masteryScore >= 880 &&
          comp >= 100 &&
          rev >= 3 &&
          conf === 5 &&
          overduePenalty === 0 &&
          (linkedTestAveragePercent === null || linkedTestAveragePercent >= 75)
        ) {
          rank = 'S'; // Apex Exam Mastered
        } else if (
          masteryScore >= 700 &&
          comp >= 80 &&
          rev >= 2 &&
          conf >= 4 &&
          overduePenalty === 0 &&
          (linkedTestAveragePercent === null || linkedTestAveragePercent >= 55)
        ) {
          rank = 'A'; // Superior Orbit
        } else if (
          masteryScore >= 500 &&
          comp >= 60 &&
          rev >= 1 &&
          conf >= 3 &&
          (linkedTestAveragePercent === null || linkedTestAveragePercent >= 40)
        ) {
          rank = 'B'; // Solid Core
        } else if (masteryScore >= 320 && comp >= 35 && conf >= 2) {
          rank = 'C'; // Developing
        } else if (masteryScore >= 150 && comp >= 10) {
          rank = 'D'; // Initiated
        } else if (
          masteryScore >= 30 ||
          comp > 0 ||
          info.status === 'overdue' ||
          (linkedTestAveragePercent !== null && linkedTestAveragePercent < 45)
        ) {
          rank = 'E'; // At Risk (Needs review)
        } else {
          rank = 'F'; // Unstudied
        }

        // Status Determination
        let status: 'UP_TO_DATE' | 'DUE_TODAY' | 'OVERDUE' | 'NOT_STARTED' = 'UP_TO_DATE';
        let statusLabel = 'Up to Date';

        if (rank === 'F' && comp === 0) {
          status = 'NOT_STARTED';
          statusLabel = 'Not Started';
        } else if (!isOverdueResolved && info.status === 'overdue') {
          status = 'OVERDUE';
          statusLabel = `Overdue by ${Math.abs(info.daysDiff)}d`;
        } else if (info.status === 'due_today' && (daysSinceLastStudied === null || daysSinceLastStudied > 0)) {
          status = 'DUE_TODAY';
          statusLabel = 'Due for Review';
        } else {
          status = 'UP_TO_DATE';
          statusLabel = 'Up to Date';
        }

        const subTheme = SUBJECT_COLOR_THEMES[ch.subject] || SUBJECT_COLOR_THEMES.Physics;
        const confTier = getConfidenceTier(conf);

        return {
          chapter: ch,
          chapterNumber: idx + 1,
          rank,
          profile: CHAPTER_RANKS[rank],
          masteryScore,
          breakdown: {
            syllabusCoveragePoints,
            revisionPoints,
            confidencePoints,
            testPerformanceFactor,
            recallErrorPenalty,
            overduePenalty,
            isOverdueResolved,
            pacingVelocityBonus,
            linkedTestAveragePercent,
            linkedTestCount,
          },
          status,
          statusLabel,
          completionPercent: comp,
          revisionCount: rev,
          confidence: conf,
          daysSinceLastStudied,
          daysDiff: info.daysDiff,
          subjectColor: subTheme.color,
          subjectShortCode: subTheme.shortCode,
          confidenceTierHex: confTier.hex,
        };
      });
  }, [chapters, tests, testScores, studyLogs, syllabusPacing, todayStr]);

  // Overall Statistics across syllabus
  const overallStats = useMemo(() => {
    const total = analyzedChapters.length;
    const sCount = analyzedChapters.filter((c) => c.rank === 'S').length;
    const aCount = analyzedChapters.filter((c) => c.rank === 'A').length;
    const bCount = analyzedChapters.filter((c) => c.rank === 'B').length;
    const cCount = analyzedChapters.filter((c) => c.rank === 'C').length;
    const dCount = analyzedChapters.filter((c) => c.rank === 'D').length;
    const eCount = analyzedChapters.filter((c) => c.rank === 'E').length;
    const fCount = analyzedChapters.filter((c) => c.rank === 'F').length;

    const totalScore = analyzedChapters.reduce((acc, c) => acc + c.masteryScore, 0);
    const avgScore = total > 0 ? Math.round(totalScore / total) : 0;
    const readyCount = sCount + aCount;
    const readyPercentage = total > 0 ? Math.round((readyCount / total) * 100) : 0;
    const dueCount = analyzedChapters.filter((c) => c.status === 'DUE_TODAY').length;
    const overdueCount = analyzedChapters.filter((c) => c.status === 'OVERDUE').length;

    // First Pass Done count & percentage
    const firstPassChapters = analyzedChapters.filter((c) => {
      return (
        c.chapter.learningStage === 'FIRST_PASS_DONE' ||
        c.chapter.learningStage === 'IN_REVISION' ||
        (c.chapter.revisionCount || 0) >= 1 ||
        c.completionPercent >= 100 ||
        (c.chapter.completionPercentage !== undefined && c.chapter.completionPercentage >= 100)
      );
    });
    const firstPassCount = firstPassChapters.length;
    const firstPassPercentage = total > 0 ? Math.round((firstPassCount / total) * 100) : 0;
    const totalCompletionSum = analyzedChapters.reduce((acc, c) => acc + c.completionPercent, 0);
    const avgCompletion = total > 0 ? Math.round(totalCompletionSum / total) : 0;

    // Revision Depth
    const rev3PlusCount = analyzedChapters.filter((c) => c.revisionCount >= 3).length;
    const rev2Count = analyzedChapters.filter((c) => c.revisionCount === 2).length;
    const rev1Count = analyzedChapters.filter((c) => c.revisionCount === 1).length;
    const rev0Count = analyzedChapters.filter((c) => c.revisionCount === 0).length;

    // Top 5 Strongest & Top 5 Urgent
    const topStrongest = [...analyzedChapters].sort((a, b) => b.masteryScore - a.masteryScore).slice(0, 5);
    const topUrgent = [...analyzedChapters]
      .filter((c) => c.status === 'OVERDUE' || c.status === 'DUE_TODAY')
      .sort((a, b) => {
        const aVal = a.status === 'OVERDUE' ? 1000 + Math.abs(a.daysDiff) : 500;
        const bVal = b.status === 'OVERDUE' ? 1000 + Math.abs(b.daysDiff) : 500;
        return bVal - aVal;
      })
      .slice(0, 5);

    // Class 11 vs 12
    const class11Items = analyzedChapters.filter((c) => c.chapter.classLevel === '11' || !c.chapter.classLevel);
    const class12Items = analyzedChapters.filter((c) => c.chapter.classLevel === '12');
    const class11Avg = class11Items.length > 0 ? Math.round(class11Items.reduce((acc, c) => acc + c.masteryScore, 0) / class11Items.length) : 0;
    const class12Avg = class12Items.length > 0 ? Math.round(class12Items.reduce((acc, c) => acc + c.masteryScore, 0) / class12Items.length) : 0;

    return {
      total,
      firstPassCount,
      firstPassPercentage,
      avgCompletion,
      sCount,
      aCount,
      bCount,
      cCount,
      dCount,
      eCount,
      fCount,
      avgScore,
      readyCount,
      readyPercentage,
      dueCount,
      overdueCount,
      rev3PlusCount,
      rev2Count,
      rev1Count,
      rev0Count,
      topStrongest,
      topUrgent,
      class11Count: class11Items.length,
      class11Avg,
      class12Count: class12Items.length,
      class12Avg,
    };
  }, [analyzedChapters]);

  // Pure Visual Ascension Horizon Data (Phase 1: Progress towards First Pass -> Phase 2: Progress towards All Pink)
  const ascensionData = useMemo(() => {
    const total = overallStats.total || 86;
    const isFirstPassComplete = total > 0 && overallStats.firstPassCount >= total;
    const isAllPink = total > 0 && overallStats.sCount >= total;
    const firstPassProgress = total > 0 ? (overallStats.firstPassCount / total) * 100 : 0;
    const pinkProgress = total > 0 ? (overallStats.sCount / total) * 100 : 0;

    const subjectsOrder: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    const clusters = subjectsOrder.map((sub) => {
      const items = analyzedChapters.filter((c) => c.chapter.subject === sub);
      const theme = SUBJECT_COLOR_THEMES[sub] || SUBJECT_COLOR_THEMES.Physics;
      return {
        subject: sub,
        theme,
        items: items.map((c) => {
          const isFirstPass =
            c.chapter.learningStage === 'FIRST_PASS_DONE' ||
            c.chapter.learningStage === 'IN_REVISION' ||
            (c.chapter.revisionCount || 0) >= 1 ||
            c.completionPercent >= 100;
          const isPink = c.rank === 'S';
          return {
            chapter: c.chapter,
            rank: c.rank,
            score: c.masteryScore,
            completionPercent: c.completionPercent,
            isFirstPass,
            isInProgress: !isFirstPass && c.completionPercent > 0,
            isPink,
            color: isPink ? '#F04FCB' : CHAPTER_RANKS[c.rank]?.color || '#64748B',
          };
        }),
      };
    });

    return {
      total,
      isFirstPassComplete,
      isAllPink,
      firstPassProgress,
      pinkProgress,
      clusters,
    };
  }, [overallStats, analyzedChapters]);

  // Subject Statistics
  const subjectStats = useMemo(() => {
    const subjects: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    return subjects.map((sub) => {
      const items = analyzedChapters.filter((c) => c.chapter.subject === sub);
      const totalScore = items.reduce((acc, c) => acc + c.masteryScore, 0);
      const avg = items.length > 0 ? Math.round(totalScore / items.length) : 0;
      const ready = items.filter((c) => c.rank === 'S' || c.rank === 'A').length;
      const overdue = items.filter((c) => c.status === 'OVERDUE').length;
      const due = items.filter((c) => c.status === 'DUE_TODAY').length;
      const completedFirstPass = items.filter((c) => c.completionPercent >= 100).length;
      const pct = items.length > 0 ? Math.round((completedFirstPass / items.length) * 100) : 0;
      const theme = SUBJECT_COLOR_THEMES[sub];

      return {
        subject: sub,
        items,
        total: items.length,
        avgScore: avg,
        readyCount: ready,
        overdueCount: overdue,
        dueCount: due,
        firstPassPercent: pct,
        color: theme.color,
        shortCode: theme.shortCode,
      };
    });
  }, [analyzedChapters]);

  // Filtered chapters: strictly in syllabus sequence and subject-wise
  const filteredChapters = useMemo(() => {
    const list = analyzedChapters.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !c.chapter.name.toLowerCase().includes(q) &&
          !c.chapter.subject.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (selectedRank !== 'ALL' && c.rank !== selectedRank) return false;
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'DUE_TODAY' && c.status !== 'DUE_TODAY') return false;
        if (selectedStatus === 'OVERDUE' && c.status !== 'OVERDUE') return false;
        if (selectedStatus === 'UP_TO_DATE' && c.status !== 'UP_TO_DATE') return false;
        if (selectedStatus === 'NOT_STARTED' && c.status !== 'NOT_STARTED') return false;
      }
      return true;
    });

    // ALWAYS strictly in NCERT syllabus sequence
    list.sort((a, b) => a.chapterNumber - b.chapterNumber);

    return list;
  }, [analyzedChapters, searchQuery, selectedRank, selectedStatus]);

  // Grouped by Subject in fixed Syllabus Order (Physics -> Chemistry -> Botany -> Zoology)
  const subjectGroups = useMemo(() => {
    const subjects: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];
    return subjects.map((sub) => {
      const items = filteredChapters
        .filter((c) => c.chapter.subject === sub)
        .sort((a, b) => a.chapterNumber - b.chapterNumber);
      const totalScore = items.reduce((acc, c) => acc + c.masteryScore, 0);
      const avg = items.length > 0 ? Math.round(totalScore / items.length) : 0;
      const theme = SUBJECT_COLOR_THEMES[sub];

      // Domain Harmony & Scenario Checks
      const allSubjectChapters = analyzedChapters.filter((c) => c.chapter.subject === sub);
      const totalSubjectChapters = allSubjectChapters.length;
      const allRanksSame =
        totalSubjectChapters > 0 &&
        allSubjectChapters.every((c) => c.rank === allSubjectChapters[0].rank);
      const harmonicRank = allRanksSame ? allSubjectChapters[0].rank : null;
      const sRankCount = allSubjectChapters.filter((c) => c.rank === 'S').length;
      const aRankCount = allSubjectChapters.filter((c) => c.rank === 'A').length;
      const bRankCount = allSubjectChapters.filter((c) => c.rank === 'B').length;
      const overdueCount = allSubjectChapters.filter((c) => c.status === 'OVERDUE').length;
      const dueCount = allSubjectChapters.filter((c) => c.status === 'DUE_TODAY').length;
      const allFirstPass = totalSubjectChapters > 0 && allSubjectChapters.every((c) => c.completionPercent >= 100);

      const isAllS = totalSubjectChapters > 0 && sRankCount === totalSubjectChapters;
      const isAllSA = totalSubjectChapters > 0 && (sRankCount + aRankCount) === totalSubjectChapters;
      const isMajorityS = sRankCount > totalSubjectChapters / 2;
      const isMajorityA = aRankCount > totalSubjectChapters / 2;
      const isMajorityB = bRankCount > totalSubjectChapters / 2;

      return {
        subject: sub,
        items,
        totalSubjectChapters,
        avgScore: avg,
        color: theme.color,
        shortCode: theme.shortCode,
        isHarmonized: allRanksSame,
        harmonicRank,
        sRankCount,
        aRankCount,
        bRankCount,
        overdueCount,
        dueCount,
        allFirstPass,
        isAllS,
        isAllSA,
        isMajorityS,
        isMajorityA,
        isMajorityB,
      };
    });
  }, [filteredChapters, analyzedChapters]);

  // Tab 00 Global Progression Tier Engine (Dynamically transforms UI as grades advance)
  const globalProgressionTier = useMemo(() => {
    const total = overallStats.total;
    if (total === 0) {
      return {
        type: 'INITIAL',
        title: 'Curriculum Initialized',
        description: 'Matrix standing by for study sessions.',
        color: '#34323B',
        accent: '#377ED0',
        badge: '■ STANDBY',
        haloClass: 'border-[#141416]',
        borderStyle: 'border-[#141416]',
        icon: Target,
      };
    }

    const sCount = overallStats.sCount;
    const aCount = overallStats.aCount;
    const bCount = overallStats.bCount;
    const cCount = overallStats.cCount;
    const dCount = overallStats.dCount;

    // SCENARIO 1: ALL CHAPTERS ARE S GRADE (The Ultimate Transcendent Monarch)
    if (sCount === total) {
      return {
        type: 'ALL_S',
        title: 'TRANSCENDENT APEX · 100% ALL 97 CHAPTERS S-RANK ASCENDED',
        description: 'Supreme curriculum mastery unlocked! Every chapter in Physics, Chemistry, Botany & Zoology has attained Peak S-Rank readiness.',
        color: '#F04FCB',
        accent: '#E2BC39',
        badge: '👑 APEX TRANSCENDENT',
        haloClass: 'animate-apex-aura ring-4 ring-[#F04FCB]',
        borderStyle: 'border-[#F04FCB]',
        icon: Crown,
      };
    }

    // SCENARIO 2: ALL CHAPTERS ARE S OR A GRADE (High-Tier Olympian Citadel)
    if (sCount + aCount === total) {
      return {
        type: 'ALL_S_OR_A',
        title: 'SOVEREIGN OLYMPIAN CITADEL · 100% S & A TIER FORTIFIED',
        description: `${sCount} S-Rank Apex and ${aCount} A-Rank Superior Orbit chapters. Zero chapters below Grade A across the entire syllabus.`,
        color: '#493EA4',
        accent: '#F04FCB',
        badge: '⭐ SOVEREIGN CITADEL',
        haloClass: 'animate-indigo-astral ring-3 ring-[#493EA4]',
        borderStyle: 'border-[#493EA4]',
        icon: Sparkles,
      };
    }

    // SCENARIO 3: MAJORITY (>50%) IS S GRADE
    if (sCount > total / 2) {
      return {
        type: 'MAJORITY_S',
        title: `MAJORITY APEX REGIME · ${sCount}/${total} CHAPTERS IN S-RANK`,
        description: 'Over 50% of the entire syllabus is locked in Grade S Peak Mastered. Superior competitive pacing.',
        color: '#F04FCB',
        accent: '#F04FCB',
        badge: '👑 APEX MAJORITY',
        haloClass: 'ring-2 ring-[#F04FCB] shadow-[0_0_25px_rgba(240,79,203,0.35)]',
        borderStyle: 'border-[#F04FCB]',
        icon: Crown,
      };
    }

    // SCENARIO 4: MAJORITY (>50%) IS A GRADE
    if (aCount > total / 2) {
      return {
        type: 'MAJORITY_A',
        title: `SUPERIOR ORBIT EMPIRE · ${aCount}/${total} CHAPTERS IN A-RANK`,
        description: 'Over 50% of the syllabus in Grade A. Solid retention and consistent revision cadences established.',
        color: '#493EA4',
        accent: '#493EA4',
        badge: '✦ SUPERIOR MAJORITY',
        haloClass: 'ring-2 ring-[#493EA4] shadow-[0_0_20px_rgba(73,62,164,0.3)]',
        borderStyle: 'border-[#493EA4]',
        icon: Sparkles,
      };
    }

    // SCENARIO 5: MAJORITY (>50%) IS B GRADE
    if (bCount > total / 2) {
      return {
        type: 'MAJORITY_B',
        title: `SOLID CORE FOUNDATION · ${bCount}/${total} CHAPTERS IN B-RANK`,
        description: 'Strong fundamental base. Take mock tests and drill high-yield question banks to push chapters into Grade A & S.',
        color: '#E2BC39',
        accent: '#E2BC39',
        badge: '⬢ SOLID CORE',
        haloClass: 'ring-2 ring-[#E2BC39]/60 shadow-[0_0_16px_rgba(226,188,57,0.25)]',
        borderStyle: 'border-[#E2BC39]',
        icon: ShieldCheck,
      };
    }

    // SCENARIO 6: MAJORITY IS C OR D (First pass in progress)
    if (cCount + dCount > total / 2) {
      return {
        type: 'MAJORITY_C_D',
        title: 'ACTIVE SYLLABUS EXPEDITION · FIRST PASS READINGS IN PROGRESS',
        description: 'Active textbook readings and lecture coverage underway. Finish theory pass to initiate spaced repetition.',
        color: '#E47E35',
        accent: '#C84481',
        badge: '▲ ACTIVE DRILL',
        haloClass: 'border-[#E47E35]',
        borderStyle: 'border-[#E47E35]',
        icon: Flame,
      };
    }

    // SCENARIO 7: INITIAL / STARTING
    return {
      type: 'STARTING',
      title: 'INITIAL SYLLABUS DEPLOY · MONOLITH CHASSIS',
      description: 'Log study rounds to advance chapters up the gamification ladder: F → E → D → C → B → A → S.',
      color: '#34323B',
      accent: '#377ED0',
      badge: '■ INITIAL DEPLOY',
      haloClass: 'border-[#141416]',
      borderStyle: 'border-[#141416]',
      icon: Target,
    };
  }, [overallStats]);

  // Poster Export Handlers
  const handleDownloadPoster = (includeTitles: boolean) => {
    sound.playKeyClick();
    const dataUrl = exportPanoramicCanvas(
      analyzedChapters,
      todayStr,
      includeTitles,
      overallStats.sCount,
      overallStats.total,
      panoramicTheme
    );
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.download = `neet_2027_panoramic_matrix_${todayStr}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPoster = (includeTitles: boolean) => {
    sound.playKeyClick();
    const dataUrl = exportPanoramicCanvas(
      analyzedChapters,
      todayStr,
      includeTitles,
      overallStats.sCount,
      overallStats.total,
      panoramicTheme
    );
    if (!dataUrl) return;

    const iframe = document.createElement('iframe');
    iframe.id = 'panoramic-poster-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NEET UG 2027 16:9 Panoramic Matrix Poster</title>
          <style>
            @page {
              size: landscape;
              margin: 6mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #0b0f19;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="16:9 Panoramic Matrix Poster" />
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Poster iframe print failed', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 350);
  };

  // Resolved Inspected Chapter
  const inspectedChapter = useMemo(() => {
    if (!inspectedChapterId) return null;
    return analyzedChapters.find((c) => c.chapter.id === inspectedChapterId) || null;
  }, [inspectedChapterId, analyzedChapters]);

  // Inspected Chapter Index in current filtered list for previous/next navigation
  const inspectedIndex = useMemo(() => {
    if (!inspectedChapter) return -1;
    return filteredChapters.findIndex((c) => c.chapter.id === inspectedChapter.chapter.id);
  }, [inspectedChapter, filteredChapters]);

  // 1. Upcoming Scheduled Tests (date >= todayStr)
  const upcomingTestsForInspected = useMemo(() => {
    if (!inspectedChapter) return [];
    return tests
      .filter((t) => t.linkedChapterIds?.includes(inspectedChapter.chapter.id) && t.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [inspectedChapter, tests, todayStr]);

  // 2. Past Tests Completed (date < todayStr) with linked test scores
  const pastTestsForInspected = useMemo(() => {
    if (!inspectedChapter) return [];
    return tests
      .filter((t) => t.linkedChapterIds?.includes(inspectedChapter.chapter.id) && t.date < todayStr)
      .map((t) => {
        const scoreObj = (testScores || []).find((s) => s.testId === t.id);
        return {
          test: t,
          score: scoreObj,
        };
      })
      .sort((a, b) => b.test.date.localeCompare(a.test.date));
  }, [inspectedChapter, tests, testScores, todayStr]);

  // 3. Study Session History Logs for Inspected Chapter
  const studyLogsForInspected = useMemo(() => {
    if (!inspectedChapter) return [];
    return studyLogs
      .filter((l) => l.chapterId === inspectedChapter.chapter.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [inspectedChapter, studyLogs]);

  // Handle navigate previous / next in inspection drawer
  const handleInspectPrev = useCallback(() => {
    if (inspectedIndex <= 0) return;
    sound.playKeyClick();
    setInspectedChapterId(filteredChapters[inspectedIndex - 1].chapter.id);
  }, [inspectedIndex, filteredChapters]);

  const handleInspectNext = useCallback(() => {
    if (inspectedIndex === -1 || inspectedIndex >= filteredChapters.length - 1) return;
    sound.playKeyClick();
    setInspectedChapterId(filteredChapters[inspectedIndex + 1].chapter.id);
  }, [inspectedIndex, filteredChapters]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setIsCodexModalOpen(false);
        setInspectedChapterId(null);
        return;
      }
      if (e.key === 'm' || e.key === 'M' || e.key === 'f' || e.key === 'F' || e.key === 'g' || e.key === 'G') {
        setIsCodexModalOpen((prev) => !prev);
        return;
      }

      if (inspectedChapterId) {
        if (e.key === 'ArrowLeft' || e.key === 'h') {
          e.preventDefault();
          handleInspectPrev();
        } else if (e.key === 'ArrowRight' || e.key === 'l') {
          e.preventDefault();
          handleInspectNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedChapterId, handleInspectPrev, handleInspectNext]);

  return (
    <div
      id="tab-00-mastery-matrix"
      className="w-full space-y-5 text-[#141416] selection:bg-[#FF3B00] selection:text-white"
    >
      {/* ========================================================================= */}
      {/* 1. TOP HARDWARE CONTROL PANEL & TELEMETRY DECK */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 1. TOP HARDWARE CONTROL PANEL & TELEMETRY DECK (COLLAPSIBLE, MINIMAL TOGGLE) */}
      {/* ========================================================================= */}
      <div
        className={`te-chassis-card relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
          isReadinessCollapsed ? 'p-3 space-y-2.5' : 'p-4 sm:p-5 space-y-4'
        } ${
          globalProgressionTier.type === 'ALL_S'
            ? 'bg-gradient-to-br from-[#FFF5FC] via-[#FAF9F6] to-[#FFFBEB] border-[#F04FCB] ring-4 ring-[#F04FCB]/40 shadow-[0_0_35px_rgba(240,79,203,0.4),4px_4px_0px_#141416]'
            : globalProgressionTier.type === 'ALL_S_OR_A'
            ? 'bg-gradient-to-br from-[#F5F3FF] via-[#FAF9F6] to-[#EEF2FF] border-[#493EA4] ring-2 ring-[#493EA4]/40 shadow-[0_0_24px_rgba(73,62,164,0.3),4px_4px_0px_#141416]'
            : globalProgressionTier.type === 'MAJORITY_S'
            ? 'bg-[#FAF9F6] border-[#F04FCB] ring-2 ring-[#F04FCB]/30 shadow-[0_0_20px_rgba(240,79,203,0.25),4px_4px_0px_#141416]'
            : globalProgressionTier.type === 'MAJORITY_A'
            ? 'bg-[#FAF9F6] border-[#493EA4] ring-2 ring-[#493EA4]/25 shadow-[0_0_16px_rgba(73,62,164,0.2),4px_4px_0px_#141416]'
            : globalProgressionTier.type === 'MAJORITY_B'
            ? 'bg-[#FAF9F6] border-[#E2BC39] shadow-[0_0_14px_rgba(226,188,57,0.25),4px_4px_0px_#141416]'
            : 'bg-[#FAF9F6] border-[#141416] shadow-[4px_4px_0px_#141416]'
        }`}
      >
        {/* Subtle Machined Screws */}
        <div className="absolute top-2 left-2"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2"><span className="te-screw" /></div>

        {/* Collapsed vs Expanded Header Display */}
        {isReadinessCollapsed ? (
          /* When Collapsed: Minimal Header Strip with NO text on toggle button */
          <div className="flex items-center justify-between gap-3 pb-1 border-b border-[#E4E2DC]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#141416] text-white px-2 py-0.5 rounded-[3px] text-[10px] font-black tracking-widest font-mono">
                TAB 00
              </span>
              <span className="text-xs font-black text-[#141416] uppercase tracking-wide">
                Mastery Matrix
              </span>
              <span className="text-[10px] text-[#5C5A52] font-mono font-bold hidden sm:inline">
                · {overallStats.readyPercentage}% Exam Ready ({overallStats.readyCount} S+A Chapters)
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  sound.playKeyClick();
                  setIsCodexModalOpen(true);
                }}
                className="te-btn-mechanical p-1.5 text-xs font-bold cursor-pointer bg-[#ECEAE4] flex items-center justify-center border-2 border-[#141416] text-[#141416] shadow-[2px_2px_0px_#141416] rounded-[4px] hover:bg-white transition-all"
                title="System Guide, Mastery Formula & Color Legend"
                aria-label="System Guide, Mastery Formula & Color Legend"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#FF3B00]" />
              </button>

              {/* Minimal Toggle Button (strictly NO text written!) */}
              <button
                onClick={toggleReadinessCollapsed}
                className="te-btn-mechanical p-1.5 text-xs font-bold cursor-pointer bg-[#ECEAE4] flex items-center justify-center border-2 border-[#141416] text-[#141416] shadow-[2px_2px_0px_#141416] rounded-[4px] hover:bg-white transition-all"
                title="Expand readiness header"
                aria-label="Expand readiness header"
              >
                <ChevronDown className="w-4 h-4 text-[#141416]" />
              </button>
            </div>
          </div>
        ) : (
          /* When Uncollapsed: Full Chapter Readiness Title & Description */
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5C5A52] flex-wrap">
                <span className="bg-[#141416] text-white px-2 py-0.5 rounded-[3px] text-[10px] font-black tracking-widest font-mono">
                  TAB 00
                </span>
                <span className="text-[#FF3B00] font-black uppercase tracking-wider">Mastery Matrix</span>
                <span aria-hidden="true">·</span>
                <span>All {overallStats.total} Syllabus Chapters</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#141416] font-black">{overallStats.readyPercentage}% Exam Ready</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#141416] flex items-center gap-2">
                <span>Chapter Readiness & Color-Coded Heatmap</span>
              </h1>

              <p className="text-xs text-[#5C5A52] max-w-2xl leading-relaxed">
                Every chapter is evaluated from 0 to 1,000 points and classified into 7 universal mastery ranks. Click any chapter keycap to inspect its breakdown instantly in-view.
              </p>
            </div>

            {/* Quick Actions & Minimal Toggle Button (strictly NO text written!) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  sound.playKeyClick();
                  setIsCodexModalOpen(true);
                }}
                className="te-btn-mechanical px-3 py-1.5 text-xs font-bold cursor-pointer bg-[#ECEAE4] flex items-center gap-1.5 border-2 border-[#141416] text-[#141416] shadow-[2px_2px_0px_#141416] rounded-[4px] hover:bg-white transition-all"
                title="System Guide, Mastery Formula & Color Legend"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#FF3B00]" />
                <span>Guide & Codex</span>
              </button>

              {/* Minimal Collapse Button (NO text written!) */}
              <button
                onClick={toggleReadinessCollapsed}
                className="te-btn-mechanical p-1.5 text-xs font-bold cursor-pointer bg-[#ECEAE4] flex items-center justify-center border-2 border-[#141416] text-[#141416] shadow-[2px_2px_0px_#141416] rounded-[4px] hover:bg-white transition-all"
                title="Collapse readiness header"
                aria-label="Collapse readiness header"
              >
                <ChevronUp className="w-4 h-4 text-[#141416]" />
              </button>
            </div>
          </div>
        )}

        {/* 2. STRATEGIC TELEMETRY SUMMARY STRIP (ALWAYS SHOWN: Exam Readiness, First Pass Done, Apex Mastered, Mastery Depth) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Tile 1: Syllabus Mastery Ratio (Deep Indigo accent #493EA4) */}
          <div className="p-2.5 rounded-lg border-2 border-[#141416] bg-white shadow-[2px_2px_0px_#141416] space-y-0.5 border-l-4 border-l-[#493EA4]">
            <span className="text-[10px] font-bold text-[#5C5A52] uppercase block">Syllabus Mastery</span>
            <div className="text-xl font-black font-mono text-[#493EA4]">
              {overallStats.readyPercentage}% <span className="text-xs font-bold text-[#5C5A52]">Ready</span>
            </div>
            <div className="text-[9px] text-[#5C5A52] font-mono">{overallStats.readyCount} S+A Chapters</div>
          </div>

          {/* Tile 2: Syllabus Coverage Pass (Burnt Orange accent #E47E35) */}
          <div className="p-2.5 rounded-lg border-2 border-[#141416] bg-white shadow-[2px_2px_0px_#141416] space-y-0.5 border-l-4 border-l-[#E47E35]">
            <span className="text-[10px] font-bold text-[#5C5A52] uppercase block">First Pass Done</span>
            <div className="text-xl font-black font-mono text-[#E47E35]">
              {overallStats.firstPassPercentage}%
            </div>
            <div className="text-[9px] text-[#5C5A52] font-mono">
              {overallStats.firstPassCount} / {overallStats.total} Chapters · {overallStats.avgCompletion}% Avg
            </div>
          </div>

          {/* Tile 3: S-Rank Apex Mastered (Hot Pink accent #F04FCB) */}
          <div className="p-2.5 rounded-lg border-2 border-[#141416] bg-white shadow-[2px_2px_0px_#141416] space-y-0.5 border-l-4 border-l-[#F04FCB]">
            <span className="text-[10px] font-bold text-[#5C5A52] uppercase block">Apex Mastered</span>
            <div className="text-xl font-black font-mono text-[#F04FCB]">
              {overallStats.sCount} <span className="text-xs font-bold text-[#5C5A52]">Chapters</span>
            </div>
            <div className="text-[9px] text-[#5C5A52] font-mono">
              {overallStats.total > 0 ? Math.round((overallStats.sCount / overallStats.total) * 100) : 0}% Target S-Rank
            </div>
          </div>

          {/* Tile 4: Average Mastery Depth (Electric Blue accent #377ED0) */}
          <div className="p-2.5 rounded-lg border-2 border-[#141416] bg-white shadow-[2px_2px_0px_#141416] space-y-0.5 border-l-4 border-l-[#377ED0]">
            <span className="text-[10px] font-bold text-[#5C5A52] uppercase block">Mastery Depth</span>
            <div className="text-xl font-black font-mono text-[#377ED0]">
              {overallStats.avgScore} <span className="text-xs font-normal text-[#5C5A52]">/ 1000</span>
            </div>
            <div className="text-[9px] text-[#5C5A52] font-mono">Syllabus Mean Score</div>
          </div>
        </div>

        {/* PURE VISUAL CYBERNETIC SPECTRUM PROGRESSION (ZERO TEXT - INTERACTIVE TACTILE PRISM REACTOR) */}
        <div className="pt-2 w-full">
          <div
            className={`relative w-full bg-gradient-to-b from-[#14151F] via-[#0B0C12] to-[#07080D] p-1.5 sm:p-2 rounded-xl border-2 border-[#141416] shadow-[3px_3px_0px_#141416] flex flex-col gap-1.5 select-none transition-all duration-500 ${
              ascensionData.isAllPink
                ? 'ring-2 ring-[#F04FCB]/70 shadow-[0_0_24px_rgba(240,79,203,0.45),3px_3px_0px_#141416]'
                : ascensionData.isFirstPassComplete
                ? 'ring-1 ring-[#493EA4]/60 shadow-[0_0_18px_rgba(73,62,164,0.3),3px_3px_0px_#141416]'
                : ''
            }`}
          >
            {/* Ambient Top Chassis Specular Trim */}
            <div className="absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

            {/* 4-Subject Segmented Optical Prism Array (86 Clickable Chapter Cells) */}
            <div className="relative h-8 sm:h-9 w-full rounded-lg bg-[#05060A] ring-1 ring-white/10 p-1 flex items-stretch gap-1.5 shadow-inner">
              {ascensionData.clusters.map((cluster) => {
                const clusterLitCount = cluster.items.filter((i) =>
                  ascensionData.isFirstPassComplete ? i.isPink : i.isFirstPass
                ).length;
                const clusterPct =
                  cluster.items.length > 0 ? (clusterLitCount / cluster.items.length) * 100 : 0;

                return (
                  <div
                    key={cluster.subject}
                    className="flex-1 h-full flex flex-col gap-[3px] bg-[#0B0D14]/90 rounded-[5px] p-[3px] ring-1 ring-white/[0.07] relative overflow-hidden"
                  >
                    {/* Top Subject Signature Micro-Filament */}
                    <div className="w-full h-[2px] rounded-full bg-[#161924] overflow-hidden shrink-0">
                      <div
                        style={{
                          width: `${Math.max(6, clusterPct)}%`,
                          backgroundColor: ascensionData.isFirstPassComplete
                            ? '#F04FCB'
                            : cluster.theme.color,
                          boxShadow: `0 0 6px ${
                            ascensionData.isFirstPassComplete ? '#F04FCB' : cluster.theme.color
                          }`,
                        }}
                        className="h-full transition-all duration-500 rounded-full"
                      />
                    </div>

                    {/* Chapter Prism Capsules within Subject Bay */}
                    <div className="flex-1 w-full flex items-stretch gap-[2px]">
                      {cluster.items.map((item) => {
                        const isLit = !ascensionData.isFirstPassComplete ? item.isFirstPass : true;
                        const isPinkDrive = ascensionData.isFirstPassComplete && item.isPink;
                        const isPartial = !ascensionData.isFirstPassComplete && item.isInProgress;
                        const isSelected =
                          inspectedChapterId === item.chapter.id ||
                          (searchQuery.trim() !== '' &&
                            searchQuery.toLowerCase() === item.chapter.name.toLowerCase());

                        const activeColor = isPinkDrive ? '#F04FCB' : item.color;

                        return (
                          <button
                            key={item.chapter.id}
                            type="button"
                            onClick={() => {
                              sound.playKeyClick();
                              setInspectedChapterId((prev) =>
                                prev === item.chapter.id ? null : item.chapter.id
                              );
                            }}
                            title={`${item.chapter.name} · ${item.rank}-Rank (${item.score} pts)`}
                            aria-label={`${item.chapter.name} ${item.rank} Rank`}
                            style={{
                              backgroundColor: isLit ? activeColor : '#121521',
                              boxShadow: isLit
                                ? isPinkDrive
                                  ? '0 0 10px rgba(240,79,203,0.85), inset 0 1px 1px rgba(255,255,255,0.65)'
                                  : `0 0 6px ${activeColor}66, inset 0 1px 1px rgba(255,255,255,0.45)`
                                : 'inset 0 1px 2px rgba(0,0,0,0.85)',
                            }}
                            className={`group/cell flex-1 h-full rounded-[2px] relative cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:scale-y-115 hover:z-30 focus:outline-none ${
                              isSelected
                                ? 'ring-2 ring-white z-20 scale-y-110'
                                : isLit
                                ? 'ring-1 ring-black/40 hover:ring-white/90'
                                : 'ring-1 ring-white/[0.06] hover:ring-white/50'
                            }`}
                          >
                            {/* Partial In-Progress Liquid Fill (when < 100% in Phase 1) */}
                            {!isLit && isPartial && (
                              <div
                                style={{
                                  height: `${Math.max(18, Math.min(92, item.completionPercent))}%`,
                                  backgroundColor: item.color,
                                  boxShadow: `0 0 6px ${item.color}`,
                                }}
                                className="absolute inset-x-0 bottom-0 rounded-b-[1.5px] opacity-85 transition-all duration-300 pointer-events-none"
                              />
                            )}

                            {/* Unstarted Seed Ember at bottom of unlit slot */}
                            {!isLit && !isPartial && (
                              <div
                                style={{ backgroundColor: item.color }}
                                className="absolute inset-x-[1px] bottom-[1px] h-[2px] rounded-full opacity-35 group-hover/cell:opacity-100 group-hover/cell:h-full transition-all duration-150 pointer-events-none"
                              />
                            )}

                            {/* Top Convex Crystal Specular Highlight */}
                            <div
                              className={`absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b pointer-events-none rounded-t-[2px] ${
                                isLit
                                  ? 'from-white/50 via-white/15 to-transparent'
                                  : 'from-white/10 to-transparent'
                              }`}
                            />

                            {/* Bottom Machined Bevel Shade */}
                            <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/45 to-transparent pointer-events-none rounded-b-[2px]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dual-Phase Harmonic Spectrum Conduit & 7-Color Rank Nodes (Zero Text) */}
            <div className="relative w-full h-1.5 bg-[#090A10] rounded-full p-[1px] ring-1 ring-white/10 flex items-center overflow-hidden">
              {/* Background 7-Rank Subtle Guide Track */}
              <div
                className="
                  absolute inset-0 opacity-20 pointer-events-none
                  bg-[linear-gradient(90deg,#64748B_0%,#D9383A_16%,#E47E35_33%,#E2BC39_50%,#377ED0_67%,#493EA4_84%,#F04FCB_100%)]
                "
              />

              {/* Active Energized Plasma Fill */}
              <div
                style={{
                  width: `${
                    ascensionData.isFirstPassComplete
                      ? Math.max(2, ascensionData.pinkProgress)
                      : Math.max(2, ascensionData.firstPassProgress)
                  }%`,
                }}
                className={`relative h-full rounded-full transition-all duration-700 ease-out ${
                  ascensionData.isFirstPassComplete
                    ? 'bg-[linear-gradient(90deg,#493EA4_0%,#C026D3_50%,#F04FCB_85%,#FF7CE5_100%)] shadow-[0_0_10px_#F04FCB]'
                    : 'bg-[linear-gradient(90deg,#D9383A_0%,#E47E35_22%,#E2BC39_45%,#377ED0_70%,#493EA4_88%,#F04FCB_100%)] shadow-[0_0_8px_rgba(55,126,208,0.8)]'
                }`}
              >
                {/* Leading Edge Laser Spark */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#FFFFFF] pointer-events-none" />
              </div>

              {/* 4 Precision Diamond Checkpoints (25%, 50%, 75%, 100%) */}
              {[25, 50, 75, 100].map((pct) => {
                const currentProgress = ascensionData.isFirstPassComplete
                  ? ascensionData.pinkProgress
                  : ascensionData.firstPassProgress;
                const isReached = currentProgress >= pct;
                return (
                  <div
                    key={pct}
                    style={{ left: pct === 100 ? 'calc(100% - 5px)' : `${pct}%` }}
                    className={`absolute w-1.5 h-1.5 rotate-45 pointer-events-none transition-all duration-300 -translate-x-1/2 border ${
                      isReached
                        ? ascensionData.isFirstPassComplete
                          ? 'bg-white border-[#F04FCB] shadow-[0_0_6px_#F04FCB]'
                          : 'bg-white border-[#377ED0] shadow-[0_0_6px_#377ED0]'
                        : 'bg-[#141724] border-white/20'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. MINIMAL FILTER STRIP & VIEW SWITCHER (STANDARD VS 16:9 PANORAMIC) */}
        <div className="pt-2 border-t border-[#E4E2DC] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5A52]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chapters in syllabus (e.g. Thermodynamics, Optics, Genetics)..."
              className="w-full bg-white border-2 border-[#141416] rounded-[4px] pl-8 pr-7 py-1.5 text-xs text-[#141416] placeholder:text-[#8C8A82] focus:outline-none focus:border-[#FF3B00]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5C5A52] hover:text-[#141416]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Standard vs 16:9 Panoramic */}
          <div className="flex items-center gap-1 p-0.5 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-xs shrink-0">
            <button
              onClick={() => handleSetMatrixViewMode('standard')}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-[3px] transition-all cursor-pointer flex items-center gap-1.5 ${
                matrixViewMode === 'standard'
                  ? 'bg-[#141416] text-white shadow-xs'
                  : 'text-[#5C5A52] hover:text-[#141416]'
              }`}
              title="Standard Syllabus View"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Standard</span>
            </button>

            <button
              onClick={() => handleSetMatrixViewMode('panoramic169')}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-[3px] transition-all cursor-pointer flex items-center gap-1.5 ${
                matrixViewMode === 'panoramic169'
                  ? 'bg-[#F04FCB] text-white shadow-xs font-black'
                  : 'text-[#5C5A52] hover:text-[#141416]'
              }`}
              title="16:9 Panoramic Widescreen View (All 4 subjects side-by-side, vibrant color, minimal clutter)"
            >
              <Tv className="w-3 h-3" />
              <span>16:9 Panoramic</span>
            </button>
          </div>

          {/* Minimal Quick Rank & Urgency Filter Chips */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-[#8C8A82] uppercase mr-1 hidden sm:inline">Filter:</span>
            <button
              onClick={() => { sound.playKeyClick(); setSelectedRank('ALL'); setSelectedStatus('ALL'); }}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-[3px] border border-[#141416] transition-all cursor-pointer ${
                selectedRank === 'ALL' && selectedStatus === 'ALL'
                  ? 'bg-[#141416] text-white'
                  : 'bg-white text-[#141416] hover:bg-[#ECEAE4]'
              }`}
            >
              All ({overallStats.total})
            </button>
            {(['S', 'A', 'B', 'C', 'D', 'E', 'F'] as ChapterRank[]).map((r) => {
              const prof = CHAPTER_RANKS[r];
              const isSel = selectedRank === r;
              return (
                <button
                  key={r}
                  onClick={() => {
                    sound.playKeyClick();
                    setSelectedRank(isSel ? 'ALL' : r);
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-mono font-black rounded-[3px] border border-[#141416] cursor-pointer transition-all ${
                    isSel ? 'ring-2 ring-[#FF3B00] shadow-xs text-white' : 'text-white hover:opacity-90'
                  }`}
                  style={{ backgroundColor: prof.color }}
                  title={`Grade ${r}`}
                >
                  {r}
                </button>
              );
            })}
            <span className="w-[1px] h-3.5 bg-[#D8D5CA] mx-0.5" />
            {(['OVERDUE', 'DUE_TODAY'] as const).map((st) => {
              const isSel = selectedStatus === st;
              const isOverdue = st === 'OVERDUE';
              const count = isOverdue ? overallStats.overdueCount : overallStats.dueCount;
              return (
                <button
                  key={st}
                  onClick={() => {
                    sound.playKeyClick();
                    setSelectedStatus(isSel ? 'ALL' : st);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-[3px] border cursor-pointer transition-all flex items-center gap-1 ${
                    isSel
                      ? isOverdue
                        ? 'bg-[#DC2626] text-white border-[#DC2626]'
                        : 'bg-[#D97706] text-white border-[#D97706]'
                      : isOverdue
                      ? 'bg-red-50 text-[#DC2626] border-red-300 hover:bg-red-100'
                      : 'bg-amber-50 text-[#D97706] border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <span>{isOverdue ? 'Overdue' : 'Due Today'}</span>
                  <span className="text-[9px] opacity-80">({count})</span>
                </button>
              );
            })}
            {(selectedRank !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                onClick={() => {
                  sound.playKeyClick();
                  setSelectedRank('ALL');
                  setSelectedStatus('ALL');
                }}
                className="text-[10px] text-[#DC2626] font-mono font-bold hover:underline cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE GRAND MATRIX: EITHER 16:9 PANORAMIC OR STANDARD SUBJECT-WISE */}
      {/* ========================================================================= */}
      {matrixViewMode === 'panoramic169' ? (() => {
        const subjectsData = [
          {
            subject: 'Physics' as Subject,
            name: 'PHYSICS',
            shortCode: 'PHY',
            color: '#0052FF',
            accentColor: '#60A5FA',
            panelGradient: 'linear-gradient(180deg, rgba(16,36,78,0.85) 0%, rgba(10,24,54,0.92) 50%, rgba(6,14,32,0.96) 100%)',
            panelBorder: 'border-2 border-[#0052FF]/70 shadow-[0_0_24px_rgba(0,82,255,0.25)]',
            badgeStyle: 'bg-[#0052FF] text-white',
            items: filteredChapters.filter((c) => c.chapter.subject === 'Physics'),
          },
          {
            subject: 'Chemistry' as Subject,
            name: 'CHEMISTRY',
            shortCode: 'CHE',
            color: '#FF4F00',
            accentColor: '#FB923C',
            panelGradient: 'linear-gradient(180deg, rgba(58,24,10,0.85) 0%, rgba(42,16,6,0.92) 50%, rgba(26,9,3,0.96) 100%)',
            panelBorder: 'border-2 border-[#FF4F00]/70 shadow-[0_0_24px_rgba(255,79,0,0.25)]',
            badgeStyle: 'bg-[#FF4F00] text-white',
            items: filteredChapters.filter((c) => c.chapter.subject === 'Chemistry'),
          },
          {
            subject: 'Botany' as Subject,
            name: 'BOTANY',
            shortCode: 'BOT',
            color: '#EAB308',
            accentColor: '#FEF08A',
            panelGradient: 'linear-gradient(180deg, rgba(52,38,8,0.85) 0%, rgba(38,27,5,0.92) 50%, rgba(22,15,2,0.96) 100%)',
            panelBorder: 'border-2 border-[#EAB308]/70 shadow-[0_0_24px_rgba(234,179,8,0.25)]',
            badgeStyle: 'bg-[#EAB308] text-[#141416]',
            items: filteredChapters.filter((c) => c.chapter.subject === 'Botany'),
          },
          {
            subject: 'Zoology' as Subject,
            name: 'ZOOLOGY',
            shortCode: 'ZOO',
            color: '#E11D48',
            accentColor: '#FDA4AF',
            panelGradient: 'linear-gradient(180deg, rgba(56,14,24,0.85) 0%, rgba(40,8,16,0.92) 50%, rgba(24,4,10,0.96) 100%)',
            panelBorder: 'border-2 border-[#E11D48]/70 shadow-[0_0_24px_rgba(225,29,72,0.25)]',
            badgeStyle: 'bg-[#E11D48] text-white',
            items: filteredChapters.filter((c) => c.chapter.subject === 'Zoology'),
          },
        ];

        // Background Gradient based on Cyber theme (Rich, vibrant, not black, not white)
        const themeBg = 'linear-gradient(135deg, #2a0845 0%, #4b1248 30%, #641c39 60%, #1a1a40 100%)';

        const panoramicCard = (
          <div
            ref={panoramicContainerRef}
            className={
              isFullscreen169
                ? 'fixed inset-0 top-0 left-0 right-0 bottom-0 z-[99999999] w-screen h-screen min-h-screen overflow-y-auto p-3 sm:p-5 flex flex-col font-mono text-white select-none'
                : 'relative overflow-hidden te-chassis-card border-2 border-[#581c87]/60 p-3.5 sm:p-5 rounded-2xl space-y-3 font-mono text-white shadow-[0_12px_40px_rgba(24,17,53,0.5)]'
            }
            style={{ background: themeBg }}
          >
            {/* Luminous Atmospheric Color Orbs Linking Canvas Directly to Subject Themes & S-Rank Pink */}
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#0052FF]/25 blur-3xl pointer-events-none z-0" />
            <div className="absolute -top-24 left-1/3 w-96 h-96 rounded-full bg-[#FF4F00]/22 blur-3xl pointer-events-none z-0" />
            <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-[#EAB308]/22 blur-3xl pointer-events-none z-0" />
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#E11D48]/25 blur-3xl pointer-events-none z-0" />
            <div className="absolute -bottom-28 left-1/3 w-[450px] h-[450px] rounded-full bg-[#F04FCB]/25 blur-3xl pointer-events-none z-0" />

            {/* Panoramic Radar Header Bar: Decluttered, Pure Command Deck */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/15">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#F04FCB] text-white px-2 py-0.5 rounded-[3px] text-[10px] font-black tracking-widest uppercase shadow-[0_0_14px_rgba(240,79,203,0.7)] flex items-center gap-1">
                  <Crown className="w-3 h-3 text-white" />
                  <span>★ 16:9 PANORAMIC RADAR ★</span>
                </span>
                <span className="text-xs font-mono font-black text-[#F04FCB] drop-shadow-[0_0_8px_rgba(240,79,203,0.6)]">
                  👑 {overallStats.sCount} / {overallStats.total} APEX PINK ({overallStats.total > 0 ? Math.round((overallStats.sCount / overallStats.total) * 100) : 0}%)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-[#E4E2DC] font-bold">
                  Physics · Chemistry · Botany · Zoology
                </span>
              </div>

              {/* Minimal Icon Controls: Cycle Layout, Merged Poster & Print, Fullscreen */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Single Repeatable Cycle Button (Cycles Mosaic -> 4-Column -> 2x2 Quad) */}
                <button
                  onClick={cyclePanoramicLayout}
                  className="p-1.5 rounded-[4px] border border-white/20 bg-black/40 hover:bg-black/60 text-white cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                  title={`Layout: ${panoramicLayout === 'mosaic' ? 'Mosaic' : panoramicLayout === '4col' ? '4-Column' : '2x2 Quad'} (Click to cycle)`}
                  aria-label="Cycle Panoramic Layout"
                >
                  {panoramicLayout === 'mosaic' && <Grid3X3 className="w-4 h-4 text-white" />}
                  {panoramicLayout === '4col' && <Columns className="w-4 h-4 text-white" />}
                  {panoramicLayout === 'quad' && <LayoutGrid className="w-4 h-4 text-white" />}
                </button>

                {/* Merged Single Action: Export Image & Print */}
                <button
                  onClick={() => {
                    sound.playKeyClick();
                    setIsPosterModalOpen(true);
                  }}
                  className="p-1.5 rounded-[4px] border border-white/20 bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all shadow-xs flex items-center gap-1"
                  title="Poster & Print (Export 16:9 Image / Print Layout)"
                  aria-label="Export Poster and Print"
                >
                  <ImageIcon className="w-4 h-4 text-[#F04FCB]" />
                  <Printer className="w-3.5 h-3.5 text-white/90" />
                </button>

                {/* Fullscreen Horizon Toggle */}
                <button
                  onClick={toggleFullscreen169}
                  className="p-1.5 rounded-[4px] border border-white/20 bg-black/40 hover:bg-black/60 text-white cursor-pointer transition-all shadow-xs"
                  title={isFullscreen169 ? 'Exit Fullscreen (Esc)' : 'Fullscreen 16:9 Viewport'}
                  aria-label={isFullscreen169 ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen169 ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
                </button>

                {/* Explicit Exit Badge when in Fullscreen */}
                {isFullscreen169 && (
                  <button
                    onClick={toggleFullscreen169}
                    className="px-2 py-1 rounded-[4px] border border-red-400/40 bg-red-600/80 hover:bg-red-600 text-white cursor-pointer transition-all text-[10px] font-bold tracking-wider flex items-center gap-1 shadow-xs"
                    title="Exit Fullscreen Viewport (Esc)"
                  >
                    <X className="w-3 h-3" />
                    <span>EXIT</span>
                  </button>
                )}
              </div>
            </div>

            {/* ALL 4 DISTINCT DISCIPLINES: PHYSICS, CHEMISTRY, BOTANY, ZOOLOGY (ZERO CLUBBING) */}
            {panoramicLayout === 'quad' ? (
              /* 2X2 QUAD COMMAND HORIZON (PHYSICS & CHEMISTRY TOP, BOTANY & ZOOLOGY BOTTOM) */
              <div className="relative z-10 pt-1 grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
                {subjectsData.map((col) => {
                  const colSCount = col.items.filter((i) => i.rank === 'S').length;
                  const colTotal = col.items.length;
                  const colReady = col.items.filter((i) => i.rank === 'S' || i.rank === 'A').length;
                  const colReadyPct = colTotal > 0 ? Math.round((colReady / colTotal) * 100) : 0;

                  return (
                    <div
                      key={col.name}
                      className={`rounded-xl p-3 space-y-2 shadow-md flex flex-col justify-between transition-all backdrop-blur-md ${col.panelBorder}`}
                      style={{ background: col.panelGradient }}
                    >
                      <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-white/15">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-black tracking-wider ${col.badgeStyle}`}>
                            {col.shortCode}
                          </span>
                          <h3 className="text-xs font-black text-white tracking-wide truncate">
                            {col.name}
                          </h3>
                          <span className="text-[10px] text-[#A1A1AA] font-bold">
                            ({colTotal})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span className="text-[#F04FCB] font-black drop-shadow-[0_0_6px_rgba(240,79,203,0.5)]">
                            👑 {colSCount} Pink
                          </span>
                          <span className="text-[#60A5FA] font-bold">· {colReadyPct}% Ready</span>
                        </div>
                      </div>

                      {/* Wide-Fit Dense Keycap Grid */}
                      <div className="grid grid-cols-7 sm:grid-cols-8 md:grid-cols-8 xl:grid-cols-10 gap-1.5 flex-1">
                        {col.items.map((item) => (
                          <div key={item.chapter.id} className="transition-all duration-150">
                            <ChapterKeycapTile
                              item={item}
                              isSelected={inspectedChapterId === item.chapter.id}
                              compact={true}
                              showName={false}
                              onInspect={() => {
                                sound.playKeyClick();
                                setInspectedChapterId(item.chapter.id);
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="pt-1.5 border-t border-white/15 flex items-center justify-between text-[9px] text-[#D4D2DC] font-mono">
                        <span className="font-bold">{colReadyPct}% Exam Ready</span>
                        <span>
                          {colSCount === colTotal ? (
                            <span className="text-[#F04FCB] font-black">★ 100% PINK APEX</span>
                          ) : (
                            <span className="text-[#A1A1AA]">{colTotal - colSCount} to conquer</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MOSAIC WIDESCREEN OR 4-COLUMN PARALLEL STREAMS */
              <div
                className={`relative z-10 pt-1 ${
                  panoramicLayout === 'mosaic'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'
                    : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'
                }`}
              >
                {subjectsData.map((col) => {
                  const colSCount = col.items.filter((i) => i.rank === 'S').length;
                  const colACount = col.items.filter((i) => i.rank === 'A').length;
                  const colBCount = col.items.filter((i) => i.rank === 'B').length;
                  const colTotal = col.items.length;
                  const colReady = col.items.filter((i) => i.rank === 'S' || i.rank === 'A').length;
                  const colReadyPct = colTotal > 0 ? Math.round((colReady / colTotal) * 100) : 0;
                  const colAvg = colTotal > 0 ? Math.round(col.items.reduce((s, i) => s + i.masteryScore, 0) / colTotal) : 0;

                  return (
                    <div
                      key={col.name}
                      className={`rounded-xl p-3 space-y-2 shadow-md flex flex-col justify-between transition-all backdrop-blur-md ${col.panelBorder}`}
                      style={{ background: col.panelGradient }}
                    >
                      {/* Subject Wing Header */}
                      <div className="space-y-1 pb-1.5 border-b border-white/15">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-black tracking-wider ${col.badgeStyle}`}>
                              {col.shortCode}
                            </span>
                            <h3 className="text-xs font-black text-white tracking-wide truncate">
                              {col.name}
                            </h3>
                            <span className="text-[10px] text-[#A1A1AA] font-bold">
                              ({colTotal})
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-mono">
                            <span className="text-[#F04FCB] font-black drop-shadow-[0_0_6px_rgba(240,79,203,0.5)]">
                              👑 {colSCount} Pink
                            </span>
                          </div>
                        </div>

                        {/* Rank Distribution Micro Spectrum */}
                        <div className="flex items-center gap-1 text-[9px] text-[#A1A1AA] justify-between">
                          <span>Avg: <strong className="text-white font-mono">{colAvg} / 1000</strong></span>
                          <div className="flex items-center gap-0.5">
                            {colSCount > 0 && <span className="px-1 py-0.2 rounded bg-[#F04FCB] text-white font-black text-[8px]">{colSCount}S</span>}
                            {colACount > 0 && <span className="px-1 py-0.2 rounded bg-[#493EA4] text-white font-bold text-[8px]">{colACount}A</span>}
                            {colBCount > 0 && <span className="px-1 py-0.2 rounded bg-[#E2BC39] text-[#141416] font-bold text-[8px]">{colBCount}B</span>}
                            {colTotal - (colSCount + colACount + colBCount) > 0 && (
                              <span className="px-1 py-0.2 rounded bg-[#34323B] text-white text-[8px]">
                                {colTotal - (colSCount + colACount + colBCount)} rest
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* UNCLUTTERED DENSE KEYCAP GRID (NO CHAPTER NAMES - PERFECT SCREEN FIT) */}
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-1.5 flex-1">
                        {col.items.map((item) => (
                          <div key={item.chapter.id} className="transition-all duration-150">
                            <ChapterKeycapTile
                              item={item}
                              isSelected={inspectedChapterId === item.chapter.id}
                              compact={true}
                              showName={false}
                              onInspect={() => {
                                sound.playKeyClick();
                                setInspectedChapterId(item.chapter.id);
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Wing Footer */}
                      <div className="pt-1.5 border-t border-white/15 flex items-center justify-between text-[9px] text-[#D4D2DC] font-mono">
                        <span className="font-bold">{colReadyPct}% Exam Ready</span>
                        <span>
                          {colSCount === colTotal ? (
                            <span className="text-[#F04FCB] font-black">★ 100% PINK APEX</span>
                          ) : (
                            <span className="text-[#A1A1AA]">{colTotal - colSCount} to conquer</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Minimal Footer: Clean and Decluttered (No Universal Codex) */}
            <div className="relative z-10 pt-1 flex items-center justify-between text-[9px] text-[#D4D2DC]/80 font-mono">
              <span>Hover keycap for breakdown · Click to inspect · Target: 100% Hot Pink Grail</span>
              <span className="text-[#F04FCB] font-bold">16:9 Tactical Horizon</span>
            </div>
          </div>
        );

        // When fullscreen is active, use React Portal to document.body so no parent clips it!
        return isFullscreen169 ? createPortal(panoramicCard, document.body) : panoramicCard;
      })() : (
        /* ======================================================================= */
        /* STANDARD SUBJECT-WISE CARDS (DEFAULT VIEW)                              */
        /* ======================================================================= */
        <div className="space-y-4">
          <div className="space-y-4">
            {subjectGroups.map((group) => {
              const theme = SUBJECT_COLOR_THEMES[group.subject as Subject];
              const isAllS = group.isAllS;
              const isAllSA = group.isAllSA;
              const isMajorityS = group.isMajorityS;
              const isMajorityA = group.isMajorityA;
              const isMajorityB = group.isMajorityB;
              const isHarmonized = group.isHarmonized;

              // Compute subject card styling based on progressive scenario
              let cardBorderClass = 'border-[#141416] shadow-[4px_4px_0px_#141416]';
              let cardBgClass = 'bg-[#FAF9F6]';

              if (isAllS) {
                cardBorderClass = 'border-[#F04FCB] ring-4 ring-[#F04FCB]/40 shadow-[0_0_32px_rgba(240,79,203,0.45),4px_4px_0px_#141416]';
                cardBgClass = 'bg-gradient-to-b from-[#FFF5FC] via-[#FAF9F6] to-[#FFF0F9]';
              } else if (isAllSA) {
                cardBorderClass = 'border-[#493EA4] ring-2 ring-[#493EA4]/40 shadow-[0_0_22px_rgba(73,62,164,0.35),4px_4px_0px_#141416]';
                cardBgClass = 'bg-gradient-to-b from-[#F5F3FF] via-[#FAF9F6] to-[#EEF2FF]';
              } else if (isMajorityS) {
                cardBorderClass = 'border-[#F04FCB] shadow-[0_0_18px_rgba(240,79,203,0.3),4px_4px_0px_#141416]';
              } else if (isMajorityA) {
                cardBorderClass = 'border-[#493EA4] shadow-[0_0_16px_rgba(73,62,164,0.25),4px_4px_0px_#141416]';
              } else if (isMajorityB) {
                cardBorderClass = 'border-[#E2BC39] shadow-[0_0_14px_rgba(226,188,57,0.25),4px_4px_0px_#141416]';
              }

              return (
                <div
                  key={group.subject}
                  className={`te-chassis-card te-chassis-paper border-2 p-4 rounded-xl space-y-3 transition-all duration-300 ${cardBgClass} ${cardBorderClass}`}
                >
                  {/* Subject Enclosure Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b-2 border-[#141416] gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-[3px] text-xs font-black font-mono text-white shadow-xs"
                        style={{ backgroundColor: theme.color }}
                      >
                        {group.shortCode}
                      </span>
                      <h3 className="text-sm font-black font-['Sora'] text-[#141416] uppercase tracking-wide">
                        {group.subject} ({group.items.length} Chapters)
                      </h3>

                      {/* Scenario Badges: Visual Changes for Every Scenario */}
                      {isAllS ? (
                        <span className="px-2.5 py-0.5 rounded-[3px] text-[10px] font-mono font-black uppercase flex items-center gap-1 bg-[#141416] text-[#F04FCB] border border-[#F04FCB] shadow-xs animate-pulse">
                          <Crown className="w-3.5 h-3.5 text-[#FEF08A]" />
                          <span>100% S-RANK APEX ASCENDED</span>
                        </span>
                      ) : isAllSA ? (
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-black uppercase flex items-center gap-1 bg-[#141416] text-[#A5B4FC] border border-[#493EA4] shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-[#A5B4FC]" />
                          <span>ALL S & A ELITE CITADEL</span>
                        </span>
                      ) : isMajorityS ? (
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-black uppercase flex items-center gap-1 bg-[#FDF2F8] text-[#F04FCB] border border-[#F04FCB]">
                          <Crown className="w-3 h-3 text-[#F04FCB]" />
                          <span>MAJORITY S-RANK ({group.sRankCount}/{group.totalSubjectChapters})</span>
                        </span>
                      ) : isMajorityA ? (
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-black uppercase flex items-center gap-1 bg-[#EEF2FF] text-[#493EA4] border border-[#493EA4]">
                          <Sparkles className="w-3 h-3 text-[#493EA4]" />
                          <span>MAJORITY A-RANK ({group.aRankCount}/{group.totalSubjectChapters})</span>
                        </span>
                      ) : isMajorityB ? (
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-black uppercase flex items-center gap-1 bg-[#FEFCE8] text-[#806207] border border-[#E2BC39]">
                          <ShieldCheck className="w-3 h-3 text-[#E2BC39]" />
                          <span>MAJORITY B-RANK ({group.bRankCount}/{group.totalSubjectChapters})</span>
                        </span>
                      ) : isHarmonized ? (
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-black uppercase flex items-center gap-1 bg-[#141416] text-white border border-white/40">
                          <Sparkles className="w-3 h-3 text-[#FFB800]" />
                          <span>DOMAIN HARMONY · ALL IN GRADE {group.harmonicRank}</span>
                        </span>
                      ) : group.allFirstPass && group.overdueCount === 0 ? (
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold uppercase flex items-center gap-1 bg-[#EFF6FF] text-[#0052FF] border border-[#0052FF]">
                          <CheckCircle2 className="w-3 h-3 text-[#0052FF]" />
                          <span>100% FIRST PASS · 0 OVERDUE</span>
                        </span>
                      ) : null}

                      {group.overdueCount > 0 && (
                        <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-black uppercase flex items-center gap-1 bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626] animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-[#DC2626]" />
                          <span>{group.overdueCount} Overdue</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      {!isAllS && (
                        <div className="flex items-center gap-1.5 text-[10.5px]">
                          <span className="text-[#5C5A52]">
                            {group.sRankCount}/{group.totalSubjectChapters} Grade S
                          </span>
                          {group.totalSubjectChapters - group.sRankCount > 0 && (
                            <span className="text-[9.5px] font-bold text-[#F04FCB] bg-[#F04FCB]/10 px-1.5 py-0.2 rounded border border-[#F04FCB]/30">
                              {group.totalSubjectChapters - group.sRankCount} to All-S
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-[#5C5A52]">
                        Average: <strong className="text-[#141416] font-mono font-black">{group.avgScore} / 1000</strong>
                      </span>
                    </div>
                  </div>

                  {/* Clean Structured Color-Coded Keycap Grid */}
                  <div
                    className={`grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 p-1 rounded-lg ${
                      isHarmonized && isAllS ? 'ring-1 ring-[#F04FCB]/30 bg-[#F04FCB]/5' : ''
                    }`}
                  >
                    {group.items.map((item) => (
                      <ChapterKeycapTile
                        key={item.chapter.id}
                        item={item}
                        isSelected={inspectedChapterId === item.chapter.id}
                        compact={!showChapterTitles}
                        showName={showChapterTitles}
                        onInspect={() => {
                          sound.playKeyClick();
                          setInspectedChapterId(item.chapter.id);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COMPREHENSIVE CURRICULUM ANALYTICS & STATS DIRECTLY BELOW THE VIEW */}
      {/* ========================================================================= */}
      <div className="space-y-5 pt-3">
        <div className="flex items-center justify-between pb-2 border-b-2 border-[#141416]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#FF3B00]" />
            <h2 className="text-base sm:text-lg font-black text-[#141416] uppercase tracking-wide">
              Curriculum Analytics & Rank Distribution
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-[#5C5A52]">
            97 Chapters Evaluated
          </span>
        </div>

        {/* MODULE A: RANK DISTRIBUTION WITH HIGH-CONTRAST COLOR CODING */}
        <div className="te-chassis-card bg-[#FAF9F6] border-2 border-[#141416] p-4 sm:p-5 rounded-xl shadow-[4px_4px_0px_#141416] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E4E2DC]">
            <div>
              <h3 className="text-sm font-black text-[#141416] uppercase tracking-wide">
                Chapters by Rank (S, A, B, C, D, E, F)
              </h3>
              <p className="text-xs text-[#5C5A52]">
                Universal mastery distribution across all 7 preparation tiers. Click any card to filter the view above.
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-[#141416]">
              {overallStats.readyCount} / {overallStats.total} Exam Ready ({overallStats.readyPercentage}%)
            </div>
          </div>

          {/* Color-Coded Segmented Distribution Bar */}
          <div className="w-full h-4 bg-[#ECEAE4] rounded-full overflow-hidden flex border-2 border-[#141416]">
            {overallStats.sCount > 0 && <div style={{ width: `${(overallStats.sCount / overallStats.total) * 100}%`, backgroundColor: CHAPTER_RANKS.S.color }} title={`Grade S: ${overallStats.sCount}`} />}
            {overallStats.aCount > 0 && <div style={{ width: `${(overallStats.aCount / overallStats.total) * 100}%`, backgroundColor: CHAPTER_RANKS.A.color }} title={`Grade A: ${overallStats.aCount}`} />}
            {overallStats.bCount > 0 && <div style={{ width: `${(overallStats.bCount / overallStats.total) * 100}%`, backgroundColor: CHAPTER_RANKS.B.color }} title={`Grade B: ${overallStats.bCount}`} />}
            {overallStats.cCount > 0 && <div style={{ width: `${(overallStats.cCount / overallStats.total) * 100}%`, backgroundColor: CHAPTER_RANKS.C.color }} title={`Grade C: ${overallStats.cCount}`} />}
            {overallStats.dCount > 0 && <div style={{ width: `${(overallStats.dCount / overallStats.total) * 100}%`, backgroundColor: CHAPTER_RANKS.D.color }} title={`Grade D: ${overallStats.dCount}`} />}
            {overallStats.eCount > 0 && <div style={{ width: `${(overallStats.eCount / overallStats.total) * 100}%`, backgroundColor: CHAPTER_RANKS.E.color }} title={`Grade E: ${overallStats.eCount}`} />}
            {overallStats.fCount > 0 && <div style={{ width: `${(overallStats.fCount / overallStats.total) * 100}%`, backgroundColor: CHAPTER_RANKS.F.color }} title={`Grade F: ${overallStats.fCount}`} />}
          </div>

          {/* 7 Clean Color-Coded Rank Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {(['S', 'A', 'B', 'C', 'D', 'E', 'F'] as ChapterRank[]).map((r) => {
              const prof = CHAPTER_RANKS[r];
              const count =
                r === 'S' ? overallStats.sCount :
                r === 'A' ? overallStats.aCount :
                r === 'B' ? overallStats.bCount :
                r === 'C' ? overallStats.cCount :
                r === 'D' ? overallStats.dCount :
                r === 'E' ? overallStats.eCount : overallStats.fCount;
              const pct = overallStats.total > 0 ? Math.round((count / overallStats.total) * 100) : 0;
              const isSelected = selectedRank === r;

              return (
                <div
                  key={r}
                  onClick={() => {
                    sound.playKeyClick();
                    setSelectedRank(isSelected ? 'ALL' : r);
                  }}
                  className={`p-3 rounded-lg border-2 border-[#141416] bg-white text-left transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-[#FF3B00] shadow-[3px_3px_0px_#FF3B00]' : 'shadow-[2px_2px_0px_#141416] hover:bg-[#F9F8F5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono leading-none" style={{ color: prof.color }}>
                      {r}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#5C5A52]">
                      {pct}%
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#141416] mt-1.5">{prof.label}</div>
                  <div className="text-lg font-black font-mono tabular-nums text-[#141416] mt-0.5">
                    {count} <span className="text-[10px] font-normal text-[#5C5A52]">chapters</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ZERO-SCROLL CHAPTER INSPECTION DRAWER MODAL (ALWAYS IN VIEWPORT) */}
      {/* ========================================================================= */}
      {inspectedChapter && (() => {
        const gradeTheme = GRADE_VIEWING_THEMES[inspectedChapter.rank];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs font-sans"
            onClick={() => setInspectedChapterId(null)}
          >
            <div
              className="relative w-full max-w-xl rounded-xl border-2 overflow-hidden flex flex-col max-h-[92vh] transition-all text-white"
              style={{
                background: gradeTheme.modalBg,
                borderColor: gradeTheme.accentColor,
                boxShadow: `${gradeTheme.glowShadow}, 8px 8px 0px #141416`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header with Blatant Grade Color Banner & Navigation */}
              <div
                className="p-3.5 sm:p-4 border-b-2 border-[#141416] flex items-center justify-between text-white"
                style={{ background: gradeTheme.headerGradient }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-[3px] text-xs font-mono font-black ${
                      inspectedChapter.rank === 'B' ? 'bg-[#141416] text-[#E2BC39]' : 'bg-[#141416] text-white'
                    } border border-black/30 shadow-xs flex items-center gap-1`}
                  >
                    {inspectedChapter.rank === 'S' && <Crown className="w-3 h-3 text-[#FEF08A]" />}
                    Grade {inspectedChapter.rank}
                  </span>
                  <div>
                    <span className="text-[10.5px] font-mono font-bold uppercase block leading-tight text-white/90">
                      {inspectedChapter.chapter.subject} · Chapter {inspectedChapter.chapterNumber} {inspectedChapter.chapter.classLevel ? `· Class ${inspectedChapter.chapter.classLevel}` : ''}
                    </span>
                    <div className="text-xs font-black flex items-center gap-1.5 mt-0.5 text-white">
                      <span
                        className="w-2 h-2 rounded-full inline-block bg-current"
                        style={{ boxShadow: '0 0 6px rgba(255,255,255,0.9)' }}
                      />
                      <span>{inspectedChapter.statusLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Prev / Next navigation */}
                  <div className="flex items-center border-2 border-[#141416] rounded-[4px] bg-[#141416] p-0.5 shadow-[1px_1px_0px_#141416]">
                    <button
                      onClick={handleInspectPrev}
                      disabled={inspectedIndex <= 0}
                      className="p-1 hover:bg-white/20 rounded disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed transition-colors text-white"
                      title="Previous chapter (← or H)"
                    >
                      <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-white/80 px-1.5 select-none">
                      {inspectedIndex + 1}/{filteredChapters.length}
                    </span>
                    <button
                      onClick={handleInspectNext}
                      disabled={inspectedIndex >= filteredChapters.length - 1}
                      className="p-1 hover:bg-white/20 rounded disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed transition-colors text-white"
                      title="Next chapter (→ or L)"
                    >
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <button
                    onClick={() => setInspectedChapterId(null)}
                    className="p-1.5 rounded-[4px] hover:bg-white/20 text-white cursor-pointer border-2 border-[#141416] bg-[#141416] shadow-[1px_1px_0px_#141416]"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Saturated with the Grade's Color (Zero Dull White) */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-white">
                {/* Primary Identity Card: Heavy Grade Hue, Large Rank Badge + Chapter Title */}
                <div
                  className="p-3.5 rounded-lg border-2 flex items-start gap-3.5 shadow-sm"
                  style={{
                    background: gradeTheme.cardBg,
                    borderColor: gradeTheme.accentColor,
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    className={`w-16 h-16 rounded-[8px] border-2 border-black flex flex-col items-center justify-center shrink-0 shadow-[2px_2px_0px_#141416] relative ${
                      inspectedChapter.rank === 'B' ? 'text-[#141416]' : 'text-white'
                    }`}
                    style={{
                      backgroundColor: gradeTheme.accentColor,
                      boxShadow: `0 0 16px ${gradeTheme.accentColor}`,
                    }}
                  >
                    {inspectedChapter.rank === 'S' && (
                      <Crown className="w-4 h-4 text-[#FEF08A] absolute -top-2 -right-2 drop-shadow-[0_0_4px_#FDE047] animate-pulse" />
                    )}
                    <span className="text-3xl font-black font-mono leading-none">
                      {inspectedChapter.rank}
                    </span>
                    <span className="text-[8.5px] font-mono font-black uppercase mt-1">
                      Grade {inspectedChapter.rank}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-black font-['Sora'] text-white leading-snug tracking-tight">
                      {inspectedChapter.chapter.name}
                    </h2>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap font-mono text-[11px]">
                      <span
                        className={`font-black px-1.5 py-0.5 rounded-[3px] border border-black/40 ${
                          inspectedChapter.rank === 'B' ? 'text-[#141416] bg-[#E2BC39]' : 'text-white'
                        }`}
                        style={{ backgroundColor: gradeTheme.accentColor }}
                      >
                        Grade {inspectedChapter.rank}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="font-black text-white">
                        {inspectedChapter.masteryScore} <span className="font-normal text-white/60">/ 1,000 pts</span>
                      </span>
                      <span className="text-white/40">·</span>

                      {/* Calibrated Confidence Power Gauge with illuminated laser bars */}
                      <div className="flex items-center gap-1.5 bg-[#141416]/90 border border-white/20 px-2 py-0.5 rounded-[3px]">
                        <span className="text-[9px] text-[#A8A29E] uppercase font-bold mr-0.5">Confidence:</span>
                        <div className="flex items-stretch gap-1 h-3">
                          {[1, 2, 3, 4, 5].map((lvl) => {
                            const isLit = inspectedChapter.confidence >= lvl;
                            return (
                              <div
                                key={lvl}
                                className="w-3 rounded-[0.5px] transition-all border"
                                style={{
                                  backgroundColor: isLit ? gradeTheme.gaugeLitColor : 'rgba(255, 255, 255, 0.08)',
                                  borderColor: isLit ? gradeTheme.accentColor : 'rgba(255, 255, 255, 0.15)',
                                  boxShadow: isLit ? `0 0 5px ${gradeTheme.gaugeLitColor}` : 'none',
                                }}
                              />
                            );
                          })}
                        </div>
                        <span className="text-[10px] font-bold ml-1" style={{ color: gradeTheme.gaugeLitColor }}>
                          {inspectedChapter.confidence}/5
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-white/80 mt-2 leading-relaxed" style={{ fontFamily: `'Atkinson Hyperlegible', sans-serif` }}>
                      {inspectedChapter.profile.explanation}
                    </p>
                  </div>
                </div>

                {/* 4 Essential Hardware Metrics Grid - Blatantly Bordered in Grade Accent */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div
                    className="p-2.5 rounded-lg border-2 text-center"
                    style={{ background: gradeTheme.cardBg, borderColor: gradeTheme.accentColor }}
                  >
                    <span className="text-[9px] font-mono font-bold text-white/70 uppercase block">Coverage</span>
                    <span className="text-base font-black font-mono" style={{ color: gradeTheme.accentColor }}>
                      {inspectedChapter.completionPercent}%
                    </span>
                    <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1 border border-white/20">
                      <div className="h-full" style={{ width: `${inspectedChapter.completionPercent}%`, backgroundColor: gradeTheme.accentColor }} />
                    </div>
                  </div>

                  <div
                    className="p-2.5 rounded-lg border-2 text-center"
                    style={{ background: gradeTheme.cardBg, borderColor: gradeTheme.accentColor }}
                  >
                    <span className="text-[9px] font-mono font-bold text-white/70 uppercase block">Revisions</span>
                    <span className="text-base font-black font-mono text-white">
                      {inspectedChapter.revisionCount} <span className="text-[10px] font-normal text-white/60">rounds</span>
                    </span>
                    <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1 border border-white/20">
                      <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (inspectedChapter.revisionCount / 3) * 100)}%` }} />
                    </div>
                  </div>

                  <div
                    className="p-2.5 rounded-lg border-2 text-center"
                    style={{ background: gradeTheme.cardBg, borderColor: gradeTheme.accentColor }}
                  >
                    <span className="text-[9px] font-mono font-bold text-white/70 uppercase block">Confidence</span>
                    <span className="text-base font-black font-mono text-white">
                      {inspectedChapter.confidence}/5 <span className="text-[10px] font-normal text-white/60">Bars</span>
                    </span>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className="w-2.5 h-1.5 rounded-[0.5px]"
                          style={{
                            backgroundColor: inspectedChapter.confidence >= lvl ? gradeTheme.gaugeLitColor : 'rgba(255, 255, 255, 0.15)',
                            boxShadow: inspectedChapter.confidence >= lvl ? `0 0 3px ${gradeTheme.gaugeLitColor}` : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div
                    className="p-2.5 rounded-lg border-2 text-center"
                    style={{ background: gradeTheme.cardBg, borderColor: gradeTheme.accentColor }}
                  >
                    <span className="text-[9px] font-mono font-bold text-white/70 uppercase block">Status</span>
                    <span
                      className={`text-xs font-black font-mono block mt-1 ${
                        inspectedChapter.status === 'UP_TO_DATE'
                          ? 'text-blue-300'
                          : inspectedChapter.status === 'DUE_TODAY'
                          ? 'text-amber-300'
                          : inspectedChapter.status === 'OVERDUE'
                          ? 'text-red-400'
                          : 'text-white/70'
                      }`}
                    >
                      {inspectedChapter.statusLabel}
                    </span>
                    <div className="text-[9px] font-mono text-white/60 mt-0.5 truncate">
                      {inspectedChapter.breakdown.isOverdueResolved ? 'Zero Penalties' : 'Review Needed'}
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* COLLAPSIBLE SECTION 1: SCORE BREAKDOWN FORMULA */}
                {/* ========================================================================= */}
                <div
                  className="rounded-lg border-2 overflow-hidden shadow-xs"
                  style={{ background: gradeTheme.cardBg, borderColor: gradeTheme.accentColor }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection('breakdown')}
                    className="w-full p-3 bg-black/40 hover:bg-black/60 transition-colors flex items-center justify-between cursor-pointer border-b border-white/10 text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4" style={{ color: gradeTheme.accentColor }} />
                      <span className="text-xs font-black uppercase text-white">
                        Dynamic Mastery Points Breakdown (0 to 1,000 pts)
                      </span>
                      <span
                        className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-black/60 border border-white/20"
                        style={{ color: gradeTheme.accentColor }}
                      >
                        {inspectedChapter.masteryScore} pts
                      </span>
                    </div>
                    {collapsedSections.breakdown ? (
                      <ChevronDown className="w-4 h-4 text-white/60" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {!collapsedSections.breakdown && (
                    <div className="p-3.5 space-y-2 text-[11px] text-white/90 bg-black/25">
                      <div className="flex justify-between">
                        <span className="text-white/70">1. Theory Coverage (Max 350):</span>
                        <strong className="font-mono text-blue-300">+{inspectedChapter.breakdown.syllabusCoveragePoints} pts ({inspectedChapter.completionPercent}%)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">2. Spaced Revisions (Max 300):</span>
                        <strong className="font-mono text-orange-300">+{inspectedChapter.breakdown.revisionPoints} pts ({inspectedChapter.revisionCount} rounds)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">3. Self-Confidence Rating (Max 200):</span>
                        <strong className="font-mono text-yellow-300">+{inspectedChapter.breakdown.confidencePoints} pts ({inspectedChapter.confidence} LEDs)</strong>
                      </div>

                      {/* Linked Mock Test Performance Impact */}
                      <div className="flex justify-between pt-1 border-t border-white/10">
                        <span className="text-white/70">4. Mock Test Validation:</span>
                        {inspectedChapter.breakdown.testPerformanceFactor !== 0 ? (
                          <strong className={`font-mono ${inspectedChapter.breakdown.testPerformanceFactor > 0 ? 'text-blue-300' : 'text-red-400'}`}>
                            {inspectedChapter.breakdown.testPerformanceFactor > 0 ? `+${inspectedChapter.breakdown.testPerformanceFactor}` : inspectedChapter.breakdown.testPerformanceFactor} pts ({inspectedChapter.breakdown.linkedTestAveragePercent}% avg)
                          </strong>
                        ) : inspectedChapter.breakdown.linkedTestCount > 0 ? (
                          <strong className="font-mono text-white/70">±0 pts ({inspectedChapter.breakdown.linkedTestAveragePercent}% avg)</strong>
                        ) : (
                          <span className="font-mono text-white/50">±0 pts (No mock tests taken)</span>
                        )}
                      </div>

                      {inspectedChapter.breakdown.recallErrorPenalty > 0 ? (
                        <div className="flex justify-between text-red-400 font-bold">
                          <span>• Diagnostic Memory Recall Error Penalty:</span>
                          <span className="font-mono">-{inspectedChapter.breakdown.recallErrorPenalty} pts (Revise chapter to clear)</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-white/70">
                          <span>• Diagnostic Recall Validation:</span>
                          <span className="font-mono text-blue-300">Zero Penalty · Resolved</span>
                        </div>
                      )}

                      {/* Overdue Spaced Repetition Penalty */}
                      {inspectedChapter.breakdown.overduePenalty > 0 ? (
                        <div className="flex justify-between text-red-400 font-bold">
                          <span>• Overdue Spaced Review Penalty:</span>
                          <span className="font-mono">-{inspectedChapter.breakdown.overduePenalty} pts (Review chapter to restore)</span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-white/70">
                          <span>• Spaced Revision Cadence:</span>
                          <span className="font-mono text-blue-300">Up to Date · Zero Penalty</span>
                        </div>
                      )}

                      {/* Flight Pacing Momentum Factor */}
                      {inspectedChapter.breakdown.pacingVelocityBonus !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-white/70">5. Flight Plan Pacing Velocity Factor:</span>
                          <strong className={`font-mono ${inspectedChapter.breakdown.pacingVelocityBonus > 0 ? 'text-blue-300' : 'text-red-400'}`}>
                            {inspectedChapter.breakdown.pacingVelocityBonus > 0 ? `+${inspectedChapter.breakdown.pacingVelocityBonus}` : inspectedChapter.breakdown.pacingVelocityBonus} pts
                          </strong>
                        </div>
                      )}

                      {inspectedChapter.daysSinceLastStudied !== null && (
                        <div className="flex justify-between pt-1 border-t border-white/10">
                          <span className="text-white/70">Last Studied / Revised:</span>
                          <strong className="font-mono text-white">
                            {inspectedChapter.daysSinceLastStudied === 0 ? 'Today' : `${inspectedChapter.daysSinceLastStudied} days ago`}
                          </strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ========================================================================= */}
                {/* COLLAPSIBLE SECTION 2: EXAMS & MOCK TESTS */}
                {/* ========================================================================= */}
                <div
                  className="rounded-lg border-2 overflow-hidden shadow-xs"
                  style={{ background: gradeTheme.cardBg, borderColor: gradeTheme.accentColor }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection('tests')}
                    className="w-full p-3 bg-black/40 hover:bg-black/60 transition-colors flex items-center justify-between cursor-pointer border-b border-white/10 text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-black uppercase text-white">
                        Exams & Mock Tests
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-black/60 border border-white/20 text-white">
                        {upcomingTestsForInspected.length} Upcoming · {pastTestsForInspected.length} Past
                      </span>
                    </div>
                    {collapsedSections.tests ? (
                      <ChevronDown className="w-4 h-4 text-white/60" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {!collapsedSections.tests && (
                    <div className="p-3.5 space-y-3.5 bg-black/25">
                      {/* Subsection A: Scheduled Upcoming Exams */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-blue-300 uppercase tracking-wide">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Upcoming Scheduled Exams ({upcomingTestsForInspected.length})</span>
                          </span>
                        </div>

                        {upcomingTestsForInspected.length === 0 ? (
                          <div className="p-2.5 bg-black/30 rounded-[4px] border border-white/10 text-[11px] text-white/60 italic">
                            No upcoming tests scheduled for this chapter.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {upcomingTestsForInspected.map((t) => {
                              const daysUntil = Math.ceil(
                                (new Date(t.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
                              );
                              return (
                                <div
                                  key={t.id}
                                  className="p-2.5 rounded-[4px] bg-black/40 border border-white/20 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-white truncate text-xs">{t.name}</div>
                                    <div className="text-[10px] font-mono text-white/70">
                                      Date: {t.date} · {t.type || 'Full Syllabus'}
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-[#0052FF] text-white shrink-0">
                                    {daysUntil === 0 ? 'Today!' : `${daysUntil}d left`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Subsection B: Past Exams & Recorded Scores */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between text-[11px] font-bold text-white/70 uppercase tracking-wide">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Past Exam Attempts & Results ({pastTestsForInspected.length})</span>
                          </span>
                        </div>

                        {pastTestsForInspected.length === 0 ? (
                          <div className="p-2.5 bg-black/30 rounded-[4px] border border-white/10 text-[11px] text-white/60 italic">
                            No past exam attempts recorded for this chapter yet.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {pastTestsForInspected.map(({ test: t, score }) => (
                              <div
                                key={t.id}
                                className="p-2.5 rounded-[4px] bg-black/40 border border-white/20 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-white truncate text-xs">{t.name}</div>
                                  <div className="text-[10px] font-mono text-white/70">
                                    Held on: {t.date}
                                  </div>
                                </div>
                                {score ? (
                                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-white text-[#141416] shrink-0">
                                    Score: {score.totalScore} / {t.totalMarks || 720}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-white/20 text-white/80 shrink-0 border border-white/20">
                                    Completed
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================================= */}
                {/* COLLAPSIBLE SECTION 3: STUDY SESSION HISTORY LOGS */}
                {/* ========================================================================= */}
                <div
                  className="rounded-lg border-2 overflow-hidden shadow-xs"
                  style={{ background: gradeTheme.cardBg, borderColor: gradeTheme.accentColor }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection('logs')}
                    className="w-full p-3 bg-black/40 hover:bg-black/60 transition-colors flex items-center justify-between cursor-pointer border-b border-white/10 text-white"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black uppercase text-white">
                        Study Session History
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-black/60 border border-white/20 text-white">
                        {studyLogsForInspected.length} Sessions
                      </span>
                    </div>
                    {collapsedSections.logs ? (
                      <ChevronDown className="w-4 h-4 text-white/60" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-white" />
                    )}
                  </button>

                  {!collapsedSections.logs && (
                    <div className="p-3.5 space-y-2 bg-black/25">
                      {studyLogsForInspected.length === 0 ? (
                        <div className="p-2.5 bg-black/30 rounded-[4px] border border-white/10 text-[11px] text-white/60 italic">
                          No study sessions logged for this chapter yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {studyLogsForInspected.map((l) => (
                            <div
                              key={l.id}
                              className="p-2 rounded-[4px] bg-black/40 border border-white/20 space-y-1 text-xs"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-mono font-bold text-white text-[11px]">{l.dateStudied}</span>
                                <span className="font-mono font-bold text-amber-300 text-[11px]">★ {l.confidenceRating}/5</span>
                              </div>
                              {l.note && (
                                <p className="text-[10.5px] text-white/70 italic">"{l.note}"</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer with Primary Actions: Log Chapter + Close */}
              <div
                className="p-3.5 border-t-2 flex items-center justify-between gap-2"
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  borderColor: gradeTheme.accentColor,
                }}
              >
                <span className="text-white/60 text-[11px] font-mono hidden sm:inline">
                  Shortcuts: <kbd className="px-1 py-0.2 bg-black/40 border border-white/20 rounded font-mono text-[10px] text-white">←</kbd> <kbd className="px-1 py-0.2 bg-black/40 border border-white/20 rounded font-mono text-[10px] text-white">→</kbd>
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  {onOpenQuickLogForChapter && (
                    <button
                      onClick={() => {
                        sound.playKeyClick();
                        const chapId = inspectedChapter.chapter.id;
                        setInspectedChapterId(null);
                        onOpenQuickLogForChapter(chapId);
                      }}
                      className="px-4 py-2 text-xs font-black cursor-pointer shadow-md rounded-[4px] border-2 border-black flex items-center gap-1.5 transition-all hover:opacity-90"
                      style={{
                        backgroundColor: gradeTheme.accentColor,
                        color: inspectedChapter.rank === 'B' ? '#141416' : '#FFFFFF',
                      }}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Log Study Session</span>
                    </button>
                  )}

                  <button
                    onClick={() => setInspectedChapterId(null)}
                    className="px-4 py-2 text-xs font-bold cursor-pointer bg-white/10 hover:bg-white/20 border-2 border-white/20 text-white shadow-sm rounded-[4px] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 5. CONSOLIDATED CODEX: USER GUIDE, MASTERY POINTS & COLOR CODE IN ONE MODAL */}
      {/* ========================================================================= */}
      {isCodexModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs"
          onClick={() => setIsCodexModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#FAF9F6] border-2 border-[#141416] rounded-xl shadow-[8px_8px_0px_#141416] max-h-[92vh] flex flex-col overflow-hidden text-[#141416]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b-2 border-[#141416] bg-[#ECEAE4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#FF3B00]" />
                <h2 className="text-sm sm:text-base font-black text-[#141416] uppercase tracking-wide">
                  Mastery Matrix Codex & System Guide
                </h2>
              </div>
              <button
                onClick={() => setIsCodexModalOpen(false)}
                className="p-1 rounded text-[#5C5A52] hover:text-[#141416] cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div className="flex border-b-2 border-[#141416] bg-white text-xs font-mono font-bold">
              <button
                onClick={() => { sound.playKeyClick(); setCodexTab('colors'); }}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-r border-[#141416] transition-colors cursor-pointer ${
                  codexTab === 'colors'
                    ? 'bg-[#141416] text-white'
                    : 'text-[#5C5A52] hover:bg-[#FAF9F6] hover:text-[#141416]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#0047FF]" />
                <span>1. Color Code & Ranks</span>
              </button>

              <button
                onClick={() => { sound.playKeyClick(); setCodexTab('formula'); }}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 border-r border-[#141416] transition-colors cursor-pointer ${
                  codexTab === 'formula'
                    ? 'bg-[#141416] text-white'
                    : 'text-[#5C5A52] hover:bg-[#FAF9F6] hover:text-[#141416]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-[#FF3B00]" />
                <span>2. Dynamic Mastery (1,000 pts)</span>
              </button>

              <button
                onClick={() => { sound.playKeyClick(); setCodexTab('guide'); }}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  codexTab === 'guide'
                    ? 'bg-[#141416] text-white'
                    : 'text-[#5C5A52] hover:bg-[#FAF9F6] hover:text-[#141416]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#6D28D9]" />
                <span>3. User Guide & Strategy</span>
              </button>
            </div>

            {/* Modal Body Based on Selected Tab */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-[#5C5A52] leading-relaxed max-h-[65vh]">
              {/* TAB 1: COLOR CODE & UNIVERSAL RANKS */}
              {codexTab === 'colors' && (
                <div className="space-y-4">
                  {/* DISPLAY PREFERENCE: CHAPTER TITLES ON KEYCAPS (MOVED HERE TO DECLUTTER TOOLBAR) */}
                  <div className="p-3 rounded-lg border-2 border-[#141416] bg-[#ECEAE4]/80 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-[#141416]" />
                        <h4 className="font-mono text-xs font-black uppercase text-[#141416]">
                          Keycap Chapter Titles Display
                        </h4>
                      </div>
                      <p className="text-[11px] text-[#5C5A52] mt-0.5">
                        Toggled OFF gives ultra-dense mechanical keycaps. Toggled ON shows chapter title labels.
                      </p>
                    </div>
                    <button
                      onClick={toggleShowChapterTitles}
                      className={`px-3 py-1.5 text-xs font-mono font-black rounded border-2 border-[#141416] cursor-pointer transition-all shadow-xs shrink-0 flex items-center gap-1.5 ${
                        showChapterTitles
                          ? 'bg-[#141416] text-white'
                          : 'bg-white text-[#5C5A52] hover:text-[#141416]'
                      }`}
                    >
                      <Type className="w-3.5 h-3.5" />
                      <span>{showChapterTitles ? 'TITLES: ON' : 'TITLES: OFF'}</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="font-black text-[#141416] text-sm mb-1 uppercase tracking-wide">
                      Universal 7-Grade Color Code
                    </h3>
                    <p className="text-[11px]">
                      Each tile’s primary background hue reflects its overall mastery classification, while status banners highlight spaced revision timing:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['S', 'A', 'B', 'C', 'D', 'E', 'F'] as ChapterRank[]).map((r) => {
                      const p = CHAPTER_RANKS[r];
                      return (
                        <div
                          key={r}
                          className="p-2.5 rounded-lg border-2 border-[#141416] bg-white flex items-center gap-3 shadow-xs"
                        >
                          <div
                            className={`w-9 h-9 rounded-md flex items-center justify-center font-mono font-black text-lg border border-[#141416] shrink-0 ${p.textColor}`}
                            style={{ backgroundColor: p.color }}
                          >
                            {r}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs text-[#141416] font-bold">Grade {r}: {p.label}</strong>
                            </div>
                            <p className="text-[10.5px] text-[#5C5A52] truncate">{p.summary}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-white rounded-lg border-2 border-[#141416] space-y-2">
                    <h4 className="font-black text-[#141416] text-xs uppercase tracking-wide">
                      Visual Hardware Keycap Language & Sign Guide
                    </h4>
                    <p className="text-[11px] text-[#5C5A52]">
                      To keep the matrix clean and tactile, all chapter statuses and progression tiers are communicated through physical visual signs:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded bg-red-50 border border-red-300 flex items-start gap-2.5">
                        <div
                          className="w-7 h-7 rounded border border-[#141416] shrink-0"
                          style={{
                            backgroundColor: '#991B1B',
                            backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 4px, transparent 4px, transparent 8px)',
                          }}
                        />
                        <div>
                          <strong className="text-red-700 block font-bold">Diagonal Safety Hazard Stripes</strong>
                          <span className="text-red-600 text-[10px]">
                            Scheduled spaced revision missed. Memory retention is decaying into the critical zone. Log a review session to restore stability.
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-amber-50 border border-amber-300 flex items-start gap-2.5">
                        <div
                          className="w-7 h-7 rounded border-2 border-amber-400 shrink-0 animate-pulse"
                          style={{ backgroundColor: '#B45309' }}
                        />
                        <div>
                          <strong className="text-amber-700 block font-bold">Pulsating Amber Halo & Rim</strong>
                          <span className="text-amber-600 text-[10px]">
                            Spaced revision scheduled for today. Completing your review session today prevents memory retention decay.
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-neutral-50 border border-[#141416] flex items-start gap-2.5">
                        <div className="flex items-center gap-0.5 pt-1.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-1.5 h-2 rounded-[0.5px] bg-[#E2BC39] shadow-[0_0_2px_#E2BC39]" />
                          ))}
                        </div>
                        <div>
                          <strong className="text-[#141416] block font-bold">5-Segment Precision Power Gauge</strong>
                          <span className="text-[#5C5A52] text-[10px]">
                            Machined linear power meter representing calibrated concept mastery confidence from 1 to 5 bars.
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded bg-pink-50/60 border border-pink-300 flex items-start gap-2.5">
                        <div
                          className="w-7 h-7 rounded border-2 border-[#940875] shrink-0 relative overflow-hidden shadow-[0_0_8px_rgba(240,79,203,0.6)]"
                          style={{ backgroundColor: '#F04FCB' }}
                        >
                          <div className="w-full h-full bg-white/40 blur-[1px] rank-shimmer-sweep" />
                          <Crown className="w-2.5 h-2.5 text-yellow-300 absolute -top-0.5 -right-0.5 drop-shadow-[0_0_2px_#000]" />
                        </div>
                        <div>
                          <strong className="text-[#BE185D] block font-bold">Hot Pink Shimmer & Apex Crown (#F04FCB)</strong>
                          <span className="text-[#9D174D] text-[10px]">
                            Apex Grade S (The Master Grail). 100% syllabus coverage, ≥3 revision passes, 5-bar max confidence, verified mock test mastery, and supreme apex heraldry.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MASTERY POINTS CALCULATION (0 TO 1,000 PTS) */}
              {codexTab === 'formula' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-[#141416] text-sm mb-1 uppercase tracking-wide">
                      Dynamic Mastery Calculation Architecture (0 to 1,000 pts)
                    </h3>
                    <p className="text-[11px]">
                      Mastery points provide a live, transparent reflection of your actual chapter mastery across syllabus coverage, revision rounds, confidence ratings, and exam performance.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-lg bg-white border-2 border-[#141416] space-y-1">
                      <span className="font-bold text-[#0052FF] block text-xs">1. Theory Coverage (Max 350 pts)</span>
                      <p className="text-[11px]">Completing first pass awards full 350 pts. Partial progress awards <code className="font-mono text-[#141416]">completion% × 3.5</code>.</p>
                    </div>

                    <div className="p-3 rounded-lg bg-white border-2 border-[#141416] space-y-1">
                      <span className="font-bold text-[#FF5722] block text-xs">2. Revision Rounds (Max 300 pts)</span>
                      <p className="text-[11px]">120 pts for 1st round, 100 pts for 2nd round, up to 80 pts for 3rd+ rounds with solid reinforcement.</p>
                    </div>

                    <div className="p-3 rounded-lg bg-white border-2 border-[#141416] space-y-1">
                      <span className="font-bold text-[#FF3B00] block text-xs">3. Self-Confidence Rating (Max 200 pts)</span>
                      <p className="text-[11px]">1 LED = 30 pts, 2 LEDs = 70 pts, 3 LEDs = 120 pts, 4 LEDs = 165 pts, 5 LEDs = 200 pts.</p>
                    </div>

                    <div className="p-3 rounded-lg bg-white border-2 border-[#141416] space-y-1">
                      <span className="font-bold text-[#0052FF] block text-xs">4. Mock Tests (-150 to +150 pts)</span>
                      <p className="text-[11px]">Scoring &ge;85% validates exam mastery (+150 pts). Sub-par scores deduct points to show application deficits.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border-2 border-[#141416] space-y-2">
                    <h4 className="font-black text-[#141416] text-xs uppercase tracking-wide">
                      Instant Penalty Resolution & Point Restoration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded bg-blue-50 border border-blue-300">
                        <strong className="text-blue-800 block">Instant Penalty Removal</strong>
                        <p className="text-blue-700 text-[10.5px]">If an overdue review penalty was incurred, the moment you revise or log the review session, the penalty is 100% removed (0 pts) and your points instantly shoot up!</p>
                      </div>

                      <div className="p-2.5 rounded bg-amber-50 border border-amber-300">
                        <strong className="text-amber-800 block">Diagnostic Recall Resolution</strong>
                        <p className="text-amber-700 text-[10.5px]">Mock test memory gaps are automatically resolved as soon as you revise the chapter or achieve high confidence.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: USER GUIDE & STRATEGY */}
              {codexTab === 'guide' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-black text-[#141416] text-sm mb-1 uppercase tracking-wide">
                      How to Navigate & Master the Syllabus
                    </h3>
                    <p className="text-[11px]">
                      The matrix is always organized strictly in NCERT syllabus sequence and subject-wise (Physics → Chemistry → Botany → Zoology).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 border-2 border-[#141416] space-y-1">
                      <h4 className="font-bold text-[#141416] text-xs">How do I reach Grade S (Mastered)?</h4>
                      <ol className="list-decimal list-inside space-y-1 text-[11px]">
                        <li>Complete 100% syllabus coverage for the chapter.</li>
                        <li>Log at least 3 spaced repetition revision sessions.</li>
                        <li>Maintain your confidence self-rating at 5 stars.</li>
                        <li>Never let the chapter become overdue for revision.</li>
                      </ol>
                    </div>

                    <div className="bg-white rounded-lg p-3 border-2 border-[#141416] space-y-1">
                      <h4 className="font-bold text-[#141416] text-xs">Zero-Scroll Chapter Inspection</h4>
                      <p className="text-[11px]">
                        Click any chapter keycap tile in the matrix to open the quick inspection drawer centered in your viewport. You can inspect mock exam history, score breakdown, and instantly log a new study session.
                      </p>
                    </div>

                    <div className="bg-white rounded-lg p-3 border-2 border-[#141416] space-y-1">
                      <h4 className="font-bold text-[#141416] text-xs">Keyboard Shortcuts</h4>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                        <div><kbd className="px-1.5 py-0.5 bg-[#ECEAE4] border border-[#141416] rounded text-[10px]">←</kbd> Previous Chapter</div>
                        <div><kbd className="px-1.5 py-0.5 bg-[#ECEAE4] border border-[#141416] rounded text-[10px]">→</kbd> Next Chapter</div>
                        <div><kbd className="px-1.5 py-0.5 bg-[#ECEAE4] border border-[#141416] rounded text-[10px]">Esc</kbd> Close Drawer / Modal</div>
                        <div><kbd className="px-1.5 py-0.5 bg-[#ECEAE4] border border-[#141416] rounded text-[10px]">M / G</kbd> Toggle Codex</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t-2 border-[#141416] bg-[#ECEAE4] flex justify-between items-center">
              <span className="text-[10px] font-mono text-[#5C5A52]">
                Active Tab: <strong className="uppercase text-[#141416]">{codexTab}</strong>
              </span>

              <button
                onClick={() => setIsCodexModalOpen(false)}
                className="te-btn-orange px-5 py-2 text-xs font-black cursor-pointer shadow-xs"
              >
                Close Codex
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 16:9 PANORAMIC POSTER EXPORT & PRINT MODAL */}
      {isPosterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs font-mono"
          onClick={() => setIsPosterModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#FAF9F6] border-2 border-[#141416] rounded-xl shadow-[8px_8px_0px_#141416] overflow-hidden text-[#141416] flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b-2 border-[#141416] bg-[#ECEAE4] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#F04FCB]" />
                <h2 className="text-sm sm:text-base font-black text-[#141416] uppercase tracking-wide">
                  16:9 Panoramic Matrix Poster &amp; Print
                </h2>
              </div>
              <button
                onClick={() => setIsPosterModalOpen(false)}
                className="p-1 rounded text-[#5C5A52] hover:text-[#141416] cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="p-3 bg-[#F4F3EE] border-2 border-[#141416] rounded-lg space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase text-[#141416]">
                    Poster Telemetry Snapshot
                  </span>
                  <span className="text-[10px] font-bold text-[#5C5A52]">
                    86 Chapters · {overallStats.sCount} Apex Pink ({overallStats.total > 0 ? Math.round((overallStats.sCount / overallStats.total) * 100) : 0}%)
                  </span>
                </div>
                <p className="text-[11px] text-[#5C5A52]">
                  Generates an ultra-crisp 16:9 widescreen artwork (1920×1080) displaying Physics, Chemistry, Botany, and Zoology with full color codex and progression telemetry.
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Titles On/Off Option */}
                <div className="p-3 bg-white border-2 border-[#141416] rounded-lg space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black uppercase block text-[#141416]">
                      Chapter Titles on Tiles
                    </span>
                    <p className="text-[10px] text-[#5C5A52] mt-0.5">
                      Toggle whether individual chapter title text appears on each keycap in the poster.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      sound.playKeyClick();
                      setPosterIncludeTitles(!posterIncludeTitles);
                    }}
                    className={`mt-2 py-1.5 px-3 text-xs font-black rounded border-2 border-[#141416] cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      posterIncludeTitles
                        ? 'bg-[#141416] text-white'
                        : 'bg-white text-[#5C5A52] hover:text-[#141416]'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>{posterIncludeTitles ? 'Titles: Included (ON)' : 'Titles: Off (Ultra-Dense)'}</span>
                  </button>
                </div>

                {/* Cyber Aesthetic Preset (Only retain cyber) */}
                <div className="p-3 bg-white border-2 border-[#141416] rounded-lg space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black uppercase block text-[#141416]">
                      Aesthetic Theme
                    </span>
                    <p className="text-[10px] text-[#5C5A52] mt-0.5">
                      Tactical Cyber Horizon with discipline chromatic orbs and Hot Pink Grail luminescence.
                    </p>
                  </div>
                  <div className="mt-2 py-1.5 px-3 rounded bg-[#2a0845] text-white font-mono text-[11px] font-bold border border-[#F04FCB]/40 flex items-center justify-between shadow-xs">
                    <span className="text-[#F04FCB] font-black flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-[#FEF08A]" />
                      <span>CYBER HORIZON</span>
                    </span>
                    <span className="text-[10px] text-[#FEF08A]">1920×1080 HD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 border-t-2 border-[#141416] bg-[#ECEAE4] flex flex-wrap justify-between items-center gap-2">
              <button
                onClick={() => setIsPosterModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-[#5C5A52] hover:text-[#141416] cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handlePrintPoster(posterIncludeTitles);
                  }}
                  className="px-3.5 py-2 text-xs font-black rounded bg-white text-[#141416] border-2 border-[#141416] cursor-pointer hover:bg-[#FAF9F6] shadow-xs flex items-center gap-1.5"
                  title="Print Landscape Panoramic Poster"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Poster</span>
                </button>

                <button
                  onClick={() => {
                    handleDownloadPoster(posterIncludeTitles);
                  }}
                  className="px-4 py-2 text-xs font-black rounded bg-[#141416] text-white border-2 border-[#141416] cursor-pointer hover:bg-black shadow-xs flex items-center gap-1.5"
                  title="Download 1920x1080 Wallpaper PNG"
                >
                  <Download className="w-3.5 h-3.5 text-[#F04FCB]" />
                  <span>Download 16:9 Image (PNG)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// REUSABLE HARDWARE CHAPTER KEYCAP TILE (TE-ENGINEERED, DYNAMIC ALERTS & RED STARS)
// =========================================================================
interface ChapterKeycapTileProps {
  item: ChapterAnalysis;
  onInspect: () => void;
  isSelected?: boolean;
  compact?: boolean;
  showName?: boolean;
}

const ChapterKeycapTile: React.FC<ChapterKeycapTileProps> = ({ item, onInspect, isSelected, compact, showName = true }) => {
  const prof = item.profile;
  const isOverdue = item.status === 'OVERDUE';
  const isDueToday = item.status === 'DUE_TODAY';
  const isGradeS = item.rank === 'S';
  const isGradeA = item.rank === 'A';
  const isGradeB = item.rank === 'B';
  const isGradeC = item.rank === 'C';
  const isGradeD = item.rank === 'D';
  const isGradeE = item.rank === 'E';
  const isGradeF = item.rank === 'F';
  const isPoorTest = item.breakdown.linkedTestAveragePercent !== null && item.breakdown.linkedTestAveragePercent < 50;

  // =========================================================================
  // INCREMENTAL PROGRESSION GAMIFICATION FINISHES (EXACT USER PALETTE):
  // F — Slate               #34323B (Uncharted Monolith Chassis)
  // E — Electric Blue       #377ED0 (Conduit Spark Alloy)
  // D — Burnt Orange        #E47E35 (Forged Thermal Bronze)
  // C — Rose Pink           #C84481 (Anodized Quartz Titanium)
  // B — Golden Yellow       #E2BC39 (24K Gilded Aureate Ingot)
  // A — Deep Indigo         #493EA4 (Astral Cosmic Sapphire Crystalline)
  // S — Hot Pink            #F04FCB (Apex Holographic Grail Trophy Plate)
  // =========================================================================
  let surfaceGradient = '';
  let borderStyle = '';
  let dropShadow = '';
  let hoverShadow = '';
  let bevelHighlight = '';
  let textColorClass = 'text-white';
  let emblemGlow = '';
  let gaugeLitColor = '#FFFFFF';

  if (isGradeS) {
    // S — THE APEX GRAIL: Hyper-Chroma Hot Pink Iridescent Hologram
    surfaceGradient = 'linear-gradient(135deg, #ff70e4 0%, #F04FCB 42%, #cc17a3 100%)';
    borderStyle = 'border-2 border-[#940875]';
    dropShadow = 'shadow-[0_6px_0_#75055d,0_0_24px_rgba(240,79,203,0.7)]';
    hoverShadow = 'hover:shadow-[0_8px_0_#75055d,0_0_36px_rgba(240,79,203,0.95)] hover:-translate-y-1';
    bevelHighlight = 'shadow-[inset_0_3px_1px_rgba(255,255,255,0.95),inset_0_-2.5px_0_rgba(0,0,0,0.45)]';
    textColorClass = 'text-white';
    emblemGlow = 'drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]';
    gaugeLitColor = '#FFFFFF';
  } else if (isGradeA) {
    // A — SUPERIOR ORBIT: Deep Indigo Cosmic Sapphire Crystalline
    surfaceGradient = 'linear-gradient(150deg, #6456cc 0%, #493EA4 50%, #2f257a 100%)';
    borderStyle = 'border-2 border-[#201859]';
    dropShadow = 'shadow-[0_5px_0_#1a134a,0_0_16px_rgba(73,62,164,0.45)]';
    hoverShadow = 'hover:shadow-[0_7px_0_#1a134a,0_0_24px_rgba(73,62,164,0.65)] hover:-translate-y-0.5';
    bevelHighlight = 'shadow-[inset_0_2.5px_0_rgba(255,255,255,0.65),inset_0_-2.5px_0_rgba(0,0,0,0.55)]';
    textColorClass = 'text-white';
    emblemGlow = 'drop-shadow-[0_0_8px_rgba(165,180,252,0.8)]';
    gaugeLitColor = '#A5B4FC';
  } else if (isGradeB) {
    // B — SOLID CORE: 24K Gilded Golden Yellow Ingot (Ultra-Sharp Dark Contrast)
    surfaceGradient = 'linear-gradient(150deg, #fae25c 0%, #E2BC39 50%, #bd9315 100%)';
    borderStyle = 'border-2 border-[#806207]';
    dropShadow = 'shadow-[0_5px_0_#6c5203,0_0_12px_rgba(226,188,57,0.35)]';
    hoverShadow = 'hover:shadow-[0_6px_0_#6c5203,0_0_20px_rgba(226,188,57,0.55)] hover:-translate-y-0.5';
    bevelHighlight = 'shadow-[inset_0_2.5px_0_rgba(255,255,255,0.7),inset_0_-2px_0_rgba(0,0,0,0.35)]';
    textColorClass = 'text-[#161304]'; // High contrast black on golden yellow!
    emblemGlow = 'drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]';
    gaugeLitColor = '#161304';
  } else if (isGradeC) {
    // C — DEVELOPING: Rose Pink Titanium Quartz
    surfaceGradient = 'linear-gradient(150deg, #dc5193 0%, #C84481 50%, #9e255d 100%)';
    borderStyle = 'border-2 border-[#6c1a40]';
    dropShadow = 'shadow-[0_5px_0_#571131]';
    hoverShadow = 'hover:shadow-[0_6px_0_#571131,0_0_14px_rgba(200,68,129,0.4)] hover:-translate-y-0.5';
    bevelHighlight = 'shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-2px_0_rgba(0,0,0,0.35)]';
    textColorClass = 'text-white';
    emblemGlow = 'drop-shadow-[0_0_6px_rgba(251,207,232,0.6)]';
    gaugeLitColor = '#FBCFE8';
  } else if (isGradeD) {
    // D — INITIATED: Burnt Orange Thermal Forged Bronze
    surfaceGradient = 'linear-gradient(150deg, #f29049 0%, #E47E35 50%, #bd5d16 100%)';
    borderStyle = 'border-2 border-[#7a3206]';
    dropShadow = 'shadow-[0_5px_0_#662904]';
    hoverShadow = 'hover:shadow-[0_6px_0_#662904,0_0_14px_rgba(228,126,53,0.4)] hover:-translate-y-0.5';
    bevelHighlight = 'shadow-[inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.35)]';
    textColorClass = 'text-white';
    emblemGlow = 'drop-shadow-[0_0_6px_rgba(254,215,170,0.6)]';
    gaugeLitColor = '#FFEDD5';
  } else if (isGradeE) {
    // E — AT RISK / PENDING: Electric Blue Conduit Alloy
    surfaceGradient = 'linear-gradient(150deg, #488fe0 0%, #377ED0 50%, #2061ab 100%)';
    borderStyle = 'border-2 border-[#164375]';
    dropShadow = 'shadow-[0_5px_0_#11365e]';
    hoverShadow = 'hover:shadow-[0_6px_0_#11365e,0_0_14px_rgba(55,126,208,0.4)] hover:-translate-y-0.5';
    bevelHighlight = 'shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),inset_0_-2px_0_rgba(0,0,0,0.35)]';
    textColorClass = 'text-white';
    emblemGlow = 'drop-shadow-[0_0_6px_rgba(191,219,254,0.6)]';
    gaugeLitColor = '#BFDBFE';
  } else {
    // F — UNCHARTED: Precision Cast-Iron Slate Socket
    surfaceGradient = 'linear-gradient(150deg, #3f3c46 0%, #34323B 55%, #25242a 100%)';
    borderStyle = 'border-2 border-[#242229]';
    dropShadow = 'shadow-[0_4px_0_#18171d]';
    hoverShadow = 'hover:shadow-[0_5px_0_#18171d] hover:-translate-y-0.5';
    bevelHighlight = 'shadow-[inset_0_1.5px_0_rgba(255,255,255,0.1),inset_0_-2px_0_rgba(0,0,0,0.5)]';
    textColorClass = 'text-[#D4D2DC]';
    emblemGlow = 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
    gaugeLitColor = '#D4D2DC';
  }

  // Handle active or hazard state rings
  const stateRing = isSelected
    ? 'ring-4 ring-[#FF3B00] ring-offset-2 ring-offset-[#FAF9F6] translate-y-1 shadow-[0_1px_0_#141416] z-20'
    : isOverdue
    ? 'ring-2 ring-red-400 animate-hazard-pulse shadow-[0_5px_0_#7F1D1D] hover:shadow-[0_6px_0_#7F1D1D] hover:-translate-y-0.5'
    : isDueToday
    ? 'ring-2 ring-amber-300 animate-due-pulse shadow-[0_5px_0_#78350F] hover:shadow-[0_6px_0_#78350F] hover:-translate-y-0.5'
    : '';

  return (
    <div
      onClick={onInspect}
      style={{
        backgroundImage: isOverdue
          ? 'repeating-linear-gradient(135deg, rgba(220,38,38,0.4) 0px, rgba(220,38,38,0.4) 6px, transparent 6px, transparent 12px), ' + surfaceGradient
          : surfaceGradient,
        backgroundColor: prof.color,
      }}
      className={`group relative rounded-[9px] ${borderStyle} flex flex-col justify-between cursor-pointer select-none overflow-hidden transition-all duration-150 ${
        compact ? 'aspect-square p-1.5' : 'aspect-square p-2'
      } ${dropShadow} ${hoverShadow} ${stateRing} active:translate-y-1 active:shadow-[0_1px_0_#141416]`}
      title={`${item.chapter.name} (${item.chapter.subject}) · Grade ${item.rank} (${prof.label}) · Score: ${item.masteryScore}/1000 · ${item.statusLabel}`}
    >
      {/* S-Rank Holographic Light Sweep Shimmer */}
      {isGradeS && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="w-1/2 h-full bg-white/40 blur-[1px] rank-shimmer-sweep" />
        </div>
      )}

      {/* Tactile Metallic Bevel & Specular Rim Chamfer */}
      <div className={`absolute inset-0 pointer-events-none rounded-[7px] ${bevelHighlight} z-0`} />

      {/* 1. TOP HEADER: Status Lamp (Left) & Precision 5-Segment Metallic Power Gauge (Right) */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono font-black pt-0.5 leading-none relative z-10">
        <div className="flex items-center gap-1 min-w-0">
          {isSelected ? (
            <span className="flex items-center gap-1 bg-[#141416] text-[#FF4F00] px-1 py-0.5 rounded-[2px] border border-[#FF4F00] text-[7.5px] font-black uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4F00] animate-ping" />
              <span>ACT</span>
            </span>
          ) : isOverdue ? (
            <span
              className="flex items-center justify-center w-3.5 h-3.5 rounded-[2px] bg-[#141416] text-red-400 border border-red-500 shadow-xs"
              title="Overdue revision hazard"
            >
              <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
            </span>
          ) : isDueToday ? (
            <span
              className="flex items-center justify-center w-3.5 h-3.5 rounded-[2px] bg-[#141416] text-amber-300 border border-amber-400 shadow-xs"
              title="Spaced repetition revision due today"
            >
              <Clock className="w-2.5 h-2.5 animate-pulse" />
            </span>
          ) : (
            <span className={`text-[8px] font-mono font-bold tracking-tighter ${isGradeB ? 'text-[#161304]/80' : 'text-white/80'}`}>
              {item.subjectShortCode[0]}{String(item.chapterNumber).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* PRECISION 5-SEGMENT METALLIC POWER GAUGE (Replaces dot nature with sleek power blade) */}
        <div
          className="flex items-stretch gap-[1.5px] h-2 w-7 sm:w-8 p-[1.5px] bg-black/55 rounded-[2px] border border-white/20 shadow-inner shrink-0"
          title={`Confidence: ${item.confidence}/5`}
        >
          {[1, 2, 3, 4, 5].map((lvl) => {
            const isLit = item.confidence >= lvl;
            return (
              <div
                key={lvl}
                className="flex-1 rounded-[0.5px] transition-all"
                style={{
                  backgroundColor: isLit ? gaugeLitColor : 'rgba(255, 255, 255, 0.08)',
                  boxShadow: isLit ? `0 0 3px ${gaugeLitColor}` : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 2. CENTER: Progression Rank Emblem & Chapter Title */}
      <div className="text-center py-0.5 min-w-0 relative z-10 flex flex-col items-center justify-center flex-1">
        <div className="relative inline-flex items-center justify-center">
          <span
            className={`text-2xl sm:text-3xl font-black font-['Sora'] leading-none tracking-tight ${textColorClass} ${emblemGlow}`}
          >
            {item.rank}
          </span>
          {/* S-Rank Apex Crown Heraldry Emblem */}
          {isGradeS && (
            <Crown
              className="w-3 h-3 text-[#FEF08A] absolute -top-2.5 -right-2.5 drop-shadow-[0_0_4px_#FDE047] animate-pulse"
              strokeWidth={2.5}
            />
          )}
        </div>

        {showName && !compact && (
          <span
            className={`text-[9.5px] font-bold truncate block w-full px-0.5 mt-1 leading-tight text-center ${textColorClass} drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]`}
            style={{ fontFamily: `'Atkinson Hyperlegible', sans-serif` }}
          >
            {item.chapter.name}
          </span>
        )}
      </div>

      {/* 3. BOTTOM: Telemetry Line */}
      <div
        className={`w-full relative z-10 flex items-center justify-between text-[8px] font-mono font-bold leading-none px-0.5 pt-0.5 border-t ${
          isGradeB ? 'border-[#161304]/25 text-[#161304]' : 'border-white/25 text-white'
        }`}
      >
        <span>{item.masteryScore}</span>
        {isOverdue ? (
          <span className="text-red-200 font-black">
            {item.daysDiff > 0 ? `+${item.daysDiff}d` : `${Math.abs(item.daysDiff)}d`}
          </span>
        ) : isPoorTest ? (
          <span className="text-red-200 font-black">
            {item.breakdown.linkedTestAveragePercent}%
          </span>
        ) : isDueToday ? (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
        ) : (
          <span className={isGradeB ? 'text-[#161304]/80' : 'text-white/80'}>
            {item.completionPercent}%
          </span>
        )}
      </div>
    </div>
  );
};

export const CircuitMatrix = ShadowArmyMatrix;
