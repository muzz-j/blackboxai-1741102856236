import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const db = getFirestore();

export const getUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    delete userData.password; // Ensure password is not sent

    res.status(200).json(userData);
  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const { firstName, lastName, phone, timezone, ...updates } = req.body;

    // Update Firestore profile
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      ...updates,
      firstName,
      lastName,
      phone,
      timezone,
      updatedAt: new Date().toISOString()
    });

    // Update Firebase Auth display name if provided
    if (firstName || lastName) {
      await getAuth().updateUser(uid, {
        displayName: `${firstName} ${lastName}`
      });
    }

    const updatedProfile = await userRef.get();
    res.status(200).json(updatedProfile.data());
  } catch (error) {
    console.error('Update User Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const { uid } = req.user;

    // Get user's active challenges
    const challengesQuery = await db.collection('challenges')
      .where('userId', '==', uid)
      .where('status', 'in', ['active', 'completed'])
      .get();

    const challenges = [];
    let totalProfit = 0;
    let activeChallenges = 0;
    let completedChallenges = 0;

    challengesQuery.forEach(doc => {
      const challenge = doc.data();
      challenges.push({
        id: doc.id,
        ...challenge
      });

      if (challenge.status === 'active') activeChallenges++;
      if (challenge.status === 'completed') {
        completedChallenges++;
        totalProfit += challenge.metrics?.totalProfit || 0;
      }
    });

    // Get recent transactions
    const transactionsQuery = await db.collection('transactions')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentTransactions = [];
    transactionsQuery.forEach(doc => {
      recentTransactions.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      stats: {
        totalProfit,
        activeChallenges,
        completedChallenges,
        totalChallenges: challenges.length
      },
      challenges,
      recentTransactions
    });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserSettings = async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { settings } = userDoc.data();
    res.status(200).json(settings || {});
  } catch (error) {
    console.error('Get User Settings Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const { uid } = req.user;
    const { settings } = req.body;

    await db.collection('users').doc(uid).update({
      settings,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Update User Settings Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getAdminDashboard = async (req, res) => {
  try {
    // Get total users count
    const usersCount = (await db.collection('users').count().get()).data().count;

    // Get total challenges count
    const challengesCount = (await db.collection('challenges').count().get()).data().count;

    // Get total revenue
    const transactionsQuery = await db.collection('transactions')
      .where('status', '==', 'completed')
      .get();
    
    let totalRevenue = 0;
    transactionsQuery.forEach(doc => {
      totalRevenue += doc.data().amount;
    });

    // Get recent signups
    const recentSignups = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const recentUsers = [];
    recentSignups.forEach(doc => {
      const userData = doc.data();
      delete userData.password;
      recentUsers.push({
        id: doc.id,
        ...userData
      });
    });

    // Get recent challenges
    const recentChallenges = await db.collection('challenges')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const challenges = [];
    recentChallenges.forEach(doc => {
      challenges.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      stats: {
        totalUsers: usersCount,
        totalChallenges: challengesCount,
        totalRevenue
      },
      recentUsers,
      recentChallenges
    });
  } catch (error) {
    console.error('Get Admin Dashboard Error:', error);
    res.status(500).json({ message: error.message });
  }
};
