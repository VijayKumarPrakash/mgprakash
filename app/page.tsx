import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-36 lg:py-44">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-widest uppercase text-stone-500 mb-6">
              Established 2000 · Bengaluru
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-[#1a1a1a] mb-6">
              Catering crafted<br />for every occasion
            </h1>
            <p className="text-lg sm:text-xl text-stone-600 leading-relaxed mb-10 max-w-xl">
              From intimate family gatherings to grand wedding receptions — authentic South and North Indian cuisine, delivered with care.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/order/new"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                Place an Order
              </Link>
              <Link
                href="/menu"
                className="inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-semibold text-[#1a1a1a] border border-stone-300 hover:border-stone-400 transition-colors bg-transparent"
              >
                Browse the Menu
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative divider */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:block pointer-events-none">
          <div
            className="w-full h-full opacity-10"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                var(--color-accent),
                var(--color-accent) 1px,
                transparent 1px,
                transparent 12px
              )`,
            }}
          />
        </div>
      </section>

      {/* Highlights */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
            {[
              {
                label: 'Occasions',
                value: 'Weddings, Birthdays & More',
                detail: 'Tailored menus for every kind of celebration.',
              },
              {
                label: 'Cuisine',
                value: 'South & North Indian',
                detail: 'From Masala Dosa to Butter Chicken — freshly prepared.',
              },
              {
                label: 'Experience',
                value: 'Over 25 Years',
                detail: 'Trusted by hundreds of families across Bengaluru.',
              },
            ].map(({ label, value, detail }) => (
              <div key={label} className="border-l-2 pl-6" style={{ borderColor: 'var(--color-accent)' }}>
                <p className="text-xs font-medium tracking-widest uppercase text-stone-400 mb-1">{label}</p>
                <p className="text-base font-semibold text-[#1a1a1a] mb-1">{value}</p>
                <p className="text-sm text-stone-500">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="border-t border-stone-200 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1a1a1a] mb-2">
              Ready to plan your event?
            </h2>
            <p className="text-stone-500 text-base">Browse our full dish catalogue and build your perfect menu.</p>
          </div>
          <Link
            href="/menu"
            className="flex-shrink-0 inline-flex items-center justify-center px-8 py-4 rounded-full text-base font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent)' }}
          >
            View Full Menu
          </Link>
        </div>
      </section>
    </div>
  )
}
