import express from "express";
import {
  getRepos,
  createProject,
  deleteProject,
  getProjects,
} from "../controllers/projectController";

const router = express.Router();

router.get("/repos", getRepos);
router.post("/project", createProject);
router.delete("/project/:id", deleteProject);

router.get("/project", getProjects);

export default router;
