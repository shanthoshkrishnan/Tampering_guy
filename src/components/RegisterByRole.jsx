// src/pages/RegisterByRole.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  CREATION_MAP,
  getRoleSchema,
  normalizeRole,
} from '../config/rolesSchema';

export default function RegisterByRole() {
  const { currentUser, register, logAuditAction } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const currentRole = normalizeRole(currentUser?.role) || 'USER';
  const targetRole = useMemo(() => {
    // MANUFACTURER -> LM_OFFICER -> DISTRICT_SUPER_ADMIN -> ADMIN -> USER
    return CREATION_MAP[currentRole] || null;
  }, [currentRole]);

  const targetSchema = targetRole ? getRoleSchema(targetRole) : null;

  const [formData, setFormData] = useState(() => {
    if (!targetSchema) return {};
    const allFields = [
      ...targetSchema.required_fields,
      ...targetSchema.optional_fields,
    ];
    const initial = {};
    allFields.forEach((f) => {
      // some fields you may want defaults for
      if (f === 'role') initial[f] = targetRole;
      else if (f === 'status') initial[f] = 'approved';
      else if (f === 'created_at') initial[f] = new Date().toISOString();
      else initial[f] = '';
    });
    return initial;
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAllowedCreator = !!targetRole && !!targetSchema;

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setLocation(loc);
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
    setError('');
    setSuccess('');
    setLoading(true);

    if (!isAllowedCreator) {
      setError('Your role cannot create any new accounts.');
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!location) {
      setError('Please allow location access to continue');
      setLoading(false);
      return;
    }

    try {
      const status = targetRole === 'USER' ? 'pending' : 'approved';

      const userData = {
        ...formData,
        role: targetRole,
        status,
        created_at: new Date().toISOString(),
        createdBy: currentUser?.uid || null,
        createdByRole: currentRole,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          capturedAt: new Date().toISOString(),
        },
      };

      const res = await register(email, password, userData);

      if (res.success) {
        if (logAuditAction) {
          await logAuditAction(currentUser?.uid || null, email, 'user_registered', {
            targetRole,
            status,
            schemaRole: targetSchema.role,
            location: userData.location,
          });
        }

        setSuccess(
          targetRole === 'USER'
            ? '✅ USER account created! It is pending approval by an admin.'
            : `✅ ${targetRole.replace('_', ' ')} account created successfully.`
        );
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('Registration failed. Please try again.');
    }

    setLoading(false);
  };

  if (!isAllowedCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
            Not Allowed
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your role ({currentRole}) is not allowed to create any new accounts.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const requiredFields = targetSchema.required_fields.filter(
    (f) => f !== 'role' && f !== 'status' && f !== 'created_at'
  );
  const optionalFields = targetSchema.optional_fields;

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        isDarkMode
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}
    >
      {/* Background */}
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

      <div className="relative min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-3xl">
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
                <span className="text-3xl">🧾</span>
              </div>
              <h1
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                Create {targetRole.replace('_', ' ')} Account
              </h1>
              <p
                className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                You are logged in as {currentRole}. You can create a{' '}
                {targetRole.replace('_', ' ')} according to the role schema.
              </p>
            </div>

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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Auth credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Login Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                        : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                    } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                    placeholder="roleuser@example.com"
                    required
                  />
                </div>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                        : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                    } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                    required
                  />
                </div>
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                        : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                    } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                    required
                  />
                </div>
              </div>

              {/* Required fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredFields.map((field) => (
                  <div key={field}>
                    <label
                      className={`block text-sm font-semibold mb-2 ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      {field} *
                    </label>
                    <input
                      type="text"
                      value={formData[field] || ''}
                      onChange={(e) =>
                        handleFieldChange(field, e.target.value)
                      }
                      className={`w-full px-4 py-3 rounded-xl ${
                        isDarkMode
                          ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                          : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                      } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                      required
                    />
                  </div>
                ))}
              </div>

              {/* Optional fields */}
              {optionalFields.length > 0 && (
                <div>
                  <p
                    className={`text-xs font-semibold mb-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    Optional fields
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {optionalFields.map((field) => (
                      <div key={field}>
                        <label
                          className={`block text-xs font-medium mb-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-700'
                          }`}
                        >
                          {field}
                        </label>
                        <input
                          type="text"
                          value={formData[field] || ''}
                          onChange={(e) =>
                            handleFieldChange(field, e.target.value)
                          }
                          className={`w-full px-4 py-2 rounded-xl ${
                            isDarkMode
                              ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                              : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                          } border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location */}
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

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
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
                  disabled={loading || !location}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : '✓ Create Account'}
                </button>
              </div>
            </form>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className={`text-sm ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-600 hover:text-gray-800'
              } transition`}
            >
              ← Back to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
