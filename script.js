const pageOrder = [
  "readyMix",
  "materialArch",
  "materialCivil",
  "materialLandscape",
  "compressive",
  "requestTest",
  "nonconformity"
];

const menuItems = [
  ["readyMix", "01", "레미콘 타설현황", "타설부위, 설계강도, 제조사, 타설량과 상태 조회"],
  ["materialArch", "02", "자재공급원승인(건축)", "건축 자재 규격, 승인상태와 판정 확인"],
  ["materialCivil", "03", "자재공급원승인(토목)", "토목 자재 공급원 승인 현황 조회"],
  ["materialLandscape", "04", "자재공급원승인(조경)", "조경 자재 공급원 승인 현황 조회"],
  ["compressive", "05", "콘크리트 압축강도", "재령별 강도 시험결과와 판정 확인"],
  ["requestTest", "06", "의뢰시험현황", "외부 의뢰시험 진행상태와 판정 추적"],
  ["nonconformity", "07", "품질부적합사항", "부적합 발생 및 조치상태 추적"],
  ["dashboard", "08", "KPI 대시보드", "1~7번 현황 데이터 자동 종합 집계"]
];

const badgeMap = {
  "완료": "pass",
  "합격": "pass",
  "적합": "pass",
  "승인": "pass",
  "승인완료": "pass",
  "있음": "pass",
  "진행중": "progress",
  "검토중": "progress",
  "대기": "progress",
  "지연": "delay",
  "보완": "delay",
  "보완요청": "delay",
  "부적합": "fail",
  "미조치": "fail",
  "반려": "fail",
  "없음": "fail"
};

const pageNumbers = Object.fromEntries(menuItems.map(([key, number]) => [key, number]));

function iconSvg(id) {
  const icons = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h5v-6h2v6h5V10"/>',
    readyMix: '<path d="M4 14h10l2 3h2"/><path d="M4 9h7l3 5"/><path d="M5 17a2 2 0 1 0 0.1 0M17 17a2 2 0 1 0 0.1 0"/><path d="M13 8l4-2 2 4-4 2z"/>',
    materialArch: '<path d="M7 4h10v18H7z"/><path d="M10 4a2 2 0 0 1 4 0"/><path d="M10 10h4M10 14h6"/><path d="M9 18l2 2 5-6"/>',
    materialCivil: '<path d="M5 17l10-10"/><path d="M8 20L18 10"/><path d="M4 13l7 7"/><path d="M10 6l7 7"/><path d="M14 4l6 6"/>',
    materialLandscape: '<path d="M12 21V10"/><path d="M12 12c-5 0-7-3-7-7 5 0 7 3 7 7z"/><path d="M12 14c5 0 7-3 7-7-5 0-7 3-7 7z"/>',
    compressive: '<path d="M12 3l8 4-8 4-8-4 8-4z"/><path d="M4 7v9l8 4 8-4V7"/><path d="M12 11v9"/>',
    requestTest: '<path d="M10 3h4"/><path d="M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 16h8"/>',
    nonconformity: '<path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4z"/><path d="M12 8v6"/><path d="M12 17h.01"/>',
    dashboard: '<path d="M5 19V9"/><path d="M10 19V5"/><path d="M15 19v-8"/><path d="M20 19V3"/><path d="M3 19h19"/>'
  };
  return `<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[id] || icons.dashboard}</svg>`;
}

function getBadgeClass(value) {
  return badgeMap[value] || "";
}

function isBadgeColumn(column) {
  return ["상태", "판정", "승인상태", "진행상태"].includes(column);
}

