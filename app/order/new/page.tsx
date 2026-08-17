import type { Metadata } from 'next'
import { getAllDishes, getDishCount } from '@/lib/dishes'
import { createCookieClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/order/OrderForm'
import { absoluteUrl } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const count = await getDishCount()

  return {
    title: 'Get a Free Catering Quote — Bengaluru',
    description:
      `Tell us about your event, pick from ${count} dishes, and we will send a written catering ` +
      'quote the same day. No account needed, no obligation. M G Prakash Catering, Bengaluru.',
    alternates: { canonical: '/order/new' },
    openGraph: {
      url: absoluteUrl('/order/new'),
      title: 'Get a Free Catering Quote — Bengaluru',
    },
  }
}

/**
 * Signing in is optional here — it only pre-fills the contact step. So an
 * unreachable or unconfigured Supabase must not block the quote form, which is
 * the single most important page on the site.
 */
async function getSignedInUser() {
  try {
    const supabase = await createCookieClient()
    const { data } = await supabase.auth.getUser()
    return data.user ?? null
  } catch {
    return null
  }
}

export default async function NewOrderPage() {
  const [dishes, user] = await Promise.all([getAllDishes(), getSignedInUser()])

  return (
    <>
      {/*
        The page had no <h1> at all — the form's first step opens on an <h2>
        ("Your contact details"), so the document outline started a level down
        and the most valuable page on the site gave search engines no heading
        to read. It is also the accessibility fix: a screen reader landing here
        had no page title in the outline, only a step label.

        Deliberately compact and above the step indicator, so it reads as a
        page heading rather than competing with the form. The subheading carries
        the reassurance that actually reduces drop-off at this point — no
        account, no obligation.
      */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-2">
        <h1 className="font-display text-[clamp(26px,4vw,34px)] text-[var(--ink)] mb-2 text-balance">
          Get a catering quote
        </h1>
        <p className="text-[15px] leading-[1.6] text-[var(--ink-2)]">
          Tell us about your event and pick your dishes. We&rsquo;ll send a written quote the
          same day — no account needed, no obligation.
        </p>
      </div>

      <OrderForm
        dishes={dishes}
        initialName={user?.user_metadata?.name as string | undefined}
        initialEmail={user?.email ?? undefined}
      />
    </>
  )
}
