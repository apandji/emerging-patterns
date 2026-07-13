/* ═══════════════════════════════════════════════════════
   CHARTS — Sankey (ported from 1.0) + activities bars.
   Add new report charts here; each chart is a render fn
   that re-runs on theme change via window.renderCharts().
═══════════════════════════════════════════════════════ */

/* ── Sankey: category mappings & canonical stage orders ── */
const STAGE_TITLES = ["Background", "Design Education", "First Org Type", "Current Career Level"];
const BG_ORDER  = ["Design","Arts / humanities","Engineering / CS","Social sciences","Business / economics","Architecture","Other non-design background"];
const EDU_ORDER = ["Master's+ in design","Undergrad design degree","Community college design","Bootcamp certificate","No formal design education","Other design education"];
const ORG_ORDER = ["Corporate / In-House","Agency / consultancy","Startup","NGO / non-profit","Freelance / independent","Academic","Other org type"];
const LVL_ORDER = ["CDO / chief","VP","Director","Manager","IC","Consulting / founder","Other / hybrid"];

function mapBg(v) {
  return ({
    "I was always on a design-specific track": "Design",
    "Arts / Fine Arts / Humanities": "Arts / humanities",
    "Engineering / Computer Science": "Engineering / CS",
    "Social Sciences (Psychology, Sociology, Anthropology)": "Social sciences",
    "Business / Economics": "Business / economics",
    "Architecture": "Architecture"
  })[v] || "Other non-design background";
}
function mapEdu(v) {
  return ({
    "I hold a Master's degree or higher in design.": "Master's+ in design",
    "I hold an undergraduate degree in design": "Undergrad design degree",
    "I did not study design formally.": "No formal design education",
    "I hold a degree in design from a community college.": "Community college design",
    "I have a bootcamp certificate.": "Bootcamp certificate"
  })[v] || "Other design education";
}
function mapOrg(v) {
  return ({
    "Agency / Consultancy": "Agency / consultancy",
    "Corporate (In-house)": "Corporate / In-House",
    "Startup": "Startup",
    "Freelance / Independent": "Freelance / independent",
    "NGO / Non-profit": "NGO / non-profit",
    "Academic": "Academic"
  })[v] || "Other org type";
}
function mapLvl(v) {
  const t = String(v || "").trim().toLowerCase();
  if (!t) return "Other / hybrid";
  if (["founder","partner","consulting","consultant","advisor","mentor","freelance","independent"].some(k => t.includes(k))) return "Consulting / founder";
  if (["chief","cdo","head of"].some(k => t.includes(k))) return "CDO / chief";
  if (["vp","svp","vice president"].some(k => t.includes(k))) return "VP";
  if (t.includes("director")) return "Director";
  if (["manager","managing"].some(k => t.includes(k))) return "Manager";
  if (["staff","principal","ic","individual contributor","lead designer","designer","student","uxr","researcher"].some(k => t.includes(k))) return "IC";
  return "Other / hybrid";
}

function stageOrderFor(si) { return [BG_ORDER, EDU_ORDER, ORG_ORDER, LVL_ORDER][si]; }
function skey(si, cat) { return `${si}|||${cat}`; }

function wrapLabel(text, maxW = 20) {
  const words = String(text).split(" ");
  const lines = []; let line = "";
  words.forEach(w => {
    const c = line ? `${line} ${w}` : w;
    if (c.length > maxW) { if (line) lines.push(line); line = w; } else line = c;
  });
  if (line) lines.push(line);
  return lines;
}

function buildRanks(rows, colNames) {
  const maps = new Map();
  maps.set(0, new Map(BG_ORDER.map((c, i) => [c, i])));
  for (let si = 1; si < colNames.length; si++) {
    const present = new Set(rows.map(r => r[colNames[si]]));
    const canon = stageOrderFor(si);
    const ord = [];
    canon.forEach(c => { if (present.has(c)) ord.push(c); });
    present.forEach(c => { if (!ord.includes(c)) ord.push(c); });
    maps.set(si, new Map(ord.map((c, i) => [c, i])));
  }
  return maps;
}

