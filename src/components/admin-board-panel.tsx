"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminBoardMember = {
  id: string;
  role: string;
  name: string;
  imageUrl: string | null;
  sortOrder: number;
};

export function AdminBoardPanel({ initialMembers }: { initialMembers: AdminBoardMember[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshFromServer() {
    const res = await fetch("/api/admin/board");
    if (!res.ok) return;
    const data = await res.json();
    setMembers(data.members);
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/admin/board", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add member");
      form.reset();
      await refreshFromServer();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setPending(false);
    }
  }

  async function onSaveMember(id: string, form: HTMLFormElement) {
    setPending(true);
    setError(null);
    const fd = new FormData(form);
    fd.set("id", id);
    try {
      const res = await fetch("/api/admin/board", { method: "PATCH", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save member");
      await refreshFromServer();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save member");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the board?`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/board", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete");
      await refreshFromServer();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setPending(false);
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const index = members.findIndex((m) => m.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= members.length) return;
    const reordered = [...members];
    const [item] = reordered.splice(index, 1);
    reordered.splice(next, 0, item);
    setMembers(reordered);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/board", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not reorder");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder");
      await refreshFromServer();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-section">
      <h2 className="brand" style={{ fontSize: "1.7rem" }}>
        Executive board
      </h2>
      <p className="muted" style={{ marginTop: "0.35rem" }}>
        Names and roles shown on the Team section. Optional photo for each person.
      </p>

      {error ? <p className="error" style={{ marginTop: "0.75rem" }}>{error}</p> : null}

      <form
        className="panel stack"
        style={{ marginTop: "1rem", padding: "1rem", gap: "0.75rem" }}
        onSubmit={onAdd}
      >
        <strong>Add member</strong>
        <div className="admin-grid-2">
          <div>
            <label className="label" htmlFor="new-role">
              Role
            </label>
            <input className="input" id="new-role" name="role" required placeholder="President" />
          </div>
          <div>
            <label className="label" htmlFor="new-name">
              Name
            </label>
            <input className="input" id="new-name" name="name" required placeholder="Full name" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="new-image">
            Photo (optional)
          </label>
          <input className="input" id="new-image" name="image" type="file" accept="image/*" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add to board"}
        </button>
      </form>

      <div className="manager-list" style={{ marginTop: "1.25rem" }}>
        {members.length === 0 ? (
          <p className="muted">No board members yet.</p>
        ) : (
          members.map((member, index) => (
            <article key={member.id} className="manager-card panel">
              <div className="admin-member-head">
                <div className="admin-avatar">
                  {member.imageUrl ? (
                    <Image
                      src={member.imageUrl}
                      alt={member.name}
                      width={72}
                      height={72}
                      unoptimized
                      className="admin-avatar-img"
                    />
                  ) : (
                    <span className="muted" style={{ fontSize: "0.75rem" }}>
                      No photo
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <form
                    className="stack"
                    style={{ gap: "0.55rem" }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSaveMember(member.id, e.currentTarget);
                    }}
                  >
                    <div className="admin-grid-2">
                      <div>
                        <label className="label">Role</label>
                        <input
                          className="input"
                          name="role"
                          defaultValue={member.role}
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Name</label>
                        <input
                          className="input"
                          name="name"
                          defaultValue={member.name}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Replace photo</label>
                      <input className="input" name="image" type="file" accept="image/*" />
                    </div>
                    {member.imageUrl ? (
                      <label className="muted" style={{ fontSize: "0.85rem" }}>
                        <input type="checkbox" name="clearImage" value="1" /> Remove current photo
                      </label>
                    ) : null}
                    <div className="row">
                      <button className="btn btn-primary" type="submit" disabled={pending}>
                        Save
                      </button>
                      <button
                        className="btn"
                        type="button"
                        disabled={pending || index === 0}
                        onClick={() => move(member.id, -1)}
                      >
                        Up
                      </button>
                      <button
                        className="btn"
                        type="button"
                        disabled={pending || index === members.length - 1}
                        onClick={() => move(member.id, 1)}
                      >
                        Down
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={pending}
                        onClick={() => onDelete(member.id, member.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
