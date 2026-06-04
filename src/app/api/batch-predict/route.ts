import { NextResponse } from "next/server";
import { runInference } from "@/lib/modelInference";
import { saveAnalysis } from "@/lib/analysisHistory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = Array.isArray(body) ? body : body.rows;
    const modelName = body.model_name ?? "combined";
    const result = await runInference<Record<string, unknown>>("batch", rows ?? [], modelName);
    await saveAnalysis({
      type: "batch",
      total_customers: Number(result.total_customers ?? 0),
      high_risk_customers: Number(result.high_risk_customers ?? 0),
      average_default_probability: Number(result.average_default_probability ?? 0),
      source_file: Array.isArray(body) ? undefined : String(body.file_name ?? ""),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Invalid request" }, { status: 400 });
  }
}
