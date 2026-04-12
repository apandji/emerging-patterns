const DATA_PATH = "../data/quant-survey-responses-raw.csv";

const COLUMNS = {
  background: "Before starting your design career, what was your primary academic or professional trajectory?",
  education: "What is the highest level of design education you have completed?",
  firstOrg: " How would you describe the type of organization you first worked in as a designer?",
  currentLevel: "What career level best describes your current position?"
};

const stageTitles = [
  "Background",
  "Design Education",
  "First Org Type",
  "Current Career Level"
];

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

function groupBackground(value) {
  const mapping = {
    "I was always on a design-specific track": "Design-specific track",
    "Arts / Fine Arts / Humanities": "Arts / humanities",
    "Engineering / Computer Science": "Engineering / CS",
    "Social Sciences (Psychology, Sociology, Anthropology)": "Social sciences",
    "Business / Economics": "Business / economics",
    "Architecture": "Architecture"
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
    "Startup": "Startup",
    "Freelance / Independent": "Freelance / independent",
    "NGO / Non-profit": "NGO / non-profit",
    "Academic": "Academic"
  };
  return mapping[value] || "Other org type";
}

function classifyCareerLevel(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "Other / hybrid";
  const consultingKeywords = ["founder", "partner", "consulting", "consultant", "advisor", "mentor", "freelance", "independent"];
  const chiefKeywords = ["chief", "cdo", "head of"];
  const vpKeywords = ["vp", "svp", "vice president"];
  const managerKeywords = ["manager", "managing"];
  const icKeywords = ["staff", "principal", "ic", "individual contributor", "lead designer", "designer", "student", "uxr", "researcher"];
  if (consultingKeywords.some(k => text.includes(k))) return "Consulting / founder";
  if (chiefKeywords.some(k => text.includes(k))) return "CDO / chief";
  if (vpKeywords.some(k => text.includes(k))) return "VP";
  if (text.includes("director")) return "Director";
  if (managerKeywords.some(k => text.includes(k))) return "Manager";
  if (icKeywords.some(k => text.includes(k))) return "IC";
  return "Other / hybrid";
}

