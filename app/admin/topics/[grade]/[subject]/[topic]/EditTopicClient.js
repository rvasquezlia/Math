"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RequireRole from "../../../../../components/RequireRole";
import { useAuth } from "../../../../../contexts/AuthContext";
import { updateTopic, deleteTopic } from "../../../../../../lib/adminApi";

const PAGE_SLUGS = [
  { id: "vocabulary", label: "Vocabulary" },
  { id: "explanation", label: "Explanation" },
  { id: "guided", label: "Guided Practice" },
  { id: "exercises", label: "Exercises" },
  { id: "enrichment", label: "Enrichment" },
  { id: "assessment", label: "Assessment" },
  { id: "teacher-guide", label: "Teacher Guide" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "✏️ Draft" },
  { value: "in_review", label: "⏳ In Review" },
  { value: "published", label: "✅ Published" },
];

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function EditTopicClient({ params, gradeNode, subjectNode, topicNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [title, setTitle] = useState(topicNode.title);
  const [standard, setStandard] = useState(topicNode.standard ?? "");
  const [summary, setSummary] = useState(topicNode.summary ?? "");
  const [pages, setPages] = useState(
    topicNode.pages.map((p) => ({ ...p, status: p.status ?? "published" })),
  );
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageId, setNewPageId] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const draftTopic = useMemo(
    () => ({ ...topicNode, title, standard, summary, pages }),
    [pages, standard, summary, title, topicNode],
  );

  function updatePage(id, field, value) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function removePage(id) {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }

  function addPage() {
    if (!newPageId) return;
    const def = PAGE_SLUGS.find((p) => p.id === newPageId);
    const isPractice = ["guided", "exercises", "enrichment", "assessment"].includes(newPageId);
    setPages((prev) => [
      ...prev,
      {
        id: newPageId,
        title: def?.label ?? newPageId,
        slug: newPageId,
        label: def?.label ?? newPageId,
        status: "draft",
        sourcePath: `Lessons/${gradeNode.slug}/Topics/${topicNode.slug}/${isPractice ? "practice/" : ""}${newPageId}.html`,
      },
    ]);
    setNewPageId("");
    setShowAddPage(false);
  }

  const availableToAdd = PAGE_SLUGS.filter((ps) => !pages.find((p) => p.id === ps.id));

  async function handleSave() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await updateTopic(user, gradeNode.slug, subjectNode.slug, draftTopic);
      setSaved(true);
    } catch (err) {
      setError(err.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError("");
    setDeleting(true);
    try {
      await deleteTopic(user, gradeNode.slug, subjectNode.slug, topicNode.slug);
      setShowDeleteConfirm(false);
      router.push("/admin");
    } catch (err) {
      setError(err.message ?? "Failed to delete topic.");
      setDeleting(false);
    }
  }

  return (
    <RequireRole roles={["admin", "editor"]}>
      <div className="page-shell">
        <section className="hero-card">
          <span className="eyebrow">Admin › Edit Topic</span>
          <h1>{topicNode.title}</h1>
          <p>{gradeNode.title} · {subjectNode.title}</p>
          <div className="admin-toolbar">
            <Link href="/admin" className="btn-ghost">← Dashboard</Link>
            <Link href="/" className="btn-ghost">Curriculum</Link>
            {isAdmin && (
              <button
                className="btn-danger"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
              >
                🗑 Delete Topic
              </button>
            )}
          </div>
        </section>

        {showDeleteConfirm && (
          <section className="panel panel--danger">
            <h2 className="grade-heading" style={{ color: "#dc2626" }}>⚠️ Confirm Delete</h2>
            <p>
              Are you sure you want to delete <strong>{title}</strong>? This removes it from{" "}
              <code>content/taxonomy.json</code> immediately. The lesson HTML files themselves
              are not deleted automatically.
            </p>
            <div className="admin-toolbar">
              <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </section>
        )}

        <section className="panel">
          <form className="form-stack" onSubmit={(e) => e.preventDefault()}>
            <div className="form-field">
              <label htmlFor="title">Topic Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="standard">Standard</label>
              <input id="standard" value={standard} onChange={(e) => setStandard(e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="summary">Summary</label>
              <textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>

            <div className="form-field">
              <label>Pages</label>
              <div className="topic-sections">
                {pages.map((page) => (
                  <div key={page.id} className="topic-sections__row topic-sections__row--extended">
                    <span className="topic-sections__slug">{page.slug}</span>
                    <input
                      value={page.label ?? page.title}
                      onChange={(e) => updatePage(page.id, "label", e.target.value)}
                      placeholder="Page label…"
                    />
                    <select
                      className="topic-sections__status"
                      value={page.status ?? "published"}
                      onChange={(e) => updatePage(page.id, "status", e.target.value)}
                      title="Page status"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <Link
                      className="btn-ghost btn-ghost--sm"
                      href={`/curriculum/${params.grade}/${params.subject}/${params.topic}/${page.slug}/`}
                    >
                      Open
                    </Link>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-danger btn-danger--sm"
                        onClick={() => removePage(page.id)}
                        title="Remove this page from topic"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {availableToAdd.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  {showAddPage ? (
                    <div className="add-page-row">
                      <select
                        value={newPageId}
                        onChange={(e) => setNewPageId(e.target.value)}
                        className="add-page-select"
                      >
                        <option value="">Choose page type…</option>
                        {availableToAdd.map((ps) => (
                          <option key={ps.id} value={ps.id}>{ps.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-primary btn-primary--sm"
                        onClick={addPage}
                        disabled={!newPageId}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="btn-ghost btn-ghost--sm"
                        onClick={() => { setShowAddPage(false); setNewPageId(""); }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost btn-ghost--sm"
                      onClick={() => setShowAddPage(true)}
                    >
                      + Add Page
                    </button>
                  )}
                </div>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          {error && (
            <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: 0 }}>{error}</p>
          )}
          {saved && !error && (
            <p style={{ color: "#16a34a", fontSize: "0.85rem", marginTop: 0 }}>
              Saved — the site is rebuilding and should reflect your changes in about a minute.
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </RequireRole>
  );
}
