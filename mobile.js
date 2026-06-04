const mobilePortalConfig = {
  version: "20260604-ocr-test2",
  projectName: "신림2재정비촉진구역 주택재개발정비사업",
  storageKey: "sillim2MobileOcrTestPhotoRegisterData",
  futureSync: {
    source: "mobile.html",
    target: "Tesseract.js / Google Sheets / Apps Script / OCR API",
    note: "압축강도 보드판 OCR 결과는 검증용으로 표시하고, 사용자가 확인 및 수정한 뒤 저장 버튼을 눌렀을 때만 사진등록 데이터에 포함합니다."
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
let latestOcrFile = null;

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

function setOcrConfidenceStatus(message, state = "") {
  const status = document.getElementById("ocrConfidenceStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("is-success", "is-review", "is-error");
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

function compactOcrText(text) {
  return normalizeOcrText(text).replace(/\s+/g, " ").trim();
}

function lineAfterKeyword(text, keywords) {
  const lines = normalizeOcrText(text).split("\n").map(line => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const keyword = keywords.find(item => line.includes(item));
    if (!keyword) continue;
    const rightSide = line.slice(line.indexOf(keyword) + keyword.length).replace(/[:：=\-]/g, " ").trim();
    if (rightSide) return rightSide;
    for (let offset = 1; offset <= 2; offset += 1) {
      const nextLine = lines[index + offset] || "";
      if (nextLine && !keywords.some(item => nextLine.includes(item))) return nextLine;
    }
  }
  return "";
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

function formatDateParts(year, month, day) {
  if (!year || !month || !day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function extractBoardDate(text, keyword) {
  const compact = compactOcrText(text);
  const keywordIndex = compact.indexOf(keyword);
  const scope = keywordIndex >= 0 ? compact.slice(keywordIndex, keywordIndex + 120) : compact;
  const labeled = scope.match(/(20\d{2})\s*(?:년)?\s*(\d{1,2})\s*(?:월)?\s*(\d{1,2})\s*(?:일)?/);
  if (labeled) return formatDateParts(labeled[1], labeled[2], labeled[3]);

  const yearIndex = scope.indexOf("년");
  const monthIndex = scope.indexOf("월");
  const dayIndex = scope.indexOf("일");
  if (yearIndex >= 0 && monthIndex > yearIndex && dayIndex > monthIndex) {
    const year = scope.slice(Math.max(0, yearIndex - 8), yearIndex).match(/20\d{2}/)?.[0];
    const month = scope.slice(Math.max(0, monthIndex - 4), monthIndex).match(/\d{1,2}/)?.[0];
    const day = scope.slice(Math.max(0, dayIndex - 4), dayIndex).match(/\d{1,2}/)?.[0];
    return formatDateParts(year, month, day);
  }
  return "";
}

function extractSpec(text) {
  const compact = compactOcrText(text);
  const match = compact.match(/\b(\d{2})\s*[-–—]\s*(\d{2,3})\s*[-–—]\s*(\d{2})\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function extractAge(text) {
  const compact = compactOcrText(text);
  const match = compact.match(/재\s*령\s*[:：]?\s*(\d{1,2})\s*일/);
  return match ? `${match[1]}일` : "";
}

function extractAverageStrength(text) {
  const compact = compactOcrText(text);
  const averageIndex = compact.search(/평균\s*(?:\(?\s*[XxX̄]\s*\)?)?/);
  if (averageIndex >= 0) {
    const scope = compact.slice(averageIndex, averageIndex + 100);
    const mpaMatch = scope.match(/(\d{1,3}(?:\.\d+)?)\s*MPa/i);
    if (mpaMatch) return `${mpaMatch[1]} MPa`;
    const numericMatch = scope.match(/(\d{1,3}(?:\.\d+)?)/);
    if (numericMatch) return `${numericMatch[1]} MPa`;
  }
  const fallback = compact.match(/(\d{1,3}(?:\.\d+)?)\s*MPa/i);
  return fallback ? `${fallback[1]} MPa` : "";
}

function cleanupBoardValue(value) {
  return String(value || "")
    .replace(/\bX[123]\b/gi, "")
    .replace(/평균\s*\(?\s*[XxX̄]\s*\)?/g, "")
    .replace(/년|월|일/g, " ")
    .split(/규\s*격|재\s*령|타설\s*일자|시험\s*일자|압축\s*강도|평균|제\s*조\s*사|제조사/)[0]
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractPouringArea(text) {
  const value = lineAfterKeyword(text, ["타설부위"]);
  const cleaned = cleanupBoardValue(value);
  const match = cleaned.match(/(?:B|b)\s*1\s*F\s*[가-힣A-Za-z0-9()\/\- ]*/);
  return (match ? match[0] : cleaned).replace(/\s+/g, " ").replace(/B\s*1\s*F/i, "B1F").trim();
}

function extractManufacturer(text) {
  const value = lineAfterKeyword(text, ["제조사", "제 조 사"]);
  return cleanupBoardValue(value).replace(/\s{2,}/g, " ").trim();
}

function extractOcrKeywords(text) {
  const normalized = normalizeOcrText(text);
  const age = extractAge(normalized);
  return {
    compression: {
      pouringArea: extractPouringArea(normalized) || findKeywordValue(normalized, ["타설부위", "타설 부위"]),
      spec: extractSpec(normalized) || findKeywordValue(normalized, ["규격", "규 격", "설계강도", "강도규격"]),
      age,
      testType: age === "1일" ? "해체강도" : "",
      pouringDate: extractBoardDate(normalized, "타설일자") || extractDateLike(normalized, ["타설일자", "타설일", "타설 일자"]),
      testDate: extractBoardDate(normalized, "시험일자") || extractDateLike(normalized, ["시험일자", "시험일", "시험 일자"]),
      formRemovalStrength: findKeywordValue(normalized, ["해체강도", "해체 강도"]),
      day28Strength: findKeywordValue(normalized, ["28일 강도", "28일강도", "재령 28일", "28D"]),
      averageStrength: extractAverageStrength(normalized) || findKeywordValue(normalized, ["평균강도", "평균 강도", "평균", "평균 (X)", "평균(X)"]),
      manufacturer: extractManufacturer(normalized) || findKeywordValue(normalized, ["제조사", "제 조 사", "공급사", "업체", "레미콘사"])
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
  setFormValue("ocrCompression_age", result.compression.age);
  setFormValue("ocrCompression_testType", result.compression.testType);
  setFormValue("ocrCompression_pouringDate", result.compression.pouringDate);
  setFormValue("ocrCompression_testDate", result.compression.testDate);
  setFormValue("ocrCompression_formRemovalStrength", result.compression.formRemovalStrength);
  setFormValue("ocrCompression_day28Strength", result.compression.day28Strength);
  setFormValue("ocrCompression_averageStrength", result.compression.averageStrength);
  setFormValue("ocrCompression_manufacturer", result.compression.manufacturer);
  updateOcrConfidenceStatus(result);
}

function updateOcrConfidenceStatus(result) {
  const values = Object.values(result?.compression || {});
  const filledCount = values.filter(Boolean).length;
  if (filledCount >= 6) {
    setOcrConfidenceStatus("인식 성공", "success");
  } else if (filledCount >= 2) {
    setOcrConfidenceStatus("확인 필요", "review");
  } else {
    setOcrConfidenceStatus("인식 실패", "error");
  }
}

function clearOcrFields() {
  const rawText = document.getElementById("ocrRawText");
  if (rawText) rawText.value = "";
  document.querySelectorAll('[name^="ocrCompression_"]').forEach(input => {
    input.value = "";
  });
  setOcrConfidenceStatus("확인 대기");
}

function getTesseractEngine() {
  return window.Tesseract || self.Tesseract;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function preprocessImageForOcr(file) {
  const image = await loadImageFromFile(file);
  const scale = 2;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.35;
  const threshold = 176;
  for (let index = 0; index < data.length; index += 4) {
    const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    const value = contrasted > threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

async function handlePhotoOcr(file) {
  clearOcrFields();
  latestOcrFile = file || null;
  const retryButton = document.getElementById("ocrRetryButton");
  if (retryButton) retryButton.disabled = !latestOcrFile;
  if (!file) {
    setOcrStatus("압축강도 보드판 사진 업로드 시 OCR 분석을 실행합니다.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    setOcrStatus("OCR 인식 실패, 직접 입력해주세요", "error");
    setOcrConfidenceStatus("인식 실패", "error");
    return;
  }
  const tesseractEngine = getTesseractEngine();
  if (!tesseractEngine || typeof tesseractEngine.recognize !== "function") {
    setOcrStatus("OCR 인식 실패, 직접 입력해주세요", "error");
    setOcrConfidenceStatus("인식 실패", "error");
    return;
  }

  setOcrStatus("OCR 분석 중입니다", "running");
  setOcrConfidenceStatus("확인 대기");
  try {
    const preprocessedImage = await preprocessImageForOcr(file).catch(() => file);
    const result = await tesseractEngine.recognize(preprocessedImage, "kor+eng", {
      logger(progress) {
        if (progress.status === "recognizing text" && Number.isFinite(progress.progress)) {
          const percent = Math.round(progress.progress * 100);
          setOcrStatus(`OCR 분석 중입니다 ${percent}%`, "running");
        }
      }
    });
    const text = normalizeOcrText(result?.data?.text || "");
    document.getElementById("ocrRawText").value = text;
    const extracted = extractOcrKeywords(text);
    populateOcrFields(extracted);
    setOcrStatus(text ? "OCR 분석 완료, 추출값을 검증 후 저장하세요" : "OCR 인식 실패, 직접 입력해주세요", text ? "success" : "error");
    if (!text) setOcrConfidenceStatus("인식 실패", "error");
  } catch {
    setOcrStatus("OCR 인식 실패, 직접 입력해주세요", "error");
    setOcrConfidenceStatus("인식 실패", "error");
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
        age: String(formData.get("ocrCompression_age") || "").trim(),
        testType: String(formData.get("ocrCompression_testType") || "").trim(),
        pouringDate: String(formData.get("ocrCompression_pouringDate") || "").trim(),
        testDate: String(formData.get("ocrCompression_testDate") || "").trim(),
        formRemovalStrength: String(formData.get("ocrCompression_formRemovalStrength") || "").trim(),
        day28Strength: String(formData.get("ocrCompression_day28Strength") || "").trim(),
        averageStrength: String(formData.get("ocrCompression_averageStrength") || "").trim(),
        manufacturer: String(formData.get("ocrCompression_manufacturer") || "").trim()
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

  const ocrRetryButton = document.getElementById("ocrRetryButton");
  if (ocrRetryButton) {
    ocrRetryButton.addEventListener("click", () => {
      if (latestOcrFile) handlePhotoOcr(latestOcrFile);
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
    latestOcrFile = null;
    if (ocrRetryButton) ocrRetryButton.disabled = true;
    clearOcrFields();
    setOcrStatus("압축강도 보드판 사진 업로드 시 OCR 분석을 실행합니다.");
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
