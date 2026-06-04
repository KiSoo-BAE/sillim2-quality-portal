const mobilePortalConfig = {
  version: "20260604-mobile-dashboard1",
  projectName: "신림2재정비촉진구역 주택재개발정비사업",
  storageKey: "sillim2MobileQualityPortalEntries",
  futureSync: {
    source: "mobile.html",
    target: "Google Sheets / Apps Script / OCR API",
    note: "모바일 입력 데이터는 향후 PC 현황판 및 KPI 대시보드와 연동할 수 있도록 독립 구조로 저장합니다."
  }
};

const mobileDashboardCards = [
  { no: "01", id: "readyMix", title: "레미콘 타설현황", icon: "truck" },
  { no: "02", id: "materialArch", title: "자재공급원승인(건축)", icon: "clipboard" },
  { no: "03", id: "materialCivil", title: "자재공급원승인(토목)", icon: "rebar" },
  { no: "04", id: "materialLandscape", title: "자재공급원승인(조경)", icon: "leaf" },
  { no: "05", id: "compressive", title: "콘크리트 압축강도", icon: "cube" },
  { no: "06", id: "requestTest", title: "의뢰시험현황", icon: "flask" },
  { no: "07", id: "nonconformity", title: "품질부적합사항", icon: "shield" },
  { no: "08", id: "dashboard", title: "KPI 대시보드", icon: "chart" }
];

const mobileKpiCards = [
  { title: "자재승인 건수", value: 0, unit: "건", foot: "누계 / 목표 0 / 0건" },
  { title: "의뢰시험 적합률", value: 0, unit: "%", foot: "누계 / 목표 0% / 0%" },
  { title: "품질부적합 발생건수", value: 0, unit: "건", foot: "누계 / 목표 0 / 0건" },
  { title: "조치완료율", value: 0, unit: "%", foot: "누계 / 목표 0% / 0%" },
  { title: "품질 우수관리 일수", value: 0, unit: "일", foot: "누계 / 목표 0 / 0일" }
];

const mobileSorCards = [
  { title: "전체 SOR", value: 0, unit: "건", foot: "착공 전 등록 없음" },
  { title: "미실시", value: 0, unit: "건", foot: "미실시 항목 없음" },
  { title: "진행중", value: 0, unit: "건", foot: "진행중 항목 없음" },
  { title: "완료", value: 0, unit: "건", foot: "완료 항목 없음" },
  { title: "Due Date 임박", value: 0, unit: "건", foot: "임박 항목 없음", warning: true }
];

const mobileInputTypes = {
  photo: { no: "01", label: "사진 등록", syncTarget: "sitePhotos" },
  qualityIssue: { no: "02", label: "품질 지적사항 등록", syncTarget: "nonconformity" },
  sor: { no: "03", label: "SOR 현황 등록", syncTarget: "sorStatus" },
  testStatus: { no: "04", label: "시험 현황 등록", syncTarget: "requestTest" },
  notice: { no: "05", label: "공지사항 등록", syncTarget: "notice" },
  completionPhoto: { no: "06", label: "완료 사진 업로드", syncTarget: "completionPhotos" }
};

let selectedEntryType = "photo";

