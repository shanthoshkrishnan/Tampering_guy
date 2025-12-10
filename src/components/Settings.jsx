import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Settings</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Account Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Account</h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">{currentUser?.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentUser?.email}</p>
              </div>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-semibold capitalize">
                {currentUser?.role}
              </span>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Appearance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose your preferred theme</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setTheme('light')}
                className={`p-4 rounded-lg border-2 transition ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-lg mb-2 flex items-center justify-center shadow-md">
                    ☀️
                  </div>
                  <p className="font-medium text-gray-800 dark:text-white">Light</p>
                  {theme === 'light' && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Active</span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-lg border-2 transition ${
                  theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-800 rounded-lg mb-2 flex items-center justify-center shadow-md">
                    🌙
                  </div>
                  <p className="font-medium text-gray-800 dark:text-white">Dark</p>
                  {theme === 'dark' && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Active</span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`p-4 rounded-lg border-2 transition ${
                  theme === 'system'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-800 rounded-lg mb-2 flex items-center justify-center shadow-md">
                    💻
                  </div>
                  <p className="font-medium text-gray-800 dark:text-white">System</p>
                  {theme === 'system' && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Active</span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Logout Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Session</h2>
            <button
              onClick={handleLogout}
              className="w-full md:w-auto px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 focus:ring-4 focus:ring-red-300 transition flex items-center justify-center"
            >
              <span className="mr-2">🚪</span>
              Logout
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              You will be signed out of your account
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
