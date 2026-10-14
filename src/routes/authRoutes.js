import express from 'express'

import { login, register } from '../controllers/authController.js'
import { validate } from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../validators/authValidator.js';

const route = express.Router();

route.post('/register',validate(registerSchema), register)
route.post('/login',validate(loginSchema), login)

export default route