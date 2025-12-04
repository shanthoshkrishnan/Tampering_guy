import time
import random
import hashlib
import json
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from collections import deque
from queue import Queue

from flask import (
    Flask,
    render_template_string,
    request,
    Response,
    jsonify,
    redirect,
    url_for,
)

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from twilio.rest import Client

# -----------------------
# CONFIGURATION - UPDATE WITH YOUR REAL VALUES
# -----------------------

# Get these from: https://console.twilio.com/
TWILIO_ACCOUNT_SID = "AC4739c34c664213bae1c115c4d93732d6"  # Your Account SID
TWILIO_AUTH_TOKEN = "7fbd46e8b6fe039f837d0b0c9137e485"    # Your Auth Token
TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886"  # Twilio's WhatsApp number
TWILIO_WHATSAPP_TO = "whatsapp:+919629517344"   # YOUR WhatsApp number (verified in sandbox)

EMAIL_ENABLED = False
EMAIL_SENDER = "your-email@gmail.com"
EMAIL_PASSWORD = "your-app-password"
EMAIL_RECEIVER = "receiver-email@gmail.com"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

SEND_TEST_ALERT_ON_START = False
ALERT_COOLDOWN = 60  # Reduced to 1 minute for testing
last_alert_time = {}

# -----------------------
# Initialize Twilio with detailed diagnostics
# -----------------------
print("\n" + "=" * 80)
print("INITIALIZING TWILIO...")
print("=" * 80)

TWILIO_ENABLED = False
TWILIO_ERROR_MESSAGE = None

try:
    # Validate credential format
    if not TWILIO_ACCOUNT_SID.startswith("AC"):
        raise ValueError("Account SID must start with 'AC'")
    
    if len(TWILIO_AUTH_TOKEN) != 32:
        raise ValueError(f"Auth Token must be 32 characters (yours: {len(TWILIO_AUTH_TOKEN)})")
    
    print(f"Account SID: {TWILIO_ACCOUNT_SID[:10]}... (format OK)")
    print(f"Auth Token: {'*' * 28}{TWILIO_AUTH_TOKEN[-4:]} (length OK)")
    print(f"WhatsApp From: {TWILIO_WHATSAPP_FROM}")
    print(f"WhatsApp To: {TWILIO_WHATSAPP_TO}")
    
    # Initialize client
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    # Verify account access
    print("\nVerifying Twilio account...")
    account = client.api.accounts(TWILIO_ACCOUNT_SID).fetch()
    print(f"✓ Account Status: {account.status}")
    print(f"✓ Account Type: {account.type}")
    
    TWILIO_ENABLED = True
    print("\n✓✓✓ TWILIO CLIENT INITIALIZED SUCCESSFULLY ✓✓✓")
    
except ValueError as e:
    TWILIO_ENABLED = False
    TWILIO_ERROR_MESSAGE = str(e)
    print(f"\n❌ Credential Format Error: {e}")
    
except Exception as e:
    TWILIO_ENABLED = False
    TWILIO_ERROR_MESSAGE = str(e)
    print(f"\n❌ Twilio Initialization Failed: {e}")
    
    error_str = str(e).lower()
    if "authenticate" in error_str or "20003" in error_str:
        print("\n🔧 SOLUTION: Your credentials are incorrect")
        print("   1. Go to: https://console.twilio.com/")
        print("   2. Copy your Account SID (starts with AC)")
        print("   3. Copy your Auth Token (32 characters)")
        print("   4. Update the code with correct values")
    else:
        print("\n🔧 SOLUTION: Check your internet connection")

print("=" * 80 + "\n")

app = Flask(_name_)

state_lock = threading.Lock()
running_event = threading.Event()
manual_trigger_q = Queue(maxsize=10)

DEVICE = "Tamper Detector"
device_messages = {
    "Energy Meter": "Energy Meter Tamper: Voltage Anomaly",
    "Fuel Dispenser": "Fuel Dispenser Tamper: Flow Irregularity",
    "Tamper Detector": "Tamper Unit Alert: Tilt/Spike Detected",
}

last_metrics = {"voltage": None, "tilt": None, "spike": None, "fuel_flow": None}
time_buf = deque(maxlen=60)
volt_buf = deque(maxlen=60)
tilt_buf = deque(maxlen=60)
spike_buf = deque(maxlen=60)
score_buf = deque(maxlen=60)
tamper_events = deque(maxlen=1000)
blockchain = []


class Kalman:
    def _init_(self):
        self.estimate = 0.0
        self.error = 1.0
        self.process_noise = 0.01
        self.measure_noise = 0.1

    def filter(self, measurement):
        kalman_gain = self.error / (self.error + self.measure_noise)
        self.estimate = self.estimate + kalman_gain * (measurement - self.estimate)
        self.error = (1 - kalman_gain) * self.error + abs(self.estimate) * self.process_noise
        return self.estimate


kalman_voltage = Kalman()
kalman_tilt = Kalman()

X = np.array([[230, 1, 0], [310, 20, 1], [228, 2, 0], [340, 15, 1]])
y = np.array([0, 1, 0, 1])
model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X, y)

