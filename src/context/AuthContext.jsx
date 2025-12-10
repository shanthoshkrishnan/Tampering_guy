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

// ---------------------------------------------------------------------------
// Demo databases (unchanged)
// ---------------------------------------------------------------------------

const usersDatabase = {
  weighingMachine: [
    {
      id: 'WM001',
      name: 'Raj Kumar',
      email: 'raj.kumar@logistics.com',
      phone: '+91 9123456789',
      deviceId: 'WM-001',
      deviceType: 'weighingMachine',
      location: 'Delhi Warehouse A, Sector 63',
      latitude: 28.6139,
      longitude: 77.2090,
      status: 'active',
      tampered: false,
      installDate: '2024-01-15',
      lastMaintenance: '2024-11-01',
      avgDailyLoad: '2.5 tons',
      company: 'Delhi Logistics Pvt Ltd',
    },
    {
      id: 'WM002',
      name: 'Amit Patel',
      email: 'amit.patel@shipping.com',
      phone: '+91 9876543211',
      deviceId: 'WM-002',
      deviceType: 'weighingMachine',
      location: 'Mumbai Warehouse B, Andheri East',
      latitude: 19.076,
      longitude: 72.8777,
      status: 'active',
      tampered: false,
      installDate: '2024-02-10',
      lastMaintenance: '2024-11-15',
      avgDailyLoad: '3.2 tons',
      company: 'Mumbai Shipping Co.',
    },
    {
      id: 'WM003',
      name: 'Suresh Reddy',
      email: 'suresh.r@transport.com',
      phone: '+91 9876543220',
      deviceId: 'WM-003',
      deviceType: 'weighingMachine',
      location: 'Hyderabad Hub, Gachibowli',
      latitude: 17.44,
      longitude: 78.3489,
      status: 'active',
      tampered: true,
      installDate: '2024-03-22',
      lastMaintenance: '2024-10-20',
      avgDailyLoad: '1.8 tons',
      company: 'Hyderabad Transport Services',
    },
  ],
  fuelDispenser: [
    {
      id: 'FD001',
      name: 'Priya Singh',
      email: 'priya.singh@petroserve.com',
      phone: '+91 9876543212',
      deviceId: 'FD-001',
      deviceType: 'fuelDispenser',
      location: 'Bangalore Petrol Pump A, Whitefield',
      latitude: 12.9716,
      longitude: 77.5946,
      status: 'active',
      tampered: false,
      installDate: '2024-03-05',
      lastMaintenance: '2024-11-20',
      avgDailyDispense: '5000 liters',
      company: 'PetroServe India',
    },
    {
      id: 'FD002',
      name: 'Rahul Verma',
      email: 'rahul.v@fuelsmart.com',
      phone: '+91 9876543213',
      deviceId: 'FD-002',
      deviceType: 'fuelDispenser',
      location: 'Chennai Petrol Pump B, OMR Road',
      latitude: 13.0827,
      longitude: 80.2707,
      status: 'active',
      tampered: true,
      installDate: '2024-03-20',
      lastMaintenance: '2024-11-10',
      avgDailyDispense: '4200 liters',
      company: 'FuelSmart Solutions',
    },
    {
      id: 'FD003',
      name: 'Anjali Mehta',
      email: 'anjali.m@petromax.com',
      phone: '+91 9876543221',
      deviceId: 'FD-003',
      deviceType: 'fuelDispenser',
      location: 'Pune Highway Pump, Hinjewadi',
      latitude: 18.5204,
      longitude: 73.8567,
      status: 'active',
      tampered: false,
      installDate: '2024-04-15',
      lastMaintenance: '2024-11-25',
      avgDailyDispense: '6500 liters',
      company: 'PetroMax Highway Services',
    },
    {
      id: 'FD004',
      name: 'Vikram Shah',
      email: 'vikram.shah@oilandgas.com',
      phone: '+91 9876543222',
      deviceId: 'FD-004',
      deviceType: 'fuelDispenser',
      location: 'Ahmedabad Station, SG Highway',
      latitude: 23.0225,
      longitude: 72.5714,
      status: 'active',
      tampered: false,
      installDate: '2024-05-01',
      lastMaintenance: '2024-11-05',
      avgDailyDispense: '3800 liters',
      company: 'Gujarat Oil & Gas',
    },
  ],
  energyMeter: [
    {
      id: 'EM001',
      name: 'Sneha Desai',
      email: 'sneha.desai@powertech.com',
      phone: '+91 9876543214',
      deviceId: 'EM-001',
      deviceType: 'energyMeter',
      location: 'Pune Factory Unit 1, Chakan',
      latitude: 18.7606,
      longitude: 73.8636,
      status: 'active',
      tampered: false,
      installDate: '2024-04-01',
      lastMaintenance: '2024-10-15',
      avgDailyConsumption: '2500 kWh',
      company: 'PowerTech Industries',
    },
    {
      id: 'EM002',
      name: 'Karthik Iyer',
      email: 'karthik.i@energysol.com',
      phone: '+91 9876543223',
      deviceId: 'EM-002',
      deviceType: 'energyMeter',
      location: 'Coimbatore Plant, Singanallur',
      latitude: 11.0168,
      longitude: 76.9558,
      status: 'active',
      tampered: false,
      installDate: '2024-05-10',
      lastMaintenance: '2024-11-12',
      avgDailyConsumption: '3200 kWh',
      company: 'EnergySol Manufacturing',
    },
    {
      id: 'EM003',
      name: 'Meera Nair',
      email: 'meera.n@industrialpower.com',
      phone: '+91 9876543224',
      deviceId: 'EM-003',
      deviceType: 'energyMeter',
      location: 'Kochi Industrial Park, Kalamassery',
      latitude: 10.0261,
      longitude: 76.2999,
      status: 'active',
      tampered: true,
      installDate: '2024-06-05',
      lastMaintenance: '2024-11-18',
      avgDailyConsumption: '1800 kWh',
      company: 'Industrial Power Solutions',
    },
  ],
};

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
    devices: [
      {
        type: 'Weighing Machine',
        deviceId: 'WM-001',
        location: 'Delhi Warehouse A',
        installDate: '2024-01-15',
        status: 'active',
      },
    ],
    totalDevices: 1,
  },
};

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeRole = (role) =>
  role ? String(role).toUpperCase() : null;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) return null;
    const parsed = JSON.parse(savedUser);
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

  // Listen to Firebase auth state changes
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

              // ensure these are present
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,

              // pre-user flag (from Firestore, or compute your own condition)
              isPreUser: !!data.isPreUser,
            };
            setCurrentUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) {
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [useFirebase]);

  // -------------------------------------------------------------------------
  // Auth methods
  // -------------------------------------------------------------------------

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

          // optional: keep this check if you still want to block unverified at login
          // or remove it if you rely only on ProtectedRoute/VerifyEmailPage
          // if (!userCredential.user.emailVerified) {
          //   return {
          //     success: false,
          //     error: 'Please verify your email before logging in.',
          //   };
          // }

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

            return { success: true, user: userData };
          }
        } catch (firebaseError) {
          console.log(
            'Firebase auth failed, trying local auth:',
            firebaseError.message
          );
          // Fall through to local authentication
        }
      }

      // Fallback to local authentication
      const localUser = localUsers[email];
      if (localUser && localUser.password === password) {
        const { password: _, ...userWithoutPassword } = localUser;
        const normalizedUser = {
          ...userWithoutPassword,
          role: normalizeRole(userWithoutPassword.role),

          // local demo users are fully trusted
          emailVerified: true,
          isPreUser: true,
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

        return { success: true, user: normalizedUser };
      }

      return { success: false, error: 'Invalid email or password' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
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

  // -------------------------------------------------------------------------
  // Registration with hierarchy + pending/approved
  // -------------------------------------------------------------------------

  const register = async (email, password, userData) => {
    if (!useFirebase) {
      return { success: false, error: 'Firebase not configured' };
    }

    try {
      const normalizedRole = normalizeRole(userData.role);
      const normalizedCreatedByRole = normalizeRole(userData.createdByRole);

      // Validate role hierarchy
      if (
        normalizedCreatedByRole &&
        !canCreateRole(normalizedCreatedByRole, normalizedRole)
      ) {
        return {
          success: false,
          error: `${normalizedCreatedByRole} cannot create ${normalizedRole} accounts`,
        };
      }

      // Self-registration only USER
      if (!normalizedCreatedByRole && normalizedRole !== 'USER') {
        return {
          success: false,
          error: 'Only USER accounts can be self-registered',
        };
      }

      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Status
      const statusFromForm = userData.status;
      const computedStatus = roleRequiresApproval(normalizedRole)
        ? 'pending'
        : 'approved';
      const finalStatus = statusFromForm || computedStatus;

      // Store user data in Firestore
      const finalUserData = {
        ...userData,
        role: normalizedRole,
        createdByRole: normalizedCreatedByRole || null,
        email,
        emailVerified: false,
        status: finalStatus,
        createdAt: new Date().toISOString(),
        approvedAt:
          finalStatus === 'approved' ? new Date().toISOString() : null,
        approvedBy:
          finalStatus === 'approved'
            ? normalizedCreatedByRole || 'SYSTEM'
            : null,

        // new users are NOT pre-users
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

  // -------------------------------------------------------------------------
  // Approval / rejection
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Misc helpers
  // -------------------------------------------------------------------------

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

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
