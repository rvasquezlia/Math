"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import RequireRole from "../../../../../../../components/RequireRole";
import { savePageContent } from "../../../../../../../../lib/adminApi";
import SNIPPETS from "./snippets";

export default function EditPageClient({ params, gradeNode, subjectNode, topicNode, pageNode, initialHtml }) {
  const [html, setHtml] = useState(initialHtml);
  const [previewSrc, setPreviewSrc] = useState(initialHtml);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showExamples, setShowExamples] = useState(true);
  const textareaRef = useRef(null);

  // Debounce the preview so the iframe doesn't reload on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setPreviewSrc(html), 400);
    return () => clearTimeout(t);
  }, [html]);

  function insertSnippet(snippetHtml) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? html.length;
    const end = el.selectionEnd ?? html.length;
    const next = html.slice(0, start) + snippetHtml + "\n" + html.slice(end);
    setHtml(next);
    // Restore focus + caret after the inserted text on the next tick.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippetHtml.length + 1;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleCopy(snippetHtml) {
    try {
      await navigator.clipboard.writeText(snippetHtml);
    } catch {
      // Clipboard permission denied -- Insert still works, so no hard failure.
    }
  }

  async function handleSave() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await savePageContent(params.grade, params.subject, params.topic, params.page, html);
      setSaved(true);
    } catch (err) {
      setError(err.message ?? "Failed to save this page.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireRole>
      <div className="page-shell">
        <section className="hero-card">
          <span className="eyebrow">Admin › Edit Content</span>
          <h1>{topicNode.title}</h1>
          <p>{gradeNode.title} · {subjectNode.title} · {pageNode.label ?? pageNode.title}</p>
          <div className="admin-toolbar">
            <Link
              href={`/admin/topics/${params.grade}/${params.subject}/${params.topic}/`}
              className="btn-ghost"
            >
              ← Back to Topic
            </Link>
            <Link
              href={`/curriculum/${params.grade}/${params.subject}/${params.topic}/${params.page}/`}
              className="btn-ghost"
            >
              View Live Page
            </Link>
            <button type="button" className="btn-ghost" onClick={() => setShowExamples((v) => !v)}>
              {showExamples ? "Hide Examples" : "Show Examples"}
            </button>
          </div>
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
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0 }}>
            This is the exact HTML file for this page. Edit it directly on the left; the right
            side shows exactly what students will see. Pick an example below to insert
            ready-made pieces (callouts, tables, graded questions, tabs…) instead of writing
            HTML from scratch.
          </p>

          <div className="html-editor">
            <div className="html-editor__pane">
              <div className="html-editor__pane-label">HTML source</div>
              <textarea
                ref={textareaRef}
                className="html-editor__textarea"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="html-editor__pane">
              <div className="html-editor__pane-label">Live preview</div>
              <iframe title="Live preview" className="html-editor__preview" srcDoc={previewSrc} />
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Page"}
            </button>
          </div>
        </section>

        {showExamples && (
          <section className="panel">
            <h2 className="grade-heading">Example blocks</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Click <strong>Insert</strong> to drop one of these into the HTML at your cursor, or
              <strong> Copy</strong> to paste it yourself.
            </p>
            <div className="snippet-grid">
              {SNIPPETS.map((s) => (
                <div key={s.id} className="snippet-card">
                  <div className="snippet-card__header">
                    <span className="snippet-card__label">{s.label}</span>
                    <div className="snippet-card__actions">
                      <button type="button" className="btn-ghost btn-ghost--sm" onClick={() => handleCopy(s.html)}>
                        Copy
                      </button>
                      <button type="button" className="btn-primary btn-primary--sm" onClick={() => insertSnippet(s.html)}>
                        Insert
                      </button>
                    </div>
                  </div>
                  <p className="snippet-card__desc">{s.description}</p>
                  <pre className="snippet-card__code">{s.html}</pre>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </RequireRole>
  );
}
