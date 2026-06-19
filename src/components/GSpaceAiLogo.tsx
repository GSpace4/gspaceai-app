// GSpaceAi Logo — SVG recreation from brand guide
// Icon: rounded square with Google-color corner arcs + sparkle
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
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="GSpaceAi icon"
      >
        {/* Background rounded square */}
        <rect width="48" height="48" rx="10" fill="#f8f9fa" />

        {/* Top-left arc — Blue */}
        <path
          d="M6 18 C6 11 11 6 18 6 L6 6 Z"
          fill="#4285f3"
        />
        <path
          d="M6 6 L18 6 C11.4 6 6 11.4 6 18 Z"
          fill="#4285f3"
        />

        {/* Top-right arc — Red */}
        <path
          d="M42 18 C42 11 37 6 30 6 L42 6 Z"
          fill="#ea4335"
        />
        <path
          d="M42 6 L30 6 C36.6 6 42 11.4 42 18 Z"
          fill="#ea4335"
        />

        {/* Bottom-left arc — Green */}
        <path
          d="M6 30 C6 37 11 42 18 42 L6 42 Z"
          fill="#35a852"
        />
        <path
          d="M6 42 L18 42 C11.4 42 6 36.6 6 30 Z"
          fill="#35a852"
        />

        {/* Bottom-right arc — Yellow */}
        <path
          d="M42 30 C42 37 37 42 30 42 L42 42 Z"
          fill="#fabc04"
        />
        <path
          d="M42 42 L30 42 C36.6 42 42 36.6 42 30 Z"
          fill="#fabc04"
        />

        {/* Corner dots */}
        <circle cx="10" cy="10" r="2" fill="#4285f3" opacity="0.7" />
        <circle cx="38" cy="10" r="2" fill="#ea4335" opacity="0.7" />
        <circle cx="10" cy="38" r="2" fill="#35a852" opacity="0.7" />
        <circle cx="38" cy="38" r="2" fill="#fabc04" opacity="0.7" />

        {/* Center sparkle — Blue */}
        <path
          d="M24 14 L25.5 21 L32 24 L25.5 27 L24 34 L22.5 27 L16 24 L22.5 21 Z"
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
