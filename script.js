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
  ["readyMix", "①", "레미콘 타설현황", "타설 위치, 설계강도, 제조사와 상태 조회"],
  ["materialArch", "②", "자재공급원승인(건축)", "건축 자재 규격, 승인상태와 판정 확인"],
  ["materialCivil", "③", "자재공급원승인(토목)", "토목 자재 공급원 승인 현황 조회"],
  ["materialLandscape", "④", "자재공급원승인(조경)", "조경 자재 샘플 및 승인 현황 조회"],
  ["compressive", "⑤", "콘크리트압축강도현황", "재령별 강도 시험결과와 판정 확인"],
  ["requestTest", "⑥", "의뢰시험현황", "외부 의뢰시험 진행상태와 판정 추적"],
  ["nonconformity", "⑦", "품질부적합사항", "부적합 발생 및 조치상태 추적"],
  ["dashboard", "⑧", "KPI 대시보드", "1~7번 현황 데이터 자동 종합 집계"]
];

const badgeMap = {
  "완료": "pass",
  "합격": "pass",
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

function getBadgeClass(value) {
  return badgeMap[value] || "";
}

function isBadgeColumn(column) {
  return ["상태", "판정", "승인상태", "진행상태"].includes(column);
}

function renderBadge(value) {
  const className = getBadgeClass(value);
  if (!className) return value;
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

function getKpiSummary() {
  const materialRows = [
    ...qualityPortalData.materialArch.rows,
    ...qualityPortalData.materialCivil.rows,
    ...qualityPortalData.materialLandscape.rows
  ];
  const strengthRows = qualityPortalData.compressive.rows;
  const requestedRows = qualityPortalData.requestTest.rows;
  const ncrRows = qualityPortalData.nonconformity.rows;
  const passCount = [
    ...strengthRows.map(row => row["판정"]),
    ...requestedRows.map(row => row["판정"])
  ].filter(value => value === "합격").length;
  const testDecisionCount = [
    ...strengthRows.map(row => row["판정"]),
    ...requestedRows.map(row => row["판정"])
  ].filter(value => value !== "대기" && value !== "진행중").length;
  const completedNcr = ncrRows.filter(row => row["상태"] === "완료").length;
  const openNcr = ncrRows.filter(row => row["상태"] !== "완료").length;

  return {
    readyMixCount: qualityPortalData.readyMix.rows.length,
    materialApprovalCount: materialRows.filter(row => row["승인상태"] === "완료").length,
    strengthTestCount: strengthRows.length,
    requestedInProgressCount: requestedRows.filter(row => row["진행상태"] !== "완료").length,
    ncrCount: ncrRows.length,
    completionRate: ncrRows.length ? Math.round((completedNcr / ncrRows.length) * 100) : 0,
    passRate: testDecisionCount ? Math.round((passCount / testDecisionCount) * 1000) / 10 : 0,
    openNcr,
    totalReadyMixVolume: Math.round(sumReadyMixVolume())
  };
}

function renderHomeKpis() {
  const kpi = getKpiSummary();
  const items = [
    ["레미콘 타설건수", `${kpi.readyMixCount}건`, `누적 ${kpi.totalReadyMixVolume}m³`, "#d71920"],
    ["자재공급원 승인건수", `${kpi.materialApprovalCount}건`, "건축·토목·조경 종합", "#102b55"],
    ["압축강도 시험건수", `${kpi.strengthTestCount}건`, "7일·28일 시험 포함", "#2563eb"],
    ["의뢰시험 진행건수", `${kpi.requestedInProgressCount}건`, "외부기관 진행 추적", "#2563eb"],
    ["품질부적합 발생건수", `${kpi.ncrCount}건`, `미조치 ${kpi.openNcr}건`, "#f79009"],
    ["조치완료율", `${kpi.completionRate}%`, "부적합 조치 기준", "#039855"]
  ];
  document.getElementById("mainKpis").innerHTML = items.map(([label, value, trend, accent]) => `
    <article class="kpi-card" style="--accent:${accent}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${trend}</small>
    </article>
  `).join("");
  document.getElementById("heroMetrics").innerHTML = `
    <div><span>타설건수</span><strong>${kpi.readyMixCount}</strong></div>
    <div><span>승인건수</span><strong>${kpi.materialApprovalCount}</strong></div>
    <div><span>시험합격률</span><strong>${kpi.passRate}%</strong></div>
    <div><span>미조치</span><strong>${kpi.openNcr}</strong></div>
  `;
}

function renderMenus() {
  document.getElementById("menuCards").innerHTML = menuItems.map(([id, number, title, desc]) => `
    <a class="menu-card" href="#${id}" data-target="${id}">
      <b>${number}</b>
      <strong>${title}</strong>
      <span>${desc}</span>
    </a>
  `).join("");
}

function renderTodayRows() {
  const rows = [
    ["레미콘", "101동 B2F 기초 매트", qualityPortalData.readyMix.rows[0]["상태"], "타설관리"],
    ["압축강도", "104동 B2F 기둥", "완료", "부적합"],
    ["의뢰시험", "방수재 성능시험", "지연", "대기"],
    ["부적합", "102동 1F 압축강도 재확인", "미조치", "부적합"]
  ];
  document.getElementById("todayRows").innerHTML = rows.map(row => `
    <tr>
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${renderBadge(row[2])}</td>
      <td>${renderBadge(row[3])}</td>
    </tr>
  `).join("");
}

function getSummaryItems(pageKey, rows) {
  if (pageKey === "readyMix") {
    const status = countBy(rows, "상태");
    return [
      ["총 타설건수", `${rows.length}건`],
      ["타설량", `${Math.round(sumReadyMixVolume())}m³`],
      ["완료", `${status["완료"] || 0}건`],
      ["진행/지연", `${(status["진행중"] || 0) + (status["지연"] || 0)}건`]
    ];
  }
  if (["materialArch", "materialCivil", "materialLandscape"].includes(pageKey)) {
    const approval = countBy(rows, "승인상태");
    return [
      ["등록 자재", `${rows.length}건`],
      ["승인 완료", `${approval["완료"] || 0}건`],
      ["검토중", `${approval["진행중"] || 0}건`],
      ["보완/지연", `${approval["지연"] || 0}건`]
    ];
  }
  if (pageKey === "compressive") {
    const decision = countBy(rows, "판정");
    return [
      ["시험건수", `${rows.length}건`],
      ["합격", `${decision["합격"] || 0}건`],
      ["진행중", `${decision["진행중"] || 0}건`],
      ["부적합", `${decision["부적합"] || 0}건`]
    ];
  }
  if (pageKey === "requestTest") {
    const status = countBy(rows, "진행상태");
    return [
      ["의뢰건수", `${rows.length}건`],
      ["완료", `${status["완료"] || 0}건`],
      ["진행중", `${status["진행중"] || 0}건`],
      ["지연", `${status["지연"] || 0}건`]
    ];
  }
  const ncrStatus = countBy(rows, "상태");
  return [
    ["발생건수", `${rows.length}건`],
    ["조치완료", `${ncrStatus["완료"] || 0}건`],
    ["진행중", `${ncrStatus["진행중"] || 0}건`],
    ["미조치/지연", `${(ncrStatus["미조치"] || 0) + (ncrStatus["지연"] || 0)}건`]
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
        <div>
          <p class="eyebrow">${data.eyebrow}</p>
          <h2>${data.title}</h2>
          <p class="page-desc">${data.description}</p>
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
      ${data.columns.map(column => `<td>${isBadgeColumn(column) ? renderBadge(row[column]) : row[column]}</td>`).join("")}
    </tr>
  `).join("") || `<tr><td colspan="${data.columns.length}" class="empty-cell">조회 결과가 없습니다.</td></tr>`;
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
  const kpi = getKpiSummary();
  const dashboardItems = [
    ["레미콘 타설건수", `${kpi.readyMixCount}건`, "#d71920"],
    ["자재공급원 승인건수", `${kpi.materialApprovalCount}건`, "#102b55"],
    ["압축강도 시험건수", `${kpi.strengthTestCount}건`, "#2563eb"],
    ["의뢰시험 진행건수", `${kpi.requestedInProgressCount}건`, "#2563eb"],
    ["품질부적합 발생건수", `${kpi.ncrCount}건`, "#f79009"],
    ["조치완료율", `${kpi.completionRate}%`, "#039855"],
    ["시험합격률", `${kpi.passRate}%`, "#039855"],
    ["미조치 건수", `${kpi.openNcr}건`, "#d71920"]
  ];
  document.getElementById("dashboardKpis").innerHTML = dashboardItems.map(([label, value, accent]) => `
    <article class="kpi-card" style="--accent:${accent}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>data.js 기반 자동 집계</small>
    </article>
  `).join("");
  renderRankList("tradeNcrRank", countBy(qualityPortalData.nonconformity.rows, "공종"));
  renderRankList("makerReadyMixRank", countBy(qualityPortalData.readyMix.rows, "제조사"));
  if (document.getElementById("dashboard").classList.contains("active")) {
    drawDashboardCharts();
  }
}

function renderRankList(targetId, dataMap) {
  const max = Math.max(...Object.values(dataMap), 1);
  document.getElementById(targetId).innerHTML = Object.entries(dataMap).map(([label, value]) => `
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

function drawBarChart(canvasId, labels, values, color = "#102b55") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const { ctx, width, height, drawable } = setupCanvas(canvas);
  if (!drawable) return;
  const pad = 34;
  const max = Math.max(...values, 1) * 1.2;
  const barGap = 14;
  const barWidth = (width - pad * 2 - barGap * (values.length - 1)) / values.length;
  ctx.strokeStyle = "#dbe3ef";
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
    ctx.fillStyle = "#071b3a";
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
  ctx.strokeStyle = "#dbe3ef";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#039855";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (percent / 100));
  ctx.stroke();
  ctx.fillStyle = "#071b3a";
  ctx.font = "900 34px Noto Sans KR";
  ctx.textAlign = "center";
  ctx.fillText(`${percent}%`, cx, cy + 5);
  ctx.fillStyle = "#667085";
  ctx.font = "700 13px Noto Sans KR";
  ctx.fillText("시험합격률", cx, cy + 30);
}

function drawDashboardCharts() {
  const kpi = getKpiSummary();
  drawBarChart("monthlyChart", ["1월", "2월", "3월", "4월", "5월", "6월"], [31, 45, 52, 61, 74, qualityPortalData.compressive.rows.length + qualityPortalData.requestTest.rows.length + qualityPortalData.readyMix.rows.length], "#102b55");
  drawDonutChart("passRateChart", kpi.passRate);
  const approvalRows = [
    ...qualityPortalData.materialArch.rows,
    ...qualityPortalData.materialCivil.rows,
    ...qualityPortalData.materialLandscape.rows
  ];
  const approvalMap = countBy(approvalRows, "승인상태");
  drawBarChart("approvalChart", Object.keys(approvalMap), Object.values(approvalMap), "#d71920");
}

function showView(id) {
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === id));
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.target === id));
  document.querySelector(".sidebar").classList.remove("open");
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
    document.querySelector(".sidebar").classList.toggle("open");
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
  renderHomeKpis();
  renderMenus();
  renderTodayRows();
  renderStatusPages();
  renderDashboard();
  setupEvents();
  const initialTarget = location.hash.slice(1) || "home";
  if (document.getElementById(initialTarget)) showView(initialTarget);
  window.showQualityPortalView = showView;
  window.__qualityPortalReady = true;
}

document.addEventListener("DOMContentLoaded", init);