function renderBadge(value) {
  const className = getBadgeClass(value);
  if (!className) return value || "-";
  return `<span class="badge ${className}">${value}</span>`;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "미분류";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function sumReadyMixVolume() {
  return qualityPortalData.readyMix.rows.reduce((sum, row) => {
    return sum + Number(String(row["타설량"]).replace(/[^0-9.]/g, ""));
  }, 0);
}

function isApproved(value) {
  return ["완료", "승인", "승인완료"].includes(value);
}

function isPending(value) {
  return ["대기", "진행중", "검토중", "보완", "보완요청", "지연"].includes(value);
}

function isPass(value) {
  return ["합격", "적합", "완료", "승인", "승인완료"].includes(value);
}

function isDecisionValue(value) {
  return Boolean(value) && !["대기", "진행중", "검토중", "보완", "보완요청"].includes(value);
}

function rate(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function getMaterialKpi(pageKey) {
  const rows = qualityPortalData[pageKey].rows;
  const decisionRows = rows.filter(row => isDecisionValue(row["판정"]));
  return {
    approvalCount: rows.filter(row => isApproved(row["승인상태"])).length,
    pendingCount: rows.filter(row => isPending(row["승인상태"]) || !row["승인상태"]).length,
    fitRate: rate(decisionRows.filter(row => isPass(row["판정"])).length, decisionRows.length)
  };
}

function getKpiSummary() {
  const readyRows = qualityPortalData.readyMix.rows;
  const strengthRows = qualityPortalData.compressive.rows;
  const requestedRows = qualityPortalData.requestTest.rows;
  const ncrRows = qualityPortalData.nonconformity.rows;
  const requestedDecisionRows = requestedRows.filter(row => isDecisionValue(row["판정"]));
  const completedNcr = ncrRows.filter(row => row["상태"] === "완료").length;
  const arch = getMaterialKpi("materialArch");
  const civil = getMaterialKpi("materialCivil");
  const landscape = getMaterialKpi("materialLandscape");

  return {
    readyMixCount: readyRows.length,
    totalReadyMixVolume: Math.round(sumReadyMixVolume()),
    materialApprovalCount: arch.approvalCount + civil.approvalCount + landscape.approvalCount,
    requestedFitRate: rate(requestedDecisionRows.filter(row => isPass(row["판정"])).length, requestedDecisionRows.length),
    ncrCount: ncrRows.length,
    completedNcr,
    openNcr: ncrRows.length - completedNcr,
    completionRate: rate(completedNcr, ncrRows.length),
    qualityGoodDays: 0,
    requestedCount: requestedRows.length,
    strengthTestCount: strengthRows.length,
    totalStatusCount: readyRows.length + requestedRows.length + strengthRows.length + ncrRows.length
  };
}

function getPrimaryMetric(pageKey) {
  const rows = qualityPortalData[pageKey]?.rows || [];
  if (pageKey === "dashboard") return ["KPI", "0"];
  if (pageKey === "readyMix") return ["총 타설건수", `${rows.length}건`];
  if (["materialArch", "materialCivil", "materialLandscape"].includes(pageKey)) {
    return ["승인건수", `${getMaterialKpi(pageKey).approvalCount}건`];
  }
  if (pageKey === "compressive") return ["시험건수", `${rows.length}건`];
  if (pageKey === "requestTest") return ["의뢰건수", `${rows.length}건`];
  return ["발생건수", `${rows.length}건`];
}

function kpiCardItems() {
  const kpi = getKpiSummary();
  return [
    ["자재승인 건수", `${kpi.materialApprovalCount}건`, "건축·토목·조경 승인 누계", "#E60012"],
    ["의뢰시험 적합률", `${kpi.requestedFitRate}%`, "의뢰시험 판정 기준", "#102A54"],
    ["품질부적합 발생건수", `${kpi.ncrCount}건`, "품질부적합사항 누계", "#E60012"],
    ["조치완료율", `${kpi.completionRate}%`, "부적합 조치 완료 기준", "#0B7A47"],
    ["품질 우수관리 일수", `${kpi.qualityGoodDays}일`, "착공 전 기준값", "#102A54"]
  ];
}

function renderKpiCards(targetId) {
  document.getElementById(targetId).innerHTML = kpiCardItems().map(([label, value, note, accent]) => `
    <article class="kpi-card" style="--accent:${accent}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `).join("");
}

function renderHomeKpis() {
  const kpi = getKpiSummary();
  renderKpiCards("mainKpis");
  const heroMetrics = document.getElementById("heroMetrics");
  if (heroMetrics) {
    heroMetrics.innerHTML = `
      <div><span>자재승인</span><strong>${kpi.materialApprovalCount}</strong></div>
      <div><span>의뢰시험 적합률</span><strong>${kpi.requestedFitRate}%</strong></div>
      <div><span>부적합</span><strong>${kpi.ncrCount}</strong></div>
      <div><span>조치완료율</span><strong>${kpi.completionRate}%</strong></div>
    `;
  }
}

function renderMenus() {
  document.getElementById("menuCards").innerHTML = menuItems.map(([id, number, title, desc]) => {
    const [metricLabel, metricValue] = getPrimaryMetric(id);
    return `
      <a class="menu-card" href="#${id}" data-target="${id}">
        <b>${number}</b>
        <strong>${title}</strong>
        <span class="card-icon">${iconSvg(id)}</span>
        <em><i>${metricLabel}</i><mark>${metricValue}</mark></em>
        <small>착공 전 현장으로 등록된 데이터 없음</small>
      </a>
    `;
  }).join("");
}

function renderNavIcons() {
  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.querySelector(".nav-icon")) return;
    const target = link.dataset.target || "home";
    const wrapper = document.createElement("span");
    wrapper.className = "nav-icon";
    wrapper.innerHTML = iconSvg(target);
    link.prepend(wrapper);
  });
}

