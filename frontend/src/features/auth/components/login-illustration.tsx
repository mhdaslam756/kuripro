export function LoginIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-w-[270px] h-auto mx-auto select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Soft purple radial glow from project brand */}
        <radialGradient id="kuriPurpleGlow" cx="55%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.01" />
        </radialGradient>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="125%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Decorative background circle & arch with brand purple glow */}
      <circle cx="185" cy="105" r="82" fill="url(#kuriPurpleGlow)" />
      <path
        d="M 120,170 A 75,75 0 0,1 265,125"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        className="text-border-strong opacity-60"
      />

      {/* Venetian Blinds / Background Room Lines (Left) */}
      <g className="text-border-strong" stroke="currentColor" strokeWidth="1" opacity="0.45">
        <line x1="88" y1="52" x2="128" y2="52" />
        <line x1="88" y1="61" x2="128" y2="61" />
        <line x1="88" y1="70" x2="128" y2="70" />
        <line x1="88" y1="79" x2="128" y2="79" />
        <line x1="88" y1="88" x2="128" y2="88" />
        <line x1="88" y1="97" x2="128" y2="97" />
        <line x1="88" y1="106" x2="128" y2="106" />
        <line x1="88" y1="115" x2="128" y2="115" />
      </g>

      {/* Potted Indoor Plant (Left) */}
      <g>
        {/* Leaves */}
        <path d="M 94,110 Q 80,90 86,70 Q 96,87 94,110 Z" fill="#6D28D9" className="dark:fill-[#A78BFA]" />
        <path d="M 96,105 Q 106,83 100,65 Q 92,81 96,105 Z" fill="#7C3AED" className="dark:fill-[#C4B5FD]" />
        <path d="M 91,115 Q 72,100 76,85 Q 86,97 91,115 Z" fill="#5B21B6" className="dark:fill-[#8B5CF6]" />
        <path d="M 98,113 Q 112,99 110,87 Q 100,97 98,113 Z" fill="#8B5CF6" className="dark:fill-[#DDD6FE]" />
        <path d="M 93,119 Q 78,113 80,101 Q 88,109 93,119 Z" fill="#6D28D9" className="dark:fill-[#A78BFA]" />
        <path d="M 97,119 Q 109,113 107,103 Q 100,110 97,119 Z" fill="#7C3AED" className="dark:fill-[#8B5CF6]" />

        {/* Plant Stems */}
        <path d="M 95,125 L 95,107" stroke="#6D28D9" strokeWidth="1.5" className="dark:stroke-[#C4B5FD]" />

        {/* Elegant Ceramic Vase */}
        <path
          d="M 89,127 Q 85,137 86,150 Q 87,163 95,167 Q 103,163 104,150 Q 105,137 101,127 Z"
          fill="#4C1D95"
          className="dark:fill-[#3B1F6A]"
        />
        {/* Vase base */}
        <rect x="90" y="166" width="10" height="2" rx="1" fill="#3B1270" className="dark:fill-[#2E1065]" />
      </g>

      {/* Floating Verification Envelope (Top Right) */}
      <g transform="translate(230, 56) rotate(-6)">
        {/* Envelope back */}
        <rect x="0" y="8" width="34" height="24" rx="3" fill="#EDE9FE" stroke="#6D28D9" strokeWidth="1.2" className="dark:fill-[#2E1065] dark:stroke-[#A78BFA]" />
        {/* Open Flap */}
        <path d="M 0,8 L 17,-3 L 34,8 Z" fill="#DDD6FE" stroke="#6D28D9" strokeWidth="1.2" className="dark:fill-[#3B1F6A] dark:stroke-[#A78BFA]" />
        {/* Letter paper coming out */}
        <rect x="4" y="2" width="26" height="15" rx="1.5" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="1" />
        <line x1="8" y1="6" x2="22" y2="6" stroke="#8B5CF6" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8" y1="10" x2="18" y2="10" stroke="#8B5CF6" strokeWidth="1.2" strokeLinecap="round" />
        {/* Envelope front folds */}
        <path d="M 0,32 L 14,20 M 34,32 L 20,20" stroke="#6D28D9" strokeWidth="1.2" className="dark:stroke-[#A78BFA]" />
      </g>

      {/* Dotted curve connecting phone to envelope */}
      <path
        d="M 198,76 Q 224,64 232,68"
        stroke="#8B5CF6"
        strokeWidth="1"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />

      {/* Central Smartphone Device Frame */}
      <g filter="url(#softShadow)">
        {/* Phone Body */}
        <rect
          x="126"
          y="36"
          width="74"
          height="136"
          rx="14"
          fill="#FFFFFF"
          stroke="#4C1D95"
          strokeWidth="2.5"
          className="dark:fill-[#120D22] dark:stroke-[#8B5CF6]"
        />

        {/* Screen Bezel / Inner Canvas */}
        <rect
          x="130"
          y="42"
          width="66"
          height="124"
          rx="10"
          fill="#F5F3FF"
          className="dark:fill-[#1A1330]"
        />

        {/* Top Speaker / Dynamic Pill */}
        <rect x="153" y="39" width="20" height="2.5" rx="1.25" fill="#4C1D95" className="dark:fill-[#8B5CF6]" />

        {/* Shield Icon inside Circle with Brand Purple */}
        <g transform="translate(163, 62)">
          <circle cx="0" cy="0" r="12" fill="#7C3AED" />
          <path
            d="M 0,-6.5 L 5.5,-3.8 C 5.5,1.5 2.5,5.5 0,7 C -2.5,5.5 -5.5,1.5 -5.5,-3.8 Z"
            fill="#FFFFFF"
          />
          <path
            d="M -2,0 L -0.5,1.8 L 2.8,-1.8"
            stroke="#7C3AED"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* "VERIFICATION CODE" mini bar / label */}
        <rect x="141" y="79" width="44" height="3" rx="1.5" fill="#DDD6FE" className="dark:fill-[#3B1F6A]" />

        {/* 6 OTP Boxes */}
        <g transform="translate(133, 87)">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={i * 10}
              y="0"
              width="8"
              height="8"
              rx="1.5"
              fill="#FFFFFF"
              stroke="#C4B5FD"
              strokeWidth="0.8"
              className="dark:fill-[#221A3E] dark:stroke-[#6D28D9]"
            />
          ))}
        </g>

        {/* Keypad Grid (3 columns x 4 rows) */}
        <g transform="translate(136, 101)">
          {/* Keypad background container */}
          <rect x="0" y="0" width="54" height="54" rx="4" fill="#EDE9FE" className="dark:fill-[#221A3E]" />
          {[0, 1, 2].map((col) =>
            [0, 1, 2, 3].map((row) => (
              <g key={`${col}-${row}`} transform={`translate(${col * 18 + 4}, ${row * 13 + 3})`}>
                <rect
                  x="0"
                  y="0"
                  width="10"
                  height="8"
                  rx="1.5"
                  fill="#FFFFFF"
                  stroke="#DDD6FE"
                  strokeWidth="0.6"
                  className="dark:fill-[#120D22] dark:stroke-[#5B21B6]"
                />
                {/* Simulated keypad dot / digit */}
                <circle cx="5" cy="4" r="1.2" fill="#7C3AED" className="dark:fill-[#A78BFA]" />
              </g>
            )),
          )}
        </g>
      </g>

      {/* Person Sitting Next to Phone (Right) */}
      <g>
        {/* Shadow under character */}
        <ellipse cx="230" cy="170" rx="28" ry="4.5" fill="#000000" opacity="0.1" />

        {/* Sitting Legs & Trousers */}
        <path
          d="M 215,160 C 205,164 196,166 190,167 C 188,167.5 190,169 194,169 C 204,169 215,166 225,164 C 235,166 248,169 254,168 C 255,166.5 252,164.5 246,162 C 240,159 233,156 226,156 Z"
          fill="#4C1D95"
          className="dark:fill-[#8B5CF6]"
        />
        {/* Feet / Shoes */}
        <ellipse cx="188" cy="168" rx="4" ry="2" fill="#2E1065" className="dark:fill-[#C4B5FD]" />
        <ellipse cx="254" cy="167" rx="4" ry="2" fill="#2E1065" className="dark:fill-[#C4B5FD]" />

        {/* Torso / Jacket */}
        <path
          d="M 220,134 C 220,129 228,129 234,130 C 238,131 241,136 242,142 C 243,148 238,158 234,160 C 228,160 220,159 218,151 Z"
          fill="#5B21B6"
          className="dark:fill-[#7C3AED]"
        />

        {/* Arm holding small phone */}
        <path
          d="M 224,136 C 220,139 217,144 216,149 C 218,150 223,149 227,146 Z"
          fill="#7C3AED"
          className="dark:fill-[#A78BFA]"
        />

        {/* Small Smartphone in hand */}
        <rect
          x="211"
          y="144"
          width="8"
          height="14"
          rx="2"
          transform="rotate(25 211 144)"
          fill="#2E1065"
          stroke="#C4B5FD"
          strokeWidth="0.8"
          className="dark:fill-[#120D22]"
        />

        {/* Head / Face */}
        <circle cx="230" cy="119" r="7.5" fill="#F8FAFC" stroke="#4C1D95" strokeWidth="1.2" className="dark:fill-[#1A1330] dark:stroke-[#A78BFA]" />

        {/* Hair (Black/deep purple stylized hair) */}
        <path
          d="M 224,118 C 223,112 227,108 234,109 C 238,110 240,114 238,120 C 236,122 234,128 237,131 C 233,130 230,125 230,122 C 226,122 225,120 224,118 Z"
          fill="#2E1065"
          className="dark:fill-[#DDD6FE]"
        />
      </g>

      {/* Ground baseline */}
      <line x1="72" y1="170" x2="268" y2="170" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="4 4" className="dark:stroke-[#2A2340]" />
    </svg>
  );
}
