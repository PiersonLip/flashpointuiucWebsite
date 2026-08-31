import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";

export function Membership() {
  return (
    <section id="membership" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky">
              Membership
            </p>
            <h2 className="font-display mb-6 text-3xl font-bold text-cream md:text-5xl">
              ${siteConfig.dues.amount}{" "}
              <span className="text-sky">{siteConfig.dues.period}</span>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-cream/70">
              {siteConfig.dues.note} We try to keep membership accessible so you
              can attend events at your convenience.
            </p>

            <ul className="space-y-4">
              {siteConfig.membershipBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange/20 text-xs text-orange">
                    ✓
                  </span>
                  <span className="text-cream/80">{benefit}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm leading-relaxed text-muted">
              {siteConfig.membershipNote}
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-orange/30 bg-orange/10 p-6">
              <h3 className="font-display mb-3 text-xl font-bold text-orange">
                {siteConfig.duesWarning.title}
              </h3>
              <p className="leading-relaxed text-cream/85">
                {siteConfig.duesWarning.body}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8">
              <h3 className="font-display mb-2 text-xl font-bold text-cream">
                How to join
              </h3>
              <ol className="mb-8 space-y-4">
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky/20 text-sm font-bold text-sky">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-cream">Complete the membership form</p>
                    <p className="text-sm text-cream/60">
                      Required before any dues payment.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky/20 text-sm font-bold text-sky">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-cream">Pay dues via Venmo, Zelle, or cash</p>
                    <p className="text-sm text-cream/60">
                      Payment info is included in the form.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky/20 text-sm font-bold text-sky">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-cream">Join Discord and verify</p>
                    <p className="text-sm text-cream/60">
                      Get your Flashy Approved role and start attending events.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href={siteConfig.links.membershipForm} external className="flex-1">
                  Membership Form
                </Button>
                <Button
                  href={siteConfig.links.discord}
                  variant="secondary"
                  external
                  className="flex-1"
                >
                  Join Discord
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
