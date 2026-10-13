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
    const { title, type, description, order } = req.body
    const url = req.file ? `/uploads/${new Date + '-' + req.file.filename}` : null;

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

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Access denied'
      })
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'A file is required'
      });
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

export async function updateResource(req, res, next) {
  try {
    console.log(req.body)
    const { id, resourceId } = req.params
    const { title, type, description, order } = req.body
    const url = req.file ? `/uploads/${new Date + '-' + req.file.filename}` : null;

    let data = { title, type, description, order }

    const resource = await Resource.findById(resourceId)

    if (!resource) {
      return res.status(404).json({
        message: 'module not found'
      })
    }

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

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Access denied'
      })
    }

    if (url) {
      data.url = url
    }

    const updateResource = await Resource.findByIdAndUpdate(
      resourceId,
      {set: data},
      {new: true , runValidators:true}
    )

    res.status(200).json({
      message: 'resource updated successfull',
      updateResource
    })

  } catch (err) {
    next(err)
  }

}