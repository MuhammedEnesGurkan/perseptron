import { NextResponse } from "next/server";
import { runInference } from "@/lib/modelInference";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const plan = await runInference("recommend", body);
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Invalid request" }, { status: 400 });
  }
}
