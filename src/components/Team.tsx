import { siteConfig } from "@/config/site";

export function Team() {
  return (
    <section id="team" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky">
            Executive Board
          </p>
          <h2 className="font-display text-3xl font-bold text-cream md:text-5xl">
            {siteConfig.schoolYear} Team
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siteConfig.board.map((member) => (
            <article
              key={`${member.role}-${member.name}`}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-colors hover:border-sky/25"
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange">
                {member.role}
              </p>
              <h3 className="font-display text-xl font-bold text-cream">
                {member.name}
              </h3>
              <p className="mt-1 text-sm text-muted">@{member.handle}</p>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-cream/60">
          Questions about membership? Contact our president or treasurer on Discord.
        </p>
      </div>
    </section>
  );
}
