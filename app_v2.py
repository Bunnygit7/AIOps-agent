from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import joblib
import pandas as pd
import os
import json
from datetime import datetime, timedelta
from typing import Dict
from feature_engineering import build_features
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

#Requirments.txt: vertions can be added as per need
#fastapi 
#uvicorn 
#requests 
#pandas 
#scikit-learn 
#joblib 
#apscheduler 
#python-dateutil 
#numpy
#json 

#------------------ APP INITIALIZATION ------------------

app = FastAPI(title="AIOps Multi-Service Platform")

# ================== CONFIG ==================

PROMETHEUS_URL = "http://localhost:9090/api/v1/query"
SERVICE_LABEL_URL = "http://localhost:9090/api/v1/label/service/values"
SLACK_WEBHOOK_URL= os.getenv("SLACK_WEBHOOK_URL")

BASE_DATASET_DIR = "datasets"
BASE_MODEL_DIR = "models"
BASE_LOG_DIR = "logs"

CPU_THRESHOLDS = {"Excellent": 50, "Warning": 70, "High": 85, "Critical": 95}
MEM_THRESHOLDS = {"Excellent": 30, "Normal": 60, "Warning": 75, "High": 85, "Critical": 95}
LAT_THRESHOLDS = {"Excellent": 500, "Good": 1000, "Warning": 3000}

# ================== CORS ==================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== MODEL CACHE ==================

MODEL_CACHE: Dict[str, Dict[str, object]] = {}

# ================== HELPERS ==================

def classify(value, rules):
    print(f"Classifying value: {value} with rules: {rules}")
    for state, threshold in rules.items():
        if value < threshold:
            return state
    return "Critical"

def dataset_path(service: str, metric: str, category: str) -> str:
    print(f"Getting dataset path for {service}/{metric} in category: {category}")
    path = f"{BASE_DATASET_DIR}/{service}/{category}"
    os.makedirs(path, exist_ok=True)
    print(f"Dataset path: {path}/{metric}.csv")
    return f"{path}/{metric}.csv"

def model_path(service: str, metric: str) -> str:
    print(f"Getting model path for {service}/{metric}")
    return f"{BASE_MODEL_DIR}/{service}/{metric}.pkl"

def log_path(service: str) -> str:
    print(f"Getting log path for service: {service}")
    # return f"{BASE_LOG_DIR}/{service}.log" #TODO: change back we need to change in spring boot app to write logs to correct path
    return "C:/Users/bathu/Desktop/AiOps-MLOps/AIOps-demo/logs/aiops.log"  # temporary fix for log path

def persist(ts, value, status, path):
    print(f"[PERSIST] {path} → {ts.isoformat()}, {value}, {status}")
    df = pd.DataFrame([{
        "timestamp": ts.isoformat(),
        "value": value,
        "status": status
    }])
    print("Persisting to:", path)
    df.to_csv(path, mode="a", header=not os.path.exists(path), index=False)

def ml_predict(service: str, metric: str, value):
    print(f"[PREDICT] {service}/{metric} = {value}")
    model = MODEL_CACHE.get(service, {}).get(metric)
    if model is None or value is None:
        return "Unknown"

    try:
        # Minimal rolling window for live inference
        series = pd.Series([value] * 5)
        X = build_features(series).iloc[[-1]]

        return "Anomaly" if model.predict(X)[0] == -1 else "Normal"

    except Exception as e:
        print(f"[PREDICT ERROR] {service}/{metric}: {e}")
        return "Unknown"

def notify_slack(service: str, metric: str, value, status):
    print(f"[ALERT] {service}/{metric} = {value} ({status})")
    if status in ["High", "Critical"]:
        message = f"ALERT: {service} has {metric} at {value} which is {status}!"
        print(f"[SLACK NOTIFY] {message}")
        requests.post(SLACK_WEBHOOK_URL, json={"text": message})


