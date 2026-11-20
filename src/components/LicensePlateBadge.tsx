import React from 'react';

interface LicensePlateBadgeProps {
  plate: string;
  size?: 'sm' | 'md' | 'lg';
}

const EU_STAR_ANGLES = Array.from({ length: 12 }, (_, idx) => (idx * 30 * Math.PI) / 180);

export const LicensePlateBadge: React.FC<LicensePlateBadgeProps> = ({ plate, size = 'md' }) => {
  const formattedPlate = (plate || 'ONBEKEND').toUpperCase().trim();

  const dimensions = {
    sm: {
      outer: 'h-7 min-w-[116px] rounded-[5px]',
      band: 'w-[18px]',
      starBox: 'w-3 h-3',
      nlText: 'text-[7px]',
      plateText: 'text-xs px-2.5 tracking-[0.11em]'
    },
    md: {
      outer: 'h-9 min-w-[154px] rounded-[6px]',
      band: 'w-[22px]',
      starBox: 'w-3.5 h-3.5',
      nlText: 'text-[8.5px]',
      plateText: 'text-base px-3.5 tracking-[0.12em]'
    },
    lg: {
      outer: 'h-12 min-w-[204px] rounded-[7px]',
      band: 'w-[28px]',
      starBox: 'w-4 h-4',
      nlText: 'text-[10.5px]',
      plateText: 'text-xl px-5 tracking-[0.13em]'
    }
  }[size];

  return (
    <div
      className={`inline-flex items-stretch overflow-hidden select-none bg-gradient-to-b from-[#FFCC00] via-[#F2B500] to-[#DEA100] border-[1.5px] border-slate-900/90 ring-1 ring-slate-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.22),0_1px_3px_rgba(15,23,42,0.18)] ${dimensions.outer}`}
      aria-label={`Nederlands kenteken ${formattedPlate}`}
    >
      {/* Authentieke blauwe EU-strook met 12 sterren en NL */}
      <div
        className={`${dimensions.band} shrink-0 bg-gradient-to-b from-[#0044CC] via-[#003399] to-[#002470] border-r border-black/25 flex flex-col items-center justify-center gap-[1px] py-0.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]`}
      >
        <svg
          viewBox="0 0 20 20"
          className={dimensions.starBox}
          aria-hidden="true"
        >
          {EU_STAR_ANGLES.map((angle, i) => {
            const cx = 10 + 6.4 * Math.sin(angle);
            const cy = 10 - 6.4 * Math.cos(angle);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="1.05"
                fill="#FFDA44"
              />
            );
          })}
        </svg>
        <span className={`font-sans font-extrabold leading-none tracking-tight text-white ${dimensions.nlText}`}>
          NL
        </span>
      </div>

      {/* Geel reflecterend kentekenveld met verzonken rand */}
      <div className="flex-1 flex items-center justify-center relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]">
        <span
          className={`font-mono font-extrabold uppercase text-[#0F141E] leading-none whitespace-nowrap [text-shadow:0_1px_0_rgba(255,255,255,0.35)] ${dimensions.plateText}`}
        >
          {formattedPlate}
        </span>
      </div>
    </div>
  );
};
