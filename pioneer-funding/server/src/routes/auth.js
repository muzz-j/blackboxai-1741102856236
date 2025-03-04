import express from 'express';
import { register, login, verifyEmail, resetPassword, updateProfile } from '../controllers/auth.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/reset-password', resetPassword);

// Protected routes
router.put('/profile', verifyToken, updateProfile);

export default router;
