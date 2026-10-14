import Progress from '../models/Progress.js';
import Enrollment from '../models/Enrollment.js';
import Resource from '../models/Resource.js';
import Module from '../models/Module.js';

/**
 * START OR RESUME COURSE
 * Route: POST /api/progress/courses/:id/resume (or /start)
 */
export async function startOrResumeCourse(req, res, next) {
  try {
    const courseId = req.params.id;
    const learnerId = req.user.id;

    // 1. Must be actively enrolled
    const enrollment = await Enrollment.findOne({
      learner: learnerId,
      course: courseId,
      status: 'active',
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You are not actively enrolled in this course',
      });
    }

    // 2. Find first module by order
    const firstModule = await Module.findOne({ course: courseId }).sort({ order: 1 });

    // 3. Find or create progress
    let progress = await Progress.findOne({ learner: learnerId, course: courseId });

    if (!progress) {
      progress = await Progress.create({
        learner: learnerId,
        course: courseId,
        enrollment: enrollment._id,
        completedResources: [],
        completedModules: [],
        currentModule: firstModule ? firstModule._id : null,
        progressPercentage: 0,
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      });
    } else {
      progress.lastAccessedAt = new Date();
      if (!progress.currentModule && firstModule) {
        progress.currentModule = firstModule._id;
      }
      await progress.save();
    }

    await progress.populate([
      { path: 'currentModule', select: 'title order duration' },
      { path: 'lastAccessedResource', select: 'title type url order' },
    ]);

    return res.status(200).json({
      message: progress.completedResources.length === 0 ? 'Course started' : 'Course resumed',
      progress,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * MARK RESOURCE COMPLETE (Idempotent)
 * Route: POST /api/resources/:id/complete
 */
export async function markResourceComplete(req, res, next) {
  try {
    const resourceId = req.params.id;
    const learnerId = req.user.id;

    // 1. Find resource & populated module
    const resource = await Resource.findById(resourceId).populate('module');
    if (!resource || !resource.module) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const moduleId = resource.module._id;
    const courseId = resource.module.course;

    // 2. Check active enrollment
    const enrollment = await Enrollment.findOne({
      learner: learnerId,
      course: courseId,
      status: 'active',
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You are not actively enrolled in this course',
      });
    }

    // 3. Find or initialize progress
    let progress = await Progress.findOne({ learner: learnerId, course: courseId });
    if (!progress) {
      progress = await Progress.create({
        learner: learnerId,
        course: courseId,
        enrollment: enrollment._id,
        completedResources: [],
        completedModules: [],
        progressPercentage: 0,
      });
    }

    // 4. Update last accessed pointers
    progress.lastAccessedResource = resource._id;
    progress.currentModule = moduleId;
    progress.lastAccessedAt = new Date();

    // 5. Idempotent resource completion check
    const isAlreadyCompleted = progress.completedResources.some(
      (rId) => rId.toString() === resourceId.toString()
    );

    if (isAlreadyCompleted) {
      await progress.save();
      return res.status(200).json({
        message: 'Resource already completed',
        progress: {
          completedResourcesCount: progress.completedResources.length,
          currentModule: progress.currentModule,
          lastAccessedResource: progress.lastAccessedResource,
        },
      });
    }

    // Push resource ID (idempotent)
    progress.completedResources.push(resource._id);
    await progress.save();

    return res.status(200).json({
      message: 'Resource marked as completed',
      progress: {
        completedResourcesCount: progress.completedResources.length,
        currentModule: progress.currentModule,
        lastAccessedResource: progress.lastAccessedResource,
      },
    });
  } catch (error) {
    next(error);
  }
}