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
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prediction = await runInference<EuroSatPrediction>("predict_satellite", body);
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Invalid request" }, { status: 400 });
  }
}
