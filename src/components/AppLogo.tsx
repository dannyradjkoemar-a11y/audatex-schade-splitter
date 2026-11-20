import React, { useId } from 'react';

interface AppLogoProps {
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-9 h-9' }) => {
  const uid = useId().replace(/:/g, '');
  const clipTop = `calc-split-top-${uid}`;
  const clipBottom = `calc-split-bottom-${uid}`;

  return (
    <div
      className={`${className} rounded-md bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 p-1`}
      title="Audatex Schade Calculatie Splitter"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipTop}>
            <polygon points="0,0 32,0 32,3.43 0,28.57" />
          </clipPath>
          <clipPath id={clipBottom}>
            <polygon points="0,28.57 32,3.43 32,32 0,32" />
          </clipPath>
        </defs>

        {/* Bovenste helft van de calculatie (Voorzijde / Deel A) */}
        <g clipPath={`url(#${clipTop})`} transform="translate(-0.7, -0.7)">
          <rect
            x="6"
            y="3.5"
            width="20"
            height="25"
            rx="2"
            fill="#EFF6FF"
            stroke="#1D4ED8"
            strokeWidth="1.5"
          />
          {/* Headerbalk calculatie */}
          <path
            d="M6 5.5C6 4.39543 6.89543 3.5 8 3.5H24C25.1046 3.5 26 4.39543 26 5.5V8.5H6V5.5Z"
            fill="#1D4ED8"
          />
          {/* Calculatieregels */}
          <rect x="8.8" y="11.2" width="8.2" height="1.6" rx="0.8" fill="#1E40AF" />
          <rect x="19.2" y="11.2" width="4" height="1.6" rx="0.8" fill="#3B82F6" />
          <rect x="8.8" y="15" width="7.2" height="1.6" rx="0.8" fill="#1E40AF" />
          <rect x="19.2" y="15" width="4" height="1.6" rx="0.8" fill="#3B82F6" />
          <rect x="8.8" y="18.8" width="9.4" height="1.6" rx="0.8" fill="#1E40AF" />
          <rect x="8.8" y="23.2" width="14.4" height="2" rx="1" fill="#1E3A8A" />
        </g>

        {/* Onderste helft van de calculatie (Achterzijde / Deel B) */}
        <g clipPath={`url(#${clipBottom})`} transform="translate(0.9, 0.9)">
          <rect
            x="6"
            y="3.5"
            width="20"
            height="25"
            rx="2"
            fill="#EEF2FF"
            stroke="#4338CA"
            strokeWidth="1.5"
          />
          <path
            d="M6 5.5C6 4.39543 6.89543 3.5 8 3.5H24C25.1046 3.5 26 4.39543 26 5.5V8.5H6V5.5Z"
            fill="#4338CA"
          />
          <rect x="8.8" y="11.2" width="8.2" height="1.6" rx="0.8" fill="#3730A3" />
          <rect x="19.2" y="11.2" width="4" height="1.6" rx="0.8" fill="#6366F1" />
          <rect x="8.8" y="15" width="7.2" height="1.6" rx="0.8" fill="#3730A3" />
          <rect x="19.2" y="15" width="4" height="1.6" rx="0.8" fill="#6366F1" />
          <rect x="8.8" y="18.8" width="9.4" height="1.6" rx="0.8" fill="#3730A3" />
          <rect x="19.2" y="18.8" width="4" height="1.6" rx="0.8" fill="#6366F1" />
          <rect x="8.8" y="23.2" width="14.4" height="2" rx="1" fill="#312E81" />
        </g>

        {/* Witte scheidingsgleuf langs de diagonale snijlijn */}
        <line
          x1="2"
          y1="27"
          x2="30"
          y2="5"
          stroke="#FFFFFF"
          strokeWidth="3.4"
          strokeLinecap="round"
        />

        {/* Scherpe diagonale splitsingsstreep door de calculatie */}
        <line
          x1="2.5"
          y1="26.6"
          x2="29.5"
          y2="5.4"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
