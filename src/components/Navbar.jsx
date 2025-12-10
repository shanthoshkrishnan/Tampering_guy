import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSearchFilter } from '../context/SearchFilterContext';
import { useState } from 'react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { searchQuery, setSearchQuery, filterType, setFilterType, clearFilters } = useSearchFilter();
  const [showSearchFilter, setShowSearchFilter] = useState(false);

  const userRole = currentUser?.role
    ? String(currentUser.role).toUpperCase()
    : null;

  // treat all higher roles as privileged creators
  const canSeeRegister = [
    'ADMIN',
    'DISTRICT_SUPER_ADMIN',
    'LM_OFFICER',
    'MANUFACTURER',
  ].includes(userRole);


  const navItems = [
    { name: 'Home', path: '/dashboard', icon: '🏠', adminOnly: false },
    { name: 'Device Inspection', path: '/device-inspection', icon: '🔍', adminOnly: true },
    { name: 'Register User', path: '/register-role', icon: '📝', adminOnly: true },

  ];

  // show Device Inspection only to ADMIN, but Register to all creator roles
  const filteredNavItems = navItems.filter((item) => {
  if (!item.adminOnly) return true;

  if (item.name === 'Device Inspection') {
    return userRole === 'ADMIN' || userRole === 'USER';
  }

  if (item.name === 'Register User') {
    return canSeeRegister;
  }

  return false;
});

  const filterOptions = [
    { value: 'all', label: 'All Devices', icon: '📊' },
    { value: 'weighing', label: 'Weighing Machines', icon: '⚖️' },
    { value: 'fuel', label: 'Fuel Dispensers', icon: '⛽' },
    { value: 'energy', label: 'Energy Meters', icon: '⚡' },
    { value: 'tampered', label: 'Tampered Only', icon: '⚠️' },
    { value: 'normal', label: 'Normal Only', icon: '✓' },
  ];

  const handleApply = () => {
    setShowSearchFilter(false);
  };

  const handleClear = () => {
    clearFilters();
  };

  const activeFilterCount = (searchQuery ? 1 : 0) + (filterType !== 'all' ? 1 : 0);

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Left: Logo & Navigation */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">🛡️</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Tampering Guy
              </h1>
            </div>
            <nav className="hidden md:flex gap-2">
              {filteredNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${location.pathname === item.path
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 backdrop-blur-sm'
                    }`}
                >
                  {item.icon} {item.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Search/Filter, Profile, Settings */}
          <div className="flex items-center gap-3">
            {/* Combined Search & Filter */}
            <div className="relative">
              <button
                onClick={() => setShowSearchFilter(!showSearchFilter)}
                className="px-4 py-2 bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200/80 dark:hover:bg-gray-700/80 flex items-center gap-2 relative backdrop-blur-sm transition-all duration-200 border border-gray-200/50 dark:border-gray-700/50"
                title="Search & Filter"
              >
                <span>🔍</span>
                <span className="hidden md:inline text-sm font-medium">Search & Filter</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              {showSearchFilter && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    onClick={() => setShowSearchFilter(false)}
                  ></div>

                  {/* Dropdown Content - Glassy Design */}
                  <div className="absolute right-0 mt-2 w-80 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-40 animate-fadeIn">
                    <div className="p-5">
                      {/* Search Input */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <span className="text-lg">🔍</span>
                          Search Devices
                        </label>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name, ID, location..."
                          className="w-full px-4 py-3 border border-gray-300/50 dark:border-gray-600/50 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none backdrop-blur-sm transition"
                        />
                      </div>

                      {/* Filter Options */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          Filter by Type
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                          {filterOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setFilterType(option.value)}
                              className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-200 flex items-center gap-3 ${filterType === option.value
                                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg'
                                  : 'bg-gray-50/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 backdrop-blur-sm'
                                }`}
                            >
                              <span className="text-lg">{option.icon}</span>
                              <span className="text-sm flex-1">{option.label}</span>
                              {filterType === option.value && (
                                <span className="text-lg">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={handleClear}
                          className="flex-1 px-4 py-3 bg-gray-200/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300/80 dark:hover:bg-gray-700/80 text-sm font-semibold backdrop-blur-sm transition-all duration-200"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={handleApply}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 text-sm font-semibold transition-all duration-200"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile */}
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/50 flex items-center gap-2 transition-all duration-200"
            >
              <span>👤</span>
              <span className="hidden md:inline font-medium">{currentUser?.name?.split(' ')[0]}</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="px-3 py-2 bg-gray-600/80 dark:bg-gray-700/80 text-white rounded-xl hover:bg-gray-700/80 dark:hover:bg-gray-600/80 backdrop-blur-sm transition-all duration-200"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex gap-2 mt-3 overflow-x-auto pb-2">
          {filteredNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${location.pathname === item.path
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 backdrop-blur-sm'
                }`}
            >
              {item.icon} {item.name}
            </button>
          ))}
        </nav>

        {/* Active Filters Display - Glassy Pills */}
        {(searchQuery || filterType !== 'all') && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Active filters:</span>
            {searchQuery && (
              <span className="px-4 py-2 bg-indigo-100/80 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-xl text-sm flex items-center gap-2 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-700/50 font-medium">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-indigo-600 font-bold">✕</button>
              </span>
            )}
            {filterType !== 'all' && (
              <span className="px-4 py-2 bg-purple-100/80 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-xl text-sm flex items-center gap-2 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50 font-medium">
                {filterOptions.find(f => f.value === filterType)?.label}
                <button onClick={() => setFilterType('all')} className="hover:text-purple-600 font-bold">✕</button>
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
