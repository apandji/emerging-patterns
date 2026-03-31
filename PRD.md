# Prototype requirements document (PRD)

Living document for **interactive visualization prototypes** built from the design leadership quantitative survey. Edit freely; use PRs or shared branches so changes stay traceable.

---

## 1. Purpose

Design leadership is a relatively new phenomenon. Our project explores, through quantitative and qualitative research, the trends, archetypes and different journeys that designers take into positions of leadership. Through data visualization, we hope to sense-make the quantitative and qualitative insights we receive from surveys and interviews sent out to design leaders in the field. 

**See this medium article for additional context:** [https://douglaspowell1.medium.com/designers-as-leaders-now-that-we-have-a-seat-at-the-table-how-do-we-prove-we-belong-387f893adf28](https://douglaspowell1.medium.com/designers-as-leaders-now-that-we-have-a-seat-at-the-table-how-do-we-prove-we-belong-387f893adf28)

---

## 2. Audience


| Segment                           | Needs (fill in)            |
| --------------------------------- | -------------------------- |
| Primary readers                   | Designers & design leaders |
| Secondary (e.g. press, community) | Design community           |
| Internal (research, design org)   | Design orgs                |


---

## 3. Goals

Goals are **outcomes we want the prototypes (and eventual report) to achieve** for readers and for the team. They should stay testable (“we can tell if we met this”) without promising rigor the data cannot support.

### For readers and the field

- **Make journeys visible.** Show *aggregate* paths into design leadership—background, education, first organization, and current level—so the design community can recognize patterns, outliers, and diversity of routes (aligned with the questions in §6.1).
- **Reduce overwhelm.** Default views should be **legible first**: meaningful encoding (e.g. color by origin cohort), optional collapse of rare categories, and **companion summaries** (top paths, counts) so no one has to “read spaghetti” to get the headline story.
- **Earn trust.** Surface **sample size**, short **methodology** notes, and **caveats** for small segments or self-selected samples so insights read as grounded, not promotional.

### For the team

- **Single source of truth.** Raw survey exports stay authoritative; derived groupings and labels are **documented and versioned** so collaborators and future you can reproduce charts (see §5).
- **Iterate in the open.** Prototypes ship in this repo with a clear **scope per milestone** (see §9); feedback changes the next iteration, not a hidden fork.
- **Bridge quant and qual.** Quant prototypes here set the stage for **consistent framing** when qualitative interview insights are layered in later (shared vocabulary for “level,” “path,” etc.)—without collapsing interview nuance into the survey alone.

### Out of scope for “Goals” (handled elsewhere)

- **Evidence** (which items are in v1): see §6–§8 and milestones.
- **What we explicitly will not claim:** see §4 Non-goals.

---

## 4. Non-goals

What we are **not** doing in this prototype phase (explicitly list to prevent drift):

- **Guaranteeing individual traceability:** Sankeys show aggregate flows, not person-level paths tied to identifiable respondents.
- **Replacing statistical modeling:** No causal claims; visualization is exploratory and descriptive.
- **Shipping a full multi-page report in v1** unless milestones say otherwise—P1 is the pathway Sankey plus agreed companion summaries (see §6.1).

---

## 5. Data & governance


| Item                                                             | Owner / status |
| ---------------------------------------------------------------- | -------------- |
| Source of truth (`data/quant-survey-responses-raw.csv` or other) |                |
| PII handling (emails, quotes)                                    |                |
| Label standardization rules                                      |                |
| Refresh cadence (if survey continues)                            |                |


---

## 6. Prototypes in scope


| ID  | Name                                                            | Status | Notes                                                               |
| --- | --------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| P1  | Career pathway Sankey (`prototypes/career-pathway-sankey.html`) |        | Four-stage flow: background → education → first org → current level |
| P1b | Companion summaries (table + optional bars)                     |        | Same dataset; see §6.1                                              |


### 6.1 P1 Career pathway Sankey — primary question, complexity, and legibility

**Primary question (what the chart must answer):**

> *Among respondents in this survey, how do prior **background**, **design education**, **first organization type**, and **current career level** connect in the aggregate—i.e. where do flows concentrate and split?*

Secondary questions (supporting, not all need separate views in v1):

- Which **background** cohorts are most represented at **current career level**?
- How does **first org type** relate to later **level** (high-level association only)?

**Stages in scope for v1:** Keep **four stages** in one Sankey (background → education → first org → current level). A **pairwise** (two-column) variant is optional later if the full chart remains too dense after encoding and collapse rules.

**Maximum complexity & collapse rules:**


| Rule                           | Specification                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nodes per stage                | Target **≤8 visible categories** per column after collapse (excluding any single “Other” bucket).                                                                                                        |
| Rare categories                | Merge categories with **under 3% of respondents** (round to whole person) into **“Other”** for that stage, unless the team explicitly preserves a category for story reasons (document in decision log). |
| Full-path cap (optional later) | If implemented: show only **top N full paths** (e.g. N=15) plus an aggregated **“All other paths”** ribbon—PRD default for N is TBD by data review; start with **15**.                                   |
| Labels                         | Short labels on-chart; full survey wording in tooltip or footnote.                                                                                                                                       |


**Digestibility principles (from product review):** At default view, **encode meaning** (not only on hover): flows should be distinguishable by a **single** primary dimension. **Pair** the Sankey with **non-Sankey** summaries (top paths, bar counts). **Progressive disclosure:** filters/focus modes reduce crossings. **Narrative:** one-line takeaway + how-to-interact copy.

---

## 7. Functional requirements (draft)

- **Data loading:** CSV path, CORS/local server expectations (see `[README.md](README.md)`).
- **Interactivity — v1 baseline:** Hover highlight on links/nodes (existing); **click-to-pin** focus on a node path (nice-to-have if time).
- **Interactivity — filters / focus:** See §7.1.
- **Companion UI — v1:** **Top paths table** (see §8.1); **per-column count bars** as v1 if feasible, else **v1.1**.
- **Accessibility:** v1: keyboard focusable controls for any filter UI; sufficient contrast for encoded link colors + legend; v1.1+: screen reader summary of selection state.
- **Performance:** Assume **≤500** response rows for client-side parsing; document if exceeded.

### 7.1 Filters and focus modes (v1 vs later)


| Capability                                                         | v1           | Later       |
| ------------------------------------------------------------------ | ------------ | ----------- |
| **Focus by background** (dim other origins; persist until cleared) | Must-have    |             |
| **Filter by region**                                               | Must-have    |             |
| **Filter by gender**                                               | Nice-to-have |             |
| **Filter by current career level** (derived bucket)                | Nice-to-have |             |
| **Search / select node** to pin highlight                          | Nice-to-have | v1.1 if cut |
| **Multi-select filters**                                           |              | v2          |
| **URL state** (share filtered view)                                |              | v1.1+       |


**Rationale:** Background focus directly supports the **primary color encoding** (flows by origin). Region is the strongest structural slice for this global sample. Gender and level filters are useful but secondary for first ship.

---

## 8. Visual & UX requirements (draft)

- Shared tokens: see linked stylesheets per prototype (e.g. `[prototypes/career-pathway-sankey.css](prototypes/career-pathway-sankey.css)`).
- Brand / typography / color direction for a unified “report” later: align with project brand when available; until then, keep **one** categorical palette for background + neutral chrome.

### 8.1 Default visual encoding (P1)


| Element                  | Specification                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Link color (default)** | Encode **first-stage background** along the full path (same hue family from source through to sink). Use the existing background palette in code as the starting point; ensure **legend** lists background categories and colors. |
| **Interaction accent**   | Hover/selection uses a **distinct** accent (e.g. current accent green) so “active” does not compete with category hue.                                                                                                            |
| **Link opacity / width** | Wider = more respondents; thin links may use **lower opacity** so dense regions remain readable.                                                                                                                                  |
| **Nodes**                | Neutral fills; **n=** counts remain visible.                                                                                                                                                                                      |
| **Sorting**              | Within each column, sort nodes by **volume descending** unless a stability rule is needed for longitudinal comparison.                                                                                                            |


### 8.2 Companion views (required for digestibility)


| Deliverable                                 | v1                            | Purpose                                                                      |
| ------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| **Top 10 (or 15) full paths table**         | **Required**                  | Headline counts without tracing ribbons; sort by count descending.           |
| **One-sentence takeaway**                   | **Required**                  | e.g. most common path under current filters; updates when filters change.    |
| **Per-column bar strip or small multiples** | **v1 if feasible; else v1.1** | Reinforce dominance of categories (same groupings as Sankey after collapse). |
| Guided story / carousel                     | Later                         | Optional onboarding before full chart.                                       |


---

## 9. Milestones


| Milestone | Target | Deliverable                                                                                                              |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| M0        | Done   | PRD: P1 primary question, complexity rules, encoding, companions, filters (§6.1–§8.2); `[README.md](README.md)` accurate |
| M1        | TBD    | P1: link encoding by background + legend + collapse rules implemented in prototype                                       |
| M2        | TBD    | P1: top-paths table + takeaway copy; v1 filters (background focus + region)                                              |


---

## 10. Open questions

1. Exact **palette** accessibility check against WCAG for thin strokes on black background.
2. Whether **gender** filter belongs in v1 after sample-size review by segment.
3. Confirm **“Other”** threshold (3%) with first data pass on latest export.

---

## 11. Decision log


| Date       | Decision                                                                                                | Rationale                                              |
| ---------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 2026-03-30 | P1 primary question is aggregate flow across background → education → first org → current level (§6.1). | Aligns Sankey to survey stages and digestibility plan. |
| 2026-03-30 | Default encoding: **color flows by first-stage (background)**; hover uses separate accent.              | Pre-attentive grouping; plan doc.                      |
| 2026-03-30 | v1 companions: **top paths table + one-line takeaway** required; per-column bars v1 or v1.1.            | Sankey alone is poor for ranking.                      |
| 2026-03-30 | v1 filters: **background focus** + **region**; gender/level nice-to-have.                               | Reduces crossings; strongest slices.                   |
| 2026-03-30 | Collapse: **under 3%** → Other; target **≤8** categories per stage after collapse.                      | Limits spaghetti.                                      |


---

*Last updated: 2026-03-30 — P1 digestibility scope captured; refine with collaborators as data and timeline firm up.*