import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete your Mercury app account',
  description: 'Request deletion of your Mercury Android app account without signing in to the Mercury website.',
  alternates: { canonical: 'https://www.playonmercury.com/account/delete' },
  robots: { index: false, follow: true },
};

export default function MobileAccountDeletionPage() {
  return (
    <main id="main" className="page-width prose" style={{ paddingBlock: '3rem', maxWidth: '48rem' }}>
      <a className="text-link" href="/">Mercury</a>
      <header className="page-intro">
        <p className="eyebrow blue">MERCURY ANDROID APP</p>
        <h1>Delete your app account</h1>
        <p>You can request deletion of the account you use in the Mercury Android app without signing in to this website.</p>
      </header>
      <section className="form-card" aria-labelledby="app-deletion-heading">
        <h2 id="app-deletion-heading">From the Mercury Android app</h2>
        <ol>
          <li>Open Settings, then Account settings.</li>
          <li>Choose Delete account and follow the account verification steps.</li>
          <li>If deletion is shown as unavailable, use the privacy request below.</li>
        </ol>
        <p>Signing out or uninstalling the app does not delete your account.</p>
      </section>
      <section className="form-card section-space" aria-labelledby="request-deletion-heading">
        <h2 id="request-deletion-heading">Unable to use the app?</h2>
        <p>Send a Privacy request and state that you want to delete your Mercury Android app account. Include the email address or phone number used for that account so the team can verify ownership.</p>
        <p>Do not send your password, sign-in codes, identity documents or payment details.</p>
        <a className="button primary" href="/support?category=Privacy%20request">Request account deletion</a>
        <p className="fine">The support form does not require a website account. Select Privacy request and identify the request as a Mercury Android app account request. Keep the reference shown after submission. The Mercury team handles requests manually; submission does not mean deletion has completed.</p>
      </section>
      <section className="section-space" aria-labelledby="scope-deletion-heading">
        <h2 id="scope-deletion-heading">What the request covers</h2>
        <p>Identify your Mercury app account and ask for the associated profile, contact details and uploaded profile images to be removed. The team will verify the account and explain any records that must be retained, and the applicable retention period, before confirming completion.</p>
        <p>The Mercury website and Android app use separate account systems. Deleting a website account alone does not delete an Android app account.</p>
        <p><a className="text-link" href="/privacy">Privacy notice</a> · <a className="text-link" href="/support?category=Privacy%20request">Contact support</a></p>
      </section>
    </main>
  );
}
