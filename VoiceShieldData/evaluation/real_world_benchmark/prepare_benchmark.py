
import pandas as pd
import numpy as np
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
MANIFEST_PATH = ROOT_DIR / 'manifests' / 'speaker_disjoint_manifest.csv'
OUT_DIR = ROOT_DIR / 'evaluation' / 'real_world_benchmark'

def prepare_splits(n_dev=400, n_test=600, seed=42):
    print(f'Loading {MANIFEST_PATH}...')
    df = pd.read_csv(MANIFEST_PATH)
    
    dev_df = df[df['split'] == 'dev'].copy()
    test_df = df[df['split'] == 'test'].copy()
    
    # Stratified balance across sources
    def stratify_sample(sub_df, n_total):
        sampled = []
        for src in sub_df['source'].unique():
            src_sub = sub_df[sub_df['source'] == src]
            src_bona = src_sub[src_sub['label'] == 'bonafide']
            src_spoof = src_sub[src_sub['label'] == 'spoof']
            
            # Allocation proportional
            target_per_class = max(10, n_total // (2 * len(sub_df['source'].unique())))
            bona_n = min(len(src_bona), target_per_class)
            spoof_n = min(len(src_spoof), target_per_class)
            
            sampled.append(src_bona.sample(n=bona_n, random_state=seed))
            sampled.append(src_spoof.sample(n=spoof_n, random_state=seed))
        return pd.concat(sampled).sample(frac=1.0, random_state=seed).reset_index(drop=True)

    dev_eval = stratify_sample(dev_df, n_dev)
    test_eval = stratify_sample(test_df, n_test)
    
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dev_out = OUT_DIR / 'benchmark_dev.csv'
    test_out = OUT_DIR / 'benchmark_test.csv'
    
    dev_eval.to_csv(dev_out, index=False)
    test_eval.to_csv(test_out, index=False)
    
    print(f'Prepared Dev Benchmark: {len(dev_eval)} samples -> {dev_out}')
    print(f'Prepared Test Benchmark: {len(test_eval)} samples -> {test_out}')

if __name__ == '__main__':
    prepare_splits()