adaptive_threshold = 0.60


def update_threshold(score: float) -> None:
    global adaptive_threshold
    adaptive_threshold = (adaptive_threshold * 0.98) + (score * 0.02)


def add_block(tamper_data: dict) -> None:
    block = {
        "timestamp": str(datetime.now()),
        "data": tamper_data,
        "previous_hash": blockchain[-1]["hash"] if blockchain else "GENESIS",
    }
    block["hash"] = hashlib.sha256(json.dumps(block, sort_keys=True).encode()).hexdigest()
    blockchain.append(block)


def federated_update(local_reading, label: int) -> None:
    global model
    try:
        current_classes = set(model.classes_)
        if label not in current_classes:
            return
        model.fit([local_reading], [label])
    except Exception as e:
        print(f"Federated update error: {e}")


def build_metric_string(device: str, metrics: dict):
    v = metrics.get("voltage")
    t = metrics.get("tilt")
    s = metrics.get("spike")
    f = metrics.get("fuel_flow")

    short_desc = "Anomalous Reading"
    metric_display = ""
    metric_pipe = ""

    if device == "Fuel Dispenser":
        if f is not None:
            short_desc = "Abnormal Flow Rate"
            metric_display = f"(Flow={f:.2f} L/s)"
            metric_pipe = f"Flow={f:.2f} L/s"
        else:
            short_desc = "Flow Data Unavailable"
            metric_pipe = "Flow=N/A"
    elif device == "Energy Meter":
        if v is not None:
            short_desc = "Abnormal Voltage"
            metric_display = f"(Voltage={v:.2f} V)"
            metric_pipe = f"Voltage={v:.2f} V"
        else:
            short_desc = "Voltage Data Unavailable"
            metric_pipe = "Voltage=N/A"
    else:
        parts = []
        parts_pipe = []
        if t is not None:
            parts.append(f"Tilt={t:.2f}°")
            parts_pipe.append(f"Tilt={t:.2f}°")
        if v is not None:
            parts.append(f"Voltage={v:.2f}V")
            parts_pipe.append(f"Voltage={v:.2f}V")
        if s is not None:
            parts.append(f"Spike={int(s)}")
            parts_pipe.append(f"Spike={int(s)}")
        if parts:
            short_desc = "Anomalous Metrics"
            metric_display = "(" + ", ".join(parts) + ")"
            metric_pipe = " | ".join(parts_pipe)
        else:
            short_desc = "Metrics Unavailable"
            metric_pipe = "N/A"
    return short_desc, metric_display, metric_pipe


def send_email_alert(subject: str, body: str) -> bool:
    if not EMAIL_ENABLED:
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = EMAIL_SENDER
        msg["To"] = EMAIL_RECEIVER
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()

        print(f"✓ Email alert sent to {EMAIL_RECEIVER}")
        return True
    except Exception as e:
        print(f"✗ Failed to send email alert: {e}")
        return False


def send_whatsapp_alert(message: str) -> bool:
    """Send WhatsApp alert with enhanced error reporting"""
    
    if not TWILIO_ENABLED:
        print("\n" + "=" * 80)
        print("❌ WHATSAPP ALERT FAILED - TWILIO NOT INITIALIZED")
        print("=" * 80)
        if TWILIO_ERROR_MESSAGE:
            print(f"Error: {TWILIO_ERROR_MESSAGE}")
        print("\n🔧 TO FIX THIS:")
        print("1. Check your Twilio credentials at: https://console.twilio.com/")
        print("2. Make sure your WhatsApp number is verified in Twilio Sandbox")
        print("3. Restart the application after fixing credentials")
        print("=" * 80 + "\n")
        return False

    try:
        if len(message) > 1600:
            message = message[:1597] + "..."

        print("\n" + "=" * 80)
        print("📱 SENDING WHATSAPP MESSAGE")
        print("=" * 80)
        print(f"From: {TWILIO_WHATSAPP_FROM}")
        print(f"To: {TWILIO_WHATSAPP_TO}")
        print(f"Message length: {len(message)} characters")
        print("\nSending...")

        whatsapp_message = client.messages.create(
            body=message, 
            from_=TWILIO_WHATSAPP_FROM, 
            to=TWILIO_WHATSAPP_TO
        )

        print(f"\n✓✓✓ SUCCESS! MESSAGE SENT ✓✓✓")
        print(f"Message SID: {whatsapp_message.sid}")
        print(f"Status: {whatsapp_message.status}")
        print(f"Direction: {whatsapp_message.direction}")
        print("=" * 80 + "\n")
        return True

    except Exception as e:
        print(f"\n❌ WHATSAPP SEND FAILED")
        print(f"Error: {e}")
        print("=" * 80)
        
        error_str = str(e).lower()
        
        if "21408" in str(e) or "unverified" in error_str or "not authorized" in error_str:
            print("\n🔧 SOLUTION: Your WhatsApp number is NOT verified")
            print("TO FIX:")
            print("1. Open WhatsApp on your phone (+919342610622)")
            print("2. Send a message to: +14155238886")
            print("3. Message text: 'join [your-code]' (get code from Twilio console)")
            print("4. Wait for 'You are all set!' confirmation")
            print("5. Then try again")
            print("\nGet your join code from:")
            print("https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn")
            
        elif "20003" in str(e) or "authenticate" in error_str:
            print("\n🔧 SOLUTION: Wrong Twilio credentials")
            print("TO FIX:")
            print("1. Go to: https://console.twilio.com/")
            print("2. Copy your Account SID (starts with 'AC')")
            print("3. Copy your Auth Token")
            print("4. Update in code and restart")
            
        elif "not a valid phone number" in error_str:
            print("\n🔧 SOLUTION: Invalid phone number format")
            print(f"Your number: {TWILIO_WHATSAPP_TO}")
            print("Correct format: whatsapp:+919342610622")
            
        else:
            print("\n🔧 POSSIBLE SOLUTIONS:")
            print("- Check your internet connection")
            print("- Check Twilio account balance/status")
            print("- View error details at: https://console.twilio.com/")
        
        print("=" * 80 + "\n")
        return False


