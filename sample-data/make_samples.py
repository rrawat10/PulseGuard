"""Regenerate the five Lead I example files from PTB-XL v1.0.3."""

import ast
import csv
import io
import re
from array import array
from pathlib import Path
from sys import byteorder
from urllib.request import urlopen

BASE = "https://physionet.org/files/ptb-xl/1.0.3/"
EXAMPLES = {
    38: "NORM",
    160: "NST_",
    180: "CLBBB",
    947: "ILMI",
    3785: "LVH",
}

metadata = {
    int(row["ecg_id"]): row
    for row in csv.DictReader(io.StringIO(urlopen(BASE + "ptbxl_database.csv", timeout=30).read().decode("utf-8")))
    if int(row["ecg_id"]) in EXAMPLES
}

for record_id, expected_code in EXAMPLES.items():
    row = metadata[record_id]
    codes = ast.literal_eval(row["scp_codes"])
    assert row["strat_fold"] == "10" and row["validated_by_human"] == "True"
    assert codes[expected_code] == 100.0
    path = row["filename_hr"]
    header = urlopen(BASE + path + ".hea", timeout=30).read().decode("utf-8").splitlines()
    assert header[0].split()[1:4] == ["12", "500", "5000"]
    lead = header[1].split()
    assert lead[1] == "16" and lead[-1] == "I"
    gain_match = re.fullmatch(r"([0-9.]+)\((-?[0-9]+)\)/mV", lead[2])
    assert gain_match, lead[2]
    gain, baseline = float(gain_match.group(1)), int(gain_match.group(2))

    values = array("h")
    values.frombytes(urlopen(BASE + path + ".dat", timeout=30).read())
    if byteorder != "little":
        values.byteswap()
    assert len(values) == 5000 * 12
    samples = [(values[index * 12] - baseline) / gain for index in range(5000)]
    output = Path(__file__).with_name(f"ptbxl-{record_id:05d}-lead-I.csv")
    output.write_text("mV\n" + "\n".join(f"{sample:.4f}" for sample in samples) + "\n", encoding="utf-8")
    print(f"{output.name}: {expected_code}, {len(samples)} samples")