function wrapLabel(text, width = 20) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  words.forEach(word => {
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
  rankMaps.set(0, new Map(backgroundOrder.map((cat, i) => [cat, i])));

  for (let si = 1; si < stageColumns.length; si++) {
    const prevRanks = rankMaps.get(si - 1);
    const col = stageColumns[si];
    const prevCol = stageColumns[si - 1];
    const stats = new Map();

    cleanedRows.forEach(row => {
      const cat = row[col];
      const prevCat = row[prevCol];
      const prevRank = prevRanks.get(prevCat);
      if (prevRank == null) return;
      if (!stats.has(cat)) stats.set(cat, { weightedRank: 0, count: 0 });
      const entry = stats.get(cat);
      entry.weightedRank += prevRank;
      entry.count += 1;
    });

    const ordered = stageOrder(si)
      .filter(cat => stats.has(cat))
      .sort((a, b) => {
        const aS = stats.get(a), bS = stats.get(b);
        const aAvg = aS.weightedRank / aS.count;
        const bAvg = bS.weightedRank / bS.count;
        if (aAvg !== bAvg) return aAvg - bAvg;
        if (aS.count !== bS.count) return bS.count - aS.count;
        return stageOrder(si).indexOf(a) - stageOrder(si).indexOf(b);
      });

    rankMaps.set(si, new Map(ordered.map((cat, i) => [cat, i])));
  }
  return rankMaps;
}

async function render() {
  const svg = d3.select("#chart");
  const tooltip = d3.select("#tooltip");
  const pathStatsTotal = d3.select("#path-stats-total");
  const pathStatsActive = d3.select("#path-stats-active");

  try {
    const rows = await d3.csv(DATA_PATH);

    const cleaned = rows.map(row => ({
      background: groupBackground(row[COLUMNS.background]),
      education: groupEducation(row[COLUMNS.education]),
      firstOrg: groupFirstOrg(row[COLUMNS.firstOrg]),
      currentLevel: classifyCareerLevel(row[COLUMNS.currentLevel])
    }));

    const stageColumns = ["background", "education", "firstOrg", "currentLevel"];
    const stageRanks = buildStageRanks(cleaned, stageColumns);
    const nodeMap = new Map();
    const nodePathSets = new Map();
    const linkPathSets = new Map();
    const uniquePathCounts = new Map();
    const nodes = [];
    const linksByPair = new Map();

    stageColumns.forEach((col, si) => {
      stageOrder(si).forEach(cat => {
        if (!cleaned.some(row => row[col] === cat)) return;
        const key = stageKey(si, cat);
        nodeMap.set(key, nodes.length);
        nodes.push({ id: key, stageIndex: si, category: cat, displayName: cat });
      });
    });

    cleaned.forEach(row => {
      const values = [row.background, row.education, row.firstOrg, row.currentLevel];
      const fullPathKey = values.join("|||");
      uniquePathCounts.set(fullPathKey, (uniquePathCounts.get(fullPathKey) || 0) + 1);

      values.forEach((val, si) => {
        const key = stageKey(si, val);
        if (!nodePathSets.has(key)) nodePathSets.set(key, new Set());
        nodePathSets.get(key).add(fullPathKey);
      });

      for (let i = 0; i < values.length - 1; i++) {
        const sourceKey = stageKey(i, values[i]);
        const targetKey = stageKey(i + 1, values[i + 1]);
        const pairKey = `${sourceKey}>>>${targetKey}`;

        if (!linkPathSets.has(pairKey)) linkPathSets.set(pairKey, new Set());
        linkPathSets.get(pairKey).add(fullPathKey);

        if (!linksByPair.has(pairKey)) {
          linksByPair.set(pairKey, {
            key: pairKey,
            source: nodeMap.get(sourceKey),
            target: nodeMap.get(targetKey),
            value: 0,
            origin: values[0]
          });
        }
        linksByPair.get(pairKey).value += 1;
      }
    });

    const sankey = d3.sankey()
      .nodeWidth(18)
      .nodePadding(18)
      .extent([[170, 60], [1220, 720]])
      .nodeAlign(d3.sankeyJustify)
      .nodeSort((a, b) => {
        const rankMap = stageRanks.get(a.depth) || new Map();
        const aRank = rankMap.get(a.category) ?? Number.MAX_SAFE_INTEGER;
        const bRank = rankMap.get(b.category) ?? Number.MAX_SAFE_INTEGER;
        if (aRank !== bRank) return aRank - bRank;
        return (b.value || 0) - (a.value || 0);
      });

    const graph = sankey({
      nodes: nodes.map(d => ({ ...d })),
      links: Array.from(linksByPair.values()).map(d => ({ ...d }))
    });

    const totalUniquePathCount = uniquePathCounts.size;

    svg.selectAll("*").remove();

    const activeLinkOpacity = 0.9;
    const fadedNodeOpacity = 0.14;
    const activeNodeOpacity = 1;
    const linkValueExtent = d3.extent(graph.links, d => d.value);
    const minLV = linkValueExtent[0] ?? 0;
    const maxLV = linkValueExtent[1] ?? minLV;
    const normMaxLV = maxLV === minLV ? minLV + 1 : maxLV;

    const linkOpacityScale = d3.scaleLinear().domain([minLV, normMaxLV]).range([0.26, 0.58]);
    const linkUnderlayOpacityScale = d3.scaleLinear().domain([minLV, normMaxLV]).range([0.16, 0.3]);

    const getLinkOpacity = (link, m = 1) => linkOpacityScale(link.value) * m;
    const getUnderlayOpacity = (link, m = 1) => linkUnderlayOpacityScale(link.value) * m;

    function setActivePathCount(count) {
      pathStatsActive
        .style("color", count ? "var(--text)" : "var(--muted)")
        .text(count
          ? `${count} unique paths in highlighted zone`
          : "Hover a node or flow to inspect.");
    }

    function hasPathOverlap(a, b) {
      if (!a || !b) return false;
      const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
      for (const k of smaller) if (larger.has(k)) return true;
      return false;
    }

    function collectSelection(selectedPaths) {
      const visitedNodes = new Set();
      const visitedLinks = new Set();
      graph.nodes.forEach(n => {
        if (hasPathOverlap(nodePathSets.get(n.id), selectedPaths)) visitedNodes.add(n.index);
      });
      graph.links.forEach(l => {
        if (hasPathOverlap(linkPathSets.get(l.key), selectedPaths)) visitedLinks.add(l.index);
      });
      return { visitedNodes, visitedLinks };
    }

    function resetHighlight() {
      linkUnderlaySelection
        .attr("stroke-opacity", d => getUnderlayOpacity(d))
        .attr("stroke", "rgba(255,255,255,0.06)");
      linkSelection
        .attr("stroke-opacity", d => getLinkOpacity(d))
        .attr("stroke", "rgba(255,255,255,0.22)");
      nodeSelection.attr("opacity", activeNodeOpacity);
      nodeLabelSelection.attr("opacity", activeNodeOpacity);
      setActivePathCount(0);
    }

    function applyHighlight(sel) {
      linkUnderlaySelection
        .attr("stroke-opacity", d => sel.visitedLinks.has(d.index) ? Math.min(0.42, getUnderlayOpacity(d, 1.35)) : 0.01)
        .attr("stroke", d => sel.visitedLinks.has(d.index) ? "var(--accent-soft)" : "rgba(255,255,255,0.01)");
      linkSelection
        .attr("stroke-opacity", d => sel.visitedLinks.has(d.index) ? activeLinkOpacity : 0.08)
        .attr("stroke", d => sel.visitedLinks.has(d.index) ? "var(--accent)" : "rgba(255,255,255,0.03)");
      nodeSelection.attr("opacity", d => sel.visitedNodes.has(d.index) ? activeNodeOpacity : fadedNodeOpacity);
      nodeLabelSelection.attr("opacity", d => sel.visitedNodes.has(d.index) ? activeNodeOpacity : fadedNodeOpacity);
    }

    // Stage background bands
    svg.append("g")
      .selectAll("rect")
      .data(stageTitles)
      .join("rect")
      .attr("x", (d, i) => graph.nodes.find(n => n.depth === i).x0 - 16)
      .attr("y", 42)
      .attr("width", 52)
      .attr("height", 690)
      .attr("rx", 20)
      .attr("fill", "var(--band)");

    // Stage title labels
    svg.append("g")
      .selectAll("text")
      .data(stageTitles)
      .join("text")
      .attr("class", "stage-label")
      .attr("x", (d, i) => graph.nodes.find(n => n.depth === i).x0 + 9)
      .attr("y", 28)
      .attr("text-anchor", "middle")
      .text(d => d);

    pathStatsTotal.text(`${totalUniquePathCount} distinct pathways represented`);
    setActivePathCount(0);

    // Link underlay (wider, softer)
    const linkUnderlaySelection = svg.append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", "rgba(255,255,255,0.06)")
      .attr("stroke-opacity", d => getUnderlayOpacity(d))
      .attr("stroke-width", d => Math.max(2, d.width + 1.5));

    // Links
    const linkSelection = svg.append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", "rgba(255,255,255,0.22)")
      .attr("stroke-opacity", d => getLinkOpacity(d))
      .attr("stroke-width", d => Math.max(1, d.width))
      .on("mousemove", (event, d) => {
        const selectedPaths = linkPathSets.get(d.key) || new Set();
        applyHighlight(collectSelection(selectedPaths));
        setActivePathCount(selectedPaths.size);
        tooltip
          .style("opacity", 1)
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY + 14}px`)
          .html(`
            <strong>${d.source.category}</strong> → <strong>${d.target.category}</strong><br>
            Respondents: <strong>${d.value}</strong><br>
            Origin background: <strong>${d.origin}</strong>
          `);
      })
      .on("mouseleave", () => {
        resetHighlight();
        tooltip.style("opacity", 0);
      });

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(graph.nodes)
      .join("g");

    const nodeSelection = node.append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => Math.max(1, d.y1 - d.y0))
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", d => d.depth === 0 ? "var(--node-strong)" : "var(--node)")
      .attr("stroke", "var(--stroke)")
      .attr("stroke-width", 1.15)
      .on("mousemove", (event, d) => {
        const selectedPaths = nodePathSets.get(d.id) || new Set();
        applyHighlight(collectSelection(selectedPaths));
        setActivePathCount(selectedPaths.size);
        tooltip
          .style("opacity", 1)
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY + 14}px`)
          .html(`
            <strong>${d.category}</strong><br>
            Stage: <strong>${stageTitles[d.depth]}</strong><br>
            Respondents: <strong>${d.value}</strong>
          `);
      })
      .on("mouseleave", () => {
        resetHighlight();
        tooltip.style("opacity", 0);
      });

    const getLabelX = d => d.depth === 0 ? d.x0 - 12 : d.x1 + 12;
    const getLabelAnchor = d => d.depth === 0 ? "end" : "start";

    // Node labels
    const nodeLabelSelection = node.append("text")
      .attr("class", "node-label")
      .attr("x", d => getLabelX(d))
      .attr("y", d => (d.y0 + d.y1) / 2)
      .attr("text-anchor", d => getLabelAnchor(d))
      .attr("dy", "0.35em")
      .each(function(d) {
        const text = d3.select(this);
        const lines = wrapLabel(d.category, 20);
        lines.forEach((line, i) => {
          text.append("tspan")
            .attr("x", getLabelX(d))
            .attr("dy", i === 0 ? 0 : 13)
            .text(line);
        });
        text.append("tspan")
          .attr("x", getLabelX(d))
          .attr("dy", 13)
          .attr("fill", "var(--muted)")
          .attr("font-size", 10)
          .text(`n=${d.value}`);
      });

  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", render);
