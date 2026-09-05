export function HowThisWorks() {
  return (
    <section>
      <h1 className="brand rise" style={{ fontSize: "2.8rem", marginBottom: "0.35rem" }}>
        How this works
      </h1>
      <p className="muted rise rise-delay-1" style={{ marginBottom: "1.75rem", maxWidth: "36rem" }}>
        Short guide to requesting, waitlists, due dates, and extensions.
      </p>
      <ol
        className="stack rise rise-delay-2"
        style={{
          gap: "1rem",
          margin: 0,
          paddingLeft: "1.25rem",
          maxWidth: "40rem",
          lineHeight: 1.55,
        }}
      >
        <li>
          <strong>Request</strong>
          <div className="muted" style={{ marginTop: "0.2rem" }}>
            Pick an available item, paint pickup availability on the calendar, and submit. A
            manager reviews it and emails you when it’s approved or denied. Schedule return
            times later under My rentals.
          </div>
        </li>
        <li>
          <strong>Pickup &amp; return</strong>
          <div className="muted" style={{ marginTop: "0.2rem" }}>
            After approval, a manager confirms pickup in person. Your due date starts from
            that checkout, based on the days you requested (default 7). Return by the due
            date — a manager marks it returned.
          </div>
        </li>
        <li>
          <strong>Waitlist</strong>
          <div className="muted" style={{ marginTop: "0.2rem" }}>
            If something is checked out, join the waitlist. When it becomes available, the
            next person gets an email and 24 hours to confirm their request before the offer
            moves on. Track your place and estimated availability under My rentals.
          </div>
        </li>
        <li>
          <strong>Extensions</strong>
          <div className="muted" style={{ marginTop: "0.2rem" }}>
            Your first extension adds 7 days automatically. Further extensions need manager
            approval. Extensions aren’t available if someone is already waitlisted for that
            item — please return on time.
          </div>
        </li>
        <li>
          <strong>Overdue</strong>
          <div className="muted" style={{ marginTop: "0.2rem" }}>
            Overdue gear blocks new requests and waitlists until it’s returned.
          </div>
        </li>
      </ol>
    </section>
  );
}
