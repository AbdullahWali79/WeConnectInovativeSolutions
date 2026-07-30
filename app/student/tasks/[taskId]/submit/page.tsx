import { redirect } from "next/navigation";

export default async function SubmitTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  redirect(`/student?submitTask=${encodeURIComponent(taskId)}`);
}
