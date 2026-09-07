import { requireAdminPage } from "@/lib/admin-access";
import { BlogEditor } from "@/components/admin/blog-editor";

export default async function BlogEditorPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdminPage("/admin/blogs/editor");
  const { id } = await searchParams;
  return <BlogEditor initialId={id} />;
}
