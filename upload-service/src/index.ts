import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import mime from "mime-types";
import { s3 } from "./utils/s3";
import {
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const app = express();
app.use(express.json());
const PORT = 4000;

if (
  !process.env.S3_BUCKET ||
  !process.env.AWS_REGION ||
  !process.env.BASE_URL
) {
  throw new Error(
    "Missing S3_BUCKET OR AWS_REGION in environment variables OR BASE_URL in upload-service !!"
  );
}

async function deleteFolderFromS3(prefix: string): Promise<void> {
  try {
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET!,
        Prefix: prefix,
      })
    );

    if (!listResponse.Contents || listResponse.Contents.length === 0) return;

    const deleteParams = {
      Bucket: process.env.S3_BUCKET!,
      Delete: {
        Objects: listResponse.Contents.map((item) => ({ Key: item.Key! })),
        Quiet: true,
      },
    };

    await s3.send(new DeleteObjectsCommand(deleteParams));
    console.log(`@ Deleted previous folder: ${prefix}`);
  } catch (error) {
    console.error("# Error deleting folder from S3:", error);
  }
}

async function uploadDirectoryToS3(
  localPath: string,
  bucket: string,
  prefix = ""
): Promise<void> {
  const files = fs.readdirSync(localPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(localPath, file.name);
    const s3Key = `${prefix}/${file.name}`;

    if (file.isDirectory()) {
      await uploadDirectoryToS3(fullPath, bucket, s3Key);
    } else {
      const fileBuffer = fs.readFileSync(fullPath);
      const contentType = mime.lookup(file.name) || "application/octet-stream";

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await s3.send(command);
      console.log(`✔ Uploaded: ${s3Key}`);
    }
  }
}

app.post("/upload", async (req, res) => {
  const { projectId, localPath } = req.body;

  if (!projectId || !localPath) {
    return res.status(400).json({ error: "Missing projectId or localPath" });
  }

  try {
    await deleteFolderFromS3(projectId);

    await uploadDirectoryToS3(localPath, process.env.S3_BUCKET!, projectId);

    const url = `${process.env.BASE_URL!}/${projectId}`;
    res.status(200).json({ url });
  } catch (err) {
    console.error("# Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/", (_req, res) => {
  res.send("Upload service is running!");
});

app.listen(PORT, () => {
  console.log(`Upload service listening on port ${PORT}`);
});
