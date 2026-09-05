import Link from "next/link";
import { getSession } from "@/lib/auth-server";

export default async function RentalsHomePage() {
  const session = await getSession();

  return (
    <main className="page" style={{ paddingTop: "4.5rem", paddingBottom: "6rem" }}>
      <p
        className="muted rise"
        style={{
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: "0.8rem",
        }}
      >
        Flashpoint Photography Club · UIUC
      </p>
      <h1 className="hero-brand rise rise-delay-1">Rentals</h1>
      <p
        className="rise rise-delay-2"
        style={{ maxWidth: "28rem", fontSize: "1.2rem", marginTop: "1.25rem" }}
      >
        Borrow camera bodies and kits from the club inventory. Members only —
        @illinois.edu required.
      </p>
      <div className="row rise rise-delay-3" style={{ marginTop: "2rem" }}>
        {session?.user ? (
          <Link href="/gear" className="btn btn-primary">
            Browse gear
          </Link>
        ) : (
          <>
            <Link href="/register" className="btn btn-primary">
              Create account
            </Link>
            <Link href="/login" className="btn btn-ghost">
              Log in
            </Link>
          </>
        )}
      </div>
      <p className="muted rise rise-delay-3" style={{ marginTop: "2rem", fontSize: "0.9rem" }}>
        <a href="https://flashpointuiuc.com" style={{ color: "var(--accent)" }}>
          ← Back to Flashpoint main site
        </a>
      </p>
    </main>
  );
}