function renderTodayRows() {
  document.getElementById("todayRows").innerHTML = `
    <tr>
      <td colspan="4" class="empty-cell">착공 전 현장으로 등록된 품질 데이터가 없습니다.</td>
    </tr>
  `;
}

function getSummaryItems(pageKey, rows) {
  if (pageKey === "readyMix") {
    const status = countBy(rows, "상태");
    return [
      ["총 타설건수", `${rows.length}건`],
      ["총 타설량", `${Math.round(sumReadyMixVolume())}m³`],
      ["완료", `${status["완료"] || 0}건`],
      ["진행/지연", `${(status["진행중"] || 0) + (status["지연"] || 0)}건`]
    ];
  }
  if (["materialArch", "materialCivil", "materialLandscape"].includes(pageKey)) {
    const materialKpi = getMaterialKpi(pageKey);
    return [
      ["승인건수", `${materialKpi.approvalCount}건`],
      ["승인대기건수", `${materialKpi.pendingCount}건`],
      ["적합률", `${materialKpi.fitRate}%`],
      ["등록 자재", `${rows.length}건`]
    ];
  }
  if (pageKey === "compressive") {
    const decisionRows = rows.filter(row => isDecisionValue(row["판정"]));
    return [
      ["시험건수", `${rows.length}건`],
      ["7일 시험건수", `${rows.filter(row => String(row["재령"]).includes("7")).length}건`],
      ["28일 시험건수", `${rows.filter(row => String(row["재령"]).includes("28")).length}건`],
      ["적합률", `${rate(decisionRows.filter(row => isPass(row["판정"])).length, decisionRows.length)}%`]
    ];
  }
  if (pageKey === "requestTest") {
    const status = countBy(rows, "진행상태");
    const decisionRows = rows.filter(row => isDecisionValue(row["판정"]));
    return [
      ["의뢰건수", `${rows.length}건`],
      ["진행중 건수", `${status["진행중"] || 0}건`],
      ["완료", `${status["완료"] || 0}건`],
      ["적합률", `${rate(decisionRows.filter(row => isPass(row["판정"])).length, decisionRows.length)}%`]
    ];
  }
  const ncrStatus = countBy(rows, "상태");
  const completed = ncrStatus["완료"] || 0;
  return [
    ["발생건수", `${rows.length}건`],
    ["조치완료건수", `${completed}건`],
    ["미조치건수", `${rows.length - completed}건`],
    ["조치완료율", `${rate(completed, rows.length)}%`]
  ];
}

