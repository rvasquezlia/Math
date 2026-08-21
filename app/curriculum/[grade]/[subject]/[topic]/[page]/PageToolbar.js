"use client";

import Link from "next/link";
import { useAuth } from "../../../../../contexts/AuthContext";

/**
 * Role-aware toolbar shown on every curriculum page.
 * Everyone sees the ← Back button; the logged-in admin additionally sees
 * Edit Topic / Edit Content buttons and the page status badge.
 */
export default function PageToolbar({ params, pageStatus, topicTitle, pageTitle }) {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";

  const statusLabel = { draft: "✏️ Draft", in_review: "⏳ In Review", published: "✅ Published" }[pageStatus] ?? null;

  return (
    <div className="curriculum-page__toolbar admin-toolbar">
      <Link href="/" className="btn-ghost">← Back</Link>

      {canEdit && (
        <>
          {statusLabel && (
            <span className={`page-status-badge page-status-badge--${pageStatus}`}>
              {statusLabel}
            </span>
          )}
          <Link
            href={`/admin/topics/${params.grade}/${params.subject}/${params.topic}/`}
            className="btn-primary"
          >
            Edit Topic
          </Link>
          <Link
            href={`/admin/topics/${params.grade}/${params.subject}/${params.topic}/${params.page}/edit/`}
            className="btn-primary"
          >
            ✏️ Edit Content
          </Link>
        </>
      )}
    </div>
  );
}
