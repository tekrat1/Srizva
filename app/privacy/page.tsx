import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy - Srizva",
  description: "How Srizva collects, uses, and protects your data.",
};

const SUPPORT_EMAIL = "tekrat10@gmail.com";
const LAST_UPDATED = "August 20, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen bg-void">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

          <p className="mt-6 text-sm leading-relaxed text-muted">
            This Privacy Policy explains how Srizva (&ldquo;Srizva&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects
            information when you use our website and application (the
            &ldquo;Service&rdquo;). By creating an account or using the
            Service, you agree to the collection and use of information as
            described here.
          </p>

          <Section title="1. Who can use Srizva">
            <p>
              Srizva is intended for users who are at least 18 years old (or
              the age of legal majority where you live, if higher). We do not
              knowingly collect personal information from anyone under 18. If
              we learn that we have collected information from someone under
              18, we will delete it. If you believe a minor is using the
              Service, contact us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-foreground underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Information we collect">
            <p>
              <strong className="text-foreground">Account information.</strong>{" "}
              When you sign up, we collect your email address and, if you
              choose to sign in with Google, basic profile information (name,
              email, profile photo) from your Google account via Firebase
              Authentication. If you sign up with email and password, your
              password is handled and stored by Firebase Authentication and
              is never visible to us in plain text.
            </p>
            <p>
              <strong className="text-foreground">Project content.</strong>{" "}
              We store the prompts you write, the applications and code our
              AI agents generate for you, and related project metadata (names,
              timestamps, edit history) so you can access and continue your
              projects.
            </p>
            <p>
              <strong className="text-foreground">Usage information.</strong>{" "}
              We log how the Service is used - for example the number of
              builds you run, feature usage, and basic device/browser
              information - to operate rate limits, improve reliability, and
              debug issues.
            </p>
            <p>
              <strong className="text-foreground">Cookies &amp; sessions.</strong>{" "}
              We use a session cookie to keep you signed in. We do not use
              cookies for third-party advertising.
            </p>
          </Section>

          <Section title="3. How we use your information">
            <ul className="list-disc space-y-1 pl-5">
              <li>To create and secure your account, and keep you signed in.</li>
              <li>To generate, run, save, and let you retrieve your projects.</li>
              <li>To enforce usage limits and prevent abuse of the Service.</li>
              <li>To send you Service-related communications (for example, account or security notices).</li>
              <li>To improve, debug, and secure the Service.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="4. How we share information">
            <p>
              We do not sell your personal information. We share information
              only with the service providers that help us run Srizva, under
              obligations to protect it, including:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Firebase (Google)</strong> -
                for authentication, session management, and data storage.
              </li>
              <li>
                <strong className="text-foreground">AI model providers</strong> -
                to process your prompts and generate code/application output.
              </li>
              <li>
                <strong className="text-foreground">Hosting &amp; infrastructure providers</strong> -
                to run and deliver the Service.
              </li>
            </ul>
            <p>
              We may also disclose information if required by law, to protect
              the rights, safety, or property of Srizva or others, or in
              connection with a merger, acquisition, or sale of assets.
            </p>
          </Section>

          <Section title="5. Data retention">
            <p>
              We retain account and project data for as long as your account
              is active, or as needed to provide the Service. You can delete
              individual projects at any time from your dashboard, and you
              may request deletion of your account and associated data by
              contacting us.
            </p>
          </Section>

          <Section title="6. Your rights and choices">
            <p>
              Depending on where you live, you may have rights to access,
              correct, export, or delete your personal information, and to
              object to or restrict certain processing. To exercise any of
              these rights, email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-foreground underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              and we will respond within a reasonable time.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We use industry-standard measures - including encryption in
              transit and access controls - to help protect your information.
              No method of transmission or storage is 100% secure, and we
              cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="8. International data transfers">
            <p>
              Our service providers may process and store data in countries
              other than your own. Where required, we rely on appropriate
              safeguards for such transfers.
            </p>
          </Section>

          <Section title="9. Changes to this policy">
            <p>
              We may update this Privacy Policy from time to time. If we make
              material changes, we will update the &ldquo;Last updated&rdquo;
              date above and, where appropriate, notify you directly.
            </p>
          </Section>

          <Section title="10. Contact us">
            <p>
              Questions about this Privacy Policy or your data? Email us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-foreground underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </main>

        <Footer />
      </div>
    </div>
  );
}
