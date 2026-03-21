import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import UserDetailModal from './UserDetailModal';
import InstallPrompt from './InstallPrompt';
import { useMqttTamper } from '../hooks/useMqttTamper';


export default function Dashboard() {
  const {
    currentUser,
    getPendingUsers,
    approveUser,
    rejectUser,
  } = useAuth();
  const navigate = useNavigate();

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'tampered', 'normal'
  const [selectedUser, setSelectedUser] = useState(null);

  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [pendingActionLoading, setPendingActionLoading] = useState(null); // userId
  
  const [deviceStates, setDeviceStates] = useState({});
  const { devices: mqttDevices, connected: mqttConnected, lastUpdate } = useMqttTamper();

  // NEW: Add these states

  const [loading, setLoading] = useState(true);

  const currentRole = (currentUser?.role || 'USER').toUpperCase();

  const isUser = currentRole === 'USER';
  const isAdmin = currentRole === 'ADMIN';
  const isDistrictSuperAdmin = currentRole === 'DISTRICT_SUPER_ADMIN';
  const isLmOfficer = currentRole === 'LM_OFFICER';
  const isManufacturer = currentRole === 'MANUFACTURER';


  const [userDevices, setUserDevices] = useState({
  weighingMachine: [],
  fuelDispenser: [],
  energyMeter: [],
});

  useEffect(() => {
    if (!isAdmin || !getPendingUsers) return;

    const loadPending = async () => {
      setPendingLoading(true);
      setPendingError('');
      const res = await getPendingUsers('ADMIN');
      if (res.success) {
        setPendingUsers(res.data || []);
      } else {
        setPendingError(res.error || 'Failed to load pending users');
      }
      setPendingLoading(false);
    };

    loadPending();
  }, [isAdmin, getPendingUsers]);


  // RTDB Listener for tamper logs
useEffect(() => {
  const db = getDatabase();
  const logsRef = ref(db, 'tamper_logs');

  const unsub = onValue(logsRef, (snapshot) => {
    if (!snapshot.exists()) {
      setDeviceStates({});
      return;
    }

    const data = snapshot.val();
    const grouped = {};

    Object.entries(data).forEach(([logId, log]) => {
      const devId = log.device || 'UNKNOWN_DEVICE';
      if (!grouped[devId]) grouped[devId] = [];
      grouped[devId].push({ id: logId, ...log });
    });

    const next = {};
    Object.entries(grouped).forEach(([deviceId, logs]) => {
      logs.sort(
        (a, b) => Number(a.timestamp || a.id) - Number(b.timestamp || b.id)
      );
      const latest = logs[logs.length - 1];

      const isTampered =
        latest.alarm === true ||
        latest.type === 'tilt' ||
        latest.vibration_sensor === 1 ||
        latest.hall_sensor === 1;

      next[deviceId] = {
        latestLog: latest,
        tampered: isTampered,
      };
    });

    setDeviceStates(next);
  });

  return () => unsub();
}, []);


// Firestore Listener for all devices
// Dashboard.jsx - Fixed Firestore listener
// Replace the useEffect around line 95-170 with this:

// ✅ EMAIL-BASED MQTT FILTERING
useEffect(() => {
  if (!mqttDevices.length || !currentUser?.email) {
    setUserDevices({
      weighingMachine: [],
      fuelDispenser: [],
      energyMeter: [],
    });
    setLoading(false);
    return;
  }

  const isAdminEmail = currentUser.email === 'autonomousvehicle20@gmail.com';
  const isUserEmail = currentUser.email === 'socialmedia.panimalar@gmail.com';

  if (!isAdminEmail && !isUserEmail) {
    console.log('❌ Unauthorized email:', currentUser.email);
    setLoading(false);
    return;
  }

  let filteredDevices = mqttDevices;

  // ADMIN email: ALL devices
  // USER email: Filter by assigned devices
  if (isUserEmail) {
    const assignedDeviceIds = currentUser?.assignedDevices || [];
    filteredDevices = mqttDevices.filter(device =>
      assignedDeviceIds.includes(device.deviceId)
    );
  }

  // Group MQTT devices by type
  const groupedDevices = {
    weighingMachine: filteredDevices.filter(d => d.deviceType === 'weighingMachine'),
    fuelDispenser: filteredDevices.filter(d => d.deviceType === 'fuelDispenser'),
    energyMeter: filteredDevices.filter(d => d.deviceType === 'energyMeter'),
  };

  console.log('✅ EMAIL-BASED MQTT Dashboard:', {
    email: currentUser.email,
    isAdminEmail,
    isUserEmail,
    totalMqttDevices: mqttDevices.length,
    filteredDevices: filteredDevices.length,
    weighingMachine: groupedDevices.weighingMachine.length,
    fuelDispenser: groupedDevices.fuelDispenser.length,
    energyMeter: groupedDevices.energyMeter.length,
  });

  setUserDevices(groupedDevices);
  setLoading(false);
}, [mqttDevices, currentUser]);




  // ADMIN: fetch pending users
  useEffect(() => {
    if (!isAdmin || !getPendingUsers) return;

    const loadPending = async () => {
      setPendingLoading(true);
      setPendingError('');
      const res = await getPendingUsers('ADMIN');
      if (res.success) {
        setPendingUsers(res.data || []);
      } else {
        setPendingError(res.error || 'Failed to load pending users');
      }
      setPendingLoading(false);
    };

    loadPending();
  }, [isAdmin, getPendingUsers]);

  const handleApprove = async (userId) => {
    if (!approveUser) return;
    setPendingActionLoading(userId);
    const res = await approveUser(userId, currentUser.uid);
    if (res.success) {
      setPendingUsers((prev) => prev.filter((u) => u.uid !== userId));
    } else {
      alert(res.error || 'Failed to approve user');
    }
    setPendingActionLoading(null);
  };

  const handleReject = async (userId) => {
    if (!rejectUser) return;
    const reason = window.prompt('Enter rejection reason (optional):') || '';
    setPendingActionLoading(userId);
    const res = await rejectUser(userId, currentUser.uid, reason);
    if (res.success) {
      setPendingUsers((prev) => prev.filter((u) => u.uid !== userId));
    } else {
      alert(res.error || 'Failed to reject user');
    }
    setPendingActionLoading(null);
  }

  // USER VIEW
  if (isUser) {
  const myDevices = [
    ...userDevices.weighingMachine,
    ...userDevices.fuelDispenser,
    ...userDevices.energyMeter,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white truncate">
                My Dashboard
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                Welcome, {currentUser?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="hidden sm:inline-flex items-center px-3 py-2 rounded-full bg-indigo-600 text-xs sm:text-sm text-white font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.97] transition"
              >
                👤 Profile
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="hidden sm:inline-flex items-center px-3 py-2 rounded-full bg-slate-800 text-xs sm:text-sm text-white font-medium shadow-sm hover:bg-slate-900 active:scale-[0.97] transition"
              >
                ⚙️ Settings
              </button>
              <div className="sm:hidden">
                <InstallPrompt />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <section className="bg-white/90 dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl shadow-md sm:shadow-lg border border-slate-100/80 dark:border-slate-800/80 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white">
              My Devices
            </h2>
            <span className="text-[11px] sm:text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {myDevices.length} devices
            </span>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {myDevices.map((device, idx) => (
              <div
                key={device.id || idx}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/60 hover:bg-slate-50/80 dark:hover:bg-slate-900 transition"
              >
                <div className="space-y-0.5">
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                    {device.deviceType}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    ID: {device.deviceId}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Location: {device.location}
                  </p>
                </div>
                <span className="inline-flex items-center text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium self-start sm:self-auto">
                  {device.status || 'active'}
                </span>
              </div>
            ))}

            {myDevices.length === 0 && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No devices found yet. Your registered devices will appear here.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


  // DISTRICT SUPER ADMIN
  if (isDistrictSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white truncate">
                District Super Admin
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                Welcome, {currentUser?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="px-3 py-2 rounded-full bg-indigo-600 text-white text-xs sm:text-sm shadow-sm hover:bg-indigo-700 active:scale-[0.97] transition"
              >
                👤 Profile
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="px-3 py-2 rounded-full bg-slate-800 text-white text-xs sm:text-sm shadow-sm hover:bg-slate-900 active:scale-[0.97] transition"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <section className="bg-white/90 dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl shadow-md sm:shadow-lg border border-slate-100/80 dark:border-slate-800/80 p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Admins in your district
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2">
              Overview of admins and their open issues will appear here.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Summary cards and issue counts per admin will be implemented in
              this section.
            </p>
          </section>
        </main>
      </div>
    );
  }

  // LM OFFICER
  if (isLmOfficer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white truncate">
                LM Officer Overview
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                Welcome, {currentUser?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="px-3 py-2 rounded-full bg-indigo-600 text-white text-xs sm:text-sm shadow-sm hover:bg-indigo-700 active:scale-[0.97] transition"
              >
                👤 Profile
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="px-3 py-2 rounded-full bg-slate-800 text-white text-xs sm:text-sm shadow-sm hover:bg-slate-900 active:scale-[0.97] transition"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <section className="bg-white/90 dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl shadow-md sm:shadow-lg border border-slate-100/80 dark:border-slate-800/80 p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Districts and Super Admins
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2">
              This section will summarize issues per district and per District
              Super Admin.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Aggregate counts and severity-based issues will be added here.
            </p>
          </section>
        </main>
      </div>
    );
  }

  // MANUFACTURER
  if (isManufacturer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white truncate">
                Manufacturer NOC Dashboard
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                Welcome, {currentUser?.manufacturer_name || currentUser?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="px-3 py-2 rounded-full bg-indigo-600 text-white text-xs sm:text-sm shadow-sm hover:bg-indigo-700 active:scale-[0.97] transition"
              >
                👤 Profile
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="px-3 py-2 rounded-full bg-slate-800 text-white text-xs sm:text-sm shadow-sm hover:bg-slate-900 active:scale-[0.97] transition"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <section className="bg-white/90 dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl shadow-md sm:shadow-lg border border-slate-100/80 dark:border-slate-800/80 p-4 sm:p-6">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Alerts by Severity
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2">
              High-level view of CRITICAL / HIGH / MEDIUM / LOW alerts across
              all your devices.
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Severity-based alert cards and remote monitoring widgets will be
              implemented here.
            </p>
          </section>
        </main>
      </div>
    );
  }

  const mergeDeviceState = (list) =>
  list.map((device) => {
    const state = deviceStates[device.deviceId] || {};
    return {
      ...device,
      tampered: state.tampered ?? false,
      latestTamperLog: state.latestLog ?? null,
    };
  });

const weighingMachineUsers = mergeDeviceState(userDevices.weighingMachine);
const fuelDispenserUsers = mergeDeviceState(userDevices.fuelDispenser);
const energyMeterUsers = mergeDeviceState(userDevices.energyMeter);

  const allUsers = [
    ...weighingMachineUsers,
    ...fuelDispenserUsers,
    ...energyMeterUsers,
  ];
  const totalUsers = allUsers.length;

  const categories = [
    {
      id: 'all',
      name: 'Total Users',
      icon: '👥',
      color: 'from-purple-500 to-purple-600',
      count: totalUsers,
      users: allUsers,
      tamperedCount: allUsers.filter((u) => u.tampered).length,
      normalCount: allUsers.filter((u) => !u.tampered).length,
    },
    {
      id: 'weighingMachine',
      name: 'Weighing Machines',
      icon: '⚖️',
      color: 'from-blue-500 to-blue-600',
      count: weighingMachineUsers.length,
      users: weighingMachineUsers,
      tamperedCount: weighingMachineUsers.filter((u) => u.tampered).length,
      normalCount: weighingMachineUsers.filter((u) => !u.tampered).length,
    },
    {
      id: 'fuelDispenser',
      name: 'Fuel Dispensers',
      icon: '⛽',
      color: 'from-green-500 to-green-600',
      count: fuelDispenserUsers.length,
      users: fuelDispenserUsers,
      tamperedCount: fuelDispenserUsers.filter((u) => u.tampered).length,
      normalCount: fuelDispenserUsers.filter((u) => !u.tampered).length,
    },
    {
      id: 'energyMeter',
      name: 'Energy Meters',
      icon: '⚡',
      color: 'from-yellow-500 to-yellow-600',
      count: energyMeterUsers.length,
      users: energyMeterUsers,
      tamperedCount: energyMeterUsers.filter((u) => u.tampered).length,
      normalCount: energyMeterUsers.filter((u) => !u.tampered).length,
    },
  ];

  const getFilteredUsers = (category) => {
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

  console.log('=== DASHBOARD DEBUG ===');
console.log('currentUser:', currentUser);
console.log('currentUser.uid:', currentUser?.uid);
console.log('isAdmin:', isAdmin);
console.log('isUser:', isUser);
console.log('userDevices:', userDevices);
console.log('deviceStates:', deviceStates);
console.log('weighingMachineUsers:', weighingMachineUsers);
console.log('fuelDispenserUsers:', fuelDispenserUsers);
console.log('energyMeterUsers:', energyMeterUsers);
console.log('totalUsers:', totalUsers);
console.log('======================');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white truncate">
                LM Admin Dashboard
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                Welcome, {currentUser?.name}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => navigate('/profile')}
                className="px-3 py-2 rounded-full bg-indigo-600 text-white text-xs sm:text-sm shadow-sm hover:bg-indigo-700 active:scale-[0.97] transition"
              >
                👤 Profile
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="px-3 py-2 rounded-full bg-slate-800 text-white text-xs sm:text-sm shadow-sm hover:bg-slate-900 active:scale-[0.97] transition"
              >
                ⚙️ Settings
              </button>
              <div className="hidden sm:block">
                <InstallPrompt />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-8">
        {/* Pending user registrations */}
        <section className="bg-white/95 dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl shadow-md sm:shadow-lg border border-slate-100/80 dark:border-slate-800/80 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-slate-900 dark:text-white">
                Pending User Registrations
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Approve or reject new USER accounts awaiting admin approval.
              </p>
            </div>
            <span className="self-start sm:self-auto text-[11px] sm:text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {pendingUsers.length} pending
            </span>
          </div>

          {pendingLoading && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Loading pending users...
            </p>
          )}

          {pendingError && (
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mb-2">
              {pendingError}
            </p>
          )}

          {!pendingLoading && pendingUsers.length === 0 && !pendingError && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              No pending user registrations.
            </p>
          )}

          {!pendingLoading && pendingUsers.length > 0 && (
            <div className="space-y-3">
              {pendingUsers.map((u) => (
                <div
                  key={u.uid}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/60 hover:border-indigo-200 dark:hover:border-indigo-500/60 transition"
                >
                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                      {u.name || 'Unnamed User'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                      {u.email} • Role: {u.role} • Status: {u.status}
                    </p>
                    <p
                      className="text-[11px] text-slate-500 dark:text-slate-500"
                      title={u.createdAt}
                    >
                      Created at: {u.createdAt}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleApprove(u.uid)}
                      disabled={pendingActionLoading === u.uid}
                      className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm rounded-full bg-emerald-600 text-white font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-60 active:scale-[0.97] transition"
                    >
                      {pendingActionLoading === u.uid
                        ? 'Approving...'
                        : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(u.uid)}
                      disabled={pendingActionLoading === u.uid}
                      className="flex-1 sm:flex-none px-3 py-2 text-xs sm:text-sm rounded-full bg-rose-600 text-white font-medium shadow-sm hover:bg-rose-700 disabled:opacity-60 active:scale-[0.97] transition"
                    >
                      {pendingActionLoading === u.uid
                        ? 'Rejecting...'
                        : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Category cards */}
        <section className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category) => (
            <div key={category.id}>
              <div
                className={`bg-gradient-to-br ${category.color} rounded-2xl shadow-md sm:shadow-lg overflow-hidden transition-transform ${
                  expandedCategory === category.id
                    ? 'ring-4 ring-white/60 scale-[1.02]'
                    : 'hover:scale-[1.02]'
                }`}
              >
                <button
                  onClick={() => handleCategoryClick(category.id)}
                  className="w-full p-4 sm:p-5 text-left text-white"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-3xl sm:text-4xl mb-1">
                        {category.icon}
                      </div>
                      <div className="text-2xl sm:text-3xl font-extrabold leading-tight">
                        {category.count}
                      </div>
                      <div className="text-xs sm:text-sm opacity-90">
                        {category.name}
                      </div>
                    </div>
                    {expandedCategory === category.id && (
                      <div className="text-xl sm:text-2xl mt-1">▼</div>
                    )}
                  </div>
                </button>

                <div className="h-px bg-white/40" />

                <div className="grid grid-cols-2 bg-white/15 text-white">
                  <button
                    onClick={() => {
                      setExpandedCategory(category.id);
                      setSelectedFilter('normal');
                    }}
                    className={`p-3 sm:p-4 text-center border-r border-white/30 text-xs sm:text-sm ${
                      expandedCategory === category.id &&
                      selectedFilter === 'normal'
                        ? 'bg-white/30 font-semibold'
                        : 'hover:bg-white/20'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg sm:text-xl">✓</span>
                      <span className="text-base sm:text-lg font-bold">
                        {category.normalCount}
                      </span>
                      <span className="text-[10px] sm:text-xs">Normal</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setExpandedCategory(category.id);
                      setSelectedFilter('tampered');
                    }}
                    className={`p-3 sm:p-4 text-center text-xs sm:text-sm ${
                      expandedCategory === category.id &&
                      selectedFilter === 'tampered'
                        ? 'bg-white/30 font-semibold'
                        : 'hover:bg-white/20'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg sm:text-xl">⚠️</span>
                      <span className="text-base sm:text-lg font-bold">
                        {category.tamperedCount}
                      </span>
                      <span className="text-[10px] sm:text-xs">Tampered</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Expanded category details */}
{expandedCategory && (
  <section className="bg-white/95 dark:bg-slate-900/95 rounded-2xl sm:rounded-3xl shadow-md sm:shadow-lg border border-slate-100/80 dark:border-slate-800/80 p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4">
      Device cards and details for <strong>{expandedCategory}</strong>{' '}
      will appear here.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {getFilteredUsers(
        categories.find((c) => c.id === expandedCategory)
      ).map((u) => (
        <button
          key={u.uid}
          onClick={() => setSelectedUser(u)}
          className="flex flex-col items-start text-left gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 p-3 sm:p-4 hover:border-indigo-200 dark:hover:border-indigo-500/70 hover:bg-white dark:hover:bg-slate-900 transition"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate w-full">
            {u.name || 'User'}
          </div>
          <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 truncate w-full">
            {u.deviceId || u.email}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                u.tampered
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
              }`}
            >
              {u.tampered ? 'Tampered' : 'Normal'}
            </span>
            {u.location && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {u.location}
              </span>
            )}
          </div>

          {u.latestTamperLog && (
            <div className="mt-2 w-full rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                Live tamper data
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Type: {u.latestTamperLog.type} | Alarm:{' '}
                {u.latestTamperLog.alarm ? 'ON' : 'OFF'}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Pitch: {u.latestTamperLog.pitch}° | Roll:{' '}
                {u.latestTamperLog.roll}°
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Hall: {u.latestTamperLog.hall_sensor} | Vib:{' '}
                {u.latestTamperLog.vibration_sensor}
              </p>
              {'weight' in u.latestTamperLog && (
                <p className="text-[11px] text-slate-900 dark:text-slate-100 font-semibold">
                  Weight: {u.latestTamperLog.weight} kg
                </p>
              )}
            </div>
          )}
        </button>
      ))}
    </div>
  </section>
        )}

        {!expandedCategory && (
          <section className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center">
            <div className="text-3xl sm:text-4xl mb-2">💡</div>
            <p className="text-sm sm:text-lg text-indigo-900 dark:text-indigo-200 font-medium mb-1 sm:mb-2">
              Tap any card above to explore devices
            </p>
            <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300">
              Then filter by "Normal" or "Tampered" status to focus on specific
              devices.
            </p>
          </section>
        )}
      </main>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
