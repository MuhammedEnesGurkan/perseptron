import { NextResponse } from "next/server";
import { runInference } from "@/lib/modelInference";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prediction = await runInference("predict_ml", body, body.model_name ?? "lightgbm");
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Invalid request" }, { status: 400 });
  }
}
