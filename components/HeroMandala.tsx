/**
 * The ornament on the right of the hero.
 *
 * It was four concentric circles and seven pairs of smaller ones — a thali
 * diagram rather than a decoration, and at 20% opacity it read as a smudge of
 * rings. This is a proper mandala: eight layers of radial symmetry built from
 * lotus petals, a scalloped rim, rangoli dot work and fine spokes, with opacity
 * graded from the centre outward so it has depth instead of sitting flat.
 *
 * Deliberately a server component with no hooks and no client JS. Every value
 * is computed from the geometry helpers below, so the markup is byte-identical
 * on the server and in the browser — the same reason DishImage derives its hue
 * from a hash rather than picking one at runtime.
 *
 * Static, too. The design system allows three motion durations, all of them
 * interaction timings; a slowly rotating background is not one of them, and a
 * well-drawn mandala does not need to move to be worth looking at.
 *
 * Coordinates are rounded to two decimals. At this size the difference is
 * invisible and it keeps several hundred path numbers from tripling the size of
 * the HTML.
 */

const C = 100 // centre, in viewBox units
const r2 = (n: number) => Math.round(n * 100) / 100

/** Polar to cartesian, with 0° at twelve o'clock. */
function pt(radius: number, angleTurns: number): [number, number] {
  const a = angleTurns * Math.PI * 2 - Math.PI / 2
  return [r2(C + Math.cos(a) * radius), r2(C + Math.sin(a) * radius)]
}

/**
 * One lotus petal, as a closed path.
 *
 * Two quadratic curves from the inner radius out to a point at `outer`, bowing
 * to either side at `spread` of a turn. Pointed rather than rounded, which is
 * what makes it read as a petal and not a balloon.
 */
function petal(inner: number, outer: number, turn: number, spread: number): string {
  const [x0, y0] = pt(inner, turn)
  const [xt, yt] = pt(outer, turn)
  const mid = (inner + outer) / 2
  const [xa, ya] = pt(mid, turn - spread)
  const [xb, yb] = pt(mid, turn + spread)
  return `M${x0} ${y0}Q${xa} ${ya} ${xt} ${yt}Q${xb} ${yb} ${x0} ${y0}Z`
}

/** A ring of `count` petals, each rotated into place. */
function petalRing(count: number, inner: number, outer: number, spread: number, offset = 0): string {
  return Array.from({ length: count }, (_, i) => petal(inner, outer, (i + offset) / count, spread)).join('')
}

/**
 * A scalloped ring: `count` outward semicircular bumps around `radius`.
 *
 * The arc radius is half the chord between adjacent points, which is what makes
 * consecutive bumps meet exactly rather than overlap or leave a gap.
 */
function scallops(count: number, radius: number): string {
  const half = 0.5 / count
  const arc = r2(radius * Math.sin(half * Math.PI * 2))
  return Array.from({ length: count }, (_, i) => {
    const [x0, y0] = pt(radius, i / count - half)
    const [x1, y1] = pt(radius, i / count + half)
    return `M${x0} ${y0}A${arc} ${arc} 0 0 1 ${x1} ${y1}`
  }).join('')
}

/** Radial ticks between two radii — the fine spokes under the rim. */
function spokes(count: number, inner: number, outer: number, offset = 0): string {
  return Array.from({ length: count }, (_, i) => {
    const [x0, y0] = pt(inner, (i + offset) / count)
    const [x1, y1] = pt(outer, (i + offset) / count)
    return `M${x0} ${y0}L${x1} ${y1}`
  }).join('')
}

/**
 * A band of small lozenges — the beadwork course that traditionally separates
 * one register of a carved mandala from the next. Fills the dead space between
 * the petal tips and the rim, which otherwise reads as an unfinished gap.
 */
function diamonds(count: number, radius: number, h: number, w: number): string {
  return Array.from({ length: count }, (_, i) => {
    const turn = i / count
    const [xi, yi] = pt(radius - h, turn)
    const [xo, yo] = pt(radius + h, turn)
    const [xl, yl] = pt(radius, turn - w)
    const [xr, yr] = pt(radius, turn + w)
    return `M${xi} ${yi}L${xl} ${yl}L${xo} ${yo}L${xr} ${yr}Z`
  }).join('')
}

