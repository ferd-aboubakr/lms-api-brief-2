import mongoose from 'mongoose';

/**
 * ENROLLMENT MODEL
 * 
 * Links a learner to a course.
 * Rules:
 * - learner: ref to User (learner role)
 * - course: ref to Course
 * - status: 'active' | 'completed' | 'cancelled' (default: 'active')
 * - enrolledAt: Date (default: Date.now)
 * - completedAt: Date
 * - Unique compound index on { learner, course } to prevent duplicate enrollments
 */

const enrollmentSchema = new mongoose.Schema(
  {
    learner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: learner cannot enroll in the same course multiple times
enrollmentSchema.index({ learner: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
