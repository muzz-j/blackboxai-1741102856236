import express from 'express';
import { 
    getAllChallenges, 
    getChallengeById, 
    purchaseChallenge, 
    getUserChallenges,
    updateChallengeStatus 
} from '../controllers/challenges.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllChallenges);
router.get('/:id', getChallengeById);

// Protected routes
router.get('/user/challenges', verifyToken, getUserChallenges);
router.post('/purchase', verifyToken, purchaseChallenge);
router.put('/:id/status', verifyToken, isAdmin, updateChallengeStatus);

export default router;
