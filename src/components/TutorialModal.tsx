import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CheckSquare,
  Layers,
} from 'lucide-react';
import { sound } from '../services/soundEffects';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface TutorialStep {
  title: string;
  badge: string;
  icon: any;
  content: string;
  bullets: { title: string; desc: string }[];
  actionNote: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Zero-to-Complete NEET Study Architecture',
    badge: 'Methodology 01',
    icon: Sparkles,
    content:
      'Designed specifically for NEET aspirants starting from zero. Instead of treating every study session as a revision round, the system accurately tracks your 1st Pass progression across multiple days.',
    bullets: [
      {
        title: 'Multi-Day 1st Pass',
        desc: 'Chapters take days to finish. Set your completion percentage (25%, 50%, 75%, 100%) as you work through lectures and NCERT.',
      },
      {
        title: 'Days of Active Study Tracker',
        desc: 'See exactly how many days you have been actively studying a chapter, encouraging you to finish what you started before moving on.',
      },
      {
        title: 'Revision Isolation',
        desc: 'Chapters remain in "1st Pass" mode and are NEVER pushed to spaced revision queues until you mark them 100% complete.',
      },
    ],
    actionNote: 'Start from 0% and methodically work through your syllabus one chapter at a time.',
  },
  {
    title: 'The 4 NEET Syllabus Pillars',
    badge: 'Methodology 02',
    icon: Layers,
    content:
      'Every NEET chapter is broken into 4 non-negotiable preparation pillars:',
    bullets: [
      {
        title: '1. Video Lectures & Theory',
        desc: 'Complete classroom or coaching video lectures to build foundational concepts.',
      },
      {
        title: '2. NCERT Line-by-Line Reading',
        desc: 'Crucial for Biology, Inorganic & Organic Chemistry — read and mark key lines directly from NCERT textbooks.',
      },
      {
        title: '3. Class Notes & Formulas',
        desc: 'Formula sheets, short summary notes, and concept mind-maps for quick recall.',
      },
      {
        title: '4. PYQs & Question Practice',
        desc: 'Minimum 50–100 questions and previous 10–15 years NEET questions solved with timed accuracy.',
      },
    ],
    actionNote: 'In each study log, check off the pillars you worked on to track comprehensive chapter readiness.',
  },
  {
    title: 'Nearest Exam Mission Radar',
    badge: 'Methodology 03',
    icon: Calendar,
    content:
      'The Test Radar automatically locks onto your nearest upcoming mock exam (ALLEN / AAKASH / NEET) and cross-checks the syllabus against your progress:',
    bullets: [
      {
        title: '🚨 Zero Coverage Alert',
        desc: 'Immediately highlights test chapters you have not yet started so you never go into an exam unprepared.',
      },
      {
        title: '⏳ In Progress Priority',
        desc: 'Shows chapters that are mid-way so you can close the gap before exam day.',
      },
      {
        title: '⚡ One-Click Score Logging',
        desc: 'Once an exam date passes, it surfaces in your Pending Results queue for instant score recording.',
      },
    ],
    actionNote: 'Focus your daily energy on zero-coverage chapters required for your nearest test mission.',
  },
  {
    title: 'Spaced Repetition & Retention Multipliers',
    badge: 'Methodology 04',
    icon: CheckSquare,
    content:
      'Once a chapter reaches 100% completion, the automated spaced repetition engine activates:',
    bullets: [
      {
        title: 'Automated Intervals (Day 3 → 7 → 14 → 30)',
        desc: 'Systematically prompts you for review rounds at scientifically proven intervals before memory fades.',
      },
      {
        title: 'Confidence-Based Multipliers',
        desc: 'Weak ratings (★1–2) shorten the review interval for quick reinforcement, while strong ratings (★4–5) extend it.',
      },
      {
        title: 'Pillar Analytics',
        desc: 'Check your syllabus pillar dashboard at any time to monitor your overall NEET preparation balance.',
      },
    ],
    actionNote: 'You are ready to begin! Click "Get Started" to launch your study console.',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const currentStep = TUTORIAL_STEPS[currentStepIndex] || TUTORIAL_STEPS[0];
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;
  const isFirst = currentStepIndex === 0;

  const handleNext = () => {
    sound.playKeyClick();
    if (isLast) {
      onComplete();
      onClose();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    sound.playKeyClick();
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141416]/75 backdrop-blur-xs font-mono">
      <div
        id="tutorial-modal-card"
        className="bg-[#FAF9F6] rounded-[4px] border-2 border-[#141416] shadow-[6px_6px_0px_#141416] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] relative"
      >
        {/* Corner Screws */}
        <div className="absolute top-2 left-2 z-10"><span className="te-screw" /></div>
        <div className="absolute top-2 right-2 z-10"><span className="te-screw" /></div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#141416] text-[#FAF9F6] flex items-center justify-between border-b-2 border-[#141416] pl-7 pr-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#FF3B00] font-black uppercase tracking-wider">
              {currentStep.badge} // STEP {currentStepIndex + 1} OF {TUTORIAL_STEPS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C8A82] hover:text-white p-1 rounded hover:bg-[#2A2A30] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[3px] bg-[#ECEAE4] border-2 border-[#141416] flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5 text-[#FF3B00]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#141416] uppercase tracking-tight">
                {currentStep.title}
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#5C5A52] leading-relaxed">
            {currentStep.content}
          </p>

          <div className="space-y-2 bg-[#ECEAE4] p-3 rounded-[3px] border border-[#141416]">
            {currentStep.bullets.map((b, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-[#FF3B00] font-black shrink-0">▸</span>
                <div>
                  <strong className="text-[#141416]">{b.title}: </strong>
                  <span className="text-[#5C5A52]">{b.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-[#FAF9F6] border-2 border-[#141416] rounded-[2px] text-xs text-[#141416] font-bold">
            💡 {currentStep.actionNote}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-[#ECEAE4] border-t-2 border-[#141416] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirst}
            className={`px-3 py-1.5 text-xs font-bold rounded-[2px] border border-[#141416] bg-[#FAF9F6] flex items-center gap-1.5 ${
              isFirst ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#141416] hover:text-white cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {/* Stepper dots */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-[1px] transition-all ${
                  i === currentStepIndex ? 'bg-[#FF3B00] w-4' : 'bg-[#C5C3BB]'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="te-btn-orange px-4 py-1.5 text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isLast ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
