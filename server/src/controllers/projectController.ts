import { Request, Response } from "express";
import redis from "../utils/redis";
import supabase from "../utils/supabase";

export const getRepos = async (req: Request, res: Response) => {
  const { githubToken } = req.headers;

  try {
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
        },
      }
    );

    const repos = await response.json();
    res.status(200).json({ message: "Repos fetched successfully...", repos });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch repos" });
  }
};

export const createProject = async (req: Request, res: Response) => {
  const { repo_url, framework, env_variables, user_id } = req.body;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      repo_url,
      project_name: repo_url.split("/").pop()?.replace(".git", "") || "demo",
      framework,
      env_variables,
      user_id,
      status: "queued",
      deployed_url: "",
    })
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await redis.lpush("build-queue", JSON.stringify(data[0]));

  res.json({ message: "Project queued", id: data[0].id });
};

export const deleteProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await redis.lrem("build-queue", 0, id);

  res.json({ message: "Project deleted" });
};

export const getProjects = async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing user_id" });
  }

  try {
    const { data: userProjectData, error: userProjectError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId);

    if (userProjectError) {
      return res.status(500).json({ success: false, error: userProjectError });
    }

    return res.status(200).json({ success: true, data: userProjectData });
  } catch (err) {
    console.error("Projects fetch error:", err);
    return res.status(500).json({ success: false, error: err });
  }
};
