import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  X,
  Calendar,
  Filter,
  FileText,
  Sliders,
  Sparkles,
  BookOpen,
  Target,
  Clock,
  Layers,
  Award,
  ChevronDown,
  Palette,
  Columns,
  CheckSquare,
  Square,
  Eye,
  Settings2,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Hash,
  ListOrdered,
  List,
  Type,
  LayoutGrid,
  FileSpreadsheet,
  PenTool,
} from 'lucide-react';
import { Chapter, Subject, Test, TestScore } from '../types';
import { getDaysDifference, getTodayStr } from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';

interface TestSchedulePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: Test[];
  chapters: Chapter[];
  testScores: TestScore[];
  studentName?: string;
}

export type LayoutStyle = 'table' | 'cards' | 'subject-matrix' | 'minimal-datesheet';
export type HorizonFilter = 'all' | 'upcoming' | '30days' | '60days' | '90days' | 'past';
export type ColorMode = 'bw' | 'grayscale' | 'minimal-accent' | 'vibrant-subject' | 'solar';
export type SyllabusFormat = 'structured-subjects' | 'scope-text' | 'compact-tags' | 'none';
export type ChapterMarker = 'numbered' | 'bullet' | 'none';
export type ChecklistType = '5-pillars' | '3-pass' | 'single-checkbox' | 'none';
export type Density = 'compact' | 'comfortable' | 'roomy';

const SUBJECT_LIST: Subject[] = ['Physics', 'Chemistry', 'Botany', 'Zoology'];

