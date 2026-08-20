import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell">
      <div className="access-denied">
        <div className="access-denied__icon">🔍</div>
        <h2 className="access-denied__title">Page not found</h2>
        <p className="access-denied__sub">
          That lesson or page doesn&apos;t exist, or it hasn&apos;t been published yet.
        </p>
        <Link href="/" className="btn-primary">← Back to Curriculum</Link>
      </div>
    </div>
  );
}
