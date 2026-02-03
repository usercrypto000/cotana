export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "image file required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "file too large" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = path.extname(file.name) || ".png";
    const filename = `logo-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (process.env.VERCEL) {
      const inlineUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ url: inlineUrl, stored: "inline" });
    }

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}`, stored: "file" });
  } catch (err) {
    if (err && String(err).match(/EPERM|EROFS/)) {
      try {
        const formData = await req.formData();
        const file = formData.get("file");
        if (file && file instanceof File) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const inlineUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
          return NextResponse.json({ url: inlineUrl, stored: "inline" });
        }
      } catch {
        // fall through
      }
    }
    return NextResponse.json({ error: "upload failed", detail: String(err) }, { status: 500 });
  }
}
