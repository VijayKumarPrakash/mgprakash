'use client'

import { useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  resultCount?: number
}

export function SearchBar({ value, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  // "/" focuses search, Escape clears it — the shortcut people already expect.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === '/' && !typing) {
        e.preventDefault()
        ref.current?.focus()
      }
      if (e.key === 'Escape' && el === ref.current) {
        onChange('')
        ref.current?.blur()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onChange])

  return (
    <div className="relative">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ink-3)]"
        width="16" height="16" viewBox="0 0 16 16" fill="none"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      <input
        ref={ref}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search dishes, ingredients or a cuisine…"
        aria-label="Search the dish catalogue"
        className="form-input pl-11 pr-20 py-3.5 text-[15px]"
        // Native browser autofill/spellcheck UI fights a search field.
        autoComplete="off"
        spellCheck={false}
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:grid place-items-center h-6 min-w-6 px-1.5 rounded-md border border-[var(--line)] bg-[var(--surface-2)] text-[11px] font-medium text-[var(--ink-3)] pointer-events-none">
          /
        </kbd>
      )}
    </div>
  )
}
