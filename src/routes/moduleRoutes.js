import express from 'express';
import { createModule, getModules , getModulesByCourse, updateModule } from '../controllers/moduleController.js';
import { getResourcesByModule } from '../controllers/resourceController.js';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { completeModule } from '../controllers/progressController.js';

const router = express.Router();

router.get('/', getModules);
router.get('/:id/modules' ,getModulesByCourse);
router.post('/:id/',auth , authorize('admin' ,'trainer'),createModule)
router.put('/:id/:moduleId',auth , authorize('admin' ,'trainer'),updateModule)

// POST /api/modules/:id/complete 
router.post(
  '/:id/complete',
  auth,
  authorize('learner'),
  completeModule
);

export default router;