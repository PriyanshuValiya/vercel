import express from 'express';
import {
  getRepos,
  createProject,
  deleteProject,
} from '../controllers/projectController';

const router = express.Router();

router.get('/repos', getRepos);
router.post('/project', createProject);
router.delete('/project/:id', deleteProject);

export default router;
