import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service - Srizva",
  description: "The terms that govern your use of Srizva.",
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

export default function TermsOfServicePage() {
  return (
    <div className="relative min-h-screen bg-void">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted">Last updated: {LAST_UPDATED}</p>

          <p className="mt-6 text-sm leading-relaxed text-muted">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
            and use of Srizva (the &ldquo;Service&rdquo;). By creating an
            account or using the Service, you agree to these Terms. If you do
            not agree, do not use the Service.
          </p>

          <Section title="1. Eligibility">
            <p>
              You must be at least 18 years old, and have the legal capacity
              to enter into a binding contract, to create an account or use
              the Service. By using Srizva, you confirm that you meet these
              requirements.
            </p>
          </Section>

          <Section title="2. Your account">
            <p>
              You are responsible for maintaining the confidentiality of your
              login credentials and for all activity under your account. Tell
              us immediately at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-foreground underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              if you suspect unauthorized use of your account.
            </p>
          </Section>

          <Section title="3. Acceptable use">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Build, generate, or deploy malware, or anything intended to damage, disrupt, or gain unauthorized access to systems or data.</li>
              <li>Violate any applicable law, or infringe the intellectual property, privacy, or other rights of any third party.</li>
              <li>Generate content that is unlawful, harassing, hateful, or sexually exploitative, including any content involving minors.</li>
              <li>Attempt to circumvent usage limits, security controls, or reverse-engineer the Service.</li>
              <li>Resell or provide the Service to third parties without our written consent.</li>
            </ul>
            <p>
              We may suspend or terminate accounts that violate these Terms.
            </p>
          </Section>

          <Section title="4. Your content and projects">
            <p>
              You retain ownership of the prompts you write and, subject to
              the terms of any third-party AI provider we use to generate it,
              the code and applications Srizva generates for you. You grant us
              a limited license to host, store, process, and display that
              content solely to operate and improve the Service for you.
            </p>
            <p>
              You are responsible for reviewing generated code before using it
              in production, and for making sure your use of it complies with
              applicable law and any third-party licenses it may rely on.
            </p>
          </Section>

          <Section title="5. AI-generated output - no warranty">
            <p>
              Srizva uses AI models to plan and write code automatically.
              AI-generated output can contain mistakes, security issues, or
              inaccuracies. The Service and all output are provided
              &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
              warranties of any kind, including fitness for a particular
              purpose, merchantability, or non-infringement. You are solely
              responsible for testing, securing, and validating anything you
              build with Srizva before relying on it.
            </p>
          </Section>

          <Section title="6. Limitation of liability">
            <p>
              To the maximum extent permitted by law, Srizva and its team will
              not be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of data,
              revenue, or profits, arising from your use of the Service.
            </p>
          </Section>

          <Section title="7. Termination">
            <p>
              You may stop using the Service and delete your account at any
              time. We may suspend or terminate your access if you violate
              these Terms or if we discontinue the Service, with notice where
              reasonably possible.
            </p>
          </Section>

          <Section title="8. Changes to the Service or these Terms">
            <p>
              We may update these Terms from time to time. If we make
              material changes, we will update the &ldquo;Last updated&rdquo;
              date above and, where appropriate, notify you. Continuing to use
              the Service after changes take effect means you accept the
              updated Terms.
            </p>
          </Section>

          <Section title="9. Contact us">
            <p>
              Questions about these Terms? Email us at{" "}
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