function iconSvg(name) {
  const icons = {
    truck: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 24h28v20H11z"/><path d="M39 31h8l6 7v6H39z"/><path d="M18 47a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M47 47a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M15 19h19"/></svg>`,
    clipboard: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 14h24v8H20z"/><path d="M16 18h-3v36h38V18h-3"/><path d="m24 37 6 6 13-15"/></svg>`,
    rebar: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 45 45 15"/><path d="M23 49 53 19"/><path d="M13 31 31 13"/><path d="M33 51 51 33"/><path d="M20 40h-7"/><path d="M30 30h-7"/><path d="M40 20h-7"/></svg>`,
    leaf: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 53V30"/><path d="M32 30c-12 0-19-8-19-20 13 1 21 8 21 20"/><path d="M32 35c10-1 17-8 18-19-12 1-19 8-18 19"/><path d="M21 24c5 2 9 5 11 10"/></svg>`,
    cube: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m32 9 22 12v24L32 57 10 45V21z"/><path d="m10 21 22 12 22-12"/><path d="M32 33v24"/><path d="m21 15 22 12"/></svg>`,
    flask: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M25 10h14"/><path d="M29 10v18L17 51c-2 4 1 7 5 7h20c4 0 7-3 5-7L35 28V10"/><path d="M24 43h16"/></svg>`,
    shield: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 8 51 16v14c0 13-8 23-19 28-11-5-19-15-19-28V16z"/><path d="M32 22v15"/><path d="M32 45h.1"/></svg>`,
    chart: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 52h40"/><path d="M18 52V36h8v16"/><path d="M31 52V25h8v27"/><path d="M44 52V14h8v38"/></svg>`
  };
  return icons[name] || icons.chart;
}

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(mobilePortalConfig.storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  localStorage.setItem(mobilePortalConfig.storageKey, JSON.stringify(entries));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderDashboardCards() {
  const target = document.getElementById("mobileDashboardCards");
  target.innerHTML = mobileDashboardCards.map(card => `
    <article class="mobile-dashboard-card">
      <span class="number-badge">${card.no}</span>
      <h3>${card.title}</h3>
      <div class="card-icon">${iconSvg(card.icon)}</div>
      <div class="card-divider"></div>
      <div class="card-note">등록된 데이터 없음</div>
      <div class="card-value"><strong>0</strong>건</div>
    </article>
  `).join("");
}

function renderKpiCards() {
  const target = document.getElementById("mobileKpiCards");
  target.innerHTML = mobileKpiCards.map(card => `
    <article class="mobile-kpi-card">
      <h3>${card.title}</h3>
      <div class="kpi-value"><strong>${card.value}</strong>${card.unit}</div>
      <div class="kpi-foot">${card.foot}</div>
    </article>
  `).join("");
}

function renderSorCards() {
  const target = document.getElementById("mobileSorCards");
  target.innerHTML = mobileSorCards.map(card => `
    <article class="mobile-sor-card${card.warning ? " warning" : ""}">
      <h3>${card.title}</h3>
      <div class="sor-value"><strong>${card.value}</strong>${card.unit}</div>
      <div class="sor-foot">${card.foot}</div>
    </article>
  `).join("");
}

function statusClass(status) {
  if (status === "완료") return "done";
  if (status === "미조치") return "bad";
  if (status === "진행중") return "open";
  return "";
}

function renderStatusList() {
  const target = document.getElementById("mobileStatusList");
  const entries = readEntries().slice().reverse();

  if (!entries.length) {
    target.innerHTML = `
      <article class="status-empty">
        <div class="status-thumb">PHOTO</div>
        <strong>등록된 현장 데이터가 없습니다.</strong>
        <p>사진등록 탭에서 저장한 항목이 이곳에 최근 현황으로 표시됩니다.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = entries.map(entry => `
    <article class="status-item">
      <div class="status-thumb">${entry.photo ? escapeHtml(entry.photo.name) : "사진 없음"}</div>
      <div class="status-body">
        <h3>${escapeHtml(entry.title || "제목 없음")}</h3>
        <div class="status-meta">
          <span>위치: ${escapeHtml(entry.location || "미입력")}</span>
          <span>공종: ${escapeHtml(entry.trade || "미입력")}</span>
          <span>등록일: ${escapeHtml(entry.date || entry.createdAt.slice(0, 10))}</span>
        </div>
        <span class="status-badge ${statusClass(entry.status)}">${escapeHtml(entry.status || "등록")}</span>
      </div>
    </article>
  `).join("");
}

function makeEntry(formData) {
  const typeInfo = mobileInputTypes[selectedEntryType];
  const photo = formData.get("photo");
  return {
    id: `mobile-${Date.now()}`,
    schemaVersion: mobilePortalConfig.version,
    entryType: selectedEntryType,
    entryTypeLabel: typeInfo.label,
    syncTarget: typeInfo.syncTarget,
    title: String(formData.get("title") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    trade: String(formData.get("trade") || "").trim(),
    date: String(formData.get("date") || ""),
    status: String(formData.get("status") || "등록"),
    note: String(formData.get("note") || "").trim(),
    photo: photo && photo.name ? {
      name: photo.name,
      type: photo.type,
      size: photo.size,
      pendingUpload: true
    } : null,
    createdAt: new Date().toISOString(),
    source: "mobile.html"
  };
}

function setEntryType(type) {
  selectedEntryType = type;
  const typeInfo = mobileInputTypes[type];
  document.getElementById("selectedTypeNo").textContent = typeInfo.no;
  document.getElementById("selectedTypeTitle").textContent = typeInfo.label;
  document.querySelectorAll(".action-button").forEach(button => {
    button.classList.toggle("active", button.dataset.entryType === type);
  });
}

function setTab(tab) {
  document.querySelectorAll(".tab-view").forEach(view => {
    view.classList.toggle("active", view.id === `tab-${tab}`);
  });
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  if (tab === "status") renderStatusList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = document.getElementById("mobileToast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function setDefaultDate() {
  const dateInput = document.querySelector("input[name='date']");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

function setupMobilePortal() {
  renderDashboardCards();
  renderKpiCards();
  renderSorCards();
  renderStatusList();
  setDefaultDate();
  setEntryType(selectedEntryType);

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  document.querySelectorAll(".action-button").forEach(button => {
    button.addEventListener("click", () => setEntryType(button.dataset.entryType));
  });

  document.getElementById("mobileInputForm").addEventListener("submit", event => {
    event.preventDefault();
    const entry = makeEntry(new FormData(event.currentTarget));
    const entries = readEntries();
    entries.push(entry);
    writeEntries(entries);
    renderStatusList();
    event.currentTarget.reset();
    setDefaultDate();
    setTab("status");
    showToast("모바일 현장 데이터가 임시 저장되었습니다.");
  });
}

window.mobileQualityPortalStore = {
  config: mobilePortalConfig,
  dashboardCards: mobileDashboardCards,
  kpiCards: mobileKpiCards,
  sorCards: mobileSorCards,
  inputTypes: mobileInputTypes,
  readEntries,
  writeEntries
};

document.addEventListener("DOMContentLoaded", setupMobilePortal);
