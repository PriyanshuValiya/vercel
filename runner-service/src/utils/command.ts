import { spawn } from "child_process";
import { updateLogs } from "./logger";

export function runCommandWithLogs(
  command: string,
  args: string[],
  cwd: string,
  projectId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: true });

    child.stdout.on("data", async (data) => {
      const line = data.toString().trim();
      console.log(line);
      await updateLogs(projectId, line);
    });

    child.stderr.on("data", async (data) => {
      const line = data.toString().trim();
      console.error(line);
      await updateLogs(projectId, line);
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed with exit code ${code}`));
    });
  });
}
