import Image from "next/image";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative min-h-screen pt-24">
      <div className="aperture-ring pointer-events-none absolute -inset-x-12 -top-16 -bottom-20 opacity-60" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-orange/10 blur-3xl" />
        <div className="absolute -left-20 bottom-20 h-80 w-80 rounded-full bg-sky/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-20 text-center lg:py-32">
        <div className="animate-fade-up mb-8">
          <Image
            src="/logo.webp"
            alt="Flashpoint Photography Club"
            width={480}
            height={140}
            className="mx-auto h-auto w-full max-w-md"
            priority
          />
        </div>

        <p className="animate-fade-up animate-fade-up-delay-1 mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-sky">
          University of Illinois Urbana-Champaign
        </p>

        <h1 className="animate-fade-up animate-fade-up-delay-1 font-display mb-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-cream md:text-6xl">
          {siteConfig.tagline}
        </h1>

        <p className="animate-fade-up animate-fade-up-delay-2 mb-10 max-w-2xl text-lg leading-relaxed text-cream/70">
          Workshops on weekdays. Excursions on weekends. Socials, collabs, and a
          community that grows with every shot.
        </p>

        <div className="animate-fade-up animate-fade-up-delay-3 flex flex-wrap items-center justify-center gap-4">
          <Button href={siteConfig.links.membershipForm} external>
            Join the Club
          </Button>
          <Button href={siteConfig.links.discord} variant="secondary" external>
            Join Discord
          </Button>
        </div>

        <div className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-10">
          {[
            { label: "Dues", value: `$${siteConfig.dues.amount}` },
            { label: "Events", value: "Weekly" },
            { label: "Open to", value: "All levels" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl font-bold text-orange md:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
