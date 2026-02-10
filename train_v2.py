import os
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.ensemble import IsolationForest
import joblib
from feature_engineering import build_features
#Requirments.txt
# pandas
# scikit-learn
# joblib


# ---------------- CONFIG ----------------

BASE_DATASET_DIR = "datasets"
BASE_MODEL_DIR = "models"

METRICS = ["cpu", "mem", "lat"]

ROLLING_DAYS = 2        # training window   
MIN_SAMPLES = 200       # safety guard
CONTAMINATION = 0.05    # anomaly ratio

# ---------------- HELPERS ----------------

def discover_services():
    print(f"[DISCOVER] Scanning {BASE_DATASET_DIR} for services...")
    if not os.path.exists(BASE_DATASET_DIR):
        return []
    return [
        d for d in os.listdir(BASE_DATASET_DIR)
        if os.path.isdir(os.path.join(BASE_DATASET_DIR, d))
    ]


def load_recent_data(service: str, metric: str) -> pd.DataFrame | None:
    print(f"[LOAD DATA] {service}/{metric}")
    path = f"{BASE_DATASET_DIR}/{service}/history/{metric}.csv"
    if not os.path.exists(path):
        print(f"[SKIP] Missing file: {path}")
        return None

    print(f"[LOAD DATA] {service}/{metric}")
    df = pd.read_csv(path)

    if "timestamp" not in df or "value" not in df:
        print(f"[SKIP] Invalid schema: {path}")
        return None

    # 🔴 CRITICAL FIX: convert timestamp correctly
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df = df.dropna(subset=["timestamp", "value"])

    cutoff = datetime.now(timezone.utc) - timedelta(days=ROLLING_DAYS) #cutting off old data to train whole data change in congig.yaml 
    print(f"[FILTER] Keeping data since {cutoff.isoformat()}")
    print(f"[DATA SIZE BEFORE] {len(df)} rows")
    print(f"[DATA SIZE AFTER] {len(df[df['timestamp'] >= cutoff])} rows")
    df = df[df["timestamp"] >= cutoff]

    if len(df) < MIN_SAMPLES:
        print(f"[SKIP] Not enough samples ({len(df)}) for {service}/{metric}")
        return None

    return df


def train_metric_model(service: str, metric: str):
    print(f"[TRAIN] {service}/{metric}")
    df = load_recent_data(service, metric)
    if df is None:
        return

    print(f"[TRAINING] {service}/{metric}")

    X = build_features(df["value"])

    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X)

    model_dir = f"{BASE_MODEL_DIR}/{service}"
    os.makedirs(model_dir, exist_ok=True)

    model_path = f"{model_dir}/{metric}.pkl"
    joblib.dump(model, model_path)

    print(f"[MODEL SAVED] {model_path}")


def train_service(service: str):
    print(f"\n=== SERVICE: {service} ===")
    for metric in METRICS:
        train_metric_model(service, metric)


# ---------------- MAIN ----------------

def main():
    print("Discovering services...")
    services = discover_services()
    print("Discovered services:", services)

    if not services:
        print("No services found. Exiting.")
        return

    for service in services:
        print(f"\n--- Training service: {service} ---")
        train_service(service)

    print("\nTraining complete.")


if __name__ == "__main__":
    print("Starting training process...")
    main()
