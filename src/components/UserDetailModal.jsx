import { useEffect, useState, useMemo } from 'react';
import SensorCard from './SensorCard';
import MapView from './MapView';
import { FaBell, FaCommentDots, FaTimes } from 'react-icons/fa';
import { useMqttLDR } from '../hooks/useMqttLDR'; // NEW: Import LDR hook

const MOCK_DEVICE_UNO_DATA = {
  id: "ge19",
  approvedAt: null,
  approvedBy: null,
  businessType: "Warehouse owner",
  createdAt: "2025-12-10T06:01:57.702Z",
  createdBy: null,
  createdByRole: null,
  totalDevices: 1,
  userType: "Consumer",
  name: "consumer",
  status: "approved",
  role: "USER",
  phone: "+91 9374274682",
  phoneVerified: false,
  email: "socialmedia.panimalar@gmail.com",
  emailVerified: false,
  location: {
    accuracy: 2025.469982597577,
    capturedAt: new Date().toISOString(), // ✅ Updated to current timestamp
    latitude: 9.5266041,
    longitude: 76.8144186
  },
  devices: {
    weighingMachine: [
      {
        company: "Trustscale",
        deviceId: "UNO-ESP32",
        deviceType: "weighingMachine",
        id: `uno-esp32-${Math.random().toString(36).substr(2, 9)}`, // ✅ Random ID
        location: "chennai central, chennai.",
        status: "active",
        deviceName: "UNO Weighing Scale" // ✅ Added device name
      }
    ]
  }
};

