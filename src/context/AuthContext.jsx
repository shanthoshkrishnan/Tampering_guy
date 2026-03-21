// context/AuthContext.jsx - UPDATED with MQTT disconnect/reconnect

import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  canCreateRole,
  roleRequiresApproval,
} from '../config/rolesSchema';

import { disconnectMqtt, reconnectMqtt } from '../hooks/useMqttTamper';
import { disconnectLdrMqtt, reconnectLdrMqtt } from '../hooks/useMqttLDR';

// Local demo auth can be enabled only in development via env.
const allowLocalAuth =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_LOCAL_AUTH === 'true';

// Fallback local users for demo (normalized roles)
const localUsers = {
  'admin@lmofficer.com': {
    password: 'admin123',
    role: 'ADMIN',
    userType: 'LM_Officer',
    name: 'LM Officer Admin',
    age: 35,
    address: 'Legal Metrology Department, Sector 12',
    email: 'admin@lmofficer.com',
    phone: '+91 9876543210',
    designation: 'Senior Inspector',
    department: 'Legal Metrology',
    assignedDevices: [],
  },
  'raj.kumar@logistics.com': {
    password: 'user123',
    role: 'USER',
    userType: 'Consumer',
    name: 'Raj Kumar',
    age: 28,
    address: 'Delhi Warehouse A, Sector 63',
    email: 'raj.kumar@logistics.com',
    phone: '+91 9123456789',
    businessType: 'Warehouse Owner',
    assignedDevices: ['WM-001'],
    totalDevices: 1,
  },
};

const defaultAuthContext = {
  currentUser: null,
  loading: true,
  rememberMe: false,
  login: async () => ({
    success: false,
    error: 'Auth provider not ready',
  }),
  logout: async () => {},
  register: async () => ({
    success: false,
    error: 'Auth provider not ready',
  }),
  approveUser: async () => ({
    success: false,
    error: 'Auth provider not ready',
  }),
  rejectUser: async () => ({
    success: false,
    error: 'Auth provider not ready',
  }),
  getPendingUsers: async () => ({
    success: false,
    data: [],
    error: 'Auth provider not ready',
  }),
  resetPassword: async () => ({
    success: false,
    error: 'Auth provider not ready',
  }),
  logAuditAction: async () => {},
  getSavedUsername: () => '',
};

const AuthContext = createContext(defaultAuthContext);

