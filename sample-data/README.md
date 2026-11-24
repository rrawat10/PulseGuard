# ECG example recordings

These are 10-second, 500 Hz **Lead I** signals from [PTB-XL v1.0.3](https://physionet.org/content/ptb-xl/1.0.3/). Each CSV contains 5,000 voltage samples in millivolts. The model configuration names Lead I training files, so these examples use the same lead. The files can be regenerated with `python sample-data/make_samples.py`.

The reference annotations below come from PTB-XL's **full 12-lead recordings**. All five records are in its human-reviewed fold 10 and have the listed diagnostic code at 100 annotation likelihood. The model receives only Lead I and returns its top class. These are comparisons of five examples, **not** an accuracy estimate or a medical diagnosis.

| Record | PTB-XL reference annotation | Model output observed 24 Nov 2026 | Model score |
| --- | --- | --- | ---: |
| [00038](https://physionet.org/content/ptb-xl/1.0.3/records500/00000/00038_hr/) | Normal ECG (`NORM`) | Sinus rhythm | 77.3% |
| [00160](https://physionet.org/content/ptb-xl/1.0.3/records500/00000/00160_hr/) | Nonspecific ST changes (`NST_`) | Sinus bradycardia | 99.9% |
| [00180](https://physionet.org/content/ptb-xl/1.0.3/records500/00000/00180_hr/) | Complete left bundle branch block (`CLBBB`) | Complete left bundle branch block | 99.9% |
| [00947](https://physionet.org/content/ptb-xl/1.0.3/records500/00000/00947_hr/) | Inferolateral myocardial infarction (`ILMI`) | Abnormal QRS complex | 85.8% |
| [03785](https://physionet.org/content/ptb-xl/1.0.3/records500/03000/03785_hr/) | Left ventricular hypertrophy (`LVH`) | Atrioventricular block | 92.7% |

The score is a model output, not the probability that the result is correct. Model and reference labels do not always describe the same feature, and several examples differ. The website calculates a fresh result whenever a sample is analyzed; the table above records one observed run.

PTB-XL source: Wagner et al., *PTB-XL, a large publicly available electrocardiography dataset*, PhysioNet v1.0.3, [DOI 10.13026/kfzx-aw45](https://doi.org/10.13026/kfzx-aw45), licensed [CC BY 4.0](https://physionet.org/content/ptb-xl/view-license/1.0.3/).
