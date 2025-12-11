import { getSensorData } from '../data/mockSensorData';
import { useEffect, useState } from 'react';
import SensorCard from './SensorCard';
import MapView from './MapView';

export default function UserDetailModal({ user, onClose }) {
  const [sensorData, setSensorData] = useState(
    getSensorData(user.id, user.deviceType)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(getSensorData(user.id, user.deviceType));
    }, 3000);

    return () => clearInterval(interval);
  }, [user.id, user.deviceType]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-7xl w-full my-8">
        {/* Header with Tampered Status */}
        <div className={`p-6 border-b sticky top-0 z-10 ${
          user.tampered 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-white dark:bg-gray-800 dark:border-gray-700'
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{user.name}</h2>
                <span className={`px-4 py-1.5 text-sm rounded-full font-bold ${
                  user.tampered 
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-green-600 text-white'
                }`}>
                  {user.tampered ? '⚠️ DEVICE TAMPERED' : '✓ DEVICE NORMAL'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user.deviceId} | {user.company}
              </p>
              {user.tampered && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-800 dark:text-red-300 text-sm">
                  <strong>⚠️ Alert:</strong> This device has been flagged as tampered. Immediate inspection required.
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left & Center: User Info & Sensors */}
            <div className="lg:col-span-2 space-y-6">
              {/* User Details Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-5 border border-indigo-100 dark:border-gray-600">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-lg flex items-center">
                  <span className="mr-2">👤</span> User Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Full Name</p>
                    <p className="text-gray-800 dark:text-white font-semibold">{user.name}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Device ID</p>
                    <p className="text-gray-800 dark:text-white font-semibold">{user.deviceId}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
                    <p className="text-gray-800 dark:text-white font-medium text-xs">{user.email}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Phone</p>
                    <p className="text-gray-800 dark:text-white font-medium">{user.phone}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Location</p>
                    <p className="text-gray-800 dark:text-white font-medium text-xs">{user.location}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Company</p>
                    <p className="text-gray-800 dark:text-white font-medium text-xs">{user.company}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Install Date</p>
                    <p className="text-gray-800 dark:text-white font-medium">{user.installDate}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Status</p>
                    <p className="text-green-600 dark:text-green-400 font-semibold capitalize flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {user.status}
                    </p>
                  </div>
                  {user.avgDailyLoad && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Avg Daily Load</p>
                      <p className="text-gray-800 dark:text-white font-semibold">{user.avgDailyLoad}</p>
                    </div>
                  )}
                  {user.avgDailyDispense && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Avg Daily Dispense</p>
                      <p className="text-gray-800 dark:text-white font-semibold">{user.avgDailyDispense}</p>
                    </div>
                  )}
                  {user.avgDailyConsumption && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Avg Daily Consumption</p>
                      <p className="text-gray-800 dark:text-white font-semibold">{user.avgDailyConsumption}</p>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Last Maintenance</p>
                    <p className="text-gray-800 dark:text-white font-medium">{user.lastMaintenance}</p>
                  </div>
                </div>
              </div>

              {/* Sensor Data Grid */}
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-lg flex items-center">
                  <span className="mr-2">📊</span> Real-Time Sensor Data
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <SensorCard sensor={sensorData.loadCell} detailed={true} />
                  <SensorCard sensor={sensorData.voltage} detailed={true} />
                  <SensorCard sensor={sensorData.gsm} detailed={true} />
                  <SensorCard sensor={sensorData.mpu6050} detailed={true} />
                  <SensorCard sensor={sensorData.hallSensor} detailed={true} />
                  <SensorCard sensor={sensorData.ldr} detailed={true} />
                  <SensorCard sensor={sensorData.ads1115} detailed={true} />
                  <SensorCard sensor={sensorData.rtc} detailed={true} />
                  <SensorCard sensor={sensorData.buzzer} detailed={true} />
                </div>
              </div>
            </div>

            {/* Right: Location Map */}
            <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <h3 className="font-bold text-gray-800 dark:text-white text-lg flex items-center">
                <span className="mr-2">📍</span> Device Location
              </h3>
              <div className="h-[400px] rounded-xl overflow-hidden shadow-lg">
                <MapView 
                  latitude={user.latitude}
                  longitude={user.longitude}
                  altitude={sensorData.gps.altitude}
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Coordinates</p>
                  <p className="text-sm text-gray-800 dark:text-white font-mono">
                    {user.latitude.toFixed(6)}, {user.longitude.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">GPS Status</p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold">
                    🛰️ {sensorData.gps.satellites} Satellites | {sensorData.gps.accuracy} accuracy
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Altitude</p>
                  <p className="text-sm text-gray-800 dark:text-white font-semibold">
                    {sensorData.gps.altitude.toFixed(1)}m
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
