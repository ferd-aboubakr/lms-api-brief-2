import Course from '../models/Course.js';

export async function getCourses(req, res, next) {
  try {
    const { search, level, category, sort } = req.query;

    const filter = {
      status: 'published'
    };

    if (search) {
      filter.title = {
        $regex: search,
        $options: 'i'
      };
    }

    if (level) {
      filter.level = level;
    }

    if (category) {
      filter.category = category;
    }

    let sortOption = {};

    if (sort === 'createdAt') {
      sortOption.createdAt = -1;
    }

    if (sort === 'publishedAt') {
      sortOption.publishedAt = -1;
    }

    const courses = await Course.find(filter).sort(sortOption);

    res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
}

export async function getCourseById(req, res, next) {
  try {
    const { id } = req.params;

    const course = await Course.findOne({
      _id: id,
      status: 'published'
    });

    if (!course) {
      return res.status(404).json({
        message: 'Course not found'
      });
    }

    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req, res, next) {
  try {
    const { title, description, objectives, level, category, duration, status }
      = req.body

    const course = await Course.create({
      title, description, objectives, level, category, duration, status,
      trainer: req.user.id
    })

    res.status(201).json({
      message: 'Course created successfully',
      course
    })
  } catch (err) {
    next(err)
  }

}

export async function updateCourse(req, res, next) {
  try {
    const { id } = req.params
    const updateData = req.body

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        message: 'not found'
      })
    }

    const isOwner = course.trainer.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Accès refusé : vous ne pouvez modifier que vos propres cours"
      });
    }

    // console.log(updateData);

    const updateCourse = await Course.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    // console.log(updateCourse)

    res.status(200).json({
      message: "Course updated successfully",
      updateCourse
    })
  } catch (err) {
    next(err)
  }
}

export async function publishCourse(req, res, next) {
  try {
    const { id } = req.params

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ message: 'course not found' })
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = req.user.id.toString() === course.trainer.toString()

    if (!isAdmin || !isOwner) {
      return res.status(403).json({
        message: "Accès refusé : vous ne pouvez modifier que vos propres cours"
      });
    }

    if (course.status === 'archived') {
      return res.status(400).json({
        message: 'An archived course cannot be published'
      });
    }
    course.status = 'published'
    course.publishedAt = new Date()

    await Course.save()

    res.status(200).json({
      message: 'Course published successfully',
      course
    });
  } catch (error) {
    next(error);
  }

}

export async function unpublishCourse(req, res, next) {
  try {
    const { id } = req.params

    const course = await Course.findById(id)

    if (!course) {
      return res.status(404).json({
        message: "not found "
      })
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = req.user.id.toString() === course.trainer.toString()

    if (!isAdmin || !isOwner) {
      return res.status(403).json({
        message: "Accès refusé : vous ne pouvez modifier que vos propres cours"
      });
    }
    if (course.status === 'archived') {
      return res.status(400).json({
        message: 'An archived course cannot be unpublished'
      });
    }

    course.status = 'draft';
    course.publishedAt = new Date()

    await Course.save()

    res.status(200).json({
      message: 'Course unpublished  successfully',
      course
    });
  } catch (error) {
    next(error);
  }
}


export async function archiveCourse(req, res, next) {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        message: 'Course not found'
      });
    }

    const isOwner =
      course.trainer.toString() === req.user.id.toString();

    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    course.status = 'archived';

    await course.save();

    res.status(200).json({
      message: 'Course archived successfully',
      course
    });
  } catch (error) {
    next(error);
  }
}
