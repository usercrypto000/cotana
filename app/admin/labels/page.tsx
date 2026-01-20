"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LabelItem = {
  id: number;
  label: string;
  category: string;
};

export default function LabelsAdminPage() {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/labels");
    const data = (await res.json()) as { items?: LabelItem[] };
    setLabels(data.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createLabel() {
    if (!label || !category) return;
    setLoading(true);
    try {
      await fetch("/api/admin/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, category }),
      });
      setLabel("");
      setCategory("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function removeLabel(id: number) {
    setLoading(true);
    try {
      await fetch("/api/admin/labels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function importSeed() {
    setLoading(true);
    try {
      await fetch("/api/admin/labels/import", { method: "POST" });
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Cotana
        </div>
        <div className="searchbar">
          <span className="search-icon" aria-hidden="true" />
          <input placeholder="Search wallet, contract, or query..." />
        </div>
        <div className="top-actions">
          <button className="action" type="button">
            Alerts
          </button>
          <button className="action" type="button">
            Saved Reports
          </button>
          <span className="action">Sync</span>
          <span className="action">Settings</span>
          <span className="avatar" aria-hidden="true" />
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          <div className="nav-section">
            <h4>Admin</h4>
            <Link className="nav-item active" href="/admin/labels">
              <span className="nav-dot" />
              Labels
            </Link>
          </div>
        </aside>

        <main className="content">
          <section className="card">
            <div className="card-header">
              <div className="title">Label Management</div>
              <div className="actions">{loading ? "Working" : "Ready"}</div>
            </div>
            <div className="filter-row">
              <div className="filter-group">
                <label>Label</label>
                <input value={label} onChange={(event) => setLabel(event.target.value)} />
              </div>
              <div className="filter-group">
                <label>Category</label>
                <input value={category} onChange={(event) => setCategory(event.target.value)} />
              </div>
              <button className="btn" type="button" onClick={createLabel}>
                Add
              </button>
              <button className="btn" type="button" onClick={importSeed}>
                Import seed
              </button>
            </div>
            <div className="list">
              {labels.length ? (
                labels.map((item) => (
                  <div key={item.id} className="list-item">
                    <div>
                      <strong>{item.label}</strong>
                      <div className="meta">{item.category}</div>
                    </div>
                    <button className="btn" type="button" onClick={() => removeLabel(item.id)}>
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="list-item">
                  <span>No labels found.</span>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}