export const TestSchedulePrintModal: React.FC<TestSchedulePrintModalProps> = ({
  isOpen,
  onClose,
  tests,
  chapters,
  testScores,
  studentName = 'NEET UG ASPIRANT',
}) => {
  const todayStr = getTodayStr();

  // 1. Layout & Architecture
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('table');
  const [density, setDensity] = useState<Density>('comfortable');
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // 2. Filters & Horizon
  const [coachingFilter, setCoachingFilter] = useState<string>('ALL');
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>('upcoming');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // 3. Color & Visual Profile
  const [colorMode, setColorMode] = useState<ColorMode>('vibrant-subject');

  // 4. Chapter & Syllabus Configuration
  const [syllabusFormat, setSyllabusFormat] = useState<SyllabusFormat>('structured-subjects');
  const [chapterMarker, setChapterMarker] = useState<ChapterMarker>('numbered');
  const [checklistType, setChecklistType] = useState<ChecklistType>('5-pillars');

  // 5. Granular Column & Detail Visibility Controls
  const [showIndex, setShowIndex] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showDayOfWeek, setShowDayOfWeek] = useState(true);
  const [showCountdown, setShowCountdown] = useState(false);
  const [showCoaching, setShowCoaching] = useState(true);
  const [showTestTitle, setShowTestTitle] = useState(true);
  const [showChapterCount, setShowChapterCount] = useState(true);
  const [showScoreSlot, setShowScoreSlot] = useState(true);
  const [showSubjectScores, setShowSubjectScores] = useState(false);
  const [showMistakeLog, setShowMistakeLog] = useState(false);

  // 6. Header & Document Blocks (Fully Removable)
  const [showDocumentHeader, setShowDocumentHeader] = useState(true);
  const [showDocTitle, setShowDocTitle] = useState(true);
  const [showHeaderStats, setShowHeaderStats] = useState(true);
  const [showAspirantBadge, setShowAspirantBadge] = useState(true);
  const [showProtocolRules, setShowProtocolRules] = useState(true);
  const [showSignatureBlock, setShowSignatureBlock] = useState(true);

  // 7. Custom Meta Strings
  const [customStudentName, setCustomStudentName] = useState(studentName);
  const [targetScore, setTargetScore] = useState('680+ / 720');
  const [aspirantBatch, setAspirantBatch] = useState('NEET UG 2026–2027 Test Series Flight Schedule');
  const [customGuidelines, setCustomGuidelines] = useState(
    '1. Complete syllabus revision 48h prior • 2. 180 min strictly timed mock condition • 3. Log question errors within 24h'
  );

  // Sidebar Accordion Section state
  const [expandedSection, setExpandedSection] = useState<'layout' | 'filters' | 'color' | 'chapters' | 'columns' | 'meta'>('layout');

  const [copiedNotification, setCopiedNotification] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Chapter Map
  const chapterMap = useMemo(() => {
    const map = new Map<string, Chapter>();
    chapters.forEach((ch) => map.set(ch.id, ch));
    return map;
  }, [chapters]);

  // Score Map
  const scoreMap = useMemo(() => {
    const map = new Map<string, TestScore>();
    testScores.forEach((s) => map.set(s.testId, s));
    return map;
  }, [testScores]);

  // Extract available coaching series
  const availableCoachings = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => {
      if (t.coachingName && t.coachingName.trim()) {
        set.add(t.coachingName.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [tests]);

  // Filtered and sorted tests
  const filteredTests = useMemo(() => {
    return tests
      .filter((t) => {
        // Coaching series filter
        if (coachingFilter !== 'ALL') {
          const testCoaching = (t.coachingName || '').toUpperCase();
          const testTitle = t.name.toUpperCase();
          if (coachingFilter === 'ALLEN') {
            if (!testCoaching.includes('ALLEN') && !testTitle.includes('ALLEN')) return false;
          } else if (coachingFilter === 'AAKASH') {
            if (
              !testCoaching.includes('AAKASH') &&
              !testTitle.includes('AAKASH') &&
              !testTitle.includes('AIATS') &&
              !testTitle.includes('TYM') &&
              !testTitle.includes('NBTS')
            ) {
              return false;
            }
          } else {
            if (!testCoaching.includes(coachingFilter) && !testTitle.includes(coachingFilter)) return false;
          }
        }

        // Time horizon filter
        const daysAway = getDaysDifference(todayStr, t.date);
        if (horizonFilter === 'upcoming' && daysAway < 0) return false;
        if (horizonFilter === '30days' && (daysAway < 0 || daysAway > 30)) return false;
        if (horizonFilter === '60days' && (daysAway < 0 || daysAway > 60)) return false;
        if (horizonFilter === '90days' && (daysAway < 0 || daysAway > 90)) return false;
        if (horizonFilter === 'past' && daysAway >= 0) return false;

        // Search text filter
        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchScope = t.subjectOrScope.toLowerCase().includes(q);
          const matchDate = t.date.toLowerCase().includes(q);
          const matchCoaching = (t.coachingName || '').toLowerCase().includes(q);
          const matchChapter = t.linkedChapterIds.some((id) => {
            const ch = chapterMap.get(id);
            return ch && ch.name.toLowerCase().includes(q);
          });
          if (!matchName && !matchScope && !matchDate && !matchCoaching && !matchChapter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tests, coachingFilter, horizonFilter, searchFilter, todayStr, chapterMap]);

  // Date Parsing Helper
  const parseDateParts = (dateStr: string) => {
    if (!dateStr) return { date: '—', dayName: '', formatted: '—' };
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        return {
          date: dateStr,
          dayName: dayName,
          formatted: `${parseInt(parts[2], 10)} ${monthName} ${parts[0]}`,
        };
      }
    } catch {
      // fallback
    }
    return { date: dateStr, dayName: '', formatted: dateStr };
  };

  // Color Theme Engine
  const theme = useMemo(() => {
    if (colorMode === 'bw') {
      return {
        mode: 'bw',
        cardBorder: 'border-2 border-black bg-white',
        cardHeaderBg: 'bg-black text-white border-b-2 border-black',
        tableHeaderBg: 'bg-black text-white border-black',
        tableCellBorder: 'border border-black',
        badgeBg: 'bg-black text-white border border-black',
        subtleBadge: 'bg-white text-black border border-black',
        accentText: 'text-black',
        metaBoxBg: 'bg-white border-2 border-black text-black',
        checkboxBorder: 'border border-black bg-white',
        physicsTag: 'bg-white text-black border border-black font-bold',
        chemistryTag: 'bg-white text-black border border-black font-bold',
        botanyTag: 'bg-white text-black border border-black font-bold',
        zoologyTag: 'bg-white text-black border border-black font-bold',
        physicsCard: 'border border-black bg-white',
        chemistryCard: 'border border-black bg-white',
        botanyCard: 'border border-black bg-white',
        zoologyCard: 'border border-black bg-white',
        divider: 'border-black',
        boxBg: 'bg-[#FAFAFA]',
      };
    }
    if (colorMode === 'grayscale') {
      return {
        mode: 'grayscale',
        cardBorder: 'border-2 border-[#334155] bg-white',
        cardHeaderBg: 'bg-[#334155] text-white border-b-2 border-[#334155]',
        tableHeaderBg: 'bg-[#334155] text-[#F8FAFC] border-[#334155]',
        tableCellBorder: 'border border-[#94A3B8]',
        badgeBg: 'bg-[#475569] text-white border border-[#334155]',
        subtleBadge: 'bg-[#F1F5F9] text-[#1E293B] border border-[#CBD5E1]',
        accentText: 'text-[#1E293B]',
        metaBoxBg: 'bg-[#F8FAFC] border-2 border-[#334155] text-[#1E293B]',
        checkboxBorder: 'border border-[#475569] bg-white',
        physicsTag: 'bg-[#F1F5F9] text-[#0F172A] border border-[#94A3B8] font-bold',
        chemistryTag: 'bg-[#F1F5F9] text-[#0F172A] border border-[#94A3B8] font-bold',
        botanyTag: 'bg-[#F1F5F9] text-[#0F172A] border border-[#94A3B8] font-bold',
        zoologyTag: 'bg-[#F1F5F9] text-[#0F172A] border border-[#94A3B8] font-bold',
        physicsCard: 'border border-[#94A3B8] bg-[#F8FAFC]',
        chemistryCard: 'border border-[#94A3B8] bg-[#F8FAFC]',
        botanyCard: 'border border-[#94A3B8] bg-[#F8FAFC]',
        zoologyCard: 'border border-[#94A3B8] bg-[#F8FAFC]',
        divider: 'border-[#64748B]',
        boxBg: 'bg-[#F8FAFC]',
      };
    }
    if (colorMode === 'minimal-accent') {
      return {
        mode: 'minimal-accent',
        cardBorder: 'border-2 border-[#0047FF] bg-white',
        cardHeaderBg: 'bg-[#0047FF] text-white border-b-2 border-[#0047FF]',
        tableHeaderBg: 'bg-[#0047FF] text-white border-[#0047FF]',
        tableCellBorder: 'border border-[#CBD5E1]',
        badgeBg: 'bg-[#0047FF] text-white border border-[#0047FF]',
        subtleBadge: 'bg-[#EFF6FF] text-[#0047FF] border border-[#BFDBFE]',
        accentText: 'text-[#0047FF]',
        metaBoxBg: 'bg-[#EFF6FF] border-2 border-[#0047FF] text-[#0047FF]',
        checkboxBorder: 'border border-[#0047FF] bg-white',
        physicsTag: 'bg-[#EFF6FF] text-[#0047FF] border border-[#0047FF] font-bold',
        chemistryTag: 'bg-[#F8FAFC] text-[#334155] border border-[#CBD5E1] font-bold',
        botanyTag: 'bg-[#F8FAFC] text-[#334155] border border-[#CBD5E1] font-bold',
        zoologyTag: 'bg-[#F8FAFC] text-[#334155] border border-[#CBD5E1] font-bold',
        physicsCard: 'border border-[#0047FF] bg-[#EFF6FF]/40',
        chemistryCard: 'border border-[#CBD5E1] bg-[#F8FAFC]',
        botanyCard: 'border border-[#CBD5E1] bg-[#F8FAFC]',
        zoologyCard: 'border border-[#CBD5E1] bg-[#F8FAFC]',
        divider: 'border-[#0047FF]',
        boxBg: 'bg-[#FAF9F6]',
      };
    }
    if (colorMode === 'solar') {
      return {
        mode: 'solar',
        cardBorder: 'border-2 border-[#141416] bg-white',
        cardHeaderBg: 'bg-[#FF3B00] text-white border-b-2 border-[#141416]',
        tableHeaderBg: 'bg-[#141416] text-[#FAF9F6] border-[#141416]',
        tableCellBorder: 'border border-[#141416]',
        badgeBg: 'bg-[#FF3B00] text-white border border-[#141416]',
        subtleBadge: 'bg-[#FFB800]/20 text-[#141416] border border-[#141416]',
        accentText: 'text-[#FF3B00]',
        metaBoxBg: 'bg-[#FAF9F6] border-2 border-[#FF3B00] text-[#141416]',
        checkboxBorder: 'border border-[#141416] bg-white',
        physicsTag: 'bg-[#0047FF]/15 text-[#0047FF] border border-[#0047FF] font-black',
        chemistryTag: 'bg-[#9333EA]/15 text-[#9333EA] border border-[#9333EA] font-black',
        botanyTag: 'bg-[#FFB800]/20 text-[#B45309] border border-[#D97706] font-black',
        zoologyTag: 'bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00] font-black',
        physicsCard: 'border border-[#0047FF] bg-[#0047FF]/5',
        chemistryCard: 'border border-[#9333EA] bg-[#9333EA]/5',
        botanyCard: 'border border-[#D97706] bg-[#FFB800]/10',
        zoologyCard: 'border border-[#FF3B00] bg-[#FF3B00]/5',
        divider: 'border-[#141416]',
        boxBg: 'bg-[#FAF9F6]',
      };
    }
    // VIBRANT SUBJECT COLOR CODING (Default)
    return {
      mode: 'vibrant-subject',
      cardBorder: 'border-2 border-[#141416] bg-white',
      cardHeaderBg: 'bg-[#141416] text-white border-b-2 border-[#141416]',
      tableHeaderBg: 'bg-[#141416] text-[#FAF9F6] border-[#141416]',
      tableCellBorder: 'border border-[#D4D4D8]',
      badgeBg: 'bg-[#141416] text-[#FAF9F6] border border-[#141416]',
      subtleBadge: 'bg-[#ECEAE4] text-[#141416] border border-[#141416]',
      accentText: 'text-[#0047FF]',
      metaBoxBg: 'bg-[#FAF9F6] border-2 border-[#141416] text-[#141416]',
      checkboxBorder: 'border border-[#141416] bg-white',
      physicsTag: 'bg-[#EFF6FF] text-[#0047FF] border border-[#0047FF] font-black',
      chemistryTag: 'bg-[#FAF5FF] text-[#7E22CE] border border-[#7E22CE] font-black',
      botanyTag: 'bg-[#FEF3C7] text-[#B45309] border border-[#D97706] font-black',
      zoologyTag: 'bg-[#FFF7ED] text-[#C2410C] border border-[#C2410C] font-black',
      physicsCard: 'border border-[#0047FF] bg-[#EFF6FF]/40',
      chemistryCard: 'border border-[#7E22CE] bg-[#FAF5FF]/40',
      botanyCard: 'border border-[#D97706] bg-[#FEF3C7]/40',
      zoologyCard: 'border border-[#C2410C] bg-[#FFF7ED]/40',
      divider: 'border-[#141416]',
      boxBg: 'bg-[#FAF9F6]',
    };
  }, [colorMode]);

  // 1-Click Preset Reconfigurator
  const applyPreset = (presetKey: string) => {
    sound.playButtonClick();
    if (presetKey === 'desk-bw') {
      setLayoutStyle('table');
      setColorMode('bw');
      setDensity('compact');
      setSyllabusFormat('structured-subjects');
      setChapterMarker('numbered');
      setChecklistType('single-checkbox');
      setShowIndex(true);
      setShowDate(true);
      setShowDayOfWeek(true);
      setShowCountdown(false);
      setShowCoaching(true);
      setShowTestTitle(true);
      setShowChapterCount(true);
      setShowScoreSlot(true);
      setShowSubjectScores(false);
      setShowMistakeLog(false);
    } else if (presetKey === 'flight-plan') {
      setLayoutStyle('table');
      setColorMode('vibrant-subject');
      setDensity('comfortable');
      setSyllabusFormat('structured-subjects');
      setChapterMarker('numbered');
      setChecklistType('5-pillars');
      setShowIndex(true);
      setShowDate(true);
      setShowDayOfWeek(true);
      setShowCountdown(true);
      setShowCoaching(true);
      setShowTestTitle(true);
      setShowChapterCount(true);
      setShowScoreSlot(true);
      setShowSubjectScores(true);
      setShowMistakeLog(true);
    } else if (presetKey === 'study-cards') {
      setLayoutStyle('cards');
      setColorMode('vibrant-subject');
      setDensity('comfortable');
      setSyllabusFormat('structured-subjects');
      setChapterMarker('numbered');
      setChecklistType('5-pillars');
      setShowIndex(true);
      setShowDate(true);
      setShowDayOfWeek(true);
      setShowCountdown(false);
      setShowCoaching(true);
      setShowTestTitle(true);
      setShowChapterCount(true);
      setShowScoreSlot(true);
      setShowSubjectScores(true);
      setShowMistakeLog(true);
    } else if (presetKey === 'subject-matrix') {
      setLayoutStyle('subject-matrix');
      setColorMode('vibrant-subject');
      setDensity('comfortable');
      setSyllabusFormat('structured-subjects');
      setChapterMarker('numbered');
      setChecklistType('single-checkbox');
      setShowIndex(true);
      setShowDate(true);
      setShowDayOfWeek(true);
      setShowCountdown(false);
      setShowCoaching(true);
      setShowTestTitle(true);
      setShowChapterCount(true);
      setShowScoreSlot(true);
      setShowSubjectScores(false);
      setShowMistakeLog(false);
    } else if (presetKey === 'clean-datesheet') {
      setLayoutStyle('minimal-datesheet');
      setColorMode('bw');
      setDensity('compact');
      setSyllabusFormat('none');
      setChapterMarker('none');
      setChecklistType('none');
      setShowIndex(true);
      setShowDate(true);
      setShowDayOfWeek(true);
      setShowCountdown(false);
      setShowCoaching(true);
      setShowTestTitle(true);
      setShowChapterCount(false);
      setShowScoreSlot(true);
      setShowSubjectScores(false);
      setShowMistakeLog(false);
    }
  };

  // Extract all page and runtime styles to achieve 100% preview fidelity
  const getDocumentStylesHTML = () => {
    let styles = '';
    try {
      const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
      styleElements.forEach((el) => {
        styles += el.outerHTML + '\n';
      });
    } catch (e) {
      console.warn('Failed to extract document styles:', e);
    }
    return styles;
  };

  // Trigger Isolated Print to PDF / Paper (Strictly A4, No UI, 100% Identical to Preview)
  const handlePrint = () => {
    sound.playButtonClick();
    if (!printAreaRef.current) {
      window.print();
      return;
    }

    // Clean up any existing print frame
    const existingFrame = document.getElementById('pcb01-isolated-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const printFrame = document.createElement('iframe');
    printFrame.id = 'pcb01-isolated-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '1px';
    printFrame.style.height = '1px';
    printFrame.style.border = 'none';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) {
      window.print();
      return;
    }

    const printableHtml = printAreaRef.current.innerHTML;
    const documentStyles = getDocumentStylesHTML();

    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NEET Test Schedule - ${customStudentName || 'Aspirant'}</title>
  <!-- Full Tailwind Engine for exact preview fidelity -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts matching the app -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${documentStyles}
  <style>
    @page {
      size: ${paperOrientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
      margin: 8mm 8mm 8mm 8mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      width: 100%;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #000000 !important;
      background-color: #FFFFFF !important;
      line-height: 1.35;
      font-size: ${density === 'compact' ? '9.5px' : density === 'roomy' ? '12px' : '10.5px'};
      padding: 0;
      margin: 0;
    }

    /* Prevent cutting through the middle of elements */
    .test-card, tr, .subject-card {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    table {
      width: 100% !important;
      border-collapse: collapse !important;
      page-break-inside: auto !important;
    }

    thead {
      display: table-header-group !important;
    }

    tbody {
      display: table-row-group !important;
    }

    th, td {
      vertical-align: top;
    }
  </style>
</head>
<body class="bg-white text-black p-3 sm:p-4">
  <div class="space-y-4 max-w-full">
    ${printableHtml}
  </div>
</body>
</html>`);
    frameDoc.close();

    // Trigger isolated print once styling finishes applying
    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        window.print();
      }
    }, 350);
  };

  // Download Standalone HTML
  const handleDownloadHTML = () => {
    sound.playCommitSuccess();
    if (!printAreaRef.current) return;

    const printableHtml = printAreaRef.current.innerHTML;
    const documentStyles = getDocumentStylesHTML();

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NEET Test Schedule - ${customStudentName || 'Aspirant'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${documentStyles}
  <style>
    @page {
      size: ${paperOrientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #000000;
      background-color: #FFFFFF;
      line-height: 1.35;
      padding: 16px;
      font-size: ${density === 'compact' ? '9.5px' : density === 'roomy' ? '12px' : '10.5px'};
    }
    .test-card, tr, .subject-card {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    thead {
      display: table-header-group;
    }
    tbody {
      display: table-row-group;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
  </style>
</head>
<body class="bg-white text-black p-4">
  <div class="space-y-4 max-w-full">
    ${printableHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEET_Test_Schedule_${customStudentName.replace(/\s+/g, '_')}_${todayStr}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy Plain Text / Markdown
  const handleCopyMarkdown = () => {
    sound.playKeyClick();
    let text = `# NEET TEST SERIES FLIGHT SCHEDULE\n`;
    text += `Student: ${customStudentName} | Target Score: ${targetScore}\n`;
    text += `Generated on: ${todayStr} | Total Tests: ${filteredTests.length}\n\n`;

    filteredTests.forEach((t, i) => {
      const parsed = parseDateParts(t.date);
      const daysAway = getDaysDifference(todayStr, t.date);
      const score = scoreMap.get(t.id);

      text += `### ${i + 1}. ${t.name} (${t.coachingName || 'Coaching'})\n`;
      text += `- Date: ${t.date} (${parsed.dayName}, ${parsed.formatted})${
        showCountdown
          ? daysAway === 0
            ? ' [DUE TODAY]'
            : daysAway > 0
            ? ` [In ${daysAway} days]`
            : ` [Past]`
          : ''
      }\n`;
      if (score) {
        text += `- Result: ${score.totalScore}/${score.maxScore} marks\n`;
      }
      if (syllabusFormat !== 'none') {
        text += `- Scope: ${t.subjectOrScope}\n`;
        if (t.linkedChapterIds.length > 0) {
          text += `- Chapters:\n`;
          t.linkedChapterIds.forEach((id, chIndex) => {
            const ch = chapterMap.get(id);
            if (ch) {
              text += `  ${chIndex + 1}. [ ] [${ch.subject}] ${ch.name}\n`;
            }
          });
        }
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      id="test-schedule-print-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-[#141416]/85 backdrop-blur-xs overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Studio Chassis Window */}
      <div className="te-chassis-card bg-[#FAF9F6] border-2 border-[#141416] shadow-[8px_8px_0px_#141416] w-full max-w-[98vw] xl:max-w-[1400px] h-[96vh] flex flex-col rounded-[6px] overflow-hidden">
        
        {/* ========================================================================= */}
        {/* TOP COMMAND BAR */}
        {/* ========================================================================= */}
        <div className="no-print print-workbench-panel p-3 bg-[#ECEAE4] border-b-2 border-[#141416] flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[3px] bg-[#141416] text-[#FAF9F6] flex items-center justify-center font-mono font-black text-sm shrink-0">
              <Printer className="w-4 h-4 text-[#FF3B00]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-[#FF3B00] text-white">
                  PDF & Print Studio Pro
                </span>
                <span className="text-xs font-mono font-bold text-[#5C5A52]">
                  {filteredTests.length} Tests In Scope
                </span>
              </div>
              <h2 className="font-mono text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight">
                NEET Test Series Print & Timetable Engine
              </h2>
            </div>
          </div>

          {/* Quick Actions & Print Triggers */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-[#FAF9F6] border border-[#141416] rounded-[3px] p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(65, z - 10))}
                className="p-1 hover:bg-[#ECEAE4] cursor-pointer"
                title="Zoom Out Preview"
              >
                <ZoomOut className="w-3.5 h-3.5 text-[#5C5A52]" />
              </button>
              <span className="px-1.5 font-bold text-[10px]">{zoomLevel}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="p-1 hover:bg-[#ECEAE4] cursor-pointer"
                title="Zoom In Preview"
              >
                <ZoomIn className="w-3.5 h-3.5 text-[#5C5A52]" />
              </button>
            </div>

            <button
              type="button"
              id="copy-schedule-markdown-btn"
              onClick={handleCopyMarkdown}
              className="te-btn-mechanical px-2.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold bg-[#FAF9F6]"
              title="Copy plain text timetable to clipboard"
            >
              {copiedNotification ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#0047FF]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#5C5A52]" />
                  <span className="hidden sm:inline">Copy Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="download-html-schedule-btn"
              onClick={handleDownloadHTML}
              className="te-btn-mechanical px-2.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer font-bold bg-[#FAF9F6]"
              title="Download standalone printable HTML file"
            >
              <Download className="w-3.5 h-3.5 text-[#0047FF]" />
              <span className="hidden sm:inline">Save HTML</span>
            </button>

            <button
              type="button"
              id="trigger-print-schedule-btn"
              onClick={handlePrint}
              className="te-btn-orange px-4 py-1.5 text-xs flex items-center gap-2 cursor-pointer font-black shadow-[2px_2px_0px_#141416]"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print to PDF / Paper</span>
            </button>

            <button
              type="button"
              id="close-print-modal-btn"
              onClick={() => {
                sound.playModalClose();
                onClose();
              }}
              className="p-1.5 rounded-[3px] border-2 border-[#141416] bg-[#ECEAE4] hover:bg-[#141416] hover:text-[#FAF9F6] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1-CLICK INSTANT PRESET BAR */}
        {/* ========================================================================= */}
        <div className="no-print print-workbench-panel bg-[#E2DFD7] px-3 py-1.5 border-b border-[#141416] flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#FF3B00]" />
            <span className="font-black uppercase text-[#141416] text-[10px]">1-Click Presets:</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: 'desk-bw', label: '📌 Desk Table (B&W)', desc: 'Laser-safe compact table for wall pin-up' },
              { id: 'flight-plan', label: '🚀 Flight Plan (Color)', desc: 'Score slots + countdowns + vibrant colors' },
              { id: 'study-cards', label: '📝 5-Pillars Cards', desc: 'Study cards with full chapter breakdowns' },
              { id: 'subject-matrix', label: '🔬 4-Subject Split Grid', desc: 'Phy/Chem/Bot/Zoo segregated columns' },
              { id: 'clean-datesheet', label: '⚡ Clean Date Sheet', desc: 'Ultra-minimal exam date list' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="px-2.5 py-1 bg-[#FAF9F6] border border-[#141416] hover:bg-[#141416] hover:text-[#FAF9F6] rounded-[2px] font-bold text-[10px] cursor-pointer transition-colors whitespace-nowrap shadow-xs"
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN STUDIO WORKSPACE (SPLIT VIEW: CONFIG SIDEBAR + LIVE CANVAS) */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* ======================================================================= */}
          {/* LEFT: INTERACTIVE CONFIGURATION SIDEBAR */}
          {/* ======================================================================= */}
          <div className="w-full md:w-[350px] lg:w-[380px] bg-[#ECEAE4] border-r-2 border-[#141416] flex flex-col overflow-y-auto shrink-0 print-workbench-panel">
            
            {/* Search Filter Strip */}
            <div className="p-2.5 border-b border-[#D5D2C8] bg-[#FAF9F6]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C8A82]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by test, date, chapter..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#141416] rounded-[2px] text-xs font-mono placeholder:text-[#8C8A82]"
                />
              </div>
            </div>

            {/* Accordion Config Groups */}
            <div className="p-2.5 space-y-2 font-mono text-xs">

              {/* 1. TEMPLATE & LAYOUT ARCHITECTURE */}
              <div className="border border-[#141416] bg-[#FAF9F6] rounded-[3px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'layout' ? ('' as any) : 'layout')}
                  className="w-full p-2 bg-[#E2DFD7] flex items-center justify-between font-bold text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#FF3B00]" />
                    <span className="font-black text-[11px] uppercase">1. Template & Layout</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      expandedSection === 'layout' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSection === 'layout' && (
                  <div className="p-2.5 space-y-2.5">
                    <div>
                      <label className="text-[10px] text-[#5C5A52] font-black uppercase block mb-1">
                        Layout Template:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'table', label: 'Timeline Table', icon: FileSpreadsheet },
                          { key: 'cards', label: 'Study Cards', icon: LayoutGrid },
                          { key: 'subject-matrix', label: '4-Subject Grid', icon: Columns },
                          { key: 'minimal-datesheet', label: 'Minimal Date Sheet', icon: Calendar },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = layoutStyle === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => {
                                sound.playKeyClick();
                                setLayoutStyle(item.key as LayoutStyle);
                              }}
                              className={`p-2 flex items-center gap-1.5 rounded-[2px] border text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#141416] text-[#FAF9F6] border-[#141416] font-bold shadow-xs'
                                  : 'bg-white text-[#141416] border-[#D5D2C8] hover:border-[#141416]'
                              }`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF3B00]' : 'text-[#8C8A82]'}`} />
                              <span className="text-[10px]">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Paper Orientation & Density */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2DFD7]">
                      <div>
                        <label className="text-[10px] text-[#5C5A52] font-black uppercase block mb-1">
                          Orientation:
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playKeyClick();
                              setPaperOrientation('portrait');
                            }}
                            className={`py-1 text-center rounded-[2px] border text-[10px] font-bold cursor-pointer ${
                              paperOrientation === 'portrait'
                                ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                                : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                            }`}
                          >
                            Portrait
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playKeyClick();
                              setPaperOrientation('landscape');
                            }}
                            className={`py-1 text-center rounded-[2px] border text-[10px] font-bold cursor-pointer ${
                              paperOrientation === 'landscape'
                                ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                                : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                            }`}
                          >
                            Landscape
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-[#5C5A52] font-black uppercase block mb-1">
                          Density:
                        </label>
                        <select
                          value={density}
                          onChange={(e) => {
                            sound.playKeyClick();
                            setDensity(e.target.value as Density);
                          }}
                          className="w-full py-1 px-1.5 bg-white border border-[#141416] rounded-[2px] text-[10px] font-bold cursor-pointer"
                        >
                          <option value="compact">Compact (Dense)</option>
                          <option value="comfortable">Comfortable</option>
                          <option value="roomy">Roomy (Handwriting)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. COLOR THEMES & INK PROFILES */}
              <div className="border border-[#141416] bg-[#FAF9F6] rounded-[3px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'color' ? ('' as any) : 'color')}
                  className="w-full p-2 bg-[#E2DFD7] flex items-center justify-between font-bold text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#0047FF]" />
                    <span className="font-black text-[11px] uppercase">2. Color Profiles & Ink</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      expandedSection === 'color' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSection === 'color' && (
                  <div className="p-2.5 space-y-1.5">
                    {[
                      {
                        key: 'vibrant-subject',
                        title: '🌈 4-Subject Color Coding (High Visibility)',
                        desc: 'Physics Blue, Chemistry Purple, Botany Amber/Gold, Zoology Crimson/Orange',
                        badgeClass: 'bg-[#EFF6FF] text-[#0047FF] border-[#0047FF]',
                      },
                      {
                        key: 'bw',
                        title: '🖤 Pure Black & White (Laser-Safe / Zero Bleed)',
                        desc: 'Crisp 1.5px black borders, white bg, clean checkboxes',
                        badgeClass: 'bg-black text-white border-black',
                      },
                      {
                        key: 'grayscale',
                        title: '🩶 Slate Monolith (Subtle Grayscale)',
                        desc: 'Cool slate borders and refined charcoal headers',
                        badgeClass: 'bg-[#475569] text-white border-[#334155]',
                      },
                      {
                        key: 'minimal-accent',
                        title: '💙 Cobalt Blueprint (Electric Blue Accent)',
                        desc: 'Clean minimal base with cobalt exam markers',
                        badgeClass: 'bg-[#0047FF] text-white border-[#0047FF]',
                      },
                      {
                        key: 'solar',
                        title: '⚡ Solar High-Contrast (Amber / Orange)',
                        desc: 'Dynamic high-energy test highlighting',
                        badgeClass: 'bg-[#FF3B00] text-white border-[#141416]',
                      },
                    ].map((c) => {
                      const isSelected = colorMode === c.key;
                      return (
                        <div
                          key={c.key}
                          onClick={() => {
                            sound.playKeyClick();
                            setColorMode(c.key as ColorMode);
                          }}
                          className={`p-2 border rounded-[2px] cursor-pointer transition-all flex items-start gap-2 ${
                            isSelected
                              ? 'bg-[#141416] text-[#FAF9F6] border-[#141416] shadow-xs'
                              : 'bg-white text-[#141416] border-[#D5D2C8] hover:border-[#141416]'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isSelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF3B00]" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-[#8C8A82]" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[10px]">{c.title}</div>
                            <div className={`text-[9px] ${isSelected ? 'text-[#D5D2C8]' : 'text-[#5C5A52]'}`}>
                              {c.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. CHAPTER NAMES, NUMBERING & CHECKLISTS */}
              <div className="border border-[#141416] bg-[#FAF9F6] rounded-[3px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'chapters' ? ('' as any) : 'chapters')}
                  className="w-full p-2 bg-[#E2DFD7] flex items-center justify-between font-bold text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#D97706]" />
                    <span className="font-black text-[11px] uppercase">3. Chapter Formatting & Lists</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      expandedSection === 'chapters' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSection === 'chapters' && (
                  <div className="p-2.5 space-y-2.5">
                    {/* Syllabus Breakdown */}
                    <div>
                      <label className="text-[10px] text-[#5C5A52] font-black uppercase block mb-1">
                        Syllabus Representation:
                      </label>
                      <div className="space-y-1">
                        {[
                          {
                            key: 'structured-subjects',
                            title: 'Complete Chapters Segregated by Subject',
                            desc: 'Full unabbreviated chapter names under Phy / Chem / Bot / Zoo',
                          },
                          {
                            key: 'scope-text',
                            title: 'Coaching Scope Text Only',
                            desc: 'Prints descriptive coaching test scope string',
                          },
                          {
                            key: 'compact-tags',
                            title: 'Compact Chapter Badges',
                            desc: 'Horizontal row of topic pills',
                          },
                          {
                            key: 'none',
                            title: 'Omit Syllabus (Date & Score Sheet Only)',
                            desc: 'Ultra-clean high-density calendar date sheet',
                          },
                        ].map((opt) => (
                          <div
                            key={opt.key}
                            onClick={() => {
                              sound.playKeyClick();
                              setSyllabusFormat(opt.key as SyllabusFormat);
                            }}
                            className={`p-1.5 border rounded-[2px] cursor-pointer flex items-center gap-2 ${
                              syllabusFormat === opt.key
                                ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                                : 'bg-white text-[#141416] border-[#D5D2C8]'
                            }`}
                          >
                            <span className="text-[10px] font-bold">{opt.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chapter Numbering & Markers */}
                    <div className="pt-2 border-t border-[#E2DFD7]">
                      <label className="text-[10px] text-[#5C5A52] font-black uppercase block mb-1">
                        Chapter Numbering / Bulleting:
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { key: 'numbered', label: '1, 2, 3... (Numbered)', icon: ListOrdered },
                          { key: 'bullet', label: '• (Bulleted)', icon: List },
                          { key: 'none', label: 'Plain Text', icon: Type },
                        ].map((m) => {
                          const isSelected = chapterMarker === m.key;
                          return (
                            <button
                              key={m.key}
                              type="button"
                              onClick={() => {
                                sound.playKeyClick();
                                setChapterMarker(m.key as ChapterMarker);
                              }}
                              className={`p-1 text-center rounded-[2px] border text-[9px] font-bold cursor-pointer ${
                                isSelected
                                  ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                                  : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                              }`}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Checklist Boxes */}
                    <div className="pt-2 border-t border-[#E2DFD7]">
                      <label className="text-[10px] text-[#5C5A52] font-black uppercase block mb-1">
                        Preparation Checkbox Format:
                      </label>
                      <div className="space-y-1">
                        {[
                          {
                            key: '5-pillars',
                            title: '5-Pillars Protocol ([ ] Lec [ ] NCERT [ ] Notes [ ] Qs [ ] Rev)',
                          },
                          {
                            key: '3-pass',
                            title: '3-Pass Revision Protocol ([ ] R1 [ ] R2 [ ] R3)',
                          },
                          {
                            key: 'single-checkbox',
                            title: 'Single Square Checkbox ([ ] Chapter)',
                          },
                          {
                            key: 'none',
                            title: 'No Checkboxes (Clean Text Only)',
                          },
                        ].map((chk) => (
                          <div
                            key={chk.key}
                            onClick={() => {
                              sound.playKeyClick();
                              setChecklistType(chk.key as ChecklistType);
                            }}
                            className={`p-1.5 border rounded-[2px] cursor-pointer flex items-center gap-1.5 ${
                              checklistType === chk.key
                                ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                                : 'bg-white text-[#141416] border-[#D5D2C8]'
                            }`}
                          >
                            <span className="text-[9px] font-bold">{chk.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. COLUMNS & DETAIL VISIBILITY */}
              <div className="border border-[#141416] bg-[#FAF9F6] rounded-[3px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'columns' ? ('' as any) : 'columns')}
                  className="w-full p-2 bg-[#E2DFD7] flex items-center justify-between font-bold text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Columns className="w-3.5 h-3.5 text-[#9333EA]" />
                    <span className="font-black text-[11px] uppercase">4. Columns & Data Slots</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      expandedSection === 'columns' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSection === 'columns' && (
                  <div className="p-2.5 space-y-1.5">
                    {[
                      { key: 'docHeader', label: 'Top Header Block (Master)', val: showDocumentHeader, set: setShowDocumentHeader },
                      { key: 'studentBadge', label: 'Student Name & Target', val: showAspirantBadge, set: setShowAspirantBadge },
                      { key: 'titleText', label: 'Document Title & Subtitle', val: showDocTitle, set: setShowDocTitle },
                      { key: 'protocolBanner', label: 'Protocol Guidelines Banner', val: showProtocolRules, set: setShowProtocolRules },
                      { key: 'stats', label: 'Header Summary 4-Pack', val: showHeaderStats, set: setShowHeaderStats },
                      { key: 'index', label: 'Test # Index Column', val: showIndex, set: setShowIndex },
                      { key: 'date', label: 'Exam Date Column', val: showDate, set: setShowDate },
                      { key: 'day', label: 'Day of Week', val: showDayOfWeek, set: setShowDayOfWeek },
                      { key: 'countdown', label: 'Countdown (e.g. In 16d)', val: showCountdown, set: setShowCountdown },
                      { key: 'coaching', label: 'Series / Coaching Column', val: showCoaching, set: setShowCoaching },
                      { key: 'title', label: 'Test Title Column', val: showTestTitle, set: setShowTestTitle },
                      { key: 'count', label: 'Chapter Count Column', val: showChapterCount, set: setShowChapterCount },
                      { key: 'score', label: 'Total Score Slot', val: showScoreSlot, set: setShowScoreSlot },
                      { key: 'subScores', label: '4-Subject Marks', val: showSubjectScores, set: setShowSubjectScores },
                      { key: 'mistakes', label: 'Mistake Log Slot', val: showMistakeLog, set: setShowMistakeLog },
                      { key: 'sig', label: 'Bottom Signature Line', val: showSignatureBlock, set: setShowSignatureBlock },
                    ].map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => {
                          sound.playKeyClick();
                          col.set(!col.val);
                        }}
                        className={`w-full flex items-center justify-between p-1.5 rounded-[2px] border text-left cursor-pointer ${
                          col.val
                            ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                            : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                        }`}
                      >
                        <span className="font-bold text-[10px]">{col.label}</span>
                        {col.val ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#FF3B00]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#8C8A82]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. STUDENT META & PROTOCOL GUIDELINES */}
              <div className="border border-[#141416] bg-[#FAF9F6] rounded-[3px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedSection(expandedSection === 'meta' ? ('' as any) : 'meta')}
                  className="w-full p-2 bg-[#E2DFD7] flex items-center justify-between font-bold text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span className="font-black text-[11px] uppercase">5. Student Meta & Header Options</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      expandedSection === 'meta' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSection === 'meta' && (
                  <div className="p-2.5 space-y-2">
                    {/* Header Removal Quick Buttons */}
                    <div className="p-1.5 bg-[#E2DFD7] border border-[#141416] rounded-[2px] space-y-1">
                      <div className="text-[9px] font-black uppercase text-[#141416]">Header Visibility:</div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playKeyClick();
                            setShowDocumentHeader(!showDocumentHeader);
                          }}
                          className={`p-1 rounded-[2px] border text-[9px] font-bold cursor-pointer text-center ${
                            showDocumentHeader
                              ? 'bg-[#141416] text-white border-[#141416]'
                              : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                          }`}
                        >
                          {showDocumentHeader ? '✓ Entire Header ON' : '✗ Header Removed'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playKeyClick();
                            setShowAspirantBadge(!showAspirantBadge);
                          }}
                          className={`p-1 rounded-[2px] border text-[9px] font-bold cursor-pointer text-center ${
                            showAspirantBadge
                              ? 'bg-[#141416] text-white border-[#141416]'
                              : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                          }`}
                        >
                          {showAspirantBadge ? '✓ Student Name ON' : '✗ Student Removed'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-[#5C5A52] font-black uppercase block mb-0.5">
                        Aspirant Name:
                      </label>
                      <input
                        type="text"
                        value={customStudentName}
                        onChange={(e) => setCustomStudentName(e.target.value)}
                        className="w-full p-1 bg-white border border-[#141416] rounded-[2px] text-xs font-bold font-mono"
                        placeholder="Leave blank or disable toggle to remove"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-[#5C5A52] font-black uppercase block mb-0.5">
                        Target Score:
                      </label>
                      <input
                        type="text"
                        value={targetScore}
                        onChange={(e) => setTargetScore(e.target.value)}
                        className="w-full p-1 bg-white border border-[#141416] rounded-[2px] text-xs font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-[#5C5A52] font-black uppercase block mb-0.5">
                        Batch / Document Title:
                      </label>
                      <input
                        type="text"
                        value={aspirantBatch}
                        onChange={(e) => setAspirantBatch(e.target.value)}
                        className="w-full p-1 bg-white border border-[#141416] rounded-[2px] text-xs font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-[#5C5A52] font-black uppercase block mb-0.5">
                        Protocol Guidelines Banner:
                      </label>
                      <textarea
                        rows={2}
                        value={customGuidelines}
                        onChange={(e) => setCustomGuidelines(e.target.value)}
                        className="w-full p-1 bg-white border border-[#141416] rounded-[2px] text-[10px] font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Coaching & Horizon Quick Filters */}
              <div className="p-2 bg-[#FAF9F6] border border-[#141416] rounded-[3px] space-y-2">
                <div>
                  <label className="text-[9px] text-[#5C5A52] font-black uppercase block mb-1">
                    Coaching Filter:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setCoachingFilter('ALL')}
                      className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-bold cursor-pointer ${
                        coachingFilter === 'ALL'
                          ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                          : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                      }`}
                    >
                      ALL
                    </button>
                    {availableCoachings.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCoachingFilter(c)}
                        className={`px-2 py-0.5 rounded-[2px] border text-[9px] font-bold cursor-pointer ${
                          coachingFilter === c
                            ? 'bg-[#141416] text-[#FAF9F6] border-[#141416]'
                            : 'bg-white text-[#5C5A52] border-[#D5D2C8]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-[#5C5A52] font-black uppercase block mb-1">
                    Time Horizon:
                  </label>
                  <select
                    value={horizonFilter}
                    onChange={(e) => setHorizonFilter(e.target.value as HorizonFilter)}
                    className="w-full p-1 bg-white border border-[#141416] rounded-[2px] text-[10px] font-bold"
                  >
                    <option value="upcoming">Upcoming Exams Only</option>
                    <option value="all">All Dates (Full Year)</option>
                    <option value="30days">Next 30 Days</option>
                    <option value="60days">Next 60 Days</option>
                    <option value="90days">Next 90 Days</option>
                    <option value="past">Past / Completed Tests</option>
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================================= */}
          {/* RIGHT: LIVE INTERACTIVE PREVIEW CANVAS */}
          {/* ======================================================================= */}
          <div className="flex-1 bg-[#D5D2C8] overflow-y-auto p-2 sm:p-4 flex justify-center items-start">
            
            {/* Scaled Printable Document Sheet */}
            <div
              ref={printAreaRef}
              id="pcb01-printable-schedule"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                width: paperOrientation === 'landscape' ? '1120px' : '820px',
                minHeight: '1000px',
                transition: 'width 0.2s ease, transform 0.15s ease',
              }}
              className="bg-white text-black p-6 sm:p-8 shadow-[6px_6px_0px_rgba(0,0,0,0.3)] border-2 border-black rounded-[2px] space-y-4"
            >
              {/* Document Header (Fully Removable) */}
              {showDocumentHeader && (
                <div className="border-b-2 border-black pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {showDocTitle && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${theme.badgeBg}`}>
                            NEET-UG CRACK PROTOCOL
                          </span>
                          <span className="text-[10px] font-mono font-bold text-[#5C5A52]">
                            {filteredTests.length} TEST SCHEDULE
                          </span>
                        </div>
                        <h1 className="text-base sm:text-xl font-black uppercase tracking-tight font-mono text-black">
                          {aspirantBatch}
                        </h1>
                        <p className="text-[10px] sm:text-[11px] text-[#5C5A52] font-mono mt-0.5">
                          Official Coaching Test Flight Schedule • Generated {todayStr}
                        </p>
                      </div>
                    )}

                    {/* Aspirant Details Box (Removable) */}
                    {showAspirantBadge && (
                      <div className={`text-right font-mono shrink-0 p-2 rounded-[2px] ${theme.metaBoxBg}`}>
                        <div className="text-[8px] text-[#5C5A52] uppercase font-bold">Aspirant</div>
                        <div className="text-xs font-black uppercase">{customStudentName}</div>
                        <div className={`text-[9px] font-black uppercase mt-0.5 ${theme.accentText}`}>
                          Target: {targetScore}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Protocol Rules Banner (Removable) */}
                  {showProtocolRules && customGuidelines && (
                    <div className="mt-2.5 p-1.5 bg-[#F4F4F5] border border-black text-[10px] font-mono text-black rounded-[2px]">
                      <strong className="uppercase">Protocol:</strong> {customGuidelines}
                    </div>
                  )}

                  {/* Header Stats (Removable) */}
                  {showHeaderStats && (
                    <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                      <div className="p-1 bg-[#FAFAFA] border border-black rounded-[2px]">
                        <div className="text-[8px] text-[#5C5A52] uppercase font-bold">Total Tests</div>
                        <div className="text-xs sm:text-sm font-black text-black">{filteredTests.length}</div>
                      </div>
                      <div className="p-1 bg-[#FAFAFA] border border-black rounded-[2px]">
                        <div className="text-[8px] text-[#5C5A52] uppercase font-bold">Next Exam</div>
                        <div className={`text-xs sm:text-sm font-black ${theme.accentText}`}>
                          {filteredTests.length > 0 && getDaysDifference(todayStr, filteredTests[0].date) >= 0
                            ? `${getDaysDifference(todayStr, filteredTests[0].date)}d away`
                            : '—'}
                        </div>
                      </div>
                      <div className="p-1 bg-[#FAFAFA] border border-black rounded-[2px]">
                        <div className="text-[8px] text-[#5C5A52] uppercase font-bold">Tests Logged</div>
                        <div className="text-xs sm:text-sm font-black text-black">
                          {filteredTests.filter((t) => scoreMap.has(t.id)).length} Tests
                        </div>
                      </div>
                      <div className="p-1 bg-[#FAFAFA] border border-black rounded-[2px]">
                        <div className="text-[8px] text-[#5C5A52] uppercase font-bold">Theme / Mode</div>
                        <div className="text-[9px] font-bold text-black mt-0.5 uppercase">
                          {colorMode}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {filteredTests.length === 0 && (
                <div className="py-12 text-center text-xs font-mono text-[#5C5A52] border border-dashed border-black rounded-[2px]">
                  No tests match the current filter selection ({coachingFilter} • {horizonFilter}).
                </div>
              )}

              {/* ================================================================= */}
              {/* VIEW 1: TIMELINE TABLE */}
              {/* ================================================================= */}
              {layoutStyle === 'table' && filteredTests.length > 0 && (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left font-mono border-collapse">
                    <thead>
                      <tr className={theme.tableHeaderBg}>
                        {showIndex && <th className="p-1.5 text-center" style={{ width: '35px' }}>#</th>}
                        {showDate && <th className="p-1.5" style={{ width: showDayOfWeek ? '110px' : '85px' }}>Date</th>}
                        {showCountdown && <th className="p-1.5 text-center" style={{ width: '75px' }}>Cadence</th>}
                        {showCoaching && <th className="p-1.5" style={{ width: '75px' }}>Series</th>}
                        {showTestTitle && <th className="p-1.5">Test Name & Complete Syllabus</th>}
                        {showChapterCount && <th className="p-1.5 text-center" style={{ width: '50px' }}>Chs</th>}
                        {showScoreSlot && <th className="p-1.5 text-center" style={{ width: '85px' }}>Total Score</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTests.map((test, index) => {
                        const dateParts = parseDateParts(test.date);
                        const daysAway = getDaysDifference(todayStr, test.date);
                        const score = scoreMap.get(test.id);
                        const linkedChapters = test.linkedChapterIds
                          .map((id) => chapterMap.get(id))
                          .filter((c): c is Chapter => Boolean(c));

                        // Group chapters strictly by subject
                        const subjectGroups: Record<Subject, Chapter[]> = {
                          Physics: [],
                          Chemistry: [],
                          Botany: [],
                          Zoology: [],
                        };
                        linkedChapters.forEach((ch) => {
                          subjectGroups[ch.subject].push(ch);
                        });

                        return (
                          <tr
                            key={test.id}
                            className={`border-b ${theme.divider} ${
                              density === 'compact' ? 'py-1' : density === 'roomy' ? 'py-3' : 'py-2'
                            }`}
                          >
                            {/* Index */}
                            {showIndex && (
                              <td className={`p-1.5 font-black text-[11px] align-top text-center ${theme.tableCellBorder}`}>
                                {index + 1}
                              </td>
                            )}

                            {/* Date */}
                            {showDate && (
                              <td className={`p-1.5 align-top ${theme.tableCellBorder}`}>
                                <div className="font-bold text-black text-[11px]">{test.date}</div>
                                {showDayOfWeek && dateParts.dayName && (
                                  <div className="text-[9px] text-[#5C5A52]">{dateParts.dayName}, {dateParts.formatted}</div>
                                )}
                              </td>
                            )}

                            {/* Countdown */}
                            {showCountdown && (
                              <td className={`p-1.5 align-top text-center ${theme.tableCellBorder}`}>
                                <span
                                  className={`badge ${
                                    score
                                      ? theme.subtleBadge
                                      : daysAway === 0
                                      ? 'bg-black text-white'
                                      : daysAway > 0
                                      ? theme.subtleBadge
                                      : 'bg-[#ECEAE4] text-[#5C5A52]'
                                  }`}
                                >
                                  {score
                                    ? 'DONE'
                                    : daysAway === 0
                                    ? 'TODAY'
                                    : daysAway > 0
                                    ? `IN ${daysAway}D`
                                    : 'PAST'}
                                </span>
                              </td>
                            )}

                            {/* Coaching */}
                            {showCoaching && (
                              <td className={`p-1.5 align-top ${theme.tableCellBorder}`}>
                                <span className={`badge ${theme.subtleBadge}`}>
                                  {test.coachingName || 'EXAM'}
                                </span>
                              </td>
                            )}

                            {/* Test Name & Complete Syllabus */}
                            {showTestTitle && (
                              <td className={`p-1.5 align-top ${theme.tableCellBorder}`}>
                                <div className="font-black text-black uppercase text-[11px]">{test.name}</div>

                                {/* Structured Syllabus - COMPLETE CHAPTER NAMES (No Truncation) */}
                                {syllabusFormat === 'structured-subjects' && (
                                  <div className="mt-1.5 space-y-1.5">
                                    {linkedChapters.length === 0 ? (
                                      <div className="text-[10px] text-[#5C5A52]">{test.subjectOrScope}</div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                                        {SUBJECT_LIST.map((s) => {
                                          const list = subjectGroups[s];
                                          if (list.length === 0) return null;
                                          const tagStyle =
                                            s === 'Physics'
                                              ? theme.physicsTag
                                              : s === 'Chemistry'
                                              ? theme.chemistryTag
                                              : s === 'Botany'
                                              ? theme.botanyTag
                                              : theme.zoologyTag;

                                          const cardStyle =
                                            s === 'Physics'
                                              ? theme.physicsCard
                                              : s === 'Chemistry'
                                              ? theme.chemistryCard
                                              : s === 'Botany'
                                              ? theme.botanyCard
                                              : theme.zoologyCard;

                                          return (
                                            <div key={s} className={`p-1.5 rounded-[2px] ${cardStyle}`}>
                                              <div className={`text-[8px] uppercase px-1 py-0.2 rounded mb-1 inline-block ${tagStyle}`}>
                                                {s} ({list.length})
                                              </div>
                                              <ol className="space-y-1">
                                                {list.map((ch, chIdx) => (
                                                  <li key={ch.id} className="flex items-start gap-1 text-[9.5px] leading-snug">
                                                    {/* Checkboxes */}
                                                    {checklistType === '5-pillars' ? (
                                                      <span className="flex items-center gap-0.5 text-[7px] text-[#5C5A52] shrink-0 font-mono mt-0.5">
                                                        <span className="checkbox-box" title="Lecture" /> L
                                                        <span className="checkbox-box" title="NCERT" /> B
                                                        <span className="checkbox-box" title="Notes" /> N
                                                        <span className="checkbox-box" title="Questions" /> Q
                                                        <span className="checkbox-box" title="Revision" /> R
                                                      </span>
                                                    ) : checklistType === '3-pass' ? (
                                                      <span className="flex items-center gap-0.5 text-[7px] text-[#5C5A52] shrink-0 font-mono mt-0.5">
                                                        <span className="checkbox-box" /> R1
                                                        <span className="checkbox-box" /> R2
                                                        <span className="checkbox-box" /> R3
                                                      </span>
                                                    ) : checklistType === 'single-checkbox' ? (
                                                      <span className="checkbox-box shrink-0 mt-0.5" />
                                                    ) : null}

                                                    {/* Marker */}
                                                    {chapterMarker === 'numbered' ? (
                                                      <span className="font-bold text-[#5C5A52] shrink-0">
                                                        {chIdx + 1}.
                                                      </span>
                                                    ) : chapterMarker === 'bullet' ? (
                                                      <span className="font-bold text-[#5C5A52] shrink-0">•</span>
                                                    ) : null}

                                                    {/* Full, unabbreviated chapter name with zero truncation */}
                                                    <span className="font-medium text-black break-words">
                                                      {ch.name}
                                                    </span>
                                                  </li>
                                                ))}
                                              </ol>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Scope text */}
                                {syllabusFormat === 'scope-text' && (
                                  <div className="text-[10px] text-[#5C5A52] mt-0.5">{test.subjectOrScope}</div>
                                )}

                                {/* Compact tags format */}
                                {syllabusFormat === 'compact-tags' && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {linkedChapters.map((ch, chIdx) => (
                                      <span key={ch.id} className="text-[8.5px] px-1 py-0.2 border border-black bg-[#FAFAFA] rounded-[2px]">
                                        {chapterMarker === 'numbered' ? `${chIdx + 1}. ` : ''}
                                        {ch.name}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Subject marks slots */}
                                {showSubjectScores && (
                                  <div className="mt-1 pt-1 border-t border-dashed border-black grid grid-cols-4 gap-1 text-[9px] font-mono">
                                    <div>PHY: {score?.subjectScores?.Physics ?? '___/180'}</div>
                                    <div>CHEM: {score?.subjectScores?.Chemistry ?? '___/180'}</div>
                                    <div>BOT: {score?.subjectScores?.Botany ?? '___/180'}</div>
                                    <div>ZOO: {score?.subjectScores?.Zoology ?? '___/180'}</div>
                                  </div>
                                )}

                                {/* Mistake log slot */}
                                {showMistakeLog && (
                                  <div className="mt-1 text-[8px] text-[#5C5A52] font-mono">
                                    Errors: [ ] Silly Mistake [ ] Concept Gap [ ] Time Rush | Notes: __________________
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Chapter Count */}
                            {showChapterCount && (
                              <td className={`p-1.5 align-top text-center font-bold text-[11px] ${theme.tableCellBorder}`}>
                                {test.linkedChapterIds.length}
                              </td>
                            )}

                            {/* Total Score Slot */}
                            {showScoreSlot && (
                              <td className={`p-1.5 align-top text-center font-bold text-[11px] ${theme.tableCellBorder}`}>
                                {score ? `${score.totalScore}/${score.maxScore}` : '____ / 720'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ================================================================= */}
              {/* VIEW 2: STUDY CHECKLIST CARDS */}
              {/* ================================================================= */}
              {layoutStyle === 'cards' && filteredTests.length > 0 && (
                <div className="space-y-3 font-mono">
                  {filteredTests.map((test, index) => {
                    const dateParts = parseDateParts(test.date);
                    const daysAway = getDaysDifference(todayStr, test.date);
                    const score = scoreMap.get(test.id);
                    const linkedChapters = test.linkedChapterIds
                      .map((id) => chapterMap.get(id))
                      .filter((c): c is Chapter => Boolean(c));

                    const subjectBuckets: Record<Subject, Chapter[]> = {
                      Physics: [],
                      Chemistry: [],
                      Botany: [],
                      Zoology: [],
                    };
                    linkedChapters.forEach((ch) => subjectBuckets[ch.subject].push(ch));

                    return (
                      <div
                        key={test.id}
                        className={`test-card p-3 rounded-[3px] space-y-2 ${theme.cardBorder}`}
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-black pb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {showIndex && (
                              <span className={`text-xs font-black px-1.5 py-0.2 rounded-[2px] ${theme.badgeBg}`}>
                                #{index + 1}
                              </span>
                            )}
                            {showCoaching && (
                              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-[2px] uppercase ${theme.subtleBadge}`}>
                                {test.coachingName || 'EXAM'}
                              </span>
                            )}
                            {showTestTitle && (
                              <h3 className="text-xs sm:text-sm font-black uppercase text-black">
                                {test.name}
                              </h3>
                            )}
                            {showChapterCount && (
                              <span className="text-[10px] text-[#5C5A52]">
                                ({linkedChapters.length} Chapters)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            {showDate && (
                              <span className="font-bold text-black">
                                📅 {test.date} {showDayOfWeek && dateParts.dayName ? `(${dateParts.dayName})` : ''}
                              </span>
                            )}
                            {showCountdown && (
                              <span className={`badge ${theme.badgeBg}`}>
                                {daysAway === 0 ? 'DUE TODAY' : daysAway > 0 ? `IN ${daysAway}D` : 'PAST'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Scope Text */}
                        {syllabusFormat !== 'none' && (
                          <div className="text-[11px] text-[#5C5A52]">
                            <strong className="text-black">Syllabus Scope:</strong> {test.subjectOrScope}
                          </div>
                        )}

                        {/* Linked Chapters Structured Grid */}
                        {syllabusFormat === 'structured-subjects' && linkedChapters.length > 0 && (
                          <div className="mt-1 space-y-1">
                            <div className="text-[10px] font-black uppercase text-black">
                              Complete Chapter Checklist ({linkedChapters.length} Topics):
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                              {SUBJECT_LIST.map((s) => {
                                const list = subjectBuckets[s];
                                if (list.length === 0) return null;
                                const tagStyle =
                                  s === 'Physics'
                                    ? theme.physicsTag
                                    : s === 'Chemistry'
                                    ? theme.chemistryTag
                                    : s === 'Botany'
                                    ? theme.botanyTag
                                    : theme.zoologyTag;

                                const cardStyle =
                                  s === 'Physics'
                                    ? theme.physicsCard
                                    : s === 'Chemistry'
                                    ? theme.chemistryCard
                                    : s === 'Botany'
                                    ? theme.botanyCard
                                    : theme.zoologyCard;

                                return (
                                  <div key={s} className={`p-2 rounded-[2px] ${cardStyle}`}>
                                    <div className="flex items-center justify-between pb-1 border-b border-black mb-1.5">
                                      <span className={`text-[8.5px] uppercase px-1.5 py-0.2 rounded ${tagStyle}`}>
                                        {s} ({list.length})
                                      </span>
                                    </div>

                                    <ol className="space-y-1.5">
                                      {list.map((ch, chIdx) => (
                                        <li key={ch.id} className="flex items-start justify-between gap-1.5 text-[9.5px]">
                                          <div className="flex items-start gap-1 break-words">
                                            {chapterMarker === 'numbered' ? (
                                              <span className="font-bold text-[#5C5A52] shrink-0">
                                                {chIdx + 1}.
                                              </span>
                                            ) : chapterMarker === 'bullet' ? (
                                              <span className="font-bold text-[#5C5A52] shrink-0">•</span>
                                            ) : null}
                                            <span className="font-bold text-black">{ch.name}</span>
                                          </div>

                                          {checklistType === '5-pillars' ? (
                                            <div className="flex items-center gap-1 text-[8px] text-[#5C5A52] shrink-0 font-mono mt-0.5">
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> Lec
                                              </span>
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> Bk
                                              </span>
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> Nts
                                              </span>
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> Qs
                                              </span>
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> Rev
                                              </span>
                                            </div>
                                          ) : checklistType === '3-pass' ? (
                                            <div className="flex items-center gap-1 text-[8px] text-[#5C5A52] shrink-0 font-mono mt-0.5">
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> R1
                                              </span>
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> R2
                                              </span>
                                              <span className="flex items-center">
                                                <span className="checkbox-box" /> R3
                                              </span>
                                            </div>
                                          ) : checklistType === 'single-checkbox' ? (
                                            <span className="checkbox-box shrink-0 mt-0.5" />
                                          ) : null}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Score Slots */}
                        {showScoreSlot && (
                          <div className="mt-2 pt-2 border-t border-dashed border-black grid grid-cols-2 sm:grid-cols-6 gap-1.5 text-[10px]">
                            <div className="border border-black p-1 bg-[#FAFAFA] rounded-[2px]">
                              <span className="text-[8px] text-[#5C5A52] uppercase block font-bold">Total Score</span>
                              <span className="font-bold">
                                {score ? `${score.totalScore} / ${score.maxScore}` : '_____ / 720'}
                              </span>
                            </div>

                            {showSubjectScores && (
                              <>
                                <div className="border border-black p-1 bg-[#FAFAFA] rounded-[2px]">
                                  <span className="text-[8px] text-black uppercase block font-bold">Physics</span>
                                  <span className="font-bold">
                                    {score?.subjectScores?.Physics !== undefined
                                      ? `${score.subjectScores.Physics} / 180`
                                      : '_____ / 180'}
                                  </span>
                                </div>
                                <div className="border border-black p-1 bg-[#FAFAFA] rounded-[2px]">
                                  <span className="text-[8px] text-black uppercase block font-bold">Chemistry</span>
                                  <span className="font-bold">
                                    {score?.subjectScores?.Chemistry !== undefined
                                      ? `${score.subjectScores.Chemistry} / 180`
                                      : '_____ / 180'}
                                  </span>
                                </div>
                                <div className="border border-black p-1 bg-[#FAFAFA] rounded-[2px]">
                                  <span className="text-[8px] text-black uppercase block font-bold">Botany</span>
                                  <span className="font-bold">
                                    {score?.subjectScores?.Botany !== undefined
                                      ? `${score.subjectScores.Botany} / 180`
                                      : '_____ / 180'}
                                  </span>
                                </div>
                                <div className="border border-black p-1 bg-[#FAFAFA] rounded-[2px]">
                                  <span className="text-[8px] text-black uppercase block font-bold">Zoology</span>
                                  <span className="font-bold">
                                    {score?.subjectScores?.Zoology !== undefined
                                      ? `${score.subjectScores.Zoology} / 180`
                                      : '_____ / 180'}
                                  </span>
                                </div>
                              </>
                            )}

                            {showMistakeLog && (
                              <div className="border border-black p-1 bg-[#FAFAFA] rounded-[2px] sm:col-span-2">
                                <span className="text-[8px] text-black uppercase block font-bold">Mistake Analysis</span>
                                <span className="text-[9px]">
                                  [ ] Silly [ ] Concept [ ] Speed
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ================================================================= */}
              {/* VIEW 3: 4-SUBJECT MATRIX GRID */}
              {/* ================================================================= */}
              {layoutStyle === 'subject-matrix' && filteredTests.length > 0 && (
                <div className="space-y-3 font-mono">
                  {filteredTests.map((test, index) => {
                    const dateParts = parseDateParts(test.date);
                    const daysAway = getDaysDifference(todayStr, test.date);
                    const score = scoreMap.get(test.id);

                    const subjectBuckets: Record<Subject, Chapter[]> = {
                      Physics: [],
                      Chemistry: [],
                      Botany: [],
                      Zoology: [],
                    };
                    test.linkedChapterIds.forEach((id) => {
                      const ch = chapterMap.get(id);
                      if (ch) subjectBuckets[ch.subject].push(ch);
                    });

                    return (
                      <div
                        key={test.id}
                        className={`test-card p-3 rounded-[3px] space-y-2 ${theme.cardBorder}`}
                      >
                        <div className="flex items-center justify-between border-b border-black pb-1.5 flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            {showIndex && <span className={`badge ${theme.badgeBg}`}>#{index + 1}</span>}
                            {showTestTitle && <span className="font-black text-xs uppercase">{test.name}</span>}
                            {showCoaching && <span className="text-[10px] text-[#5C5A52]">({test.coachingName || 'EXAM'})</span>}
                          </div>
                          <div className="text-xs font-bold">
                            {showDate && (
                              <span>
                                {test.date} {showDayOfWeek && dateParts.dayName ? `(${dateParts.dayName})` : ''} •{' '}
                              </span>
                            )}
                            {showScoreSlot && (
                              <span>
                                {score ? `Score: ${score.totalScore}/720` : showCountdown ? `Due in ${daysAway}d` : 'Score: ____ / 720'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4-Subject Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px]">
                          {SUBJECT_LIST.map((s) => {
                            const list = subjectBuckets[s];
                            const tagStyle =
                              s === 'Physics'
                                ? theme.physicsTag
                                : s === 'Chemistry'
                                ? theme.chemistryTag
                                : s === 'Botany'
                                ? theme.botanyTag
                                : theme.zoologyTag;

                            const cardStyle =
                              s === 'Physics'
                                ? theme.physicsCard
                                : s === 'Chemistry'
                                ? theme.chemistryCard
                                : s === 'Botany'
                                ? theme.botanyCard
                                : theme.zoologyCard;

                            return (
                              <div key={s} className={`p-1.5 rounded-[2px] ${cardStyle}`}>
                                <div className={`font-black uppercase text-[9px] pb-1 border-b border-black ${tagStyle}`}>
                                  {s} ({list.length})
                                </div>
                                {list.length === 0 ? (
                                  <div className="text-[#8C8A82] italic text-[8.5px] mt-1">No chapters linked</div>
                                ) : (
                                  <ol className="mt-1 space-y-1">
                                    {list.map((ch, chIdx) => (
                                      <li key={ch.id} className="flex items-start gap-1 text-[9px] text-black">
                                        {checklistType !== 'none' && (
                                          <span className="checkbox-box shrink-0 mt-0.5" />
                                        )}
                                        {chapterMarker === 'numbered' ? (
                                          <span className="font-bold text-[#5C5A52] shrink-0">
                                            {chIdx + 1}.
                                          </span>
                                        ) : chapterMarker === 'bullet' ? (
                                          <span className="font-bold text-[#5C5A52] shrink-0">•</span>
                                        ) : null}
                                        <span className="break-words font-medium">{ch.name}</span>
                                      </li>
                                    ))}
                                  </ol>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ================================================================= */}
              {/* VIEW 4: MINIMAL DATE SHEET */}
              {/* ================================================================= */}
              {layoutStyle === 'minimal-datesheet' && filteredTests.length > 0 && (
                <div className="w-full font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={theme.tableHeaderBg}>
                        <th className="p-1.5 text-center" style={{ width: '40px' }}>#</th>
                        <th className="p-1.5" style={{ width: '120px' }}>Date</th>
                        <th className="p-1.5" style={{ width: '90px' }}>Series</th>
                        <th className="p-1.5">Exam Name</th>
                        <th className="p-1.5 text-center" style={{ width: '100px' }}>Result / Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTests.map((test, index) => {
                        const dateParts = parseDateParts(test.date);
                        const score = scoreMap.get(test.id);

                        return (
                          <tr key={test.id} className={`border-b ${theme.divider} py-1.5`}>
                            <td className={`p-2 text-center font-black ${theme.tableCellBorder}`}>{index + 1}</td>
                            <td className={`p-2 ${theme.tableCellBorder}`}>
                              <div className="font-black text-xs">{test.date}</div>
                              <div className="text-[9px] text-[#5C5A52]">{dateParts.dayName}</div>
                            </td>
                            <td className={`p-2 ${theme.tableCellBorder}`}>
                              <span className={`badge ${theme.subtleBadge}`}>{test.coachingName || 'EXAM'}</span>
                            </td>
                            <td className={`p-2 ${theme.tableCellBorder}`}>
                              <div className="font-black text-xs uppercase">{test.name}</div>
                              <div className="text-[10px] text-[#5C5A52]">{test.subjectOrScope}</div>
                            </td>
                            <td className={`p-2 text-center font-bold ${theme.tableCellBorder}`}>
                              {score ? `${score.totalScore}/${score.maxScore}` : '____ / 720'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Document Signature & Verification Footer */}
              {showSignatureBlock && (
                <div className={`mt-6 pt-3 border-t-2 ${theme.divider} flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[#5C5A52]`}>
                  <div>
                    Printed via <strong>PCB-01 NEET Study Console</strong> • Spaced Repetition Engine
                  </div>
                  <div className="text-right">
                    Aspirant Signature: ______________________ • Date: ____________
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
