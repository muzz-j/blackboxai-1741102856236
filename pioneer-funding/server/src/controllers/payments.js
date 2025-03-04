import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getFirestore();
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const createPaymentIntent = async (req, res) => {
  try {
    const { uid } = req.user;
    const { amount, challengeId } = req.body;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        userId: uid,
        challengeId
      }
    });

    // Record the payment attempt
    await db.collection('transactions').add({
      userId: uid,
      challengeId,
      amount,
      paymentIntentId: paymentIntent.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Create Payment Intent Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const { userId, challengeId } = paymentIntent.metadata;

        // Update transaction status
        const transactionQuery = await db.collection('transactions')
          .where('paymentIntentId', '==', paymentIntent.id)
          .limit(1)
          .get();

        if (!transactionQuery.empty) {
          const transactionRef = transactionQuery.docs[0].ref;
          await transactionRef.update({
            status: 'completed',
            updatedAt: new Date().toISOString()
          });
        }

        // Update challenge status if this was a challenge purchase
        if (challengeId) {
          const challengeRef = db.collection('challenges').doc(challengeId);
          await challengeRef.update({
            status: 'active',
            paymentStatus: 'paid',
            updatedAt: new Date().toISOString()
          });

          // Update user's challenges array
          const userRef = db.collection('users').doc(userId);
          await userRef.update({
            challenges: [...(await userRef.get()).data().challenges, challengeId]
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const { challengeId } = paymentIntent.metadata;

        // Update transaction status
        const transactionQuery = await db.collection('transactions')
          .where('paymentIntentId', '==', paymentIntent.id)
          .limit(1)
          .get();

        if (!transactionQuery.empty) {
          const transactionRef = transactionQuery.docs[0].ref;
          await transactionRef.update({
            status: 'failed',
            updatedAt: new Date().toISOString()
          });
        }

        // Update challenge status if this was a challenge purchase
        if (challengeId) {
          const challengeRef = db.collection('challenges').doc(challengeId);
          await challengeRef.update({
            status: 'payment_failed',
            paymentStatus: 'failed',
            updatedAt: new Date().toISOString()
          });
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getTransactionHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 10, page = 1 } = req.query;

    // Get transactions for user with pagination
    const transactionsRef = db.collection('transactions')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit));

    const snapshot = await transactionsRef.get();

    const transactions = [];
    snapshot.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Get total count for pagination
    const totalQuery = await db.collection('transactions')
      .where('userId', '==', uid)
      .count()
      .get();

    res.status(200).json({
      transactions,
      pagination: {
        total: totalQuery.data().count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalQuery.data().count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Transaction History Error:', error);
    res.status(500).json({ message: error.message });
  }
};
