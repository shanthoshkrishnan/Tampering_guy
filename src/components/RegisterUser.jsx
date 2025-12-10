import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { z } from 'zod';

// Strong password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[@$!%*?&#]/, 'Password must contain at least one special character (@$!%*?&#)');

// Map: who can create which role (all in UPPERCASE)
// This enforces: MANUFACTURER -> LM_OFFICER -> DISTRICT_SUPER_ADMIN -> ADMIN -> USER
// and prevents a logged-in USER from creating more USERs.
const CREATION_MAP = {
  MANUFACTURER: 'LM_OFFICER',
  LM_OFFICER: 'DISTRICT_SUPER_ADMIN',
  DISTRICT_SUPER_ADMIN: 'ADMIN',
  ADMIN: 'USER',
  USER: null, // logged-in USER cannot create anyone else
};

// Optional: explicit whitelist of roles that are allowed to use this page
const ALLOWED_CREATORS = new Set([
  'MANUFACTURER',
  'LM_OFFICER',
  'DISTRICT_SUPER_ADMIN',
  'ADMIN',
  'USER',
]);

export default function RegisterUser() {
  const { currentUser, register, logAuditAction } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // Normalize current role to UPPERCASE (AuthContext should store as uppercase too)
  const rawRole = currentUser?.role || null;
  const currentRole = rawRole ? String(rawRole).toUpperCase() : null;

  // If no user, treat as unauthenticated visitor (self-registering USER)
  const isUnauthenticated = !currentUser;

  // Safe role: for logged-in users only; if strange, block creation
  const safeRole =
    !isUnauthenticated && currentRole && ALLOWED_CREATORS.has(currentRole)
      ? currentRole
      : null;

  // Self-registration is only allowed when there is NO currentUser
  const isSelfRegisteringUser = isUnauthenticated;

  // Target role:
  // - unauthenticated → USER
  // - logged-in creator → immediate child from CREATION_MAP
  const targetRole = useMemo(() => {
    if (isSelfRegisteringUser) return 'USER';
    if (!safeRole) return null;
    return CREATION_MAP[safeRole] || null;
  }, [isSelfRegisteringUser, safeRole]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: '',
    age: '',
    businessType: '',
  });

  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordErrors, setPasswordErrors] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === 'password') {
      const result = passwordSchema.safeParse(value);
      if (!result.success && result.error && Array.isArray(result.error.errors)) {
        setPasswordErrors(result.error.errors.map((err) => err.message));
      } else {
        setPasswordErrors([]);
      }
    }
  };

  const requestLocation = () => {
    setLocationLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(locationData);
        setLocationLoading(false);
        setSuccess('✅ Location captured successfully!');
        setTimeout(() => setSuccess(''), 3000);
      },
      (err) => {
        setLocationLoading(false);
        setError(
          `Location error: ${err.message}. Please enable location access in browser settings.`
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const passwordResult = passwordSchema.safeParse(formData.password);
    if (!passwordResult.success) {
      setError('Password does not meet security requirements');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!location) {
      setError('Please allow location access to continue');
      setLoading(false);
      return;
    }

    // Enforce self-registration rule and hierarchy strictly
    // 1) If not logged in, only USER self-registration is allowed.
    // 2) If logged in, creator must have a known, allowed role and a valid targetRole.
    if (isSelfRegisteringUser) {
      // ok, targetRole is forced to USER above
    } else {
      if (!safeRole || !ALLOWED_CREATORS.has(safeRole)) {
        setError('You are not allowed to create accounts.');
        setLoading(false);
        return;
      }
      if (!targetRole) {
        setError('Your role is not permitted to create any new accounts.');
        setLoading(false);
        return;
      }
    }

    try {
      // status: pending for self-registering USER, approved when created by higher role
      const status = isSelfRegisteringUser ? 'pending' : 'approved';

      const upperTargetRole = targetRole; // already uppercase
      const userData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        age: parseInt(formData.age, 10),
        businessType: formData.businessType,
        // Store role in consistent UPPERCASE form
        role: upperTargetRole,
        userType: upperTargetRole === 'USER' ? 'Consumer' : 'Staff',
        totalDevices: 0,
        status,
        emailVerified: false,
        phoneVerified: false,
        createdBy: currentUser ? currentUser.uid : null,
        createdByRole: isSelfRegisteringUser ? null : safeRole,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          capturedAt: new Date().toISOString(),
        },
      };

      const result = await register(formData.email, formData.password, userData);

      if (result.success) {
        if (logAuditAction) {
          await logAuditAction(
            currentUser ? currentUser.uid : null,
            formData.email,
            'user_registered',
            {
              targetRole: upperTargetRole,
              status,
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                capturedAt: new Date().toISOString(),
              },
            }
          );
        }

        setSuccess(
          isSelfRegisteringUser
            ? '✅ Account created! Your profile is pending approval by an admin.'
            : `✅ ${upperTargetRole.replace('_', ' ')} account created successfully.`
        );
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('Registration failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}
    >
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 ${
            isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob`}
        ></div>
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 ${
            isDarkMode ? 'bg-purple-900/30' : 'bg-purple-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000`}
        ></div>
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 ${
            isDarkMode ? 'bg-pink-900/30' : 'bg-pink-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000`}
        ></div>
      </div>

      {/* Registration card */}
      <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Glass card */}
          <div
            className={`backdrop-blur-2xl ${
              isDarkMode ? 'bg-gray-800/40' : 'bg-white/40'
            } rounded-3xl shadow-2xl border ${
              isDarkMode ? 'border-gray-700/50' : 'border-white/50'
            } p-8`}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600'
                    : 'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500'
                } mb-4 shadow-lg`}
              >
                <span className="text-3xl">📝</span>
              </div>
              <h1
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                {isSelfRegisteringUser
                  ? 'Consumer Registration'
                  : targetRole
                  ? `Create ${targetRole.replace('_', ' ')} Account`
                  : 'Not Allowed'}
              </h1>
              <p
                className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {isSelfRegisteringUser
                  ? 'Create your account to monitor devices'
                  : targetRole
                  ? 'Add a new account according to your role privileges'
                  : 'Your role cannot create any new accounts.'}
              </p>
            </div>

            {/* Success/Error messages */}
            {success && (
              <div
                className={`mb-6 p-4 rounded-xl ${
                  isDarkMode
                    ? 'bg-green-900/30 border-green-700/50'
                    : 'bg-green-100/80 border-green-300/50'
                } border backdrop-blur-sm`}
              >
                <p
                  className={`text-sm ${
                    isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}
                >
                  {success}
                </p>
              </div>
            )}

            {error && (
              <div
                className={`mb-6 p-4 rounded-xl ${
                  isDarkMode
                    ? 'bg-red-900/30 border-red-700/50'
                    : 'bg-red-100/80 border-red-300/50'
                } border backdrop-blur-sm`}
              >
                <p
                  className={`text-sm ${
                    isDarkMode ? 'text-red-300' : 'text-red-700'
                  }`}
                >
                  {error}
                </p>
              </div>
            )}

            {/* If targetRole is null for a logged-in user, block form */}
            {!isSelfRegisteringUser && !targetRole ? (
              <div
                className={`p-4 rounded-xl ${
                  isDarkMode
                    ? 'bg-yellow-900/30 border-yellow-700/50'
                    : 'bg-yellow-100/80 border-yellow-300/50'
                } border backdrop-blur-sm`}
              >
                <p
                  className={`text-sm ${
                    isDarkMode ? 'text-yellow-300' : 'text-yellow-800'
                  }`}
                >
                  Your role is not permitted to create any new accounts.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                      placeholder="••••••••"
                      required
                    />
                    {passwordErrors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {passwordErrors.map((err, idx) => (
                          <p key={idx} className="text-xs text-red-500">
                            • {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                      placeholder="+91 9876543210"
                      required
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label
                      className={`block text-sm font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Age *
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                      placeholder="28"
                      required
                      min="18"
                      max="100"
                    />
                  </div>
                </div>

                {/* Business Type */}
                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Business Type *
                  </label>
                  <input
                    type="text"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                        : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                    } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                    placeholder="e.g., Warehouse Owner, Petrol Pump, Factory, Retail Shop"
                    required
                  />
                </div>

                {/* Address */}
                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Business Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                        : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                    } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                    placeholder="Complete business address..."
                    rows="3"
                    required
                  />
                </div>

                {/* Location Access */}
                <div
                  className={`p-4 rounded-xl ${
                    isDarkMode
                      ? 'bg-blue-900/20 border-blue-700/50'
                      : 'bg-blue-100/50 border-blue-300/50'
                  } border backdrop-blur-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p
                        className={`text-sm font-semibold mb-1 ${
                          isDarkMode ? 'text-blue-300' : 'text-blue-700'
                        }`}
                      >
                        📍 Location Access Required
                      </p>
                      <p
                        className={`text-xs ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}
                      >
                        {location
                          ? `✅ Location captured: ${location.latitude.toFixed(
                              4
                            )}, ${location.longitude.toFixed(4)}`
                          : 'Click the button to allow location access'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={locationLoading || !!location}
                      className={`ml-4 px-4 py-2 rounded-lg font-semibold text-sm transition ${
                        location
                          ? 'bg-green-600 text-white cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      } disabled:opacity-50`}
                    >
                      {locationLoading
                        ? '⏳ Getting...'
                        : location
                        ? '✓ Captured'
                        : '📍 Allow'}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div
                  className={`p-4 rounded-xl ${
                    isDarkMode
                      ? 'bg-gray-700/30 border-gray-600/30'
                      : 'bg-gray-100/50 border-gray-300/30'
                  } border backdrop-blur-sm`}
                >
                  <p
                    className={`text-xs font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    🔒 Password Requirements:
                  </p>
                  <ul
                    className={`text-xs space-y-1 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-600'
                    }`}
                  >
                    <li>• At least 8 characters long</li>
                    <li>• One uppercase letter (A-Z)</li>
                    <li>• One lowercase letter (a-z)</li>
                    <li>• One number (0-9)</li>
                    <li>• One special character (@$!%*?&#)</li>
                  </ul>
                </div>

                {/* Submit buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className={`flex-1 py-3 px-6 rounded-xl ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                        : 'bg-white/50 border-gray-300/50 text-gray-700 hover:bg-white/70'
                    } border font-semibold transition`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !location ||
                      (!isSelfRegisteringUser && !targetRole)
                    }
                    className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Registering...' : '✓ Register'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Back to login link */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/login')}
              className={`text-sm ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-800'
              } transition`}
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
