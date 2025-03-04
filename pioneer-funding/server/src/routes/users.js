import express from 'express';
import { 
    getUserProfile,
    updateUserProfile,
    getDashboardStats,
    getUserSettings,
    updateUserSettings,
    getAdminDashboard
} from '../controllers/users.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.get('/profile', verifyToken, getUserProfile);
router.put('/profile', verifyToken, updateUserProfile);
router.get('/dashboard', verifyToken, getDashboardStats);
router.get('/settings', verifyToken, getUserSettings);
router.put('/settings', verifyToken, updateUserSettings);

// Admin routes
router.get('/admin/dashboard', verifyToken, isAdmin, getAdminDashboard);

export default router;
