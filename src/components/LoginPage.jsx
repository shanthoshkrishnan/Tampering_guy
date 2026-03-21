import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, getSavedUsername, currentUser } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }

    const savedUsername = getSavedUsername();
    if (savedUsername) {
      setValue('email', savedUsername);
      setRememberMe(true);
    }
  }, [currentUser, navigate, getSavedUsername, setValue]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await login(data.email, data.password, rememberMe);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDarkMode
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 ${isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 ${isDarkMode ? 'bg-pink-900/30' : 'bg-pink-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000`}></div>
      </div>

      {/* Login card */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Glass card */}
          <div className={`backdrop-blur-2xl ${isDarkMode ? 'bg-gray-800/40' : 'bg-white/40'
            } rounded-3xl shadow-2xl border ${isDarkMode ? 'border-gray-700/50' : 'border-white/50'
            } p-8 hover:shadow-indigo-500/20 transition-shadow duration-300`}>

            {/* Logo/Title */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isDarkMode
                ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600'
                : 'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500'
                } mb-4 shadow-lg shadow-indigo-500/50 animate-pulse`}>
                <span className="text-4xl">🛡️</span>
              </div>
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-500'
                }`}>
                TRUSTSCALE APPLICATION
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Device Anti-Tampering System
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className={`mb-6 p-4 rounded-xl ${isDarkMode
                ? 'bg-red-900/30 border-red-700/50'
                : 'bg-red-100/80 border-red-300/50'
                } border backdrop-blur-sm animate-shake`}>
                <p className={`text-sm flex items-center ${isDarkMode ? 'text-red-300' : 'text-red-700'
                  }`}>
                  <span className="mr-2">⚠️</span>
                  {error}
                </p>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className={`w-full px-4 py-3 rounded-xl ${isDarkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                    : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                    } border ${errors.email
                      ? 'border-red-500/50'
                      : ''
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                  placeholder="your@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Password
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className={`w-full px-4 py-3 rounded-xl ${isDarkMode
                    ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                    : 'bg-white/50 border-gray-300/50 text-gray-800 placeholder-gray-400'
                    } border ${errors.password
                      ? 'border-red-500/50'
                      : ''
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 bg-gray-200 text-indigo-600 focus:ring-indigo-500/50 focus:ring-2"
                  />
                  <span className={`ml-2 ${isDarkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-800'
                    } transition`}>
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className={`font-medium transition ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                    }`}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🔐</span>
                    Sign In
                  </span>
                )}
              </button>
            </form>

            {/* New Registration Link */}
            <div className="mt-6 text-center">
              <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Don't have an account?
              </p>
              <button
                onClick={() => navigate('/register')}
                className={`w-full py-3 px-6 rounded-xl ${isDarkMode
                  ? 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-600/50'
                  : 'bg-white/50 border-gray-300/50 text-gray-700 hover:bg-white/70'
                  } border font-semibold transition-all`}
              >
                🆕 New Consumer Registration
              </button>
            </div>

            {/* Footer text */}
            <p className={`text-center text-sm mt-6 flex items-center justify-center ${isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>
              <span className="mr-2">🛡️</span>
              Secure Device Anti-Tampering System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
