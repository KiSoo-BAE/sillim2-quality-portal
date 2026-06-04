const mobilePortalConfig = {
  version: "20260604-ocr1",
  projectName: "신림2재정비촉진구역 주택재개발정비사업",
  storageKey: "sillim2MobileOcrPhotoRegisterData",
  futureSync: {
    source: "mobile.html",
    target: "Tesseract.js / Google Sheets / Apps Script / OCR API",
    note: "OCR 결과는 사용자가 확인 및 수정한 뒤 저장 버튼을 눌렀을 때만 사진등록 데이터에 포함합니다."
  }
};

const compressionStrengthData = [];
const materialApprovalData = [];
let photoRegisterData = [];

const mobileDashboardCards = [
  { no: "01", id: "compressive", title: "콘크리트 압축강도", icon: "cube" },
  { no: "02", id: "materialApproval", title: "자재공급원 승인", icon: "clipboard" },
  { no: "03", id: "readyMix", title: "레미콘 타설현황", icon: "truck" },
  { no: "04", id: "requestTest", title: "의뢰시험현황", icon: "flask" },
  { no: "05", id: "materialArch", title: "자재승인(건축)", icon: "building" },
  { no: "06", id: "materialCivil", title: "자재승인(토목)", icon: "rebar" },
  { no: "07", id: "materialLandscape", title: "자재승인(조경)", icon: "leaf" },
  { no: "08", id: "photoRegister", title: "사진등록 현황", icon: "camera" }
];

const compressionSummary = [
  { title: "오늘 시험 예정", value: 0, unit: "건", foot: "착공 전 등록 없음" },
  { title: "7일 강도", value: 0, unit: "건", foot: "7일 재령 시험 없음" },
  { title: "28일 강도", value: 0, unit: "건", foot: "28일 재령 시험 없음" },
  { title: "미시험", value: 0, unit: "건", foot: "미시험 항목 없음" },
  { title: "결과 대기", value: 0, unit: "건", foot: "결과 대기 없음" },
  { title: "불합격/재시험", value: 0, unit: "건", foot: "재시험 항목 없음", bad: true }
];

const materialSummary = [
  { title: "승인 요청", value: 0, unit: "건", foot: "요청 항목 없음" },
  { title: "검토중", value: 0, unit: "건", foot: "검토중 항목 없음" },
  { title: "승인완료", value: 0, unit: "건", foot: "승인완료 없음" },
  { title: "보완요청", value: 0, unit: "건", foot: "보완요청 없음" },
  { title: "반려", value: 0, unit: "건", foot: "반려 항목 없음", bad: true },
  { title: "기한임박", value: 0, unit: "건", foot: "기한임박 없음", warning: true }
];

const mobileInputTypes = {
  specimenPhoto: { no: "01", label: "공시체 사진", syncTarget: "compressionStrengthData" },
  compressionTestPhoto: { no: "02", label: "압축강도 시험 사진", syncTarget: "compressionStrengthData" },
  testReportPhoto: { no: "03", label: "시험성적서 사진", syncTarget: "photoRegisterData" },
  pouringAreaPhoto: { no: "04", label: "타설부위 사진", syncTarget: "compressionStrengthData" },
  approvalDocPhoto: { no: "05", label: "자재승인서 사진", syncTarget: "materialApprovalData" },
  materialInspectionPhoto: { no: "06", label: "자재검수 사진", syncTarget: "materialApprovalData" },
  ksCertificatePhoto: { no: "07", label: "시험성적서/KS인증서 사진", syncTarget: "materialApprovalData" }
};

let selectedEntryType = "specimenPhoto";

