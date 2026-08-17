import { ImageResponse } from 'next/og'
import { BUSINESS, BRAND } from '@/lib/business'
import { getDishCount } from '@/lib/dishes'

/**
 * The social card. There was none, so a link pasted into WhatsApp — which is
 * how a Bengaluru catering enquiry actually gets forwarded between families —
 * rendered as a bare grey rectangle.
 *
 * Drawn rather than photographed, for the same reason `DishImage` is: there is
 * no licensed hero photograph yet, and the thali line-art is the house
 * language for that gap. It also keeps this a pure computation with no file
 * read and no network fetch, so it cannot fail a build.
 *
 * Fonts are the system default rather than the site's Fraunces. Satori has to
 * be handed font binaries explicitly, and reading two variable woff2 files at
 * image-generation time to gain a serif on a card most people see at 400px
 * wide is not a trade worth making.
 */
export const alt = `${BUSINESS.name} — cooking contractor and caterer in Bengaluru`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const dishCount = await getDishCount()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: `linear-gradient(158deg, ${BRAND.dark} 0%, #241F1A 100%)`,
          color: '#F7F1E6',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Thali mark, echoing the hero ornament. */}
        <div
          style={{
            position: 'absolute',
            right: -110,
            top: 130,
            width: 520,
            height: 520,
            display: 'flex',
            opacity: 0.22,
          }}
        >
          <svg width="520" height="520" viewBox="0 0 200 200" fill="none" stroke="#D9853F">
            <circle cx="100" cy="100" r="94" strokeWidth="0.8" />
            <circle cx="100" cy="100" r="80" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="34" strokeWidth="1" />
            {Array.from({ length: 7 }, (_, i) => {
              const a = (i / 7) * Math.PI * 2 - Math.PI / 2
              return (
                <circle
                  key={i}
                  cx={100 + Math.cos(a) * 57}
                  cy={100 + Math.sin(a) * 57}
                  r="14"
                  strokeWidth="0.9"
                />
              )
            })}
          </svg>
        </div>

        <div style={{ display: 'flex', fontSize: 21, letterSpacing: 3, color: '#8A7F6E' }}>
          ESTABLISHED {BUSINESS.established} · BENGALURU
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
          <div style={{ display: 'flex', fontSize: 82, lineHeight: 1.05, fontWeight: 600 }}>
            M G Prakash Catering
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              marginTop: 22,
              color: '#D9853F',
              fontWeight: 500,
            }}
          >
            Cooking contractor &amp; caterer
          </div>
          <div style={{ display: 'flex', fontSize: 26, marginTop: 18, color: '#B8AC99' }}>
            Weddings, namakarana, gruha pravesha and corporate events
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 23,
            color: '#B8AC99',
            borderTop: '1px solid rgba(247,241,230,0.16)',
            paddingTop: 26,
          }}
        >
          <div style={{ display: 'flex' }}>{dishCount} dishes · South &amp; North Indian</div>
          <div style={{ display: 'flex' }}>{BUSINESS.phone}</div>
        </div>
      </div>
    ),
    size
  )
}
