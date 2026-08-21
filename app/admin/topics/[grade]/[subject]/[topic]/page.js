import Link from "next/link";
import taxonomy from "../../../../../../content/taxonomy.json";
import EditTopicClient from "./EditTopicClient";

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

export default async function EditTopicPage({ params }) {
  const resolvedParams = await params;
  const { gradeNode, subjectNode, topicNode } = findTopicNode(resolvedParams);
  if (!gradeNode || !subjectNode || !topicNode) {
    return (
      <div className="access-denied">
        <h2 className="access-denied__title">Topic not found</h2>
        <Link href="/admin" className="btn-primary">Back to Admin</Link>
      </div>
    );
  }

  return (
    <EditTopicClient
      params={resolvedParams}
      gradeNode={gradeNode}
      subjectNode={subjectNode}
      topicNode={topicNode}
    />
  );
}
