import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchFilter } from '../context/SearchFilterContext';
import UserDetailModal from './UserDetailModal';
import Navbar from './Navbar';

const normalizeRole = (role) => (role ? String(role).toUpperCase() : null);

export default function DeviceInspection() {
  const { currentUser } = useAuth();
  const { applyFilters, filterType } = useSearchFilter();
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // toast state
  const [toasts, setToasts] = useState([]);
  const seenTamperedIdsRef = useRef(new Set());

  const currentRole = normalizeRole(currentUser?.role);
  const isAdmin = currentRole === 'ADMIN';
  const isUser = currentRole === 'USER';

  // Only ADMIN and USER can see this page
  if (!isAdmin && !isUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <div className="bg-white/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-xl p-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Restricted Access
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Device Inspection is only available to registered Users and Admins.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please use your role-specific dashboards to view aggregated issues and alerts.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Raw lists from usersDatabase
  const weighingRaw = currentUser?.usersDatabase?.weighingMachine || [];
  const fuelRaw = currentUser?.usersDatabase?.fuelDispenser || [];
  const energyRaw = currentUser?.usersDatabase?.energyMeter || [];

  let weighingMachineUsers = [];
  let fuelDispenserUsers = [];
  let energyMeterUsers = [];

  if (isAdmin) {
    // Admin: all devices in scope
    weighingMachineUsers = weighingRaw;
    fuelDispenserUsers = fuelRaw;
    energyMeterUsers = energyRaw;
  } else if (isUser) {
    // User: only own devices, like Home
    const all = [...weighingRaw, ...fuelRaw, ...energyRaw];
    const myDevices = all.filter(
      (device) => device.email === currentUser?.email
    );
    weighingMachineUsers = myDevices.filter(
      (d) => d.deviceType === 'weighingMachine'
    );
    fuelDispenserUsers = myDevices.filter(
      (d) => d.deviceType === 'fuelDispenser'
    );
    energyMeterUsers = myDevices.filter(
      (d) => d.deviceType === 'energyMeter'
    );
  }

  const allUsersOriginal = [
    ...weighingMachineUsers,
    ...fuelDispenserUsers,
    ...energyMeterUsers,
  ];

  // Apply search/filter from context
  const allUsers = applyFilters(allUsersOriginal);
  const filteredWeighingMachineUsers = applyFilters(weighingMachineUsers);
  const filteredFuelDispenserUsers = applyFilters(fuelDispenserUsers);
  const filteredEnergyMeterUsers = applyFilters(energyMeterUsers);

  const totalUsers = allUsers.length;
  const totalActive = allUsers.filter((u) => u.status === 'active').length;
  const totalTampered = allUsers.filter((u) => u.tampered).length;
  const suspiciousDevices = allUsers.filter((u) => u.tampered);

  // notification data: only tampered devices
  const tamperedUsers = suspiciousDevices;
  const tamperedCount = tamperedUsers.length;

  // detect new tampered devices -> create toasts
  useEffect(() => {
    const seen = seenTamperedIdsRef.current;
    const newlyTampered = tamperedUsers.filter(
      (d) => d.tampered && !seen.has(d.id)
    );

    if (newlyTampered.length) {
      const now = Date.now();
      const newToasts = newlyTampered.map((d, idx) => {
        seen.add(d.id);
        return {
          id: `${d.id}-${now}-${idx}`,
          deviceId: d.deviceId,
          location: d.location,
          userObj: d,
        };
      });
      // keep most recent 5
      setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
    }
  }, [tamperedUsers]);

  // auto-remove oldest toast every 6s if any present
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, prev.length - 1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const shouldShowCategory = (categoryId) => {
    if (filterType === 'all') return true;
    if (filterType === 'weighing')
      return categoryId === 'weighingMachine' || categoryId === 'all';
    if (filterType === 'fuel')
      return categoryId === 'fuelDispenser' || categoryId === 'all';
    if (filterType === 'energy')
      return categoryId === 'energyMeter' || categoryId === 'all';
    if (filterType === 'tampered')
      return categoryId === 'suspicious' || categoryId === 'all';
    if (filterType === 'normal') return categoryId !== 'suspicious';
    return true;
  };

  const allCategories = [
    {
      id: 'all',
      name: 'All Registered Devices',
      icon: '📡',
      color: 'from-slate-900 via-indigo-700 to-indigo-500',
      count: totalUsers,
      users: allUsers,
      tamperedCount: totalTampered,
      normalCount: totalUsers - totalTampered,
      show: shouldShowCategory('all'),
    },
    {
      id: 'weighingMachine',
      name: 'Weighing Machines',
      icon: '⚖️',
      color: 'from-blue-500 to-sky-500',
      count: filteredWeighingMachineUsers.length,
      users: filteredWeighingMachineUsers,
      tamperedCount: filteredWeighingMachineUsers.filter((u) => u.tampered)
        .length,
      normalCount: filteredWeighingMachineUsers.filter((u) => !u.tampered)
        .length,
      show: shouldShowCategory('weighingMachine'),
    },
    {
      id: 'fuelDispenser',
      name: 'Fuel Dispensers',
      icon: '⛽',
      color: 'from-emerald-500 to-lime-500',
      count: filteredFuelDispenserUsers.length,
      users: filteredFuelDispenserUsers,
      tamperedCount: filteredFuelDispenserUsers.filter((u) => u.tampered)
        .length,
      normalCount: filteredFuelDispenserUsers.filter((u) => !u.tampered)
        .length,
      show: shouldShowCategory('fuelDispenser'),
    },
    {
      id: 'energyMeter',
      name: 'Energy Meters',
      icon: '⚡',
      color: 'from-amber-500 to-orange-500',
      count: filteredEnergyMeterUsers.length,
      users: filteredEnergyMeterUsers,
      tamperedCount: filteredEnergyMeterUsers.filter((u) => u.tampered).length,
      normalCount: filteredEnergyMeterUsers.filter((u) => !u.tampered).length,
      show: shouldShowCategory('energyMeter'),
    },
    {
      id: 'suspicious',
      name: 'Suspicious Patterns',
      icon: '🚨',
      color: 'from-rose-500 to-red-600',
      count: suspiciousDevices.length,
      users: suspiciousDevices,
      tamperedCount: suspiciousDevices.length,
      normalCount: 0,
      show: shouldShowCategory('suspicious'),
    },
  ];

  const categories = allCategories.filter((c) => c.show);

  const getFilteredUsers = (category) => {
    if (category.id === 'suspicious') return category.users;
    if (selectedFilter === 'all') return category.users;
    if (selectedFilter === 'tampered')
      return category.users.filter((u) => u.tampered);
    if (selectedFilter === 'normal')
      return category.users.filter((u) => !u.tampered);
    return category.users;
  };

  const handleCategoryClick = (categoryId) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
      setSelectedFilter('all');
    } else {
      setExpandedCategory(categoryId);
      setSelectedFilter('all');
    }
  };

  const activeCategory = expandedCategory
    ? categories.find((c) => c.id === expandedCategory)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-gray-950 dark:via-slate-900 dark:to-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header + notification bell */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300 mb-1">
              Device Intelligence
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Device Inspection
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl">
              {isAdmin
                ? 'As an LM Officer/Admin, you can review live health and tampering patterns across all registered devices.'
                : 'Review the live status and integrity of your registered devices in a consolidated view.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* notification bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition"
                title="Tampered device notifications"
              >
                <span className="text-xl">🔔</span>
                {tamperedCount > 0 && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center shadow-lg">
                      {tamperedCount > 9 ? '9+' : tamperedCount}
                    </span>
                    <span className="absolute -top-1.5 -right-1.5 inline-flex h-6 w-6 rounded-full bg-red-500/60 opacity-75 animate-ping" />
                  </>
                )}
              </button>

              {showNotifications && (
                <>
                  {/* click backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 mt-3 w-80 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🚨</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Tampered devices
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Only devices with tampering indicators are listed.
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {tamperedCount}
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {tamperedCount === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                          No tampering alerts right now. All monitored devices
                          look healthy.
                        </div>
                      ) : (
                        tamperedUsers.map((device) => (
                          <button
                            key={device.id}
                            onClick={() => {
                              setSelectedUser(device);
                              setShowNotifications(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-start gap-3 text-xs"
                          >
                            <span className="mt-0.5 text-sm">⚠️</span>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-100">
                                {device.deviceId}
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                {device.location}
                              </p>
                              <p className="text-[11px] text-rose-500 dark:text-rose-300 mt-0.5">
                                Tampering behavior detected. Click to open full
                                device details.
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-end gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900 font-semibold text-[11px]">
                Role: {currentRole || 'UNKNOWN'}
              </span>
              <span>
                Signed in as{' '}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {currentUser?.name}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-800 to-indigo-600 text-white shadow-xl">
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📡</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-indigo-200">
                  Total
                </span>
              </div>
              <p className="text-3xl font-extrabold">{totalUsers}</p>
              <p className="text-xs mt-1 text-indigo-100">
                Devices currently in scope
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">✓</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-emerald-100">
                  Healthy
                </span>
              </div>
              <p className="text-3xl font-extrabold">{totalActive}</p>
              <p className="text-xs mt-1 text-emerald-100">
                Devices reporting active status
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-xl">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">⚠️</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-rose-100">
                  Risk
                </span>
              </div>
              <p className="text-3xl font-extrabold">{totalTampered}</p>
              <p className="text-xs mt-1 text-rose-100">
                Devices with tampering indicators
              </p>
            </div>
          </div>
        </section>

        {/* No results message */}
        {categories.length === 0 && (
          <div className="bg-white/80 dark:bg-slate-900/80 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
              No devices match your current filters
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Adjust your search or filter criteria in the top bar to broaden the
              results.
            </p>
          </div>
        )}

        {/* Category Cards Grid */}
        {categories.length > 0 && (
          <section
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(
              categories.length,
              4
            )} gap-6 mb-10`}
          >
            {categories.map((category) => (
              <div key={category.id}>
                <div
                  className={`relative bg-gradient-to-br ${category.color} rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${
                    expandedCategory === category.id
                      ? 'ring-4 ring-white/60 dark:ring-slate-700 scale-[1.03]'
                      : 'hover:scale-[1.02]'
                  }`}
                >
                  {/* Glow overlays */}
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" />

                  {/* Top Section - Category Info */}
                  <button
                    onClick={() => handleCategoryClick(category.id)}
                    className="relative w-full p-7 text-white text-left"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
                          <span className="text-lg">{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-4xl font-extrabold drop-shadow-md">
                            {category.count}
                          </p>
                          <span className="text-xs uppercase tracking-[0.2em] text-white/80">
                            Devices
                          </span>
                        </div>
                      </div>
                      {expandedCategory === category.id && (
                        <div className="text-3xl drop-shadow-md">▼</div>
                      )}
                    </div>
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-white/30" />

                  {/* Bottom Section - Status Buttons */}
                  {category.id !== 'suspicious' && (
                    <div className="relative grid grid-cols-2 bg-black/20 backdrop-blur-md">
                      <button
                        onClick={() => {
                          setExpandedCategory(category.id);
                          setSelectedFilter('normal');
                        }}
                        className={`p-4 text-white transition ${
                          expandedCategory === category.id &&
                          selectedFilter === 'normal'
                            ? 'bg-white/15 shadow-inner'
                            : 'hover:bg-white/10'
                        } border-r border-white/25`}
                      >
                        <div className="flex flex-col items-center">
                          <div className="text-2xl mb-1">✓</div>
                          <div className="text-xl font-bold">
                            {category.normalCount}
                          </div>
                          <div className="text-[11px] uppercase tracking-wide">
                            Normal
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setExpandedCategory(category.id);
                          setSelectedFilter('tampered');
                        }}
                        className={`p-4 text-white transition ${
                          expandedCategory === category.id &&
                          selectedFilter === 'tampered'
                            ? 'bg-white/15 shadow-inner'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <div className="text-2xl mb-1">⚠️</div>
                          <div className="text-xl font-bold">
                            {category.tamperedCount}
                          </div>
                          <div className="text-[11px] uppercase tracking-wide">
                            Tampered
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* For Suspicious - single footer */}
                  {category.id === 'suspicious' && (
                    <div className="p-4 bg-black/25 backdrop-blur-md text-center text-white">
                      <p className="text-xs font-semibold tracking-wide uppercase">
                        Requires immediate attention
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Expanded Category Details */}
        {expandedCategory && activeCategory && (
          <section className="bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xl border border-slate-200/70 dark:border-slate-800/70 p-6 sm:p-7 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-2xl">{activeCategory.icon}</span>
                  <span>{activeCategory.name}</span>
                </h2>
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  Showing{' '}
                  <span className="font-semibold">
                    {selectedFilter === 'all'
                      ? 'all devices'
                      : selectedFilter === 'tampered'
                      ? 'tampered devices'
                      : 'normal devices'}
                  </span>{' '}
                  in this category (
                  <span className="font-semibold">
                    {getFilteredUsers(activeCategory).length}
                  </span>{' '}
                  devices)
                </p>
              </div>
              <button
                onClick={() => {
                  setExpandedCategory(null);
                  setSelectedFilter('all');
                }}
                className="self-start inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕ Close view
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredUsers(activeCategory).map((user) => (
                <article
                  key={user.id}
                  className={`group relative p-4 rounded-2xl border-2 transition shadow-sm hover:shadow-lg ${
                    user.tampered
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-base sm:text-lg">
                        {user.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {user.deviceId}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-[11px] rounded-full font-bold inline-flex items-center gap-1 ${
                        user.tampered
                          ? 'bg-rose-600 text-white shadow-sm animate-pulse'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {user.tampered ? '⚠️ TAMPERED' : '✓ NORMAL'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-3 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📍</span>
                      <span className="truncate">{user.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🏢</span>
                      <span className="truncate">{user.company}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedUser(user)}
                    className={`mt-2 w-full py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-white transition ${
                      user.tampered
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    View full device details →
                  </button>
                </article>
              ))}
            </div>

            {getFilteredUsers(activeCategory).length === 0 && (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No devices found under the current filters for this category.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Helper hint when nothing expanded */}
        {!expandedCategory && categories.length > 0 && (
          <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 text-center shadow-sm">
            <div className="text-3xl mb-2">💡</div>
            <p className="text-sm sm:text-base text-indigo-900 dark:text-indigo-100 font-medium">
              Select any category above and use the Normal / Tampered toggles to
              drill into specific devices.
            </p>
          </div>
        )}
      </main>

      {/* Toast container bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => {
              setSelectedUser(toast.userObj);
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }}
            className="max-w-xs cursor-pointer bg-white/95 dark:bg-slate-900/95 border border-rose-200 dark:border-rose-700 rounded-xl shadow-xl px-4 py-3 flex items-start gap-3 animate-slide-up"
          >
            <div className="mt-0.5 text-lg">⚠️</div>
            <div>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">
                Tampering alert detected
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {toast.deviceId}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {toast.location}
              </p>
              <p className="text-[11px] text-rose-500 dark:text-rose-300 mt-1">
                Click to open full device details.
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
