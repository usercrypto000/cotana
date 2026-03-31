import { listCategories } from "@cotana/db";
import { AdminAppForm } from "../../../components/admin-app-form";
import { AdminShell } from "../../../components/admin-shell";

export const dynamic = "force-dynamic";

export default async function NewAppPage() {
  const categories = await listCategories();

  return (
    <AdminShell
      title="Create app"
      description="Form fields and validation will connect to Prisma once admin CRUD is wired."
    >
      <AdminAppForm mode="create" categories={categories} />
    </AdminShell>
  );
}
