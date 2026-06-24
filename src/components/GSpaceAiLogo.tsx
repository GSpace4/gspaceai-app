// GSpaceAi Logo — matches actual brand logo
// Icon: 4 colored corner brackets + inward diagonal arrows + center sparkle
// Wordmark: "GSpace" in charcoal, "Ai" in brand blue

type LogoProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

const SIZES = {
  sm: { icon: 28, wordmark: "text-lg" },
  md: { icon: 36, wordmark: "text-2xl" },
  lg: { icon: 52, wordmark: "text-4xl" },
};

// Simple right-pointing arrow path, centered at origin — rotated per corner
const ARROW = "M -7 -2.5 L 3 -2.5 L 3 -5.5 L 9 0 L 3 5.5 L 3 2.5 L -7 2.5 Z";

export default function GSpaceAiLogo({
  size = "md",
  showWordmark = true,
  className = "",
}: LogoProps) {
  const { icon, wordmark } = SIZES[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="GSpaceAi icon"
      >
        {/* ── Corner brackets (thick rounded L-shapes) ── */}

        {/* Blue — top-left */}
        <path
          d="M 8 38 L 8 16 Q 8 8 16 8 L 38 8"
          stroke="#4285f3" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Red — top-right */}
        <path
          d="M 62 8 L 84 8 Q 92 8 92 16 L 92 38"
          stroke="#ea4335" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Green — bottom-left */}
        <path
          d="M 8 62 L 8 84 Q 8 92 16 92 L 38 92"
          stroke="#35a852" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Yellow — bottom-right */}
        <path
          d="M 62 92 L 84 92 Q 92 92 92 84 L 92 62"
          stroke="#fabc04" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"
        />

        {/* ── Inward diagonal arrows ── */}

        {/* Blue ↘ — top-left quadrant */}
        <path d={ARROW} transform="translate(29,29) rotate(45)"  fill="#4285f3" />
        {/* Red ↙ — top-right quadrant */}
        <path d={ARROW} transform="translate(71,29) rotate(135)" fill="#ea4335" />
        {/* Green ↗ — bottom-left quadrant */}
        <path d={ARROW} transform="translate(29,71) rotate(-45)" fill="#35a852" />
        {/* Yellow ↖ — bottom-right quadrant */}
        <path d={ARROW} transform="translate(71,71) rotate(225)" fill="#fabc04" />

        {/* ── Center 4-pointed sparkle ── */}
        <path
          d="M 50 35 L 55 45 L 65 50 L 55 55 L 50 65 L 45 55 L 35 50 L 45 45 Z"
          fill="#4285f3"
        />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span className={`font-bold ${wordmark} leading-none`}>
          <span className="text-brand-dark">GSpace</span>
          <span className="text-brand-blue">Ai</span>
        </span>
      )}
    </div>
  );
}
