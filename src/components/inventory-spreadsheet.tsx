"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { CATEGORIES, type EquipmentCategory } from "@/lib/constants";

export type InventoryRow = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  assetTag: string | null;
  notes: string | null;
  status: string;
};

function StatusPatch({
  id,
  status,
  label,
}: {
  id: string;
  status: "available" | "repair" | "retired";
  label: string;
}) {
  return (
    <ActionButton
      label={label}
      variant="ghost"
      method="PATCH"
      endpoint="/api/equipment"
      body={{ id, status }}
    />
  );
}

function downloadCsv(rows: InventoryRow[]) {
  const header = ["Name", "Subcategory", "Asset tag", "Category", "Status", "Notes"];
  const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.subcategory,
        r.assetTag ?? "",
        r.category,
        r.status,
        r.notes ?? "",
      ]
        .map((c) => escape(String(c)))
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flashpoint-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function EditableCell({
  value,
  onSave,
  multiline,
  mono,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  multiline?: boolean;
  mono?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  async function commit() {
    if (draft === value) return;
    setPending(true);
    try {
      await onSave(draft);
    } finally {
      setPending(false);
    }
  }

  const className = `sheet-input${mono ? " sheet-mono" : ""}`;

  if (multiline) {
    return (
      <textarea
        className={className}
        value={draft}
        rows={2}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
      />
    );
  }

  return (
    <input
      className={className}
      value={draft}
      disabled={pending}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function InventorySpreadsheet({ rows }: { rows: InventoryRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/equipment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Save failed");
      throw new Error(data.error || "Save failed");
    }
    router.refresh();
  }

  return (
    <div className="sheet-wrap">
      <div className="sheet-toolbar">
        <span className="muted" style={{ fontSize: "0.88rem" }}>
          {rows.length} item{rows.length === 1 ? "" : "s"} · click a cell to edit
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => downloadCsv(rows)}>
          Download CSV
        </button>
      </div>
      {error ? (
        <p className="error" style={{ margin: "0.5rem 0.85rem" }}>
          {error}
        </p>
      ) : null}
      <div className="sheet-scroll">
        <table className="sheet">
          <thead>
            <tr>
              <th className="sheet-corner" />
              <th>Name</th>
              <th>Subcategory</th>
              <th>Asset tag</th>
              <th>Category</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="sheet-empty">
                  No equipment yet — add a row above.
                </td>
              </tr>
            ) : (
              rows.map((item, index) => {
                const category = item.category as EquipmentCategory;
                const subs =
                  category in CATEGORIES
                    ? [...CATEGORIES[category].subcategories]
                    : [item.subcategory];
                return (
                  <tr key={item.id}>
                    <th scope="row" className="sheet-rownum">
                      {index + 1}
                    </th>
                    <td>
                      <EditableCell
                        value={item.name}
                        onSave={(name) => patch(item.id, { name })}
                      />
                    </td>
                    <td>
                      <select
                        className="sheet-input"
                        value={item.subcategory}
                        onChange={(e) => {
                          void patch(item.id, { subcategory: e.target.value });
                        }}
                      >
                        {subs.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <EditableCell
                        value={item.assetTag ?? ""}
                        mono
                        onSave={(assetTag) => patch(item.id, { assetTag })}
                      />
                    </td>
                    <td>
                      <select
                        className="sheet-input"
                        value={item.category}
                        onChange={(e) => {
                          const next = e.target.value as EquipmentCategory;
                          const nextSub = CATEGORIES[next].subcategories[0];
                          void patch(item.id, { category: next, subcategory: nextSub });
                        }}
                      >
                        {(Object.keys(CATEGORIES) as EquipmentCategory[]).map((key) => (
                          <option key={key} value={key}>
                            {CATEGORIES[key].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`sheet-status sheet-status-${item.status}`}>
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="sheet-notes">
                      <EditableCell
                        value={item.notes ?? ""}
                        multiline
                        onSave={(notes) => patch(item.id, { notes })}
                      />
                    </td>
                    <td className="sheet-actions">
                      {item.status === "available" ||
                      item.status === "repair" ||
                      item.status === "retired" ? (
                        <div className="row">
                          {item.status !== "available" ? (
                            <StatusPatch id={item.id} status="available" label="Available" />
                          ) : null}
                          {item.status !== "repair" ? (
                            <StatusPatch id={item.id} status="repair" label="Mark for repair" />
                          ) : null}
                          {item.status !== "retired" ? (
                            <StatusPatch
                              id={item.id}
                              status="retired"
                              label="Mark for retirement"
                            />
                          ) : null}
                        </div>
                      ) : (
                        <span className="muted">In rental flow</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
