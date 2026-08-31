import { siteConfig } from "@/config/site";

const icons: Record<string, React.ReactNode> = {
  aperture: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
    </svg>
  ),
};

export function EventTypes() {
  return (
    <section id="events" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky">
            Events
          </p>
          <h2 className="font-display text-3xl font-bold text-cream md:text-5xl">
            Four ways to shoot with us
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {siteConfig.eventTypes.map((event, i) => (
            <article
              key={event.id}
              className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 backdrop-blur-sm transition-all duration-300 hover:border-sky/30 hover:bg-white/[0.06]"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange/15 text-orange">
                  {icons[event.icon]}
                </div>
                <span className="rounded-full border border-sky/20 bg-sky/10 px-3 py-1 text-xs font-medium text-sky">
                  {event.schedule}
                </span>
              </div>
              <h3 className="font-display mb-3 text-2xl font-bold text-cream">
                {event.title}
              </h3>
              <p className="leading-relaxed text-cream/65">{event.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
