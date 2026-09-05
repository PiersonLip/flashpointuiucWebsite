"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const raw = usePathname() || "";
  // Subdomain rewrites keep /gear in the URL; local /rentals/* should still highlight.
  const pathname = raw.startsWith("/rentals")
    ? raw.slice("/rentals".length) || "/"
    : raw;
  const current =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={className}
      aria-current={current ? "page" : undefined}
      data-active={current ? "true" : undefined}
    >
      {children}
    </Link>
  );
}
