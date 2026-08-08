import localFont from 'next/font/local'

/**
 * Font layer — self-hosted, not fetched from Google.
 *
 * Both faces ship as variable woff2 in app/fonts/ and are served same-origin.
 * That is faster than next/font/google (no DNS lookup and TLS handshake to
 * fonts.gstatic.com sitting on the critical render path), it makes the build
 * reproducible offline, and it is exactly the shape the licensed Recoleta will
 * slot into later.
 *
 * Two files, 146 KB total, covering every weight the site uses.
 *
 * ── SWAPPING IN RECOLETA ────────────────────────────────────────────────────
 * Recoleta is a commercial Latinotype face and cannot legally be served from a
 * free CDN, so the site ships on Fraunces — the closest open-source substitute.
 * Once a webfont licence is bought:
 *   1. drop Recoleta-Medium.woff2 (and any other weights) into app/fonts/
 *   2. replace the `display` block below with the commented one at the bottom
 *   3. delete the `font-variation-settings` line from `.font-display` in
 *      globals.css — Recoleta is a static family with no SOFT/WONK/opsz axes
 * Nothing else changes: every component reads `var(--font-display)`, never a
 * font name.
 */

export const display = localFont({
  src: [
    {
      path: './fonts/Fraunces-Variable.woff2',
      // One file spanning 100–900. Declaring the full range lets the browser
      // interpolate any weight rather than faux-bolding, and means adding a
      // weight downstream costs no extra request.
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-display',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  // Fraunces runs optically larger than Georgia at the same size. Scaling the
  // fallback metrics holds CLS at zero through the swap — and means the
  // eventual move to Recoleta will not reflow every heading on the site.
  adjustFontFallback: 'Times New Roman',
})

export const body = localFont({
  src: [
    {
      path: './fonts/PlusJakartaSans-Variable.woff2',
      weight: '200 800',
      style: 'normal',
    },
  ],
  variable: '--font-body',
  display: 'swap',
  preload: true,
  fallback: ['-apple-system', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
})

/* ---------------------------------------------------------------------------
 * Licensed Recoleta — replace the `display` export above with this.
 *
 * export const display = localFont({
 *   variable: '--font-display',
 *   display: 'swap',
 *   preload: true,
 *   fallback: ['Georgia', 'serif'],
 *   adjustFontFallback: 'Times New Roman',
 *   src: [
 *     { path: './fonts/Recoleta-Regular.woff2',  weight: '400', style: 'normal' },
 *     { path: './fonts/Recoleta-Medium.woff2',   weight: '500', style: 'normal' },
 *     { path: './fonts/Recoleta-SemiBold.woff2', weight: '600', style: 'normal' },
 *   ],
 * })
 * ------------------------------------------------------------------------- */
