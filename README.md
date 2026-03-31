# Design leadership data visualization

Quantitative survey data and interactive prototypes exploring paths into design leadership: backgrounds, education, first roles, and current career level.

## Contents

| Path | Description |
|------|-------------|
| `data/quant-survey-responses-raw.csv` | Raw export from the survey (do not overwrite; derive cleaned copies if needed). |
| `data/eda.ipynb` | Exploratory analysis: demographics, column validation, label cleanup notes. |
| `prototypes/` | Standalone HTML/CSS/JS prototypes (open in a browser or serve locally). |

## Running prototypes

Prototypes load the CSV with a relative path (`../data/...`). Browsers often block `fetch` of local files when you open HTML via `file://`. Use a local static server from the repo root, for example:

```bash
cd /path/to/design-leadership-data-visualization
python3 -m http.server 8080
```

Then open e.g. `http://localhost:8080/prototypes/career-pathway-combinedreport.html` (multi-chart report: sticky demographic filters + clear all, sidebar section nav, full-bleed sections, Likert bars vs dots, at-a-glance bullets) or `http://localhost:8080/prototypes/career-pathway-sankey.html` (Sankey only).

## Collaboration

- **Product / scope:** See [`PRD.md`](PRD.md) for the living prototype requirements document (goals, scope, milestones, open questions).
- **License:** [`LICENSE`](LICENSE) (CC0).

## Privacy

The raw CSV may include identifiable fields (for example optional contact email for interviews). Treat exports as sensitive; strip or separate PII before publishing any derived dataset or public build.
