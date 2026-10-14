import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';

/**
 * ENROLL IN A COURSE
 * Endpoint: POST /api/enrollments
 * Access: Private (learner)
 * Body: { courseId }
 *
 * Rules:
 * - Only published courses
 * - 409 if already actively enrolled
 * - Re-activates or creates new enrollment if previously cancelled
 * - Creates/links Progress document
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

    // 1. Verify course exists and is published
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

    // 2. Check for an already active enrollment
    const activeEnrollment = await Enrollment.findOne({
      learner: learnerId,
      course: courseId,
      status: 'active'
    });

    if (activeEnrollment) {
      return res.status(409).json({
        message: 'You are already enrolled in this course'
      });
    }

    // 3. Create active enrollment
    const enrollment = await Enrollment.create({
      learner: learnerId,
      course: courseId,
      status: 'active',
      enrolledAt: new Date()
    });

    // 4. Ensure progress tracking document exists for this learner & course
    let progress = await Progress.findOne({
      learner: learnerId,
      course: courseId
    });

    if (!progress) {
      progress = await Progress.create({
        learner: learnerId,
        course: courseId,
        enrollment: enrollment._id,
        completedResources: [],
        completedModules: [],
        progressPercentage: 0
      });
    } else {
      progress.enrollment = enrollment._id;
      await progress.save();
    }

    await enrollment.populate('course', 'title description level category duration');

    return res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment,
      progress: {
        progressPercentage: progress.progressPercentage,
        completedModules: progress.completedModules.length,
        completedResources: progress.completedResources.length
      }
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

    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enr) => {
        const progress = await Progress.findOne({
          learner: learnerId,
          course: enr.course?._id || enr.course
        });

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