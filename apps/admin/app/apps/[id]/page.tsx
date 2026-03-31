import { notFound } from "next/navigation";
import { getAdminAppById, listCategories } from "@cotana/db";
import { AdminAppForm } from "../../../components/admin-app-form";
import { AdminShell } from "../../../components/admin-shell";

type AdminEditPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminEditPage({ params }: AdminEditPageProps) {
  const { id } = await params;
  const [app, categories] = await Promise.all([getAdminAppById(id), listCategories()]);

  if (!app) {
    notFound();
  }

  return (
    <AdminShell
      title={`Edit ${app.name}`}
      description="This page is ready for app CRUD wiring, publish actions, and embedding refresh triggers."
    >
      <AdminAppForm mode="edit" categories={categories} app={app} />
    </AdminShell>
  );
}
