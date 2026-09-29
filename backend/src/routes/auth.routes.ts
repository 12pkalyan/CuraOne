import { Router } from 'express';
import { login, register, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const authRouter = Router();

// Public: Patient self-registration
authRouter.post('/register', register);

// Public: unified login for all 4 roles
authRouter.post('/login', login);

// Protected: fetch current logged-in user profile
authRouter.get('/me', authenticate, getMe);
