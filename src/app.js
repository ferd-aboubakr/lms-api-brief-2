import 'dotenv/config'
import connectDB from "./config/db.js";
import express from 'express'
import multer from 'multer';

import courseRoutes from './routes/courseRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import authRoute from './routes/authRoutes.js'
import enrollmentRoutes from './routes/enrollmentRoutes.js'
import progressRoutes from './routes/progressRoutes.js'

import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
const app = express()
app.use(express.json())

app.use('/api/courses', courseRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/auth', authRoute);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/progress', progressRoutes);

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            message: 'File upload error',
            error: err.message
        })
    }
    if (err.message === 'Only PDF and MP4 files are allowed') {
        return res.status(400).json({
            message: err.message
        })
    }

    next(err)
})

app.use(notFound);
app.use(errorHandler);
connectDB();

app.listen(process.env.PORT, () => {
    console.log(`
        http://localhost:${process.env.PORT}`)
})
