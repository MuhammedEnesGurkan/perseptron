import { spawn } from "node:child_process";
import path from "node:path";

type InferenceAction = "predict_ml" | "predict_dl" | "recommend" | "batch" | "predict_resnet" | "predict_satellite";

export function runInference<T>(action: InferenceAction, data: unknown, modelName?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || "python";
    const scriptPath = path.join(process.cwd(), "scripts", "inference.py");
    const child = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Inference process exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as T);
      } catch (error) {
        reject(new Error(`Failed to parse inference response: ${(error as Error).message}`));
      }
    });

    child.stdin.end(JSON.stringify({ action, data, model_name: modelName }));
  });
}
