import express from 'express';
import { createResource, getResources ,getResourcesByModule , updateResource } from '../controllers/resourceController.js';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import upload from '../middlewares/upload.js';
import { markResourceComplete } from '../controllers/progressController.js';
import { validate } from '../middlewares/validate.js';
import { createResourceSchema, updateResourceSchema } from '../validators/resourceValidator.js';

const router = express.Router();

router.get('/', getResources);
router.get('/:id/resources', getResourcesByModule);
router.post('/:id/',auth , authorize('admin' , 'trainer'),validate(createResourceSchema), upload.single('file') ,createResource)
router.put('/:id/:resourceId',auth , authorize('admin' , 'trainer'),validate(updateResourceSchema) , upload.single('file') , updateResource)

// POST /api/resources/:id/complete 
router.post('/:id/complete', auth, authorize('learner'), markResourceComplete);

export default router;