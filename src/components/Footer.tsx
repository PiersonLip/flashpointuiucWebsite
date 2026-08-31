import { siteConfig } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-navy-deep py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <p className="font-display text-lg font-bold text-cream">
              {siteConfig.shortName}
            </p>
            <p className="mt-1 text-sm text-muted">
              University of Illinois Urbana-Champaign
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href={siteConfig.links.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream/70 transition-colors hover:text-sky"
            >
              Discord
            </a>
            <a
              href={siteConfig.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream/70 transition-colors hover:text-sky"
            >
              Instagram
            </a>
            <a
              href={siteConfig.links.linktree}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream/70 transition-colors hover:text-sky"
            >
              Linktree
            </a>
            <a
              href={siteConfig.links.membershipForm}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cream/70 transition-colors hover:text-sky"
            >
              Membership Form
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          © {year} {siteConfig.name}. Not an official UIUC website.
        </p>
      </div>
    </footer>
  );
}
