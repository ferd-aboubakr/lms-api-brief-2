import express from 'express';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import {
  enrollCourse,
  listEnrollments,
  cancelEnrollment,
  getEnrollmentById
} from '../controllers/enrollmentController.js'

/**
 * ENROLLMENT ROUTES
 *
 * Handled endpoints:
 * - POST   /api/enrollments     - Enroll in a course (Learner only)
 * - GET    /api/enrollments     - List current learner's enrollments
 * - DELETE /api/enrollments/:id - Cancel an enrollment
 */

const router = express.Router();

// POST /api/enrollments - Enroll in a course
router.post(
  '/',
  auth,
  authorize('learner'),
  enrollCourse
);

// GET /api/enrollments - List my enrollments
router.get(
  '/',
  auth,
  authorize('learner'),
  listEnrollments
);

router.get('/:id', auth, authorize('learner'), getEnrollmentById);

// DELETE /api/enrollments/:id - Cancel enrollment
router.delete(
  '/:id',
  auth,
  authorize('learner'),
  cancelEnrollment
);

export default router;