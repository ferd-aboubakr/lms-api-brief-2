import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';

/**
 * ENROLL IN A COURSE
 * Endpoint: POST /api/enrollments
 * Access: Private (learner)
 * Body: { courseId }
 */
export async function enrollCourse(req, res, next) {
  try {
    const { courseId } = req.body;
    const learnerId = req.user.id;

    if (!courseId) {
      return res.status(400).json({
        message: 'courseId is required'
      });
    }

    // 1. Verify that course exists and is published
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        message: 'Course not found'
      });
    }

    if (course.status !== 'published') {
      return res.status(400).json({
        message: 'Cannot enroll in an unpublished course'
      });
    }

    // 2. Check if learner is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      learner: learnerId,
      course: courseId
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === 'active') {
        return res.status(409).json({
          message: 'You are already enrolled in this course'
        });
      }
      // If previously cancelled, re-activate enrollment
      existingEnrollment.status = 'active';
      existingEnrollment.enrolledAt = new Date();
      await existingEnrollment.save();

      // Ensure progress exists
      let progress = await Progress.findOne({ enrollment: existingEnrollment._id });
      if (!progress) {
        progress = await Progress.create({
          enrollment: existingEnrollment._id,
          completedResources: [],
          completedModules: [],
          progressPercentage: 0
        });
      }

      await existingEnrollment.populate('course', 'title description level category');

      return res.status(200).json({
        message: 'Successfully re-enrolled in course',
        enrollment: existingEnrollment,
        progress: {
          progressPercentage: progress.progressPercentage,
          completedModules: progress.completedModules.length
        }
      });
    }

    // 3. Create new enrollment
    const enrollment = await Enrollment.create({
      learner: learnerId,
      course: courseId,
      status: 'active',
      enrolledAt: new Date()
    });

    // 4. Initialize progress tracking document for this enrollment
    let progress;
    try {
      progress = await Progress.create({
        enrollment: enrollment._id,
        completedResources: [],
        completedModules: [],
        progressPercentage: 0
      });
    } catch (progressError) {
      console.error('Error initializing progress:', progressError);
    }

    await enrollment.populate('course', 'title description level category');

    return res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment,
      progress: progress
        ? {
            progressPercentage: progress.progressPercentage,
            completedModules: progress.completedModules.length
          }
        : null
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You are already enrolled in this course'
      });
    }
    next(error);
  }
}

/**
 * LIST MY ENROLLMENTS
 * Endpoint: GET /api/enrollments
 * Access: Private (learner)
 */
export async function listEnrollments(req, res, next) {
  try {
    const learnerId = req.user.id;
    const { status } = req.query;

    const filter = { learner: learnerId };
    if (status) {
      filter.status = status;
    }

    const enrollments = await Enrollment.find(filter)
      .populate('course', 'title description level category duration status')
      .sort({ createdAt: -1 });

    // Attach progress info to each enrollment if available
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enr) => {
        const progress = await Progress.findOne({ enrollment: enr._id });
        return {
          _id: enr._id,
          learner: enr.learner,
          course: enr.course,
          status: enr.status,
          enrolledAt: enr.enrolledAt,
          completedAt: enr.completedAt,
          createdAt: enr.createdAt,
          updatedAt: enr.updatedAt,
          progress: progress
            ? {
                progressPercentage: progress.progressPercentage,
                completedModulesCount: progress.completedModules.length,
                completedResourcesCount: progress.completedResources.length,
                lastAccessedAt: progress.lastAccessedAt
              }
            : null
        };
      })
    );

    return res.status(200).json(enrollmentsWithProgress);
  } catch (error) {
    next(error);
  }
}

/**
 * CANCEL ENROLLMENT
 * Endpoint: DELETE /api/enrollments/:id
 * Access: Private (learner)
 */
export async function cancelEnrollment(req, res, next) {
  try {
    const { id } = req.params;
    const learnerId = req.user.id;

    const enrollment = await Enrollment.findOne({
      _id: id,
      learner: learnerId
    });

    if (!enrollment) {
      return res.status(404).json({
        message: 'Enrollment not found'
      });
    }

    if (enrollment.status === 'cancelled') {
      return res.status(400).json({
        message: 'Enrollment is already cancelled'
      });
    }

    enrollment.status = 'cancelled';
    await enrollment.save();

    return res.status(200).json({
      message: 'Enrollment cancelled successfully',
      enrollment
    });
  } catch (error) {
    next(error);
  }
}