def check_alert_cooldown(tamper_type: str) -> bool:
    global last_alert_time
    
    if tamper_type == "Manual Voltage Injection" or tamper_type == "System Test":
        print(f"⚡ {tamper_type} detected - bypassing cooldown")
        last_alert_time[tamper_type] = time.time()
        return True
    
    current_time = time.time()
    if tamper_type in last_alert_time:
        time_since_last = current_time - last_alert_time[tamper_type]
        if time_since_last < ALERT_COOLDOWN:
            print(
                f"⏳ Alert cooldown active for {tamper_type}. "
                f"{int(ALERT_COOLDOWN - time_since_last)}s remaining"
            )
            return False

    last_alert_time[tamper_type] = current_time
    return True


def send_notification(tamper_type: str) -> None:
    if not check_alert_cooldown(tamper_type):
        return

    device_tag = device_messages.get(DEVICE, f"{DEVICE}: Tampering Detected")
    short_desc, metric_display, metric_pipe = build_metric_string(DEVICE, last_metrics)

    print("\n" + "=" * 80)
    print("🔴 NOTIFICATION TRIGGERED!")
    print("=" * 80)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Device: {DEVICE}")
    print(f"Tamper Type: {tamper_type}")
    print(f"Metrics: {metric_pipe}")
    print("=" * 80)

    whatsapp_msg = (
        "🔴 TAMPER ALERT 🔴\n\n"
        f"Device: {device_tag}\n"
        f"Type: {tamper_type}\n"
        f"Description: {short_desc}\n"
        f"Metrics: {metric_pipe}\n"
        f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"Threshold: {adaptive_threshold:.3f}\n"
        "\nAction Required: Investigate immediately!"
    )

    email_subject = f"🚨 Tamper Alert: {device_tag} - {tamper_type}"
    email_body = whatsapp_msg

    whatsapp_success = send_whatsapp_alert(whatsapp_msg)

    email_success = False
    if EMAIL_ENABLED:
        email_success = send_email_alert(email_subject, email_body)

    if not whatsapp_success and not email_success:
        print("\n⚠ All notification methods failed, but alert is logged")


def send_test_alert() -> None:
    print("\n" + "=" * 80)
    print("🧪 SENDING TEST ALERT...")
    print("=" * 80)

    test_type = "System Test"
    device_tag = device_messages.get(DEVICE, f"{DEVICE}: Tampering Detected")

    test_whatsapp_msg = (
        "🧪 TEST ALERT 🧪\n\n"
        f"Device: {device_tag}\n"
        f"Type: {test_type}\n"
        "Status: System is working correctly\n"
        f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        "\nThis is a test notification from Tamper Detection System."
    )

    test_email_subject = f"🧪 Test Alert: {device_tag}"
    test_email_body = test_whatsapp_msg

    whatsapp_test = send_whatsapp_alert(test_whatsapp_msg)

    email_test = False
    if EMAIL_ENABLED:
        email_test = send_email_alert(test_email_subject, test_email_body)

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("- WhatsApp:", "✓ SUCCESS" if whatsapp_test else "✗ FAILED")
    if EMAIL_ENABLED:
        print("- Email:", "✓ SUCCESS" if email_test else "✗ FAILED")
    print("=" * 80 + "\n")


def simulate_sensors(device: str):
    base_voltage = 230 if device == "Energy Meter" else 12
    tilt = random.uniform(0, 3)
    spike = 0
    fuel_flow = random.uniform(1, 4) if device == "Fuel Dispenser" else None

    if random.random() < 0.05:
        spike = 1

    voltage = base_voltage + random.uniform(-3, 3)
    if spike:
        voltage += random.uniform(50, 120)

    return voltage, tilt, spike, fuel_flow


