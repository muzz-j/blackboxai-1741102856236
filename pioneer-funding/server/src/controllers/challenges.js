import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const challengeTypes = {
  standard: {
    name: 'Standard Challenge',
    description: 'Perfect for day traders following strict risk management',
    accounts: {
      1000: 49,
      5000: 99,
      10000: 199,
      25000: 299,
      50000: 499,
      100000: 999
    },
    rules: {
      profitTarget: 8,
      maxDailyDrawdown: 5,
      maxOverallDrawdown: 10,
      phase1Duration: 30,
      phase2Duration: 60
    }
  },
  swing: {
    name: 'Swing Challenge',
    description: 'Ideal for swing traders, overnight holding allowed',
    accounts: {
      1000: 59,
      5000: 119,
      10000: 229,
      25000: 349,
      50000: 579,
      100000: 999
    },
    rules: {
      profitTarget: 8,
      maxDailyDrawdown: 5,
      maxOverallDrawdown: 10,
      phase1Duration: 30,
      phase2Duration: 60,
      overnightHolding: true
    }
  },
  news: {
    name: 'News Allowed Challenge',
    description: 'For high-volatility traders, no restrictions on news trading',
    accounts: {
      1000: 69,
      5000: 139,
      10000: 249,
      25000: 399,
      50000: 649,
      100000: 1099
    },
    rules: {
      profitTarget: 10,
      maxDailyDrawdown: 5,
      maxOverallDrawdown: 10,
      phase1Duration: 30,
      phase2Duration: 60,
      newsTrading: true
    }
  }
};

export const getAllChallenges = async (req, res) => {
  try {
    res.status(200).json(challengeTypes);
  } catch (error) {
    console.error('Get Challenges Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;
    const challengeRef = await db.collection('challenges').doc(id).get();
    
    if (!challengeRef.exists) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    res.status(200).json(challengeRef.data());
  } catch (error) {
    console.error('Get Challenge Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserChallenges = async (req, res) => {
  try {
    const { uid } = req.user;
    const challengesRef = db.collection('challenges').where('userId', '==', uid);
    const snapshot = await challengesRef.get();

    const challenges = [];
    snapshot.forEach(doc => {
      challenges.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json(challenges);
  } catch (error) {
    console.error('Get User Challenges Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const purchaseChallenge = async (req, res) => {
  try {
    const { uid } = req.user;
    const { type, accountSize } = req.body;

    // Validate challenge type and account size
    if (!challengeTypes[type] || !challengeTypes[type].accounts[accountSize]) {
      return res.status(400).json({ message: 'Invalid challenge type or account size' });
    }

    const amount = challengeTypes[type].accounts[accountSize];

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        userId: uid,
        challengeType: type,
        accountSize: accountSize
      }
    });

    // Create challenge in Firestore
    const challengeRef = await db.collection('challenges').add({
      userId: uid,
      type,
      accountSize,
      amount,
      status: 'pending',
      paymentIntentId: paymentIntent.id,
      rules: challengeTypes[type].rules,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phase: 1,
      metrics: {
        currentDrawdown: 0,
        maxDailyDrawdown: 0,
        totalProfit: 0,
        tradingDays: 0
      }
    });

    res.status(201).json({
      challengeId: challengeRef.id,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Purchase Challenge Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateChallengeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, metrics } = req.body;

    const challengeRef = db.collection('challenges').doc(id);
    const challenge = await challengeRef.get();

    if (!challenge.exists) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    await challengeRef.update({
      status,
      metrics: metrics || challenge.data().metrics,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Challenge updated successfully' });
  } catch (error) {
    console.error('Update Challenge Status Error:', error);
    res.status(500).json({ message: error.message });
  }
};
