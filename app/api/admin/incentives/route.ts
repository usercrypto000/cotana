export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { normalizeList } from "@/services/incentive-utils";

export async function GET() {
  try {
    const items = await prisma.incentive.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projectId = Number(body?.projectId);
    const status = typeof body?.status === "string" ? body.status : "";
    const rewardAssetType = typeof body?.rewardAssetType === "string" ? body.rewardAssetType : "";
    const capitalRequired =
      typeof body?.capitalRequired === "string" ? body.capitalRequired : "";
    const timeIntensity =
      typeof body?.timeIntensity === "string" ? body.timeIntensity : "";

    if (
      !Number.isFinite(projectId) ||
      !status ||
      !rewardAssetType ||
      !capitalRequired ||
      !timeIntensity
    ) {
      return NextResponse.json(
        { error: "projectId, status, rewardAssetType, capitalRequired, timeIntensity required" },
        { status: 400 }
      );
    }

    const created = await prisma.incentive.create({
      data: {
        projectId,
        status: status as any,
        title: typeof body?.title === "string" ? body.title.trim() : null,
        description: typeof body?.description === "string" ? body.description.trim() : null,
        types: normalizeList(body?.types),
        defillamaSlug:
          typeof body?.defillamaSlug === "string" ? body.defillamaSlug.trim() : null,
        rewardAssetType: rewardAssetType as any,
        rewardAssetSymbol:
          typeof body?.rewardAssetSymbol === "string" ? body.rewardAssetSymbol.trim() : null,
        rewardAssetAddress:
          typeof body?.rewardAssetAddress === "string" ? body.rewardAssetAddress.trim() : null,
        rewardAssetChain:
          typeof body?.rewardAssetChain === "string" ? body.rewardAssetChain.trim() : null,
        rewardAssets:
          typeof body?.rewardAssets === "string" ? body.rewardAssets.trim() : null,
        capitalRequired: capitalRequired as any,
        timeIntensity: timeIntensity as any,
        riskFlags: normalizeList(body?.riskFlags),
        riskScore: Number.isFinite(Number(body?.riskScore)) ? Number(body.riskScore) : null,
        saturationScore: Number.isFinite(Number(body?.saturationScore))
          ? Number(body.saturationScore)
          : null,
        flowSummary: typeof body?.flowSummary === "string" ? body.flowSummary.trim() : null,
        statusRationale:
          typeof body?.statusRationale === "string" ? body.statusRationale.trim() : null,
        howToExtract:
          typeof body?.howToExtract === "string" ? body.howToExtract.trim() : null,
        xHandleUrl:
          typeof body?.xHandleUrl === "string" ? body.xHandleUrl.trim() : null,
        participationUrl:
          typeof body?.participationUrl === "string"
            ? body.participationUrl.trim()
            : null,
        snapshotWindow:
          typeof body?.snapshotWindow === "string"
            ? body.snapshotWindow.trim()
            : null,
        verified: Boolean(body?.verified),
        startAt: typeof body?.startAt === "string" && body.startAt
          ? new Date(body.startAt)
          : null,
        endAt: typeof body?.endAt === "string" && body.endAt ? new Date(body.endAt) : null,
        lastUpdatedAt: body?.lastUpdatedAt ? new Date(body.lastUpdatedAt) : new Date(),
      },
    });
    return NextResponse.json({ item: created });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body?.id);
    const projectId = Number(body?.projectId);
    const status = typeof body?.status === "string" ? body.status : "";
    const rewardAssetType = typeof body?.rewardAssetType === "string" ? body.rewardAssetType : "";
    const capitalRequired =
      typeof body?.capitalRequired === "string" ? body.capitalRequired : "";
    const timeIntensity =
      typeof body?.timeIntensity === "string" ? body.timeIntensity : "";

    if (
      !Number.isFinite(id) ||
      !Number.isFinite(projectId) ||
      !status ||
      !rewardAssetType ||
      !capitalRequired ||
      !timeIntensity
    ) {
      return NextResponse.json(
        { error: "id, projectId, status, rewardAssetType, capitalRequired, timeIntensity required" },
        { status: 400 }
      );
    }

    const updated = await prisma.incentive.update({
      where: { id },
      data: {
        projectId,
        status: status as any,
        title: typeof body?.title === "string" ? body.title.trim() : null,
        description: typeof body?.description === "string" ? body.description.trim() : null,
        types: normalizeList(body?.types),
        defillamaSlug:
          typeof body?.defillamaSlug === "string" ? body.defillamaSlug.trim() : null,
        rewardAssetType: rewardAssetType as any,
        rewardAssetSymbol:
          typeof body?.rewardAssetSymbol === "string" ? body.rewardAssetSymbol.trim() : null,
        rewardAssetAddress:
          typeof body?.rewardAssetAddress === "string" ? body.rewardAssetAddress.trim() : null,
        rewardAssetChain:
          typeof body?.rewardAssetChain === "string" ? body.rewardAssetChain.trim() : null,
        rewardAssets:
          typeof body?.rewardAssets === "string" ? body.rewardAssets.trim() : null,
        capitalRequired: capitalRequired as any,
        timeIntensity: timeIntensity as any,
        riskFlags: normalizeList(body?.riskFlags),
        riskScore: Number.isFinite(Number(body?.riskScore)) ? Number(body.riskScore) : null,
        saturationScore: Number.isFinite(Number(body?.saturationScore))
          ? Number(body.saturationScore)
          : null,
        flowSummary: typeof body?.flowSummary === "string" ? body.flowSummary.trim() : null,
        statusRationale:
          typeof body?.statusRationale === "string" ? body.statusRationale.trim() : null,
        howToExtract:
          typeof body?.howToExtract === "string" ? body.howToExtract.trim() : null,
        xHandleUrl:
          typeof body?.xHandleUrl === "string" ? body.xHandleUrl.trim() : null,
        participationUrl:
          typeof body?.participationUrl === "string"
            ? body.participationUrl.trim()
            : null,
        snapshotWindow:
          typeof body?.snapshotWindow === "string"
            ? body.snapshotWindow.trim()
            : null,
        verified: Boolean(body?.verified),
        startAt: typeof body?.startAt === "string" && body.startAt
          ? new Date(body.startAt)
          : null,
        endAt: typeof body?.endAt === "string" && body.endAt ? new Date(body.endAt) : null,
        lastUpdatedAt: body?.lastUpdatedAt ? new Date(body.lastUpdatedAt) : new Date(),
      },
    });
    return NextResponse.json({ item: updated });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body?.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await prisma.incentiveEvent.deleteMany({ where: { incentiveId: id } });
    await prisma.incentiveLink.deleteMany({ where: { incentiveId: id } });
    await prisma.incentiveProof.deleteMany({ where: { incentiveId: id } });
    await prisma.incentiveMetric.deleteMany({ where: { incentiveId: id } });
    await prisma.incentive.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "internal error", detail: String(err) }, { status: 500 });
  }
}
