import express from 'express';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import {
  markResourceComplete,
  getProgressForCourse,
  checkModuleAccess
} from '../controllers/progressController.js';

/**
 * PROGRESS ROUTES:
 * POST /api/progress/resource/:resourceId/complete  - Mark resource complete
 * GET  /api/progress/course/:courseId               - Get progress for a course
 */

const router = express.Router();

// POST /api/progress/resource/:resourceId/complete
// Mark a resource as completed
router.post(
  '/resource/:resourceId/complete',
  auth,
  authorize('learner'),
  markResourceComplete
);

// GET /api/progress/course/:courseId
// Get my progress for a specific course
router.get(
  '/course/:courseId',
  auth,
  authorize('learner'),
  getProgressForCourse
);

// GET /api/progress/module/:moduleId/access
// Check if a module is accessible (LMS-13 sequential locking)
router.get(
  '/module/:moduleId/access',
  auth,
  authorize('learner'),
  checkModuleAccess
);

export default router;