# ================== SERVICE DISCOVERY ==================

@app.get("/services")
def list_services():
    print("[SERVICE DISCOVERY] Fetching services from Prometheus...")
    res = requests.get(SERVICE_LABEL_URL, timeout=10)
    res.raise_for_status()
    return sorted(res.json().get("data", []))

# ================== MODEL LOADING ==================

def load_all_models():
    print("[MODEL LOADING] Discovering services and loading models...")
    services = list_services()
    print("Loading ML models...")

    for service in services:
        MODEL_CACHE.setdefault(service, {})

        for metric in ["cpu", "mem", "lat"]:
            path = model_path(service, metric)
            if os.path.exists(path):
                try:
                    MODEL_CACHE[service][metric] = joblib.load(path)
                    print(f"[MODEL LOADED] {service}/{metric}")
                except Exception as e:
                    print(f"[MODEL FAILED] {service}/{metric}: {e}")

# ================== STARTUP EVENT ==================


# No need to run train_v2.py separately, it will be triggered on startup and then every 24 hours by the scheduler
@app.on_event("startup")
def startup_event():
    print("[STARTUP] Training and Loading all models on startup...")
    train_and_load_models()



#=================== Model Retraining and Reloading ===================


# Endpoint to trigger model retraining manually (can be called from frontend or via curl)
# Sample API call: POST http://localhost:9092/retrain
@app.post("/retrain")
def train_and_load_models():
    print("[TRAIN] Starting model training...")
    # Call the training script to retrain models with new data
    os.system("python train_v2.py")  # Make sure this script retrains models and saves them to the correct path
    print("[TRAIN] Model training completed. Reloading models...")
    load_all_models()
    print("[TRAIN] Models reloaded successfully.")
    return {"status": "Models Retrained & Reloaded"}

# Set up the scheduler to retrain models every 24 hours
scheduler = BackgroundScheduler() # Initialize the scheduler
scheduler.add_job(train_and_load_models, "interval", hours=24) # Schedule the retrain_models function to run every 24 hours
scheduler.start() # Start the scheduler

# ================== PROMETHEUS QUERIES ==================

CPU_QUERY = '''
avg_over_time(
  process_cpu_usage{job="spring-boot-app", service="%s"}[5m]
) * 100
'''

MEM_QUERY = '''
jvm_memory_used_bytes{area="heap", id="G1 Old Gen", service="%s"}
/
jvm_memory_max_bytes{area="heap", id="G1 Old Gen", service="%s"}
* 100
'''

LAT_QUERY = '''
histogram_quantile(
  0.99,
  sum by (le)(
    rate(http_server_requests_seconds_bucket{service="%s"}[5m])
  )
) * 1000
'''

def query_single_metric(query: str):
    print(f"[QUERY] {query}")
    res = requests.get(PROMETHEUS_URL, params={"query": query}, timeout=5)
    res.raise_for_status()
    results = res.json()["data"]["result"]
    
    if not results:
        return None, None

    ts = datetime.fromtimestamp(float(results[0]["value"][0]))
    val = round(float(results[0]["value"][1]), 2)
    print(f"[QUERY RESULT] {ts}, {val}")
    return ts, val

# ================== METRICS API ==================

