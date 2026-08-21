"use client";

import Image from "next/image";
import Link from "next/link";
import taxonomy from "../content/taxonomy.json";
import { useAuth } from "./contexts/AuthContext";
import logo from "../public/lia-logo.png";

const PAGE_ORDER = [
  "vocabulary",
  "explanation",
  "guided",
  "exercises",
  "enrichment",
  "assessment",
  "teacher-guide",
];

/** Pages visible to a given role, respecting status & teacher-guide access. */
function visiblePages(pages, canEdit, canSeeTeacherGuide) {
  return PAGE_ORDER.map((slug) => pages.find((p) => p.slug === slug))
    .filter((p) => {
      if (!p) return false;
      if (p.id === "teacher-guide" && !canSeeTeacherGuide) return false;
      // Everyone else only sees published pages; admins see all statuses
      if (!canEdit && p.status && p.status !== "published") return false;
      return true;
    });
}

function computeStats() {
  let totalSubjects = 0;
  let totalTopics = 0;
  let totalPages = 0;
  for (const grade of taxonomy.grades) {
    totalSubjects += grade.subjects.length;
    for (const subject of grade.subjects) {
      totalTopics += subject.topics.length;
      for (const topic of subject.topics) {
        totalPages += topic.pages.length;
      }
    }
  }
  return { grades: taxonomy.grades.length, totalSubjects, totalTopics, totalPages };
}

/** Topic card shared between the public view and the admin view. */
function TopicCard({ topic, grade, subject, canEdit, canSeeTeacherGuide }) {
  const pages = visiblePages(topic.pages, canEdit, canSeeTeacherGuide);

  return (
    <article className="topic-card">
      <header className="topic-card__header">
        <h4 className="topic-card__title">{topic.title}</h4>
        <div className="topic-card__meta">
          <span className="topic-card__standard">{topic.standard}</span>
          {canEdit && (
            <Link
              href={`/admin/topics/${grade.slug}/${subject.slug}/${topic.slug}/`}
              className="topic-card__edit-btn"
              title="Edit topic"
            >
              ✏️
            </Link>
          )}
        </div>
      </header>

      <div className="topic-card__body">
        {topic.summary && (
          <p className="topic-card__summary">{topic.summary}</p>
        )}

        {pages.length === 0 ? (
          <p className="topic-card__no-pages">No published pages yet.</p>
        ) : (
          <div className="page-buttons">
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/curriculum/${grade.slug}/${subject.slug}/${topic.slug}/${page.slug}/`}
                className={`page-btn page-btn--${page.id}${page.status && page.status !== "published" ? " page-btn--draft" : ""}`}
                title={page.status && page.status !== "published" ? `Status: ${page.status}` : undefined}
              >
                {page.label ?? page.title}
                {canEdit && page.status && page.status !== "published" && (
                  <span className="page-btn__status-badge">{page.status === "in_review" ? "⏳" : "✏️"}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const canSeeTeacherGuide = isAdmin;

  if (loading) {
    return (
      <div className="page-shell">
        <section className="hero-card">
          <p style={{ margin: 0 }}>Loading…</p>
        </section>
      </div>
    );
  }

  const stats = computeStats();

  // ── Public / browsing view (default for everyone, incl. logged-out) ──────
  if (!isAdmin) {
    return (
      <div className="lp-shell">
        <header className="lp-header">
          <div className="lp-header__brand">
            <Image src={logo} alt="" className="lp-header__logo" priority />
            <span className="lp-header__brand-name">Lincoln International Academy</span>
          </div>
          <span className="lp-header__badge">LIA Math Curriculum</span>
          <h1>Welcome! 👋</h1>
          <p className="lp-header__sub">
            Browse the lessons below. Click any page button to open it.
          </p>
        </header>

        <div className="lp-content">
          {taxonomy.grades.map((grade) => (
            <section key={grade.id} className="grade-section">
              <div className="grade-header">
                <h2>{grade.title}</h2>
              </div>
              <div className="grade-body">
                {grade.subjects.map((subject) => {
                  const publishedTopics = subject.topics.filter((t) =>
                    visiblePages(t.pages, false, false).length > 0,
                  );
                  if (publishedTopics.length === 0) return null;

                  return (
                    <div key={subject.id} className="subject-section">
                      <div className="subject-section__header">
                        <h3 className="subject-heading">{subject.title}</h3>
                      </div>
                      <div className="topic-grid">
                        {publishedTopics.map((topic) => (
                          <TopicCard
                            key={topic.id}
                            topic={topic}
                            grade={grade}
                            subject={subject}
                            canEdit={false}
                            canSeeTeacherGuide={false}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  // ── Admin view (logged in as the shared teacher/admin account) ──────────
  return (
    <div className="page-shell">
      <section className="hero-card">
        <span className="eyebrow">Curriculum Index</span>
        <h1>LIA Math Curriculum</h1>
        <p>Welcome back, <strong>Admin</strong>.</p>

        <dl className="stats">
          <div><dt>Grades</dt><dd>{stats.grades}</dd></div>
          <div><dt>Subjects</dt><dd>{stats.totalSubjects}</dd></div>
          <div><dt>Topics</dt><dd>{stats.totalTopics}</dd></div>
          <div><dt>Pages</dt><dd>{stats.totalPages}</dd></div>
        </dl>

        <div className="admin-toolbar" style={{ marginTop: "1rem" }}>
          <Link href="/admin" className="btn-primary">Admin Dashboard</Link>
          <Link href="/admin/topics/new" className="btn-ghost">+ New Topic</Link>
        </div>
      </section>

      {taxonomy.grades.map((grade) => (
        <section key={grade.id} className="panel">
          <h2 className="grade-heading">{grade.title}</h2>

          {grade.subjects.map((subject) => (
            <div key={subject.id} className="subject-section">
              <div className="subject-section__header">
                <h3 className="subject-heading">{subject.title}</h3>
                <Link
                  href={`/admin/topics/new?grade=${grade.slug}&subject=${subject.slug}`}
                  className="btn-ghost btn-ghost--sm"
                >
                  + New Topic
                </Link>
              </div>

              <div className="topic-grid">
                {subject.topics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    grade={grade}
                    subject={subject}
                    canEdit={isAdmin}
                    canSeeTeacherGuide={canSeeTeacherGuide}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
