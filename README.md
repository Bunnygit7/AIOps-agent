# AIOps Multi-Service Platform

A production-oriented AIOps control plane that combines metrics, logs, and machine learning to detect anomalies, correlate incidents, and help operators understand system behavior in real time.

This project is intentionally designed to be:

- Transparent  
- Extensible  
- Understandable end-to-end  

This is not just monitoring or alerting.  
It adds behavioral intelligence on top of observability.

---

## 1. What This Project Does

This platform continuously monitors multiple microservices and provides:

- 📊 Real-time metrics ingestion from Prometheus  
- 🧠 ML-based anomaly detection per service and per metric  
- 📁 Automatic dataset generation (history vs anomaly)  
- 📌 Incident creation and lifecycle management  
- 📜 Log correlation around anomaly timestamps  
- 🔁 Scheduled and on-demand model retraining  
- 🖥️ Operator-focused React control plane UI  

Instead of only saying something is broken, the system helps answer:

- What changed?
- When did it change?
- Which service is affected?
- What do the logs say around that time?

---

## 2. High-Level Architecture

```

Spring Boot Services
        |
        |  (Metrics + Logs)
        v
     Prometheus
        |
        |  PromQL Queries
        v
   FastAPI Backend
        |
        |  ML Inference + Incidents
        v
React Control Plane UI


```



### Background Jobs

- Offline model training (train_v2.py)
- Scheduled retraining using APScheduler

Each layer has a single responsibility and is easy to reason about.

---

## 3. Core Components

### 3.1 Spring Boot Services

Each microservice:

- Exposes metrics via `/actuator/prometheus`
- Emits structured JSON logs
- Attaches a `service` label for identification

No agents. No sidecars. Pure Spring Boot observability.

---

### 3.2 Prometheus

Prometheus acts as the single source of truth for metrics:

- Scrapes JVM and HTTP metrics
- Stores time-series data
- Uses labels to identify services
- Enables flexible PromQL queries

---

### 3.3 FastAPI Backend (AIOps Engine)

Responsibilities:

- Query Prometheus using PromQL
- Classify metric severity (Normal / High / Critical)
- Persist datasets for training and debugging
- Run ML inference per metric
- Create and manage incidents
- Correlate logs around anomaly timestamps
- Serve APIs to the React UI

All decisions are explicit and traceable.

---

### 3.4 React Control Plane

The UI is designed for operators, not dashboards for screenshots.

It provides:

- Service selection
- Live metric cards
- Adjustable polling interval
- Incident filtering and sorting
- Log inspection
- Manual incident resolution

The goal is fast understanding and fast action.

---

## 4. Metrics Tracked

| Metric   | Description |
|--------|------------|
| CPU     | Rolling average process CPU usage |
| Memory  | JVM heap usage percentage |
| Latency | HTTP 99th percentile latency |

The system is metric-agnostic and easy to extend.

---

## 5. Dataset Layout

```
datasets/
└── service-name/
    ├── history/
    │   ├── cpu.csv
    │   ├── mem.csv
    │   └── lat.csv
    │
    └── anomaly/
        ├── cpu.csv
        ├── mem.csv
        └── lat.csv


```
CSV is used deliberately:

- Easy to inspect and debug
- Simple retraining workflow
- No database dependency
- Clear separation of normal vs anomalous data

---

## 6. Feature Engineering

Each metric value is transformed into:

- value
- delta
- rolling_mean
- rolling_std
- zscore

This allows the model to understand trends and deviations, not just raw numbers.

---

## 7. Machine Learning

### Model

- Isolation Forest (unsupervised anomaly detection)

### Training Strategy

- One model per service per metric
- Rolling time window based on recent behavior
- Minimum sample guard
- No labeled data required

### Model Storage
```
models/
└── service-name/
    ├── cpu.pkl
    ├── mem.pkl
    └── lat.pkl
```


Each model is isolated and independently retrainable.

---

## 8. Incident Lifecycle

1. Metric crosses High or Critical threshold  
2. ML model predicts anomaly  
3. Incident is created (deduplicated by time window)  
4. Logs are automatically correlated  
5. Incident remains OPEN  
6. Operator resolves incident via UI  

No alert noise. Incidents represent real system events.

---

## 9. API Endpoints

### GET /services

Returns all discovered services.

---

### GET /metrics?service=NAME

Returns:

- Metric values
- Severity classification
- ML prediction
- Event timestamps

---

### GET /logs?service=NAME&event_ts=TIME

Returns logs around the anomaly window.

---

### POST /retrain

Triggers model retraining and reloads updated models.

---

## 10. Configuration Files

### config.yaml

Controls:

- Training window size
- Contamination ratio
- Retraining schedule

---

### prometheus.yml

Defines:

- Scrape targets
- Service labels

---

### application.yaml (Spring Boot)

Defines:

- Metrics exposure
- Structured log format
- Log file location

---

## 11. Running Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- Java 17+
- Prometheus

---

### Backend
```
pip install -r requirements.txt
python -m uvicorn app2:app --host 0.0.0.0 --port 9092 --reload
```

---

### Train Models (Manual, But no need to run seperately if we run app_v2 automatically runs on startup and retrain and reload after every 24hr)
```
python train_v2.py
```

---

### Frontend
```
npm install
npm run dev
```

---

## 12. Running on AWS EC2 (Summary)

Recommended setup:

- EC2: t3.medium or higher
- Ubuntu 22.04
- Prometheus, FastAPI, and React on the same node
- NGINX as reverse proxy

NGINX provides:

- TLS termination
- Stable public endpoint
- Frontend and backend routing

---

## 13. Design Trade-offs

### Pros

- Simple and understandable architecture
- Transparent ML pipeline
- Minimal dependencies
- Easy to extend
- Strong portfolio and learning value

### Cons

- Single-node focused
- CSV storage limits scale
- No seasonality modeling yet
- No auto-remediation

All trade-offs are intentional.

---

## 14. Future Enhancements

### Short-term

- Cross-metric correlation
- Explainable anomaly reasons
- Seasonality features
- Auto-resolution rules

### Mid-term

- Time-series storage (Parquet or ClickHouse)
- Distributed training
- Alerting integrations

### Long-term

- Predictive failure detection
- Auto-remediation
- Multi-tenant SaaS mode

---

## 15. Who This Project Is For

- Backend and platform engineers
- DevOps and SRE engineers
- ML engineers entering observability
- Interview-ready portfolio projects
- Internal platform experimentation

---

## License

MIT
---

## Final Note

Metrics show what happened.  
Logs explain why.  
Machine learning learns what normal looks like.

This platform connects all three.

