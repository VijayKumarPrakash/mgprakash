export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-[#FAFAF8] mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <p className="font-display text-base font-semibold text-[#1a1a1a] mb-1">
              M G Prakash Catering
            </p>
            <p className="text-xs text-stone-500">Established 2000</p>
          </div>

          <a
            href="https://maps.app.goo.gl/uCvx2H7ypzXHDoPi9"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stone-600 leading-relaxed hover:text-[#1a1a1a] transition-colors group"
          >
            <p>611, 10th Cross Rd</p>
            <p>Indiranagar Rajajinagar</p>
            <p>Bengaluru, Karnataka 560079</p>
            <p className="text-xs text-stone-400 mt-1 group-hover:text-[var(--color-accent)] transition-colors">
              Open in Google Maps ↗
            </p>
          </a>

          <div className="text-sm text-stone-600 space-y-2">
            <a href="tel:+919880193165" className="flex items-center gap-2 hover:text-[#1a1a1a] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.06 6.06l1.01-.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.01z" />
              </svg>
              +91 98801 93165
            </a>
            <a href="mailto:vijaykumar.sb.99@gmail.com" className="flex items-center gap-2 hover:text-[#1a1a1a] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              vijaykumar.sb.99@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-200 text-xs text-stone-400 text-center">
          © {new Date().getFullYear()} M G Prakash Catering. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
