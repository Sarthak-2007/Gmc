import React from 'react';
import { sound } from '../../services/soundEffects';

interface MechanicalSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label: string;
  unit?: string;
  orientation?: 'horizontal' | 'vertical';
  color?: 'orange' | 'yellow' | 'blue' | 'slate';
  className?: string;
}

export const MechanicalSlider: React.FC<MechanicalSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '',
  orientation = 'horizontal',
  color = 'orange',
  className = '',
}) => {
  const percentage = max === min ? 0 : ((value - min) / (max - min)) * 100;

  const colorCap = {
    orange: 'bg-[#FF3B00] border-[#141416]',
    yellow: 'bg-[#FFB800] border-[#141416]',
    blue: 'bg-[#0047FF] border-[#141416]',
    slate: 'bg-[#141416] border-[#3E3E48]',
  }[color];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    if (newVal !== value) {
      sound.playKnobClick(500 + (newVal / max) * 400);
      onChange(newVal);
    }
  };

  return (
    <div className={`flex flex-col font-mono select-none ${className}`}>
      {/* Label and Value Display */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-black uppercase text-[#141416] tracking-wider">
          {label}
        </span>
        <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#D6D2C4] border border-[#141416] rounded-[2px] text-[#141416]">
          {value}{unit}
        </span>
      </div>

      {/* Slotted Track with Ruler Ticks */}
      <div className="relative py-1 flex items-center">
        {/* Track Slot */}
        <div className="w-full h-3 bg-[#D4D0C5] border border-[#141416] rounded-[2px] shadow-inner relative flex items-center px-1">
          {/* Internal LED / Fill bar */}
          <div
            className="h-1 bg-[#141416]/30 rounded-[1px] pointer-events-none"
            style={{ width: `${percentage}%` }}
          />

          {/* Graduation Hashmarks */}
          <div className="absolute inset-x-2 top-0 bottom-0 flex justify-between items-center pointer-events-none opacity-40">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-[1px] h-2 bg-[#141416]" />
            ))}
          </div>
        </div>

        {/* Real Range Input Overlaid */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
        />

        {/* Custom Physical TE Fader Knob Cap */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-6 rounded-[2px] border-2 shadow-[2px_2px_0px_#141416] pointer-events-none transition-all duration-75 flex flex-col justify-center items-center gap-[2px] ${colorCap}`}
          style={{
            left: `calc(${percentage}% - 8px)`,
          }}
        >
          {/* Milled Grip Ridges on Fader Cap */}
          <div className="w-2.5 h-[1.5px] bg-white/70 rounded-full" />
          <div className="w-2.5 h-[1.5px] bg-white/70 rounded-full" />
          <div className="w-2.5 h-[1.5px] bg-white/70 rounded-full" />
        </div>
      </div>
    </div>
  );
};
