import express from 'express';
import { createResource, getResources ,getResourcesByModule } from '../controllers/resourceController.js';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';

const router = express.Router();

router.get('/', getResources);
router.get('/:id/resources', getResourcesByModule);
router.post('/:id/',auth , authorize('admin' , 'trainer') ,createResource)

export default router;