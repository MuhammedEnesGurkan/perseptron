import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type AnalysisType = "single" | "batch";

export type AnalysisHistoryRecord = {
  id: string;
  type: AnalysisType;
  created_at: string;
  risk_band?: string;
  default_probability?: number;
  decision?: string;
  model_name?: string;
  loan_amount?: number;
  total_customers?: number;
  high_risk_customers?: number;
  average_default_probability?: number;
  source_file?: string;
  input?: Record<string, unknown>;
};

const dataDirectory = path.join(process.cwd(), "data");
const historyFile = path.join(dataDirectory, "analysis-history.jsonl");
let writeQueue = Promise.resolve();

export function saveAnalysis(record: Omit<AnalysisHistoryRecord, "id" | "created_at">) {
  const storedRecord: AnalysisHistoryRecord = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...record,
  };

  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    await appendFile(historyFile, `${JSON.stringify(storedRecord)}\n`, "utf8");
  });

  return writeQueue.then(() => storedRecord);
}

export async function getRecentAnalyses(limit = 8) {
  try {
    const content = await readFile(historyFile, "utf8");
    return content
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AnalysisHistoryRecord)
      .slice(-limit)
      .reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}