def background_loop():
    global DEVICE
    print("Background sensor thread started.")

    if SEND_TEST_ALERT_ON_START:
        time.sleep(2)
        send_test_alert()

    while True:
        running_event.wait()

        with state_lock:
            device = DEVICE

        manual_tamper_triggered = False
        try:
            while not manual_trigger_q.empty():
                manual_trigger_q.get_nowait()
                manual_tamper_triggered = True
        except Exception:
            pass

        voltage, tilt, spike, fuel_flow = simulate_sensors(device)

        tamper_type = None
        if manual_tamper_triggered:
            voltage += random.uniform(80, 150)
            spike = 1
            tilt += random.uniform(10, 20)
            tamper_type = "Manual Voltage Injection"
            print(f"\n🔴 MANUAL TAMPER TRIGGERED! Voltage boosted to {voltage:.1f}V")

        v_f = kalman_voltage.filter(voltage)
        t_f = kalman_tilt.filter(tilt)

        with state_lock:
            last_metrics["voltage"] = v_f
            last_metrics["tilt"] = t_f
            last_metrics["spike"] = spike
            last_metrics["fuel_flow"] = fuel_flow

        reading = [v_f, t_f, spike]
        reading_np = np.array(reading).reshape(1, -1)

        try:
            probs = model.predict_proba(reading_np)[0]
            score = probs[1] if len(probs) > 1 else 0.0
        except Exception:
            score = 0.0

        now = datetime.now().strftime("%H:%M:%S")
        with state_lock:
            time_buf.append(now)
            volt_buf.append(v_f)
            tilt_buf.append(t_f)
            spike_buf.append(int(spike))
            score_buf.append(float(score))

        if manual_tamper_triggered:
            is_tamper = True
            print(f"✓ Manual tamper detection FORCED (bypassing ML model)")
        else:
            is_tamper = score > adaptive_threshold

        if is_tamper and tamper_type is None:
            if spike:
                tamper_type = "Spike Tamper"
            elif t_f > 15:
                tamper_type = "Tilt Tamper"
            elif v_f > 260:
                tamper_type = "Voltage Tamper"
            else:
                tamper_type = "AI Pattern Tamper"

        if is_tamper:
            entry = {
                "device": device,
                "voltage": float(v_f),
                "tilt": float(t_f),
                "spike": int(spike),
                "fuel_flow": float(fuel_flow) if fuel_flow is not None else None,
                "tamper_type": tamper_type,
                "time": now,
            }
            with state_lock:
                tamper_events.appendleft(entry)
            add_block(entry)
            
            send_notification(tamper_type)
            
            try:
                federated_update(reading, 1)
            except Exception:
                pass

        update_threshold(score)
        time.sleep(2)


bg_thread = threading.Thread(target=background_loop, daemon=True)
bg_thread.start()


def event_stream():
    while True:
        with state_lock:
            payload = {
                "time": list(time_buf),
                "voltage": list(volt_buf),
                "tilt": list(tilt_buf),
                "spike": list(spike_buf),
                "score": list(score_buf),
                "tamper_events": list(tamper_events)[:12],
                "adaptive_threshold": adaptive_threshold,
                "device": DEVICE,
                "running": running_event.is_set(),
                "chain_height": len(blockchain),
            }
        yield f"data: {json.dumps(payload)}\n\n"
        time.sleep(1)


@app.route("/stream")
def stream():
    return Response(event_stream(), mimetype="text/event-stream")


