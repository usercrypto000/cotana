import { notFound } from "next/navigation";
import { getAdminEditorialShelfById, listCategories, listAdminApps } from "@cotana/db";
import { AdminShelfForm } from "../../../components/admin-shelf-form";
import { AdminShell } from "../../../components/admin-shell";

type ShelfPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditShelfPage({ params }: ShelfPageProps) {
  const { id } = await params;
  const [shelf, categories, apps] = await Promise.all([getAdminEditorialShelfById(id), listCategories(), listAdminApps()]);

  if (!shelf) {
    notFound();
  }

  return (
    <AdminShell title={shelf.title} description="Update shelf metadata, scope, and ordered apps.">
      <AdminShelfForm
        mode="edit"
        shelf={shelf}
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
