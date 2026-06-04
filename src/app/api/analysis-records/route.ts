import { NextResponse } from "next/server";
import { readAnalysisRecords, saveAnalysisRecord } from "@/lib/analysis-store";

export const runtime = "nodejs";

export async function GET() {
  const records = await readAnalysisRecords();
  return NextResponse.json(records);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await saveAnalysisRecord(body);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Analiz kaydı oluşturulamadı." }, { status: 400 });
  }
}