function iconSvg(name) {
  const icons = {
    truck: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 24h28v20H11z"/><path d="M39 31h8l6 7v6H39z"/><path d="M18 47a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M47 47a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M15 19h19"/></svg>`,
    clipboard: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 14h24v8H20z"/><path d="M16 18h-3v36h38V18h-3"/><path d="m24 37 6 6 13-15"/></svg>`,
    rebar: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 45 45 15"/><path d="M23 49 53 19"/><path d="M13 31 31 13"/><path d="M33 51 51 33"/><path d="M20 40h-7"/><path d="M30 30h-7"/><path d="M40 20h-7"/></svg>`,
    leaf: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 53V30"/><path d="M32 30c-12 0-19-8-19-20 13 1 21 8 21 20"/><path d="M32 35c10-1 17-8 18-19-12 1-19 8-18 19"/><path d="M21 24c5 2 9 5 11 10"/></svg>`,
    cube: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m32 9 22 12v24L32 57 10 45V21z"/><path d="m10 21 22 12 22-12"/><path d="M32 33v24"/><path d="m21 15 22 12"/></svg>`,
    flask: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M25 10h14"/><path d="M29 10v18L17 51c-2 4 1 7 5 7h20c4 0 7-3 5-7L35 28V10"/><path d="M24 43h16"/></svg>`,
    building: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 54V14h28v40"/><path d="M44 28h8v26"/><path d="M23 22h5M32 22h5M23 31h5M32 31h5M23 40h5M32 40h5"/><path d="M12 54h44"/></svg>`,
    camera: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 23h10l4-6h8l4 6h10v27H14z"/><path d="M32 44a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M46 29h.1"/></svg>`
  };
  return icons[name] || icons.clipboard;
}