INDEX_HTML = """
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tamper Detection Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root{
      --bg:#0f1115;
      --panel:#131519;
      --muted:#9aa4b2;
      --accent-1:#ff6a00;
      --accent-2:#00b0ff;
      --success: #2dd36f;
      --danger: #ff4d6d;
      --card-shadow: 0 6px 18px rgba(2,6,23,0.6);
      --radius: 12px;
      --mono: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    html,body {
      height:100%;
      margin:0;
      background: radial-gradient(1200px 400px at 10% 10%, rgba(0,176,255,0.04), transparent 6%),
                  radial-gradient(800px 300px at 90% 90%, rgba(255,106,0,0.03), transparent 8%),
                  var(--bg);
      color:#e6eef6;
      font-family: var(--mono);
      padding:20px 24px;
      box-sizing:border-box;
      overflow-x: hidden;
    }
    h2 {
      margin:0 0 12px 0;
      font-weight:600;
      letter-spacing:0.2px;
      color: #f3f7fb;
    }
    .topbar {
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:18px;
    }
    .layout {
      display:grid;
      grid-template-columns: 320px 1fr;
      gap:18px;
      align-items:start;
    }
    .card {
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
      border-radius: var(--radius);
      padding:16px;
      box-shadow: var(--card-shadow);
      border: 1px solid rgba(255,255,255,0.03);
    }
    #controls { position: sticky; top:20px; }
    label { color:var(--muted); font-size:13px; display:block; margin-bottom:6px; }
    select {
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
      border: 1px solid rgba(255,255,255,0.04);
      color: #e6eef6;
      padding:10px 12px;
      border-radius:8px;
      outline:none;
      width:100%;
      box-sizing:border-box;
    }
    .controls-row { display:flex; gap:10px; margin-top:8px; }
    button.btn {
      appearance:none;
      border: none;
      cursor:pointer;
      padding:10px 14px;
      border-radius:10px;
      font-weight:600;
      letter-spacing:0.2px;
      transition: transform .12s ease, box-shadow .12s ease;
      box-shadow: 0 6px 18px rgba(2,6,23,0.45);
      color: #071023;
      flex: 1;
    }
    .btn-start {
      background: linear-gradient(90deg, var(--accent-2), #4ad7ff);
      box-shadow: 0 8px 30px rgba(0,176,255,0.12), 0 2px 6px rgba(0,0,0,0.6);
    }
    .btn-stop {
      background: linear-gradient(90deg, #ff8b5a, var(--accent-1));
      box-shadow: 0 8px 30px rgba(255,106,0,0.10), 0 2px 6px rgba(0,0,0,0.6);
    }
    .btn-manual {
      background: linear-gradient(90deg, #ff6a00, #ffd9b3);
      color:#061018;
      box-shadow: 0 8px 30px rgba(255,106,0,0.10);
      width: 100%;
    }
    .btn-test {
      background: linear-gradient(90deg, #9d50ff, #d9b3ff);
      color:#061018;
      box-shadow: 0 8px 30px rgba(157,80,255,0.10);
      width: 100%;
      margin-top: 8px;
    }
    .btn:active { transform: translateY(1px) scale(0.997); }
    .status {
      display:inline-flex;
      gap:8px;
      align-items:center;
      margin-top:10px;
    }
    .led {
      width:12px; height:12px; border-radius:50%;
      box-shadow: 0 0 10px rgba(0,0,0,0.6), inset 0 -2px 6px rgba(0,0,0,0.2);
      background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
      transform: translateY(0.5px);
    }
    .led.running {
      background: radial-gradient(circle at 30% 30%, var(--success), #0f5b3d);
      box-shadow: 0 0 10px rgba(45,211,111,0.18);
    }
    .led.stopped {
      background: linear-gradient(180deg,#222,#111);
      border: 1px solid rgba(255,255,255,0.03);
      box-shadow:none;
    }
    .muted { color:var(--muted); font-size:13px; }
    hr.sep {
      border:0;
      height:1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
      margin:12px 0;
    }
    .panel {
      display:flex;
      flex-direction:column;
      gap:12px;
    }
    .charts {
      display:grid;
      grid-template-columns: 1fr;
      gap:12px;
    }
    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
    }
    canvas {
      background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
      border-radius:8px;
      padding:12px;
    }
    #tamper-log {
      max-height: 360px;
      overflow-y: auto;
      overflow-x: hidden;
      padding:6px;
      display:flex;
      flex-direction:column;
      gap:8px;
    }
    #tamper-log::-webkit-scrollbar { width: 6px; }
    #tamper-log::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.02);
      border-radius: 3px;
    }
    #tamper-log::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
    }
    .event {
      display:flex;
      justify-content:space-between;
      gap:8px;
      padding:10px;
      border-radius:10px;
      background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005));
      border: 1px solid rgba(255,255,255,0.02);
      transition: transform .12s ease, box-shadow .12s ease;
    }
    .event:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(2,6,23,0.6);
    }
    .event .left { display:flex; flex-direction:column; gap:2px; }
    .event .time { font-size:13px; color:var(--muted); }
    .chip {
      padding:6px 8px;
      border-radius:999px;
      font-weight:600;
      font-size:12px;
      color:#071023;
    }
    .chip-voltage {
      background: linear-gradient(90deg, #ffd9b3, #ffb27a);
    }
    .chip-tilt {
      background: linear-gradient(90deg, #bfe9ff, #7fd8ff);
    }
    .chip-spike {
      background: linear-gradient(90deg, #ffd1e6, #ff8bb3);
    }
    .notification-status {
      margin-top: 12px;
      padding: 10px;
      border-radius: 8px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.03);
    }
    .status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 8px;
    }
    .status-dot.active {
      background: #2dd36f;
      box-shadow: 0 0 8px rgba(45,211,111,0.5);
    }
    .status-dot.inactive { background: #ff4d6d; }
    .status-dot.warning {
      background: #ffaa00;
      box-shadow: 0 0 8px rgba(255,170,0,0.5);
    }
    @media (max-width: 900px){
      .layout { grid-template-columns: 1fr; }
      #controls { position:relative; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <h2>🛡 Tamper Detection Dashboard</h2>
    <div style="margin-left:auto; display:flex; gap:12px; align-items:center;">
      <div class="muted">Enhanced v2.2 with Diagnostics</div>
    </div>
  </div>
  <div class="layout">
    <div id="controls" class="card">
      <form id="device-form" method="post" action="/set_device">
        <label for="device-select">Device Type</label>
        <select name="device" id="device-select">
          <option value="Energy Meter" {{ 'selected' if device=='Energy Meter' else '' }}>Energy Meter</option>
          <option value="Fuel Dispenser" {{ 'selected' if device=='Fuel Dispenser' else '' }}>Fuel Dispenser</option>
          <option value="Tamper Detector" {{ 'selected' if device=='Tamper Detector' else '' }}>Tamper Detector</option>
        </select>
      </form>
      <div class="controls-row" style="margin-top:12px;">
        <button class="btn btn-start" id="start-btn">▶ Start</button>
        <button class="btn btn-stop" id="stop-btn">⏹ Stop</button>
      </div>
      <div style="margin-top:10px;">
        <button class="btn btn-manual" id="manual-btn">⚠ Trigger Manual Tamper</button>
        <button class="btn btn-test" id="test-btn">🧪 Test Alert System</button>
      </div>
      <div class="notification-status">
        <div class="status-item">
          <span><span id="whatsapp-status" class="status-dot warning"></span> WhatsApp</span>
          <span id="whatsapp-status-text" class="muted">Checking...</span>
        </div>
        <div class="status-item">
          <span><span id="email-status" class="status-dot warning"></span> Email</span>
          <span id="email-status-text" class="muted">Checking...</span>
        </div>
      </div>
      <div class="status" style="margin-top:12px;">
        <div id="led" class="led stopped"></div>
        <div>
          <div class="muted">System Status</div>
          <div id="system-state" style="font-weight:700">Stopped</div>
        </div>
      </div>
      <div style="margin-top:12px;">
        <div class="muted">Adaptive Threshold</div>
        <div style="font-weight:700; margin-top:6px;"><span id="threshold">-</span></div>
      </div>
      <hr class="sep"/>
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>Recent Tamper Events</strong>
          <div class="muted" id="events-count">0</div>
        </div>
        <div id="tamper-log" style="margin-top:10px;"></div>
      </div>
    </div>
    <div class="panel">
      <div class="card charts">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div>
            <strong>Live Metrics</strong>
            <div class="muted">Voltage · Tilt · Spike Detection</div>
          </div>
          <div class="muted">Realtime Stream</div>
        </div>
        <div class="chart-container">
          <canvas id="chartMetrics"></canvas>
        </div>
        <div style="margin-top: 12px;"></div>
        <div class="chart-container">
          <canvas id="chartScore"></canvas>
        </div>
      </div>
      <div class="card" style="display:flex; gap:12px; align-items:center; justify-content:space-between;">
        <div>
          <strong>Blockchain Height</strong>
          <div class="muted" id="chain-height">0 blocks</div>
        </div>
        <div style="text-align:right" class="muted">
          <div>Last Update</div>
          <div id="last-update">--:--:--</div>
        </div>
      </div>
    </div>
  </div>
<script>
let evtSource = null;
let chartMetrics = null;
let chartScore = null;
function startSSE(){
  if(evtSource) evtSource.close();
  evtSource = new EventSource("/stream");
  evtSource.onmessage = function(e){
    try {
      updateUI(JSON.parse(e.data));
    } catch (err) {
      console.error("Error parsing SSE data:", err);
    }
  };
  evtSource.onerror = function(err){
    console.error("SSE connection error:", err);
    evtSource.close();
    setTimeout(startSSE, 2000);
  };
}
function updateUI(payload){
  if (chartMetrics && chartScore) updateCharts(payload);
  updateLog(payload.tamper_events || []);
  document.getElementById('threshold').innerText =
    payload.adaptive_threshold ? payload.adaptive_threshold.toFixed(3) : '-';
  document.getElementById('device-select').value = payload.device;
  updateSystemState(payload.running);
  document.getElementById('chain-height').innerText = payload.chain_height + " blocks";
  if(payload.time && payload.time.length) {
    document.getElementById('last-update').innerText =
      payload.time[payload.time.length-1];
  }
}
function updateSystemState(running){
  const led = document.getElementById('led');
  const state = document.getElementById('system-state');
  if(running){
    led.classList.remove('stopped');
    led.classList.add('running');
    state.innerText = 'Running';
    state.style.color = '#2dd36f';
  } else {
    led.classList.remove('running');
    led.classList.add('stopped');
    state.innerText = 'Stopped';
    state.style.color = '#ff4d6d';
  }
}
function updateCharts(payload){
  const t = payload.time || [];
  const v = payload.voltage || [];
  const ti = payload.tilt || [];
  const s = payload.spike || [];
  const sc = payload.score || [];
  if (chartMetrics) {
    chartMetrics.data.labels = t;
    chartMetrics.data.datasets[0].data = v;
    chartMetrics.data.datasets[1].data = ti;
    chartMetrics.data.datasets[2].data = s;
    chartMetrics.update('none');
  }
  if (chartScore) {
    chartScore.data.labels = t;
    chartScore.data.datasets[0].data = sc;
    chartScore.update('none');
  }
}
function updateLog(events){
  const container = document.getElementById('tamper-log');
  container.innerHTML = '';
  document.getElementById('events-count').innerText = events.length;
  if (events.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'muted';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.padding = '20px';
    emptyMsg.innerText = 'No tamper events detected yet';
    container.appendChild(emptyMsg);
    return;
  }
  events.forEach(e=>{
    const div = document.createElement('div');
    div.className = 'event';
    const left = document.createElement('div');
    left.className='left';
    let deviceIcon = '';
    if (e.device === 'Energy Meter') deviceIcon = '⚡';
    else if (e.device === 'Fuel Dispenser') deviceIcon = '⛽';
    else deviceIcon = '🛡';
    const v = (e.voltage != null ? e.voltage : 0).toFixed(1);
    const t = (e.tilt != null ? e.tilt : 0).toFixed(1);
    const s = (e.spike != null ? e.spike : 0);
    left.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="font-weight:700;color:#ffb27a">${e.tamper_type}</div>
        <div class="time muted">${deviceIcon} ${e.device}</div>
      </div>
      <div class="time">${e.time} · V: ${v} · T: ${t}°</div>
    `;
    const right = document.createElement('div');
    right.style.display='flex';
    right.style.flexDirection='column';
    right.style.alignItems='flex-end';
    right.style.gap='6px';
    const chipV = document.createElement('div');
    chipV.className='chip chip-voltage';
    chipV.innerText = 'V ' + v;
    const chipT = document.createElement('div');
    chipT.className='chip chip-tilt';
    chipT.innerText = 'T ' + t;
    const chipS = document.createElement('div');
    chipS.className='chip chip-spike';
    chipS.innerText = 'Spike ' + s;
    right.appendChild(chipV);
    right.appendChild(chipT);
    right.appendChild(chipS);
    div.appendChild(left);
    div.appendChild(right);
    container.appendChild(div);
  });
}
function postAction(path, body){
  return fetch(path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  }).then(r=>r.json());
}
function updateNotificationStatus() {
  fetch('/notification_status')
    .then(r => r.json())
    .then(data => {
      const whatsappStatus = document.getElementById('whatsapp-status');
      const whatsappText = document.getElementById('whatsapp-status-text');
      const emailStatus = document.getElementById('email-status');
      const emailText = document.getElementById('email-status-text');
      if (data.whatsapp_enabled) {
        whatsappStatus.className = 'status-dot active';
        whatsappText.innerText = 'Enabled';
        whatsappText.className = '';
      } else {
        whatsappStatus.className = 'status-dot inactive';
        whatsappText.innerText = 'Disabled';
        whatsappText.className = 'muted';
      }
      if (data.email_enabled) {
        emailStatus.className = 'status-dot active';
        emailText.innerText = 'Enabled';
        emailText.className = '';
      } else {
        emailStatus.className = 'status-dot inactive';
        emailText.innerText = 'Disabled';
        emailText.className = 'muted';
      }
    });
}
document.getElementById('start-btn').onclick = function(){
  postAction('/control', {action:'start'}).then(r=>{
    console.log('Start response:', r);
    updateSystemState(true);
  });
};
document.getElementById('stop-btn').onclick = function(){
  postAction('/control', {action:'stop'}).then(r=>{
    console.log('Stop response:', r);
    updateSystemState(false);
  });
};
document.getElementById('manual-btn').onclick = function(){
  postAction('/manual_trigger', {}).then(r=>{
    console.log('Manual trigger response:', r);
    alert('Manual tamper triggered! Check console for detailed alert status.');
  });
};
document.getElementById('test-btn').onclick = function(){
  postAction('/test_alert', {}).then(r=>{
    console.log('Test alert response:', r);
    alert('Test alert sent! Check console for detailed status.');
  });
};
document.getElementById('device-form').addEventListener('change', function(evt){
  const dev = document.getElementById('device-select').value;
  postAction('/set_device_ajax', {device: dev}).then(r=>{
    console.log('Device changed to:', dev);
  });
});
function initCharts() {
  const ctx = document.getElementById('chartMetrics').getContext('2d');
  chartMetrics = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Voltage',
          data: [],
          fill: true,
          backgroundColor: 'rgba(255, 178, 122, 0.1)',
          borderColor: '#ffb27a',
          tension: 0.2,
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: 'Tilt',
          data: [],
          fill: true,
          backgroundColor: 'rgba(127, 216, 255, 0.1)',
          borderColor: '#7fd8ff',
          tension: 0.2,
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: 'Spike',
          data: [],
          fill: false,
          borderColor: '#ff8bb3',
          tension: 0.1,
          stepped: true,
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#dfeaf6',
            font: { size: 12 }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9fb3c9', maxTicksLimit: 10 },
          grid: { color: 'rgba(255,255,255,0.02)' }
        },
        y: {
          ticks: { color: '#9fb3c9' },
          grid: { color: 'rgba(255,255,255,0.02)' },
          beginAtZero: false
        }
      }
    }
  });
  const ctx2 = document.getElementById('chartScore').getContext('2d');
  chartScore = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'AI Tamper Score',
        data: [],
        fill: true,
        backgroundColor: 'rgba(0,176,255,0.1)',
        borderColor: '#00b0ff',
        tension: 0.2,
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#dfeaf6',
            font: { size: 12 }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9fb3c9', maxTicksLimit: 10 },
          grid: { color: 'rgba(255,255,255,0.02)' }
        },
        y: {
          ticks: { color: '#9fb3c9' },
          grid: { color: 'rgba(255,255,255,0.02)' },
          min: 0,
          max: 1
        }
      }
    }
  });
}
window.onload = function(){
  initCharts();
  startSSE();
  updateNotificationStatus();
  const initialTime = [];
  const initialVoltage = [];
  const initialTilt = [];
  const initialSpike = [];
  const initialScore = [];
  for (let i = 0; i < 60; i++) {
    initialTime.push('');
    initialVoltage.push(0);
    initialTilt.push(0);
    initialSpike.push(0);
    initialScore.push(0);
  }
  chartMetrics.data.labels = initialTime;
  chartMetrics.data.datasets[0].data = initialVoltage;
  chartMetrics.data.datasets[1].data = initialTilt;
  chartMetrics.data.datasets[2].data = initialSpike;
  chartMetrics.update();
  chartScore.data.labels = initialTime;
  chartScore.data.datasets[0].data = initialScore;
  chartScore.update();
  setInterval(updateNotificationStatus, 30000);
};
window.addEventListener('beforeunload', function() {
  if (evtSource) evtSource.close();
});
</script>
</body>
</html>
"""


