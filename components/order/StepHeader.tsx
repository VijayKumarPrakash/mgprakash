/**
 * The five step headers used to read `text-2xl font-semibold` — plain
 * Tailwind, no relation to the display face or the `.eyebrow` treatment
 * every marketing page uses above its own headings. Rendering the funnel in
 * a second, unrelated type system was the clearest sign the redesign never
 * reached it. This is also where "step 3 of 5" actually gets said in words,
 * which the dot indicator above never spells out for a screen reader.
 */
interface Props {
  step: number
  totalSteps: number
  title: string
  subtitle: string
}

export function StepHeader({ step, totalSteps, title, subtitle }: Props) {
  return (
    <div>
      <p className="eyebrow text-[var(--ink-3)] mb-2.5">
        Step {step} of {totalSteps}
      </p>
      <h2 className="font-display text-[26px] leading-[1.2] text-[var(--ink)]">{title}</h2>
      <p className="text-[var(--ink-3)] mt-1.5">{subtitle}</p>
    </div>
  )
}
