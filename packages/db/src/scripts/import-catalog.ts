import { readFile } from "node:fs/promises";
import { AppStatus } from "@prisma/client";
import {
  createAdminApp,
  listCategories,
  parseCatalogImportJson,
  prisma,
  setAdminAppStatus,
  validateCatalogImportRows
} from "../index";

function parseArgs(args: string[]) {
  return {
    file: args.find((arg) => !arg.startsWith("--")),
    write: args.includes("--write")
  };
}

async function getImportUserId() {
  const email = process.env.ADMIN_ALLOWLIST_EMAIL;

  if (!email) {
    throw new Error("ADMIN_ALLOWLIST_EMAIL is required for catalog imports.");
  }

  const user = await prisma.user.findFirst({
    where: {
      email
    }
  });

  if (!user) {
    throw new Error(`No admin user found for ${email}. Run the seed workflow first.`);
  }

  return user.id;
}

async function main() {
  const { file, write } = parseArgs(process.argv.slice(2));

  if (!file) {
    throw new Error("Usage: pnpm catalog:import <catalog.json> [--write]");
  }

  if (write && process.env.NODE_ENV === "production" && process.env.COTANA_CONFIRM_PRODUCTION_IMPORT !== "true") {
    throw new Error("Set COTANA_CONFIRM_PRODUCTION_IMPORT=true before writing catalog imports in production.");
  }

  const [content, categories] = await Promise.all([readFile(file, "utf8"), listCategories()]);
  const rows = parseCatalogImportJson(content);
  const plan = validateCatalogImportRows(rows, categories, {
    dryRun: !write,
    allowWrite: write
  });

  process.stdout.write(`${JSON.stringify(
    {
      dryRun: plan.dryRun,
      canWrite: plan.canWrite,
      validRows: plan.validRows.length,
      invalidRows: plan.invalidRows
    },
    null,
    2,
  )}\n`);

  if (!write || !plan.canWrite) {
    return;
  }

  const userId = await getImportUserId();
  const imported = [];

  for (const row of plan.validRows) {
    const app = await createAdminApp(row.input, userId);

    if (app && row.status !== AppStatus.DRAFT) {
      await setAdminAppStatus(app.id, row.status);
    }

    imported.push({
      rowNumber: row.rowNumber,
      slug: app?.slug ?? null,
      status: row.status
    });
  }

  process.stdout.write(`${JSON.stringify({ imported }, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
