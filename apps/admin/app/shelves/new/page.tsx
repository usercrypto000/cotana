import { listCategories, listAdminApps } from "@cotana/db";
import { AdminShelfForm } from "../../../components/admin-shelf-form";
import { AdminShell } from "../../../components/admin-shell";

export const dynamic = "force-dynamic";

export default async function NewShelfPage() {
  const [categories, apps] = await Promise.all([listCategories(), listAdminApps()]);

  return (
    <AdminShell
      title="Create editorial shelf"
      description="Editorial shelves are ordered collections that shape homepage and category discovery."
    >
      <AdminShelfForm
        mode="create"
        categories={categories}
        apps={apps.map((app) => ({
          id: app.id,
          name: app.name,
          slug: app.slug,
          status: app.status
        }))}
      />
    </AdminShell>
  );
}
