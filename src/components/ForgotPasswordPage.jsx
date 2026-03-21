import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { resetPassword } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    const resetResult = await resetPassword(email);

    if (resetResult.success) {
      setSuccess(
        '✅ Password reset email sent! Check your inbox (and spam folder).'
      );
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setError(resetResult.error || 'Failed to send reset email');
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
      {/* Background blob */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-64 h-64 sm:w-80 sm:h-80 ${
            isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-300/30'
          } rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob`}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-8 sm:py-10">
        <div className="w-full max-w-md">
          <div
            className={`backdrop-blur-2xl ${
              isDarkMode ? 'bg-gray-800/40' : 'bg-white/40'
            } rounded-3xl shadow-2xl border ${
              isDarkMode ? 'border-gray-700/50' : 'border-white/50'
            } px-4 sm:px-6 md:px-8 py-6 sm:py-8`}
          >
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div
                className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600'
                    : 'bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500'
                } mb-3 sm:mb-4 shadow-lg`}
              >
                <span className="text-2xl sm:text-3xl">🔐</span>
              </div>
              <h1
                className={`text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                Reset Password
              </h1>
              <p
                className={`text-xs sm:text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Enter your email to receive a password reset link
              </p>
            </div>

            {/* Success message */}
            {success && (
              <div
                className={`mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl border ${
                  isDarkMode
                    ? 'bg-green-900/30 border-green-700/50'
                    : 'bg-green-100/80 border-green-300/50'
                } backdrop-blur-sm`}
              >
                <p
                  className={`text-xs sm:text-sm ${
                    isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}
                >
                  {success}
                </p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div
                className={`mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl border ${
                  isDarkMode
                    ? 'bg-red-900/30 border-red-700/50'
                    : 'bg-red-100/80 border-red-300/50'
                } backdrop-blur-sm`}
              >
                <p
                  className={`text-xs sm:text-sm ${
                    isDarkMode ? 'text-red-300' : 'text-red-700'
                  }`}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label
                  className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-sm transition ${
                    isDarkMode
                      ? 'bg-gray-700/50 border-gray-600/50 text-white placeholder-gray-500'
                      : 'bg-white/60 border-gray-300/60 text-gray-800 placeholder-gray-400'
                  }`}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold text-sm sm:text-base shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : '📧 Send Reset Link'}
              </button>
            </form>

            {/* Footer link */}
            <div className="text-center mt-5 sm:mt-6">
              <button
                onClick={() => navigate('/login')}
                className={`text-xs sm:text-sm ${
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
    </div>
  );
}
