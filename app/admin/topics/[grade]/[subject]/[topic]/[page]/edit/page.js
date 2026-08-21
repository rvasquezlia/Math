import fs from "node:fs/promises";
import path from "node:path";
import taxonomy from "../../../../../../../../content/taxonomy.json";
import EditPageClient from "./EditPageClient";

const CONTENT_START = "<!--block-editor-content:start-->";
const CONTENT_END = "<!--block-editor-content:end-->";
const DEFAULT_BODY = "<p>Start writing your lesson…</p>";

function findPageNode({ grade, subject, topic, page }) {
  const gradeNode = taxonomy.grades.find((g) => g.slug === grade);
  const subjectNode = gradeNode?.subjects.find((s) => s.slug === subject);
  const topicNode = subjectNode?.topics.find((t) => t.slug === topic);
  const pageNode = topicNode?.pages.find((p) => p.slug === page);
  return { gradeNode, subjectNode, topicNode, pageNode };
}

/**
 * Pages previously saved by this editor are wrapped with marker comments,
 * so re-opening them extracts exactly what was last saved (no double
 * wrapping). Anything else is a hand-authored legacy lesson -- fall back to
 * the whole <body>, which the user has explicitly accepted may lose custom
 * interactivity the block editor can't represent on first save.
 */
function extractEditableBody(html) {
  const startIdx = html.indexOf(CONTENT_START);
  const endIdx = html.indexOf(CONTENT_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return html.slice(startIdx + CONTENT_START.length, endIdx).trim();
  }
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : DEFAULT_BODY;
}

export function generateStaticParams() {
  return taxonomy.grades.flatMap((grade) =>
    grade.subjects.flatMap((subject) =>
      subject.topics.flatMap((topic) =>
        topic.pages.map((page) => ({
          grade: grade.slug,
          subject: subject.slug,
          topic: topic.slug,
          page: page.slug,
        })),
      ),
    ),
  );
}

export default async function EditPageContentPage({ params }) {
  const resolvedParams = await params;
  const { gradeNode, subjectNode, topicNode, pageNode } = findPageNode(resolvedParams);

  if (!gradeNode || !subjectNode || !topicNode || !pageNode || !pageNode.sourcePath) {
    return (
      <div className="access-denied">
        <div className="access-denied__icon">🔍</div>
        <h2 className="access-denied__title">Page not found</h2>
      </div>
    );
  }

  let initialBody = DEFAULT_BODY;
  let isLegacyContent = false;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), pageNode.sourcePath), "utf8");
    isLegacyContent = !raw.includes(CONTENT_START);
    initialBody = extractEditableBody(raw);
  } catch {
    // Not scaffolded on disk yet -- keep the starter content.
  }

  return (
    <EditPageClient
      params={resolvedParams}
      gradeNode={gradeNode}
      subjectNode={subjectNode}
      topicNode={topicNode}
      pageNode={pageNode}
      initialBody={initialBody}
      isLegacyContent={isLegacyContent}
    />
  );
}
