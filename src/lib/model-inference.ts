import { spawn } from "node:child_process";
import path from "node:path";

type InferenceAction = "predict_military_base" | "predict_military_base_ensemble";

export function runInference<T>(action: InferenceAction, data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const projectRoot = path.resolve(process.cwd(), "..");
    const scriptPath = path.join(projectRoot, "scripts", "inference.py");
    const child = spawn("python", [scriptPath], {
      cwd: projectRoot,
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

    child.stdin.end(JSON.stringify({ action, data }));
  });
}
