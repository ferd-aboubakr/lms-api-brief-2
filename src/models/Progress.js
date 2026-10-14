import mongoose from 'mongoose';



const progressSchema = new mongoose.Schema(
  {
    // Link to the enrollment (which links learner + course)
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      unique: true, // Each enrollment has ONE progress document
    },

    // Array of Resource IDs that the learner has completed
    // Example: ['resourceId1', 'resourceId2', 'resourceId3']
    completedResources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
      },
    ],

    // Array of Module IDs that the learner has fully completed
    // A module is "completed" when all its resources are completed
    completedModules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
      },
    ],

    // The module the learner is currently working on
    // This is the first module that is NOT yet completed
    currentModule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
    },

    // Overall progress percentage (0-100)
    // Calculated as: (completedModules.length / totalModules) * 100
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // Date when the learner started the course
    startedAt: {
      type: Date,
      default: Date.now,
    },

    // Date when the learner last accessed any resource
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * INDEX
 * Makes queries by enrollment very fast
 */
progressSchema.index({ enrollment: 1 });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;
