import { promises as fs } from "node:fs";
import path from "node:path";
import type { AnalysisRecord } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const imageDir = path.join(process.cwd(), "public", "analysis-images");
const recordsPath = path.join(dataDir, "analysis-records.json");

export async function readAnalysisRecords(): Promise<AnalysisRecord[]> {
  try {
    const content = await fs.readFile(recordsPath, "utf-8");
    return JSON.parse(content) as AnalysisRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function findAnalysisRecord(id: string): Promise<AnalysisRecord | undefined> {
  const records = await readAnalysisRecords();
  return records.find((record) => record.id === id);
}

export async function saveAnalysisRecord(input: {
  imageBase64: string;
  fileName: string;
  mode: AnalysisRecord["mode"];
  className: string;
  confidence: number;
  assetCount: number;
  model: string;
  yoloRan: boolean;
  militaryScore: number;
  detections: AnalysisRecord["detections"];
  predictions: AnalysisRecord["predictions"];
}): Promise<AnalysisRecord> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(imageDir, { recursive: true });

  const records = await readAnalysisRecords();
  const id = `AN-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${String(records.length + 1).padStart(3, "0")}`;
  const image = parseDataUrl(input.imageBase64);
  const imageFileName = `${id}.${image.extension}`;
  await fs.writeFile(path.join(imageDir, imageFileName), image.buffer);

  const record: AnalysisRecord = {
    id,
    source: input.fileName || imageFileName,
    zone: input.mode === "pipeline" ? "YOLO pipeline" : "EuroSAT ML 2025",
    capturedAt: new Date().toISOString(),
    className: input.className,
    confidence: input.confidence,
    assetCount: input.assetCount,
    model: input.model,
    status: input.assetCount > 0 ? "review" : "verified",
    threat: input.assetCount > 0 ? "watch" : "clear",
    imageUrl: `/analysis-images/${imageFileName}`,
    fileName: input.fileName || imageFileName,
    mode: input.mode,
    yoloRan: input.yoloRan,
    militaryScore: input.militaryScore,
    detections: input.detections,
    predictions: input.predictions,
  };

  await fs.writeFile(recordsPath, JSON.stringify([record, ...records], null, 2), "utf-8");
  return record;
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; extension: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match?.[1] ?? "image/jpeg";
  const base64 = match?.[2] ?? dataUrl;
  const extension = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return { buffer: Buffer.from(base64, "base64"), extension };
}
