    import { useState, useEffect, useRef, useMemo } from 'react';
    import { useAuth } from '../context/AuthContext';
    import { getSensorData } from '../data/mockSensorData';
    import Navbar from './Navbar';
    import { useMqttTamper } from '../hooks/useMqttTamper';



    export default function Home() {
      const [loading, setLoading] = useState(true);
      const { currentUser } = useAuth();
      const { devices: mqttDevices, connected: mqttConnected, lastUpdate } = useMqttTamper();

      const [logs, setLogs] = useState([]);
      const [userDevices, setUserDevices] = useState([]);
      const [selectedDevice, setSelectedDevice] = useState(null);
      const [sensorDataMap, setSensorDataMap] = useState({});
      const [showNotifications, setShowNotifications] = useState(false);

      const [toasts, setToasts] = useState([]);
      const [blockedDevices, setBlockedDevices] = useState([]);

      const seenTamperedIdsRef = useRef(new Set());

      const deviceActivityRef = useRef(new Map()); // Track last activity time
      const knownDevicesRef = useRef(new Set());   // Track all seen device names

      // Role detection
      const currentRole = useMemo(() => (currentUser?.role || 'USER').toUpperCase(), [currentUser?.role]);
      const isAdmin = useMemo(() => currentRole === 'ADMIN', [currentRole]);
      const isUser = useMemo(() => currentRole === 'USER', [currentRole]);
      const isDistrictSuperAdmin = useMemo(() => currentRole === 'DISTRICT_SUPER_ADMIN', [currentRole]);
      const isLmOfficer = useMemo(() => currentRole === 'LM_OFFICER', [currentRole]);
      const isManufacturer = useMemo(() => currentRole === 'MANUFACTURER', [currentRole]);

      // ✅ DEDUPLICATION: Add these states
      const [uniqueDevices, setUniqueDevices] = useState([]);
      const uniqueDevicesMap = useRef(new Map());

      const [todayTamperLogs, setTodayTamperLogs] = useState(() => {
        const stored = localStorage.getItem('todayTamperLogs');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const today = new Date().toDateString();
            if (parsed.date === today) {
              console.log(`📋 Restored ${parsed.logs.length} tamper logs from today`);
              return parsed.logs;
            }
          } catch (e) {
            console.error('Failed to parse stored logs:', e);
          }
        }
        return [];
      });

      useEffect(() => {
  const tamperCount = new Map();

  todayTamperLogs.forEach((log) => {
    const id = log.device;
    tamperCount.set(id, (tamperCount.get(id) || 0) + 1);
  });

  const blocked = userDevices
    .filter((d) => tamperCount.get(d.deviceId) >= 3)
    .map((d) => ({
      deviceId: d.deviceId,
      location: d.location || 'Unknown',
      lastSeen: d.lastSeen,
      status: 'BLOCKED',
    }));

  setBlockedDevices(blocked);
}, [todayTamperLogs, userDevices]);

      // ✅ DEDUPLICATION: Process raw MQTT data into unique devices
      useEffect(() => {
        // Add safety check
        if (!mqttDevices || !Array.isArray(mqttDevices)) {
          console.log('⚠️ mqttDevices is not an array yet:', mqttDevices);
          return;
        }

        if (mqttDevices.length === 0) {
          if (uniqueDevices.length > 0) {
            setUniqueDevices([]);
            uniqueDevicesMap.current.clear();
          }
          return;
        }

        const deviceMap = new Map();
        const now = Date.now();
        const ACTIVITY_TIMEOUT = 30000;

        mqttDevices.forEach((rawDevice) => {
          const deviceKey = rawDevice.device || rawDevice.deviceId;
          if (!deviceKey) return;

          const isNewDevice = !knownDevicesRef.current.has(deviceKey);
          if (isNewDevice) {
            knownDevicesRef.current.add(deviceKey);
            console.log(`🎉 NEW DEVICE DETECTED: ${deviceKey}`);
          }

          deviceActivityRef.current.set(deviceKey, now);

          const existing = deviceMap.get(deviceKey);
          if (!existing || rawDevice.timestamp > existing.timestamp) {
            const isTampered = rawDevice.alarm ||
              rawDevice['tamper_metrics']?.any ||
              rawDevice.buzzer === 'on' || // ✅ Fixed: lowercase 'on'
              rawDevice['tamper_metrics']?.tilt ||
              rawDevice['tamper_metrics']?.magnetic ||
              rawDevice['tamper_metrics']?.vibration;

            deviceMap.set(deviceKey, {
              ...rawDevice,
              deviceId: deviceKey,
              id: deviceKey,
              lastSeen: now,
              tampered: isTampered,
              status: rawDevice.system || 'normal',
              deviceType: 'weighingMachine',
              location: rawDevice.location || 'ESP32 Live Feed',
              isActive: true,
              isNew: isNewDevice
            });
          }
        });

        uniqueDevicesMap.current.forEach((device, deviceKey) => {
          if (!deviceMap.has(deviceKey) && (now - (deviceActivityRef.current.get(deviceKey) || 0)) > ACTIVITY_TIMEOUT) {
            deviceMap.set(deviceKey, {
              ...device,
              isActive: false,
              lastSeen: deviceActivityRef.current.get(deviceKey) || now
            });
          }
        });
        const dedupedDevices = Array.from(deviceMap.values());
        const hasChanged =
          dedupedDevices.length !== uniqueDevices.length ||
          dedupedDevices.some((newDev, idx) => {
            const oldDev = uniqueDevices[idx];
            return !oldDev ||
              newDev.deviceId !== oldDev.deviceId ||
              newDev.tampered !== oldDev.tampered ||
              newDev.isActive !== oldDev.isActive ||
              newDev.timestamp !== oldDev.timestamp; // ✅ Added timestamp check
          });

        if (hasChanged) {
          setUniqueDevices(dedupedDevices);
          uniqueDevicesMap.current = deviceMap;
          console.log(`📊 Devices: ${dedupedDevices.length} total | ${dedupedDevices.filter(d => d.isActive).length} active | ${dedupedDevices.filter(d => d.tampered).length} tampered`);
        }
      }, [mqttDevices]);
      // ✅ UPDATE: Use uniqueDevices instead of mqttDevices
      const tamperedDevices = useMemo(
        () => userDevices.filter((d) => d.tampered || d.alarm || d['tamper_metrics']?.any),
        [userDevices]
      );

      useEffect(() => {
        const seen = seenTamperedIdsRef.current;
        const newlyTampered = tamperedDevices.filter(
          (d) => d.tampered && !seen.has(d.id)
        );

        if (newlyTampered.length) {
          const now = Date.now();
          const newToasts = newlyTampered.map((d, idx) => {
            seen.add(d.id);
            return {
              id: `${d.id}-${now}-${idx}`,
              deviceId: d.deviceId,
              location: d.location || 'Unknown',
              deviceObj: d,
            };
          });
          setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
        }
      }, [tamperedDevices]);

      useEffect(() => {
        if (!toasts.length) return;
        const timer = setTimeout(() => {
          setToasts((prev) => prev.slice(0, prev.length - 1));
        }, 6000);
        return () => clearTimeout(timer);
      }, [toasts]);

      // ✅ UPDATE: Filter uniqueDevices instead of mqttDevices
      // ✅ FINAL FIX - Show ALL MQTT devices to both emails
     useEffect(() => {
  if (!uniqueDevices.length || !currentUser?.role) {
    setUserDevices([]);
    setLoading(false);
    return;
  }

  const role = (currentUser.role || '').toUpperCase();
  const allowed =
    role === 'ADMIN' ||
    role === 'USER' ||
    role === 'DISTRICT_SUPER_ADMIN' ||
    role === 'LM_OFFICER';

  if (!allowed) {
    console.log('❌ Unauthorized role for MQTT devices:', role);
    setUserDevices([]);
    setLoading(false);
    return;
  }

  const filteredDevices = uniqueDevices;

  console.log('✅ LIVE MQTT DATA - Showing ALL devices for role:', {
    role,
    totalDevices: filteredDevices.length,
    deviceIds: filteredDevices.map((d) => d.deviceId),
  });

  setUserDevices(filteredDevices);
  setLoading(false);
}, [uniqueDevices, currentUser]);



      useEffect(() => {
        if (!userDevices.length) return;

        const today = new Date().toDateString();

        // Find currently tampered devices
        const currentlyTampered = userDevices.filter(device => device.tampered);

        currentlyTampered.forEach((device) => {
          if (device.lastSeen) {
            const deviceDate = new Date(device.lastSeen);
            const logDate = deviceDate.toDateString();

            // Only process if from today
            if (logDate === today) {
              const time = new Date(device.lastSeen);

              // Create unique log ID
              const logId = `log-${device.deviceId}-${device.timestamp || time.getTime()}`;

              // Check if this exact log already exists
              const exists = todayTamperLogs.some(log => log.id === logId);

              if (!exists) {
                // Determine tamper type
                let tamperType = 'Unknown';
                if (device.latestTamperLog?.tamper_metrics) {
                  const metrics = device.latestTamperLog.tamper_metrics;
                  if (metrics.tilt) tamperType = 'Tilt';
                  else if (metrics.magnetic) tamperType = 'Magnetic';
                  else if (metrics.vibration) tamperType = 'Vibration';
                } else if (device.buzzer === 'on' || device.buzzer === 'ON') {
                  tamperType = 'Buzzer Active';
                }

                const newLog = {
                  id: logId,
                  time: time.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }),
                  timestamp: time.getTime(),
                  device: device.deviceId,
                  user: device.name || 'Unknown',
                  action: '🚨 TAMPER DETECTED',
                  value: (() => {
  // Try multiple weight field paths
  const weightData = device.latestTamperLog?.weight || 
                    device.weight || 
                    device.latestTamperLog?.weightData ||
                    deviceData?.weight;

                    if (weightData?.value !== undefined && weightData.unit) {
    return `${weightData.value} ${weightData.unit}`;
  }
  
  // Fallback: show tamper type if no weight
  if (tamperType !== 'Unknown') {
    return `${tamperType} Detected`;
  }
  
  return 'Tamper Event';
})(),
                  status: 'error',
                  tamperType: tamperType,
                  location: device.location || 'Unknown',
                  date: logDate,
                  fullDate: time.toLocaleDateString('en-IN'),
                  deviceData: device.latestTamperLog
                };

                // Add to logs
                setTodayTamperLogs(prev => {
                  const updated = [...prev, newLog];

                  // Save to localStorage
                  localStorage.setItem('todayTamperLogs', JSON.stringify({
                    date: today,
                    logs: updated
                  }));

                  console.log(`🚨 New tamper event logged: ${device.deviceId} at ${newLog.time}`);
                  return updated;
                });
              }
            }
          }
        });
      }, [userDevices, todayTamperLogs]);

      useEffect(() => {
        const checkAndClearOldLogs = () => {
          const stored = localStorage.getItem('todayTamperLogs');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              const today = new Date().toDateString();

              if (parsed.date !== today) {
                console.log('🗑️ Clearing old tamper logs from previous day');
                localStorage.removeItem('todayTamperLogs');
                setTodayTamperLogs([]);
              }
            } catch (e) {
              console.error('Failed to check old logs:', e);
            }
          }
        };

        checkAndClearOldLogs();
        const interval = setInterval(checkAndClearOldLogs, 60000); // Check every minute

        return () => clearInterval(interval);
      }, []);

      useEffect(() => {
        const sortedLogs = [...todayTamperLogs].sort((a, b) => b.timestamp - a.timestamp);
        setLogs(sortedLogs);

        if (sortedLogs.length > 0) {
          console.log(`📊 Displaying ${sortedLogs.length} tamper logs from today`);
        }
      }, [todayTamperLogs]);

      const clearTodayLogs = () => {
        if (window.confirm('Are you sure you want to clear all today\'s tamper logs?')) {
          localStorage.removeItem('todayTamperLogs');
          setTodayTamperLogs([]);
          console.log('🗑️ Tamper logs cleared manually');
        }
      };


      // ✅ UPDATE: Fix stats calculation
      const stats = useMemo(() => ({
        totalDevices: userDevices.length,
        activeDevices: userDevices.filter(d => d.status === 'active' || d.status === 'normal').length,
        tamperedDevices: userDevices.filter(d => d.tampered).length,
        todayTransactions: Math.round(userDevices.length * 2.5),
      }), [userDevices]);

      const weighingDevices = userDevices.filter(
        (d) => (d.deviceType || 'weighingMachine') === 'weighingMachine'
      );
      const fuelDevices = userDevices.filter(
        (d) => d.deviceType === 'fuelDispenser'
      );
      const energyDevices = userDevices.filter(
        (d) => d.deviceType === 'energyMeter'
      );

      const DeviceDetailModal = ({ device, onClose }) => {
        const sensorData = sensorDataMap[device.id];

        if (!sensorData) return null;

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-6 rounded-t-2xl flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold mb-1 break-all">
                    {device.deviceId}
                  </h2>
                  <p className="text-indigo-100 text-xs sm:text-sm truncate">
                    {device.location}
                  </p>
                  <p className="text-[11px] sm:text-xs text-indigo-200 mt-1">
                    Type: {device.deviceType || 'weighingMachine'}
                  </p>
                  {device.latestTamperLog && device.latestTamperLog.weight && (
                    <p className="text-[11px] sm:text-xs text-indigo-200 mt-1">
                      Live Weight: {device.latestTamperLog.weight.value} {device.latestTamperLog.weight.unit}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 text-white hover:bg-white/20 rounded-full p-2 transition"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {/* Live MQTT Data */}
                {device.latestTamperLog && (
                  <div className="mb-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-blue-200/70 dark:border-blue-800/60">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                      <span className="text-xl">📡</span>
                      <span>Live MQTT Data</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${mqttConnected
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${mqttConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        {mqttConnected ? 'Connected' : 'Offline'}
                      </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {device.latestTamperLog.weight && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Weight</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {device.latestTamperLog.weight.value} {device.latestTamperLog.weight.unit}
                          </p>
                        </div>
                      )}

                      {device.latestTamperLog.hall && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Hall Sensor</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-white">
                            {device.latestTamperLog.hall.status} ({device.latestTamperLog.hall.raw})
                          </p>
                        </div>
                      )}

                      {device.latestTamperLog.vibration && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Vibration</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-white">
                            {device.latestTamperLog.vibration.status} ({device.latestTamperLog.vibration.raw})
                          </p>
                        </div>
                      )}

                      {device.latestTamperLog.orientation && (
                        <>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pitch</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">
                              {device.latestTamperLog.orientation.pitch?.toFixed(1)}°
                            </p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Roll</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white">
                              {device.latestTamperLog.orientation.roll?.toFixed(1)}°
                            </p>
                          </div>
                        </>
                      )}

                      {device.latestTamperLog.system && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">System Status</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-white">
                            {device.latestTamperLog.system}
                          </p>
                        </div>
                      )}

                      {device.latestTamperLog.buzzer && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Buzzer</p>
                          <p className={`text-lg font-bold ${device.latestTamperLog.buzzer === 'ON'
                              ? 'text-red-600 dark:text-red-400 animate-pulse'
                              : 'text-green-600 dark:text-green-400'
                            }`}>
                            {device.latestTamperLog.buzzer}
                          </p>
                        </div>
                      )}
                    </div>

                    {device.lastSeen && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                        Last update: {new Date(device.lastSeen).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Mock Sensor Data Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Load Cell */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-blue-200/70 dark:border-blue-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.loadCell.icon}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide ${sensorData.loadCell.status === 'alert'
                            ? 'bg-red-500 text-white'
                            : 'bg-green-500 text-white'
                          }`}
                      >
                        {sensorData.loadCell.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      {sensorData.loadCell.name}
                    </h3>
                    <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                      {sensorData.loadCell.value} {sensorData.loadCell.unit}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Max: {sensorData.loadCell.maxCapacity} {sensorData.loadCell.unit}
                    </p>
                  </div>

                  {/* MPU6050 */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-purple-200/70 dark:border-purple-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.mpu6050.icon}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                        {sensorData.mpu6050.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2 text-sm sm:text-base">
                      {sensorData.mpu6050.name}
                    </h3>
                    <div className="space-y-1 text-[11px] sm:text-xs">
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Accel:</strong> X: {sensorData.mpu6050.acceleration.x},{' '}
                        Y: {sensorData.mpu6050.acceleration.y}, Z:{' '}
                        {sensorData.mpu6050.acceleration.z}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Gyro:</strong> X: {sensorData.mpu6050.gyroscope.x},{' '}
                        Y: {sensorData.mpu6050.gyroscope.y}, Z:{' '}
                        {sensorData.mpu6050.gyroscope.z}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Temp:</strong> {sensorData.mpu6050.temperature}°C
                      </p>
                    </div>
                  </div>

                  {/* Hall Sensor */}
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-pink-200/70 dark:border-pink-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.hallSensor.icon}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide ${sensorData.hallSensor.status === 'alert'
                            ? 'bg-red-500 text-white'
                            : 'bg-green-500 text-white'
                          }`}
                      >
                        {sensorData.hallSensor.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      {sensorData.hallSensor.name}
                    </h3>
                    <p className="text-2xl sm:text-3xl font-extrabold text-pink-600 dark:text-pink-400">
                      {sensorData.hallSensor.value} {sensorData.hallSensor.unit}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Threshold: {sensorData.hallSensor.threshold}{' '}
                      {sensorData.hallSensor.unit}
                    </p>
                  </div>

                  {/* LDR */}
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-yellow-200/70 dark:border-yellow-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.ldr.icon}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                        {sensorData.ldr.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      {sensorData.ldr.name}
                    </h3>
                    <p className="text-2xl sm:text-3xl font-extrabold text-yellow-600 dark:text-yellow-400">
                      {sensorData.ldr.value} {sensorData.ldr.unit}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Light Level: {sensorData.ldr.lightLevel}
                    </p>
                  </div>

                  {/* ADS1115 */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-green-200/70 dark:border-green-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.ads1115.icon}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                        {sensorData.ads1115.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2 text-sm sm:text-base">
                      {sensorData.ads1115.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      {sensorData.ads1115.channels.map((ch, i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-slate-800 rounded-lg p-2"
                        >
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Ch{i}
                          </p>
                          <p className="font-bold text-gray-800 dark:text-white">
                            {ch}V
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-2">
                      Resolution: {sensorData.ads1115.resolution}
                    </p>
                  </div>

                  {/* Voltage */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-red-200/70 dark:border-red-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.voltage.icon}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                        {sensorData.voltage.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      {sensorData.voltage.name}
                    </h3>
                    <p className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400">
                      {sensorData.voltage.value} {sensorData.voltage.unit}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Type: {sensorData.voltage.type}
                    </p>
                  </div>

                  {/* RTC */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-indigo-200/70 dark:border-indigo-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.rtc.icon}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                        {sensorData.rtc.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      {sensorData.rtc.name}
                    </h3>
                    <p className="text-xs sm:text-sm font-mono text-indigo-700 dark:text-indigo-300 mb-1">
                      {sensorData.rtc.time}
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
                      Temp: {sensorData.rtc.temperature}°C | Accuracy:{' '}
                      {sensorData.rtc.accuracy}
                    </p>
                  </div>

                  {/* Buzzer */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-orange-200/70 dark:border-orange-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.buzzer.icon}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide ${sensorData.buzzer.state === 'active'
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-gray-500 text-white'
                          }`}
                      >
                        {sensorData.buzzer.state}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      {sensorData.buzzer.name}
                    </h3>
                    <p className="text-xl sm:text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                      {sensorData.buzzer.voltage}V
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Last: {sensorData.buzzer.lastTriggered}
                    </p>
                  </div>

                  {/* GSM */}
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-teal-200/70 dark:border-teal-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.gsm.icon}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                        {sensorData.gsm.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1 text-sm sm:text-base">
                      {sensorData.gsm.name}
                    </h3>
                    <p className="text-2xl sm:text-3xl font-extrabold text-teal-600 dark:text-teal-400">
                      {sensorData.gsm.signal}/31
                    </p>
                    <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {sensorData.gsm.operator} | Quality:{' '}
                      {sensorData.gsm.signalQuality}
                    </p>
                  </div>

                  {/* GPS */}
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-3 sm:p-4 border border-cyan-200/70 dark:border-cyan-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl sm:text-2xl">
                        {sensorData.gps.icon}
                      </span>
                      <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                        {sensorData.gps.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-2 text-sm sm:text-base">
                      {sensorData.gps.name}
                    </h3>
                    <div className="space-y-1 text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                      <p>
                        <strong>Lat:</strong> {sensorData.gps.latitude}°
                      </p>
                      <p>
                        <strong>Lon:</strong> {sensorData.gps.longitude}°
                      </p>
                      <p>
                        <strong>Alt:</strong> {sensorData.gps.altitude}m |{' '}
                        <strong>Sats:</strong> {sensorData.gps.satellites}
                      </p>
                      <p>
                        <strong>Accuracy:</strong> {sensorData.gps.accuracy}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 p-3 sm:p-4 rounded-b-2xl">
                <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 text-center">
                  Last updated:{' '}
                  {new Date(sensorData.timestamp).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        );
      };

      if (isManufacturer) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-black dark:via-slate-900 dark:to-slate-950">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 break-words">
                  Welcome back, {currentUser?.name}! 👋
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                  This Home view is reserved for device-level monitoring for
                  Users and Admins. Your role has access to higher-level
                  dashboards for district and fleet-wide analytics.
                </p>
              </div>
              <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/70 rounded-2xl p-4 sm:p-6 shadow-sm">
                <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  As a{' '}
                  <span className="font-semibold break-words">
                    {currentRole}
                  </span>
                  , your workflow focuses on aggregated issues, escalations and
                  compliance metrics rather than individual device streams.
                </p>
              </div>
            </main>
          </div>
        );
      }

      if (loading) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-black dark:via-slate-900 dark:to-slate-950">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-300">Loading your devices...</p>
                </div>
              </div>
            </main>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-black dark:via-slate-900 dark:to-slate-950">
          <Navbar />

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Header + notification bell */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] sm:tracking-[0.2em] text-indigo-500 dark:text-indigo-300 mb-1 flex items-center gap-2">
                  Live Device Overview
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${mqttConnected
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${mqttConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    MQTT {mqttConnected ? 'Connected' : 'Offline'}
                  </span>
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-1 break-words">
                  Welcome back, {isAdmin ? 'Officer ' : ''}
                  {currentUser?.name}! 👋
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-xl">
                  {isAdmin
                    ? 'Monitor all connected devices for anomalies, tampering and health in real-time via MQTT.'
                    : 'Keep track of your registered devices, current activity and any tampering alerts from live MQTT data.'}
                </p>
              </div>

              <button
  className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600"
  onClick={() => handleUnlockDevice(d.deviceId)}
>
  Unlock
</button>


              {/* Blocked devices – only for DISTRICT_SUPER_ADMIN */}
{isDistrictSuperAdmin && blockedDevices.length > 0 && (
  <div className="mt-6 bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xl p-4 sm:p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>🔒</span>
        <span>Blocked Devices (Auto Tamper Protection)</span>
      </h3>
      {/* in future you can make this open a modal instead of inline list */}
      <button
        className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs sm:text-sm font-semibold hover:bg-indigo-700"
        onClick={() => {
          // placeholder: can open modal if you want
        }}
      >
        View devices
      </button>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
              Device ID
            </th>
            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
              Location
            </th>
            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
              Last Seen
            </th>
            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
              Status
            </th>
            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {blockedDevices.map((d) => (
            <tr
              key={d.deviceId}
              className="border-b border-slate-100 dark:border-slate-800"
            >
              <td className="py-2 sm:py-3 px-2 sm:px-4 font-mono text-gray-800 dark:text-gray-200 whitespace-nowrap">
                {d.deviceId}
              </td>
              <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {d.location}
              </td>
              <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {d.lastSeen
                  ? new Date(d.lastSeen).toLocaleString('en-IN')
                  : 'N/A'}
              </td>
              <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                  {d.status}
                </span>
              </td>
              <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap space-x-2">
                <button
                  className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  // disabled because system is auto-blocked at electrical side
                  disabled
                  title="Locked automatically by system"
                >
                  Locked
                </button>
                <button
                  className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600"
                  onClick={() => {
                    // TODO: call API / MQTT command to unlock this device
                    console.log('Request unlock for device', d.deviceId);
                  }}
                >
                  Unlock
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

              <div className="relative self-start md:self-auto">
                <button
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition transform"
                  title="Tampering notifications"
                >
                  <span className="text-lg sm:text-xl">🔔</span>
                  {tamperedDevices.length > 0 && (
                    <>
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center shadow-lg">
                        {tamperedDevices.length > 9
                          ? '9+'
                          : tamperedDevices.length}
                      </span>
                      <span className="absolute -top-1.5 -right-1.5 inline-flex h-6 w-6 rounded-full bg-red-500/60 opacity-75 animate-ping" />
                    </>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-3 w-72 sm:w-80 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/70 dark:border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">🚨</span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Tampered devices
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                              Only devices with tampering indicators are listed.
                            </p>
                          </div>
                        </div>
                        <span className="flex-shrink-0 text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                          {tamperedDevices.length}
                        </span>
                      </div>

                      <div className="max-h-72 overflow-y-auto">
                        {tamperedDevices.length === 0 ? (
                          <div className="px-4 py-6 text-center text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                            No tampering alerts right now. Your devices look
                            healthy.
                          </div>
                        ) : (
                          tamperedDevices.map((device) => (
                            <button
                              key={device.id}
                              onClick={() => {
                                setSelectedDevice(device);
                                setShowNotifications(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-start gap-3 text-[11px] sm:text-xs"
                            >
                              <span className="mt-0.5 text-sm">⚠️</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                  {device.deviceId}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 truncate">
                                  {device.location}
                                </p>
                                {device.latestTamperLog && device.latestTamperLog.weight && (
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                                    Weight: {device.latestTamperLog.weight.value} {device.latestTamperLog.weight.unit}
                                  </p>
                                )}
                                <p className="text-[10px] text-rose-500 dark:text-rose-300 mt-0.5">
                                  Tampering indicator detected. Tap to open full
                                  sensor view.
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
            </div>

            {/* Stats cards */}
            {(isAdmin || isUser) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-800 to-indigo-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="text-2xl sm:text-3xl mb-1">📊</div>
                    <div className="text-2xl sm:text-3xl font-extrabold">
                      {stats.totalDevices}
                    </div>
                    <div className="text-[11px] sm:text-xs opacity-90 mt-1">
                      Total devices
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="text-2xl sm:text-3xl mb-1">✓</div>
                    <div className="text-2xl sm:text-3xl font-extrabold">
                      {stats.activeDevices}
                    </div>
                    <div className="text-[11px] sm:text-xs opacity-90 mt-1">
                      Active devices
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 to-red-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="text-2xl sm:text-3xl mb-1">⚠️</div>
                    <div className="text-2xl sm:text-3xl font-extrabold">
                      {stats.tamperedDevices}
                    </div>
                    <div className="text-[11px] sm:text-xs opacity-90 mt-1">
                      Tampered devices
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="text-2xl sm:text-3xl mb-1">📈</div>
                    <div className="text-2xl sm:text-3xl font-extrabold">
                      {stats.todayTransactions}
                    </div>
                    <div className="text-[11px] sm:text-xs opacity-90 mt-1">
                      Today&apos;s transactions
                    </div>
                  </div>
                </div>
              </div>
              )}

            {/* My Devices cards (user) */}
            {isLmOfficer && !isManufacturer && !isDistrictSuperAdmin && !isUser && !isAdmin && userDevices.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🔧</span>
                  <span>My Devices (Live MQTT)</span>
                </h3>

                {weighingDevices.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>⚖️</span>
                      <span>Weighing Machines ({weighingDevices.length}) - Live MQTT</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${mqttConnected
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${mqttConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                          }`} />
                        {mqttConnected ? 'Live' : 'Offline'}
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {weighingDevices.map((device) => (
                        <div
                          key={device.id}
                          className={`bg-white/95 dark:bg-slate-900/95 rounded-xl p-4 sm:p-5 shadow-lg border-2 transition hover:shadow-xl hover:-translate-y-0.5 ${device.tampered
                              ? 'border-red-500/80 dark:border-red-700'
                              : 'border-emerald-500/80 dark:border-emerald-700'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div className="min-w-0">
                              <h5 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base break-all">
                                {device.deviceId}
                              </h5>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                                {device.location}
                              </p>
                            </div>
                            <span
                              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] rounded-full font-bold whitespace-nowrap ${device.tampered
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : 'bg-emerald-600 text-white'
                                }`}
                            >
                              {device.tampered ? '⚠️ ALERT' : '✓ OK'}
                            </span>
                          </div>

                          {device.latestTamperLog && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              {device.latestTamperLog.weight && (
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                    Weight
                                  </p>
                                  <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                    {device.latestTamperLog.weight.value}{' '}
                                    {device.latestTamperLog.weight.unit}
                                  </p>
                                </div>
                              )}
                              {device.latestTamperLog.system && (
                                <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                    System
                                  </p>
                                  <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                    {device.latestTamperLog.system}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {device.lastSeen && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
                              Last: {new Date(device.lastSeen).toLocaleTimeString()}
                            </p>
                          )}

                          <button
                            onClick={() => setSelectedDevice(device)}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs sm:text-sm font-semibold transition"
                          >
                            View all sensors →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fuelDevices.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center flex-wrap gap-1">
                      <span>⛽</span>
                      <span className="truncate">
                        Fuel Dispensers ({fuelDevices.length})
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fuelDevices.map((device) => (
                        <div
                          key={device.id}
                          className={`bg-white/95 dark:bg-slate-900/95 rounded-xl p-4 sm:p-5 shadow-lg border-2 transition hover:shadow-xl hover:-translate-y-0.5 ${device.tampered
                              ? 'border-red-500/80 dark:border-red-700'
                              : 'border-emerald-500/80 dark:border-emerald-700'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div className="min-w-0">
                              <h5 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base break-all">
                                {device.deviceId}
                              </h5>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                                {device.location}
                              </p>
                            </div>
                            <span
                              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] rounded-full font-bold whitespace-nowrap ${device.tampered
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : 'bg-emerald-600 text-white'
                                }`}
                            >
                              {device.tampered ? '⚠️ ALERT' : '✓ OK'}
                            </span>
                          </div>

                          {sensorDataMap[device.id] && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                  Flow
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                  {sensorDataMap[device.id].loadCell.value}{' '}
                                  {sensorDataMap[device.id].loadCell.unit}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                  Voltage
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                  {sensorDataMap[device.id].voltage.value}{' '}
                                  {sensorDataMap[device.id].voltage.unit}
                                </p>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => setSelectedDevice(device)}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs sm:text-sm font-semibold transition"
                          >
                            View all sensors →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {energyDevices.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center flex-wrap gap-1">
                      <span>⚡</span>
                      <span className="truncate">
                        Energy Meters ({energyDevices.length})
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {energyDevices.map((device) => (
                        <div
                          key={device.id}
                          className={`bg-white/95 dark:bg-slate-900/95 rounded-xl p-4 sm:p-5 shadow-lg border-2 transition hover:shadow-xl hover:-translate-y-0.5 ${device.tampered
                              ? 'border-red-500/80 dark:border-red-700'
                              : 'border-emerald-500/80 dark:border-emerald-700'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div className="min-w-0">
                              <h5 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base break-all">
                                {device.deviceId}
                              </h5>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                                {device.location}
                              </p>
                            </div>
                            <span
                              className={`px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] rounded-full font-bold whitespace-nowrap ${device.tampered
                                  ? 'bg-red-600 text-white animate-pulse'
                                  : 'bg-emerald-600 text-white'
                                }`}
                            >
                              {device.tampered ? '⚠️ ALERT' : '✓ OK'}
                            </span>
                          </div>

                          {sensorDataMap[device.id] && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                  Load
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                  {sensorDataMap[device.id].loadCell.value}{' '}
                                  {sensorDataMap[device.id].loadCell.unit}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                                <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                  Voltage
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                  {sensorDataMap[device.id].voltage.value}{' '}
                                  {sensorDataMap[device.id].voltage.unit}
                                </p>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => setSelectedDevice(device)}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs sm:text-sm font-semibold transition"
                          >
                            View all sensors →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No devices message */}
            {!isAdmin && userDevices.length === 0 && (
              <div className="bg-yellow-50/90 dark:bg-yellow-950/40 border border-yellow-200/80 dark:border-yellow-800/80 rounded-2xl p-6 sm:p-8 text-center mb-8 shadow-sm">
                <div className="text-4xl sm:text-5xl mb-3">
                  {mqttConnected ? '📡' : '🔌'}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-1">
                  {mqttConnected ? 'Waiting for device data...' : 'MQTT broker disconnected'}
                </h3>
                <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400 max-w-md mx-auto">
                  {mqttConnected
                    ? 'Make sure your devices are publishing to: tamper/esp32/data'
                    : 'Check your internet connection and refresh the page'}
                </p>
              </div>
            )}



            {/* Logs table (scrollable) */}

              <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <thead>
  <tr className="border-b border-slate-200 dark:border-slate-700">
    {/* existing headers: Time, Device ID, User, Action, Value, Status */}
    <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
      Details
    </th>
  </tr>
</thead>
                    <span>🚨</span>
                    <span>Today's Tamper Alerts</span>
                    {logs.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                        {logs.length} alert{logs.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2"></div>
                  <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-[10px] sm:text-xs font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                    Live
                  </span>
                </div>

                {logs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      No tampering detected today
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      All devices are operating normally. Tamper alerts will appear here.
                    </p>
                  </div>

                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
                            Time
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
                            Device ID
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
                            User
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
                            Action
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
                            Value
                          </th>
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-gray-600 dark:text-gray-400 font-semibold text-[10px] sm:text-xs uppercase tracking-wide whitespace-nowrap">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr
                            key={log.id}
                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                          >
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {log.time}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-mono text-gray-800 dark:text-gray-200 whitespace-nowrap">
                              {log.device}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {log.user}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {log.action}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                              {log.value}
                            </td>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              <span
                                className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${log.status === 'success'
                                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                    : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                                  }`}
                              >
                                {log.status === 'success'
                                  ? '✓ Success'
                                  : '⚠️ Alert'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          </main>

          {/* Toasts */}
          <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-xs sm:max-w-sm w-full sm:w-auto px-4 sm:px-0">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                onClick={() => {
                  setSelectedDevice(toast.deviceObj);
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="cursor-pointer bg-white/95 dark:bg-slate-900/95 border border-rose-200 dark:border-rose-700 rounded-xl shadow-xl px-3 sm:px-4 py-3 flex items-start gap-3 animate-slide-up"
              >
                <div className="mt-0.5 text-lg">⚠️</div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-semibold text-rose-600 dark:text-rose-300">
                    Tampering alert detected
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                    {toast.deviceId}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {toast.location}
                  </p>
                  <p className="text-[11px] text-rose-500 dark:text-rose-300 mt-1">
                    Tap to open full device details.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {selectedDevice && (
            <DeviceDetailModal
              device={selectedDevice}
              onClose={() => setSelectedDevice(null)}
            />
          )}
        </div>
      );
    }