/* Theme palette for SVG (2.0: ink + vermilion accent) */
function sankeyPalette() {
  const dark = document.documentElement.dataset.theme === "dark";
  return dark ? {
    text:      "rgba(240,237,228,0.90)",
    muted:     "rgba(240,237,228,0.50)",
    line:      "rgba(240,237,228,0.80)",
    lineSoft:  "rgba(240,237,228,0.18)",
    accent:    "rgba(210,83,83,0.95)",
    accentSft: "rgba(210,83,83,0.35)",
    node:      "rgba(240,237,228,0.55)",
    nodeStr:   "rgba(240,237,228,0.72)",
    band:      "rgba(240,237,228,0.05)"
  } : {
    text:      "rgba(22,21,15,0.90)",
    muted:     "rgba(22,21,15,0.50)",
    line:      "#16150F",
    lineSoft:  "rgba(22,21,15,0.18)",
    accent:    "rgba(165,20,23,0.92)",
    accentSft: "rgba(165,20,23,0.26)",
    node:      "rgba(22,21,15,0.62)",
    nodeStr:   "rgba(22,21,15,0.78)",
    band:      "rgba(22,21,15,0.035)"
  };
}

function renderSankey() {
  const svg   = d3.select("#sankey-chart");
  if (svg.empty()) return;
  const tip   = d3.select("#sankey-tooltip");
  const totEl = d3.select("#sankey-total");
  const actEl = d3.select("#sankey-active");
  const C = sankeyPalette();

  const rows = PATHWAYS_DATA.map(d => ({
    background:   mapBg(d[0]),
    education:    mapEdu(d[1]),
    firstOrg:     mapOrg(d[2]),
    currentLevel: mapLvl(d[3])
  }));

  const colNames = ["background", "education", "firstOrg", "currentLevel"];
  const ranks = buildRanks(rows, colNames);
  const nodeMap = new Map(), nodePaths = new Map(), linkPaths = new Map();
  const pathCounts = new Map(), nodes = [], linksByPair = new Map();

  colNames.forEach((col, si) => {
    stageOrderFor(si).forEach(cat => {
      if (!rows.some(r => r[col] === cat)) return;
      nodeMap.set(skey(si, cat), nodes.length);
      nodes.push({ id: skey(si, cat), stageIndex: si, category: cat });
    });
  });

  rows.forEach(r => {
    const vals = [r.background, r.education, r.firstOrg, r.currentLevel];
    const fpk = vals.join("|||");
    pathCounts.set(fpk, (pathCounts.get(fpk) || 0) + 1);
    vals.forEach((v, si) => {
      const k = skey(si, v);
      if (!nodePaths.has(k)) nodePaths.set(k, new Set());
      nodePaths.get(k).add(fpk);
    });
    for (let i = 0; i < vals.length - 1; i++) {
      const sk = skey(i, vals[i]), tk = skey(i + 1, vals[i + 1]);
      const pk = `${sk}>>>${tk}`;
      if (!linkPaths.has(pk)) linkPaths.set(pk, new Set());
      linkPaths.get(pk).add(fpk);
      if (!linksByPair.has(pk)) linksByPair.set(pk, { key: pk, source: nodeMap.get(sk), target: nodeMap.get(tk), value: 0, origin: vals[0] });
      linksByPair.get(pk).value++;
    }
  });

  // Extent is inset so end-anchored labels fit inside the viewBox.
  const sankey = d3.sankey()
    .nodeWidth(24).nodePadding(22)
    .extent([[178, 46], [1222, 734]])
    .nodeAlign(d3.sankeyJustify)
    .nodeSort((a, b) => {
      const rm = ranks.get(a.depth) || new Map();
      const ar = rm.get(a.category) ?? Number.MAX_SAFE_INTEGER;
      const br = rm.get(b.category) ?? Number.MAX_SAFE_INTEGER;
      return ar !== br ? ar - br : (b.value || 0) - (a.value || 0);
    });

  const graph = sankey({
    nodes: nodes.map(d => ({ ...d })),
    links: Array.from(linksByPair.values()).map(d => ({ ...d }))
  });

  const totalPaths = pathCounts.size;
  const ext = d3.extent(graph.links, d => d.value);
  const [minV, maxV] = [ext[0] ?? 0, ext[1] ?? 1];
  const normMax = maxV === minV ? minV + 1 : maxV;
  const opSc = d3.scaleLinear().domain([minV, normMax]).range([0.05, 0.14]);
  const ulSc = d3.scaleLinear().domain([minV, normMax]).range([0.01, 0.04]);

  svg.selectAll("*").remove();

  function setActive(n) {
    actEl.classed("is-hot", !!n)
         .text(n ? `${n} unique paths highlighted` : "Hover a ribbon or block to inspect");
  }

  function overlap(a, b) {
    if (!a || !b) return false;
    const [s, l] = a.size <= b.size ? [a, b] : [b, a];
    for (const k of s) if (l.has(k)) return true;
    return false;
  }

  function collect(sel) {
    const vn = new Set(), vl = new Set();
    graph.nodes.forEach(n => { if (overlap(nodePaths.get(n.id), sel)) vn.add(n.index); });
    graph.links.forEach(l => { if (overlap(linkPaths.get(l.key), sel)) vl.add(l.index); });
    return { vn, vl };
  }

  function reset() {
    ulSel.attr("stroke-opacity", d => ulSc(d.value)).attr("stroke", C.lineSoft);
    lkSel.attr("stroke-opacity", d => opSc(d.value)).attr("stroke", C.line);
    ndSel.attr("opacity", 1); lbSel.attr("opacity", 1);
    setActive(0);
  }

  function hi(sel) {
    const { vn, vl } = collect(sel);
    ulSel.attr("stroke-opacity", d => vl.has(d.index) ? Math.min(0.32, ulSc(d.value) * 2) : 0.01)
         .attr("stroke", d => vl.has(d.index) ? C.accentSft : "rgba(0,0,0,0)");
    lkSel.attr("stroke-opacity", d => vl.has(d.index) ? 0.85 : 0.03)
         .attr("stroke", d => vl.has(d.index) ? C.accent : "rgba(0,0,0,0)");
    ndSel.attr("opacity", d => vn.has(d.index) ? 1 : 0.12);
    lbSel.attr("opacity", d => vn.has(d.index) ? 1 : 0.12);
  }

  function placeTip(event) {
    const wr = document.getElementById("sankey-wrap").getBoundingClientRect();
    const tipW = tip.node().offsetWidth, tipH = tip.node().offsetHeight;
    let tx = event.clientX - wr.left + 16, ty = event.clientY - wr.top + 14;
    if (tx + tipW > wr.width - 8) tx = event.clientX - wr.left - tipW - 16;
    if (ty + tipH > wr.height - 8) ty = event.clientY - wr.top - tipH - 14;
    tip.style("left", `${Math.max(8, tx)}px`).style("top", `${Math.max(8, ty)}px`);
  }

  // Stage bands + labels
  svg.append("g").selectAll("rect").data(STAGE_TITLES).join("rect")
    .attr("x", (_, i) => graph.nodes.find(n => n.depth === i).x0 - 16)
    .attr("y", 40).attr("width", 56).attr("height", 694).attr("fill", C.band);

  svg.append("g").selectAll("text").data(STAGE_TITLES).join("text")
    .attr("x", (_, i) => graph.nodes.find(n => n.depth === i).x0 + 12)
    .attr("y", 26).attr("text-anchor", "middle")
    .attr("font-family", "'IBM Plex Mono', ui-monospace, monospace")
    .attr("font-size", 14).attr("font-weight", 600)
    .attr("letter-spacing", "0.08em")
    .attr("fill", C.muted)
    .text(d => d.toUpperCase());

  totEl.text(`${totalPaths} distinct pathways`);
  setActive(0);

  const ulSel = svg.append("g").attr("fill", "none").selectAll("path").data(graph.links).join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", C.lineSoft)
    .attr("stroke-opacity", d => ulSc(d.value))
    .attr("stroke-width", d => Math.max(2, d.width + 1.5));

  const lkSel = svg.append("g").attr("fill", "none").selectAll("path").data(graph.links).join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", C.line)
    .attr("stroke-opacity", d => opSc(d.value))
    .attr("stroke-width", d => Math.max(1, d.width))
    .style("cursor", "pointer")
    .on("mousemove", (event, d) => {
      const sp = linkPaths.get(d.key) || new Set();
      hi(sp); setActive(sp.size);
      tip.html(`<strong>${d.source.category}</strong> &rarr; <strong>${d.target.category}</strong><br>Respondents: <strong>${d.value}</strong><br><span class="tip-muted">Origin: ${d.origin}</span>`)
         .style("opacity", 1);
      placeTip(event);
    })
    .on("mouseleave", () => { reset(); tip.style("opacity", 0); });

  const nd = svg.append("g").selectAll("g").data(graph.nodes).join("g");

  const ndSel = nd.append("rect")
    .attr("x", d => d.x0).attr("y", d => d.y0)
    .attr("height", d => Math.max(1, d.y1 - d.y0)).attr("width", d => d.x1 - d.x0)
    .attr("fill", d => d.depth === 0 ? C.nodeStr : C.node)
    .style("cursor", "pointer")
    .on("mousemove", (event, d) => {
      const sp = nodePaths.get(d.id) || new Set();
      hi(sp); setActive(sp.size);
      tip.html(`<strong>${d.category}</strong><br>Stage: <strong>${STAGE_TITLES[d.depth]}</strong><br>Respondents: <strong>${d.value}</strong>`)
         .style("opacity", 1);
      placeTip(event);
    })
    .on("mouseleave", () => { reset(); tip.style("opacity", 0); });

  function lx(d) { return d.depth === 0 ? d.x0 - 12 : d.x1 + 12; }
  function la(d) { return d.depth === 0 ? "end" : "start"; }

  const lbSel = nd.append("text")
    .attr("font-size", 13).attr("fill", C.text).attr("pointer-events", "none")
    .attr("font-family", "'IBM Plex Mono', ui-monospace, monospace")
    .attr("x", d => lx(d)).attr("y", d => (d.y0 + d.y1) / 2)
    .attr("text-anchor", d => la(d)).attr("dy", "0.35em")
    .each(function (d) {
      const t = d3.select(this);
      wrapLabel(d.category, 22).forEach((line, i) => {
        t.append("tspan").attr("x", lx(d)).attr("dy", i === 0 ? 0 : 13).text(line);
      });
      t.append("tspan").attr("x", lx(d)).attr("dy", 13)
        .attr("fill", C.muted).attr("font-size", 11.5).text(`n=${d.value}`);
    });
}

/* ── Activities outside primary role (Insight 5) ── */
const ACTIVITIES = [
  { name: "Mentoring / coaching",   pct: 66 },
  { name: "Writing",                pct: 42 },
  { name: "Presenting",             pct: 34 },
  { name: "Teaching",               pct: 30 },
  { name: "Community organizing",   pct: 24 }
];

function renderActivities() {
  const host = document.getElementById("activities-chart");
  if (!host || host.dataset.built) return;
  host.dataset.built = "1";

  ACTIVITIES.forEach(a => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML =
      `<span class="bar-name">${a.name}</span>` +
      `<span class="bar-track"><span class="bar-fill" data-pct="${a.pct}"></span>` +
      `<span class="bar-val">${a.pct}%</span></span>`;
    host.appendChild(row);
  });

  // Animate fills the first time the chart scrolls into view.
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      host.querySelectorAll(".bar-fill").forEach(f => { f.style.width = `${f.dataset.pct}%`; });
      io.disconnect();
    });
  }, { threshold: 0.4 });
  io.observe(host);
}

window.renderCharts = function () {
  renderSankey();
  renderActivities();
};

window.renderCharts();