@app.route("/")
def index():
    with state_lock:
        device = DEVICE
    return render_template_string(INDEX_HTML, device=device)


@app.route("/set_device", methods=["POST"])
def set_device_form():
    global DEVICE
    device = request.form.get("device", "Tamper Detector")
    with state_lock:
        DEVICE = device
    return redirect(url_for("index"))


@app.route("/set_device_ajax", methods=["POST"])
def set_device_ajax():
    global DEVICE
    data = request.get_json() or {}
    device = data.get("device", "Tamper Detector")
    with state_lock:
        DEVICE = device
    return jsonify({"ok": True, "device": DEVICE})


@app.route("/control", methods=["POST"])
def control():
    data = request.get_json() or {}
    action = data.get("action")
    if action == "start":
        running_event.set()
        return jsonify({"ok": True, "running": True})
    elif action == "stop":
        running_event.clear()
        return jsonify({"ok": True, "running": False})
    return jsonify({"ok": False, "error": "unknown action"}), 400


@app.route("/manual_trigger", methods=["POST"])
def manual_trigger():
    try:
        manual_trigger_q.put_nowait(True)
        print("\n🔴 MANUAL TRIGGER BUTTON PRESSED - Alert will be sent on next cycle (within 2 seconds)")
    except Exception:
        pass
    return jsonify({"ok": True, "triggered": True})


