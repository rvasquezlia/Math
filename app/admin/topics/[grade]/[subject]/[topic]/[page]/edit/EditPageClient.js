"use client";

import { useState } from "react";
import Link from "next/link";
import RequireRole from "../../../../../../../components/RequireRole";
import { useAuth } from "../../../../../../../contexts/AuthContext";
import BlockEditor from "../../../../../../../components/editor/BlockEditor";
import { savePageContent } from "../../../../../../../../lib/adminApi";

export default function EditPageClient({
  params,
  gradeNode,
  subjectNode,
  topicNode,
  pageNode,
  initialBody,
  isLegacyContent,
}) {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave(updated) {
    setError("");
    setSaved(false);
    try {
      await savePageContent(
        user,
        params.grade,
        params.subject,
        params.topic,
        params.page,
        updated.body,
      );
      setSaved(true);
    } catch (err) {
      setError(err.message ?? "Failed to save this page.");
    }
  }

  return (
    <RequireRole roles={["admin", "editor"]}>
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
              View Page
            </Link>
          </div>
        </section>

        {isLegacyContent && (
          <section className="panel panel--danger">
            <p style={{ margin: 0 }}>
              <strong>Heads up:</strong> this page was hand-built with custom interactivity
              (auto-graded questions, clickable diagrams, etc.) that the block editor can't
              represent. Saving here will replace it with whatever you build below.
            </p>
          </section>
        )}

        <section className="panel">
          {error && (
            <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: 0 }}>{error}</p>
          )}
          {saved && !error && (
            <p style={{ color: "#16a34a", fontSize: "0.85rem", marginTop: 0 }}>
              Saved — the site is rebuilding and should reflect your changes in about a minute.
            </p>
          )}
          <BlockEditor
            pageJson={{
              title: pageNode.label ?? pageNode.title,
              status: pageNode.status ?? "draft",
              body: initialBody,
            }}
            onSave={handleSave}
          />
        </section>
      </div>
    </RequireRole>
  );
}
