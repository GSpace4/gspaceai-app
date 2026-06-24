import GSpaceAiLogo from "@/src/components/GSpaceAiLogo";
import StartAssessmentButton from "@/src/components/StartAssessmentButton";
import { APP_COPY } from "@/src/lib/constants";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
        <GSpaceAiLogo size="md" showWordmark={true} />
        <span className="text-xs text-brand-dark/40">A GSpace Solutions Product</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-3xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-brand-blue/10 text-brand-blue text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
          FREE For A Limited Time
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold text-brand-dark leading-tight mb-4">
          {APP_COPY.landingHeadline}
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-brand-dark/60 max-w-xl mb-3 leading-relaxed">
          {APP_COPY.landingSubheadline}
        </p>

        {/* Supporting line */}
        <p className="text-lg text-brand-blue max-w-xl mb-10 leading-relaxed">
          Answer A Few Questions About Your Current Tools. Get A Personalized Report.
        </p>

        {/* CTA — clears any stale session, then navigates to /audit */}
        <StartAssessmentButton />
        <p className="text-sm text-brand-dark/40 mb-16">Free — no credit card required</p>

        {/* Feature bullets */}
        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-lg text-left">
          {APP_COPY.landingBullets.map((bullet) => (
            <div key={bullet} className="flex items-start gap-3 bg-brand-light rounded-xl p-4">
              <div className="w-5 h-5 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-brand-green">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm text-brand-dark/70">{bullet}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-brand-dark/30 border-t border-brand-border">
        GSpaceAi — A GSpace Solutions Product &nbsp;·&nbsp; support@gspacesolutions.org
      </footer>
    </div>
  );
}
