import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getSensorData } from '../data/mockSensorData';
import Navbar from './Navbar';

export default function Home() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [userDevices, setUserDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [sensorDataMap, setSensorDataMap] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);

  const [toasts, setToasts] = useState([]);
  const seenTamperedIdsRef = useRef(new Set());

  const currentRole = (currentUser?.role || 'USER').toUpperCase();

  const isAdmin = currentRole === 'ADMIN';
  const isUser = currentRole === 'USER';
  const isDistrictSuperAdmin = currentRole === 'DISTRICT_SUPER_ADMIN';
  const isLmOfficer = currentRole === 'LM_OFFICER';
  const isManufacturer = currentRole === 'MANUFACTURER';

  const tamperedDevices = useMemo(
    () => userDevices.filter((d) => d.tampered),
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
          location: d.location,
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

  useEffect(() => {
    if (!currentUser) return;

    const weighingMachineUsers =
      currentUser?.usersDatabase?.weighingMachine || [];
    const fuelDispenserUsers =
      currentUser?.usersDatabase?.fuelDispenser || [];
    const energyMeterUsers =
      currentUser?.usersDatabase?.energyMeter || [];

    if (isAdmin) {
      setUserDevices([
        ...weighingMachineUsers,
        ...fuelDispenserUsers,
        ...energyMeterUsers,
      ]);
    } else if (isUser) {
      const allUsers = [
        ...weighingMachineUsers,
        ...fuelDispenserUsers,
        ...energyMeterUsers,
      ];
      const myDevices = allUsers.filter(
        (device) => device.email === currentUser?.email
      );
      setUserDevices(myDevices);
    } else {
      setUserDevices([]);
    }
  }, [currentUser, isAdmin, isUser]);

  useEffect(() => {
    if (!userDevices.length) {
      setSensorDataMap({});
      return;
    }

    const updateSensorData = () => {
      const newSensorData = {};
      userDevices.forEach((device) => {
        newSensorData[device.id] = getSensorData(device.id, device.deviceType);
      });
      setSensorDataMap(newSensorData);
    };

    updateSensorData();
    const interval = setInterval(updateSensorData, 3000);

    return () => clearInterval(interval);
  }, [userDevices]);

  useEffect(() => {
    if (!userDevices.length) {
      setLogs([]);
      return;
    }

    const generateLogs = () => {
      const mockLogs = [];
      userDevices.forEach((device, idx) => {
        const time = new Date();
        time.setMinutes(time.getMinutes() - idx * 2);

        mockLogs.push({
          id: `log-${device.id}-${idx}`,
          time: time.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          device: device.deviceId,
          user: device.name,
          action:
            device.deviceType === 'weighingMachine'
              ? 'Weight measured'
              : device.deviceType === 'fuelDispenser'
              ? 'Fuel dispensed'
              : 'Power consumption',
          value:
            device.deviceType === 'weighingMachine'
              ? `${(Math.random() * 10).toFixed(1)} kg`
              : device.deviceType === 'fuelDispenser'
              ? `${(Math.random() * 50).toFixed(1)} L`
              : `${(Math.random() * 100).toFixed(0)} kWh`,
          status: device.tampered ? 'error' : 'success',
        });
      });
      setLogs(mockLogs.slice(0, 8));
    };

    generateLogs();
    const interval = setInterval(generateLogs, 5000);
    return () => clearInterval(interval);
  }, [userDevices]);

  const stats = {
    totalDevices: userDevices.length,
    activeDevices: userDevices.filter((d) => d.status === 'active').length,
    tamperedDevices: userDevices.filter((d) => d.tampered).length,
    todayTransactions: userDevices.length * 25,
  };

  const weighingDevices = userDevices.filter(
    (d) => d.deviceType === 'weighingMachine'
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
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-1">{device.deviceId}</h2>
              <p className="text-indigo-100 text-sm">{device.location}</p>
              <p className="text-xs text-indigo-200 mt-1">
                Type: {device.deviceType}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              <svg
                className="w-6 h-6"
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

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-blue-200/70 dark:border-blue-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.loadCell.icon}</span>
                <span
                  className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                    sensorData.loadCell.status === 'alert'
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {sensorData.loadCell.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {sensorData.loadCell.name}
              </h3>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {sensorData.loadCell.value} {sensorData.loadCell.unit}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Max: {sensorData.loadCell.maxCapacity}{' '}
                {sensorData.loadCell.unit}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-purple-200/70 dark:border-purple-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.mpu6050.icon}</span>
                <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                  {sensorData.mpu6050.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                {sensorData.mpu6050.name}
              </h3>
              <div className="space-y-1 text-xs">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Accel:</strong> X:{sensorData.mpu6050.acceleration.x},{' '}
                  Y:{sensorData.mpu6050.acceleration.y}, Z:
                  {sensorData.mpu6050.acceleration.z}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Gyro:</strong> X:{sensorData.mpu6050.gyroscope.x},{' '}
                  Y:{sensorData.mpu6050.gyroscope.y}, Z:
                  {sensorData.mpu6050.gyroscope.z}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Temp:</strong> {sensorData.mpu6050.temperature}°C
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-pink-200/70 dark:border-pink-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.hallSensor.icon}</span>
                <span
                  className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                    sensorData.hallSensor.status === 'alert'
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {sensorData.hallSensor.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {sensorData.hallSensor.name}
              </h3>
              <p className="text-3xl font-extrabold text-pink-600 dark:text-pink-400">
                {sensorData.hallSensor.value} {sensorData.hallSensor.unit}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Threshold: {sensorData.hallSensor.threshold}{' '}
                {sensorData.hallSensor.unit}
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-yellow-200/70 dark:border-yellow-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.ldr.icon}</span>
                <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                  {sensorData.ldr.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {sensorData.ldr.name}
              </h3>
              <p className="text-3xl font-extrabold text-yellow-600 dark:text-yellow-400">
                {sensorData.ldr.value} {sensorData.ldr.unit}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Light Level: {sensorData.ldr.lightLevel}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-green-200/70 dark:border-green-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.ads1115.icon}</span>
                <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                  {sensorData.ads1115.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                {sensorData.ads1115.name}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
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
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                Resolution: {sensorData.ads1115.resolution}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-red-200/70 dark:border-red-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.voltage.icon}</span>
                <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                  {sensorData.voltage.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {sensorData.voltage.name}
              </h3>
              <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                {sensorData.voltage.value} {sensorData.voltage.unit}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Type: {sensorData.voltage.type}
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-indigo-200/70 dark:border-indigo-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.rtc.icon}</span>
                <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                  {sensorData.rtc.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {sensorData.rtc.name}
              </h3>
              <p className="text-sm font-mono text-indigo-700 dark:text-indigo-300 mb-1">
                {sensorData.rtc.time}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Temp: {sensorData.rtc.temperature}°C | Accuracy:{' '}
                {sensorData.rtc.accuracy}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-orange-200/70 dark:border-orange-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.buzzer.icon}</span>
                <span
                  className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                    sensorData.buzzer.state === 'active'
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {sensorData.buzzer.state}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {sensorData.buzzer.name}
              </h3>
              <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                {sensorData.buzzer.voltage}V
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                Last: {sensorData.buzzer.lastTriggered}
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-teal-200/70 dark:border-teal-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.gsm.icon}</span>
                <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                  {sensorData.gsm.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {sensorData.gsm.name}
              </h3>
              <p className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">
                {sensorData.gsm.signal}/31
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {sensorData.gsm.operator} | Quality:{' '}
                {sensorData.gsm.signalQuality}
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 border border-cyan-200/70 dark:border-cyan-800/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{sensorData.gps.icon}</span>
                <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-green-500 text-white uppercase tracking-wide">
                  {sensorData.gps.status}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                {sensorData.gps.name}
              </h3>
              <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
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

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-b-2xl">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Last updated:{' '}
              {new Date(sensorData.timestamp).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isDistrictSuperAdmin || isLmOfficer || isManufacturer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-black dark:via-slate-900 dark:to-slate-950">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              Welcome back, {currentUser?.name}! 👋
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl">
              This Home view is reserved for device-level monitoring for Users
              and Admins. Your role has access to higher-level dashboards for
              district and fleet-wide analytics.
            </p>
          </div>
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/70 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              As a <span className="font-semibold">{currentRole}</span>, your
              workflow focuses on aggregated issues, escalations and compliance
              metrics rather than individual device streams.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-black dark:via-slate-900 dark:to-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-300 mb-1">
              Live Device Overview
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-1">
              Welcome back, {isAdmin ? 'Officer ' : ''}
              {currentUser?.name}! 👋
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
              {isAdmin
                ? 'Monitor all connected devices for anomalies, tampering and health in real-time.'
                : 'Keep track of your registered devices, current activity and any tampering alerts.'}
            </p>
          </div>

          <div className="relative self-start">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative flex items-center justify-center w-11 h-11 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/70 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition transform"
              title="Tampering notifications"
            >
              <span className="text-xl">🔔</span>
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
                      {tamperedDevices.length}
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {tamperedDevices.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-800 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="text-3xl mb-1">📊</div>
              <div className="text-2xl font-extrabold">{stats.totalDevices}</div>
              <div className="text-xs opacity-90 mt-1">Total devices</div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="text-3xl mb-1">✓</div>
              <div className="text-2xl font-extrabold">{stats.activeDevices}</div>
              <div className="text-xs opacity-90 mt-1">Active devices</div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 to-red-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="text-3xl mb-1">⚠️</div>
              <div className="text-2xl font-extrabold">
                {stats.tamperedDevices}
              </div>
              <div className="text-xs opacity-90 mt-1">Tampered devices</div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="text-3xl mb-1">📈</div>
              <div className="text-2xl font-extrabold">
                {stats.todayTransactions}
              </div>
              <div className="text-xs opacity-90 mt-1">
                Today&apos;s transactions
              </div>
            </div>
          </div>
        </div>

        {!isAdmin && userDevices.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">🔧</span> My Devices
            </h3>

            {weighingDevices.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <span className="mr-2">⚖️</span> Weighing Machines (
                  {weighingDevices.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weighingDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`bg-white/95 dark:bg-slate-900/95 rounded-xl p-5 shadow-lg border-2 transition hover:shadow-xl hover:-translate-y-0.5 ${
                        device.tampered
                          ? 'border-red-500/80 dark:border-red-700'
                          : 'border-emerald-500/80 dark:border-emerald-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-gray-900 dark:text-white text-lg">
                            {device.deviceId}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {device.location}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-[11px] rounded-full font-bold ${
                            device.tampered
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
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Load
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {sensorDataMap[device.id].loadCell.value}{' '}
                              {sensorDataMap[device.id].loadCell.unit}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Voltage
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {sensorDataMap[device.id].voltage.value}{' '}
                              {sensorDataMap[device.id].voltage.unit}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedDevice(device)}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold transition"
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
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <span className="mr-2">⛽</span> Fuel Dispensers (
                  {fuelDevices.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fuelDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`bg-white/95 dark:bg-slate-900/95 rounded-xl p-5 shadow-lg border-2 transition hover:shadow-xl hover:-translate-y-0.5 ${
                        device.tampered
                          ? 'border-red-500/80 dark:border-red-700'
                          : 'border-emerald-500/80 dark:border-emerald-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-gray-900 dark:text-white text-lg">
                            {device.deviceId}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {device.location}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-[11px] rounded-full font-bold ${
                            device.tampered
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
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Flow
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {sensorDataMap[device.id].loadCell.value}{' '}
                              {sensorDataMap[device.id].loadCell.unit}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Voltage
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {sensorDataMap[device.id].voltage.value}{' '}
                              {sensorDataMap[device.id].voltage.unit}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedDevice(device)}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold transition"
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
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                  <span className="mr-2">⚡</span> Energy Meters (
                  {energyDevices.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {energyDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`bg-white/95 dark:bg-slate-900/95 rounded-xl p-5 shadow-lg border-2 transition hover:shadow-xl hover:-translate-y-0.5 ${
                        device.tampered
                          ? 'border-red-500/80 dark:border-red-700'
                          : 'border-emerald-500/80 dark:border-emerald-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-gray-900 dark:text-white text-lg">
                            {device.deviceId}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {device.location}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-[11px] rounded-full font-bold ${
                            device.tampered
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
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Load
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {sensorDataMap[device.id].loadCell.value}{' '}
                              {sensorDataMap[device.id].loadCell.unit}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-2">
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Voltage
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {sensorDataMap[device.id].voltage.value}{' '}
                              {sensorDataMap[device.id].voltage.unit}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedDevice(device)}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold transition"
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

        {!isAdmin && userDevices.length === 0 && (
          <div className="bg-yellow-50/90 dark:bg-yellow-950/40 border border-yellow-200/80 dark:border-yellow-800/80 rounded-2xl p-8 text-center mb-8 shadow-sm">
            <div className="text-5xl mb-3">📭</div>
            <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-1">
              No devices found
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              You don&apos;t have any registered devices yet. Contact your
              administrator to onboard your devices to the platform.
            </p>
          </div>
        )}

        <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xl p-6">
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
      <span className="mr-2">📋</span> Real-time activity logs
    </h3>
    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-semibold flex items-center">
      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
      Live
    </span>
  </div>

  {logs.length === 0 ? (
    <p className="text-sm text-gray-500 dark:text-gray-400">
      No logs yet. Once activity starts, logs will appear here.
    </p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">
              Time
            </th>
            <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">
              Device ID
            </th>
            <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">
              User
            </th>
            <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">
              Action
            </th>
            <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">
              Value
            </th>
            <th className="text-left py-3 px-4 text-gray-600 dark:text-gray-400 font-semibold text-xs uppercase tracking-wide">
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
              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                {log.time}
              </td>
              <td className="py-3 px-4 font-mono text-gray-800 dark:text-gray-200">
                {log.device}
              </td>
              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                {log.user}
              </td>
              <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                {log.action}
              </td>
              <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {log.value}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    log.status === 'success'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                  }`}
                >
                  {log.status === 'success' ? '✓ Success' : '⚠️ Alert'}
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


      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => {
              setSelectedDevice(toast.deviceObj);
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

      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </div>
  );
}
