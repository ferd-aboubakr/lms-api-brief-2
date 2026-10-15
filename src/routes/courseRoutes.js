import express from "express"

import { archiveCourse, createCourse, getCourseById, getCourses, publishCourse, unpublishCourse, updateCourse } from "../controllers/courseController.js"
import { getModulesByCourse } from "../controllers/moduleController.js";
import { auth } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { getCourseProgress } from "../controllers/progressController.js";

const router = express.Router();

router.get('/' , getCourses);

// GET /api/courses/:id/progress (Global progress)
router.get('/:id/progress', auth, authorize('learner'), getCourseProgress);

router.get('/:id' , getCourseById);
router.post('/', auth , authorize('admin' ,'trainer') ,createCourse);
router.put('/:id', auth , authorize('admin' ,'trainer') ,updateCourse);
router.patch('/:id/publish', auth , authorize('admin' ,'trainer') ,publishCourse);
router.patch('/:id/unpublish', auth, authorize('admin', 'trainer'), unpublishCourse);
router.patch('/:id/archive', auth, authorize('admin', 'trainer'), archiveCourse);



export default router
