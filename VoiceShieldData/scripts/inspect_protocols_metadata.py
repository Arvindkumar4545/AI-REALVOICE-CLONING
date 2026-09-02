import pandas as pd
from pathlib import Path

print("=== INSPECTING ASVSPOOF LA PROTOCOL FORMAT ===")
la_proto = Path("datasets/asvspoof2019/LA/LA/ASVspoof2019_LA_cm_protocols/ASVspoof2019.LA.cm.dev.trl.txt")
if la_proto.exists():
    df_la = pd.read_csv(la_proto, sep=" ", header=None, names=["speaker", "filename", "env", "attack", "label"])
    print(df_la.head(10))
    print("\nAttack distribution in LA dev:")
    print(df_la["attack"].value_counts())

print("\n=== INSPECTING ASVSPOOF PA PROTOCOL FORMAT ===")
pa_proto = Path("datasets/asvspoof2019/PA/PA/ASVspoof2019_PA_cm_protocols/ASVspoof2019.PA.cm.dev.trl.txt")
if pa_proto.exists():
    df_pa = pd.read_csv(pa_proto, sep=" ", header=None, names=["speaker", "filename", "env", "attack", "label"])
    print(df_pa.head(10))
    print("\nAttack distribution in PA dev:")
    print(df_pa["attack"].value_counts())

print("\n=== INSPECTING IN-THE-WILD META ===")
itw_meta = Path("datasets/in_the_wild/EXTRACTED/release_in_the_wild/meta.csv")
if itw_meta.exists():
    df_itw = pd.read_csv(itw_meta)
    print(df_itw.head(10))
