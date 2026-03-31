/**
 * Combined report: Sankey + setbacks + advancement + Likert strips + trajectory.
 * Requires d3 v7 and d3-sankey (loaded in HTML before this file).
 */
(function () {
  const DATA_PATH = "../data/quant-survey-responses-raw.csv";
  let cachedAllRows = [];

  const JOURNEY_STAGE_COLS = ["background", "education", "firstOrg", "currentLevel"];
  const JOURNEY_STAGE_SHORT = ["Background", "Design education", "First org", "Level"];

  let journeyContext = null;
  /** @type {{ paths: Set<string>, label: string } | null} */
  let sankeyLock = null;
  let sankeyViewMode = "full";

  const COL = {
    background:
      "Before starting your design career, what was your primary academic or professional trajectory?",
    education: "What is the highest level of design education you have completed?",
    firstOrg: " How would you describe the type of organization you first worked in as a designer?",
    currentLevel: "What career level best describes your current position?",
    setbacks:
      "Which of the following have been major setbacks in your career [select all that apply]",
    advancement:
      "Which factors have been most important to you advancing in your career as a design leader? [select at most 3]",
    industryEvolution:
      "In the next 5 years, how do you expect the global design industry to evolve?",
    toolStack: "In the next 5 years, how much do you expect your tool stack to change?",
    trajectory:
      "In the next 5 years, which direction best describes your intended career trajectory? ",
    region: "In what region do you currently live / work?",
    age: "Select the age range that applies",
    gender: "What gender do you identify with?",
    yearsProfessional:
      "How many years have you been a professional designer? (regardless of career level)"
  };

  function parseYearsProfessional(val) {
    const s = String(val || "").trim();
    if (!s) return NaN;
    const m = s.match(/(\d+)/);
    return m ? Number.parseInt(m[1], 10) : NaN;
  }

  function yearsBucketFromNum(n) {
    if (!Number.isFinite(n)) return null;
    if (n <= 5) return "0-5";
    if (n <= 15) return "6-15";
    if (n <= 25) return "16-25";
    return "26+";
  }

  function getFilteredRows() {
    const age = document.getElementById("filter-age")?.value ?? "";
    const region = document.getElementById("filter-region")?.value ?? "";
    const gender = document.getElementById("filter-gender")?.value ?? "";
    const yearsBucket = document.getElementById("filter-years")?.value ?? "";

    return cachedAllRows.filter((row) => {
      if (age && String(row[COL.age] || "").trim() !== age) return false;
      if (region && String(row[COL.region] || "").trim() !== region) return false;
      if (gender && String(row[COL.gender] || "").trim() !== gender) return false;
      if (yearsBucket) {
        const n = parseYearsProfessional(row[COL.yearsProfessional]);
        const b = yearsBucketFromNum(n);
        if (b !== yearsBucket) return false;
      }
      return true;
    });
  }

  function isAnyFilterActive() {
    return Boolean(
      document.getElementById("filter-age")?.value ||
        document.getElementById("filter-region")?.value ||
        document.getElementById("filter-gender")?.value ||
        document.getElementById("filter-years")?.value
    );
  }

  function clearAllFilters() {
    ["filter-age", "filter-region", "filter-gender", "filter-years"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  const CANONICAL_SETBACKS = [
    "Non-design (product, engineering, etc.) team members / leaders not supporting design",
    "Layoffs / Contraction at my company",
    "Project or product being cancelled",
    "Under-compensation or financial pressure",
    "Lack of growth opportunities at my company",
    "Burnout",
    "Contracted design job market industry-wide"
  ];

  const CANONICAL_ADVANCEMENT = [
    "Advanced degree (MBA, MFA, etc.)",
    "Proven business or user outcomes",
    "Relationships with key stakeholders",
    "Sponsorship or advocacy from senior leaders",
    "Business accumen",
    "Case studies with measurable business results",
    "Years of experience",
    "Previous team size or headcount managed",
    "Published writing or thought leadership",
    "Technical accumen",
    "Budget or scope of management",
    "Speaking at conferences or industry events",
    "Awards or recognition",
    "Design certifications",
    "Aligning myself with key initiatives"
  ];

  const TRAJECTORY_STANDARD = [
    "advance to the next career level",
    "continue at current level",
    "unsure",
    "shift to a different professional discipline / business area",
    "start your own company (agency, startup, etc.)",
    "shift your career away from design completely",
    "retirement"
  ];

  const stageTitles = ["Background", "Design Education", "First Org Type", "Current Career Level"];

  const backgroundOrder = [
    "Design-specific track",
    "Arts / humanities",
    "Engineering / CS",
    "Social sciences",
    "Business / economics",
    "Architecture",
    "Other non-design background"
  ];

  const educationOrder = [
    "Master's+ in design",
    "Undergrad design degree",
    "No formal design education",
    "Community college design",
    "Bootcamp certificate",
    "Other design education"
  ];

  const firstOrgOrder = [
    "Agency / consultancy",
    "Corporate / in-house",
    "Startup",
    "Freelance / independent",
    "NGO / non-profit",
    "Academic",
    "Other org type"
  ];

  const currentLevelOrder = [
    "IC",
    "Manager",
    "Director",
    "VP",
    "CDO / chief",
    "Consulting / founder",
    "Other / hybrid"
  ];

  /** Muted cohort colors — low chroma so overlapping flows stay readable on dark bg (vs saturated Tableau defaults). */
  const backgroundPalette = {
    "Design-specific track": "hsl(210, 22%, 58%)",
    "Arts / humanities": "hsl(36, 24%, 58%)",
    "Engineering / CS": "hsl(350, 18%, 56%)",
    "Social sciences": "hsl(168, 18%, 52%)",
    "Business / economics": "hsl(128, 16%, 52%)",
    "Architecture": "hsl(46, 22%, 58%)",
    "Other non-design background": "hsl(278, 14%, 56%)"
  };

  function groupBackground(value) {
    const mapping = {
      "I was always on a design-specific track": "Design-specific track",
      "Arts / Fine Arts / Humanities": "Arts / humanities",
      "Engineering / Computer Science": "Engineering / CS",
      "Social Sciences (Psychology, Sociology, Anthropology)": "Social sciences",
      "Business / Economics": "Business / economics",
      Architecture: "Architecture"
    };
    return mapping[value] || "Other non-design background";
  }

  function groupEducation(value) {
    const mapping = {
      "I hold a Master's degree or higher in design.": "Master's+ in design",
      "I hold an undergraduate degree in design": "Undergrad design degree",
      "I did not study design formally.": "No formal design education",
      "I hold a degree in design from a community college.": "Community college design",
      "I have a bootcamp certificate.": "Bootcamp certificate"
    };
    return mapping[value] || "Other design education";
  }

  function groupFirstOrg(value) {
    const mapping = {
      "Agency / Consultancy": "Agency / consultancy",
      "Corporate (In-house)": "Corporate / in-house",
      Startup: "Startup",
      "Freelance / Independent": "Freelance / independent",
      "NGO / Non-profit": "NGO / non-profit",
      Academic: "Academic"
    };
    return mapping[value] || "Other org type";
  }

  function classifyCareerLevel(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return "Other / hybrid";

    const consultingKeywords = [
      "founder",
      "partner",
      "consulting",
      "consultant",
      "advisor",
      "mentor",
      "freelance",
      "independent"
    ];
    const chiefKeywords = ["chief", "cdo", "head of"];
    const vpKeywords = ["vp", "svp", "vice president"];
    const managerKeywords = ["manager", "managing"];
    const icKeywords = [
      "staff",
      "principal",
      "ic",
      "individual contributor",
      "lead designer",
      "designer",
      "student",
      "uxr",
      "researcher"
    ];

    if (consultingKeywords.some((keyword) => text.includes(keyword))) return "Consulting / founder";
    if (chiefKeywords.some((keyword) => text.includes(keyword))) return "CDO / chief";
    if (vpKeywords.some((keyword) => text.includes(keyword))) return "VP";
    if (text.includes("director")) return "Director";
    if (managerKeywords.some((keyword) => text.includes(keyword))) return "Manager";
    if (icKeywords.some((keyword) => text.includes(keyword))) return "IC";
    return "Other / hybrid";
  }

  function wrapLabel(text, width = 20) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > width) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function stageKey(stageIndex, category) {
    return `${stageIndex}|||${category}`;
  }

  function stageOrder(stageIndex) {
    if (stageIndex === 0) return backgroundOrder;
    if (stageIndex === 1) return educationOrder;
    if (stageIndex === 2) return firstOrgOrder;
    return currentLevelOrder;
  }

  function buildStageRanks(cleanedRows, stageColumns) {
    const rankMaps = new Map();
    const backgroundRank = new Map(backgroundOrder.map((category, index) => [category, index]));
    rankMaps.set(0, backgroundRank);

    for (let stageIndex = 1; stageIndex < stageColumns.length; stageIndex += 1) {
      const previousRanks = rankMaps.get(stageIndex - 1);
      const column = stageColumns[stageIndex];
      const previousColumn = stageColumns[stageIndex - 1];
      const stats = new Map();

      cleanedRows.forEach((row) => {
        const category = row[column];
        const previousCategory = row[previousColumn];
        const previousRank = previousRanks.get(previousCategory);
        if (previousRank == null) return;

        if (!stats.has(category)) {
          stats.set(category, { weightedRank: 0, count: 0 });
        }
        const entry = stats.get(category);
        entry.weightedRank += previousRank;
        entry.count += 1;
      });

      const orderList = stageOrder(stageIndex);
      const fromOrder = orderList.filter((category) => stats.has(category));
      const extras = [...stats.keys()].filter((c) => !orderList.includes(c));
      extras.sort((a, b) => {
        const aStats = stats.get(a);
        const bStats = stats.get(b);
        const aAverage = aStats.weightedRank / aStats.count;
        const bAverage = bStats.weightedRank / bStats.count;
        if (aAverage !== bAverage) return aAverage - bAverage;
        if (aStats.count !== bStats.count) return bStats.count - aStats.count;
        return a.localeCompare(b);
      });
      const ordered = fromOrder.concat(extras);

      rankMaps.set(stageIndex, new Map(ordered.map((category, index) => [category, index])));
    }

    return rankMaps;
  }

  function countCanonicalInRow(raw, canonicalList) {
    const s = String(raw || "");
    return canonicalList.filter((phrase) => s.includes(phrase));
  }

  function normalizeTrajectory(raw) {
    const t = String(raw || "").trim();
    if (!t) return "Other / unlabeled";
    if (TRAJECTORY_STANDARD.includes(t)) return t;
    return "Other response";
  }

  function showError(message) {
    const el = document.getElementById("report-error");
    if (el) el.textContent = message;
  }

  function journeyPathKey(row) {
    return [row.background, row.education, row.firstOrg, row.currentLevel].join("|||");
  }

  function buildCleanedJourney(rows) {
    const raw = rows.map((row) => {
      const background = groupBackground(row[COL.background]);
      return {
        background,
        education: groupEducation(row[COL.education]),
        firstOrg: groupFirstOrg(row[COL.firstOrg]),
        currentLevel: classifyCareerLevel(row[COL.currentLevel]),
        originBackground: background
      };
    });
    const n = raw.length;
    if (n === 0) {
      return { rows: [], otherMerged: new Map(), n: 0 };
    }
    const thr = Math.max(1, Math.ceil(0.03 * n));
    const otherMerged = new Map();
    let work = raw.map((r) => ({ ...r }));
    JOURNEY_STAGE_COLS.forEach((col, si) => {
      const counts = d3.rollup(work, (v) => v.length, (r) => r[col]);
      const otherLabel = `Other · ${JOURNEY_STAGE_SHORT[si]}`;
      const map = new Map();
      for (const [cat, cnt] of counts) {
        if (!cat) {
          map.set(cat, cat);
          continue;
        }
        map.set(cat, cnt < thr ? otherLabel : cat);
      }
      const merged = [...counts].filter(([cat, cnt]) => cat && cnt < thr).map(([cat]) => cat);
      if (merged.length) {
        otherMerged.set(stageKey(si, otherLabel), merged.sort((a, b) => a.localeCompare(b)));
      }
      work = work.map((r) => ({ ...r, [col]: map.has(r[col]) ? map.get(r[col]) : r[col] }));
    });
    return { rows: work, otherMerged, n };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function updateJourneyInsightPanel(filteredRowCount) {
    const el = document.getElementById("journey-insight-panel");
    if (!el || !journeyContext) return;
    const { cleaned } = journeyContext;
    if (!cleaned.length) {
      el.innerHTML =
        '<p class="journey-insight-empty">No rows match the filters; journey insights appear once there is data.</p>';
      return;
    }
    const nF = filteredRowCount ?? journeyContext.nFiltered ?? cleaned.length;
    let subset = cleaned;
    let headline = "Filtered sample (journey)";
    if (sankeyLock && sankeyLock.paths && sankeyLock.paths.size > 0) {
      subset = cleaned.filter((r) => sankeyLock.paths.has(journeyPathKey(r)));
      headline = sankeyLock.label || "Focused selection";
    }
    const m = subset.length;
    const pct = (x, d) => (d > 0 ? Math.round((100 * x) / d) : 0);
    if (m === 0) {
      el.innerHTML =
        '<p class="journey-insight-empty">No respondents in this selection. Clear focus or adjust filters.</p>';
      return;
    }
    const levelRoll = d3.rollup(subset, (v) => v.length, (r) => r.currentLevel);
    const eduRoll = d3.rollup(subset, (v) => v.length, (r) => r.education);
    const orgRoll = d3.rollup(subset, (v) => v.length, (r) => r.firstOrg);
    const top = (roll) => [...roll.entries()].sort((a, b) => b[1] - a[1])[0];
    const topLevel = top(levelRoll);
    const topEdu = top(eduRoll);
    const topOrg = top(orgRoll);
    const pathDiversity = new Set(subset.map(journeyPathKey)).size;
    const share = pct(m, nF);
    el.innerHTML = [
      `<p class="journey-insight-lede"><strong>${escapeHtml(headline)}</strong> — <strong>${m}</strong> respondent${m === 1 ? "" : "s"} (${share}% of filtered sample).</p>`,
      '<ul class="journey-insight-list">',
      `<li><strong>Most common level today:</strong> ${escapeHtml(topLevel[0])} (${topLevel[1]}, ${pct(topLevel[1], m)}% of this selection)</li>`,
      `<li><strong>Top education in this slice:</strong> ${escapeHtml(shortLabel(topEdu[0], 72))} (${pct(topEdu[1], m)}%)</li>`,
      `<li><strong>Top first organization type:</strong> ${escapeHtml(shortLabel(topOrg[0], 64))} (${pct(topOrg[1], m)}%)</li>`,
      `<li><strong>Path diversity:</strong> ${pathDiversity} distinct pathway${pathDiversity === 1 ? "" : "s"} through the four stages</li>`,
      "</ul>"
    ].join("");
  }

  /** @type {{ graph: object, nodePathSets: Map, linkPathSets: Map, paint: Function, clearHover: Function }[]} */
  let sankeyPaintRegistry = [];
  let sankeyHoverPaths = null;

  function effectiveHighlightPaths(hoverPaths) {
    if (!sankeyLock || !sankeyLock.paths || sankeyLock.paths.size === 0) {
      return hoverPaths;
    }
    if (!hoverPaths) return sankeyLock.paths;
    const out = new Set();
    for (const p of hoverPaths) {
      if (sankeyLock.paths.has(p)) out.add(p);
    }
    return out.size > 0 ? out : sankeyLock.paths;
  }

  function refreshAllSankeyHighlights() {
    const paths = effectiveHighlightPaths(sankeyHoverPaths);
    sankeyPaintRegistry.forEach((inst) => inst.paint(paths));
  }

  function setSankeyLock(paths, label, token) {
    if (sankeyLock && token && sankeyLock.token === token) {
      sankeyLock = null;
      syncSankeyLegendActive();
      updateJourneyInsightPanel();
      refreshAllSankeyHighlights();
      return;
    }
    sankeyLock = paths && paths.size ? { paths, label, token } : null;
    syncSankeyLegendActive();
    updateJourneyInsightPanel();
    refreshAllSankeyHighlights();
  }

  function clearSankeyLock() {
    sankeyLock = null;
    sankeyHoverPaths = null;
    syncSankeyLegendActive();
    updateJourneyInsightPanel();
    refreshAllSankeyHighlights();
  }

  function syncSankeyLegendActive() {
    document.querySelectorAll("#sankey-legend .legend-row--btn").forEach((btn) => {
      btn.classList.remove("is-active");
    });
    if (!sankeyLock || !sankeyLock.token || !sankeyLock.token.startsWith("legend:")) return;
    const name = sankeyLock.token.slice("legend:".length);
    document.querySelectorAll("#sankey-legend .legend-row--btn").forEach((btn) => {
      const lab = btn.querySelector(".legend-label");
      if (lab && lab.textContent === name) btn.classList.add("is-active");
    });
  }

  function renderSankey(rows) {
    sankeyLock = null;
    sankeyHoverPaths = null;
    sankeyPaintRegistry = [];

    const tooltip = d3.select("#tooltip-sankey");
    const pathStatsTotal = d3.select("#path-stats-total");
    const pathStatsActive = d3.select("#path-stats-active");
    const fullPane = document.getElementById("sankey-full-pane");
    const splitWrap = document.getElementById("sankey-split-wrap");

    const { rows: cleaned, otherMerged } = buildCleanedJourney(rows);
    journeyContext = { cleaned, otherMerged, nFiltered: rows.length, originPathSets: new Map() };

    if (!cleaned.length) {
      ["#chart-sankey", "#chart-sankey-a", "#chart-sankey-b"].forEach((id) => {
        d3.select(id).selectAll("*").remove();
      });
      pathStatsTotal.text("No pathways in this sample.");
      pathStatsActive.text("");
      updateJourneyInsightPanel(0);
      renderSankeyLegend();
      return;
    }

    cleaned.forEach((row) => {
      const pk = journeyPathKey(row);
      const ob = row.originBackground;
      if (!journeyContext.originPathSets.has(ob)) journeyContext.originPathSets.set(ob, new Set());
      journeyContext.originPathSets.get(ob).add(pk);
    });

    const uniquePathCount = new Set(cleaned.map(journeyPathKey)).size;
    pathStatsTotal.text(`${uniquePathCount} distinct pathways · n=${rows.length} respondents`);

    function positionTooltip(event) {
      tooltip
        .style("opacity", 1)
        .style("position", "fixed")
        .style("left", `${event.clientX + 14}px`)
        .style("top", `${event.clientY + 14}px`);
    }

    function setActivePathCount(count, label = "highlighted zone") {
      pathStatsActive
        .style("color", count ? "var(--text)" : "var(--muted)")
        .text(
          count
            ? `${count} unique paths in ${label}`
            : "Hover, click a node or flow, or use the legend to focus. Rare categories are merged into “Other” (hover the node for the list)."
        );
    }

    function drawSankeyInto(svgId, stageColumns, titles, extent, globalStageOffset) {
      const svg = d3.select(svgId);
      svg.selectAll("*").remove();
      if (!cleaned.length) return;

      const stageRanks = buildStageRanks(cleaned, JOURNEY_STAGE_COLS);
      const nodeMap = new Map();
      const nodePathSets = new Map();
      const linkPathSets = new Map();
      const nodes = [];
      const linksByPair = new Map();

      stageColumns.forEach((column, localIndex) => {
        const globalStage = globalStageOffset + localIndex;
        const present = new Set(cleaned.map((r) => r[column]).filter(Boolean));
        const orderList = stageOrder(globalStage);
        const orderedCats = [
          ...orderList.filter((c) => present.has(c)),
          ...[...present].filter((c) => !orderList.includes(c)).sort((a, b) => a.localeCompare(b))
        ];
        orderedCats.forEach((category) => {
          const key = stageKey(globalStage, category);
          nodeMap.set(key, nodes.length);
          nodes.push({
            id: key,
            stageIndex: globalStage,
            category,
            displayName: category
          });
        });
      });

      cleaned.forEach((row) => {
        const fullPathKey = journeyPathKey(row);
        const values = stageColumns.map((col) => row[col]);

        values.forEach((value, localIndex) => {
          const globalStage = globalStageOffset + localIndex;
          const key = stageKey(globalStage, value);
          if (!nodePathSets.has(key)) nodePathSets.set(key, new Set());
          nodePathSets.get(key).add(fullPathKey);
        });

        for (let i = 0; i < values.length - 1; i += 1) {
          const g0 = globalStageOffset + i;
          const g1 = globalStageOffset + i + 1;
          const sourceKey = stageKey(g0, values[i]);
          const targetKey = stageKey(g1, values[i + 1]);
          const pairKey = `${sourceKey}>>>${targetKey}`;
          if (!linkPathSets.has(pairKey)) linkPathSets.set(pairKey, new Set());
          linkPathSets.get(pairKey).add(fullPathKey);
          if (!linksByPair.has(pairKey)) {
            linksByPair.set(pairKey, {
              key: pairKey,
              source: nodeMap.get(sourceKey),
              target: nodeMap.get(targetKey),
              value: 0,
              origin: row.originBackground
            });
          }
          linksByPair.get(pairKey).value += 1;
        }
      });

      const sankey = d3
        .sankey()
        .nodeWidth(14)
        .nodePadding(14)
        .extent(extent)
        .nodeAlign(d3.sankeyJustify)
        .nodeSort((a, b) => {
          const ga = a.stageIndex != null ? a.stageIndex : globalStageOffset + a.depth;
          const gb = b.stageIndex != null ? b.stageIndex : globalStageOffset + b.depth;
          const rankMap = stageRanks.get(ga) || new Map();
          const aRank = rankMap.get(a.category) ?? Number.MAX_SAFE_INTEGER;
          const bRank = rankMap.get(b.category) ?? Number.MAX_SAFE_INTEGER;
          if (aRank !== bRank) return aRank - bRank;
          return (b.value || 0) - (a.value || 0);
        });

      const graph = sankey({
        nodes: nodes.map((d) => ({ ...d })),
        links: Array.from(linksByPair.values()).map((d) => ({ ...d }))
      });

      const activeLinkOpacity = 0.95;
      const fadedNodeOpacity = 0.12;
      const activeNodeOpacity = 1;
      const linkValueExtent = d3.extent(graph.links, (d) => d.value);
      const minLinkValue = linkValueExtent[0] ?? 0;
      const maxLinkValue = linkValueExtent[1] ?? minLinkValue;
      const normalizedMaxLinkValue = maxLinkValue === minLinkValue ? minLinkValue + 1 : maxLinkValue;
      const linkOpacityScale = d3.scaleLinear().domain([minLinkValue, normalizedMaxLinkValue]).range([0.18, 0.36]);
      const linkUnderlayOpacityScale = d3
        .scaleLinear()
        .domain([minLinkValue, normalizedMaxLinkValue])
        .range([0.07, 0.16]);

      function linkColor(d) {
        return backgroundPalette[d.origin] || "hsl(210, 8%, 52%)";
      }

      function getLinkOpacity(link, opacityMultiplier = 1) {
        return linkOpacityScale(link.value) * opacityMultiplier;
      }

      function getUnderlayOpacity(link, opacityMultiplier = 1) {
        return linkUnderlayOpacityScale(link.value) * opacityMultiplier;
      }

      function hasPathOverlap(candidatePaths, selectedPaths) {
        if (!candidatePaths || !selectedPaths) return false;
        const [smaller, larger] =
          candidatePaths.size <= selectedPaths.size ? [candidatePaths, selectedPaths] : [selectedPaths, candidatePaths];
        for (const pathKey of smaller) {
          if (larger.has(pathKey)) return true;
        }
        return false;
      }

      function collectSelectionFromPathSet(selectedPaths) {
        const visitedNodes = new Set();
        const visitedLinks = new Set();
        graph.nodes.forEach((node) => {
          if (hasPathOverlap(nodePathSets.get(node.id), selectedPaths)) {
            visitedNodes.add(node.index);
          }
        });
        graph.links.forEach((link) => {
          if (hasPathOverlap(linkPathSets.get(link.key), selectedPaths)) {
            visitedLinks.add(link.index);
          }
        });
        return { visitedNodes, visitedLinks };
      }

      let linkUnderlaySelection;
      let linkSelection;
      let nodeSelection;
      let nodeLabelSelection;

      function resetHighlightLocal() {
        linkUnderlaySelection
          .attr("stroke-opacity", (d) => getUnderlayOpacity(d))
          .attr("stroke", (d) => linkColor(d));
        linkSelection
          .attr("stroke-opacity", (d) => getLinkOpacity(d))
          .attr("stroke", (d) => linkColor(d));
        nodeSelection.attr("opacity", activeNodeOpacity);
        nodeLabelSelection.attr("opacity", activeNodeOpacity);
      }

      function applyHighlightLocal(selection) {
        linkUnderlaySelection
          .attr("stroke-opacity", (d) =>
            selection.visitedLinks.has(d.index) ? Math.min(0.45, getUnderlayOpacity(d, 1.4)) : 0.02
          )
          .attr("stroke", (d) =>
            selection.visitedLinks.has(d.index) ? "rgba(129, 227, 190, 0.35)" : "rgba(255, 255, 255, 0.02)"
          );
        linkSelection
          .attr("stroke-opacity", (d) => (selection.visitedLinks.has(d.index) ? activeLinkOpacity : 0.06))
          .attr("stroke", (d) =>
            selection.visitedLinks.has(d.index) ? "var(--accent)" : "rgba(255, 255, 255, 0.04)"
          );
        nodeSelection.attr("opacity", (d) =>
          selection.visitedNodes.has(d.index) ? activeNodeOpacity : fadedNodeOpacity
        );
        nodeLabelSelection.attr("opacity", (d) =>
          selection.visitedNodes.has(d.index) ? activeNodeOpacity : fadedNodeOpacity
        );
      }

      const bandData = titles.map((_, i) => i);
      svg
        .append("g")
        .selectAll("rect")
        .data(bandData)
        .join("rect")
        .attr("x", (_, i) => graph.nodes.find((n) => n.depth === i).x0 - 12)
        .attr("y", 36)
        .attr("width", 44)
        .attr("height", extent[1][1] - extent[0][1] + 24)
        .attr("rx", 16)
        .attr("fill", "var(--band)")
        .attr("opacity", 0)
        .transition()
        .duration(400)
        .attr("opacity", 1);

      svg
        .append("g")
        .selectAll("text")
        .data(titles)
        .join("text")
        .attr("class", "stage-label")
        .attr("x", (_, i) => graph.nodes.find((n) => n.depth === i).x0 + 9)
        .attr("y", 22)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)
        .text((d) => d)
        .transition()
        .duration(420)
        .delay((_, i) => i * 40)
        .attr("opacity", 1);

      const linkUnderlayPaths = svg
        .append("g")
        .attr("fill", "none")
        .attr("class", "sankey-links-under")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", (d) => linkColor(d))
        .attr("stroke-opacity", 0)
        .attr("stroke-width", (d) => Math.max(2, d.width + 1.2));
      linkUnderlayPaths
        .transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .attr("stroke-opacity", (d) => getUnderlayOpacity(d));
      linkUnderlaySelection = linkUnderlayPaths;

      const linkPaths = svg
        .append("g")
        .attr("fill", "none")
        .attr("class", "sankey-links")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", (d) => linkColor(d))
        .attr("stroke-opacity", 0)
        .attr("stroke-width", (d) => Math.max(1, d.width))
        .style("cursor", "pointer");
      linkPaths
        .on("mousemove", (event, d) => {
          const selectedPaths = linkPathSets.get(d.key) || new Set();
          sankeyHoverPaths = selectedPaths;
          refreshAllSankeyHighlights();
          const eff = effectiveHighlightPaths(selectedPaths);
          setActivePathCount(eff.size || 0, sankeyLock ? "focus ∩ hover" : "highlighted zone");
          positionTooltip(event);
          tooltip.html(
            `<strong>${escapeHtml(d.source.category)}</strong> → <strong>${escapeHtml(d.target.category)}</strong><br/>` +
              `Respondents: <strong>${d.value}</strong><br/>` +
              `Colored by background: <strong>${escapeHtml(d.origin)}</strong>`
          );
        })
        .on("mouseleave", () => {
          sankeyHoverPaths = null;
          tooltip.style("opacity", 0);
          refreshAllSankeyHighlights();
          const eff = effectiveHighlightPaths(null);
          setActivePathCount(
            eff && eff.size ? eff.size : 0,
            sankeyLock ? "locked selection" : "highlighted zone"
          );
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          const selectedPaths = linkPathSets.get(d.key) || new Set();
          setSankeyLock(selectedPaths, `${d.source.category} → ${d.target.category}`, `link:${d.key}`);
        });
      linkPaths
        .transition()
        .duration(500)
        .ease(d3.easeCubicOut)
        .attr("stroke-opacity", (d) => getLinkOpacity(d));
      linkSelection = linkPaths;

      const node = svg.append("g").selectAll("g").data(graph.nodes).join("g").style("cursor", "pointer");

      const nodeRects = node
        .append("rect")
        .attr("class", "sankey-node")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("height", (d) => Math.max(1, d.y1 - d.y0))
        .attr("width", (d) => d.x1 - d.x0)
        .attr("fill", (d) => (d.depth === 0 ? "var(--node-strong)" : "var(--node)"))
        .attr("stroke", "var(--stroke)")
        .attr("stroke-width", 1.1)
        .attr("opacity", 0);
      nodeRects
        .on("mousemove", (event, d) => {
          const selectedPaths = nodePathSets.get(d.id) || new Set();
          sankeyHoverPaths = selectedPaths;
          refreshAllSankeyHighlights();
          const eff = effectiveHighlightPaths(selectedPaths);
          setActivePathCount(eff.size || 0, sankeyLock ? "focus ∩ hover" : "highlighted zone");
          positionTooltip(event);
          const stageTitle = titles[d.depth] || stageTitles[d.stageIndex] || "";
          const merged = otherMerged.get(d.id);
          const mergedHtml = merged
            ? `<br/><span style="color:var(--muted)">Merged: ${escapeHtml(merged.join("; "))}</span>`
            : "";
          tooltip.html(
            `<strong>${escapeHtml(d.category)}</strong><br/>` +
              `Stage: <strong>${escapeHtml(stageTitle)}</strong><br/>` +
              `Respondents: <strong>${d.value}</strong>${mergedHtml}`
          );
        })
        .on("mouseleave", () => {
          sankeyHoverPaths = null;
          tooltip.style("opacity", 0);
          refreshAllSankeyHighlights();
          const eff = effectiveHighlightPaths(null);
          setActivePathCount(
            eff && eff.size ? eff.size : 0,
            sankeyLock ? "locked selection" : "highlighted zone"
          );
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          const selectedPaths = nodePathSets.get(d.id) || new Set();
          setSankeyLock(selectedPaths, d.category, `node:${d.id}`);
        });
      nodeRects
        .transition()
        .duration(380)
        .ease(d3.easeCubicOut)
        .delay((d, i) => 30 + i * 22)
        .attr("opacity", activeNodeOpacity);
      nodeSelection = nodeRects;

      function getLabelX(d) {
        return d.depth === 0 ? d.x0 - 10 : d.x1 + 10;
      }

      function getLabelAnchor(d) {
        return d.depth === 0 ? "end" : "start";
      }

      nodeLabelSelection = node
        .append("text")
        .attr("class", "node-label")
        .attr("x", (d) => getLabelX(d))
        .attr("y", (d) => (d.y0 + d.y1) / 2)
        .attr("text-anchor", (d) => getLabelAnchor(d))
        .attr("dy", "0.35em")
        .attr("opacity", 0)
        .each(function (d) {
          const text = d3.select(this);
          const lines = wrapLabel(d.category, 18);
          lines.forEach((line, index) => {
            text
              .append("tspan")
              .attr("x", getLabelX(d))
              .attr("dy", index === 0 ? 0 : 12)
              .text(line);
          });
          text
            .append("tspan")
            .attr("x", getLabelX(d))
            .attr("dy", 12)
            .attr("fill", "var(--muted)")
            .attr("font-size", 9)
            .text(`n=${d.value}`);
        });

      nodeLabelSelection
        .transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .delay((d, i) => 40 + i * 18)
        .attr("opacity", activeNodeOpacity);

      const inst = {
        paint(selectedPaths) {
          if (!selectedPaths || selectedPaths.size === 0) {
            resetHighlightLocal();
            return;
          }
          applyHighlightLocal(collectSelectionFromPathSet(selectedPaths));
        },
        clearHover: () => {
          sankeyHoverPaths = null;
        }
      };
      sankeyPaintRegistry.push(inst);
    }

    if (sankeyViewMode === "split") {
      d3.select("#chart-sankey").selectAll("*").remove();
      if (fullPane) fullPane.hidden = true;
      if (splitWrap) splitWrap.hidden = false;
      drawSankeyInto(
        "#chart-sankey-a",
        ["background", "education", "firstOrg"],
        stageTitles.slice(0, 3),
        [
          [40, 46],
          [920, 500]
        ],
        0
      );
      drawSankeyInto(
        "#chart-sankey-b",
        ["firstOrg", "currentLevel"],
        [stageTitles[2], stageTitles[3]],
        [
          [40, 46],
          [920, 500]
        ],
        2
      );
    } else {
      d3.select("#chart-sankey-a").selectAll("*").remove();
      d3.select("#chart-sankey-b").selectAll("*").remove();
      if (fullPane) fullPane.hidden = false;
      if (splitWrap) splitWrap.hidden = true;
      drawSankeyInto(
        "#chart-sankey",
        JOURNEY_STAGE_COLS,
        stageTitles,
        [
          [64, 46],
          [896, 500]
        ],
        0
      );
    }

    const wrap = document.getElementById("sankey-stack") || document.getElementById("sankey-wrap");
    if (wrap) wrap.style.position = "relative";

    updateJourneyInsightPanel(rows.length);
    setActivePathCount(0);
    renderSankeyLegend();
  }

  function shortLabel(text, max = 72) {
    const t = String(text);
    return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
  }

  function getLikertBins(rows, colKey) {
    const vals = rows.map((r) => Number.parseInt(String(r[colKey] || "").trim(), 10));
    const valid = vals.filter((v) => v >= 1 && v <= 5);
    const nValid = valid.length;
    const bins = d3.range(1, 6).map((k) => {
      const count = valid.filter((v) => v === k).length;
      return {
        k,
        count,
        pct: nValid > 0 ? Math.round((100 * count) / nValid) : 0
      };
    });
    return { valid, nValid, bins };
  }

  function renderHorizontalBars(containerSelector, items) {
    const container = d3.select(containerSelector);
    container.selectAll("*").remove();

    const margin = { top: 6, right: 52, bottom: 6, left: 4 };
    const width = Math.min(900, (container.node() && container.node().getBoundingClientRect().width) || 900);
    const rowHeight = 32;
    const height = margin.top + items.length * rowHeight + margin.bottom;

    const denom = items.n || 1;
    const pct = (d) => Math.round((100 * d.value) / denom);

    const maxV = d3.max(items, (d) => d.value) || 1;
    const labelColW = Math.min(380, width * 0.48);
    const barStart = margin.left + labelColW + 8;
    const x = d3.scaleLinear().domain([0, maxV]).range([barStart, width - margin.right]);

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Horizontal bar chart");

    const g = svg.append("g");

    g.selectAll("text.label")
      .data(items)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", margin.left)
      .attr("y", (d, i) => margin.top + i * rowHeight + 18)
      .attr("text-anchor", "start")
      .attr("fill", "var(--text)")
      .attr("font-size", 11)
      .text((d) => shortLabel(d.label));

    g.selectAll("rect.bar")
      .data(items)
      .join("rect")
      .attr("class", "bar")
      .attr("x", barStart)
      .attr("y", (d, i) => margin.top + i * rowHeight + 8)
      .attr("height", 16)
      .attr("width", (d) => Math.max(0, x(d.value) - barStart))
      .attr("fill", "var(--accent)")
      .attr("opacity", 0.85)
      .attr("rx", 3)
      .append("title")
      .text((d) => d.label);

    g.selectAll("text.value")
      .data(items)
      .join("text")
      .attr("x", width - margin.right + 4)
      .attr("y", (d, i) => margin.top + i * rowHeight + 18)
      .attr("text-anchor", "start")
      .attr("fill", "var(--muted)")
      .attr("font-size", 11)
      .text((d) => `${d.value} (${pct(d)}%)`);
  }

  function renderSankeyLegend() {
    const el = document.getElementById("sankey-legend");
    if (!el) return;
    el.innerHTML = "";
    el.setAttribute("data-interactive", "true");
    Object.entries(backgroundPalette).forEach(([name, color]) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "legend-row legend-row--btn";
      row.setAttribute("aria-label", `Focus paths for background: ${name}`);
      const sw = document.createElement("span");
      sw.className = "legend-swatch";
      sw.setAttribute("aria-hidden", "true");
      sw.style.background = color;
      const lab = document.createElement("span");
      lab.className = "legend-label";
      lab.textContent = name;
      row.appendChild(sw);
      row.appendChild(lab);
      row.addEventListener("click", () => {
        const ps = journeyContext && journeyContext.originPathSets && journeyContext.originPathSets.get(name);
        if (!ps || !ps.size) return;
        setSankeyLock(ps, `Background cohort: ${name}`, `legend:${name}`);
      });
      el.appendChild(row);
    });
  }

  function setupSankeyChrome() {
    document.getElementById("sankey-clear-focus")?.addEventListener("click", () => {
      clearSankeyLock();
    });
    const viewGroup = document.getElementById("sankey-view-toggle");
    if (viewGroup) {
      viewGroup.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-sankey-view]");
        if (!btn) return;
        const mode = btn.getAttribute("data-sankey-view");
        if (mode !== "full" && mode !== "split") return;
        if (mode === sankeyViewMode) return;
        sankeyViewMode = mode;
        viewGroup.querySelectorAll("button[data-sankey-view]").forEach((b) => {
          b.classList.toggle("is-active", b.getAttribute("data-sankey-view") === mode);
        });
        renderReport(getFilteredRows());
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clearSankeyLock();
    });
  }

  function renderLikertDotColumns(containerSelector, rows, colKey, title) {
    const container = d3.select(containerSelector);
    container.selectAll("*").remove();

    const { valid, nValid, bins } = getLikertBins(rows, colKey);
    const width = Math.min(900, (container.node() && container.node().getBoundingClientRect().width) || 900);
    const margin = { top: 8, right: 16, bottom: 40, left: 8 };
    const titleHeight = 22;
    const plotLeft = margin.left + 28;
    const plotRight = width - margin.right;
    const plotW = plotRight - plotLeft;
    const slotW = plotW / 5;
    const dotR = 3.5;
    const gap = 2;
    const step = 2 * dotR + gap;
    const maxPerRow = Math.max(1, Math.floor((slotW - 12) / step));

    let maxRows = 1;
    bins.forEach((b) => {
      const rowsNeeded = Math.ceil(b.count / maxPerRow);
      if (rowsNeeded > maxRows) maxRows = rowsNeeded;
    });

    const chartTop = margin.top + titleHeight + 8;
    const colH = maxRows * step + 8;
    const height = chartTop + colH + margin.bottom;

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img");

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top + 14)
      .attr("fill", "var(--text)")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text(title);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", height - 10)
      .attr("fill", "var(--muted)")
      .attr("font-size", 10)
      .text(
        `Each dot is one respondent · columns = rating 1–5 · ${nValid} valid responses`
      );

    for (let k = 1; k <= 5; k += 1) {
      const n = bins[k - 1].count;
      const slotLeft = plotLeft + (k - 1) * slotW;
      const baseY = chartTop + colH - 8;
      for (let i = 0; i < n; i += 1) {
        const row = Math.floor(i / maxPerRow);
        const col = i % maxPerRow;
        const nThisRow = Math.min(maxPerRow, n - row * maxPerRow);
        const cx =
          slotLeft +
          slotW / 2 +
          (col - (nThisRow - 1) / 2) * step;
        const cy = baseY - row * step - dotR;
        svg
          .append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", dotR)
          .attr("fill", "var(--accent)")
          .attr("opacity", 0.85)
          .append("title")
          .text(`Rating ${k}`);
      }

      svg
        .append("text")
        .attr("x", slotLeft + slotW / 2)
        .attr("y", chartTop + colH + 14)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--muted)")
        .attr("font-size", 10)
        .text(String(k));

      svg
        .append("text")
        .attr("x", slotLeft + slotW / 2)
        .attr("y", chartTop - 2)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--muted)")
        .attr("font-size", 10)
        .text(bins[k - 1].count > 0 ? `${bins[k - 1].count}` : "—");
    }
  }

  function renderLikertHistogram(containerSelector, rows, colKey, title, mode = "bars") {
    if (mode === "strip") {
      renderLikertDotColumns(containerSelector, rows, colKey, title);
      return;
    }

    const container = d3.select(containerSelector);
    container.selectAll("*").remove();

    const { valid, nValid, bins } = getLikertBins(rows, colKey);

    const width = Math.min(900, (container.node() && container.node().getBoundingClientRect().width) || 900);
    const margin = { top: 8, right: 52, bottom: 36, left: 8 };
    const titleHeight = 22;
    const rowH = 26;
    const chartTop = margin.top + titleHeight + 6;
    const chartHeight = 5 * rowH;
    const height = chartTop + chartHeight + margin.bottom;
    const plotLeft = margin.left + 36;
    const plotRight = width - margin.right;

    const maxC = d3.max(bins, (d) => d.count) || 1;
    const x = d3.scaleLinear().domain([0, maxC]).range([plotLeft, plotRight]).nice();

    const yBand = d3
      .scaleBand()
      .domain(bins.map((d) => String(d.k)))
      .range([chartTop, chartTop + chartHeight])
      .padding(0.15);

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img");

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top + 14)
      .attr("fill", "var(--text)")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text(title);

    svg
      .append("line")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", chartTop)
      .attr("y2", chartTop + chartHeight)
      .attr("stroke", "rgba(255,255,255,0.35)")
      .attr("stroke-width", 1);

    const tickVals = x.ticks(5);
    svg
      .selectAll("line.grid")
      .data(tickVals.filter((t) => t > 0))
      .join("line")
      .attr("class", "grid")
      .attr("x1", (t) => x(t))
      .attr("x2", (t) => x(t))
      .attr("y1", chartTop)
      .attr("y2", chartTop + chartHeight)
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("stroke-dasharray", "3,3");

    svg
      .selectAll("text.xtick")
      .data(tickVals)
      .join("text")
      .attr("class", "xtick")
      .attr("x", (t) => x(t))
      .attr("y", chartTop - 4)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--muted)")
      .attr("font-size", 9)
      .text((t) => String(Math.round(t)));

    svg
      .selectAll("text.rating")
      .data(bins)
      .join("text")
      .attr("x", plotLeft - 10)
      .attr("y", (d) => (yBand(String(d.k)) ?? 0) + yBand.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("fill", "var(--text)")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .text((d) => String(d.k));

    svg
      .selectAll("rect.bar")
      .data(bins)
      .join("rect")
      .attr("class", "bar")
      .attr("x", x(0))
      .attr("y", (d) => yBand(String(d.k)))
      .attr("height", yBand.bandwidth())
      .attr("width", (d) => Math.max(0, x(d.count) - x(0)))
      .attr("fill", "var(--accent)")
      .attr("opacity", 0.88)
      .attr("rx", 2)
      .append("title")
      .text((d) => `Rating ${d.k}: ${d.count} respondents (${d.pct}% of valid)`);

    svg
      .selectAll("text.count")
      .data(bins)
      .join("text")
      .attr("x", (d) => x(d.count) + 6)
      .attr("y", (d) => (yBand(String(d.k)) ?? 0) + yBand.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .attr("fill", "var(--muted)")
      .attr("font-size", 11)
      .text((d) =>
        d.count > 0 ? `${d.count} (${d.pct}%)` : ""
      );

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", height - 10)
      .attr("fill", "var(--muted)")
      .attr("font-size", 10)
      .text(
        `Scale 1–5 (left = lower, right = higher) · ${nValid} valid responses · bar length = number of respondents`
      );
  }

  function getLikertMode() {
    const active = document.querySelector(".segmented button.is-active");
    return active && active.getAttribute("data-mode") === "strip" ? "strip" : "bars";
  }

  function renderReport(rows) {
    const n = rows.length;
    const nEl = document.getElementById("report-n");
    const filtered = isAnyFilterActive();
    if (nEl) {
      if (n === 0) {
        nEl.textContent = filtered
          ? "No rows match the current filters."
          : "No data loaded.";
      } else if (filtered) {
        nEl.textContent = `Filtered sample · n = ${n} of ${cachedAllRows.length} respondents`;
      } else {
        nEl.textContent = `Full sample · n = ${n} respondents`;
      }
    }

    renderSankey(rows);

    const setbackCounts = [];
    CANONICAL_SETBACKS.forEach((phrase) => {
      const c = rows.filter((row) => (row[COL.setbacks] || "").includes(phrase)).length;
      setbackCounts.push({ label: phrase, value: c });
    });
    setbackCounts.sort((a, b) => b.value - a.value);
    setbackCounts.n = n;
    renderHorizontalBars("#chart-setbacks", setbackCounts);

    const advCounts = [];
    [...CANONICAL_ADVANCEMENT].sort((a, b) => b.length - a.length).forEach((phrase) => {
      const c = rows.filter((row) => (row[COL.advancement] || "").includes(phrase)).length;
      if (c > 0) advCounts.push({ label: phrase, value: c });
    });
    advCounts.sort((a, b) => b.value - a.value);
    advCounts.n = n;
    renderHorizontalBars("#chart-advancement", advCounts);

    const mode = getLikertMode();
    renderLikertHistogram(
      "#chart-future-industry",
      rows,
      COL.industryEvolution,
      "Global design industry evolution (next 5 years)",
      mode
    );
    renderLikertHistogram(
      "#chart-future-tools",
      rows,
      COL.toolStack,
      "Tool stack change (next 5 years)",
      mode
    );

    const trajMap = d3.rollup(
      rows,
      (v) => v.length,
      (d) => normalizeTrajectory(d[COL.trajectory])
    );
    const trajItems = Array.from(trajMap, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    trajItems.n = n;
    renderHorizontalBars("#chart-trajectory", trajItems);
  }

  function populateSelectOptions(selectId, values, emptyLabel) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">${emptyLabel}</option>`;
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
    if (values.includes(current)) sel.value = current;
  }

  function setupDemographicFilters(allRows) {
    const ages = [...new Set(allRows.map((r) => String(r[COL.age] || "").trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
    const regions = [...new Set(allRows.map((r) => String(r[COL.region] || "").trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );
    const genders = [...new Set(allRows.map((r) => String(r[COL.gender] || "").trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b)
    );

    populateSelectOptions("filter-age", ages, "All ages");
    populateSelectOptions("filter-region", regions, "All regions");
    populateSelectOptions("filter-gender", genders, "All");

    const controls = document.getElementById("filter-header-controls");
    if (controls) {
      controls.addEventListener("change", (e) => {
        if (!e.target.classList.contains("filter-select")) return;
        renderReport(getFilteredRows());
      });
    }

    const clearBtn = document.getElementById("filter-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearAllFilters();
        renderReport(cachedAllRows);
      });
    }
  }

  function setupLikertToggle() {
    const group = document.getElementById("likert-segmented");
    if (!group) return;
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-mode]");
      if (!btn) return;
      group.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderReport(getFilteredRows());
    });
  }

  function setupSectionNavSpy() {
    const nav = document.querySelector(".report-nav");
    if (!nav) return;
    const links = [...nav.querySelectorAll("a[href^='#']")];
    const sections = links
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (!vis.length) return;
        vis.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = vis[0].target.getAttribute("id");
        links.forEach((a) => {
          a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
        });
      },
      { rootMargin: "-22% 0px -38% 0px", threshold: [0, 0.15, 0.35, 0.55, 0.75, 1] }
    );
    sections.forEach((s) => obs.observe(s));
  }

  async function main() {
    let rows;
    try {
      rows = await d3.csv(DATA_PATH);
    } catch (e) {
      showError(`Could not load CSV (${e.message}). Use a local server from the repo root.`);
      return;
    }

    cachedAllRows = rows;

    const errEl = document.getElementById("report-error");
    if (errEl) errEl.textContent = "";

    const nEl = document.getElementById("report-n");
    if (nEl) nEl.textContent = `Full sample · n = ${rows.length} respondents`;

    renderReport(rows);
    setupDemographicFilters(rows);
    setupLikertToggle();
    setupSankeyChrome();
    setupSectionNavSpy();
    const viewToggle = document.getElementById("sankey-view-toggle");
    if (viewToggle) {
      viewToggle.querySelectorAll("button[data-sankey-view]").forEach((b) => {
        b.classList.toggle("is-active", b.getAttribute("data-sankey-view") === sankeyViewMode);
      });
    }
  }

  main();
})();
