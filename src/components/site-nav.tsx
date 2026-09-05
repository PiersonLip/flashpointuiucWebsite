import Link from "next/link";
import { getSession } from "@/lib/auth-server";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteNav() {
  const session = await getSession();
  const user = session?.user;

  return (
    <nav className="site-nav">
      <NavLink href="/" className="brand">
        <span style={{ fontSize: "1.35rem" }}>Flashpoint Rentals</span>
      </NavLink>
      <div className="nav-links">
        {user ? (
          <>
            <NavLink href="/gear">Gear</NavLink>
            <NavLink href="/my-rentals">My rentals</NavLink>
            <NavLink href="/how-this-works">How this works</NavLink>
            {user.isManager ? <NavLink href="/manager">Manager</NavLink> : null}
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {user.name}
            </span>
            <SignOutButton />
          </>
        ) : (
          <>
            <NavLink href="/how-this-works">How this works</NavLink>
            <NavLink href="/login">Log in</NavLink>
            <Link href="/register" className="btn btn-primary">
              Join
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
