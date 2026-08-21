import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import taxonomy from "../../../../../../content/taxonomy.json";
import PageToolbar from "./PageToolbar";

const LESSONS_ROOT = path.join(process.cwd(), "Lessons");
const LOGO_PATH = path.join(LESSONS_ROOT, "assets", "lia-logo.png");
const SHARED_CSS_PATH = path.join(LESSONS_ROOT, "lesson-shared.css");
const SHARED_JS_PATH = path.join(LESSONS_ROOT, "lesson-shared.js");
const PRINTABLE_CSS_PATH = path.join(LESSONS_ROOT, "printable-shared.css");

function findPageNode({ grade, subject, topic, page }) {
  const gradeNode = taxonomy.grades.find((g) => g.slug === grade);
  const subjectNode = gradeNode?.subjects.find((s) => s.slug === subject);
  const topicNode = subjectNode?.topics.find((t) => t.slug === topic);
  const pageNode = topicNode?.pages.find((p) => p.slug === page);
  return { gradeNode, subjectNode, topicNode, pageNode };
}

async function buildSrcDoc(sourcePath) {
  const [rawHtml, sharedCss, sharedJs, printableCss, logo] = await Promise.all([
    fs.readFile(path.join(process.cwd(), sourcePath), "utf8"),
    fs.readFile(SHARED_CSS_PATH, "utf8"),
    fs.readFile(SHARED_JS_PATH, "utf8"),
    fs.readFile(PRINTABLE_CSS_PATH, "utf8"),
    fs.readFile(LOGO_PATH),
  ]);

  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  return rawHtml
    .replace(/<link[^>]+href="[^"]*lesson-shared\.css"[^>]*>/gi, `<style>${sharedCss}</style>`)
    .replace(/<link[^>]+href="[^"]*printable-shared\.css"[^>]*>/gi, `<style>${printableCss}</style>`)
    .replace(/<script[^>]+src="[^"]*lesson-shared\.js"[^>]*><\/script>/gi, `<script>${sharedJs}<\/script>`)
    .replace(/src="[^"]*assets\/lia-logo\.png"/gi, `src="${logoDataUri}"`);
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

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { gradeNode, subjectNode, topicNode, pageNode } = findPageNode(resolvedParams);
  if (!gradeNode || !subjectNode || !topicNode || !pageNode) return {};
  return {
    title: `${topicNode.title} · ${pageNode.label ?? pageNode.title}`,
  };
}

export default async function CurriculumPage({ params }) {
  const resolvedParams = await params;
  const { gradeNode, subjectNode, topicNode, pageNode } = findPageNode(resolvedParams);
  if (!gradeNode || !subjectNode || !topicNode || !pageNode || !pageNode.sourcePath) {
    notFound();
  }

  let srcDoc;
  try {
    srcDoc = await buildSrcDoc(pageNode.sourcePath);
  } catch {
    notFound();
  }

  return (
    <section className="panel curriculum-page">
      <div className="curriculum-page__header">
        <div>
          <span className="eyebrow">{gradeNode.title} · {subjectNode.title}</span>
          <h1>{topicNode.title}</h1>
          <p className="curriculum-page__subtitle">{pageNode.label ?? pageNode.title}</p>
        </div>
        <PageToolbar
          params={resolvedParams}
          pageStatus={pageNode.status ?? null}
          topicTitle={topicNode.title}
          pageTitle={pageNode.label ?? pageNode.title}
        />
      </div>
      <iframe
        title={`${topicNode.title} - ${pageNode.title}`}
        className="curriculum-page__frame"
        srcDoc={srcDoc}
      />
    </section>
  );
}
