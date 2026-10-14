 import express from 'express';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { startOrResumeCourse } from '../controllers/progressController.js';

const router = express.Router();

// POST /api/progress/courses/:id/resume 
router.post('/courses/:id/resume', auth, authorize('learner'), startOrResumeCourse);

export default router;