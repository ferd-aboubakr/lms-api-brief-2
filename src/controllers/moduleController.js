import Module from '../models/Module.js';
import Course from '../models/Course.js';

export async function getModules(req, res, next) {
  try {
    const modules = await Module.find();

    res.status(200).json(modules);
  } catch (error) {
    next(error);
  }
}

export async function getModulesByCourse(req, res, next) {
  try {
    const { id } = req.params;

    const modules = await Module.find({
      course: id,
      status: 'published'
    }).sort({ order: 1 });

    res.status(200).json(modules);
  } catch (error) {
    next(error);
  }
}

export async function createModule(req, res, next) {
  try {
    const { title, description, order, duration } = req.body
    const { id } = req.params

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        message: 'course not found'
      })
    }
    // console.log(course)
    const isOwner = req.user.id.toString() === course.trainer.toString();
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Accès refusé"
      })
    }
    const module = await Module.create({
      title, description, order, duration,
      course: id
    })

    res.json({
      message: 'module created successfully',
      module
    })
  } catch (err) {
    next(err)
  }

}

export async function updateModule(req, res, next) {
  try {
    const { title, description, order, duration } = req.body
    const { id, moduleId } = req.params

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        message: 'course not found'
      })
    }
    const module = await Module.findOne({
      _id: moduleId, course: id
    });
    if (!module) {
      return res.status(404).json({
        message: 'Module not found in this course'
      })
    }

    const isOwner = req.user.id.toString() === course.trainer.toString();
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Accès refusé"
      })
    }

    const updateModule = await Module.findByIdAndUpdate(
      moduleId,
      { $set: { title, description, order, duration  } },
      { new: true, runValidators: true }
    )

    res.status(200).json({
      message: 'module updated successfully',
      updateModule
    })
  } catch (err) {
    next(err)
  }
}

