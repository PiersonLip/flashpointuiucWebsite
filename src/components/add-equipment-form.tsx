"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, type EquipmentCategory } from "@/lib/constants";

export function AddEquipmentForm() {
  const router = useRouter();
  const [category, setCategory] = useState<EquipmentCategory>("digital");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const subs = useMemo(() => [...CATEGORIES[category].subcategories], [category]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        category,
        subcategory: fd.get("subcategory"),
        assetTag: fd.get("assetTag") || null,
        notes: fd.get("notes") || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Failed to add");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form className="stack panel" style={{ padding: "1.1rem", marginTop: "0.75rem" }} onSubmit={onSubmit}>
      <div className="row">
        <div style={{ flex: 1, minWidth: 160 }}>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input className="input" id="name" name="name" required placeholder="Nikon D7000 #1" />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label className="label" htmlFor="category">
            Category
          </label>
          <select
            className="select"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
          >
            {(Object.keys(CATEGORIES) as EquipmentCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORIES[key].label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label className="label" htmlFor="subcategory">
            Subcategory
          </label>
          <select className="select" id="subcategory" name="subcategory" required>
            {subs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row">
        <div style={{ flex: 1, minWidth: 140 }}>
          <label className="label" htmlFor="assetTag">
            Asset tag
          </label>
          <input className="input" id="assetTag" name="assetTag" placeholder="FP-109" />
        </div>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <input className="input" id="notes" name="notes" placeholder="Mount: Nikon F · Battery: EN-EL15" />
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add equipment"}
      </button>
    </form>
  );
}
