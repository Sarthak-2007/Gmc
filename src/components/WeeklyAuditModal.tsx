import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  Copy,
  Check,
  Layers,
  ClipboardCheck,
  Target,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Chapter, StudyLog, SyllabusPacingSettings, Test, TestScore } from '../types';
import {
  calculateMemoryRetention,
  calculateSyllabusPacing,
  getDaysDifference,
  getDecayPreventedStats,
  getTodayStr,
} from '../services/spacedRepetition';
import { sound } from '../services/soundEffects';

interface WeeklyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  studyLogs: StudyLog[];
  tests: Test[];
  testScores: TestScore[];
  pacingSettings?: SyllabusPacingSettings;
  onOpenQuickLogForChapter: (chapterId: string) => void;
  onOpenLogScoreForTest?: (testId: string) => void;
}

export const WeeklyAuditModal: React.FC<WeeklyAuditModalProps> = ({
  isOpen,
  onClose,
  chapters,
  studyLogs,
  tests,
  testScores,
  pacingSettings = {
    targetSyllabusDate: '2026-12-31',
    targetExamDate: '2027-05-02',
    targetRevisionPasses: 3,
    targetMockTestsCount: 25,
    includeAllTestsGoal: true,
    studyDaysPerWeek: 7,
  },
  onOpenQuickLogForChapter,
  onOpenLogScoreForTest,
}) => {
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  const todayStr = getTodayStr();

  // Past 7 days study logs (sorted chronologically ascending)
  const weekLogs = useMemo(() => {
    return studyLogs
      .filter((l) => {
        const diff = getDaysDifference(l.dateStudied, todayStr);
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [studyLogs, todayStr]);

  const weekUniqueChapters = useMemo(() => new Set(weekLogs.map((l) => l.chapterId)), [weekLogs]);

  // Chapter lookup map
  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);

  // Tests that occurred/were scheduled in the past 7 days OR had scores recorded in the past 7 days
  const weekTests = useMemo(() => {
    const list: Test[] = tests.filter((t) => {
      const diff = getDaysDifference(t.date, todayStr);
      return diff >= 0 && diff <= 7;
    });

    const testIdSet = new Set(list.map((t) => t.id));

    testScores.forEach((s) => {
      const scoreDiff = getDaysDifference(s.dateRecorded, todayStr);
      if (scoreDiff >= 0 && scoreDiff <= 7 && !testIdSet.has(s.testId)) {
        const foundTest = tests.find((t) => t.id === s.testId);
        if (foundTest) {
          list.push(foundTest);
          testIdSet.add(foundTest.id);
        }
      }
    });

    return list
      .map((t) => {
        const score = testScores.find((s) => s.testId === t.id);
        const daysAgo = getDaysDifference(t.date, todayStr);
        return {
          test: t,
          score,
          isLogged: !!score,
          daysAgo,
        };
      })
      .sort((a, b) => b.daysAgo - a.daysAgo);
  }, [tests, testScores, todayStr]);

  // Next upcoming test if no test in the past 7 days
  const upcomingTest = useMemo(() => {
    const future = tests
      .filter((t) => getDaysDifference(todayStr, t.date) > 0)
      .sort((a, b) => getDaysDifference(todayStr, a.date) - getDaysDifference(todayStr, b.date));
    return future.length > 0 ? future[0] : null;
  }, [tests, todayStr]);

  // Test scores recorded in the past 7 days
  const weekScores = useMemo(() => {
    return testScores.filter((s) => {
      const diff = getDaysDifference(s.dateRecorded, todayStr);
      return diff >= 0 && diff <= 7;
    });
  }, [testScores, todayStr]);

  // Calculate memory decay
  const activeChapters = chapters.filter((c) => !c.isArchived);
  const criticalDecayChapters = activeChapters
    .map((c) => ({ chapter: c, retention: calculateMemoryRetention(c, todayStr) }))
    .filter((x) => x.retention.decayStatus === 'critical');

  const warningDecayChapters = activeChapters
    .map((c) => ({ chapter: c, retention: calculateMemoryRetention(c, todayStr) }))
    .filter((x) => x.retention.decayStatus === 'warning');

  const { totalSavedCount } = getDecayPreventedStats(chapters, studyLogs);
  const pacing = calculateSyllabusPacing(chapters, studyLogs, tests, testScores, pacingSettings, todayStr);

  // Negative marks bleed from tests in the past 7 days
  let weekNegativeMarks = 0;
  let weekSillyMistakes = 0;
  let weekConceptualGaps = 0;
  let weekMemoryRecall = 0;
  weekScores.forEach((s) => {
    weekNegativeMarks += s.incorrectQuestions || 0;
    if (s.errors) {
      weekSillyMistakes += s.errors.sillyMistakes || 0;
      weekConceptualGaps += s.errors.conceptualGaps || 0;
      weekMemoryRecall += s.errors.memoryRecall || 0;
    }
  });

  // Standardized Round / Stage Label across all study logs:
  // Strictly: "1ST PASS" or "REV 1", "REV 2", "REV 3", etc.
  const getStandardRoundLabel = (log: StudyLog): string => {
    if (log.sessionType === 'first_pass_complete' || log.sessionType === 'progress' || log.revisionNumber <= 1) {
      return '1ST PASS';
    }
    if (log.sessionType === 'revision_round_complete' || log.revisionNumber > 1) {
      const revNum = log.revisionNumber > 1 ? log.revisionNumber - 1 : 1;
      return `REV ${revNum}`;
    }
    return '1ST PASS';
  };

  // Helper for computing test score percentage and accuracy
  const getScorePercentage = (s?: TestScore) => {
    if (!s) return 0;
    const max = s.maxScore || 720;
    return Math.round((s.totalScore / max) * 100);
  };

  const getScoreAccuracy = (s?: TestScore) => {
    if (!s) return null;
    if (s.totalQuestions && s.totalQuestions > 0 && s.correctQuestions !== undefined) {
      return Math.round((s.correctQuestions / s.totalQuestions) * 100);
    }
    const attempted = (s.correctQuestions || 0) + (s.incorrectQuestions || 0);
    if (attempted > 0) {
      return Math.round(((s.correctQuestions || 0) / attempted) * 100);
    }
    return null;
  };

  // Discipline Grade (100% free of green color: monochrome + cobalt + amber)
  const disciplineScore = Math.min(
    100,
    Math.round(
      (weekLogs.length >= 7 ? 40 : (weekLogs.length / 7) * 40) +
        (weekTests.length > 0 && weekTests.every((t) => t.isLogged) ? 30 : weekTests.length === 0 ? 25 : 10) +
        (criticalDecayChapters.length === 0 ? 30 : Math.max(0, 30 - criticalDecayChapters.length * 5))
    )
  );

  const disciplineTier =
    disciplineScore >= 90
      ? 'APEX S-TIER (SOVEREIGN DISCIPLINE)'
      : disciplineScore >= 75
      ? 'SUPERIOR A-TIER (HIGH ORBIT STABILITY)'
      : disciplineScore >= 60
      ? 'PROFICIENT B-TIER (SOLID FOUNDATION)'
      : 'DEVELOPING C-TIER (URGENT ACCELERATION)';

  // Build Plain-Text / ASCII Receipt for Clipboard Copy (NO green, NO hours, NO MCQs, standardized rounds)
  const handleCopyReceipt = () => {
    sound.playKeyClick();
    const divider = '==========================================================\n';
    const subDivider = '----------------------------------------------------------\n';

    let txt = '';
    txt += divider;
    txt += '            SOLO LEVELING // NEET UG 2027\n';
    txt += '             OFFICIAL WEEKLY AUDIT RECEIPT\n';
    txt += '           TE-TACTICAL PERFORMANCE TERMINAL\n';
    txt += divider;
    txt += `DATE:        ${todayStr} 23:59:59 IST\n`;
    txt += `RECEIPT ID:  #REC-WK7-${todayStr.replace(/-/g, '')}-NEET\n`;
    txt += `TERMINAL:    #001 (86-CHAPTER CHASSIS)\n`;
    txt += `OPERATOR:    NEET MEDICAL ASPIRANT // AIR-1 CONTENDER\n`;
    txt += subDivider;

    txt += '--- 1. WEEKLY SCHEDULED TESTS & MOCK RADAR ---\n';
    if (weekTests.length === 0) {
      txt += '* NO MOCK TESTS SCHEDULED IN THE PAST 7 DAYS *\n';
      if (upcomingTest) {
        const daysLeft = getDaysDifference(todayStr, upcomingTest.date);
        txt += `NEXT UPCOMING TEST: ${upcomingTest.name} (${upcomingTest.date}, in ${daysLeft}d)\n`;
      }
    } else {
      weekTests.forEach((wt, idx) => {
        const t = wt.test;
        const s = wt.score;
        if (wt.isLogged && s) {
          const pct = getScorePercentage(s);
          const acc = getScoreAccuracy(s);
          txt += `[${idx + 1}] [LOGGED] ${t.name} (${t.date})\n`;
          txt += `    SCORE: ${s.totalScore}/${s.maxScore} (${pct}%)${acc !== null ? ` | ACC: ${acc}%` : ''}\n`;
          if (s.subjectScores) {
            const subs: string[] = [];
            if (s.subjectScores.Physics !== undefined) subs.push(`PHY: ${s.subjectScores.Physics}`);
            if (s.subjectScores.Chemistry !== undefined) subs.push(`CHM: ${s.subjectScores.Chemistry}`);
            if (s.subjectScores.Botany !== undefined) subs.push(`BOT: ${s.subjectScores.Botany}`);
            if (s.subjectScores.Zoology !== undefined) subs.push(`ZOO: ${s.subjectScores.Zoology}`);
            if (subs.length > 0) txt += `    SUBJECTS: ${subs.join(' | ')}\n`;
          }
          txt += `    ERRORS: ${s.errors?.sillyMistakes || 0} Silly, ${s.errors?.conceptualGaps || 0} Concept, ${s.errors?.memoryRecall || 0} Recall\n`;
        } else {
          txt += `[${idx + 1}] [UNLOGGED / PENDING] ${t.name} (${t.date}, ${wt.daysAgo}d ago)\n`;
          txt += `    SCOPE: ${t.subjectOrScope || 'NEET Pattern'} | STATUS: SCORE NOT ENTERED\n`;
        }
      });
    }

    txt += subDivider;
    txt += '--- 2. ITEMIZED STUDY SESSIONS LEDGER ---\n';
    txt += 'QTY  DATE   SUB   CHAPTER NAME              STAGE    CONF   COVERAGE\n';
    txt += subDivider;

    if (weekLogs.length === 0) {
      txt += '*** NO STUDY SESSIONS COMMITTED IN PAST 7 DAYS ***\n';
      txt += '>>> WARNING: EBBINGHAUS MEMORY DECAY IS ACTIVELY ERODING <<<\n';
    } else {
      weekLogs.forEach((l, idx) => {
        const ch = chapterMap.get(l.chapterId);
        const name = (ch?.name || 'Unknown Chapter').slice(0, 24).padEnd(24, ' ');
        const sub = (ch?.subject?.slice(0, 3).toUpperCase() || 'TOP').padEnd(4, ' ');
        const round = getStandardRoundLabel(l).padEnd(8, ' ');
        const conf = `L${l.confidenceRating || 3}`.padEnd(6, ' ');
        const dateShort = l.dateStudied.slice(5);
        const pct = l.completionPercentage !== undefined ? `${l.completionPercentage}%` : '100%';
        txt += `${String(idx + 1).padStart(2, '0')}   ${dateShort}  ${sub}  ${name}  ${round} ${conf} ${pct}\n`;
      });
    }

    txt += subDivider;
    txt += '--- 3. EXECUTIVE AUDIT & TELEMETRY TALLY ---\n';
    txt += `TOTAL STUDY SESSIONS LOGGED:            ${weekLogs.length} ROUNDS\n`;
    txt += `TOTAL SYLLABUS TOPICS TOUCHED:          ${weekUniqueChapters.size} CHAPTERS\n`;
    txt += `MEMORY RETENTION RESCUES:               +${totalSavedCount} SAVED\n`;
    txt += `CRITICAL DECAY BACKLOG (<50%):          ${criticalDecayChapters.length} CHAPTERS\n`;
    txt += `TEST MARKS LOST TO ERRORS:              -${weekNegativeMarks} PTS\n`;
    txt += `  - Silly Bubbling & Calculation Slips: -${weekSillyMistakes * 5} pts (${weekSillyMistakes} slips)\n`;
    txt += `  - Conceptual Comprehension Gaps:      -${weekConceptualGaps * 5} pts\n`;
    txt += `  - Memory Recall Lapses:               -${weekMemoryRecall * 5} pts\n`;
    txt += `SYLLABUS PACING VELOCITY:               ${pacing.actualWeeklyVelocity} ch/wk (Target: ${pacing.required1stPassVelocityPerWeek})\n`;
    txt += `PACING DELTA VS TARGET:                 ${pacing.paceStatus} (${pacing.paceDeltaChapters >= 0 ? `+${pacing.paceDeltaChapters}` : pacing.paceDeltaChapters} chs)\n`;
    txt += divider;
    txt += `DISCIPLINE ASSESSMENT:                  ${disciplineTier}\n`;
    txt += `PAYMENT METHOD:                         SWEAT, SACRIFICE & FOCUS\n`;
    txt += `AUTHORIZATION:                          #NEET-2027-AIR1-OFFICIAL\n`;
    txt += divider;
    txt += '            ||||| | |||| || |||||| |||| | ||| \n';
    txt += '             * KEEP RECEIPT FOR WEEKLY PROOF *\n';
    txt += '               RETURN POLICY: NEVER SURRENDER\n';
    txt += divider;

    navigator.clipboard.writeText(txt).then(() => {
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    });
  };

  const handlePrint = () => {
    sound.playKeyClick();
    const receiptElement = document.getElementById('receipt-print-area');
    if (!receiptElement) {
      window.print();
      return;
    }

    // Create a dedicated hidden iframe for pristine, receipt-only printing
    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    // Collect active stylesheets to preserve exact typographic and border rendering
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NEET UG 2027 Weekly Audit Receipt</title>
          <meta charset="utf-8" />
          ${styles}
          <style>
            @page {
              size: auto;
              margin: 8mm 12mm;
            }
            body {
              background-color: #ffffff !important;
              color: #141416 !important;
              margin: 0 !important;
              padding: 12px !important;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #receipt-print-area {
              box-shadow: none !important;
              max-width: 650px !important;
              margin: 0 auto !important;
              border-left: 2px solid #141416 !important;
              border-right: 2px solid #141416 !important;
            }
            .no-print-btn { display: none !important; }
          </style>
        </head>
        <body>
          <div style="max-width: 650px; margin: 0 auto;">
            ${receiptElement.outerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Dedicated iframe print failed, falling back to window.print', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 350);
  };

  const handleDownloadImage = async () => {
    sound.playKeyClick();
    const receiptElement = document.getElementById('receipt-print-area');
    if (!receiptElement) return;

    try {
      setIsExportingImage(true);
      const dataUrl = await toPng(receiptElement, {
        backgroundColor: '#FFFDF8',
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `neet-weekly-audit-receipt-${todayStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export receipt image', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-3 sm:p-6 bg-[#141416]/85 backdrop-blur-xs font-mono flex justify-center items-start">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible !important;
          }
          #receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 650px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div
        id="weekly-audit-modal-card"
        className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[8px_8px_0px_#141416] w-full max-w-2xl relative my-4 sm:my-8"
      >
        {/* Subtle Machined Screws */}
        <div className="absolute top-2 left-2 z-10"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2 z-10"><span className="te-screw" /></div>

        {/* Modal Top Control Bar */}
        <div className="px-5 py-3 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416] pl-7 pr-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#FF3B00] font-black uppercase tracking-wider">
                Weekly Tactical Performance Audit
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#0047FF] text-white font-bold">
                7-Day Cycle Ending: {todayStr}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-tight flex items-center gap-1.5 mt-0.5">
              <Receipt className="w-4 h-4 text-[#FFB800]" />
              Official Weekly Study &amp; Test Audit Receipt
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReceipt}
              className="px-2.5 py-1 text-[11px] font-bold rounded-[3px] border border-white/20 bg-[#25252D] hover:bg-[#32323D] text-white cursor-pointer transition-all flex items-center gap-1 shadow-xs"
              title="Copy Plain-Text Receipt to Clipboard"
            >
              {copiedReceipt ? <Check className="w-3.5 h-3.5 text-[#60A5FA]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReceipt ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="px-2.5 py-1 text-[11px] font-bold rounded-[3px] border border-white/20 bg-[#25252D] hover:bg-[#32323D] text-white cursor-pointer transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
              title="Download Receipt as High-Res PNG Image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#FFB800]" />
              <span>{isExportingImage ? 'Saving...' : 'Image'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 py-1 text-[11px] font-bold rounded-[3px] border border-white/20 bg-[#25252D] hover:bg-[#32323D] text-white cursor-pointer transition-all flex items-center gap-1 shadow-xs"
              title="Print Thermal Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={() => {
                sound.playKeyClick();
                onClose();
              }}
              className="text-[#8C8A82] hover:text-white p-1 rounded hover:bg-[#2A2A30] transition-colors cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pristine Full-Height Receipt Body (No internal scrollable element) */}
        <div className="p-4 sm:p-5 bg-[#ECEAE4]/60">
          <div className="relative mx-auto max-w-xl">
            {/* Top Sawtooth / Scalloped Perforated Tear Edge */}
            <div className="w-full overflow-hidden text-[#FFFDF8] leading-none drop-shadow-sm">
              <svg className="w-full h-3 fill-current" viewBox="0 0 100 12" preserveAspectRatio="none">
                <polygon points="0,0 2.5,12 5,0 7.5,12 10,0 12.5,12 15,0 17.5,12 20,0 22.5,12 25,0 27.5,12 30,0 32.5,12 35,0 37.5,12 40,0 42.5,12 45,0 47.5,12 50,0 52.5,12 55,0 57.5,12 60,0 62.5,12 65,0 67.5,12 70,0 72.5,12 75,0 77.5,12 80,0 82.5,12 85,0 87.5,12 90,0 92.5,12 95,0 97.5,12 100,0 100,12 0,12" />
              </svg>
            </div>

            {/* Thermal Paper Document */}
            <div
              id="receipt-print-area"
              className="bg-[#FFFDF8] border-x-2 border-[#141416] px-5 sm:px-7 py-5 space-y-4 text-[#141416] shadow-[0_12px_30px_rgba(0,0,0,0.12)] font-mono text-xs selection:bg-black selection:text-white"
            >
              {/* Receipt Header Banner */}
              <div className="text-center space-y-1 border-b-2 border-dashed border-[#141416] pb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#141416] text-white rounded text-[10px] font-black tracking-widest uppercase">
                  ★ NEET UG 2027 TACTICAL AUDIT ★
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-tight uppercase mt-1">
                  Solo Leveling Study Terminal
                </h1>
                <p className="text-[10px] text-[#5C5A52] tracking-wider uppercase">
                  Terminal #001 · 86-Chapter Mastery Engine · Batch 2026-27
                </p>

                <div className="pt-2 text-[10px] flex items-center justify-between text-[#5C5A52] border-t border-dotted border-[#D5D2C8] mt-2">
                  <span>DATE: {todayStr} 23:59:59 IST</span>
                  <span>CASHIER: SOLO DISCIPLINE</span>
                </div>
                <div className="text-[10px] flex items-center justify-between text-[#5C5A52]">
                  <span>RECEIPT NO: #REC-7D-{todayStr.replace(/-/g, '')}</span>
                  <span>STATUS: OFFICIAL VERIFIED</span>
                </div>
              </div>

              {/* 1. EXECUTIVE 7-DAY TELEMETRY STRIP (ZERO GREEN, ZERO HOURS, ZERO MCQS) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b-2 border-[#141416] pb-3">
                <div className="p-2 bg-[#F5F3EC] border border-[#141416] rounded-[2px] text-center">
                  <span className="text-[9px] text-[#5C5A52] font-black uppercase block">Study Velocity</span>
                  <span className="text-base font-black text-[#141416] block mt-0.5">{weekLogs.length}</span>
                  <span className="text-[8.5px] text-[#5C5A52]">{weekUniqueChapters.size} topics touched</span>
                </div>

                <div className="p-2 bg-[#F5F3EC] border border-[#141416] rounded-[2px] text-center">
                  <span className="text-[9px] text-[#5C5A52] font-black uppercase block">Decay Saved</span>
                  <span className="text-base font-black text-[#0047FF] block mt-0.5">+{totalSavedCount}</span>
                  <span className="text-[8.5px] text-[#0047FF]">Revisions rescued</span>
                </div>

                <div className="p-2 bg-[#F5F3EC] border border-[#141416] rounded-[2px] text-center">
                  <span className="text-[9px] text-[#5C5A52] font-black uppercase block">Pacing Delta</span>
                  <span
                    className={`text-xs font-black block mt-1 ${
                      pacing.paceStatus === 'BEHIND' ? 'text-[#FF3B00]' : 'text-[#0047FF]'
                    }`}
                  >
                    {pacing.paceStatus}{' '}
                    <span className="text-[9px]">
                      ({pacing.paceDeltaChapters >= 0 ? `+${pacing.paceDeltaChapters}` : pacing.paceDeltaChapters} chs)
                    </span>
                  </span>
                  <span className="text-[8.5px] text-[#5C5A52]">{pacing.required1stPassVelocityPerWeek} ch/wk req</span>
                </div>

                <div className="p-2 bg-[#F5F3EC] border border-[#141416] rounded-[2px] text-center">
                  <span className="text-[9px] text-[#5C5A52] font-black uppercase block">Negative Bleed</span>
                  <span className="text-base font-black text-[#FF3B00] block mt-0.5">-{weekNegativeMarks}</span>
                  <span className="text-[8.5px] text-[#FF3B00]">Marks lost to slips</span>
                </div>
              </div>

              {/* 2. WEEKLY SCHEDULED TESTS & MOCK RADAR (COLOR-CODED, LOGGED VS UNLOGGED, DETAILED STATS) */}
              <div className="space-y-2 border-b-2 border-dashed border-[#141416] pb-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase text-[#141416] flex items-center gap-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5 text-[#0047FF]" />
                    <span>Weekly Tests &amp; Mock Deployments</span>
                  </span>
                  <span className="text-[9px] font-bold text-[#5C5A52]">
                    {weekTests.length} in 7-Day Window ({weekTests.filter((t) => t.isLogged).length} Logged)
                  </span>
                </div>

                {weekTests.length === 0 ? (
                  <div className="p-2.5 bg-[#FAF7EE] border border-[#141416] rounded-[2px] space-y-1 text-center">
                    <div className="text-[10px] font-bold text-[#5C5A52]">
                      * NO MOCK TESTS SCHEDULED IN THE PAST 7 DAYS *
                    </div>
                    {upcomingTest ? (
                      <div className="text-[10px] text-[#141416] font-bold flex items-center justify-center gap-1.5">
                        <span className="text-[#0047FF]">Next Scheduled Test:</span>
                        <span>{upcomingTest.name} ({upcomingTest.date})</span>
                        <span className="text-[9px] text-[#5C5A52]">
                          ({getDaysDifference(todayStr, upcomingTest.date)} days remaining)
                        </span>
                      </div>
                    ) : (
                      <div className="text-[9px] text-[#8C8A82]">
                        Schedule your upcoming coaching tests in Tab 03 (Flight Plan) to sync test deadlines.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {weekTests.map(({ test: t, score: s, isLogged, daysAgo }, idx) => {
                      const pct = getScorePercentage(s);
                      const acc = getScoreAccuracy(s);

                      // Color Coding Logic (ZERO GREEN):
                      // Logged high score (>=80%) -> Cobalt Blue (#0047FF)
                      // Logged mid score (60-79%) -> Amber Gold (#D97706)
                      // Logged low score (<60%) -> Crimson (#FF3B00)
                      // Unlogged / Pending -> Crimson (#FF3B00)
                      const isHigh = pct >= 80;
                      const isMid = pct >= 60 && pct < 80;

                      const cardBorderColor = !isLogged
                        ? 'border-[#FF3B00] bg-[#FFF5F2]'
                        : isHigh
                        ? 'border-[#0047FF] bg-[#F0F4FF]'
                        : isMid
                        ? 'border-[#D97706] bg-[#FFFBEB]'
                        : 'border-[#FF3B00] bg-[#FFF5F2]';

                      const badgeStyle = !isLogged
                        ? 'bg-[#FF3B00] text-white animate-pulse'
                        : isHigh
                        ? 'bg-[#0047FF] text-white'
                        : isMid
                        ? 'bg-[#D97706] text-white'
                        : 'bg-[#FF3B00] text-white';

                      const scoreColor = isHigh
                        ? 'text-[#0047FF]'
                        : isMid
                        ? 'text-[#D97706]'
                        : 'text-[#FF3B00]';

                      return (
                        <div
                          key={t.id || idx}
                          className={`p-2.5 rounded-[3px] border-2 transition-all ${cardBorderColor} shadow-xs`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#D5D2C8] pb-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-1.5 py-0.2 rounded-[2px] text-[9px] font-black uppercase tracking-wider ${badgeStyle}`}
                              >
                                {isLogged ? '✓ LOGGED & RECORDED' : '⚠ SCORE NOT LOGGED'}
                              </span>
                              <span className="font-black text-xs text-[#141416]">{t.name}</span>
                              <span className="text-[10px] text-[#5C5A52]">
                                ({t.date} · {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`})
                              </span>
                            </div>

                            {/* Call to action for unlogged tests */}
                            {!isLogged && onOpenLogScoreForTest && (
                              <button
                                onClick={() => {
                                  sound.playKeyClick();
                                  onClose();
                                  onOpenLogScoreForTest(t.id);
                                }}
                                className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#FF3B00] text-white rounded-[2px] border border-[#141416] cursor-pointer hover:bg-[#E03400] transition-all self-start sm:self-auto shadow-xs"
                              >
                                Log Test Score
                              </button>
                            )}
                          </div>

                          <div className="pt-1.5 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="text-[10px] text-[#5C5A52] space-y-0.5">
                              <div>Scope: <strong className="text-[#141416]">{t.subjectOrScope || 'Complete NEET Syllabus'}</strong></div>
                              {t.coachingName && <div>Institute: <strong className="text-[#141416]">{t.coachingName}</strong></div>}

                              {/* Subject scores breakdown if recorded */}
                              {isLogged && s?.subjectScores && (
                                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                  {s.subjectScores.Physics !== undefined && (
                                    <span className="px-1 py-0.2 bg-[#EAE8E0] text-[#141416] rounded-[2px] text-[8.5px] font-bold">
                                      PHY: {s.subjectScores.Physics}/180
                                    </span>
                                  )}
                                  {s.subjectScores.Chemistry !== undefined && (
                                    <span className="px-1 py-0.2 bg-[#EAE8E0] text-[#141416] rounded-[2px] text-[8.5px] font-bold">
                                      CHM: {s.subjectScores.Chemistry}/180
                                    </span>
                                  )}
                                  {s.subjectScores.Botany !== undefined && (
                                    <span className="px-1 py-0.2 bg-[#EAE8E0] text-[#141416] rounded-[2px] text-[8.5px] font-bold">
                                      BOT: {s.subjectScores.Botany}/180
                                    </span>
                                  )}
                                  {s.subjectScores.Zoology !== undefined && (
                                    <span className="px-1 py-0.2 bg-[#EAE8E0] text-[#141416] rounded-[2px] text-[8.5px] font-bold">
                                      ZOO: {s.subjectScores.Zoology}/180
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {isLogged && s ? (
                              <div className="text-right font-mono space-y-0.5 shrink-0">
                                <div className={`text-sm font-black ${scoreColor}`}>
                                  {s.totalScore} / {s.maxScore || 720}{' '}
                                  <span className="text-xs font-bold text-[#141416]">({pct}%)</span>
                                  {acc !== null && (
                                    <span className="text-[10px] text-[#5C5A52] ml-1">[{acc}% Acc]</span>
                                  )}
                                </div>
                                <div className="text-[9px] text-[#5C5A52]">
                                  {s.correctQuestions || 0} Correct · {s.incorrectQuestions || 0} Incorrect · {s.unattemptedQuestions || 0} Unattempted
                                </div>
                                {s.errors && (
                                  <div className="text-[9px] text-[#FF3B00] font-bold">
                                    Mistakes: {s.errors.sillyMistakes || 0} Silly · {s.errors.conceptualGaps || 0} Concept · {s.errors.memoryRecall || 0} Recall
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-right text-[10px] text-[#FF3B00] font-bold shrink-0">
                                Test date elapsed · Score entry pending
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. ITEMIZED STUDY SESSIONS LEDGER (STANDARDIZED: 1ST PASS, REV 1, REV 2... ZERO HOURS, ZERO MCQS, NO THEORY/PRACTICE) */}
              <div className="space-y-2 border-b-2 border-dashed border-[#141416] pb-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase text-[#141416] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#141416]" />
                    <span>Itemized Study Sessions Ledger</span>
                  </span>
                  <span className="text-[9px] font-bold text-[#5C5A52]">
                    {weekLogs.length} Sessions Committed
                  </span>
                </div>

                {/* Table Header: #, DATE, SUB, CHAPTER, STAGE, CONF, COVERAGE */}
                <div className="border-b border-[#141416] pb-1 font-black text-[9.5px] uppercase flex items-center justify-between text-[#5C5A52]">
                  <div className="flex items-center gap-2">
                    <span className="w-4">#</span>
                    <span className="w-10">Date</span>
                    <span className="w-8">Sub</span>
                    <span>Chapter Title</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-16 text-center">Stage</span>
                    <span className="w-10 text-center">Rating</span>
                    <span className="w-12 text-right">Coverage</span>
                  </div>
                </div>

                {/* Rows (Full unconstrained list - zero internal scrollbar) */}
                <div className="space-y-1 divide-y divide-dotted divide-[#D5D2C8]">
                  {weekLogs.length === 0 ? (
                    <div className="py-3 text-center space-y-1">
                      <div className="text-[#FF3B00] font-black uppercase text-xs">
                        *** ZERO STUDY SESSIONS COMMITTED THIS WEEK ***
                      </div>
                      <p className="text-[10px] text-[#5C5A52]">
                        Ebbinghaus decay curve is degrading retention across your chapters. Log a session to reactivate memory stability!
                      </p>
                    </div>
                  ) : (
                    weekLogs.map((log, idx) => {
                      const ch = chapterMap.get(log.chapterId);
                      const roundLabel = getStandardRoundLabel(log);
                      const dateShort = log.dateStudied.slice(5);
                      const pctStr = log.completionPercentage !== undefined ? `${log.completionPercentage}%` : '100%';

                      // Color Coding for standardized rounds (ZERO GREEN):
                      // 1ST PASS -> Mechanical Amber (#E47E35)
                      // REV 1 -> Deep Indigo (#493EA4)
                      // REV 2+ -> Cobalt Blue (#0047FF)
                      const stageBadgeStyle =
                        roundLabel === '1ST PASS'
                          ? 'bg-[#E47E35] text-white border-[#E47E35]'
                          : roundLabel === 'REV 1'
                          ? 'bg-[#493EA4] text-white border-[#493EA4]'
                          : 'bg-[#0047FF] text-white border-[#0047FF]';

                      return (
                        <div key={log.id || idx} className="pt-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-[9px] text-[#8C8A82] w-4 shrink-0">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-[#5C5A52] w-10 shrink-0 font-mono">
                              {dateShort}
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#141416] text-white w-8 text-center shrink-0 font-black">
                              {ch?.subject?.slice(0, 3).toUpperCase() || 'TOP'}
                            </span>
                            <span className="font-bold text-[#141416] truncate block">
                              {ch?.name || 'Syllabus Chapter'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 font-mono text-right">
                            {/* Standardized Round Badge: 1ST PASS, REV 1, REV 2... */}
                            <span
                              className={`w-16 text-center text-[9px] font-black px-1 py-0.2 rounded border ${stageBadgeStyle}`}
                            >
                              {roundLabel}
                            </span>

                            {/* Confidence Star Level */}
                            <span className="w-10 text-center text-[10px] font-bold text-[#141416]">
                              ★ L{log.confidenceRating || 3}
                            </span>

                            {/* Chapter Coverage % */}
                            <span className="w-12 text-right text-[10px] font-black text-[#141416]">
                              {pctStr}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. DIAGNOSTIC BRIEFING: EBBINGHAUS CRITICAL MEMORY DECAY ALERT (NO GREEN) */}
              <div className="space-y-2 border-b-2 border-dashed border-[#141416] pb-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-[#141416]">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#FF3B00]" />
                    <span>Memory Decay Alert</span>
                    <span className="text-[#FF3B00]">({criticalDecayChapters.length} Critical &lt;50%)</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#5C5A52]">
                    {warningDecayChapters.length} Warning (50-70%)
                  </span>
                </div>

                {criticalDecayChapters.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-[#0047FF] font-bold bg-[#F0F4FF] border border-[#0047FF] rounded-[2px] flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0047FF]" />
                    <span>All studied topics currently maintain above 50% retention stability!</span>
                  </div>
                ) : (
                  <div className="space-y-1 divide-y divide-dotted divide-[#D5D2C8]">
                    {criticalDecayChapters.map(({ chapter, retention }) => (
                      <div key={chapter.id} className="pt-1.5 flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#141416] text-[#FAF9F6] shrink-0">
                            {chapter.subject.slice(0, 3).toUpperCase()}
                          </span>
                          <span className="font-bold text-[#141416] truncate">{chapter.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-black text-[#FF3B00]">
                            {retention.retentionPct}% ({retention.daysSinceLastStudied}d ago)
                          </span>
                          <button
                            onClick={() => {
                              sound.playKeyClick();
                              onClose();
                              onOpenQuickLogForChapter(chapter.id);
                            }}
                            className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#FF3B00] text-white rounded-[2px] border border-[#141416] cursor-pointer hover:bg-[#E03400] transition-all"
                          >
                            Revise
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. DIAGNOSTIC BRIEFING: MISTAKE & NEGATIVE MARKING FORENSICS (NO GREEN) */}
              <div className="space-y-2 border-b-2 border-dashed border-[#141416] pb-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase text-[#141416] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#FF3B00]" />
                    <span>Error Forensics &amp; Mark Penalties</span>
                  </span>
                  <span className="text-[10px] font-black text-[#FF3B00]">
                    -{weekNegativeMarks} Marks Lost
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-[#F5F3EC] rounded border border-[#141416]">
                    <span className="block text-[9.5px] font-black text-[#FF3B00] uppercase">Silly Slips</span>
                    <span className="text-sm font-black text-[#141416]">{weekSillyMistakes}</span>
                    <span className="text-[8.5px] text-[#FF3B00]">-{weekSillyMistakes * 5} raw marks</span>
                  </div>
                  <div className="p-2 bg-[#F5F3EC] rounded border border-[#141416]">
                    <span className="block text-[9.5px] font-black text-[#493EA4] uppercase">Concept Gaps</span>
                    <span className="text-sm font-black text-[#141416]">{weekConceptualGaps}</span>
                    <span className="text-[8.5px] text-[#493EA4]">-{weekConceptualGaps * 5} raw marks</span>
                  </div>
                  <div className="p-2 bg-[#F5F3EC] rounded border border-[#141416]">
                    <span className="block text-[9.5px] font-black text-[#D97706] uppercase">Memory Recall</span>
                    <span className="text-sm font-black text-[#141416]">{weekMemoryRecall}</span>
                    <span className="text-[8.5px] text-[#D97706]">-{weekMemoryRecall * 5} raw marks</span>
                  </div>
                </div>
              </div>

              {/* 6. DIAGNOSTIC BRIEFING: SYLLABUS PACING VELOCITY & FLIGHT PLAN RUNWAY */}
              <div className="space-y-2 border-b-2 border-dashed border-[#141416] pb-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase text-[#141416] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#0047FF]" />
                    <span>Syllabus Pacing &amp; Flight Plan Runway</span>
                  </span>
                  <span
                    className={`text-[9.5px] font-black px-1.5 py-0.2 rounded ${
                      pacing.paceStatus === 'BEHIND'
                        ? 'bg-[#FF3B00] text-white'
                        : 'bg-[#0047FF] text-white'
                    }`}
                  >
                    {pacing.paceStatus} ({pacing.paceDeltaChapters >= 0 ? `+${pacing.paceDeltaChapters}` : pacing.paceDeltaChapters} chapters)
                  </span>
                </div>

                <div className="p-2.5 bg-[#F5F3EC] border border-[#141416] rounded-[2px] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C5A52]">Actual Weekly Velocity:</span>
                    <span className="font-black text-[#141416]">{pacing.actualWeeklyVelocity} ch/wk</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C5A52]">Required Velocity (Target {pacingSettings.targetSyllabusDate}):</span>
                    <span className="font-black text-[#0047FF]">{pacing.required1stPassVelocityPerWeek} ch/wk</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dotted border-[#D5D2C8] pt-1 mt-1">
                    <span className="text-[#5C5A52]">Target NEET Exam Date:</span>
                    <span className="font-bold text-[#141416]">{pacingSettings.targetExamDate} ({getDaysDifference(todayStr, pacingSettings.targetExamDate)} days left)</span>
                  </div>
                </div>
              </div>

              {/* 7. DIAGNOSTIC BRIEFING: NEXT 7-DAY ACTIONABLE STRATEGIC DIRECTIVES */}
              <div className="p-3 bg-[#141416] text-[#FAF9F6] border-2 border-[#141416] rounded-[2px] space-y-1.5">
                <div className="text-[10px] font-black uppercase text-[#FF3B00] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Strategic Mission Directives for Next 7 Days</span>
                </div>
                <ul className="text-[11px] text-[#ECEAE4] space-y-1 pl-2 list-disc list-inside">
                  <li>
                    <strong>1st-Pass Target:</strong> Complete at least{' '}
                    <span className="text-[#FF3B00] font-black">{pacing.required1stPassVelocityPerWeek} new chapters</span> to maintain syllabus deadline of {pacingSettings.targetSyllabusDate}.
                  </li>
                  <li>
                    <strong>Decay Priority:</strong> Immediately rescue the{' '}
                    <span className="text-[#FF3B00] font-black">{criticalDecayChapters.length} topics</span> in critical retention decay.
                  </li>
                  <li>
                    <strong>Score Logging:</strong> Complete and record score for all scheduled test dates to prevent blind spots.
                  </li>
                </ul>
              </div>

              {/* 8. DISCIPLINE ASSESSMENT, OFFICIAL STAMP, & THERMAL BARCODE */}
              <div className="border-t-2 border-[#141416] pt-3 text-center space-y-2">
                <div className="p-2 bg-[#FAF7EE] border border-[#141416] rounded text-center space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#5C5A52] block">
                    COMPOSITE WEEKLY DISCIPLINE LEVEL
                  </span>
                  <span className="text-sm font-black text-[#141416] block">
                    {disciplineTier}
                  </span>
                  <span className="text-[9px] text-[#5C5A52]">
                    Score: {disciplineScore}/100 · Protocol: Strict Consistency
                  </span>
                </div>

                <div className="text-[10px] text-[#5C5A52] space-y-0.5 pt-1">
                  <div>PAYMENT METHOD: <strong className="text-[#141416]">SWEAT, SACRIFICE &amp; FOCUS</strong></div>
                  <div>AUTHENTICATION: <strong className="text-[#0047FF]">#NEET-2027-AIR1-OFFICIAL</strong></div>
                </div>

                {/* Stamped Certified Seal */}
                <div className="inline-block border-2 border-[#141416] px-3 py-1 rounded-[2px] transform -rotate-1 bg-white shadow-xs">
                  <span className="text-[10px] font-black uppercase text-[#141416] tracking-wider">
                    ★ NEET 2027 AUDITED &amp; CERTIFIED ★
                  </span>
                </div>

                {/* Thermal Barcode Graphic */}
                <div className="pt-2 flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-[2px] h-9 w-48 justify-center opacity-85">
                    {[3, 1, 4, 1, 2, 5, 1, 3, 2, 4, 1, 2, 3, 5, 2, 1, 4, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 5, 1, 2].map(
                      (w, i) => (
                        <div
                          key={i}
                          className="h-full bg-[#141416]"
                          style={{ width: `${w}px` }}
                        />
                      )
                    )}
                  </div>
                  <span className="text-[9px] text-[#5C5A52] tracking-widest font-mono">
                    *NEET-UG-WEEKLY-AUDIT-2027*
                  </span>
                </div>

                <p className="text-[9px] text-[#8C8A82]">
                  KEEP THIS RECEIPT AS PROOF OF WEEKLY DILIGENCE · NO REFUNDS ON MISSED DAYS
                </p>
              </div>
            </div>

            {/* Bottom Sawtooth Perforated Tear Edge */}
            <div className="w-full overflow-hidden text-[#FFFDF8] leading-none drop-shadow-sm">
              <svg className="w-full h-3 fill-current rotate-180" viewBox="0 0 100 12" preserveAspectRatio="none">
                <polygon points="0,0 2.5,12 5,0 7.5,12 10,0 12.5,12 15,0 17.5,12 20,0 22.5,12 25,0 27.5,12 30,0 32.5,12 35,0 37.5,12 40,0 42.5,12 45,0 47.5,12 50,0 52.5,12 55,0 57.5,12 60,0 62.5,12 65,0 67.5,12 70,0 72.5,12 75,0 77.5,12 80,0 82.5,12 85,0 87.5,12 90,0 92.5,12 95,0 97.5,12 100,0 100,12 0,12" />
              </svg>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#ECEAE4] border-t-2 border-[#141416] flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="text-[10px] text-[#5C5A52] font-mono">
            🧾 Unified Thermal Performance Receipt &amp; Diagnostic Briefing · Zero Green Color Standard Verified
          </div>

          <button
            onClick={() => {
              sound.playKeyClick();
              onClose();
            }}
            className="px-4 py-2 bg-[#141416] text-white text-xs font-black uppercase rounded-[2px] cursor-pointer hover:bg-[#2A2A30] transition-all"
          >
            Acknowledge &amp; Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