const normalizeRole = (role) =>
  role ? String(role).toUpperCase() : null;

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) return null;
    let parsed = null;
    try {
      parsed = JSON.parse(savedUser);
    } catch (error) {
      console.warn('Invalid cached user JSON. Clearing currentUser.', error);
      localStorage.removeItem('currentUser');
      return null;
    }
    if (!parsed) return null;
    return {
      ...parsed,
      role: normalizeRole(parsed.role),
    };
  });

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });

  const [loading, setLoading] = useState(true);
  const [useFirebase, setUseFirebase] = useState(true);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  // ✅ UPDATED: Listen to Firebase auth state changes + MQTT management
  useEffect(() => {
    if (!useFirebase) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const userData = {
              ...data,
              uid: firebaseUser.uid,
              name: data.name || data.full_name || data.fullName || '',
              role: normalizeRole(data.role),
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              assignedDevices: data.assignedDevices || [],
              isPreUser: !!data.isPreUser,
            };
            setCurrentUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));

            // ✅ RECONNECT MQTT on login
            console.log('🔐 User logged in, connecting MQTT...');
            reconnectMqtt();
          } else {
            // Firebase account exists but user profile is missing.
            setCurrentUser(null);
            localStorage.removeItem('currentUser');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');

        // ✅ DISCONNECT MQTT on logout
        console.log('🔓 User logged out, disconnecting MQTT...');
        disconnectMqtt();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [useFirebase]);

  // ✅ UPDATED: Login function with MQTT reconnect
  const login = async (email, password, remember = false) => {
    try {
      // Try Firebase authentication first
      if (useFirebase) {
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          await userCredential.user.reload();

          const userDoc = await getDoc(
            doc(db, 'users', userCredential.user.uid)
          );

          if (userDoc.exists()) {
            const data = userDoc.data();
            const userData = {
              ...data,
              uid: userCredential.user.uid,
              name: data.name || data.full_name || data.fullName || '',
              role: normalizeRole(data.role),
              email: userCredential.user.email,
              emailVerified: userCredential.user.emailVerified,
              assignedDevices: data.assignedDevices || [],
              isPreUser: !!data.isPreUser,
            };
            setCurrentUser(userData);
            setRememberMe(remember);

            if (remember) {
              localStorage.setItem('rememberMe', 'true');
              localStorage.setItem('savedUsername', email);
            } else {
              localStorage.removeItem('rememberMe');
              localStorage.removeItem('savedUsername');
            }

            // ✅ RECONNECT MQTT on successful login
            console.log('🔐 Firebase login successful, connecting MQTT...');
            reconnectMqtt();

            return { success: true, user: userData };
          } else {
            return {
              success: false,
              error:
                'Your account is authenticated but profile data is missing in Firestore users collection.',
            };
          }
        } catch (firebaseError) {
          if (!allowLocalAuth) {
            return {
              success: false,
              error:
                firebaseError.message ||
                'Firebase login failed. Check your email/password and Firebase config.',
            };
          }

          console.log(
            'Firebase auth failed, trying local auth (dev mode):',
            firebaseError.message
          );
        }
      }

      if (!allowLocalAuth) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Fallback to local authentication
      const localUser = localUsers[email];
      if (localUser && localUser.password === password) {
        const { password: _, ...userWithoutPassword } = localUser;
        const normalizedUser = {
          ...userWithoutPassword,
          role: normalizeRole(userWithoutPassword.role),
          emailVerified: true,
          isPreUser: true,
          assignedDevices: userWithoutPassword.assignedDevices || [],
        };
        setCurrentUser(normalizedUser);
        setRememberMe(remember);

        if (remember) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedUsername', email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('savedUsername');
        }

        // ✅ RECONNECT MQTT on successful local login
        console.log('🔐 Local login successful, connecting MQTT...');
        reconnectMqtt();

        return { success: true, user: normalizedUser };
      }

      return { success: false, error: 'Invalid email or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  // ✅ UPDATED: Logout function with MQTT disconnect
  const logout = async () => {
    try {
      // ✅ DISCONNECT MQTT BEFORE logout
      console.log('👋 Logging out, disconnecting MQTT...');
      disconnectMqtt();

      if (useFirebase) {
        await firebaseSignOut(auth);
      }
      setCurrentUser(null);
      if (!rememberMe) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('savedUsername');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (email, password, userData) => {
    if (!useFirebase) {
      return { success: false, error: 'Firebase not configured' };
    }

    try {
      const normalizedRole = normalizeRole(userData.role);
      const normalizedCreatedByRole = normalizeRole(userData.createdByRole);

      if (
        normalizedCreatedByRole &&
        !canCreateRole(normalizedCreatedByRole, normalizedRole)
      ) {
        return {
          success: false,
          error: `${normalizedCreatedByRole} cannot create ${normalizedRole} accounts`,
        };
      }

      if (!normalizedCreatedByRole && normalizedRole !== 'USER') {
        return {
          success: false,
          error: 'Only USER accounts can be self-registered',
        };
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await sendEmailVerification(userCredential.user);

      const statusFromForm = userData.status;
      const computedStatus = roleRequiresApproval(normalizedRole)
        ? 'pending'
        : 'approved';
      const finalStatus = statusFromForm || computedStatus;

      const finalUserData = {
        ...userData,
        role: normalizedRole,
        createdByRole: normalizedCreatedByRole || null,
        email,
        emailVerified: false,
        status: finalStatus,
        assignedDevices: userData.assignedDevices || [],
        createdAt: new Date().toISOString(),
        approvedAt:
          finalStatus === 'approved' ? new Date().toISOString() : null,
        approvedBy:
          finalStatus === 'approved'
            ? normalizedCreatedByRole || 'SYSTEM'
            : null,
        isPreUser: false,
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), finalUserData);

      return {
        success: true,
        uid: userCredential.user.uid,
        status: finalStatus,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const approveUser = async (userId, approvingAdminId) => {
    if (!useFirebase) {
      return { success: false, error: 'Firebase not configured' };
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();

      if (userData.status !== 'pending') {
        return {
          success: false,
          error: `Cannot approve user with status: ${userData.status}`,
        };
      }

      await updateDoc(userRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: approvingAdminId,
      });

      await logAuditAction(
        approvingAdminId,
        userData.email,
        'user_approved',
        {
          userId,
          role: userData.role,
        }
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const rejectUser = async (userId, approvingAdminId, reason = '') => {
    if (!useFirebase) {
      return { success: false, error: 'Firebase not configured' };
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();

      await updateDoc(userRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: approvingAdminId,
        rejectionReason: reason,
      });

      await logAuditAction(
        approvingAdminId,
        userData.email,
        'user_rejected',
        {
          userId,
          role: userData.role,
          reason,
        }
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getPendingUsers = async (adminRole = 'ADMIN') => {
    if (!useFirebase) {
      return {
        success: false,
        data: [],
        error: 'Firebase not configured',
      };
    }

    try {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'pending'),
        where('role', '==', 'USER')
      );

      const querySnapshot = await getDocs(q);
      const pendingUsers = [];

      querySnapshot.forEach((docSnap) => {
        pendingUsers.push({
          uid: docSnap.id,
          ...docSnap.data(),
        });
      });

      return { success: true, data: pendingUsers };
    } catch (error) {
      return { success: false, data: [], error: error.message };
    }
  };

  const getSavedUsername = () => {
    return localStorage.getItem('savedUsername') || '';
  };

  const logAuditAction = async (
    userId,
    userEmail,
    action,
    extraData = {}
  ) => {
    if (!useFirebase) return;

    try {
      await addDoc(collection(db, 'audit_logs'), {
        userId,
        userEmail,
        action,
        timestamp: serverTimestamp(),
        ipAddress: extraData.ipAddress || null,
        userAgent: extraData.userAgent || null,
        location: extraData.location || null,
        ...extraData,
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  };

  const getClientIP = () => {
    return null;
  };

  const resetPassword = async (email) => {
    if (!useFirebase) {
      return { success: false, error: 'Firebase not configured' };
    }

    try {
      await logAuditAction(null, email, 'password_reset_requested', {
        ipAddress: getClientIP(),
        userAgent: navigator.userAgent,
      });

      await sendPasswordResetEmail(auth, email);

      return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
      await logAuditAction(null, email, 'password_reset_failed', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        register,
        approveUser,
        rejectUser,
        getPendingUsers,
        resetPassword,
        logAuditAction,
        rememberMe,
        getSavedUsername,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === defaultAuthContext && import.meta.env.DEV) {
    console.warn('useAuth is using default context. Ensure AuthProvider is mounted.');
  }
  return context;
};

export const usersDatabase = {
  weighingMachine: [],
  fuelDispenser: [],
  energyMeter: [],
};