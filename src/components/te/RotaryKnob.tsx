import React, { useRef, useState, useCallback, useEffect } from 'react';
import { sound } from '../../services/soundEffects';

export type KnobColor = 'orange' | 'yellow' | 'blue' | 'slate' | 'white';

interface RotaryKnobProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label: string;
  displayValue?: string;
  color?: KnobColor;
  size?: 'sm' | 'md' | 'lg';
  ticks?: number;
  snapLabels?: { value: number; label: string }[];
  className?: string;
  unit?: string;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  displayValue,
  color = 'orange',
  size = 'md',
  ticks = 9,
  snapLabels,
  className = '',
  unit = '',
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartVal = useRef(value);

  // Map value to angle (-135deg to +135deg = 270deg total sweep)
  const range = max - min;
  const clampedVal = Math.min(Math.max(value, min), max);
  const fraction = range === 0 ? 0 : (clampedVal - min) / range;
  const angle = -135 + fraction * 270;

  const colorStyles = {
    orange: {
      cap: 'bg-[#FF3B00] border-[#141416]',
      line: 'bg-white',
      accent: 'text-[#FF3B00]',
      ring: 'border-[#141416]',
    },
    yellow: {
      cap: 'bg-[#FFB800] border-[#141416]',
      line: 'bg-[#141416]',
      accent: 'text-[#FFB800]',
      ring: 'border-[#141416]',
    },
    blue: {
      cap: 'bg-[#0047FF] border-[#141416]',
      line: 'bg-white',
      accent: 'text-[#0047FF]',
      ring: 'border-[#141416]',
    },
    slate: {
      cap: 'bg-[#141416] border-[#3E3E48]',
      line: 'bg-[#FAF9F6]',
      accent: 'text-[#141416]',
      ring: 'border-[#141416]',
    },
    white: {
      cap: 'bg-[#FAF9F6] border-[#141416]',
      line: 'bg-[#FF3B00]',
      accent: 'text-[#141416]',
      ring: 'border-[#141416]',
    },
  }[color];

  const sizeDim = {
    sm: { diameter: 42, inner: 32, font: 'text-[9px]', labelFont: 'text-[9px]' },
    md: { diameter: 54, inner: 42, font: 'text-[10px]', labelFont: 'text-[10px]' },
    lg: { diameter: 68, inner: 54, font: 'text-xs', labelFont: 'text-xs' },
  }[size];

  // Mouse & Touch Drag Handlers
  const handleStart = (clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartVal.current = value;
  };

  const handleMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      const deltaY = dragStartY.current - clientY;
      const sensitivity = 120; // pixels for full range
      const deltaVal = (deltaY / sensitivity) * range;
      let rawVal = dragStartVal.current + deltaVal;

      // Apply step
      const stepsCount = Math.round((rawVal - min) / step);
      let steppedVal = min + stepsCount * step;
      steppedVal = Math.min(Math.max(steppedVal, min), max);

      if (steppedVal !== value) {
        sound.playKnobClick(600 + fraction * 400);
        onChange(steppedVal);
      }
    },
    [isDragging, min, max, step, range, value, onChange, fraction]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  // Click on radial notch or snap label
  const handleSnapClick = (targetVal: number) => {
    sound.playKnobClick(750);
    onChange(targetVal);
  };

  const stepDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = Math.max(min, value - step);
    if (nextVal !== value) {
      sound.playKnobClick(500);
      onChange(nextVal);
    }
  };

  const stepUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = Math.min(max, value + step);
    if (nextVal !== value) {
      sound.playKnobClick(850);
      onChange(nextVal);
    }
  };

  return (
    <div
      className={`flex flex-col items-center select-none font-mono ${className}`}
      data-knob-active={isDragging ? 'true' : 'false'}
    >
      {/* Knob Label */}
      <div className="flex items-center gap-1 mb-1">
        <span className={`font-black uppercase tracking-wider text-center ${sizeDim.labelFont} text-[#141416]`}>
          {label}
        </span>
      </div>

      {/* Main Knob Physical Body */}
      <div className="relative flex items-center justify-center p-1.5">
        {/* Radial Tick Arc Background */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ width: sizeDim.diameter + 14, height: sizeDim.diameter + 14 }}
        >
          {Array.from({ length: ticks }).map((_, idx) => {
            const tickAngle = -135 + (idx / (ticks - 1)) * 270;
            const isActive = angle >= tickAngle - 2;
            return (
              <div
                key={idx}
                className="absolute origin-bottom"
                style={{
                  height: sizeDim.diameter / 2 + 5,
                  width: '2px',
                  transform: `rotate(${tickAngle}deg)`,
                }}
              >
                <div
                  className={`w-full rounded-[1px] transition-colors duration-100 ${
                    isActive ? 'h-1.5 bg-[#FF3B00]' : 'h-1 bg-[#A8A49A]'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Rotary Knurled Disc */}
        <div
          ref={knobRef}
          onMouseDown={(e) => handleStart(e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) handleStart(e.touches[0].clientY);
          }}
          className={`relative rounded-full cursor-ns-resize shadow-[2px_2px_0px_#141416] active:shadow-[0px_0px_0px_#141416] transition-transform flex items-center justify-center border-2 ${
            colorStyles.cap
          }`}
          style={{
            width: sizeDim.diameter,
            height: sizeDim.diameter,
            touchAction: 'none',
          }}
        >
          {/* Subtle knurling ring pattern */}
          <div className="absolute inset-0.5 rounded-full border border-black/20 pointer-events-none" />

          {/* Machined Pointer Line */}
          <div
            className="absolute inset-0 flex items-start justify-center transition-transform duration-75 ease-out"
            style={{
              transform: `rotate(${angle}deg)`,
            }}
          >
            <div
              className={`w-1 rounded-full shadow-sm mt-1 ${colorStyles.line}`}
              style={{
                height: sizeDim.inner / 2 - 2,
              }}
            />
          </div>

          {/* Inner Center Hub Cap */}
          <div
            className="rounded-full bg-[#141416] border border-[#55534D] shadow-inner flex items-center justify-center pointer-events-none"
            style={{
              width: sizeDim.inner / 2.2,
              height: sizeDim.inner / 2.2,
            }}
          >
            <div className="w-1 h-1 rounded-full bg-[#FAF9F6]/40" />
          </div>
        </div>
      </div>

      {/* Value Readout & Quick Step Controls */}
      <div className="flex items-center gap-1 mt-1.5">
        <button
          type="button"
          onClick={stepDown}
          className="w-4 h-4 rounded-[2px] bg-[#ECEAE4] hover:bg-[#FAF9F6] border border-[#141416] text-[9px] font-black flex items-center justify-center text-[#141416] cursor-pointer active:scale-95 shadow-[1px_1px_0px_#141416]"
          title="Decrease"
        >
          -
        </button>

        <div className="px-1.5 py-0.5 bg-[#D6D2C4] border border-[#141416] rounded-[2px] text-center min-w-[42px] shadow-inner">
          <span className="font-mono text-[10px] font-black text-[#141416]">
            {displayValue !== undefined ? displayValue : `${clampedVal}${unit}`}
          </span>
        </div>

        <button
          type="button"
          onClick={stepUp}
          className="w-4 h-4 rounded-[2px] bg-[#ECEAE4] hover:bg-[#FAF9F6] border border-[#141416] text-[9px] font-black flex items-center justify-center text-[#141416] cursor-pointer active:scale-95 shadow-[1px_1px_0px_#141416]"
          title="Increase"
        >
          +
        </button>
      </div>

      {/* Snap Option Labels (if provided) */}
      {snapLabels && snapLabels.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap justify-center max-w-[120px]">
          {snapLabels.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleSnapClick(item.value)}
              className={`text-[8px] px-1 py-0.2 rounded-[2px] border font-bold uppercase transition-all cursor-pointer ${
                value === item.value
                  ? 'bg-[#141416] text-white border-[#141416]'
                  : 'bg-white/60 text-[#5C5A52] border-[#C5C3BB] hover:text-[#141416]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
