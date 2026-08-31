import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-navy-deep/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="#" className="flex items-center gap-3">
          <Image
            src="/logo.webp"
            alt="Flashpoint Photography Club"
            width={140}
            height={40}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-cream/70 transition-colors hover:text-sky"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            href={siteConfig.links.discord}
            variant="ghost"
            external
            className="hidden sm:inline-flex px-4 py-2"
          >
            Discord
          </Button>
          <Button href={siteConfig.links.membershipForm} external>
            Join
          </Button>
        </div>
      </nav>
    </header>
  );
}
