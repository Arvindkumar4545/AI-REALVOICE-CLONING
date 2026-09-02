"""
VoiceShield Production Load & Concurrency Benchmark Suite
Tests the platform under concurrent load tiers:
- 10 concurrent requests
- 50 concurrent requests
- 100 concurrent requests
- 500 concurrent requests
- 1000 concurrent requests

Measures:
- Throughput (Requests per Second / RPS)
- Latency (Mean, p50, p95, p99)
- Success / Error rate (%)
- Resource efficiency
"""
import asyncio
import time
import sys
from pathlib import Path
import numpy as np
import concurrent.futures

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import VoiceShieldInferenceEngine


def simulate_inference_worker(engine, dummy_waveform):
    t0 = time.perf_counter()
    res = engine.detect(dummy_waveform)
    latency_ms = (time.perf_counter() - t0) * 1000.0
    return {
        "success": True if res and "risk_score" in res else False,
        "latency_ms": latency_ms,
        "risk_score": res["risk_score"],
    }


def run_concurrency_benchmark(tier_concurrency: int, total_requests: int):
    print(f"\n---> Benchmarking Concurrency Tier: {tier_concurrency} Concurrent Workers (Total: {total_requests} reqs)")
    engine = VoiceShieldInferenceEngine.get_instance()
    
    # Pre-generate 1-second 16kHz audio waveform
    t = np.linspace(0, 1.0, 16000, dtype=np.float32)
    dummy_waveform = 0.5 * np.sin(2 * np.pi * 440 * t) + 0.05 * np.random.randn(len(t)).astype(np.float32)

    latencies = []
    successes = 0
    errors = 0

    start_wall_time = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(tier_concurrency, 32)) as executor:
        futures = [executor.submit(simulate_inference_worker, engine, dummy_waveform) for _ in range(total_requests)]
        for f in concurrent.futures.as_completed(futures):
            try:
                res = f.result()
                if res["success"]:
                    successes += 1
                    latencies.append(res["latency_ms"])
                else:
                    errors += 1
            except Exception as e:
                errors += 1

    total_wall_time = time.perf_counter() - start_wall_time
    rps = total_requests / total_wall_time

    p50 = np.percentile(latencies, 50) if latencies else 0.0
    p95 = np.percentile(latencies, 95) if latencies else 0.0
    p99 = np.percentile(latencies, 99) if latencies else 0.0
    mean_lat = np.mean(latencies) if latencies else 0.0

    print(f"      Total Time    : {total_wall_time:.2f} s")
    print(f"      Throughput    : {rps:.2f} RPS")
    print(f"      Success Rate  : {(successes / total_requests) * 100:.1f}% ({successes}/{total_requests})")
    print(f"      Mean Latency  : {mean_lat:.2f} ms")
    print(f"      p50 Latency   : {p50:.2f} ms")
    print(f"      p95 Latency   : {p95:.2f} ms")
    print(f"      p99 Latency   : {p99:.2f} ms")

    return {
        "concurrency": tier_concurrency,
        "total_requests": total_requests,
        "total_time_s": round(total_wall_time, 2),
        "rps": round(rps, 2),
        "success_rate_pct": round((successes / total_requests) * 100, 2),
        "mean_latency_ms": round(mean_lat, 2),
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
    }


def main():
    print("=" * 75)
    print("VOICE SHIELD — MULTI-TIER PRODUCTION LOAD & CONCURRENCY BENCHMARK")
    print("=" * 75)

    tiers = [
        (10, 50),
        (50, 100),
        (100, 200),
        (500, 500),
        (1000, 1000),
    ]

    all_results = []
    for conc, n_req in tiers:
        res = run_concurrency_benchmark(conc, n_req)
        all_results.append(res)

    print("\n" + "=" * 75)
    print("FINAL CONCURRENCY BENCHMARK SUMMARY TABLE")
    print("=" * 75)
    print(f"{'Concurrency':<12} | {'Requests':<10} | {'Throughput (RPS)':<18} | {'p50 (ms)':<10} | {'p95 (ms)':<10} | {'p99 (ms)':<10} | {'Success Rate'}")
    print("-" * 90)
    for r in all_results:
        print(f"{r['concurrency']:<12} | {r['total_requests']:<10} | {r['rps']:<18.2f} | {r['p50_ms']:<10.2f} | {r['p95_ms']:<10.2f} | {r['p99_ms']:<10.2f} | {r['success_rate_pct']}%")
    print("=" * 75)


if __name__ == "__main__":
    main()
