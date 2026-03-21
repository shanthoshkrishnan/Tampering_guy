# TamperGuard - IoT Device Setup Guide

This guide walks you through setting up IoT devices (ESP32/Arduino) to work with TamperGuard.

## 📋 Table of Contents

- [Hardware Requirements](#hardware-requirements)
- [Wiring Diagram](#wiring-diagram)
- [Arduino Sketch](#arduino-sketch)
- [MQTT Configuration](#mqtt-configuration)
- [Calibration](#calibration)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Hardware Requirements

### For Weighing Machine Monitoring

**Required Components:**
- **ESP32 DevKit** or **Arduino Uno + ESP8266 WiFi Module**
- **HX711 Load Cell Amplifier**
- **Load Cell** (50kg or as needed)
- **MPU6050** (Accelerometer + Gyroscope) - for tilt detection
- **Hall Effect Sensor** (e.g., A3144) - for magnetic tamper detection
- **5V Relay Module** - for device locking mechanism
- **12V Power Supply** - for relay
- **Jumper Wires**
- **Breadboard** (for prototyping)

**Optional Components:**
- **Voltage Sensor** (for power monitoring)
- **Enclosure Box** (for weather protection)
- **LED indicators** (status feedback)

### For Fuel Dispenser Monitoring

**Additional Requirements:**
- **Flow Sensor** (e.g., YF-S201)
- **Voltage Divider** (for AC voltage monitoring)
- **Current Sensor** (e.g., ACS712)

---

## 🔌 Wiring Diagram

### ESP32 + HX711 (Load Cell)

```
ESP32          HX711           Load Cell
-----          -----           ---------
3.3V   -----> VCC
GND    -----> GND
GPIO 22 ----> DT (Data)
GPIO 23 ----> SCK (Clock)
               VCC ----------> Red (E+)
               GND ----------> Black (E-)
               DT+ ----------> White (S+)
               DT- ----------> Green (S-)
```

### ESP32 + MPU6050 (Tilt Detection)

```
ESP32          MPU6050
-----          -------
3.3V   -----> VCC
GND    -----> GND
GPIO 21 ----> SDA
GPIO 22 ----> SCL
```

### ESP32 + Hall Effect Sensor

```
ESP32          A3144
-----          -----
3.3V   -----> VCC (Pin 1)
GND    -----> GND (Pin 2)
GPIO 34 ----> OUT (Pin 3)
```

### ESP32 + Relay Module (Auto-Lock)

```
ESP32          Relay Module       Device Power
-----          ------------       ------------
GPIO 25 ----> IN
5V     -----> VCC
GND    -----> GND
               COM -----------> Power Source
               NO ------------>  Device
```

**Complete Wiring:**
```
                        ┌─────────────┐
                        │   ESP32     │
                        │             │
  [Load Cell] ========> │  GPIO 22/23 │
  [MPU6050]   ========> │  GPIO 21/22 │
  [Hall Sensor] ======> │  GPIO 34    │
  [Relay]     <======== │  GPIO 25    │
                        │             │
                        │  WiFi 📶    │ ========> MQTT Broker
                        └─────────────┘
```

---

## 💻 Arduino Sketch

### Full ESP32 Code

```cpp
// ================================================
// TamperGuard IoT Device - ESP32
// ================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MPU6050.h>
#include "HX711.h"
#include <ArduinoJson.h>

// ===== Configuration =====
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// Device Configuration
const char* deviceId = "ESP32-001"; // UNIQUE per device
const char* deviceType = "WEIGHING_MACHINE";
const char* location = "Shop ABC, Delhi";

// MQTT Topics
const char* topic_data = "tamper/esp32/data";
const char* topic_cmd = "tamper/esp32/cmd";

// Pin Definitions
#define LOADCELL_DOUT_PIN  22
#define LOADCELL_SCK_PIN   23
#define HALL_SENSOR_PIN    34
#define RELAY_PIN          25
#define LED_PIN            2

// Sensor Objects
HX711 scale;
MPU6050 mpu;
WiFiClient espClient;
PubSubClient client(espClient);

// Variables
float weight = 0.0;
float calibration_factor = 2280.0; // Adjust based on calibration
bool magneticTamper = false;
float tiltX = 0.0, tiltY = 0.0, tiltZ = 0.0;
bool deviceLocked = false;
unsigned long lastMsg = 0;
const long interval = 5000; // Publish every 5 seconds

// ===== Setup =====
void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(HALL_SENSOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Initial relay state (unlocked)
  digitalWrite(RELAY_PIN, HIGH); // HIGH = device operational
  digitalWrite(LED_PIN, LOW);
  
  // Initialize sensors
  Serial.println("Initializing HX711...");
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(calibration_factor);
  scale.tare(); // Reset to zero
  
  Serial.println("Initializing MPU6050...");
  Wire.begin(21, 22); // SDA, SCL
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("MPU6050 connection failed!");
  }
  
  // Connect to WiFi
  setup_wifi();
  
  // Configure MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("Setup complete!");
}

// ===== WiFi Connection =====
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink while connecting
  }
  
  digitalWrite(LED_PIN, HIGH); // Solid when connected
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

// ===== MQTT Callback =====
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Parse JSON command
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("JSON parse failed!");
    return;
  }
  
  String cmd = doc["command"];
  String targetDevice = doc["deviceId"];
  
  // Check if command is for this device
  if (targetDevice != deviceId && targetDevice != "ALL") {
    return;
  }
  
  if (cmd == "LOCK") {
    lockDevice();
  } else if (cmd == "UNLOCK") {
    unlockDevice();
  } else if (cmd == "CALIBRATE") {
    scale.tare();
    Serial.println("Calibration reset to zero");
  }
}

// ===== Device Locking =====
void lockDevice() {
  deviceLocked = true;
  digitalWrite(RELAY_PIN, LOW); // Cut power to device
  digitalWrite(LED_PIN, LOW);
  Serial.println("Device LOCKED due to tampering");
  
  // Send lock confirmation
  publishStatus("LOCKED");
}

void unlockDevice() {
  deviceLocked = false;
  digitalWrite(RELAY_PIN, HIGH); // Restore power
  digitalWrite(LED_PIN, HIGH);
  Serial.println("Device UNLOCKED by admin");
  
  // Send unlock confirmation
  publishStatus("UNLOCKED");
}

// ===== MQTT Reconnect =====
void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
      // Subscribe to command topic
      client.subscribe(topic_cmd);
      Serial.print("Subscribed to: ");
      Serial.println(topic_cmd);
      
      // Announce online status
      publishStatus("ONLINE");
      
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// ===== Publish Status =====
void publishStatus(const char* status) {
  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["status"] = status;
  doc["timestamp"] = millis();
  
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(topic_data, buffer);
}

// ===== Read Sensors =====
void readSensors() {
  // Read weight
  if (scale.is_ready()) {
    weight = scale.get_units(5); // Average of 5 readings
    if (weight < 0) weight = 0; // No negative weights
  }
  
  // Read magnetic field (Hall sensor)
  int hallValue = analogRead(HALL_SENSOR_PIN);
  magneticTamper = (hallValue < 2000); // Threshold depends on your sensor
  
  // Read tilt (MPU6050)
  int16_t ax, ay, az;
  mpu.getAcceleration(&ax, &ay, &az);
  tiltX = ax / 16384.0; // Convert to g-force
  tiltY = ay / 16384.0;
  tiltZ = az / 16384.0;
  
  // Detect tilt tampering (if tilted beyond threshold)
  float tiltAngle = atan2(tiltY, tiltZ) * 180 / PI;
  bool tiltTamper = (abs(tiltAngle) > 15); // >15 degrees from level
  
  // Auto-lock if tampering detected
  if ((magneticTamper || tiltTamper) && !deviceLocked) {
    Serial.println("⚠️ TAMPERING DETECTED!");
    lockDevice();
  }
}

// ===== Publish Data =====
void publishData() {
  StaticJsonDocument<512> doc;
  
  doc["deviceId"] = deviceId;
  doc["deviceType"] = deviceType;
  doc["location"] = location;
  doc["timestamp"] = millis();
  
  // Sensor data
  JsonObject sensors = doc.createNestedObject("sensors");
  
  JsonObject weightObj = sensors.createNestedObject("weight");
  weightObj["value"] = weight;
  weightObj["unit"] = "kg";
  
  JsonObject magneticObj = sensors.createNestedObject("magnetic");
  magneticObj["tampered"] = magneticTamper;
  
  JsonObject tiltObj = sensors.createNestedObject("tilt");
  tiltObj["x"] = tiltX;
  tiltObj["y"] = tiltY;
  tiltObj["z"] = tiltZ;
  
  // Device status
  doc["tampered"] = (magneticTamper || deviceLocked);
  doc["locked"] = deviceLocked;
  doc["status"] = deviceLocked ? "BLOCKED" : "ACTIVE";
  
  // Serialize and publish
  char buffer[512];
  serializeJson(doc, buffer);
  
  bool success = client.publish(topic_data, buffer);
  if (success) {
    Serial.println("Data published successfully");
    Serial.println(buffer);
  } else {
    Serial.println("Publish failed!");
  }
}

// ===== Main Loop =====
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Read all sensors
    readSensors();
    
    // Publish data
    publishData();
    
    // Blink LED to show activity
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
  }
}
```

### Example Output

```json
{
  "deviceId": "ESP32-001",
  "deviceType": "WEIGHING_MACHINE",
  "location": "Shop ABC, Delhi",
  "timestamp": 12345678,
  "sensors": {
    "weight": {
      "value": 2.45,
      "unit": "kg"
    },
    "magnetic": {
      "tampered": false
    },
    "tilt": {
      "x": 0.02,
      "y": -0.01,
      "z": 0.98
    }
  },
  "tampered": false,
  "locked": false,
  "status": "ACTIVE"
}
```

---

## 📡 MQTT Configuration

### Production MQTT Setup

**For production, use authenticated broker:**

1. **HiveMQ Cloud** (Recommended)
   - Free tier: 100 connections
   - Sign up: https://console.hivemq.cloud/
   - Get broker URL, username, password

2. **Update Arduino Code:**
```cpp
const char* mqtt_server = "your-cluster.s1.eu.hivemq.cloud";
const int mqtt_port = 8883; // Secure port
const char* mqtt_user = "your_username";
const char* mqtt_pass = "your_password";

// In reconnect function:
if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
  // ...
}
```

3. **Enable TLS (Advanced):**
```cpp
#include <WiFiClientSecure.h>

WiFiClientSecure espClient;
PubSubClient client(espClient);

void setup() {
  espClient.setInsecure(); // For testing only
  // Production: espClient.setCACert(root_ca);
}
```

---

## ⚖️ Calibration

### Load Cell Calibration

```cpp
// Calibration sketch
void calibrate() {
  scale.set_scale();
  scale.tare();
  
  Serial.println("Place known weight (e.g., 1kg)");
  delay(5000);
  
  long reading = scale.get_units(10);
  float known_weight = 1.0; // kg
  
  float calibration_factor = reading / known_weight;
  Serial.print("Calibration factor: ");
  Serial.println(calibration_factor);
  
  scale.set_scale(calibration_factor);
}
```

**Steps:**
1. Upload calibration sketch
2. Open Serial Monitor
3. Place known weight (1kg, 5kg, etc.)
4. Note the calibration factor printed
5. Update `calibration_factor` in main sketch

---

## 🔧 Troubleshooting

### Device Not Connecting to WiFi

**Check:**
- SSID and password correct
- WiFi signal strength
- ESP32 antenna not blocked

**Solution:**
```cpp
// Add timeout
int attempts = 0;
while (WiFi.status() != WL_CONNECTED && attempts < 20) {
  delay(500);
  attempts++;
}
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("WiFi failed, restarting...");
  ESP.restart();
}
```

### MQTT Not Connecting

**Check:**
- Broker URL and port correct
- Firewall not blocking port 1883/8883
- Internet connectivity

**Debug:**
```cpp
Serial.print("MQTT State: ");
Serial.println(client.state());
// -4: Connection timeout
// -3: Connection lost
// -2: Connect failed
// -1: Disconnected
//  0: Connected
```

### Load Cell Readings Unstable

**Solutions:**
- Add capacitor (0.1µF) between VCC and GND
-Ensure good wiring (no loose connections)
- Keep load cell wires away from power lines
- Use shielded cable if possible
- Add averaging:
  ```cpp
  float average = 0;
  for (int i = 0; i < 10; i++) {
    average += scale.get_units();
    delay(100);
  }
  weight = average / 10.0;
  ```

### False Tamper Alerts

**Adjust Thresholds:**
```cpp
// Magnetic threshold
const int MAGNETIC_THRESHOLD = 2000; // Tune based on environment

// Tilt threshold
const float TILT_THRESHOLD = 20.0; // degrees
```

---

## 📦 Deployment Checklist

Before deploying to field:

- [ ] HX711 calibrated with known weights
- [ ] MPU6050 tilt threshold tested
- [ ] Hall sensor tested with magnet
- [ ] Relay lock mechanism tested
- [ ] MQTT connection stable for 24 hours
- [ ] Power supply adequate (5V 2A minimum)
- [ ] Enclosure weatherproof
- [ ] Device ID unique and registered in system
- [ ] Location coordinates accurate
- [ ] Test tamper detection (tilt, magnet, weight change)

---

## 📞 Support

For IoT setup issues:
- **Email**: iot-support@tamperguard.com
- **Documentation**: https://docs.tamperguard.com
- **Forum**: https://community.tamperguard.com

---

**Last Updated**: March 12, 2026
