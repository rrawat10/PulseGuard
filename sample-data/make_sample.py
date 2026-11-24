from array import array
from pathlib import Path
from sys import byteorder
from urllib.request import urlopen

source = "https://physionet.org/files/ptb-xl/1.0.3/records500/00000/00001_hr.dat"
values = array("h")
values.frombytes(urlopen(source, timeout=30).read())
if byteorder != "little":
    values.byteswap()
assert len(values) == 5000 * 12

output = Path(__file__).with_name("ptbxl-00001-lead-II.csv")
output.write_text("mV\n" + "\n".join(f"{values[i * 12 + 1] / 1000:.3f}" for i in range(5000)) + "\n", encoding="utf-8")
print(f"Wrote {output} ({5000} samples)")