@app.route("/test_alert", methods=["POST"])
def test_alert():
    send_test_alert()
    return jsonify(
        {
            "success": True,
            "message": "Test alert sent. Check console for detailed status.",
            "whatsapp_enabled": TWILIO_ENABLED,
            "email_enabled": EMAIL_ENABLED,
        }
    )


@app.route("/notification_status")
def notification_status():
    return jsonify(
        {
            "whatsapp_enabled": TWILIO_ENABLED,
            "email_enabled": EMAIL_ENABLED,
            "whatsapp_number": TWILIO_WHATSAPP_TO if TWILIO_ENABLED else None,
            "email_address": EMAIL_RECEIVER if EMAIL_ENABLED else None,
        }
    )


@app.route("/status")
def status():
    with state_lock:
        data = {
            "running": running_event.is_set(),
            "device": DEVICE,
            "adaptive_threshold": adaptive_threshold,
            "last_metrics": last_metrics,
            "tamper_events_count": len(tamper_events),
            "chain_height": len(blockchain),
            "notification_status": {
                "whatsapp_enabled": TWILIO_ENABLED,
                "email_enabled": EMAIL_ENABLED,
            },
        }
    return jsonify(data)


if _name_ == "_main_":
    print("\n" + "=" * 80)
    print("TAMPER DETECTION SYSTEM v2.2")
    print("=" * 80)
    print(f"\n🌐 Dashboard: http://127.0.0.1:5000")
    print("\n📱 Notification Status:")
    print(f"   WhatsApp: {'✓ ENABLED' if TWILIO_ENABLED else '✗ DISABLED (check console above)'}")
    print(f"   Email: {'✓ ENABLED' if EMAIL_ENABLED else '✗ DISABLED'}")

    if not TWILIO_ENABLED:
        print("\n" + "=" * 80)
        print("⚠  WHATSAPP SETUP REQUIRED")
        print("=" * 80)
        print("\nQUICK FIX STEPS:")
        print("1. Join Twilio WhatsApp Sandbox:")
        print("   - Open WhatsApp and send a message to: +14155238886")
        print("   - Get join code from: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn")
        print("   - Send: 'join [your-code]'")
        print("\n2. Verify your credentials:")
        print("   - Go to: https://console.twilio.com/")
        print("   - Get Account SID (starts with AC)")
        print("   - Get Auth Token (32 characters)")
        print("\n3. Update code and restart")
        print("=" * 80)

    print("\n📋 Usage:")
    print("   1. Press 'Start' button")
    print("   2. Press 'Test Alert System' to verify WhatsApp")
    print("   3. Press 'Trigger Manual Tamper' to simulate alert")
    print("\n" + "=" * 80 + "\n")

    app.run(debug=True, threaded=True, use_reloader=False, host="0.0.0.0", port=5000)