interface Props {
  label: string
  error?: string
  required?: boolean
  /**
   * Optional control rendered at the far end of the label row — the "All veg"
   * shortcut beside the vegetarian guest count, for instance. Without it that
   * field had to opt out of FormField entirely and hand-roll its own label and
   * error markup, which is how it ended up as the one field on the form with
   * no error styling.
   */
  action?: React.ReactNode
  children: React.ReactNode
}

export function FormField({ label, error, required, action, children }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 min-h-[22px]">
        <label className="block text-sm font-medium text-[var(--ink)]">
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5" aria-hidden="true">*</span>}
        </label>
        {action}
      </div>
      {children}
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  )
}
