import argparse
import json
import logging
import sys
import time
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.metrics import (
    roc_auc_score,
    roc_curve,
    brier_score_loss,
    confusion_matrix,
)

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import VoiceShieldInferenceEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("benchmark")

def compute_eer(y_true, y_score):
    fpr, tpr, thresholds = roc_curve(y_true, y_score, pos_label=1)
    fnr = 1.0 - tpr
    idx = np.nanargmin(np.abs(fpr - fnr))
    return float((fpr[idx] + fnr[idx]) / 2.0)

def compute_ece(y_true, y_prob, n_bins=10):
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        in_bin = (y_prob >= bin_boundaries[i]) & (y_prob < bin_boundaries[i+1])
        prop = np.mean(in_bin)
        if prop > 0:
            acc = np.mean(y_true[in_bin])
            conf = np.mean(y_prob[in_bin])
            ece += np.abs(conf - acc) * prop
    return float(ece)

def evaluate_dataframe(df, engine, desc="Evaluation"):
    logger.info(f"Starting {desc} on {len(df)} samples...")
    records = []
    latencies = []
    
    for idx, row in df.iterrows():
        p = str(row["path"])
        y = 1 if "spoof" in str(row["label"]).lower() else 0
        src = str(row.get("source", "unknown"))
        spk = str(row.get("speaker", "unknown"))
        
        t0 = time.perf_counter()
        try:
            res = engine.detect(p)
            lat = (time.perf_counter() - t0) * 1000.0
            latencies.append(lat)
            scores = res.get("model_scores", {})
            records.append({
                "path": p,
                "source": src,
                "speaker": spk,
                "y_true": y,
                "prediction": res.get("prediction", "uncertain"),
                "classification": res.get("classification", "UNCERTAIN"),
                "spoof_probability": res.get("spoof_probability", 0.5),
                "risk_score": res.get("risk_score", 50.0),
                "confidence": res.get("confidence", 0.5),
                "uncertainty": res.get("uncertainty", 0.5),
                "is_disagreement": res.get("is_disagreement", False),
                "lcnn": scores.get("lcnn", 0.5),
                "wavlm": scores.get("wavlm", 0.5),
                "bilstm": scores.get("bilstm", 0.5),
                "rawnet2": scores.get("rawnet2", 0.5),
                "aasist": scores.get("aasist", 0.5),
                "latency_ms": lat,
            })
        except Exception as e:
            logger.error(f"Error on {p}: {e}")
            
    res_df = pd.DataFrame(records)
    y_true = res_df["y_true"].values
    
    detectors = ["lcnn", "wavlm", "bilstm", "rawnet2", "aasist", "spoof_probability"]
    metrics = {}
    for det in detectors:
        scores = res_df[det].values
        auc_val = float(roc_auc_score(y_true, scores)) if len(np.unique(y_true)) > 1 else 0.5
        eer = compute_eer(y_true, scores)
        brier = float(brier_score_loss(y_true, scores))
        ece = compute_ece(y_true, scores)
        
        y_pred = (scores >= 0.5).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
        
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        fnr = float(fn / (tp + fn)) if (tp + fn) > 0 else 0.0
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        f1 = float(2 * prec * recall / (prec + recall)) if (prec + recall) > 0 else 0.0
        
        metrics[det] = {
            "roc_auc": round(auc_val, 4),
            "eer": round(eer, 4),
            "spoof_recall": round(recall, 4),
            "spoof_fnr": round(fnr, 4),
            "human_fpr": round(fpr, 4),
            "precision": round(prec, 4),
            "f1_score": round(f1, 4),
            "brier_score": round(brier, 4),
            "ece": round(ece, 4),
            "mean_bonafide_score": round(float(np.mean(scores[y_true == 0])), 4),
            "mean_spoof_score": round(float(np.mean(scores[y_true == 1])), 4),
        }
        
    preds = res_df["prediction"].values
    human_m = (y_true == 0)
    spoof_m = (y_true == 1)
    
    decision_summary = {
        "total_samples": len(res_df),
        "bonafide_samples": int(np.sum(human_m)),
        "spoof_samples": int(np.sum(spoof_m)),
        "human_decisions": pd.Series(preds[human_m]).value_counts().to_dict(),
        "spoof_decisions": pd.Series(preds[spoof_m]).value_counts().to_dict(),
        "avg_latency_ms": round(float(np.mean(latencies)), 2) if latencies else 0.0,
    }
    
    source_metrics = {}
    for src in res_df["source"].unique():
        sm = (res_df["source"] == src)
        sy = y_true[sm]
        sp = res_df.loc[sm, "spoof_probability"].values
        spred = preds[sm]
        sauc = float(roc_auc_score(sy, sp)) if len(np.unique(sy)) > 1 else 0.5
        seer = compute_eer(sy, sp)
        source_metrics[src] = {
            "total": int(np.sum(sm)),
            "roc_auc": round(sauc, 4),
            "eer": round(seer, 4),
            "human_decisions": pd.Series(spred[sy == 0]).value_counts().to_dict(),
            "spoof_decisions": pd.Series(spred[sy == 1]).value_counts().to_dict(),
        }
        
    return {
        "metrics_per_detector": metrics,
        "decision_summary": decision_summary,
        "source_breakdown": source_metrics,
        "raw_records": records,
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--split", choices=["dev", "test", "all"], default="dev")
    args = parser.parse_args()
    
    bench_dir = ROOT_DIR / "evaluation" / "real_world_benchmark"
    engine = VoiceShieldInferenceEngine.get_instance()
    
    all_results = {}
    splits = ["dev", "test"] if args.split == "all" else [args.split]
    
    for split in splits:
        csv_path = bench_dir / f"benchmark_{split}.csv"
        if not csv_path.exists():
            logger.error(f"Benchmark file not found: {csv_path}")
            continue
        df = pd.read_csv(csv_path)
        eval_res = evaluate_dataframe(df, engine, desc=f"Benchmark Split [{split.upper()}]")
        all_results[split] = eval_res
        
        print(f"\n================== BENCHMARK RESULTS [{split.upper()}] ==================")
        print(f'{"Detector":<20} | {"AUC":<7} | {"EER":<7} | {"Recall":<7} | {"Human FPR":<10} | {"Prec":<7} | {"F1":<7} | {"ECE":<7}')
        print("-" * 85)
        for det, m in eval_res["metrics_per_detector"].items():
            print(f'{det.upper():<20} | {m["roc_auc"]:7.4f} | {m["eer"]:7.4f} | {m["spoof_recall"]*100:6.1f}% | {m["human_fpr"]*100:9.1f}% | {m["precision"]*100:6.1f}% | {m["f1_score"]:7.4f} | {m["ece"]:7.4f}')
            
        print(f"\nProduction 3-State Decisions [{split.upper()}]:")
        print("  Human Speech:", eval_res["decision_summary"]["human_decisions"])
        print("  Spoof Speech:", eval_res["decision_summary"]["spoof_decisions"])
        print(f'  Avg Latency:  {eval_res["decision_summary"]["avg_latency_ms"]} ms/sample')
        
    out_json = bench_dir / "results.json"
    save_results = {k: {"metrics_per_detector": v["metrics_per_detector"], "decision_summary": v["decision_summary"], "source_breakdown": v["source_breakdown"]} for k, v in all_results.items()}
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(save_results, f, indent=2)
    logger.info(f"Saved benchmark results to {out_json}")

if __name__ == "__main__":
    main()
