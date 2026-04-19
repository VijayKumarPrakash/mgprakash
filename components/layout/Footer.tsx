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

          <div className="text-sm text-stone-600 leading-relaxed">
            <p>611, 10th Cross Rd</p>
            <p>Indiranagar Rajajinagar</p>
            <p>Bengaluru, Karnataka 560079</p>
          </div>

          <div className="text-sm text-stone-600 space-y-1">
            <p>
              <a href="tel:+919880193165" className="hover:text-[#1a1a1a] transition-colors">
                +91 98801 93165
              </a>
            </p>
            <p>
              <a href="mailto:vijaykumar.sb.99@gmail.com" className="hover:text-[#1a1a1a] transition-colors">
                vijaykumar.sb.99@gmail.com
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-stone-200 text-xs text-stone-400 text-center">
          © {new Date().getFullYear()} M G Prakash Catering. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
