"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import taxonomy from "../../content/taxonomy.json";
import { useAuth } from "../contexts/AuthContext";

/**
 * Collapsible sidebar that renders the full Grade → Subject → Topic tree
 * from /content/taxonomy.json, visible to everyone. Teacher-guide pages
 * are only shown to the logged-in admin. The section containing the page
 * you're currently on starts expanded, and that page's own link is
 * highlighted.
 */
export default function Sidebar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  if (loading) return null;

  const canSeeTeacherGuide = user?.role === "admin";

  return (
    <nav className="sidebar" aria-label="Curriculum navigation">
      <div className="sidebar__logo">
        <Link href="/" className="sidebar__home-link">
          📚 Lessons
        </Link>
      </div>

      {taxonomy.grades.map((grade) => (
        <GradeSection
          key={grade.id}
          grade={grade}
          canSeeTeacherGuide={canSeeTeacherGuide}
          pathname={pathname}
        />
      ))}
    </nav>
  );
}

function GradeSection({ grade, canSeeTeacherGuide, pathname }) {
  const [open, setOpen] = useState(true);

  return (
    <section className="sidebar__grade">
      <button
        className="sidebar__grade-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="sidebar__grade-label">{grade.title}</span>
        <span className="sidebar__chevron">{open ? "▾" : "▸"}</span>
      </button>

      {open &&
        grade.subjects.map((subject) => (
          <SubjectSection
            key={subject.id}
            subject={subject}
            gradeSlug={grade.slug}
            canSeeTeacherGuide={canSeeTeacherGuide}
            pathname={pathname}
          />
        ))}
    </section>
  );
}

function SubjectSection({ subject, gradeSlug, canSeeTeacherGuide, pathname }) {
  const isActiveSubject = pathname?.startsWith(`/curriculum/${gradeSlug}/${subject.slug}/`);
  const [open, setOpen] = useState(isActiveSubject);

  return (
    <div className="sidebar__subject">
      <button
        className="sidebar__subject-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{subject.title}</span>
        <span className="sidebar__chevron">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <ul className="sidebar__topics">
          {subject.topics.map((topic) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              gradeSlug={gradeSlug}
              subjectSlug={subject.slug}
              canSeeTeacherGuide={canSeeTeacherGuide}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TopicItem({ topic, gradeSlug, subjectSlug, canSeeTeacherGuide, pathname }) {
  const isActiveTopic = pathname?.startsWith(`/curriculum/${gradeSlug}/${subjectSlug}/${topic.slug}/`);
  const [open, setOpen] = useState(isActiveTopic);

  const visiblePages = topic.pages.filter(
    (p) => canSeeTeacherGuide || p.id !== "teacher-guide",
  );

  return (
    <li className="sidebar__topic">
      <button
        className="sidebar__topic-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{topic.title}</span>
        <span className="sidebar__chevron">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <ul className="sidebar__pages">
          {visiblePages.map((page) => {
            const href = `/curriculum/${gradeSlug}/${subjectSlug}/${topic.slug}/${page.slug}/`;
            const isActive = pathname === href;
            return (
              <li key={page.id}>
                <Link
                  href={href}
                  className={`sidebar__page-link${isActive ? " sidebar__page-link--active" : ""}`}
                >
                  {page.label ?? page.title}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
