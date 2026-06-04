import { NextResponse } from "next/server";
import { runInference } from "@/lib/model-inference";
import type { EuroSatApiPrediction } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.model_id === "ensemble_top3_sum" ? "predict_military_base_ensemble" : "predict_military_base";
    const prediction = await runInference<EuroSatApiPrediction>(action, body);
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Analiz isteği işlenemedi." }, { status: 400 });
  }
}
