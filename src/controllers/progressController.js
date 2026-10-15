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
         // === Sequential Lock Guard ===
        const allCourseModules = await Module.find({ course: courseId }).sort({ order: 1 });
        const moduleState = getModuleState(progress, resource.module, allCourseModules);
        if (moduleState === 'locked') {
            return res.status(403).json({
                message: 'Module is locked. You must complete previous modules first.',
                currentModuleOrder: resource.module.order
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

//check status of a module for a learner
// 'completed' | 'locked' | 'in_progress' | 'accessible' 
//
//  *  progress - Learner's progress document {obj} 
//  *  targetModule - The module to check {obj} 
//  *  allCourseModules - All modules of the course sorted by order ascending [array of modules]
//  *  moduleResourceIds - Array of Resource _ids belonging to targetModule [array of resources]

export function getModuleState(progress, targetModule, allCourseModules, moduleResourceIds = []) {
    const targetIdStr = targetModule._id.toString();
    // 1. Check if already completed
    const isCompleted = progress.completedModules.some(
        (mId) => mId.toString() === targetIdStr
    );
    if (isCompleted) {
        return 'completed';
    }
    // 2. Check if any previous module is incomplete (Sequential Locking)
    const previousModules = allCourseModules.filter(
        (m) => m.order < targetModule.order
    );
    const hasIncompletePrevious = previousModules.some(
        (prevMod) =>
            !progress.completedModules.some(
                (compModId) => compModId.toString() === prevMod._id.toString()
            )
    );
    if (hasIncompletePrevious) {
        return 'locked';
    }
    // 3. Module is unlocked: check if in_progress or accessible
    const completedResourcesInThisModule = moduleResourceIds.filter((resId) =>
        progress.completedResources.some((cResId) => cResId.toString() === resId.toString())
    );
    if (completedResourcesInThisModule.length > 0) {
        return 'in_progress';
    }
    return 'accessible';
}


/**
 * COMPLETE A MODULE
 * Route: POST /api/modules/:id/complete
 * Access: Private (learner)
 */
export async function completeModule(req, res, next) {
  try {
    const moduleId = req.params.id;
    const learnerId = req.user.id;

    // 1. Find module
    const targetModule = await Module.findById(moduleId);
    if (!targetModule) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const courseId = targetModule.course;

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

    // 3. Find progress
    let progress = await Progress.findOne({ learner: learnerId, course: courseId });
    if (!progress) {
      return res.status(404).json({ message: 'Progress not found for this course' });
    }

    // 4. Check if module is locked
    const allCourseModules = await Module.find({ course: courseId }).sort({ order: 1 });
    const state = getModuleState(progress, targetModule, allCourseModules);

    if (state === 'locked') {
      return res.status(403).json({
        message: 'Cannot complete module: previous modules are not completed yet',
      });
    }

    // 5. Check if all resources in this module are completed
    const moduleResources = await Resource.find({ module: moduleId });
    const moduleResourceIds = moduleResources.map((r) => r._id.toString());
    const completedResourceIds = progress.completedResources.map((id) => id.toString());

    const allResourcesDone = moduleResourceIds.every((rId) =>
      completedResourceIds.includes(rId)
    );

    if (!allResourcesDone) {
      return res.status(400).json({
        message: 'Cannot complete module: all resources in this module must be completed first',
        totalResources: moduleResourceIds.length,
        completedInModule: moduleResourceIds.filter((rId) => completedResourceIds.includes(rId)).length,
      });
    }

    // 6. Mark module completed (idempotent)
    const isAlreadyCompleted = progress.completedModules.some(
      (mId) => mId.toString() === moduleId.toString()
    );

    if (!isAlreadyCompleted) {
      progress.completedModules.push(targetModule._id);
    }

    // 7. Recalculate course percentage
    progress.progressPercentage = Math.round(
      (progress.completedModules.length / allCourseModules.length) * 100
    );

    // 8. Find and set the next incomplete module
    const nextIncompleteModule = allCourseModules.find(
      (m) =>
        !progress.completedModules.some(
          (cId) => cId.toString() === m._id.toString()
        )
    );
    progress.currentModule = nextIncompleteModule ? nextIncompleteModule._id : targetModule._id;
    progress.lastAccessedAt = new Date();

    // 9. If all modules completed, complete the enrollment
    if (progress.progressPercentage === 100) {
      await Enrollment.findByIdAndUpdate(enrollment._id, {
        status: 'completed',
        completedAt: new Date(),
      });
    }

    await progress.save();

    return res.status(200).json({
      message: 'Module marked as completed successfully',
      progress: {
        progressPercentage: progress.progressPercentage,
        completedModulesCount: progress.completedModules.length,
        currentModule: progress.currentModule,
      },
      courseCompleted: progress.progressPercentage === 100,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET GLOBAL COURSE PROGRESS
 * Route: GET /api/courses/:id/progress
 * Access: Private (learner)
 */
export async function getCourseProgress(req, res, next) {
  try {
    const courseId = req.params.id;
    const learnerId = req.user.id;

    // 1. Verify enrollment
    const enrollment = await Enrollment.findOne({
      learner: learnerId,
      course: courseId,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      return res.status(403).json({
        message: 'You are not enrolled in this course',
      });
    }

    // 2. Find progress document
    let progress = await Progress.findOne({ learner: learnerId, course: courseId });
    if (!progress) {
      return res.status(404).json({
        message: 'No progress record found for this course',
      });
    }

    // 3. Fetch all modules of the course sorted by order
    const allModules = await Module.find({ course: courseId }).sort({ order: 1 });

    // 4. Map modules with their calculated status and resource counts
    let nextAccessibleModule = null;

    const modulesWithState = await Promise.all(
      allModules.map(async (mod) => {
        // Fetch resources belonging to this module
        const moduleResources = await Resource.find({ module: mod._id });
        const moduleResourceIds = moduleResources.map((r) => r._id.toString());

        // Calculate state using getModuleState
        const state = getModuleState(progress, mod, allModules, moduleResourceIds);

        // Track next accessible / in_progress module
        if (!nextAccessibleModule && (state === 'accessible' || state === 'in_progress')) {
          nextAccessibleModule = {
            _id: mod._id,
            title: mod.title,
            order: mod.order,
          };
        }

        // Count how many resources are finished in this module
        const completedInModule = moduleResourceIds.filter((resId) =>
          progress.completedResources.some((cResId) => cResId.toString() === resId)
        ).length;

        return {
          _id: mod._id,
          title: mod.title,
          order: mod.order,
          duration: mod.duration,
          state,
          isLocked: state === 'locked',
          totalResources: moduleResources.length,
          completedResources: completedInModule,
        };
      })
    );

    // 5. Build response payload (ready for React)
    return res.status(200).json({
      courseId,
      progressPercentage: progress.progressPercentage,
      completedModulesCount: progress.completedModules.length,
      totalModulesCount: allModules.length,
      completedResourcesCount: progress.completedResources.length,
      currentModule: progress.currentModule,
      nextAccessibleModule: nextAccessibleModule || null,
      lastAccessedResource: progress.lastAccessedResource,
      lastAccessedAt: progress.lastAccessedAt,
      modules: modulesWithState,
    });
  } catch (error) {
    next(error);
  }
}