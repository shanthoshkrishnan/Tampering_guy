// components/SensorCard.jsx - FULL UPDATED with tamper_metrics support
export default function SensorCard({ sensorData, sensorType, detailed = false, isTampered = false }) {
  if (!sensorData) return null;

  // ============================================
  // LOAD CELL (Weight Sensor)
  // ============================================
  if (sensorType === 'loadcell') {
    const weight = sensorData.weight?.value || 0;
    const unit = sensorData.weight?.unit || 'kg';
    const isAbnormal = weight > 0.5 || weight < 0.01;
    const showTamper = isTampered || isAbnormal;

    return (
      <div className={`p-4 rounded-xl border-2 shadow-lg transition-all ${
        showTamper 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 animate-pulse shadow-red-500/20' 
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">⚖️</span>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
            showTamper 
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
              : 'bg-green-500 text-white'
          }`}>
            {showTamper ? 'TAMPER!' : 'OK'}
          </span>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-2">
          Load Cell (Weight)
        </h3>
        <p className={`text-3xl font-extrabold mb-2 ${
          showTamper ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
        }`}>
          {weight.toFixed(3)} {unit}
        </p>
        {showTamper && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
            ⚠️ {isTampered ? 'Tampering detected!' : 'Abnormal weight detected'}
          </p>
        )}
      </div>
    );
  }

  // ============================================
  // HALL EFFECT SENSOR (Magnetic Detection)
  // ============================================
  if (sensorType === 'hall') {
    const rawValue = sensorData.hall?.raw;
    const status = sensorData.hall?.status || 'unknown';
    const magnetDetected = rawValue === 0 || isTampered;

    return (
      <div className={`p-4 rounded-xl border-2 shadow-lg transition-all ${
        magnetDetected 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 animate-pulse shadow-red-500/20' 
          : 'bg-pink-50 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">🧲</span>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
            magnetDetected 
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
              : 'bg-green-500 text-white'
          }`}>
            {magnetDetected ? 'MAGNET!' : 'OK'}
          </span>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-2">
          Hall Effect Sensor
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
            <span className={`font-bold ${
              magnetDetected ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Raw Value:</span>
            <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
              {rawValue ?? 'N/A'}
            </span>
          </div>
        </div>
        {magnetDetected && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2">
            ⚠️ {isTampered ? 'Magnetic tampering!' : 'Magnetic field detected!'}
          </p>
        )}
      </div>
    );
  }

  // ============================================
  // VIBRATION SENSOR
  // ============================================
  if (sensorType === 'vibration') {
    const rawValue = sensorData.vibration?.raw;
    const status = sensorData.vibration?.status || 'unknown';
    const vibrationDetected = rawValue === 0 || isTampered;

    return (
      <div className={`p-4 rounded-xl border-2 shadow-lg transition-all ${
        vibrationDetected 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 animate-pulse shadow-red-500/20' 
          : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">📳</span>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
            vibrationDetected 
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
              : 'bg-green-500 text-white'
          }`}>
            {vibrationDetected ? 'VIBRATION!' : 'OK'}
          </span>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-2">
          Vibration Sensor
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
            <span className={`font-bold ${
              vibrationDetected ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Raw Value:</span>
            <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
              {rawValue ?? 'N/A'}
            </span>
          </div>
        </div>
        {vibrationDetected && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2">
            ⚠️ {isTampered ? 'Vibration tampering!' : 'Abnormal vibration detected!'}
          </p>
        )}
      </div>
    );
  }

  // ============================================
  // MPU6050 (Accelerometer + Gyroscope)
  // ============================================
  if (sensorType === 'mpu6050') {
    const pitch = sensorData.orientation?.pitch || 0;
    const roll = sensorData.orientation?.roll || 0;
    const yaw = sensorData.orientation?.yaw || 0;
    const tiltDetected = sensorData.orientation?.tilt_detected || isTampered;
    const gyro = sensorData.gyroscope || { x: 0, y: 0, z: 0 };
    const accel = sensorData.accelerometer || { x: 0, y: 0, z: 0 };
    const isTilted = Math.abs(pitch) > 10 || Math.abs(roll) > 10 || tiltDetected;

    return (
      <div className={`p-4 rounded-xl border-2 shadow-lg transition-all ${
        isTilted 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 animate-pulse shadow-red-500/20' 
          : detailed 
            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
            : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">🎯</span>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
            isTilted 
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
              : 'bg-green-500 text-white'
          }`}>
            {isTilted ? 'TILT!' : 'OK'}
          </span>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-3">
          MPU6050 (IMU)
        </h3>

        {detailed && (
          <>
            {/* Orientation */}
            <div className="mb-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Orientation</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Pitch:</span>
                  <p className={`font-bold ${Math.abs(pitch) > 10 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {pitch.toFixed(1)}°
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Roll:</span>
                  <p className={`font-bold ${Math.abs(roll) > 10 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {roll.toFixed(1)}°
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Yaw:</span>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {yaw.toFixed(1)}°
                  </p>
                </div>
              </div>
            </div>

            {/* Gyroscope */}
            <div className="mb-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Gyroscope</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">X:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{gyro.x?.toFixed(2) ?? '0.00'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Y:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{gyro.y?.toFixed(2) ?? '0.00'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Z:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{gyro.z?.toFixed(2) ?? '0.00'}</p>
                </div>
              </div>
            </div>

            {/* Accelerometer */}
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Accelerometer</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">X:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{accel.x?.toFixed(2) ?? '0.00'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Y:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{accel.y?.toFixed(2) ?? '0.00'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Z:</span>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">{accel.z?.toFixed(2) ?? '0.00'}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {isTilted && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2">
            ⚠️ {isTampered ? 'Tilt tampering detected!' : 'Excessive tilt detected!'}
          </p>
        )}
      </div>
    );
  }

  // ============================================
  // BUZZER
  // ============================================
  if (sensorType === 'buzzer') {
    const buzzerState = sensorData.buzzer || 'off';
    const isActive = buzzerState.toLowerCase() === 'on';

    return (
      <div className={`p-4 rounded-xl border-2 shadow-lg transition-all ${
        isActive 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 animate-pulse shadow-red-500/20' 
          : 'bg-gray-50 dark:bg-gray-800/20 border-gray-300 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">🔔</span>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
            isActive 
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
              : 'bg-gray-500 text-white'
          }`}>
            {buzzerState.toUpperCase()}
          </span>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-2">
          Buzzer Alarm
        </h3>
        <p className={`text-3xl font-extrabold mb-2 ${
          isActive ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
        }`}>
          {buzzerState.toUpperCase()}
        </p>
        {isActive && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
            🚨 ALARM TRIGGERED - Immediate attention required!
          </p>
        )}
      </div>
    );
  }

  // ============================================
  // RTC (Real Time Clock)
  // ============================================
  if (sensorType === 'rtc') {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN');
    const formattedTime = now.toLocaleTimeString('en-IN');
    const timestampMs = now.getTime();

    return (
      <div className="p-4 rounded-xl border-2 shadow-lg bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">🕐</span>
          <span className="text-xs px-3 py-1 rounded-full font-bold uppercase bg-green-500 text-white">
            ACTIVE
          </span>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-3">
          RTC Module
        </h3>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Date</p>
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {formattedDate}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Time</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {formattedTime}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Timestamp (ms)</p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {timestampMs.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // LDR SENSORS (8 sensors from separate MQTT feed)
  // ============================================
  if (sensorType === 'ldr') {
    const sensors = sensorData.sensors || [];
    const alarm = sensorData.alarm || false;
    const threshold = sensorData.threshold || 1500;
    const darkSensors = sensors.filter(s => s.status === 'DARK').length;
    const brightSensors = sensors.filter(s => s.status === 'BRIGHT').length;

    return (
      <div className={`p-4 rounded-xl border-2 shadow-lg transition-all ${
        alarm 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 animate-pulse' 
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">💡</span>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
            alarm 
              ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' 
              : 'bg-green-500 text-white'
          }`}>
            {alarm ? 'ALARM' : 'OK'}
          </span>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-3">
          LDR Sensors (Light)
        </h3>
        
        {/* Summary */}
        <div className="mb-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex justify-between text-xs">
            <span>Dark: <strong>{darkSensors}</strong></span>
            <span>Bright: <strong>{brightSensors}</strong></span>
            <span>Threshold: <strong>{threshold}</strong></span>
          </div>
        </div>

        {/* Sensor Grid */}
        <div className="grid grid-cols-4 gap-2">
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className={`p-2 rounded-lg text-center text-xs transition-all ${
                sensor.status === 'DARK'
                  ? 'bg-gray-700 text-white hover:bg-gray-600 shadow-lg'
                  : 'bg-yellow-300 text-gray-900 hover:bg-yellow-400 shadow-lg'
              }`}
            >
              <div className="font-bold">L{sensor.id}</div>
              <div className="text-[10px] font-mono">{sensor.value}</div>
              <div className="text-[9px]">{sensor.status}</div>
            </div>
          ))}
        </div>

        {alarm && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2">
            ⚠️ Light condition alarm triggered!
          </p>
        )}
      </div>
    );
  }

  return null;
}