export default function UserDetailModal({ user: propUser, onClose, mqttConnected }) {

  const user = propUser?.deviceId === "UNO-ESP32" 
    ? { ...MOCK_DEVICE_UNO_DATA, lastSeen: new Date().toISOString() }
    : propUser || MOCK_DEVICE_UNO_DATA;

  // Safe defaults
  const latitude = user.latitude ?? 9.528166;
  const longitude = user.longitude ?? 76.822177;
  const installDate = user.installDate ?? 'N/A';
  const lastMaintenance = user.lastMaintenance ?? 'N/A';
  const phone = user.phone ?? 'N/A';

  // ✅ Use real MQTT data from latestTamperLog instead of mock
  const latestLog = user.latestTamperLog || {};
  const { ldrData, connected: ldrConnected } = useMqttLDR();

  
  
  
  
  // ✅ Extract GPS from latestTamperLog if available
  const gpsAltitude = latestLog.gps?.altitude ?? 0;
  const gpsSatellites = latestLog.gps?.satellites ?? 0;
  const gpsAccuracy = latestLog.gps?.accuracy ?? 'N/A';

  // template popup state
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateType, setTemplateType] = useState(null);

  // ✅ UPDATED: Real tamper prediction from your MQTT data
  const predictedTamper = useMemo(() => {
    if (!latestLog) return null;

    // Buzzer ON = highest priority
    if (latestLog.buzzer === 'ON') {
      return {
        sensorName: 'Buzzer Alarm',
        reason: 'Active tamper alarm triggered',
        value: 'ON',
        at: user.lastSeen,
      };
    }

    // MPU6050 tilt detection
    const pitch = latestLog.orientation?.pitch || 0;
    const roll = latestLog.orientation?.roll || 0;
    const tiltDetected = latestLog.orientation?.tilt_detected || false;
    
    if (Math.abs(pitch) > 10 || Math.abs(roll) > 10 || tiltDetected) {
      return {
        sensorName: 'MPU6050 Tilt',
        reason: `Excessive tilt detected (Pitch: ${pitch.toFixed(1)}°, Roll: ${roll.toFixed(1)}°)`,
        value: `${pitch.toFixed(1)}° / ${roll.toFixed(1)}°`,
        at: user.lastSeen,
      };
    }

    // Hall sensor magnet detection (raw=0 means magnet detected)
    if (latestLog.hall?.raw === 0) {
      return {
        sensorName: 'Hall Effect Sensor',
        reason: 'Magnetic field detected - possible tampering',
        value: latestLog.hall.raw,
        at: user.lastSeen,
      };
    }

    // Vibration detection (raw=0 means vibration detected)
    if (latestLog.vibration?.raw === 0) {
      return {
        sensorName: 'Vibration Sensor',
        reason: 'Abnormal vibration detected',
        value: latestLog.vibration.raw,
        at: user.lastSeen,
      };
    }

   // Load cell abnormal weight
    const weight = latestLog.weight?.value || 0;
    if (weight > 0.5 || weight < 0.01) {
      return {
        sensorName: 'Load Cell',
        reason: `Abnormal weight: ${weight.toFixed(3)}kg`,
        value: weight.toFixed(3),
        at: user.lastSeen,
      };
    }

    // Check tamper_metrics
    if (latestLog.tamper_metrics?.any) {
      return {
        sensorName: 'Multiple Sensors',
        reason: 'Tamper metrics indicate anomaly',
        value: 'TRUE',
        at: user.lastSeen,
      };
    }

    return null;
  }, [latestLog, user.lastSeen]);

  // Dynamic base text using real tamper data
  const templates = useMemo(() => {
  // ✅ Define baseTamperText INSIDE useMemo - no external dependency
  const baseTamperText = `🚨 CRITICAL ALERT: Device ${user.deviceId} (${user.name}) at ${user.location} shows tamper activity.`;
  
  return {
    alert: [
      baseTamperText,
      `🚨 URGENT: ${predictedTamper ? `${predictedTamper.sensorName}: ${predictedTamper.reason}` : 'Tamper detected'} on device ${user.deviceId} at ${user.location}. Immediate inspection required.`,
      `ALERT: ${user.deviceId} (${user.name}) - ${predictedTamper?.sensorName || 'Device'} tampered. ${predictedTamper?.value ? `Reading: ${predictedTamper.value}` : ''} Dispatch technician NOW.`,
    ],
    message: [
      `Hi ${user.company}, tamper detected on ${user.name}'s ${predictedTamper?.sensorName || 'device'} at ${user.location}. ${predictedTamper?.reason || 'Please verify physical condition immediately.'}`,
      `Notification: Device ${user.deviceId} at ${user.location} requires inspection. ${predictedTamper ? `${predictedTamper.sensorName}: ${predictedTamper.reason}` : 'Tamper condition detected.'}`,
      `${user.name} (${user.deviceId}) tamper alert: ${predictedTamper?.reason || 'System detected anomaly'}. Please check installation site and confirm status.`,
    ],
  };
}, [predictedTamper, user]); // ✅ Clean dependencies only


  const openTemplatePopup = (type) => {
    setTemplateType(type);
    setShowTemplates(true);
  };

  const closeTemplatePopup = () => {
    setShowTemplates(false);
    setTemplateType(null);
  };

  const handleTemplateClick = (text) => {
    console.log('Selected template:', text);
    closeTemplatePopup();
  };

  return (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
    <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-[1500px] w-full max-h-[95vh] mx-auto my-4 flex flex-col animate-slideUp">
      
      {/* Header */}
      <div className={`px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-20 bg-gradient-to-r ${
        user.role === 'admin' 
          ? 'from-purple-50/90 via-indigo-50/80 to-blue-50/90 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-blue-900/20'
          : user.role === 'consumer'
          ? 'from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-teal-900/20'
          : 'from-gray-50/90 via-slate-50/80 to-gray-50/90 dark:from-gray-900 dark:via-gray-800/80 dark:to-slate-900'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-gray-900 to-slate-800 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                {user.name || user.adminName || 'User Profile'}
              </h2>
              <div className={`px-4 py-2 rounded-2xl shadow-lg font-bold text-sm ${
                user.role === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : user.role === 'consumer'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
              }`}>
                {user.role ? user.role.toUpperCase() : 'USER'}
              </div>
              {user.tampered && (
                <div className="px-4 py-2 rounded-2xl shadow-lg font-bold text-sm bg-gradient-to-r from-red-500 to-rose-600 text-white animate-pulse">
                  🚨 TAMPERED
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex flex-wrap items-center gap-2">
              <span>{user.role === 'admin' ? '👨‍💼' : '👤'}</span>
              {user.role === 'admin' ? (
                <>
                  {user.email} • {user.deviceId}
                </>
              ) : (
                <>
                  {user.deviceId} • {user.company || 'N/A'}
                </>
              )}
              {mqttConnected && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  MQTT LIVE
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => openTemplatePopup('alert')}
                  className="group w-11 h-11 rounded-2xl bg-purple-50/70 dark:bg-purple-900/40 border border-purple-200/70 dark:border-purple-700/70 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center text-purple-600 dark:text-purple-200"
                  title="Send alert"
                >
                  <FaBell className="group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => openTemplatePopup('message')}
                  className="group w-11 h-11 rounded-2xl bg-indigo-50/70 dark:bg-indigo-900/40 border border-indigo-200/70 dark:border-indigo-700/70 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center text-indigo-600 dark:text-indigo-200"
                  title="Send message"
                >
                  <FaCommentDots className="group-hover:scale-110 transition-transform" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="group w-12 h-12 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center text-gray-600 dark:text-gray-300 text-xl"
            >
              <span className="group-hover:scale-110 transition-transform">×</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-2 sm:p-4 lg:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-6 lg:gap-8">
          
          {/* Main content */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Profile Details */}
            <div className={`bg-gradient-to-br p-6 lg:p-8 rounded-3xl border shadow-xl ${
              user.role === 'admin'
                ? 'from-purple-50/80 to-indigo-50/80 dark:from-purple-900/80 dark:to-indigo-900/80 border-purple-100/50 dark:border-purple-700/50'
                : 'from-emerald-50/80 to-teal-50/80 dark:from-emerald-900/80 dark:to-teal-900/80 border-emerald-100/50 dark:border-emerald-700/50'
            }`}>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <span className="w-10 h-10 bg-gradient-to-br from-gray-900 to-slate-800 dark:from-white dark:to-slate-200 rounded-2xl flex items-center justify-center text-white shadow-lg text-lg">
                  {user.role === 'admin' ? '👨‍💼' : '👤'}
                </span>
                Profile Details
              </h3>
              
              <div className="space-y-4">
                {user.role === 'admin' ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                        Admin Email
                      </p>
                      <p className="text-lg font-black text-gray-900 dark:text-white bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-800 dark:to-indigo-800 px-4 py-2 rounded-2xl">
                        {user.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                        Password Status
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
                        <span className="font-bold text-green-700 dark:text-green-300 text-sm">SECURE</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Role
                      </p>
                      <p className="font-bold text-purple-700 dark:text-purple-300 px-3 py-2 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl">
                        ADMINISTRATOR
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                        Device ID
                      </p>
                      <p className="text-lg font-black text-gray-900 dark:text-white bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800 px-4 py-2 rounded-2xl">
                        {user.deviceId || user.deviceName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Company
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">{user.company || 'N/A'}</p>
                    </div>
                  </>
                )}
                <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Location
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.location || 'N/A'}</p>
                </div>
                <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full shadow-lg animate-pulse ${
                      user.tampered ? 'bg-red-500' : 'bg-emerald-500'
                    }`}></div>
                    <span className={`font-bold ${
                      user.tampered ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {user.status || (user.role === 'admin' ? 'ADMIN ACTIVE' : 'CONSUMER ACTIVE')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensors - Only consumers */}
            {user.role !== 'admin' && latestLog && (
              <div className="bg-gradient-to-br from-slate-50/80 to-indigo-50/80 dark:from-gray-900/80 dark:to-gray-800/80 rounded-3xl p-6 lg:p-8 border border-slate-100/50 dark:border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100/50 dark:border-gray-700/50">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">📡</span>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white">
                    Live MQTT Sensors
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SensorCard sensorData={latestLog} sensorType="loadcell" />
                  <SensorCard sensorData={latestLog} sensorType="hall" />
                  <SensorCard sensorData={latestLog} sensorType="vibration" />
                  <SensorCard sensorData={latestLog} sensorType="buzzer" />
                  <SensorCard sensorData={latestLog} sensorType="rtc" />
                </div>
              </div>
            )}
          </div>

          {/* Map - Only consumers */}
          {user.role !== 'admin' && latitude && longitude && (
            <div className="xl:col-span-3 xl:sticky xl:top-6 xl:self-start">
              <div className="bg-gradient-to-br from-emerald-50/80 to-blue-50/80 dark:from-gray-900/80 dark:to-emerald-900/20 rounded-3xl p-6 border border-emerald-100/50 dark:border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-100/50 dark:border-gray-700/50">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">📍</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Location</h3>
                </div>
                <div className="h-64 lg:h-72 xl:h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 dark:border-gray-700/50">
                  <MapView latitude={latitude} longitude={longitude} altitude={latestLog?.gps?.altitude || 0} />
                </div>
                <div className="mt-6 space-y-4 pt-6 border-t border-emerald-100/50 dark:border-gray-700/50">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Coordinates</p>
                    <p className="text-lg font-mono font-black text-gray-900 dark:text-white bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 px-3 py-2 rounded-xl">
                      {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Templates - Only admins */}
      {user.role === 'admin' && showTemplates && templateType && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/70 dark:border-gray-700/70 max-w-lg w-full mx-4 p-5 relative">
            <button onClick={closeTemplatePopup} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
              <FaTimes />
            </button>
            <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
              {templateType === 'alert' ? 'Send Alert Template' : 'Send Message Template'}
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {templates[templateType]?.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTemplateClick(t)}
                  className="w-full text-left text-sm p-3 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-gray-50/80 dark:bg-gray-800/70 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
