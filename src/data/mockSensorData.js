// Generate realistic sensor data with some variation per user
export const getSensorData = (userId = 'default', deviceType = 'weighingMachine') => {
  // Base seed for consistent but varied data per user
  const seed = userId.charCodeAt(0) || 1;
  const random = (min, max, decimals = 2) => {
    const value = min + (Math.random() + seed * 0.01) * (max - min);
    return Number(value.toFixed(decimals));
  };

  // Device-specific sensor configurations
  const deviceConfigs = {
    weighingMachine: {
      loadCell: { min: 0, max: 10, alert: 9 },
      voltage: { min: 11.5, max: 12.5 },
      sensitivity: 'high'
    },
    fuelDispenser: {
      loadCell: { min: 0, max: 50, alert: 45 },
      voltage: { min: 11.0, max: 13.0 },
      sensitivity: 'medium'
    },
    energyMeter: {
      loadCell: { min: 0, max: 100, alert: 90 },
      voltage: { min: 220, max: 240 },
      sensitivity: 'low'
    }
  };

  const config = deviceConfigs[deviceType] || deviceConfigs.weighingMachine;
  const loadValue = random(config.loadCell.min, config.loadCell.max);

  return {
    loadCell: {
      name: 'Load Cell (10kg HX711)',
      value: loadValue,
      unit: 'kg',
      status: loadValue > config.loadCell.alert ? 'alert' : 'normal',
      icon: '⚖️',
      maxCapacity: config.loadCell.max
    },
    mpu6050: {
      name: 'MPU6050 (Accelerometer)',
      acceleration: {
        x: random(-2, 2, 3),
        y: random(-2, 2, 3),
        z: random(8, 10, 3)
      },
      gyroscope: {
        x: random(-250, 250, 1),
        y: random(-250, 250, 1),
        z: random(-250, 250, 1)
      },
      temperature: random(20, 30, 1),
      unit: 'm/s²',
      status: 'normal',
      icon: '📐'
    },
    hallSensor: {
      name: 'AH49E Hall Effect Sensor',
      value: random(0, 100, 1),
      unit: 'mT',
      status: Math.random() > 0.85 ? 'alert' : 'normal',
      icon: '🧲',
      threshold: 80
    },
    ldr: {
      name: 'LDR (LM393)',
      value: random(100, 1000, 0),
      unit: 'lux',
      status: 'normal',
      icon: '💡',
      lightLevel: random(100, 1000, 0) > 500 ? 'bright' : 'dim'
    },
    ads1115: {
      name: 'ADS1115 (ADC)',
      channels: [
        random(0, 5, 3),
        random(0, 5, 3),
        random(0, 5, 3),
        random(0, 5, 3)
      ],
      unit: 'V',
      status: 'normal',
      icon: '📊',
      resolution: '16-bit'
    },
    voltage: {
      name: 'Voltage Sensor',
      value: random(config.voltage.min, config.voltage.max, 2),
      unit: 'V',
      status: 'normal',
      icon: '🔋',
      type: deviceType === 'energyMeter' ? 'AC' : 'DC'
    },
    rtc: {
      name: 'DS3231 RTC',
      time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      temperature: random(25, 32, 1),
      unit: '°C',
      status: 'normal',
      icon: '🕐',
      accuracy: '±2ppm'
    },
    buzzer: {
      name: '12V Buzzer',
      state: Math.random() > 0.95 ? 'active' : 'inactive',
      voltage: 12,
      status: 'normal',
      icon: '🔔',
      lastTriggered: Math.random() > 0.5 ? 'Never' : '2 hours ago'
    },
    gsm: {
      name: 'GSM Module',
      signal: Math.floor(random(15, 31, 0)),
      status: 'connected',
      icon: '📱',
      operator: 'Airtel',
      signalQuality: Math.floor(random(15, 31, 0)) > 20 ? 'Good' : 'Fair'
    },
    gps: {
      name: 'GPS Module',
      latitude: random(28.5, 28.7, 6),
      longitude: random(77.1, 77.3, 6),
      altitude: random(200, 250, 1),
      satellites: Math.floor(random(4, 12, 0)),
      status: 'locked',
      icon: '🛰️',
      accuracy: random(2, 5, 1) + 'm'
    },
    timestamp: new Date().toISOString(),
    deviceType: deviceType,
    userId: userId
  };
};

// Generate historical data for charts (optional for future use)
export const generateHistoricalData = (userId, hours = 24) => {
  const data = [];
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
    data.push({
      timestamp: timestamp.toISOString(),
      ...getSensorData(userId)
    });
  }
  return data;
};
