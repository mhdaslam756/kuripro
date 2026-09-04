export function RegisterIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-w-[240px] h-auto mx-auto select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Soft purple radial glow from project brand */}
        <radialGradient id="registerPurpleGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.01" />
        </radialGradient>
        <filter id="regSoftShadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Decorative ambient background glow */}
      <circle cx="170" cy="90" r="75" fill="url(#registerPurpleGlow)" />
      <path
        d="M 100,145 A 70,70 0 0,1 240,110"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        className="text-border-strong opacity-50"
      />

      {/* Background Floating Card / Document Panels */}
      <rect
        x="130"
        y="30"
        width="68"
        height="50"
        rx="6"
        fill="#EDE9FE"
        stroke="#C4B5FD"
        strokeWidth="1"
        className="dark:fill-[#1A1330] dark:stroke-[#4C1D95]"
      />
      <line x1="140" y1="42" x2="168" y2="42" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="140" y1="50" x2="186" y2="50" stroke="#C4B5FD" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="140" y1="58" x2="176" y2="58" stroke="#C4B5FD" strokeWidth="1.5" strokeLinecap="round" />

      {/* Floating Lock Badge (Top Right) */}
      <g transform="translate(205, 30)">
        <rect x="0" y="8" width="22" height="18" rx="4" fill="#7C3AED" />
        <path d="M 5,8 L 5,5 C 5,1.5 17,1.5 17,5 L 17,8" stroke="#7C3AED" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="11" cy="17" r="2" fill="#FFFFFF" />
      </g>

      {/* Central Smartphone Device Frame */}
      <g filter="url(#regSoftShadow)">
        <rect
          x="148"
          y="35"
          width="68"
          height="118"
          rx="12"
          fill="#FFFFFF"
          stroke="#4C1D95"
          strokeWidth="2.2"
          className="dark:fill-[#120D22] dark:stroke-[#8B5CF6]"
        />
        {/* Screen */}
        <rect
          x="152"
          y="40"
          width="60"
          height="108"
          rx="8"
          fill="#F5F3FF"
          className="dark:fill-[#1A1330]"
        />
        {/* Notch */}
        <rect x="172" y="38" width="20" height="2" rx="1" fill="#4C1D95" className="dark:fill-[#8B5CF6]" />

        {/* Screen Content: User Profile Icon & Fields */}
        <circle cx="182" cy="58" r="9" fill="#7C3AED" />
        <circle cx="182" cy="56" r="4" fill="#FFFFFF" />
        <path d="M 175,64 C 175,60 189,60 189,64" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />

        {/* Input Field bars on phone screen */}
        <rect x="158" y="74" width="48" height="7" rx="3.5" fill="#FFFFFF" stroke="#DDD6FE" strokeWidth="0.8" className="dark:fill-[#120D22] dark:stroke-[#5B21B6]" />
        <circle cx="163" cy="77.5" r="1.5" fill="#8B5CF6" />

        <rect x="158" y="86" width="48" height="7" rx="3.5" fill="#FFFFFF" stroke="#DDD6FE" strokeWidth="0.8" className="dark:fill-[#120D22] dark:stroke-[#5B21B6]" />
        <circle cx="163" cy="89.5" r="1.5" fill="#8B5CF6" />

        <rect x="158" y="98" width="48" height="7" rx="3.5" fill="#FFFFFF" stroke="#DDD6FE" strokeWidth="0.8" className="dark:fill-[#120D22] dark:stroke-[#5B21B6]" />
        <circle cx="163" cy="101.5" r="1.5" fill="#8B5CF6" />

        {/* Submit button bar on phone screen */}
        <rect x="162" y="112" width="40" height="10" rx="5" fill="#7C3AED" />
        <line x1="174" y1="117" x2="190" y2="117" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Person Standing Next to Phone pointing at screen */}
      <g>
        {/* Shadow under character */}
        <ellipse cx="132" cy="154" rx="16" ry="3.5" fill="#000000" opacity="0.1" />

        {/* Legs & Trousers */}
        <path d="M 127,112 L 124,152" stroke="#4C1D95" strokeWidth="4" strokeLinecap="round" className="dark:stroke-[#8B5CF6]" />
        <path d="M 134,112 L 138,152" stroke="#4C1D95" strokeWidth="4" strokeLinecap="round" className="dark:stroke-[#8B5CF6]" />
        {/* Shoes */}
        <ellipse cx="123" cy="153" rx="4" ry="2" fill="#2E1065" className="dark:fill-[#C4B5FD]" />
        <ellipse cx="139" cy="153" rx="4" ry="2" fill="#2E1065" className="dark:fill-[#C4B5FD]" />

        {/* Torso / Blouse */}
        <path
          d="M 124,78 C 124,72 136,72 138,78 L 138,112 C 138,114 124,114 124,112 Z"
          fill="#6D28D9"
          className="dark:fill-[#7C3AED]"
        />

        {/* Arm reaching to point at phone screen */}
        <path
          d="M 136,83 L 152,82"
          stroke="#7C3AED"
          strokeWidth="3"
          strokeLinecap="round"
          className="dark:stroke-[#A78BFA]"
        />

        {/* Head */}
        <circle cx="131" cy="64" r="7" fill="#F8FAFC" stroke="#4C1D95" strokeWidth="1.2" className="dark:fill-[#1A1330] dark:stroke-[#A78BFA]" />
        {/* Hair */}
        <path
          d="M 125,64 C 124,58 128,54 135,55 C 138,56 140,60 137,66 C 135,68 133,74 136,77 C 132,76 129,71 129,68 C 126,68 125,66 125,64 Z"
          fill="#2E1065"
          className="dark:fill-[#DDD6FE]"
        />
      </g>

      {/* Baseline */}
      <line x1="80" y1="154" x2="250" y2="154" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-[#2A2340]" />
    </svg>
  );
}
