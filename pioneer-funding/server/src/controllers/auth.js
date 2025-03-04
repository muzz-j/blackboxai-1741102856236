import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';

const db = getFirestore();

export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Create user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    // Create user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      firstName,
      lastName,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      challenges: [],
      transactions: []
    });

    // Generate custom token
    const token = jwt.sign(
      { uid: userRecord.uid, firebaseToken: await getAuth().createCustomToken(userRecord.uid) },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
      token
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email } = req.body;

    // Get user by email
    const userRecord = await getAuth().getUserByEmail(email);

    // Get user profile from Firestore
    const userProfile = await db.collection('users').doc(userRecord.uid).get();

    // Generate custom token
    const token = jwt.sign(
      { uid: userRecord.uid, firebaseToken: await getAuth().createCustomToken(userRecord.uid) },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        ...userProfile.data()
      },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(401).json({ message: 'Invalid credentials' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Generate email verification link
    const link = await getAuth().generateEmailVerificationLink(email);
    
    // Here you would typically send this link via email service
    // For now, we'll just return it
    res.status(200).json({ 
      message: 'Verification email sent',
      link 
    });
  } catch (error) {
    console.error('Email Verification Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Generate password reset link
    const link = await getAuth().generatePasswordResetLink(email);
    
    // Here you would typically send this link via email service
    // For now, we'll just return it
    res.status(200).json({ 
      message: 'Password reset email sent',
      link 
    });
  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    const { firstName, lastName, ...updates } = req.body;

    // Update Firebase Auth display name if provided
    if (firstName || lastName) {
      const currentUser = await getAuth().getUser(uid);
      const currentName = currentUser.displayName?.split(' ') || ['', ''];
      await getAuth().updateUser(uid, {
        displayName: `${firstName || currentName[0]} ${lastName || currentName[1]}`
      });
    }

    // Update Firestore profile
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      ...updates,
      firstName: firstName || updates.firstName,
      lastName: lastName || updates.lastName,
      updatedAt: new Date().toISOString()
    });

    const updatedProfile = await userRef.get();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedProfile.data()
    });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ message: error.message });
  }
};
