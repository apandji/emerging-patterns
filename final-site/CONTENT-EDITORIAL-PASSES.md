# Content & display-label plan

Editorial updates for the Design Leadership site. **The CSV embedded in `explore.html` stays unchanged**; charts and copy use **display labels** (and optional **display buckets** for merges) in code only.

---

## Status at a glance


| Pass       | Scope                                                                                                                                                                                                                                                  | Status                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Pass 0** | `index.html` — hero (no rotating quotes), Career Pathways / Dive deeper / About copy, Tool Stack question typography + tooltip grammar (“…of change”), meta/OG                                                                                         | **Done**                                                                                                                                |
| **Pass 1** | `explore.html` — display maps for first org, first team scale, academic background; `index.html` — sankey labels (`Design`, `Corporate / In-House`), Finding 2 chart + spotlight `Corporate (In-House)`; large team label `**Large design org (21+)`** | **Done**                                                                                                                                |
| **Pass 2** | Explore — merges / rebucketing (disciplines, entry into design, trajectory “Other,” etc.); may need `drawBar` tweaks for label clipping                                                                                                                | **Spec in progress** — fill `**Approved`** columns in [§ Harmonization rules](#harmonization-rules-working-draft) below, then implement |
| **Pass 3** | Background column — Social Sciences vs Psychology…, split Arts/Humanities, 1% `animation` / ID×Engineering buckets                                                                                                                                     | **Blocked** until you decide approach                                                                                                   |
| **Pass 4** | Global capitalization sweep; Tool Stack bar color (stakeholder)                                                                                                                                                                                        | **Deferred**                                                                                                                            |


**Open decisions (still outstanding)**

- **Pass 3 / §3.1:** Social Sciences vs `Psychology, Fine Art…`; whether and how to split `Arts / Fine Arts / Humanities`; where one-off `animation` and `Industrial Design x Industrial Engineering` should display.
- **Pass 2:** Discipline “Other” threshold or explicit merge list; internship + `Other` entry buckets and % rounding copy; trajectory singleton rule (Option A vs B in §2.2).
- **Pass 4:** Doug/Ashley on bar color; optional capitalization pass before or after ship.

---

## What to do next (recommended order)

1. **Editorial triage (short)** — Complete **§ Harmonization rules** (`Approved` column + H.4). That locks: discipline merges / `Other` / `not ux focused`; entry (`Internship` + `Other`); trajectory singletons (Option A vs B).
2. **Implement Pass 2 in `explore.html`** — Extend the same pattern as Pass 1: `mapFn` / helpers on `countValues` and, for multi-select, a token→display pass inside `countMultiSelect` (or a dedicated wrapper). Re-check filtered `n` and tooltips after rebucketing.
3. **Optional layout** — If explore bar labels still clip after shorter strings from Pass 1, bump `BAR_MR` / `trunc` in `drawBar` (§1.2 note).
4. **Resolve Pass 3** — When direction is set, update this doc and implement background display maps (can ship before or after Pass 2 depending on whether merges depend on the same column).
5. **Pass 4** — Polish capitalization and schedule color feedback when ready.

---

## Pass 0 — Minimal risk (no survey logic changes)

**Status: implemented** in `index.html` (hero quotes removed; copy, About, Tool Stack question style, tool-stack tooltip phrasing, meta description). `data/qualitative-quotes.json` kept as an archive with an updated description.

Do these first: copy edits, CSS, remove hero quotes, tooltip grammar. **No display maps required** beyond what you already type in HTML.


| Item                        | Where                                                                               | Action                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Remove rotating hero quotes | `index.html` (+ sync `data/qualitative-quotes.json` if anything else references it) | Remove quote markup, rotation script, related CSS; fix any layout gap in the hero band  |
| Career Pathways intro       | `index.html` (Finding 1)                                                            | Replace paragraph with approved “variety of backgrounds…” copy                          |
| Dive deeper CTA             | `index.html`                                                                        | Replace body copy with approved “design leaders… visualized patterns…” text             |
| About this project          | `index.html`                                                                        | Replace with research-led paragraphs from specialist                                    |
| Tool Stack question styling | `index.html` CSS                                                                    | Italic, slightly smaller/lighter than body (both Likert question lines in that section) |
| Tool Stack tooltip grammar  | `index.html` JS                                                                     | e.g. “a lot **of** change” (audit every intensity phrase)                               |
| Meta / OG description       | `index.html` `<head>`                                                               | Optional: align wording with new About if needed                                        |


**Risk:** Low. **QA:** Visual regression on hero, Finding 3, CTA, About.

---

## Pass 1 — Display labels only (1:1 raw → string)

**Status: implemented** in `explore.html` (`mapPass1Background`, `mapPass1TeamScale`, `mapPass1FirstOrg` + `mapFn` on the three questions) and `index.html` (sankey `mapBg` / `mapOrg` / `bgOrder` / `orgOrder`, Finding 2 chart + spotlight). CSV / `RAW_DATA` unchanged.

Each row is one CSV value mapped to a nicer **chart label**. Counts and filters unchanged; only the string shown in the UI changes.

### 1.1 First organization type


| Raw value in CSV (`…first worked in as a designer?`) | Proposed display label |
| ---------------------------------------------------- | ---------------------- |
| `Corporate (In-house)`                               | `Corporate (In-House)` |


All other org types (`Agency / Consultancy`, `Startup`, etc.) can pass through unchanged unless you want title-case consistency later.

### 1.2 Scale of first design team


| Raw value in CSV                                              | Proposed display label                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Small team (2–5 designers)`                                  | `Small team (2–5 designers)` *(unchanged; fixes clip via layout, not CSV)* |
| `Mid-size team (6–20 designers)`                              | `Mid-size team (6–20 designers)` *(unchanged)*                             |
| `Solo designer (I was the only designer in the organization)` | `Solo designer (1 designer)`                                               |
| `Large, established design organization (21+)`                | `Large design org (21+)`                                                   |


**Implementation note:** clipping is a `drawBar` margin/truncation issue; display renames shorten the solo/large labels and help.

### 1.3 Academic / professional trajectory (single-label renames only)


| Raw value in CSV                          | Proposed display label |
| ----------------------------------------- | ---------------------- |
| `I was always on a design-specific track` | `Design`               |


All other background values pass through **until Pass 3** except any you add for spelling/casing (e.g. `animation` → `Animation` as pure display normalize — see §2.1).

---

## Harmonization rules (working draft)

Use this section as the **single spec** for Pass 2 coding. **Survey `n` = 119** for single-choice questions. **Discipline** counts are *selections* (multi-select), so row counts can sum to more than 119.

**How to work with it**

1. **Yes — use the `Approved bucket` / `Approved` column as your instruction.** Write the **exact text** you want on the chart (e.g. `Web Design`), or keywords we agreed on: `**KEEP`** (use raw string as-is), `**DROP`** (exclude from counts for that chart), `**MERGE → Name`** (this raw row feeds the bar named `Name`). For merge tables (H.1a), one filled **Approved** cell for the group is enough.
2. Anything left **blank** = not decided yet; implementation skips that rule until you fill it.
3. After you edit this file, we translate the approved column into `explore.html` maps (CSV still unchanged).

---

### H.1 First design discipline (multi-select tokens)

*Current counts from embedded CSV (token = one comma-separated item after `parseMulti`).*

#### H.1a — Canonical merges (several raw strings → one bar)


| Raw strings (all must map together)                          | Combined selections (sum of counts) | Proposed display bar                                        | Approved bucket   |
| ------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------- | ----------------- |
| `Web design`, `Web Design`, `Website Designer`               | 5 + 1 + 1 = **7**                   | `Web Design`                                                | Web Design        |
| `Exhibition Design`, `Experience Design / events/ gathering` | 5 + 1 = **6**                       | `Exhibition & experience design` *(or pick a shorter name)* | Exhibition Design |


#### H.1b — Display normalize only (one raw → prettier label, same bar)

High-frequency tokens (no merge); **Approved** = final label string or leave blank to keep raw.


| Raw token                | Count | Proposed display                  | Approved               |
| ------------------------ | ----- | --------------------------------- | ---------------------- |
| `Digital product Design` | 31    | `Digital Product Design`          | Digital Product Design |
| `Graphic Design`         | 50    | `Graphic Design` *(already fine)* | Graphic Design         |
| `UI Design`              | 29    | `UI Design`                       | User Interface Design  |
| `Interaction Design`     | 24    | `Interaction Design`              | Interaction Design     |
| `Brand Design`           | 23    | `Brand Design`                    | Brand Design           |
| `Communication Design`   | 19    | `Communication Design`            | Communication Design   |
| `UX Research`            | 18    | `UX Research`                     | Design Research        |
| `Design Strategy`        | 14    | `Design Strategy`                 | Design Strategy        |
| `Industrial Design`      | 13    | `Industrial Design`               | Industrial Design      |
| `Service Design`         | 13    | `Service Design`                  | Service Design         |
| `Editorial Design`       | 11    | `Editorial Design`                | Editorial Design       |
| `Content Design`         | 10    | `Content Design`                  | Content Design         |
| `Motion Design`          | 7     | `Motion Design`                   | Motion Design          |
| `Design Ops`             | 6     | `Design Ops`                      | Design Ops             |
| `Spatial Design`         | 5     | `Spatial Design`                  | Spatial & Environmental Design |
| `Interior Design`        | 3     | `Interior Design`                 | Spatial & Environmental Design |
| `UX Writer`              | 3     | `UX Writer`                       | Content Design         |


#### H.1c — Tokens with count **1** (one row each → set `Approved bucket`)

Each row is a **distinct raw token** that appears exactly once in the discipline multi-select breakdown. Use `**Approved bucket`** for the exact chart label you want, `**DROP`** to exclude, `**Other`** (or `Other disciplines`, etc.) to roll into a long-tail bar, or `**MERGE → …**` to send counts into another canonical bar (overrides H.1a if you need an exception).

Rows marked **H.1a** are already grouped in §H.1a — you can leave `**Approved bucket`** blank there if H.1a’s row is enough; fill a cell only if you want a **per-token override**.


| Raw token                                 | Count | Notes                                                     | Approved bucket      |
| ----------------------------------------- | ----- | --------------------------------------------------------- | -------------------- |
| `Behavioural science/design`              | 1     | Proposed display normalize: `Behavioral science / design` | Behavioral Design              |
| `Business Director & Design Partnerships` | 1     |                                                           | Business                       |
| `Environmental/store design`              | 1     |                                                           | Spatial & Environmental Design |
| `Experience Design / events/ gathering`   | 1     | Merged in **H.1a** with `Exhibition Design`               |                                |
| `Game design`                             | 1     |                                                           | Game Design                    |
| `General design research`                 | 1     |                                                           | Design Research                |
| `Information Graphics`                    | 1     |                                                           | Communication Design           |
| `information architecture`                | 1     | Proposed: `Information architecture` (casing)             | Other                          |
| `Lean start-up design`                    | 1     |                                                           | Other                          |
| `not ux focused`                          | 1     | Specialist: often **DROP** vs **Other** — your call       | Other                          |
| `Packaging Design`                        | 1     |                                                           | Other                          |
| `Point of sale`                           | 1     | Proposed: `Point of Sale`                                 | Other                          |
| `Production Design`                       | 1     |                                                           | Other                          |
| `UX Product Management`                   | 1     |                                                           | Other                          |
| `Web Design`                              | 1     | Merged in **H.1a** with `Web design` / `Website Designer` |                                |
| `Webmaster`                               | 1     |                                                           | Web Design                     |
| `Website Designer`                        | 1     | Merged in **H.1a**                                        |                                |


**Optional global rule** (if you do not want to fill every row above): use the **Approved** cells in the rule row only — implementation can map “empty = use global rule” once you lock it.


| Rule                   | Meaning                                                                                                                       | Approved                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **R1 — Threshold**     | Every discipline token with count ≤ maps to `**Other`** (except explicit `DROP`, `KEEP`, rows filled above, and H.1a merges). |                                    |
| **R2 — Explicit list** | Only tokens you mark in the table (e.g. `Other`) roll up; no automatic threshold.                                             | **Approved**                       |
| `**Other` bar label**  | Text shown for the combined long-tail bar                                                                                     | `Other`                            |


**Approved rule: R2** — explicit per-row approvals only; no automatic threshold. `Other` bar label: `Other`.

---

### H.2 Entry into design (single choice)


| Raw value                                                                                             | Count | Proposed bucket | Approved bucket |
| ----------------------------------------------------------------------------------------------------- | ----- | --------------- | --------------- |
| `A non-paid internship at Ogilvy Design`                                                              | 1     | `Internship`    | Internship                                              |
| `an internship`                                                                                       | 1     | `Internship`    | Internship                                              |
| `Natural circling back from teenage years doing it for fun`                                           | 1     | `Other`         | A natural continuation of what I'd always been doing   |
| `Took two moves and 1.5 years of trying to land first design job`                                     | 1     | `Other`         | Other                                                   |
| `cheaper than film school`                                                                            | 1     | `Other`         | A pragmatic decision based on job prospects or circumstances |
| `Both: early childhood abilities in Europe; then, a surprising door opened to my education in the US` | 1     | `Other`         | Other                                                   |


**Five main categories** — short display labels on bar, full text on hover tooltip:

| Full text (raw / hover) | Display label (bar) |
| ----------------------------------------------------------------------- | ----------------------- |
| `A gradual accumulation of interests that reached a tipping point`      | `Gradual accumulation`  |
| `An unexpected opportunity I hadn’t planned for`                        | `Unexpected opportunity`|
| `A natural continuation of what I’d always been doing`                  | `Natural continuation`  |
| `A pragmatic decision based on job prospects or circumstances`           | `Pragmatic decision`    |
| `A single defining moment or experience`                                | `Defining moment`       |

After merge: `Internship` = **2** respondents (1.7% → **2%** rounded); `Natural continuation` gains 1 → **20**; `Pragmatic decision` gains 1 → **13**; `Other` = **2** (1.7% → **2%** rounded). No footnote — bars speak for themselves.

---

### H.3 Intended career trajectory (single choice)

**Seven frequent values** — short display labels on bar, full text on hover tooltip:


| Raw (CSV)                                                      | Count | Display label (bar)                  |
| -------------------------------------------------------------- | ----- | ------------------------------------ |
| `advance to the next career level`                             | 43    | `Advance to next level`              |
| `continue at current level`                                    | 16    | `Continue at current level`          |
| `unsure`                                                       | 14    | `Unsure`                             |
| `shift to a different professional discipline / business area` | 12    | `Shift discipline or domain`         |
| `start your own company (agency, startup, etc.)`               | 11    | `Start a company or go independent`  |
| `shift your career away from design completely`                | 8     | `Shift away from design`             |
| `retirement`                                                   | 6     | `Retirement`                         |


**Singletons (9 respondents total, each raw count 1):**


| Raw value                                                                                                                                                                                                                | Approved bucket                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `this market with the combination of AI and tech layoffs make it hard to plan the future`                                                                                                                                | `Unsure`                             |
| `I’d like to stay in UX but with current trends I’m preparing to shift if needed.`                                                                                                                                       | `Unsure`                             |
| `Advance to next career level, or Academia`                                                                                                                                                                              | `Advance to next level`              |
| `Experimenting on new business and exec roles in fractional consulting or new emerging roles in RAI`                                                                                                                     | `Start a company or go independent`  |
| `Stay within the discipline but likely pivot in some way (out of current role & org)`                                                                                                                                    | `Shift discipline or domain`         |
| `I already shifted from design to have flexibility on job choices`                                                                                                                                                       | `Already shifted` *(own bar)*        |
| `seek to scale impact on the entire Design community (versus serving only one client at a time). Helping to enable design leaders (and corporate C-suites and Boards) leverage Design more strategically and profoundly` | `Other`                              |
| `Interdisciplinary, Multilateral and Multi-vertical`                                                                                                                                                                     | `Other`                              |
| `Become a consultant and shift to art practices`                                                                                                                                                                         | `Other`                              |

---

### H.4 Questions for you (reply in chat or edit this file)

1. **H.1a** — OK with `Web Design` and `Exhibition & experience design` as merge names, or different wording?
2. **H.1c** — Fill `**Approved bucket`** per row in the singleton table (or set **R1/R2** in the rule row). For `not ux focused`, choose `**DROP`** vs `**Other`** (or another bucket) in that row.
3. **H.2** — Final labels for `Internship` / `Other`? OK rounding **3%** vs **4%** for the four-person `Other`?
4. **H.3** — Confirm **Option A** vs **Option B** for trajectory singletons; if combined bar, exact title?
5. **Pass 3 overlap** — Any discipline harmonization you want to **defer** until background (Arts/Humanities, Social Sciences) is decided?

---

## Pass 2 — Display labels with merges / buckets (changes chart math)

These **rebucket** answers for display: percentages and bar order change. Document the rule in code comments. **Filter behavior:** typically map before filter count so a respondent still matches filters; confirm product intent.

**Implementation:** follow **§ Harmonization rules** once `Approved` cells are filled.

### 2.0 “First design discipline” (multi-select column)

**Raw tokens** are comma-separated items inside the discipline cell. Below is the **complete set of unique tokens** in the current CSV (after the same comma-splitting logic as `explore.html`’s `parseMulti`). Anything not listed has count 0.

#### A) Title-case / punctuation only (display string change, **no merge**)

Use a consistent title case rule on the **display** side (CSV stays ugly where it is).


| Raw token                               | Notes                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `Digital product Design`                | → `Digital Product Design`                                                              |
| `Web design`                            | → `Web Design`                                                                          |
| `Web Design`                            | same display as above → **also merge with `Web design` and `Website Designer`** (§2.0B) |
| `Behavioural science/design`            | → `Behavioral Science / Design` (or `Behavioral Science` — pick one style)              |
| `Point of sale`                         | → `Point of Sale`                                                                       |
| `information architecture`              | → `Information Architecture`                                                            |
| `Website Designer`                      | merge to Web family (§2.0B)                                                             |
| `Experience Design / events/ gathering` | display normalize + consider merge with Exhibition (§2.0B)                              |


Also normalize casing for any other all-lowercase or mixed tokens you want to look polished.

#### B) Merges / drops (specialist feedback)


| Raw token(s)                                                 | Proposed display bucket                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `Web design`, `Web Design`, `Website Designer`               | Single label, e.g. `Web Design`                                                         |
| `Exhibition Design`, `Experience Design / events/ gathering` | Single label, e.g. `Exhibition / experience design` *(wording TBD)*                     |
| `not ux focused`                                             | **Drop from chart** (do not count toward multi-select bar), or map to `Other` — confirm |


#### C) Optional “Other” for long tail

**Authoritative list:** every count-**1** discipline token (plus notes for H.1a-linked rows) is in **§H.1c** — use that table’s `**Approved bucket*`* column.

Specialist asked to combine many low-count answers into **Other**. **Decision needed:** per-row approvals and/or **R1/R2** rule in §H.1c. Merging changes reported % for every discipline.

**Industrial Design (13)** and **Motion Design (7)** are *not* 1% — do not fold into “Other” unless you explicitly override the earlier note to move 1% industrial/animation into Design/Arts (those one-offs in **background** are different fields; see §3).

---

### 2.1 Entry into design (`How would you describe your entry into design as a career?`)

**All raw values and counts (n = 119):**


| Count | Raw value                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------- |
| 48    | `A gradual accumulation of interests that reached a tipping point`                                    |
| 25    | `An unexpected opportunity I hadn't planned for`                                                      |
| 19    | `A natural continuation of what I'd always been doing`                                                |
| 12    | `A pragmatic decision based on job prospects or circumstances`                                        |
| 9     | `A single defining moment or experience`                                                              |
| 1     | `A non-paid internship at Ogilvy Design`                                                              |
| 1     | `an internship`                                                                                       |
| 1     | `Natural circling back from teenage years doing it for fun`                                           |
| 1     | `Took two moves and 1.5 years of trying to land first design job`                                     |
| 1     | `cheaper than film school`                                                                            |
| 1     | `Both: early childhood abilities in Europe; then, a surprising door opened to my education in the US` |


**Proposed buckets (specialist):**


| Display label               | Maps from raw                                             | Respondents | ~% of 119                                               |
| --------------------------- | --------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| `Internship` *(or similar)* | `A non-paid internship at Ogilvy Design`, `an internship` | 2           | 2%                                                      |
| `Other`                     | The four remaining singletons above                       | 4           | 3.4% → **rounds to 3%**, not 4% — confirm rounding copy |


All other five categories pass through unchanged.

---

### 2.2 Intended career trajectory (`In the next 5 years, which direction best describes your intended career trajectory?`)

**Raw values with count ≥ 6 (keep as-is for display unless you rename for tone):**


| Count | Raw value                                                      |
| ----- | -------------------------------------------------------------- |
| 43    | `advance to the next career level`                             |
| 16    | `continue at current level`                                    |
| 14    | `unsure`                                                       |
| 12    | `shift to a different professional discipline / business area` |
| 11    | `start your own company (agency, startup, etc.)`               |
| 8     | `shift your career away from design completely`                |
| 6     | `retirement`                                                   |


**Singletons (count = 1) — candidate “Other” bucket** (specialist: keep “already shifted” separate if present; **there is no exact string “Already shifted from design”** in this extract — closest is long-form below):


| Raw value                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Experimenting on new business and exec roles in fractional consulting or new emerging roles in RAI`                                                                                                                     |
| `I already shifted from design to have flexibility on job choices`                                                                                                                                                       |
| `this market with the combination of AI and tech layoffs make it hard to plan the future`                                                                                                                                |
| `Advance to next career level, or Academia`                                                                                                                                                                              |
| `seek to scale impact on the entire Design community (versus serving only one client at a time). Helping to enable design leaders (and corporate C-suites and Boards) leverage Design more strategically and profoundly` |
| `Interdisciplinary, Multilateral and Multi-vertical`                                                                                                                                                                     |
| `I’d like to stay in UX but with current trends I’m preparing to shift if needed.`                                                                                                                                       |
| `Become a consultant and shift to art practices`                                                                                                                                                                         |
| `Stay within the discipline but likely pivot in some way (out of current role & org)`                                                                                                                                    |


**Proposed rule (pending Doug/opinions):**

- Keep the seven high-frequency answers as their own bars (optionally sentence-case for display).
- Either:
  - **Option A:** One bar `**Already shifted / other atypical paths`** that includes `I already shifted from design…` plus the other singletons, **or**
  - **Option B:** Separate bar for `**I already shifted from design to have flexibility on job choices`** only; remaining singletons → `**Other`**.

---

## Pass 3 — Unsure / higher editorial risk (needs decision before coding)

### 3.1 Academic / professional trajectory — merges & splits

**All raw values and counts:**


| Count | Raw value                                               |
| ----- | ------------------------------------------------------- |
| 38    | `Arts / Fine Arts / Humanities`                         |
| 35    | `I was always on a design-specific track`               |
| 13    | `Engineering / Computer Science`                        |
| 10    | `Social Sciences (Psychology, Sociology, Anthropology)` |
| 8     | `Business / Economics`                                  |
| 4     | `Architecture`                                          |
| 2     | `Natural Sciences`                                      |
| 2     | `Medical`                                               |
| 1     | `Psychology, Fine Art, Animation & Multimedia`          |
| 1     | `Advertising`                                           |
| 1     | `Visual FX and Post Production for Film and TV`         |
| 1     | `Marketing`                                             |
| 1     | `Law`                                                   |
| 1     | `Industrial Design x Industrial Engineering`            |
| 1     | `animation`                                             |


**Unsure items (your questions 3 & 4):**

1. `**Social Sciences (Psychology, Sociology, Anthropology)` vs `Psychology, Fine Art, Animation & Multimedia`**
  - Options: leave separate with display-only shorter label for Social Sciences; merge into one bucket; merge Psychology track into Social Sciences, etc.
2. `**Arts / Fine Arts / Humanities` → split** into two display categories
  - Requires a **rule per respondent** (not in CSV today): e.g. manual mapping table, keyword heuristic, or leave combined until you have a defensible split.
3. **Move 1% `animation` and `Industrial Design x Industrial Engineering` into “Design” and “Arts”**
  - Define exact display buckets: does `Industrial Design x Industrial Engineering` → `Design`? Does `animation` → `Arts` or `Design`?

**Pass 1 already covers** `I was always on a design-specific track` → `Design` without resolving 3 & 4.

---

## Pass 4 — Ship and polish (deferred)

- Global capitalization consistency across remaining sections (`index.html`, explore section titles, etc.).
- Tool stack bar color — stakeholder review.

---

## Summary: “every label that needs a display label”

Use this as the implementation checklist. **“Needs”** = either a string change or a merge.


| #   | Column / context                 | Raw keys affected                                                                                                                                            |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | First org type                   | `Corporate (In-house)`                                                                                                                                       |
| 2   | Scale of first team              | `Large, established design organization (21+)`, `Solo designer (I was the only designer in the organization)` (+ optional shorten for small/mid if you want) |
| 3   | Academic trajectory              | `I was always on a design-specific track` → `Design`; **plus entire Pass 3 set if approved**                                                                 |
| 4   | Entry into design                | Two internship strings → one bucket; four singletons → `Other`                                                                                               |
| 5   | First discipline (each token)    | All tokens in §2.0 (at minimum: casing fixes; Web* merge; Exhibition + Experience merge; `not ux` handling; optional Other bucket)                           |
| 6   | Intended trajectory              | Optional display casing; singleton handling per §2.2                                                                                                         |
| 7   | `index.html` Finding 2 spotlight | Updated to `Corporate (In-House)` (chart + spotlight)                                                                                                        |


---

## Revision log


| Pass   | Status                                 | Notes                                        |
| ------ | -------------------------------------- | -------------------------------------------- |
| Pass 0 | Implemented                            | See earlier section                          |
| Pass 1 | Implemented                            | Large team display: `Large design org (21+)` |
| Pass 2 | Needs merge rules + rounding agreement | Changes chart percentages                    |
| Pass 3 | Blocked on editorial                   | Social sciences / psychology / arts split    |
| Pass 4 | Deferred                               | Capitalization, color                        |


Pass 2 can start **without** Pass 3 for questions that do not depend on the background column (disciplines, entry, trajectory). Implement Pass 3 when background merges/splits are decided; then update this doc and code together.