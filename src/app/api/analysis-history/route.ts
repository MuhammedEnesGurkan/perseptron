import { NextResponse } from "next/server";
import { getRecentAnalyses } from "@/lib/analysisHistory";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const requestedLimit = Number(new URL(req.url).searchParams.get("limit") ?? 8);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 25) : 8;
    return NextResponse.json({ analyses: await getRecentAnalyses(limit) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
