import React, { useEffect, useMemo, useState } from "react";

type Reminder = {
  id: string;
  title: string;
  notes?: string;
  dueAt?: string; // ISO string
  done: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

type FormState = {
  title: string;
  notes: string;
  dueAtLocal: string; // yyyy-MM-ddTHH:mm (from <input type="datetime-local">)
};

const STORAGE_KEY = "reminders:v1";

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  // good-enough id for UI/local storage
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toIsoFromLocalDateTime(local: string): string | undefined {
  // local format: "2026-03-05T14:30"
  if (!local) return undefined;
  const dt = new Date(local);
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}

function toLocalDateTimeFromIso(iso?: string): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const MM = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mm = pad(dt.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function safeLoad(): Reminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as Reminder[];
  } catch {
    return [];
  }
}

function safeSave(items: Reminder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export default function RemindersPage() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "",
    notes: "",
    dueAtLocal: "",
  });

  useEffect(() => {
    setItems(safeLoad());
  }, []);

  useEffect(() => {
    safeSave(items);
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = items.filter((r) => (showDone ? true : !r.done));
    const searched = !q
      ? base
      : base.filter((r) => {
          const hay = `${r.title} ${r.notes ?? ""}`.toLowerCase();
          return hay.includes(q);
        });

    // sort: dueAt asc (undefined last), then updatedAt desc
    return searched.sort((a, b) => {
      const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [items, query, showDone]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((r) => r.done).length;
    const open = total - done;
    return { total, done, open };
  }, [items]);

  function resetForm() {
    setEditingId(null);
    setForm({ title: "", notes: "", dueAtLocal: "" });
  }

  function startEdit(r: Reminder) {
    setEditingId(r.id);
    setForm({
      title: r.title,
      notes: r.notes ?? "",
      dueAtLocal: toLocalDateTimeFromIso(r.dueAt),
    });
  }

  function upsert() {
    const title = form.title.trim();
    if (!title) return;

    const dueAt = toIsoFromLocalDateTime(form.dueAtLocal);
    const t = nowIso();

    setItems((prev) => {
      if (!editingId) {
        const newItem: Reminder = {
          id: uid(),
          title,
          notes: form.notes.trim() ? form.notes.trim() : undefined,
          dueAt,
          done: false,
          createdAt: t,
          updatedAt: t,
        };
        return [newItem, ...prev];
      }

      return prev.map((r) => {
        if (r.id !== editingId) return r;
        return {
          ...r,
          title,
          notes: form.notes.trim() ? form.notes.trim() : undefined,
          dueAt,
          updatedAt: t,
        };
      });
    });

    resetForm();
  }

  function toggleDone(id: string) {
    const t = nowIso();
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done, updatedAt: t } : r))
    );
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
  }

  function clearDone() {
    setItems((prev) => prev.filter((r) => !r.done));
    if (editingId) {
      const exists = items.some((x) => x.id === editingId);
      if (exists) resetForm();
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Reminders</h1>
        <div style={{ opacity: 0.85 }}>
          Total: {stats.total} · Open: {stats.open} · Done: {stats.done}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={{ flex: "1 1 280px", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        />
        <label style={{ display: "flex", gap: 8, alignItems: "center", userSelect: "none" }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show done
        </label>
        <button
          type="button"
          onClick={clearDone}
          disabled={stats.done === 0}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: stats.done ? "pointer" : "not-allowed" }}
        >
          Clear done
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 14, border: "1px solid #eee", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{editingId ? "Edit reminder" : "New reminder"}</h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
            >
              Cancel edit
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 }}>
          <input
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            placeholder="Title (required)"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          />

          <textarea
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Notes (optional)"
            rows={3}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Due at (optional)</span>
              <input
                type="datetime-local"
                value={form.dueAtLocal}
                onChange={(e) => setForm((s) => ({ ...s, dueAtLocal: e.target.value }))}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
              />
            </label>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={upsert}
              disabled={!form.title.trim()}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111",
                background: form.title.trim() ? "#111" : "#555",
                color: "white",
                cursor: form.title.trim() ? "pointer" : "not-allowed",
              }}
            >
              {editingId ? "Save" : "Add"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 14, border: "1px dashed #ddd", borderRadius: 14, opacity: 0.85 }}>
            No reminders.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            {filtered.map((r) => {
              const dueText = r.dueAt ? new Date(r.dueAt).toLocaleString() : "";
              return (
                <li key={r.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={r.done}
                      onChange={() => toggleDone(r.id)}
                      style={{ marginTop: 4 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 600, textDecoration: r.done ? "line-through" : "none" }}>
                          {r.title}
                        </div>
                        {r.dueAt && (
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            Due: {dueText}
                          </div>
                        )}
                      </div>
                      {r.notes && (
                        <div style={{ marginTop: 6, whiteSpace: "pre-wrap", opacity: r.done ? 0.6 : 0.9 }}>
                          {r.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
