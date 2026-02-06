import pandas as pd

#Requirments.txt
# pandas
# numpy
# scikit-learn
# joblib

# ---------------- FEATURE ENGINEERING ----------------

def build_features(series: pd.Series) -> pd.DataFrame:
    print("[FEATURE ENGINEERING] Building features...")
    print("[FEATURE ENGINEERING] Converting series to DataFrame...")
    df = pd.DataFrame({"value": series.astype(float)})

    print("[FEATURE ENGINEERING] Calculating delta, rolling mean, rolling std, z-score...")
    df["delta"] = df["value"].diff()
    df["rolling_mean"] = df["value"].rolling(window=5, min_periods=1).mean()
    df["rolling_std"] = df["value"].rolling(window=5, min_periods=1).std().fillna(0)
    print(f"[FEATURE ENGINEERING] Data shape after rolling features: {df.shape}")

    print("[FEATURE ENGINEERING] Calculating z-score with rolling mean and std...")
    df["zscore"] = (
        (df["value"] - df["rolling_mean"]) /
        df["rolling_std"].replace(0, 1)
    )

    print("[FEATURE ENGINEERING] Filling NaN values with 0...")
    return df.fillna(0)