function readPhotoRegisterData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(mobilePortalConfig.storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePhotoRegisterData(entries) {
  photoRegisterData = entries;
  localStorage.setItem(mobilePortalConfig.storageKey, JSON.stringify(entries));
}

function setOcrStatus(message, state = "") {
  const status = document.getElementById("ocrStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("is-running", "is-success", "is-error");
  if (state) status.classList.add(`is-${state}`);
}

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[|]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findKeywordValue(text, keywords) {
  const escaped = keywords.map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?:${escaped.join("|")})\\s*[:：=\\-]?\\s*([^\\n]+)`, "i");
  const match = normalizeOcrText(text).match(pattern);
  if (!match) return "";
  return match[1]
    .replace(/\s{2,}/g, " ")
    .replace(/[|]+/g, "")
    .trim()
    .slice(0, 80);
}

function extractDateLike(text, keywords) {
  const value = findKeywordValue(text, keywords);
  const directDate = value.match(/\d{4}[.\-/년 ]+\d{1,2}[.\-/월 ]+\d{1,2}/);
  if (directDate) return directDate[0].replace(/[년월]/g, ".").replace(/일/g, "").trim();
  return value;
}

function extractOcrKeywords(text) {
  return {
    compression: {
      pouringArea: findKeywordValue(text, ["타설부위", "타설 부위", "부위", "위치"]),
      spec: findKeywordValue(text, ["규격", "설계강도", "강도규격", "기준강도"]),
      manufacturer: findKeywordValue(text, ["제조사", "공급사", "업체", "레미콘사"]),
      pouringDate: extractDateLike(text, ["타설일자", "타설일", "타설 일자"]),
      formRemovalStrength: findKeywordValue(text, ["거푸집해체강도", "거푸집 해체강도", "해체강도"]),
      day28Strength: findKeywordValue(text, ["28일 강도", "28일강도", "재령 28일", "28D"]),
      result: findKeywordValue(text, ["시험결과", "결과", "판정"]),
      status: findKeywordValue(text, ["상태", "진행상태", "처리상태"])
    },
    material: {
      materialName: findKeywordValue(text, ["자재명", "품명", "재료명"]),
      company: findKeywordValue(text, ["업체명", "제조사", "공급업체", "회사명"]),
      trade: findKeywordValue(text, ["공종", "적용공종", "공사종류"]),
      submitDate: extractDateLike(text, ["제출일", "제출일자", "접수일"]),
      expectedApprovalDate: extractDateLike(text, ["승인예정일", "승인 예정일", "예정일"]),
      status: findKeywordValue(text, ["상태", "승인상태", "진행상태"]),
      note: findKeywordValue(text, ["비고", "특이사항", "메모"])
    }
  };
}

function setFormValue(name, value) {
  const field = document.querySelector(`[name="${name}"]`);
  if (field) field.value = value || "";
}

function populateOcrFields(result) {
  setFormValue("ocrCompression_pouringArea", result.compression.pouringArea);
  setFormValue("ocrCompression_spec", result.compression.spec);
  setFormValue("ocrCompression_manufacturer", result.compression.manufacturer);
  setFormValue("ocrCompression_pouringDate", result.compression.pouringDate);
  setFormValue("ocrCompression_formRemovalStrength", result.compression.formRemovalStrength);
  setFormValue("ocrCompression_day28Strength", result.compression.day28Strength);
  setFormValue("ocrCompression_result", result.compression.result);
  setFormValue("ocrCompression_status", result.compression.status);
  setFormValue("ocrMaterial_materialName", result.material.materialName);
  setFormValue("ocrMaterial_company", result.material.company);
  setFormValue("ocrMaterial_trade", result.material.trade);
  setFormValue("ocrMaterial_submitDate", result.material.submitDate);
  setFormValue("ocrMaterial_expectedApprovalDate", result.material.expectedApprovalDate);
  setFormValue("ocrMaterial_status", result.material.status);
  setFormValue("ocrMaterial_note", result.material.note);
}

function clearOcrFields() {
  const rawText = document.getElementById("ocrRawText");
  if (rawText) rawText.value = "";
  document.querySelectorAll('[name^="ocrCompression_"], [name^="ocrMaterial_"]').forEach(input => {
    input.value = "";
  });
}

function getTesseractEngine() {
  return window.Tesseract || self.Tesseract;
}

async function handlePhotoOcr(file) {
  clearOcrFields();
  if (!file) {
    setOcrStatus("사진 업로드 시 OCR 분석을 실행합니다.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    setOcrStatus("OCR 인식 실패, 직접 입력해주세요", "error");
    return;
  }
  const tesseractEngine = getTesseractEngine();
  if (!tesseractEngine || typeof tesseractEngine.recognize !== "function") {
    setOcrStatus("OCR 인식 실패, 직접 입력해주세요", "error");
    return;
  }

  setOcrStatus("OCR 분석 중입니다", "running");
  try {
    const result = await tesseractEngine.recognize(file, "kor+eng", {
      logger(progress) {
        if (progress.status === "recognizing text" && Number.isFinite(progress.progress)) {
          const percent = Math.round(progress.progress * 100);
          setOcrStatus(`OCR 분석 중입니다 ${percent}%`, "running");
        }
      }
    });
    const text = normalizeOcrText(result?.data?.text || "");
    document.getElementById("ocrRawText").value = text;
    populateOcrFields(extractOcrKeywords(text));
    setOcrStatus(text ? "OCR 분석 완료, 내용을 확인 후 저장하세요" : "OCR 인식 실패, 직접 입력해주세요", text ? "success" : "error");
  } catch {
    setOcrStatus("OCR 인식 실패, 직접 입력해주세요", "error");
  }
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

function renderMetricCards(targetId, cards) {
  const target = document.getElementById(targetId);
  target.innerHTML = cards.map(card => `
    <article class="metric-card${card.warning ? " warning" : ""}${card.bad ? " bad" : ""}">
      <h3>${card.title}</h3>
      <div class="metric-value"><strong>${card.value}</strong>${card.unit}</div>
      <div class="metric-foot">${card.foot}</div>
    </article>
  `).join("");
}

function renderCompressionList() {
  const target = document.getElementById("compressionList");
  if (!compressionStrengthData.length) {
    target.innerHTML = `
      <article class="data-empty">
        <strong>등록된 압축강도 데이터가 없습니다.</strong>
        <p>착공 후 타설부위, 7일·28일 강도, 시험결과가 이곳에 표시됩니다.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = compressionStrengthData.map(item => `
    <article class="data-item">
      <h3>${escapeHtml(item.pouringArea)}</h3>
      <div class="data-fields">
        ${dataField("규격", item.spec)}
        ${dataField("제조사", item.manufacturer)}
        ${dataField("타설일자", item.pouringDate)}
        ${dataField("7일", item.day7)}
        ${dataField("28일", item.day28)}
        ${dataField("시험결과", item.result)}
        ${dataField("상태", item.status)}
      </div>
    </article>
  `).join("");
}

function renderMaterialList() {
  const target = document.getElementById("materialList");
  if (!materialApprovalData.length) {
    target.innerHTML = `
      <article class="data-empty">
        <strong>등록된 자재승인 데이터가 없습니다.</strong>
        <p>착공 후 자재명, 업체명, 승인예정일, 상태가 이곳에 표시됩니다.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = materialApprovalData.map(item => `
    <article class="data-item">
      <h3>${escapeHtml(item.materialName)}</h3>
      <div class="data-fields">
        ${dataField("업체명", item.company)}
        ${dataField("공종", item.trade)}
        ${dataField("제출일", item.submitDate)}
        ${dataField("승인예정일", item.expectedApprovalDate)}
        ${dataField("상태", item.status)}
        ${dataField("비고", item.note)}
      </div>
    </article>
  `).join("");
}

function dataField(label, value) {
  return `
    <div class="data-field">
      <span>${label}</span>
      <strong>${escapeHtml(value || "-")}</strong>
    </div>
  `;
}

function statusClass(status) {
  if (status === "완료" || status === "승인완료") return "done";
  if (status === "보완요청" || status === "반려" || status === "불합격") return "bad";
  if (status === "검토중" || status === "진행중") return "open";
  return "";
}

function renderStatusList() {
  const target = document.getElementById("mobileStatusList");
  const entries = readPhotoRegisterData().slice().reverse();

  if (!entries.length) {
    target.innerHTML = `
      <article class="status-empty">
        <div class="status-thumb">PHOTO</div>
        <strong>등록된 사진 데이터가 없습니다.</strong>
        <p>사진등록 탭에서 저장한 공시체, 압축강도, 자재승인 관련 사진이 이곳에 표시됩니다.</p>
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
          <span>유형: ${escapeHtml(entry.entryTypeLabel)}</span>
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
    id: `mobile-core-${Date.now()}`,
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
    ocr: {
      rawText: String(formData.get("ocrRawText") || "").trim(),
      compression: {
        pouringArea: String(formData.get("ocrCompression_pouringArea") || "").trim(),
        spec: String(formData.get("ocrCompression_spec") || "").trim(),
        manufacturer: String(formData.get("ocrCompression_manufacturer") || "").trim(),
        pouringDate: String(formData.get("ocrCompression_pouringDate") || "").trim(),
        formRemovalStrength: String(formData.get("ocrCompression_formRemovalStrength") || "").trim(),
        day28Strength: String(formData.get("ocrCompression_day28Strength") || "").trim(),
        result: String(formData.get("ocrCompression_result") || "").trim(),
        status: String(formData.get("ocrCompression_status") || "").trim()
      },
      material: {
        materialName: String(formData.get("ocrMaterial_materialName") || "").trim(),
        company: String(formData.get("ocrMaterial_company") || "").trim(),
        trade: String(formData.get("ocrMaterial_trade") || "").trim(),
        submitDate: String(formData.get("ocrMaterial_submitDate") || "").trim(),
        expectedApprovalDate: String(formData.get("ocrMaterial_expectedApprovalDate") || "").trim(),
        status: String(formData.get("ocrMaterial_status") || "").trim(),
        note: String(formData.get("ocrMaterial_note") || "").trim()
      }
    },
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
  document.documentElement.dataset.ocrEngine = getTesseractEngine() ? "ready" : "missing";
  photoRegisterData = readPhotoRegisterData();
  renderDashboardCards();
  renderMetricCards("compressionSummaryCards", compressionSummary);
  renderMetricCards("materialSummaryCards", materialSummary);
  renderCompressionList();
  renderMaterialList();
  renderStatusList();
  setDefaultDate();
  setEntryType(selectedEntryType);

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  document.querySelectorAll(".action-button").forEach(button => {
    button.addEventListener("click", () => setEntryType(button.dataset.entryType));
  });

  const photoInput = document.querySelector('input[name="photo"]');
  if (photoInput) {
    photoInput.addEventListener("change", event => {
      handlePhotoOcr(event.currentTarget.files[0]);
    });
  }

  document.getElementById("mobileInputForm").addEventListener("submit", event => {
    event.preventDefault();
    const entry = makeEntry(new FormData(event.currentTarget));
    const entries = readPhotoRegisterData();
    entries.push(entry);
    writePhotoRegisterData(entries);
    renderStatusList();
    event.currentTarget.reset();
    clearOcrFields();
    setOcrStatus("사진 업로드 시 OCR 분석을 실행합니다.");
    setDefaultDate();
    setTab("status");
    showToast("사진 등록 데이터가 임시 저장되었습니다.");
  });
}

window.mobileQualityPortalStore = {
  config: mobilePortalConfig,
  compressionStrengthData,
  materialApprovalData,
  get photoRegisterData() {
    return readPhotoRegisterData();
  },
  dashboardCards: mobileDashboardCards,
  compressionSummary,
  materialSummary,
  inputTypes: mobileInputTypes,
  extractOcrKeywords,
  handlePhotoOcr,
  readPhotoRegisterData,
  writePhotoRegisterData
};

document.addEventListener("DOMContentLoaded", setupMobilePortal);
