/**
 * Verifies the Gmail SMTP credentials without sending anything.
 *
 *   npm run check:email
 *
 * Exists because a broken mailer is otherwise invisible until a customer
 * submits a request and quietly receives nothing — which is exactly how
 * GMAIL_APP_PASSWORD came to sit empty without anyone noticing. Run it after
 * changing either credential, and after rotating an app password.
 *
 * `verify()` opens the connection and authenticates, then stops. No mail is
 * sent and nobody's inbox is touched.
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local', quiet: true })

async function main() {
  // Imported after dotenv has run: the module reads process.env when it builds
  // the transport, so loading it first would capture an unpopulated env.
  const { emailConfigError, verifyEmailTransport } = await import('../lib/email/emails')

  const missing = emailConfigError()
  if (missing) {
    console.error(
      `\n✗ ${missing} in .env.local\n\n` +
      `  GMAIL_APP_PASSWORD is a Google App Password, not the account password.\n` +
      `  It needs 2-Step Verification switched on, then:\n` +
      `    Google Account → Security → App passwords → Mail\n` +
      `  Paste the 16 characters without the spaces Google shows.\n\n` +
      `  Set the same value in the Vercel project environment and redeploy,\n` +
      `  or production will keep failing while local works.\n`
    )
    process.exit(1)
  }

  process.stdout.write(`authenticating ${process.env.GMAIL_USER} against Gmail… `)

  try {
    await verifyEmailTransport()
  } catch (err) {
    const message = (err as Error).message
    console.error('\n')
    // 535 is overwhelmingly the interesting case and its raw text is unhelpful.
    if (/535|Username and Password not accepted|BadCredentials/i.test(message)) {
      console.error(
        `✗ Gmail rejected the credentials.\n\n` +
        `  The variables are set, so this is a wrong or revoked app password —\n` +
        `  or 2-Step Verification is off, in which case Google refuses app\n` +
        `  passwords entirely. Generate a fresh one and try again.\n\n` +
        `  ${message}\n`
      )
    } else {
      console.error(`✗ Could not reach Gmail SMTP.\n\n  ${message}\n`)
    }
    process.exit(1)
  }

  console.log(`\n\n✓ SMTP authentication succeeded — order emails will send.\n`)
}

main()
