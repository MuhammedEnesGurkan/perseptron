import { NextResponse } from "next/server";
import { runInference } from "@/lib/modelInference";

export const runtime = "nodejs";

type EuroSatPrediction = {
  dataset: string;
  model_name: string;
  model_file: string;
  input_size: number;
  num_classes: number;
  prediction: number;
  prediction_label: string;
  confidence: number;
  class_labels_available: boolean;
  top_predictions: Array<{
    class_index: number;
    class_label: string;
    probability: number;
  }>;
  pipeline?: {
    name: string;
    decision_authority?: string;
    stage_1_context_labels: string[];
    stage_1_passed: boolean;
    stage_1_context_score?: number;
    stage_1_best_context_label?: string | null;
    stage_1_best_context_confidence?: number;
    stage_2_ran: boolean;
    stage_2_error?: string | null;
    military_base_detected: boolean;
    military_base_score: number;
    minimum_military_asset_confidence?: number;
    decision_label: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prediction = await runInference<EuroSatPrediction>("predict_military_base", body);
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Invalid request" }, { status: 400 });
  }
}
