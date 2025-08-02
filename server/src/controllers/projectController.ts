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
  const project_name = repo_url.split("/").pop()?.replace(".git", "");

  try {
    const { data: existingProjects, error: fetchError } = await supabase
      .from("projects")
      .select("*")
      .eq("repo_url", repo_url)
      .eq("user_id", user_id);

    if (fetchError) {
      return res.status(500).json({
        success: false,
        error: fetchError.message,
      });
    }

    const existingProject = existingProjects?.[0];

    if (existingProject) {
      const { data: updatedProject, error: updateError } = await supabase
        .from("projects")
        .update({
          env_variables,
          framework,
          status: "queued",
          logs: "",
          deployed_url: "",
          total_deployments: existingProject.total_deployments + 1,
        })
        .eq("id", existingProject.id)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: updateError.message,
        });
      }

      await redis.lpush("build-queue", JSON.stringify(updatedProject));

      return res.json({
        success: true,
        message: "Project re-queued for redeploy",
        project: updatedProject,
      });
    }

    // Handle new project creation
    const { data: newProject, error } = await supabase
      .from("projects")
      .insert({
        repo_url,
        project_name,
        framework,
        env_variables,
        user_id,
        status: "queued",
        deployed_url: "",
        total_deployments: 1,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    } else {
      console.log("New :", newProject);
    }

    await redis.lpush("build-queue", JSON.stringify(newProject));

    return res.json({
      success: true,
      message: "New project queued",
      project: newProject,
    });
  } catch (error) {
    console.error("CreateProject error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
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

export const triggerCreateProject = async (req: Request, res: Response) => {
  try {
    const userName = req.body?.repository.owner.name;
    const repoUrl = req.body?.repository.clone_url;

    const { data: userData, error: errorUserData } = await supabase
      .from("users")
      .select("*")
      .eq("name", userName)
      .single();

    if (errorUserData) {
      return res.status(500).json({ error: errorUserData });
    } 

    console.log("% :", userData.id, repoUrl);

    const { data: projectData, error: errorProjectData } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userData.id)
      .eq("repo_url", repoUrl)
      .single();

    if (errorProjectData) {
      return res.status(500).json({ error: errorUserData });
    } else {
      console.log("Project:", projectData);
    }

    console.log(projectData);

    return res
      .status(200)
      .json({ success: true, message: "Webhook Triggered Successfully..." });
  } catch (err) {
    console.error("Error in Trigger Webhook :", err);
    return res.status(400).json({ error: err });
  }
};
