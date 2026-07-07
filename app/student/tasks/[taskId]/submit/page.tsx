import { TaskSubmissionForm } from "@/components/student/task-submission-form";

export default async function SubmitTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return <TaskSubmissionForm taskId={taskId} />;
}
