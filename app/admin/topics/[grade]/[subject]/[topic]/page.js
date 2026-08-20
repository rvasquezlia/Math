"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import taxonomy from "../../../../../../content/taxonomy.json";
import RequireRole from "../../../../../components/RequireRole";

function findTopicNode({ grade, subject, topic }) {
  const gradeNode = taxonomy.grades.find((g) => g.slug === grade);
  const subjectNode = gradeNode?.subjects.find((s) => s.slug === subject);
  const topicNode = subjectNode?.topics.find((t) => t.slug === topic);
  return { gradeNode, subjectNode, topicNode };
}

export function generateStaticParams() {
  return taxonomy.grades.flatMap((grade) =>
    grade.subjects.flatMap((subject) =>
      subject.topics.map((topic) => ({
        grade: grade.slug,
        subject: subject.slug,
        topic: topic.slug,
      })),
    ),
  );
}

export default function EditTopicPage({ params }) {
  const { gradeNode, subjectNode, topicNode } = findTopicNode(params);
  if (!gradeNode || !subjectNode || !topicNode) {
    return (
      <RequireRole roles={["admin", "editor"]}>
        <div className="access-denied">
          <h2 className="access-denied__title">Topic not found</h2>
          <Link href="/admin" className="btn-primary">Back to Admin</Link>
        </div>
      </RequireRole>
    );
  }

  const [title, setTitle] = useState(topicNode.title);
  const [standard, setStandard] = useState(topicNode.standard ?? "");
  const [summary, setSummary] = useState(topicNode.summary ?? "");
  const [pages, setPages] = useState(topicNode.pages);

  const draftTopic = useMemo(
    () => ({
      ...topicNode,
      title,
      standard,
      summary,
      pages,
    }),
    [pages, standard, summary, title, topicNode],
  );

  function updatePageLabel(id, label) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label } : p)),
    );
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
          </div>
        </section>

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
              <label>Section Labels</label>
              <div className="topic-sections">
                {pages.map((page) => (
                  <div key={page.id} className="topic-sections__row">
                    <span className="topic-sections__slug">{page.slug}</span>
                    <input
                      value={page.label ?? page.title}
                      onChange={(e) => updatePageLabel(page.id, e.target.value)}
                    />
                    <Link
                      className="btn-ghost btn-ghost--sm"
                      href={`/curriculum/${params.grade}/${params.subject}/${params.topic}/${page.slug}/`}
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2 className="grade-heading">Updated JSON Preview</h2>
          <p>Copy this topic object into <code>content/taxonomy.json</code> to apply changes.</p>
          <pre className="topic-json-preview">
            {JSON.stringify(draftTopic, null, 2)}
          </pre>
        </section>
      </div>
    </RequireRole>
  );
}
