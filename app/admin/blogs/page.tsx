import { BlogsManager } from "@/components/admin/blogs-manager";
import { requireAdminPage } from "@/lib/admin-access";

export default async function AdminBlogsPage() {
  await requireAdminPage("/admin/blogs");
  return <BlogsManager />;
}
