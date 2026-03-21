// hooks/useMqttTamper.js - FIXED device matching for UNO
import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const MQTT_TOPIC = 'tamper/esp32/data';

// ============================================
// GLOBAL STATE - Persists across page changes
// ============================================
let globalMqttClient = null;
let globalDevices = [];
let globalConnected = false;
let globalLastUpdate = null;
let subscribers = new Set();

// ============================================
// Initialize MQTT Connection (called once)
// ============================================
function initializeMqttConnection() {
  if (globalMqttClient) {
    console.log('⚠️ MQTT already connected');
    return;
  }

  console.log('🔌 Connecting to MQTT broker...');
  
  const client = mqtt.connect(MQTT_BROKER_URL, {
    protocolVersion: 4,
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    path: '/mqtt',
    username: 'public',
    password: 'public',
    clientId: `web_${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    wsOptions: {
      rejectUnauthorized: false,
    },
  });

  globalMqttClient = client;

  client.on('connect', () => {
    console.log('✅ MQTT Connected - Persistent session active');
    globalConnected = true;
    notifyAllSubscribers();

    client.subscribe(MQTT_TOPIC, { qos: 0 }, (err) => {
      if (err) {
        console.error('❌ MQTT subscription error:', err);
      } else {
        console.log(`📡 Subscribed to ${MQTT_TOPIC}`);
      }
    });
  });

  client.on('message', (topic, payload) => {
    if (topic !== MQTT_TOPIC) return;

    try {
      const messageStr = payload.toString().trim();
      
      // Handle multiple JSON objects or trailing data
      const jsonStrings = messageStr.split(/\}\s*\{/).map((str, idx, arr) => {
        if (arr.length === 1) return str;
        if (idx === 0) return str + '}';
        if (idx === arr.length - 1) return '{' + str;
        return '{' + str + '}';
      });

      jsonStrings.forEach(jsonStr => {
        try {
          const msg = JSON.parse(jsonStr);
          console.log('📩 MQTT message received:', msg);

          const deviceKey = msg.device || `Device-${msg.id}`;
          
          const weighingMachine = {
            device: deviceKey,
            deviceId: deviceKey,  // ✅ Used for matching UNO-ESP32
            id: msg.id,
            deviceType: 'weighingMachine',
            location: msg.location || 'ESP32 Live Feed',
            name: `${deviceKey}-${msg.id}`,
            status: msg.system || 'normal',
            timestamp: msg.timestamp || Date.now(),
            lastSeen: Date.now(),

            alarm: msg.alarm,
            tampered: msg.alarm || 
                     msg.tamper_metrics?.any || 
                     msg.buzzer === 'on' ||
                     msg.tamper_metrics?.tilt,

            latestTamperLog: {
              weight: msg.weight,
              hall: msg.hall,
              vibration: msg.vibration,
              orientation: msg.orientation,
              gyroscope: msg.gyroscope,
              accelerometer: msg.accelerometer,
              tamper_metrics: msg.tamper_metrics,  // ✅ Key for red blocks
              lcd_displays: msg.lcd_displays,
              buzzer: msg.buzzer,
              system: msg.system,
              timestamp: msg.timestamp,
              gps: msg.gps  // ✅ GPS data if available
            }
          };

          // Update global devices array - FIXED matching logic
          const filtered = globalDevices.filter(d => d.device !== deviceKey && d.id !== msg.id);
          globalDevices = [...filtered, weighingMachine];
          globalLastUpdate = Date.now();

          // Notify all subscribed components
          notifyAllSubscribers();

        } catch (parseErr) {
          console.warn('⚠️ Skipping invalid JSON chunk:', jsonStr.substring(0, 100), parseErr.message);
        }
      });

    } catch (e) {
      console.error('❌ MQTT message parse error:', e.message);
      console.log('Raw payload:', payload.toString().substring(0, 200));
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT error', err);
    globalConnected = false;
    notifyAllSubscribers();
  });

  client.on('close', () => {
    console.log('🔌 MQTT connection closed');
    globalConnected = false;
    notifyAllSubscribers();
  });

  client.on('reconnect', () => {
    console.log('🔄 Reconnecting to MQTT...');
  });

  client.on('offline', () => {
    console.log('📴 MQTT Client offline');
    globalConnected = false;
    notifyAllSubscribers();
  });
}

// ============================================
// Notify all subscribed components
// ============================================
function notifyAllSubscribers() {
  subscribers.forEach(subscriber => {
    subscriber.updateState(
      [...globalDevices], // Clone array
      globalConnected,
      globalLastUpdate
    );
  });
}

// ============================================
// MAIN HOOK - Used by components
// ============================================
export function useMqttTamper() {
  const [devices, setDevices] = useState(globalDevices);
  const [connected, setConnected] = useState(globalConnected);
  const [lastUpdate, setLastUpdate] = useState(globalLastUpdate);
  
  const subscriberId = useRef(Symbol('subscriber'));

  useEffect(() => {
    const id = subscriberId.current;
    
    // Register this component as a subscriber
    const updateState = (newDevices, newConnected, newLastUpdate) => {
      setDevices(newDevices);
      setConnected(newConnected);
      setLastUpdate(newLastUpdate);
    };
    
    subscribers.add({ id, updateState });

    // Initialize MQTT connection if not already connected
    if (!globalMqttClient) {
      initializeMqttConnection();
    } else {
      // Sync with current global state
      updateState([...globalDevices], globalConnected, globalLastUpdate);
    }

    // ✅ IMPORTANT: Don't disconnect on unmount
    // Only unregister this component's subscriber
    return () => {
      const subscriberToRemove = [...subscribers].find(sub => sub.id === id);
      if (subscriberToRemove) {
        subscribers.delete(subscriberToRemove);
      }
      console.log(`🔌 Component unmounted. Subscribers remaining: ${subscribers.size}`);
    };
  }, []);

  return { devices, connected, lastUpdate };
}

// ============================================
// DISCONNECT - Call on logout
// ============================================
export function disconnectMqtt() {
  if (globalMqttClient) {
    console.log('🔌 Disconnecting MQTT client...');
    globalMqttClient.end(true);
    globalMqttClient = null;
    globalDevices = [];
    globalConnected = false;
    globalLastUpdate = null;
    subscribers.clear();
    console.log('✅ MQTT client disconnected and cleared');
  } else {
    console.log('⚠️ MQTT client was not connected');
  }
}

// ============================================
// RECONNECT - Call on login
// ============================================
export function reconnectMqtt() {
  if (globalMqttClient) {
    console.log('⚠️ MQTT already connected, skipping reconnect');
    return;
  }
  
  console.log('🔄 Reconnecting MQTT...');
  globalDevices = [];
  globalConnected = false;
  globalLastUpdate = null;
  initializeMqttConnection();
}
