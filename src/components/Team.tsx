import Image from "next/image";
import { siteConfig } from "@/config/site";
import { getBoardMembers } from "@/lib/site-content";

export async function Team() {
  const board = await getBoardMembers();

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
          {board.map((member) => (
            <article
              key={member.id}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 transition-colors hover:border-sky/25"
            >
              {member.imageUrl ? (
                <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-white/[0.03]">
                  <Image
                    src={member.imageUrl}
                    alt={member.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              ) : null}
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange">
                {member.role}
              </p>
              <h3 className="font-display text-xl font-bold text-cream">
                {member.name}
              </h3>
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
