import express from 'express';
import { createModule, getModules , getModulesByCourse, updateModule } from '../controllers/moduleController.js';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { completeModule } from '../controllers/progressController.js';
import { validate } from '../middlewares/validate.js';
import { createModuleSchema, updateModuleSchema } from '../validators/moduleValidator.js';

const router = express.Router();

router.get('/', getModules);
router.get('/:id/modules' ,getModulesByCourse);
router.post('/:id/',auth , authorize('admin' ,'trainer'), validate(createModuleSchema),createModule)
router.put('/:id/:moduleId',auth , authorize('admin' ,'trainer'),validate(updateModuleSchema),updateModule)

// POST /api/modules/:id/complete 
router.post(
  '/:id/complete',
  auth,
  authorize('learner'),
  completeModule
);

export default router;