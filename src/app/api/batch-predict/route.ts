import { NextResponse } from "next/server";
import { runInference } from "@/lib/modelInference";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body) ? body : body.rows;
    const modelName = body.model_name ?? "lightgbm";
    const result = await runInference("batch", rows ?? [], modelName);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Invalid request" }, { status: 400 });
  }
}
