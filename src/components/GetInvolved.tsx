import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";

export function GetInvolved() {
  const { discord, instagram } = siteConfig.communication;

  return (
    <section id="join" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky">
            Get Involved
          </p>
          <h2 className="font-display mb-6 text-3xl font-bold text-cream md:text-5xl">
            Stay connected
          </h2>
          <p className="text-lg text-cream/70">
            Discord and Instagram each play an important role. Join both to get
            announcements and see what the club is up to.
          </p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-2">
          {[discord, instagram].map((channel, i) => (
            <article
              key={channel.title}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8"
            >
              <div className="mb-4 flex items-center gap-3">
                <h3 className="font-display text-2xl font-bold text-cream">
                  {channel.title}
                </h3>
                <span className="rounded-full bg-orange/15 px-2.5 py-0.5 text-xs font-semibold text-orange">
                  {channel.badge}
                </span>
              </div>
              <p className="mb-6 leading-relaxed text-cream/65">
                {channel.description}
              </p>
              <Button
                href={
                  i === 0
                    ? siteConfig.links.discord
                    : siteConfig.links.instagram
                }
                variant="secondary"
                external
              >
                Open {channel.title}
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
