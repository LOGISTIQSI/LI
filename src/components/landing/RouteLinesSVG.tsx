export default function RouteLinesSVG() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Radial gradient for depth */}
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--bg-primary)" stopOpacity="0" />
        </radialGradient>

        {/* Glow filter for nodes */}
        <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Radial glow background */}
      <rect width="1200" height="800" fill="url(#hero-glow)" />

      {/* Dotted route lines — simulating transport corridors */}
      <g stroke="#0d9488" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.25">
        {/* Horizontal corridors */}
        <line x1="0" y1="200" x2="1200" y2="160" />
        <line x1="0" y1="400" x2="1200" y2="380" />
        <line x1="0" y1="600" x2="1200" y2="640" />

        {/* Diagonal corridors */}
        <line x1="100" y1="100" x2="600" y2="500" />
        <line x1="700" y1="100" x2="300" y2="500" />
        <line x1="800" y1="200" x2="1100" y2="600" />
        <line x1="200" y1="300" x2="500" y2="700" />

        {/* Vertical connectors */}
        <line x1="300" y1="0" x2="300" y2="800" />
        <line x1="600" y1="0" x2="600" y2="800" />
        <line x1="900" y1="0" x2="900" y2="800" />
      </g>

      {/* Glowing nodes */}
      <g filter="url(#node-glow)">
        {[
          [200, 200],
          [300, 160],
          [600, 380],
          [900, 200],
          [300, 400],
          [600, 500],
          [900, 640],
          [500, 700],
          [100, 600],
          [700, 100],
          [1000, 400],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={i === 5 ? 5 : 3}
            fill="#0d9488"
            opacity={i === 5 ? 0.8 : 0.4}
          />
        ))}
      </g>
    </svg>
  );
}
