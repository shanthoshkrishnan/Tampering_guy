// hooks/useMqttLDR.js - Hook for LDR sensor data from separate MQTT feed

import { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const LDR_TOPIC = 'ldr/esp32/data';

// Global state for LDR data (persists across component mounts)
let globalLdrClient = null;
let globalLdrData = null;
let globalLdrConnected = false;
let ldrSubscribers = new Set();

function initializeLdrConnection() {
  if (globalLdrClient) {
    console.log('⚠️ LDR MQTT already connected');
    return;
  }

  console.log('🔌 Connecting to LDR MQTT broker...');
  
  const client = mqtt.connect(MQTT_BROKER_URL, {
    protocolVersion: 4,
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    path: '/mqtt',
    username: 'public',
    password: 'public',
    clientId: `ldr_${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    wsOptions: {
      rejectUnauthorized: false,
    },
  });

  globalLdrClient = client;

  client.on('connect', () => {
    console.log('✅ LDR MQTT Connected');
    globalLdrConnected = true;
    notifyLdrSubscribers();

    client.subscribe(LDR_TOPIC, { qos: 0 }, (err) => {
      if (err) {
        console.error('❌ LDR MQTT subscription error:', err);
      } else {
        console.log(`📡 Subscribed to ${LDR_TOPIC}`);
      }
    });
  });

  client.on('message', (topic, payload) => {
    if (topic !== LDR_TOPIC) return;

    try {
      const messageStr = payload.toString().trim();
      const data = JSON.parse(messageStr);
      
      console.log('💡 LDR message received:', data);

      // Expected format:
      // {
      //   "type": "ldr_sensors",
      //   "alarm": true,
      //   "timestamp": 2595178,
      //   "threshold": 1500,
      //   "sensors": [
      //     {"id": 1, "pin": 36, "value": 0, "status": "DARK"},
      //     ...
      //   ]
      // }

      if (data.type === 'ldr_sensors') {
        globalLdrData = data;
        notifyLdrSubscribers();
      }

    } catch (e) {
      console.error('❌ LDR MQTT parse error:', e.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ LDR MQTT error', err);
    globalLdrConnected = false;
    notifyLdrSubscribers();
  });

  client.on('close', () => {
    console.log('🔌 LDR MQTT connection closed');
    globalLdrConnected = false;
    notifyLdrSubscribers();
  });

  client.on('reconnect', () => {
    console.log('🔄 Reconnecting to LDR MQTT...');
  });
}

function notifyLdrSubscribers() {
  ldrSubscribers.forEach(subscriber => {
    subscriber.updateState(globalLdrData, globalLdrConnected);
  });
}

export function useMqttLDR() {
  const [ldrData, setLdrData] = useState(globalLdrData);
  const [connected, setConnected] = useState(globalLdrConnected);
  
  const subscriberId = useRef(Symbol('ldr-subscriber'));

  useEffect(() => {
    const id = subscriberId.current;
    
    const updateState = (newData, newConnected) => {
      setLdrData(newData);
      setConnected(newConnected);
    };
    
    ldrSubscribers.add({ id, updateState });

    if (!globalLdrClient) {
      initializeLdrConnection();
    } else {
      updateState(globalLdrData, globalLdrConnected);
    }

    return () => {
      const subscriberToRemove = [...ldrSubscribers].find(sub => sub.id === id);
      if (subscriberToRemove) {
        ldrSubscribers.delete(subscriberToRemove);
      }
      console.log(`🔌 LDR component unmounted. Subscribers: ${ldrSubscribers.size}`);
    };
  }, []);

  return { ldrData, connected };
}

// Disconnect LDR MQTT (call on logout)
export function disconnectLdrMqtt() {
  if (globalLdrClient) {
    console.log('🔌 Disconnecting LDR MQTT client...');
    globalLdrClient.end(true);
    globalLdrClient = null;
    globalLdrData = null;
    globalLdrConnected = false;
    ldrSubscribers.clear();
    console.log('✅ LDR MQTT disconnected');
  }
}

// Reconnect LDR MQTT (call on login)
export function reconnectLdrMqtt() {
  if (globalLdrClient) {
    console.log('⚠️ LDR MQTT already connected');
    return;
  }
  
  console.log('🔄 Reconnecting LDR MQTT...');
  globalLdrData = null;
  globalLdrConnected = false;
  initializeLdrConnection();
}