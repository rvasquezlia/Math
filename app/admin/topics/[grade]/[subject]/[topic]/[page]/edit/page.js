import fs from "node:fs/promises";
import path from "node:path";
import taxonomy from "../../../../../../../../content/taxonomy.json";
import EditPageClient from "./EditPageClient";

const DEFAULT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>New Page</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../../lesson-shared.css">
<script src="../../../lesson-shared.js"></script>
</head>
<body>
<div class="app-container">
  <header>
    <div class="brand-row">
      <img src="../../../assets/lia-logo.png" alt="Lincoln International Academy logo" class="brand-logo">
      <span class="brand-name">Lincoln International Academy</span>
    </div>
    <span class="badge">New Page</span>
    <h1>New Page</h1>
  </header>
  <div class="panel active">

    <!-- Start building here. Use an example from the library on the right,
         or write your own HTML. -->

  </div>
</div>
</body>
</html>
`;

function findPageNode({ grade, subject, topic, page }) {
  const gradeNode = taxonomy.grades.find((g) => g.slug === grade);
  const subjectNode = gradeNode?.subjects.find((s) => s.slug === subject);
  const topicNode = subjectNode?.topics.find((t) => t.slug === topic);
  const pageNode = topicNode?.pages.find((p) => p.slug === page);
  return { gradeNode, subjectNode, topicNode, pageNode };
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

  let initialHtml = DEFAULT_HTML;
  try {
    initialHtml = await fs.readFile(path.join(process.cwd(), pageNode.sourcePath), "utf8");
  } catch {
    // Not scaffolded on disk yet -- start from the blank branded template.
  }

  return (
    <EditPageClient
      params={resolvedParams}
      gradeNode={gradeNode}
      subjectNode={subjectNode}
      topicNode={topicNode}
      pageNode={pageNode}
      initialHtml={initialHtml}
    />
  );
}
