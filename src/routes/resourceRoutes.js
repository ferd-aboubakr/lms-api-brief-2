import express from 'express';
import { createResource, getResources ,getResourcesByModule , updateResource } from '../controllers/resourceController.js';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.get('/', getResources);
router.get('/:id/resources', getResourcesByModule);
router.post('/:id/',auth , authorize('admin' , 'trainer'), upload.single('file') ,createResource)
router.put('/:id/:resourceId',auth , authorize('admin' , 'trainer'), upload.single('file') , updateResource)

export default router;