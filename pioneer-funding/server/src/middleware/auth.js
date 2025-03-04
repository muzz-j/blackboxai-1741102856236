import { getAuth } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify Firebase token
    const decodedFirebaseToken = await getAuth().verifyIdToken(decoded.firebaseToken);
    
    req.user = {
      uid: decodedFirebaseToken.uid,
      email: decodedFirebaseToken.email,
    };
    
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    const user = await getAuth().getUser(req.user.uid);
    const customClaims = user.customClaims || {};
    
    if (!customClaims.admin) {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    
    next();
  } catch (error) {
    console.error('Admin Check Error:', error);
    res.status(500).json({ message: 'Error checking admin status' });
  }
};