function renderStatusPages() {
  document.querySelectorAll(".status-page").forEach(container => {
    const pageKey = container.dataset.page;
    const data = qualityPortalData[pageKey];
    const statusOptions = [...new Set(data.rows.flatMap(row => {
      return ["상태", "판정", "승인상태", "진행상태"].map(key => row[key]).filter(Boolean);
    }))];
    const summary = getSummaryItems(pageKey, data.rows);

    container.innerHTML = `
      <div class="page-head">
        <div class="number-heading">
          <b>${pageNumbers[pageKey]}</b>
          <div>
            <p class="eyebrow">${data.eyebrow}</p>
            <h2>${data.title}</h2>
            <p class="page-desc">${data.description}</p>
          </div>
        </div>
        <div class="upload-panel">
          <label class="scan-upload">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" data-upload-page="${pageKey}">
            <span>스캔본 업로드</span>
          </label>
          <p>스캔본 업로드 후 관리자 검토 또는 OCR 연동을 통해 현황에 반영됩니다.</p>
        </div>
      </div>
      <div class="summary-grid">
        ${summary.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("")}
      </div>
      <div class="table-toolbar">
        <label class="search-field">검색
          <input type="search" placeholder="키워드 입력" data-search-page="${pageKey}">
        </label>
        <label class="filter-field">상태 필터
          <select data-filter-page="${pageKey}">
            <option value="">전체</option>
            ${statusOptions.map(option => `<option value="${option}">${option}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>${data.columns.map(column => `<th>${column}</th>`).join("")}</tr>
          </thead>
          <tbody data-table-body="${pageKey}"></tbody>
        </table>
      </div>
    `;
    updateStatusTable(pageKey);
  });
}

function updateStatusTable(pageKey) {
  const data = qualityPortalData[pageKey];
  const searchValue = document.querySelector(`[data-search-page="${pageKey}"]`)?.value.trim().toLowerCase() || "";
  const filterValue = document.querySelector(`[data-filter-page="${pageKey}"]`)?.value || "";
  const filteredRows = data.rows.filter(row => {
    const rowText = Object.values(row).join(" ").toLowerCase();
    const statusText = [row["상태"], row["판정"], row["승인상태"], row["진행상태"]].filter(Boolean);
    return (!searchValue || rowText.includes(searchValue)) && (!filterValue || statusText.includes(filterValue));
  });
  const body = document.querySelector(`[data-table-body="${pageKey}"]`);
  body.innerHTML = filteredRows.map(row => `
    <tr>
      ${data.columns.map(column => `<td>${isBadgeColumn(column) ? renderBadge(row[column]) : (row[column] || "-")}</td>`).join("")}
    </tr>
  `).join("") || `<tr><td colspan="${data.columns.length}" class="empty-cell">착공 전 현장으로 등록된 품질 데이터가 없습니다.</td></tr>`;
}

function handleScannedFileUpload(event) {
  const file = event.target.files?.[0];
  const pageKey = event.target.dataset.uploadPage;
  if (!file) return;
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  const extensionAllowed = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
  if (!allowed.includes(file.type) && !extensionAllowed) {
    showToast("PDF, JPG, PNG 파일만 업로드할 수 있습니다.");
    event.target.value = "";
    return;
  }
  parseDocumentByOCR(file, pageKey);
  showToast("스캔본 업로드 후 관리자 검토 또는 OCR 연동을 통해 현황에 반영됩니다.");
}

function parseDocumentByOCR(file, pageKey) {
  return {
    pageKey,
    fileName: file.name,
    status: "pending-review",
    nextStep: "Google Drive, OCR API, Apps Script 연동 시 이 함수에서 문서 인식 결과를 반환합니다."
  };
}

function renderDashboard() {
  renderKpiCards("dashboardKpis");
  renderRankList("tradeNcrRank", countBy(qualityPortalData.nonconformity.rows, "공종"));
  renderRankList("makerReadyMixRank", countBy(qualityPortalData.readyMix.rows, "제조사"));
  if (document.getElementById("dashboard").classList.contains("active")) {
    drawDashboardCharts();
  }
}

function renderRankList(targetId, dataMap) {
  const entries = Object.entries(dataMap);
  if (!entries.length) {
    document.getElementById(targetId).innerHTML = `
      <div class="rank-row">
        <span>데이터 없음</span>
        <div class="rank-bar"><span style="width:0%"></span></div>
        <strong>0</strong>
      </div>
    `;
    return;
  }
  const max = Math.max(...Object.values(dataMap), 1);
  document.getElementById(targetId).innerHTML = entries.map(([label, value]) => `
    <div class="rank-row">
      <span>${label}</span>
      <div class="rank-bar"><span style="width:${Math.max(8, (value / max) * 100)}%"></span></div>
      <strong>${value}</strong>
    </div>
  `).join("");
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas.getBoundingClientRect();
  if (width < 40 || height < 40) return { ctx, width, height, drawable: false };
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height, drawable: true };
}

function drawBarChart(canvasId, labels, values, color = "#102A54") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height, drawable } = setupCanvas(canvas);
  if (!drawable) return;
  const pad = 34;
  const max = Math.max(...values, 1) * 1.2;
  const barGap = 14;
  const barWidth = (width - pad * 2 - barGap * (values.length - 1)) / values.length;
  ctx.strokeStyle = "#D9DDE3";
  for (let i = 0; i < 4; i++) {
    const y = pad + i * ((height - pad * 2) / 3);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }
  values.forEach((value, index) => {
    const x = pad + index * (barWidth + barGap);
    const barHeight = (height - pad * 2) * (value / max);
    const y = height - pad - barHeight;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(12, barWidth), barHeight);
    ctx.fillStyle = "#667085";
    ctx.font = "12px Noto Sans KR";
    ctx.textAlign = "center";
    ctx.fillText(labels[index], x + barWidth / 2, height - 10);
    ctx.fillStyle = "#0B1F3A";
    ctx.font = "800 12px Noto Sans KR";
    ctx.fillText(value, x + barWidth / 2, y - 8);
  });
}

function drawDonutChart(canvasId, percent) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height, drawable } = setupCanvas(canvas);
  if (!drawable) return;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 30;
  ctx.lineWidth = 28;
  ctx.strokeStyle = "#D9DDE3";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#E60012";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (percent / 100));
  ctx.stroke();
  ctx.fillStyle = "#0B1F3A";
  ctx.font = "900 34px Noto Sans KR";
  ctx.textAlign = "center";
  ctx.fillText(`${percent}%`, cx, cy + 5);
  ctx.fillStyle = "#667085";
  ctx.font = "700 13px Noto Sans KR";
  ctx.fillText("의뢰시험 적합률", cx, cy + 30);
}

function drawDashboardCharts() {
  const kpi = getKpiSummary();
  drawBarChart("monthlyChart", ["1월", "2월", "3월", "4월", "5월", "6월"], [0, 0, 0, 0, 0, 0], "#102A54");
  drawDonutChart("passRateChart", kpi.requestedFitRate);
  drawBarChart("approvalChart", ["승인", "진행", "지연", "보완"], [0, 0, 0, 0], "#E60012");
}

function showView(id) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.target === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "dashboard") setTimeout(renderDashboard, 80);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3600);
}

function setupEvents() {
  document.querySelectorAll("[data-target]").forEach(trigger => {
    trigger.addEventListener("click", event => {
      const target = trigger.dataset.target;
      if (location.hash.slice(1) === target) {
        event.preventDefault();
        showView(target);
      }
    });
  });
  document.addEventListener("click", event => {
    if (event.target.closest("[data-action='refreshDashboard']")) {
      renderDashboard();
      showToast("data.js 현황 데이터를 기준으로 KPI를 다시 집계했습니다.");
    }
  });
  document.addEventListener("input", event => {
    const searchPage = event.target.dataset.searchPage;
    const filterPage = event.target.dataset.filterPage;
    if (searchPage) updateStatusTable(searchPage);
    if (filterPage) updateStatusTable(filterPage);
  });
  document.addEventListener("change", event => {
    if (event.target.dataset.uploadPage) handleScannedFileUpload(event);
  });
  document.querySelector(".menu-toggle").addEventListener("click", () => {
    document.querySelector(".top-nav").classList.toggle("open");
  });
  document.querySelector(".menu-close")?.addEventListener("click", () => {
    document.querySelector(".top-nav").classList.remove("open");
  });
  window.addEventListener("resize", () => {
    if (document.getElementById("dashboard").classList.contains("active")) renderDashboard();
  });
  window.addEventListener("hashchange", () => {
    const target = location.hash.slice(1) || "home";
    if (document.getElementById(target)) showView(target);
  });
}

function init() {
  renderNavIcons();
  renderHomeKpis();
  renderMenus();
  renderTodayRows();
  renderStatusPages();
  renderDashboard();
  setupEvents();
  if (window.innerWidth < 980) {
    document.querySelector(".top-nav").classList.remove("open");
  }
  const initialTarget = location.hash.slice(1) || "home";
  if (document.getElementById(initialTarget)) showView(initialTarget);
  window.showQualityPortalView = showView;
  window.__qualityPortalReady = true;
}

document.addEventListener("DOMContentLoaded", init);
