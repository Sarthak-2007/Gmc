import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Flame,
  CheckCircle2,
  TrendingUp,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StudyLog, Subject } from '../types';
import { sound } from '../services/soundEffects';

interface ConsistencyHeatmapProps {
  studyLogs: StudyLog[];
}

interface DayCell {
  dateStr: string;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  monthName: string;
  isFirstDayOfMonth: boolean;
  isFuture: boolean;
  isToday: boolean;
  logs: StudyLog[];
  count: number;
  dominantSubject: Subject | 'Multi' | null;
  subjectCounts: Record<Subject, number>;
}

export const ConsistencyHeatmap: React.FC<ConsistencyHeatmapProps> = ({ studyLogs }) => {
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'All'>('All');
  const [hoveredDay, setHoveredDay] = useState<DayCell | null>(null);

  // Build bulletproof 52-week calendar grid ending on the current week's Saturday
  const { weeks, monthHeaders, streakStats, totalSessions, activeDaysCount, consistencyPercentage } = useMemo(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const todayDayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)

    const formatLocalDate = (y: number, m: number, d: number): string => {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };

    const todayStr = formatLocalDate(todayYear, todayMonth, todayDate);

    // Group logs by date string
    const logsByDate = new Map<string, StudyLog[]>();
    for (const log of studyLogs || []) {
      if (!log || !log.dateStudied) continue;
      const existing = logsByDate.get(log.dateStudied) || [];
      existing.push(log);
      logsByDate.set(log.dateStudied, existing);
    }

    // The grid contains 52 weeks (364 days).
    // Column 51 ends on the Saturday of the current week.
    // That means the grid starts on a Sunday exactly (52 * 7 - 1) days before the end Saturday.
    const daysUntilSaturday = 6 - todayDayOfWeek;
    const endSaturday = new Date(todayYear, todayMonth, todayDate + daysUntilSaturday);
    const startSunday = new Date(endSaturday.getFullYear(), endSaturday.getMonth(), endSaturday.getDate() - (52 * 7 - 1));

    const allDays: DayCell[] = [];
    const months: { label: string; colIndex: number }[] = [];
    let lastRecordedMonth = -1;

    let activeDays = 0;
    let totalLogsCount = 0;

    for (let i = 0; i < 52 * 7; i++) {
      const curDate = new Date(startSunday.getFullYear(), startSunday.getMonth(), startSunday.getDate() + i);
      const y = curDate.getFullYear();
      const m = curDate.getMonth();
      const d = curDate.getDate();
      const dateStr = formatLocalDate(y, m, d);
      const dayOfWeek = curDate.getDay();
      const colIndex = Math.floor(i / 7);

      // Track month labels (placed on the first column containing the new month)
      if (m !== lastRecordedMonth) {
        lastRecordedMonth = m;
        const monthShort = curDate.toLocaleString('default', { month: 'short' });
        months.push({ label: monthShort, colIndex });
      }

      const allDayLogs = logsByDate.get(dateStr) || [];
      
      // Filter by subject if specified
      const filteredDayLogs = selectedSubject === 'All'
        ? allDayLogs
        : allDayLogs.filter((l) => l.subject === selectedSubject);

      const count = filteredDayLogs.length;
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;

      // Subject breakdown for this day
      const subjectCounts: Record<Subject, number> = {
        Physics: 0,
        Chemistry: 0,
        Botany: 0,
        Zoology: 0,
      };

      for (const log of filteredDayLogs) {
        if (log.subject && subjectCounts[log.subject] !== undefined) {
          subjectCounts[log.subject]++;
        }
      }

      const activeSubjects = (Object.keys(subjectCounts) as Subject[]).filter(
        (s) => subjectCounts[s] > 0
      );

      let dominantSubject: Subject | 'Multi' | null = null;
      if (activeSubjects.length === 1) {
        dominantSubject = activeSubjects[0];
      } else if (activeSubjects.length > 1) {
        dominantSubject = 'Multi';
      }

      if (count > 0 && !isFuture) {
        activeDays++;
        totalLogsCount += count;
      }

      allDays.push({
        dateStr,
        dayOfWeek,
        monthName: curDate.toLocaleString('default', { month: 'short' }),
        isFirstDayOfMonth: d === 1,
        isFuture,
        isToday,
        logs: filteredDayLogs,
        count,
        dominantSubject,
        subjectCounts,
      });
    }

    // Split into 52 columns of 7 days each
    const cols: DayCell[][] = [];
    for (let w = 0; w < 52; w++) {
      cols.push(allDays.slice(w * 7, (w + 1) * 7));
    }

    // Calculate streaks (consecutive days with at least 1 study session)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate longest streak scanning forward over non-future days
    for (const day of allDays) {
      if (day.isFuture) break;
      if (day.count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current active streak scanning backwards from today
    let checkDate = new Date(todayYear, todayMonth, todayDate);
    let guard = 365;
    let checkedToday = false;

    while (guard-- > 0) {
      const ds = formatLocalDate(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      const hasLogs = (logsByDate.get(ds) || []).filter(
        (l) => selectedSubject === 'All' || l.subject === selectedSubject
      ).length > 0;

      if (hasLogs) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
        checkedToday = true;
      } else {
        // If today has no log yet, check yesterday to keep yesterday's streak alive
        if (!checkedToday && ds === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          checkedToday = true;
          continue;
        }
        break;
      }
    }

    // Calculate elapsed past days (up to today)
    const elapsedDays = allDays.filter((d) => !d.isFuture).length || 1;
    const consistencyPct = Math.round((activeDays / elapsedDays) * 100);

    return {
      weeks: cols,
      monthHeaders: months,
      streakStats: { currentStreak, longestStreak },
      totalSessions: totalLogsCount,
      activeDaysCount: activeDays,
      consistencyPercentage: consistencyPct,
    };
  }, [studyLogs, selectedSubject]);

  /**
   * Determine exact cell style for each day.
   * STRICT COLOR MAPPING (Zero green):
   * - Physics: Cobalt Blue Scale
   * - Chemistry: Flame Orange / Crimson Scale
   * - Botany: Golden Amber / Saffron Scale
   * - Zoology: Royal Violet / Purple Scale
   * - Multi-Subject: Radiant Indigo / Coral Dual
   */
  const getDayCellStyle = (day: DayCell) => {
    if (day.isFuture) {
      return 'bg-[#ECEAE4]/50 border-[#D5D2C8]/50 opacity-30 cursor-not-allowed';
    }

    if (day.count === 0) {
      return day.isToday
        ? 'bg-[#FAF9F6] border-2 border-[#141416] hover:bg-[#E5E3DC]'
        : 'bg-[#E5E3DC] hover:bg-[#D6D2C4] border-[#C5C3BB]';
    }

    // If a specific subject is filtered, use that subject's theme
    const activeTheme = selectedSubject !== 'All' ? selectedSubject : day.dominantSubject;

    switch (activeTheme) {
      case 'Physics':
        if (day.count === 1) return 'bg-[#93C5FD] hover:bg-[#60A5FA] border-[#3B82F6] text-[#141416]';
        if (day.count === 2) return 'bg-[#3B82F6] hover:bg-[#2563EB] border-[#1D4ED8] text-white';
        if (day.count === 3) return 'bg-[#1D4ED8] hover:bg-[#1E40AF] border-[#1E3A8A] text-white shadow-[0_0_3px_rgba(29,78,216,0.6)]';
        return 'bg-[#0047FF] hover:bg-[#0038CC] border-[#002999] text-white shadow-[0_0_6px_rgba(0,71,255,0.7)]';

      case 'Chemistry':
        if (day.count === 1) return 'bg-[#FDBA74] hover:bg-[#FB923C] border-[#F97316] text-[#141416]';
        if (day.count === 2) return 'bg-[#FB923C] hover:bg-[#F97316] border-[#EA580C] text-white';
        if (day.count === 3) return 'bg-[#FF3B00] hover:bg-[#DC2626] border-[#B91C1C] text-white shadow-[0_0_3px_rgba(255,59,0,0.6)]';
        return 'bg-[#B91C1C] hover:bg-[#991B1B] border-[#7F1D1D] text-white shadow-[0_0_6px_rgba(185,28,28,0.7)]';

      case 'Botany':
        // Golden Amber & Warm Saffron (NO GREEN)
        if (day.count === 1) return 'bg-[#FDE047] hover:bg-[#FACC15] border-[#EAB308] text-[#141416]';
        if (day.count === 2) return 'bg-[#FBBF24] hover:bg-[#F59E0B] border-[#D97706] text-[#141416]';
        if (day.count === 3) return 'bg-[#D97706] hover:bg-[#B45309] border-[#92400E] text-white shadow-[0_0_3px_rgba(217,119,6,0.6)]';
        return 'bg-[#B45309] hover:bg-[#78350F] border-[#451A03] text-white shadow-[0_0_6px_rgba(180,83,9,0.7)]';

      case 'Zoology':
        if (day.count === 1) return 'bg-[#DDD6FE] hover:bg-[#C4B5FD] border-[#A78BFA] text-[#141416]';
        if (day.count === 2) return 'bg-[#A78BFA] hover:bg-[#8B5CF6] border-[#7C3AED] text-white';
        if (day.count === 3) return 'bg-[#7C3AED] hover:bg-[#6D28D9] border-[#5B21B6] text-white shadow-[0_0_3px_rgba(124,58,237,0.6)]';
        return 'bg-[#5B21B6] hover:bg-[#4C1D95] border-[#2E1065] text-white shadow-[0_0_6px_rgba(91,33,182,0.7)]';

      case 'Multi':
      default:
        // Multi-subject study day (High-intensity Electric Indigo / Coral)
        if (day.count === 1) return 'bg-[#C7D2FE] hover:bg-[#A5B4FC] border-[#818CF8] text-[#141416]';
        if (day.count === 2) return 'bg-[#818CF8] hover:bg-[#6366F1] border-[#4F46E5] text-white';
        if (day.count === 3) return 'bg-[#4F46E5] hover:bg-[#4338CA] border-[#3730A3] text-white shadow-[0_0_3px_rgba(79,70,229,0.6)]';
        return 'bg-[#312E81] hover:bg-[#1E1B4B] border-[#1E1B4B] text-white shadow-[0_0_6px_rgba(49,46,129,0.8)] ring-1 ring-[#FF3B00]';
    }
  };

  const getSubjectBadge = (subject: Subject) => {
    switch (subject) {
      case 'Physics':
        return 'bg-[#0047FF] text-white';
      case 'Chemistry':
        return 'bg-[#FF3B00] text-white';
      case 'Botany':
        return 'bg-[#D97706] text-white';
      case 'Zoology':
        return 'bg-[#7C3AED] text-white';
      default:
        return 'bg-[#141416] text-white';
    }
  };

  return (
    <div className="te-chassis-card p-4 sm:p-5 space-y-4 bg-[#FAF9F6] border-2 border-[#141416] shadow-[4px_4px_0px_#141416]">
      {/* Top Status & Metrics Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b-2 border-[#141416] pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-[#FF3B00] text-white rounded-[3px] shadow-[1.5px_1.5px_0px_#141416]">
            <Flame className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-[#141416] text-white px-1.5 py-0.2 rounded-[2px] font-mono font-bold uppercase tracking-wider">
                DAILY STUDY DISCIPLINE
              </span>
              <span className="text-[10px] font-mono text-[#706E66] uppercase">52-Week Habit Engine</span>
            </div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#141416] flex items-center gap-1.5 mt-0.5">
              <span>Study Consistency Heatmap</span>
              <span className="text-[10px] font-mono text-[#0047FF] font-bold bg-[#0047FF]/10 px-1.5 py-0.5 rounded-[2px] border border-[#0047FF]/30">
                {consistencyPercentage}% Consistency
              </span>
            </h3>
          </div>
        </div>

        {/* Real-Time Consistency Telemetry */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] flex items-center gap-1.5 shadow-[2px_2px_0px_#141416]">
            <Flame className="w-4 h-4 text-[#FF3B00]" />
            <div>
              <div className="text-[#706E66] text-[9px] uppercase font-bold leading-none">Current Streak</div>
              <div className="font-black text-[#FF3B00] text-xs leading-tight">{streakStats.currentStreak} Days</div>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] flex items-center gap-1.5 shadow-[2px_2px_0px_#141416]">
            <TrendingUp className="w-4 h-4 text-[#0047FF]" />
            <div>
              <div className="text-[#706E66] text-[9px] uppercase font-bold leading-none">Best Streak</div>
              <div className="font-black text-[#0047FF] text-xs leading-tight">{streakStats.longestStreak} Days</div>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] flex items-center gap-1.5 shadow-[2px_2px_0px_#141416]">
            <CheckCircle2 className="w-4 h-4 text-[#D97706]" />
            <div>
              <div className="text-[#706E66] text-[9px] uppercase font-bold leading-none">Active Days</div>
              <div className="font-black text-[#141416] text-xs leading-tight">{activeDaysCount} Days</div>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[3px] flex items-center gap-1.5 shadow-[2px_2px_0px_#141416]">
            <Layers className="w-4 h-4 text-[#7C3AED]" />
            <div>
              <div className="text-[#706E66] text-[9px] uppercase font-bold leading-none">Sessions</div>
              <div className="font-black text-[#7C3AED] text-xs leading-tight">{totalSessions} Logged</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Filter Bar & Color Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#706E66]" />
          <span className="text-[10px] uppercase text-[#706E66] font-black">Subject View:</span>
          
          <button
            type="button"
            onClick={() => {
              sound.playKeyClick();
              setSelectedSubject('All');
            }}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-black uppercase transition-all cursor-pointer border-2 ${
              selectedSubject === 'All'
                ? 'bg-[#141416] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                : 'bg-[#FAF9F6] text-[#55534D] border-[#D5D2C8] hover:border-[#141416]'
            }`}
          >
            All Subjects
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playKeyClick();
              setSelectedSubject('Physics');
            }}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-black uppercase transition-all cursor-pointer border-2 flex items-center gap-1 ${
              selectedSubject === 'Physics'
                ? 'bg-[#0047FF] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                : 'bg-[#FAF9F6] text-[#0047FF] border-[#D5D2C8] hover:border-[#0047FF]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0047FF]" />
            Physics
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playKeyClick();
              setSelectedSubject('Chemistry');
            }}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-black uppercase transition-all cursor-pointer border-2 flex items-center gap-1 ${
              selectedSubject === 'Chemistry'
                ? 'bg-[#FF3B00] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                : 'bg-[#FAF9F6] text-[#FF3B00] border-[#D5D2C8] hover:border-[#FF3B00]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B00]" />
            Chemistry
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playKeyClick();
              setSelectedSubject('Botany');
            }}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-black uppercase transition-all cursor-pointer border-2 flex items-center gap-1 ${
              selectedSubject === 'Botany'
                ? 'bg-[#D97706] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                : 'bg-[#FAF9F6] text-[#D97706] border-[#D5D2C8] hover:border-[#D97706]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Botany
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playKeyClick();
              setSelectedSubject('Zoology');
            }}
            className={`px-2.5 py-1 rounded-[2px] text-[10px] font-black uppercase transition-all cursor-pointer border-2 flex items-center gap-1 ${
              selectedSubject === 'Zoology'
                ? 'bg-[#7C3AED] text-white border-[#141416] shadow-[1px_1px_0px_#141416]'
                : 'bg-[#FAF9F6] text-[#7C3AED] border-[#D5D2C8] hover:border-[#7C3AED]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            Zoology
          </button>
        </div>

        {/* Dynamic Color Intensity Legend */}
        <div className="flex items-center gap-2 text-[10px] text-[#706E66]">
          <span className="font-bold">0 Sessions</span>
          <div className="w-3 h-3 rounded-[1.5px] bg-[#E5E3DC] border border-[#C5C3BB]" title="0 sessions" />
          
          {selectedSubject === 'Physics' ? (
            <>
              <div className="w-3 h-3 rounded-[1.5px] bg-[#93C5FD] border border-[#3B82F6]" title="1 session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#3B82F6] border border-[#1D4ED8]" title="2 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#1D4ED8] border border-[#1E3A8A]" title="3 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#0047FF] border border-[#002999]" title="4+ sessions" />
            </>
          ) : selectedSubject === 'Chemistry' ? (
            <>
              <div className="w-3 h-3 rounded-[1.5px] bg-[#FDBA74] border border-[#F97316]" title="1 session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#FB923C] border border-[#EA580C]" title="2 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#FF3B00] border border-[#B91C1C]" title="3 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#B91C1C] border border-[#7F1D1D]" title="4+ sessions" />
            </>
          ) : selectedSubject === 'Botany' ? (
            <>
              <div className="w-3 h-3 rounded-[1.5px] bg-[#FDE047] border border-[#EAB308]" title="1 session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#FBBF24] border border-[#D97706]" title="2 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#D97706] border border-[#92400E]" title="3 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#B45309] border border-[#451A03]" title="4+ sessions" />
            </>
          ) : selectedSubject === 'Zoology' ? (
            <>
              <div className="w-3 h-3 rounded-[1.5px] bg-[#DDD6FE] border border-[#A78BFA]" title="1 session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#A78BFA] border border-[#7C3AED]" title="2 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#7C3AED] border border-[#5B21B6]" title="3 sessions" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#5B21B6] border border-[#2E1065]" title="4+ sessions" />
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-[1.5px] bg-[#93C5FD] border border-[#3B82F6]" title="Physics session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#FB923C] border border-[#EA580C]" title="Chemistry session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#FBBF24] border border-[#D97706]" title="Botany session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#7C3AED] border border-[#5B21B6]" title="Zoology session" />
              <div className="w-3 h-3 rounded-[1.5px] bg-[#312E81] border border-[#1E1B4B] ring-1 ring-[#FF3B00]" title="Multi-subject" />
            </>
          )}

          <span className="font-bold">4+ Sessions</span>
        </div>
      </div>

      {/* 52-Week Matrix Canvas */}
      <div className="p-3.5 bg-[#ECEAE4] border-2 border-[#141416] rounded-[4px] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.08)] overflow-x-auto">
        <div className="min-w-[720px] space-y-1.5">
          {/* Month Labels Bar */}
          <div className="flex pl-7 text-[9px] font-mono text-[#706E66] font-bold select-none relative h-4">
            {monthHeaders.map((m, idx) => (
              <span
                key={idx}
                className="absolute"
                style={{ left: `calc(1.75rem + (${m.colIndex} * (100% - 1.75rem) / 52))` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5">
            {/* Day of Week Labels */}
            <div className="flex flex-col justify-between py-0.5 text-[9px] font-mono font-bold text-[#706E66] select-none w-6 shrink-0 leading-none">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* 52-Week Columns */}
            <div className="flex-1 grid grid-flow-col auto-cols-fr gap-[3px]">
              {weeks.map((week, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const cellStyle = getDayCellStyle(day);
                    return (
                      <div
                        key={day.dateStr}
                        onMouseEnter={() => {
                          if (!day.isFuture) {
                            setHoveredDay(day);
                          }
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-full aspect-square rounded-[1.5px] border transition-all cursor-pointer ${cellStyle}`}
                        title={`${day.dateStr}: ${day.count} sessions`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rich Interactive Inspector Strip */}
        <div className="mt-3 pt-2.5 border-t border-[#D5D2C8] min-h-[36px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          {hoveredDay ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-[#141416] bg-[#FAF9F6] px-2 py-0.5 rounded-[2px] border border-[#141416]">
                {hoveredDay.dateStr}
              </span>

              <span className="font-black text-[#FF3B00]">
                {hoveredDay.count} {hoveredDay.count === 1 ? 'Study Session' : 'Study Sessions'}
              </span>

              {hoveredDay.logs.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hoveredDay.logs.slice(0, 4).map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#FAF9F6] border border-[#141416]"
                    >
                      <span className={`text-[8px] font-black px-1 py-0.2 rounded-[1px] ${getSubjectBadge(l.subject)}`}>
                        {l.subject.slice(0, 3)}
                      </span>
                      <span className="font-bold text-[#141416] max-w-[120px] truncate">{l.chapterName}</span>
                      <span className="text-[#FF3B00] font-black">★{l.confidenceRating}</span>
                    </span>
                  ))}
                  {hoveredDay.logs.length > 4 && (
                    <span className="text-[10px] text-[#706E66] font-bold">
                      +{hoveredDay.logs.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#706E66] text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-[#FF3B00]" />
              <span>Hover over any calendar cell to inspect logged chapters and daily focus metrics.</span>
            </div>
          )}

          <div className="text-[9px] text-[#8C8A82] uppercase tracking-wider font-bold shrink-0 self-end sm:self-auto">
            364-Day Consistency Grid (Zero Inactive Skew)
          </div>
        </div>
      </div>
    </div>
  );
};
