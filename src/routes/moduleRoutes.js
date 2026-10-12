import express from 'express';
import { createModule, getModules , getModulesByCourse, updateModule } from '../controllers/moduleController.js';
import { getResourcesByModule } from '../controllers/resourceController.js';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';

const router = express.Router();

router.get('/', getModules);
router.get('/:id/resources', getResourcesByModule);
router.post('/:id/',auth , authorize('admin' ,'trainer'),createModule)
router.put('/:id/:moduleId',auth , authorize('admin' ,'trainer'),updateModule)

export default router;