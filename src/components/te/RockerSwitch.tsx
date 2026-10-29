import React from 'react';
import { sound } from '../../services/soundEffects';

interface RockerSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  sublabel?: string;
  indicatorColor?: 'orange' | 'yellow' | 'blue';
  className?: string;
}

export const RockerSwitch: React.FC<RockerSwitchProps> = ({
  checked,
  onChange,
  label,
  sublabel,
  indicatorColor = 'orange',
  className = '',
}) => {
  const toggle = () => {
    sound.playKeyClick();
    onChange(!checked);
  };

  const ledColor = {
    orange: checked ? 'bg-[#FF3B00] shadow-[0_0_6px_#FF3B00]' : 'bg-[#55534D]',
    yellow: checked ? 'bg-[#FFB800] shadow-[0_0_6px_#FFB800]' : 'bg-[#55534D]',
    blue: checked ? 'bg-[#0047FF] shadow-[0_0_6px_#0047FF]' : 'bg-[#55534D]',
  }[indicatorColor];

  return (
    <div
      onClick={toggle}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none font-mono group ${className}`}
    >
      {/* 3D Mechanical Rocker Body */}
      <div className="relative w-12 h-6 bg-[#141416] rounded-[3px] p-[2px] border border-[#3E3E48] shadow-[2px_2px_0px_#141416] flex items-center transition-all">
        {/* Toggle Rocker Paddle */}
        <div
          className={`w-5 h-4.5 rounded-[2px] border border-[#141416] transition-transform duration-100 flex items-center justify-center shadow-sm ${
            checked
              ? 'translate-x-6 bg-[#FF3B00] text-white font-black'
              : 'translate-x-0 bg-[#ECEAE4] text-[#5C5A52]'
          }`}
        >
          <span className="text-[8px] font-bold tracking-tighter">
            {checked ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* LED Pin Indicator */}
        <div className={`absolute left-1 top-1 w-1.5 h-1.5 rounded-full transition-all ${ledColor}`} />
      </div>

      <div>
        <span className="text-[11px] font-black uppercase text-[#141416] block group-hover:text-[#FF3B00] transition-colors leading-tight">
          {label}
        </span>
        {sublabel && (
          <span className="text-[9px] text-[#5C5A52] block leading-tight">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
