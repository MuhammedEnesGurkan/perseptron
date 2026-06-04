import { NextResponse } from "next/server";
import { runInference } from "@/lib/modelInference";
import { saveAnalysis } from "@/lib/analysisHistory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prediction = await runInference<Record<string, unknown>>("predict_ml", body, body.model_name ?? "combined");
    if (!body.skip_history) {
      await saveAnalysis({
        type: "single",
        risk_band: String(prediction.risk_band ?? ""),
        default_probability: Number(prediction.default_probability ?? 0),
        decision: String(prediction.decision ?? ""),
        model_name: String(prediction.model_name ?? body.model_name ?? "combined"),
        loan_amount: Number(body.loan_amount ?? 0),
        input: body,
      });
    }
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Invalid request" }, { status: 400 });
  }
}
