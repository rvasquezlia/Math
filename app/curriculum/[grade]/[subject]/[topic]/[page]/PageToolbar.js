"use client";

import Link from "next/link";
import { useAuth } from "../../../../../contexts/AuthContext";

/**
 * Role-aware toolbar shown on every curriculum page.
 * Students see only the ← Back button.
 * Editors/admins additionally see an Edit Topic button and the page status badge.
 */
export default function PageToolbar({ params, pageStatus, topicTitle, pageTitle }) {
  const { user } = useAuth();
  const role = user?.role ?? "student";
  const canEdit = role === "admin" || role === "editor";

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
        </>
      )}
    </div>
  );
}
