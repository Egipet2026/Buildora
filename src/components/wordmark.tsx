/**
 * The Buildora logo.
 *
 * Drawn rather than loaded: at a kilobyte it costs less than the request that
 * would fetch it, it is sharp at every size from a favicon to a billboard, and
 * it cannot arrive a frame late and shift the header.
 *
 * The gradient needs an `id`, and an `id` must be unique on the page — the
 * header and the footer both show the mark. Rather than reach for a hook (this
 * has no business being a client component), each caller names its own.
 */
/**
 * The logo's own two colours. They are deliberately not the site's `--color-ink`
 * and `--color-brand`: a logo keeps its colours wherever it is placed, and the
 * navy here is a shade warmer than the near-black the site sets text in.
 */
const LOGO_INK = "#1e2a3a";
const LOGO_BLUE = "#1f5fef";

export function BuildoraMark({
  className = "",
  idSuffix = "",
  ink = LOGO_INK,
}: {
  className?: string;
  /** Distinguishes this instance's gradient from any other on the page. */
  idSuffix?: string;
  /** For placing the mark on a dark ground, where navy would disappear. */
  ink?: string;
}) {
  const gradient = `buildora-blue${idSuffix ? `-${idSuffix}` : ""}`;

  return (
    <svg
      viewBox="-8 -8 416 472"
      className={className}
      role="img"
      aria-label="Buildora"
    >
      <defs>
        <linearGradient id={gradient} x1="0.1" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#4c8dff" />
          <stop offset="1" stopColor="#1b52dd" />
        </linearGradient>
      </defs>

      {/* The tower: an open frame, drawn as one stroked line. */}
      {/* The tower: an open frame, drawn as one stroked line. */}
      <path
        d="M 22 456 L 22 98 L 143 36 L 143 456"
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth="44"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      />

      <g fill={ink}>
        {/* Skyline and the B's stem are one shape, so no seam shows where
            they meet. */}
        <path d="M 63 456 L 63 302 L 122 244 L 122 232 L 178 165 L 178 456 Z" />
        <path
          fillRule="evenodd"
          d="M 153 56
             L 270 56
             A 92.5 92.5 0 0 1 270 241
             L 292 241
             A 107.5 107.5 0 0 1 292 456
             L 153 456 Z
             M 210 109 L 270 109 A 39.5 39.5 0 0 1 270 188 L 210 188 Z
             M 210 294 L 293 294 A 54 54 0 0 1 293 402 L 210 402 Z"
        />
      </g>
    </svg>
  );
}

/**
 * Mark plus name, the way the logo is meant to be set: caps, widely tracked,
 * with the D picked out in the same blue as the tower.
 *
 * It stays real text rather than becoming lettering in the SVG. A screen
 * reader announces the name, a search engine indexes it, and it renders in the
 * reader's own font at whatever size they have chosen.
 */
export function Wordmark({
  idSuffix,
  markClassName = "h-8",
  textClassName = "",
}: {
  idSuffix: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <>
      <BuildoraMark
        idSuffix={idSuffix}
        className={`${markClassName} w-auto`}
      />
      {/* Set caps and widely tracked, the name is half again as wide as it
          looks — enough to push the header off the side of a small phone. It
          tightens as the screen narrows, and on the very narrowest the mark
          carries the brand on its own rather than shoving the menu off. */}
      <span
        className={`hidden font-display font-bold min-[370px]:inline text-[0.9375rem] tracking-[0.09em] sm:text-[1.0625rem] sm:tracking-[0.16em] ${textClassName}`}
        style={{ color: LOGO_INK }}
      >
        BUIL<span style={{ color: LOGO_BLUE }}>D</span>ORA
      </span>
    </>
  );
}
