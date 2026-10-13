import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Resource from '../models/Resource.js';

export async function getResources(req, res, next) {
  try {
    const resources = await Resource.find();

    res.status(200).json(resources);
  } catch (error) {
    next(error);
  }
}


export async function getResourcesByModule(req, res, next) {
  try {
    const { moduleId } = req.params;

    if (!moduleId) {
      return res.status(404).json({
        message: "module not found"
      })
    }

    const ressources = await Resource.find({
      module: moduleId
    }).sort({ order: 1 })

    res.status(200).json(ressources);

  } catch (error) {
    next(error)
  }
}

export async function createResource(req, res, next) {
  try {
    const { id } = req.params
    const { title, type, url, description, order } = req.body

    const module = await Module.findById(id)

    if (!module) {
      return res.status(404).json({
        message: 'module not found'
      })
    }

    const course = await Course.findById(module.course)

    if (!course) {
      return res.status(404).json({
        message: 'course not found'
      })
    }

    const isOwner = req.user.id.toString() === course.trainer.toString()
    const isAdmin = req.user.role === 'admin'
    
    if(!isOwner && !isAdmin){
      return res.status(403).json({
        message : 'Access denied'
      })
    }

    const resource = await Resource.create({
      title, type, url, description, order,
      module: id
    })

    res.status(201).json({
      message: 'resource created successfully',
      resource
    })
  } catch (err) {
    next(err)
  }

}