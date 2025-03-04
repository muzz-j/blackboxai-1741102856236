import express from 'express';
import { 
    createPaymentIntent,
    handleWebhook,
    getTransactionHistory
} from '../controllers/payments.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Stripe webhook
router.post('/webhook', express.raw({type: 'application/json'}), handleWebhook);

// Protected routes
router.post('/create-payment-intent', verifyToken, createPaymentIntent);
router.get('/transactions', verifyToken, getTransactionHistory);

export default router;
