import dotenv from "dotenv";
dotenv.config();

import redis from "./utils/redis";
import { Project } from "./types/types";
import { getAvailablePort } from "./utils/portManager";
import { writeNginxRoute, reloadNginx } from "./utils/nginx";
import { createClient } from "@supabase/supabase-js";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs-extra";
import { runCommandWithLogs } from "./utils/command";
import { updateLogs } from "./utils/logger";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase environment variables in runner service !!"
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function processJob(job: Project) {
  console.log("🔧 Processing:", job.project_name);

  const tmpRoot = process.platform === "win32" ? "C:\\tmp" : "/tmp";
  const dir = path.join(tmpRoot, `${job.project_name}-${Date.now()}`);

  if (await fs.pathExists(dir)) await fs.remove(dir);
  await fs.ensureDir(dir);

  await supabase
    .from("projects")
    .update({ status: "building", build_logs: "" })
    .eq("id", job.id);

  try {
    await updateLogs(job.id, `📦 Cloning ${job.repo_url}`);
    await simpleGit().clone(job.repo_url, dir);
    await updateLogs(job.id, "✅ Repo cloned");

    if (job.framework === "React") {
      await updateLogs(job.id, "📦 Installing dependencies...");
      await runCommandWithLogs("npm", ["install"], dir, job.id);

      await updateLogs(job.id, "🔧 Building project...");
      await runCommandWithLogs("npm", ["run", "build"], dir, job.id);

      const buildPath = path.join(dir, "dist");

      const response = await fetch("http://localhost:4000/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: job.id, localPath: buildPath }),
      });

      const { url: deployedUrl } = await response.json();

      writeNginxRoute(job.id, false);
      reloadNginx();

      await supabase
        .from("projects")
        .update({
          status: "deployed",
          deployed_url: deployedUrl,
        })
        .eq("id", job.id);

      await updateLogs(job.id, `🚀 React app deployed at: ${deployedUrl}`);
    } else {
      const port = getAvailablePort();
      const dockerfilePath = path.join(dir, "Dockerfile");
      const isTSProject = fs.existsSync(path.join(dir, "tsconfig.json"));

      const possibleEntryNames = [
        "server.ts",
        "index.ts",
        "main.ts",
        "app.ts",
        "server.js",
        "index.js",
        "main.js",
        "app.js",
      ];

      let entryFile = "";
      for (const file of possibleEntryNames) {
        const filePath = isTSProject
          ? path.join(dir, "src", file)
          : path.join(dir, file);
        if (fs.existsSync(filePath)) {
          entryFile = isTSProject ? `src/${file}` : file;
          break;
        }
      }
      if (!entryFile) entryFile = isTSProject ? "src/index.ts" : "index.js";

      if (!fs.existsSync(dockerfilePath)) {
        const defaultDockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
${isTSProject ? "RUN npm run build" : ""}
ENV PORT=3000
EXPOSE 3000
CMD ["node", "${isTSProject ? "dist" : "."}/${entryFile.replace(".ts", ".js")}"]
        `;
        fs.writeFileSync(dockerfilePath, defaultDockerfile.trim());
        await updateLogs(
          job.id,
          "⚠️ No Dockerfile found — default one generated"
        );
      }

      await updateLogs(job.id, "📦 Installing deps...");
      await runCommandWithLogs("npm", ["install"], dir, job.id);

      const imageName = `${job.project_name}-${job.id}`.toLowerCase();
      await updateLogs(job.id, `🐳 Building Docker image: ${imageName}`);
      await runCommandWithLogs(
        "docker",
        ["build", "-t", imageName, "."],
        dir,
        job.id
      );

      await updateLogs(job.id, `🚀 Running Docker container on port ${port}`);
      await runCommandWithLogs(
        "docker",
        ["run", "-d", "-p", `${port}:3000`, "--name", imageName, imageName],
        dir,
        job.id
      );

      const deployedUrl = `https://vercel.priyanshuvaliya.me/${job.id}`;
      writeNginxRoute(job.id, true, port);
      reloadNginx();

      await supabase
        .from("projects")
        .update({
          status: "deployed",
          deployed_url: deployedUrl,
          port,
        })
        .eq("id", job.id);

      await updateLogs(job.id, `✅ Node app deployed at: ${deployedUrl}`);
    }
  } catch (err: any) {
    console.error("❌ Build failed:", err);
    await updateLogs(job.id, `❌ Build failed: ${err.message || err}`);
    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", job.id);
  }
}

async function startPolling() {
  console.log("@ Runner service polling Redis...");
  setInterval(async () => {
    const jobString = await redis.rpop("build-queue");
    if (!jobString || jobString === "null") {
      console.log("@ No job found in Redis...");
      return;
    }

    try {
      const job: Project = JSON.parse(jobString);
      if (!job?.project_name || !job?.repo_url) {
        console.log("❌ Invalid job payload:", job);
        return;
      }
      await processJob(job);
    } catch (err) {
      console.error("❌ Failed to parse job JSON:", jobString);
    }
  }, 5000);
}

startPolling();