@app.get("/metrics")
def get_metrics(service: str = Query(...)):
    print(f"[METRICS REQUEST] Service: {service}")
    cpu_ts, cpu = query_single_metric(CPU_QUERY % service)
    mem_ts, mem = query_single_metric(MEM_QUERY % (service, service))
    lat_ts, lat = query_single_metric(LAT_QUERY % service)
    print(f"[METRICS RESULT] CPU: {cpu} at {cpu_ts}, MEM: {mem} at {mem_ts}, LAT: {lat} at {lat_ts}")

    timestamps = [t for t in [cpu_ts, mem_ts, lat_ts] if t]
    ts = max(timestamps) if timestamps else datetime.utcnow()
    

    print("[CLASSIFICATION]")
    cpu_status = classify(cpu, CPU_THRESHOLDS) if cpu is not None else "Unavailable"
    mem_status = classify(mem, MEM_THRESHOLDS) if mem is not None else "Unavailable"
    lat_status = classify(lat, LAT_THRESHOLDS) if lat is not None else "Unavailable"
    print(f" CPU: {cpu_status}, MEM: {mem_status}, LAT: {lat_status}")

    notify_slack(service, "CPU", cpu, cpu_status)
    notify_slack(service, "MEM", mem, mem_status)
    notify_slack(service, "LAT", lat, lat_status)
    
    print("[PERSISTENCE]")
    if cpu is not None:
        print("[PERSIST] CPU Data")
        persist(ts, cpu, cpu_status,
                dataset_path(service, "cpu",
                             "anomaly" if cpu_status in ["High", "Critical"] else "history"))

    if mem is not None:
        print("[PERSIST] MEM Data")
        persist(ts, mem, mem_status,
                dataset_path(service, "mem",
                             "anomaly" if mem_status in ["High", "Critical"] else "history"))

    if lat is not None:
        print("[PERSIST] LAT Data")
        persist(ts, lat, lat_status,
                dataset_path(service, "lat",
                             "anomaly" if lat_status == "Critical" else "history"))

    print("returning response with predictions...")
    return {
        "service": service,
        "timestamp": ts.isoformat(),
        "cpu": {
            "value": cpu,
            "status": cpu_status,
            "prediction": ml_predict(service, "cpu", cpu),
            "event_ts": cpu_ts.isoformat() if cpu_ts else None
        },
        "memory": {
            "value": mem,
            "status": mem_status,
            "prediction": ml_predict(service, "mem", mem),
            "event_ts": mem_ts.isoformat() if mem_ts else None
        },
        "latency": {
            "value": lat,
            "status": lat_status,
            "prediction": ml_predict(service, "lat", lat),
            "event_ts": lat_ts.isoformat() if lat_ts else None
        }
    }

# ================== LOG CORRELATION ==================

@app.get("/logs")
def get_logs(service: str, event_ts: str):
    print(f"[LOG REQUEST] Service: {service}, Event TS: {event_ts}")
    event_time = datetime.fromisoformat(event_ts)
    start = event_time - timedelta(seconds=4)
    end = event_time + timedelta(seconds=3)
    print(f"[LOG REQUEST] Searching logs from {start.isoformat()} to {end.isoformat()}")

    path = log_path(service)
    print(f"[LOG REQUEST] Log path: {path}")
    if not os.path.exists(path):
        print("[LOG REQUEST] Log file does not exist.")
        return {"logs": []}

    print("[LOG REQUEST] Scanning log file...")
    results = []

    print("Reading log file in reverse...")
    with open(path, "rb") as f:
        f.seek(0, os.SEEK_END)
        pos = f.tell()
        buffer = b""

        print("Starting log search...")
        while pos > 0:
            print(f"Current file position: {pos}")
            pos -= 1
            f.seek(pos)
            byte = f.read(1)

            if byte == b"\n":
                line = buffer[::-1].decode(errors="ignore")
                buffer = b""

                if not line.startswith("{"):
                    continue

                try:
                    print("[LOG REQUEST] Parsing log entry...")
                    data = json.loads(line)
                    ts = datetime.fromisoformat(data["timestamp"])
                    if data.get("application") != service:
                        continue
                    if start <= ts <= end:
                        results.append(line)
                    elif ts < start:
                        break
                except:
                    pass
            else:
                buffer += byte

    print(f"[LOG REQUEST] Found {len(results)} log entries.")
    return {"logs": results[::-1]}

#to run the app using: python -m uvicorn app2:app --host 0.0.0.0 --port 9092 --reload
 # in cloud setup, use: uvicorn app2:app --host

# pip install -r requirements.txt

