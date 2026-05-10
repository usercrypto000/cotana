import { notFound } from "next/navigation";
import { getAdminAppById, listAppUpdates, listCategories } from "@cotana/db";
import { AdminAppForm } from "../../../components/admin-app-form";
import { AdminAppUpdatesPanel } from "../../../components/admin-app-updates-panel";
import { AdminShell } from "../../../components/admin-shell";

type AdminEditPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminEditPage({ params }: AdminEditPageProps) {
  const { id } = await params;
  const [app, categories, updates] = await Promise.all([getAdminAppById(id), listCategories(), listAppUpdates(id)]);

  if (!app) {
    notFound();
  }

  return (
    <AdminShell
      title={`Edit ${app.name}`}
      description="This page is ready for app CRUD wiring, publish actions, and embedding refresh triggers."
    >
      <div className="space-y-6">
        <AdminAppForm mode="edit" categories={categories} app={app} />
        <AdminAppUpdatesPanel appId={app.id} initialUpdates={updates} />
      </div>
    </AdminShell>
  );
}