/** Rangoli dot work — the dots a mandala is pegged out from before it is drawn. */
function dots(count: number, radius: number, size: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => {
    const [cx, cy] = pt(radius, (i + offset) / count)
    return <circle key={i} cx={cx} cy={cy} r={size} />
  })
}

export function HeroMandala({ className }: { className?: string }) {
  const copper = '#D9853F'
  const cream = '#F7F1E6'

  return (
    <div aria-hidden="true" className={className}>
      <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          {/*
            Fades the outermost rings into the hero gradient instead of ending
            on a hard circle, so the ornament sits in the ground rather than on
            top of it.
          */}
          <radialGradient id="mandala-fade">
            {/*
              The gradient's default radius is 50% of the viewBox, so these
              offsets are radii in viewBox units: full strength out to 62,
              easing away by the rim at 95. Set too tight (it began fading at
              45) the mask ate the petal ring the mandala is mostly made of.
            */}
            <stop offset="62%" stopColor="#fff" stopOpacity="1" />
            <stop offset="84%" stopColor="#fff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="mandala-mask">
            <rect width="200" height="200" fill="url(#mandala-fade)" />
          </mask>
        </defs>

        <g mask="url(#mandala-mask)">
          {/* ---- rim: scallops, spokes, dots ---- */}
          <g stroke={copper} opacity="0.26">
            <path d={scallops(36, 95)} strokeWidth="0.4" />
            <circle cx={C} cy={C} r="95" strokeWidth="0.5" />
            <circle cx={C} cy={C} r="88" strokeWidth="0.35" opacity="0.7" />
            <path d={spokes(72, 88, 95)} strokeWidth="0.3" opacity="0.6" />
          </g>

          <g stroke={copper} opacity="0.3">
            <path d={diamonds(24, 84, 2.6, 0.007)} strokeWidth="0.34" />
          </g>

          <g fill={cream} stroke="none" opacity="0.26">
            {dots(48, 78.5, 0.5, 0.5)}
          </g>

          {/* ---- outer petal ring ---- */}
          <g stroke={copper} opacity="0.34">
            <path d={petalRing(16, 54, 80, 0.019)} strokeWidth="0.5" />
            {/* Half-offset inner echo, so the ring reads as two interleaved
                layers the way a carved one does. */}
            <path d={petalRing(16, 58, 72, 0.011, 0.5)} strokeWidth="0.34" opacity="0.72" />
          </g>

          <g stroke={cream} opacity="0.14">
            <circle cx={C} cy={C} r="52.5" strokeWidth="0.35" />
            <circle cx={C} cy={C} r="53.6" strokeWidth="0.2" opacity="0.7" />
          </g>

          {/* ---- middle band ---- */}
          <g stroke={copper} opacity="0.42">
            <circle cx={C} cy={C} r="50" strokeWidth="0.55" />
            <path d={scallops(24, 50)} strokeWidth="0.32" opacity="0.6" />
            <path d={petalRing(8, 26, 47, 0.03)} strokeWidth="0.6" />
            <path d={petalRing(8, 30, 41, 0.016, 0.5)} strokeWidth="0.36" opacity="0.7" />
          </g>

          <g fill={copper} stroke="none" opacity="0.3">
            {dots(16, 22, 0.7, 0.5)}
          </g>

          {/* ---- centre rosette ---- */}
          <g stroke={copper} opacity="0.55">
            <circle cx={C} cy={C} r="19" strokeWidth="0.45" />
            <path d={petalRing(6, 6, 17, 0.048)} strokeWidth="0.6" />
            <circle cx={C} cy={C} r="5.5" strokeWidth="0.7" />
          </g>
          <circle cx={C} cy={C} r="1.7" fill={copper} opacity="0.6" />
        </g>
      </svg>
    </div>
  )
}
