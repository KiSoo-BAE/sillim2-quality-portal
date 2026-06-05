const mobilePortalConfig = {
  version: "20260604-edit-delete1",
  projectName: "신림2재정비촉진구역 주택재개발정비사업",
  storageKey: "sillim2MobileOcrTest4PhotoRegisterData",
  compressionStorageKey: "qualityPortal_compressionStrengthData",
  concretePourStorageKey: "qualityPortal_concretePourData",
  materialApprovalStorageKey: "qualityPortal_materialApprovalData",
  futureSync: {
    source: "mobile.html",
    target: "Tesseract.js / Google Sheets / Apps Script / OCR API",
    note: "같은 브라우저/기기에서는 localStorage로 PC·모바일을 동기화하고, 다른 기기 간 연동은 추후 Google Sheets 또는 Apps Script로 확장합니다."
  }
};

let compressionStrengthData = [];
let concretePourData = [];
let materialApprovalData = [];
let photoRegisterData = [];
let editState = null;
let lastDeletedEntry = null;
let undoTimer = null;

const mobileDashboardCards = [
  { no: "01", id: "compressive", title: "콘크리트 압축강도", icon: "cube" },
  { no: "02", id: "materialApproval", title: "자재공급원 승인", icon: "clipboard" },
  { no: "03", id: "readyMix", title: "콘크리트 타설현황", icon: "truck" },
  { no: "04", id: "requestTest", title: "의뢰시험현황", icon: "flask" },
  { no: "05", id: "materialArch", title: "자재승인(건축)", icon: "building" },
  { no: "06", id: "materialCivil", title: "자재승인(토목)", icon: "rebar" },
  { no: "07", id: "materialLandscape", title: "자재승인(조경)", icon: "leaf" },
  { no: "08", id: "photoRegister", title: "사진등록 현황", icon: "camera" }
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
  ksCertificatePhoto: { no: "07", label: "시험성적서/KS인증서 사진", syncTarget: "materialApprovalData" },
  concretePourTablePhoto: { no: "08", label: "콘크리트 타설현황표 사진", syncTarget: "concretePourData" }
};

let selectedEntryType = "specimenPhoto";
let latestOcrFile = null;
const googleScriptUrl = (window.GOOGLE_SCRIPT_URL || "").trim();
let ocrLanguageLoadLogged = false;

const concretePourWhitelist = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후기니디리미비시이지치키티피히한일쌍용삼표유진아주콘크리트타설현황규격위치물량제조사회차비고가설본타설기초벽체슬라브획지서측동측남측북측가설헬스사무실쌍용레미콘()-/ .";

function isGoogleSyncEnabled() {
  return Boolean(googleScriptUrl && !googleScriptUrl.includes("여기에_Apps_Script_Web_App_URL_입력"));
}

function normalizeGoogleRows(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.compressionStrength || payload?.compressionStrengthData || payload?.data || payload?.rows || [];

  return Array.isArray(rows) ? rows.map(normalizeCompressionRecord) : [];
}

function normalizeGoogleConcreteRows(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.concretePour || payload?.concretePourData || payload?.data || payload?.rows || [];

  return Array.isArray(rows) ? rows.map(normalizeConcretePourRecord) : [];
}

const boardOcrRegions = {
  location: { label: "타설부위 값 영역", x: 0.18, y: 0.14, w: 0.60, h: 0.08 },
  spec: { label: "규격 값 영역", x: 0.18, y: 0.22, w: 0.45, h: 0.08 },
  age: { label: "재령 값 영역", x: 0.78, y: 0.22, w: 0.16, h: 0.08 },
  pourDate: { label: "타설일자 년/월/일 영역", x: 0.42, y: 0.30, w: 0.36, h: 0.10 },
  average: { label: "평균강도 값 영역", x: 0.78, y: 0.47, w: 0.18, h: 0.22 },
  testDate: { label: "시험일자 년/월/일 영역", x: 0.42, y: 0.73, w: 0.36, h: 0.10 },
  manufacturer: { label: "제조사 값 영역", x: 0.18, y: 0.82, w: 0.55, h: 0.08 }
};

const concretePourOcrLayout = {
  table: { x: 0.0, y: 0.265, w: 1.0, h: 0.72 },
  rowHeight: 0.081,
  maxRows: 22,
  columns: [
    ["no", "No.", 0.000, 0.104],
    ["pourDate", "타설일자", 0.104, 0.208],
    ["spec", "규격", 0.208, 0.312],
    ["location", "타설위치", 0.312, 0.725],
    ["quantity", "물량", 0.725, 0.792],
    ["manufacturer", "제조사", 0.792, 0.848],
    ["batch", "회차", 0.848, 0.932],
    ["note", "비고", 0.932, 1.000]
  ]
};

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

function normalizeCompressionRecord(record) {
  const rawAverageStrength = record.averageStrength || record.formRemovalStrength || record.day28Strength || "";
  const averageStrength = rawAverageStrength === "확인 필요" ? "" : rawAverageStrength;
  const age = record.age || "";
  return {
    id: record.id || `compression-${Date.now()}`,
    category: record.category || "압축강도",
    testType: record.testType || (age === "1일" ? "해체강도" : age === "28일" ? "28일 강도" : ""),
    location: record.location || record.pouringArea || "확인 필요",
    spec: record.spec || "확인 필요",
    age,
    pourDate: record.pourDate || record.pouringDate || "",
    testDate: record.testDate || "",
    averageStrength,
    manufacturer: record.manufacturer || "확인 필요",
    resultStatus: record.resultStatus || (averageStrength ? "결과등록" : "결과대기"),
    createdAt: record.createdAt || ""
  };
}

function readCompressionStrengthData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(mobilePortalConfig.compressionStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeCompressionRecord) : [];
  } catch {
    return [];
  }
}

function writeCompressionStrengthData(entries) {
  compressionStrengthData = entries.map(normalizeCompressionRecord);
  localStorage.setItem(mobilePortalConfig.compressionStorageKey, JSON.stringify(compressionStrengthData));
}

function normalizeConcretePourRecord(record) {
  return {
    id: record.id || `concrete-pour-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    no: String(record.no || "").trim(),
    pourDate: String(record.pourDate || record["타설일자"] || "").trim(),
    spec: String(record.spec || record["규격"] || "").trim(),
    location: String(record.location || record["타설위치"] || record.pouringLocation || "").trim(),
    quantity: String(record.quantity || record["물량"] || "").trim(),
    manufacturer: String(record.manufacturer || record["제조사"] || "").trim(),
    batch: String(record.batch || record["회차"] || "").trim(),
    note: String(record.note || record["비고"] || "").trim(),
    createdAt: record.createdAt || new Date().toISOString()
  };
}

function readConcretePourData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(mobilePortalConfig.concretePourStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeConcretePourRecord) : [];
  } catch {
    return [];
  }
}

function writeConcretePourData(entries) {
  concretePourData = entries.map(normalizeConcretePourRecord);
  localStorage.setItem(mobilePortalConfig.concretePourStorageKey, JSON.stringify(concretePourData));
}

function normalizeMaterialApprovalRecord(record) {
  return {
    id: record.id || `material-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    materialName: String(record.materialName || record["자재명"] || record.title || "").trim(),
    company: String(record.company || record.manufacturer || record["제조사"] || record["업체명"] || "").trim(),
    trade: String(record.trade || record["공종"] || record["적용공종"] || "").trim(),
    submitDate: String(record.submitDate || record["제출일"] || record["승인일"] || "").trim(),
    expectedApprovalDate: String(record.expectedApprovalDate || record["승인예정일"] || "").trim(),
    status: String(record.status || record["승인상태"] || "검토중").trim(),
    note: String(record.note || record["비고"] || record["판정"] || "").trim(),
    createdAt: record.createdAt || new Date().toISOString()
  };
}

function readMaterialApprovalData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(mobilePortalConfig.materialApprovalStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeMaterialApprovalRecord) : [];
  } catch {
    return [];
  }
}

function writeMaterialApprovalData(entries) {
  materialApprovalData = entries.map(normalizeMaterialApprovalRecord);
  localStorage.setItem(mobilePortalConfig.materialApprovalStorageKey, JSON.stringify(materialApprovalData));
}

async function fetchCompressionDataFromGoogleSheets() {
  if (!isGoogleSyncEnabled()) return null;

  const url = new URL(googleScriptUrl);
  url.searchParams.set("type", "compressionStrength");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`Google Sheets GET failed: ${response.status}`);
  return normalizeGoogleRows(await response.json());
}

async function fetchConcretePourDataFromGoogleSheets() {
  if (!isGoogleSyncEnabled()) return null;

  const url = new URL(googleScriptUrl);
  url.searchParams.set("type", "concretePour");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) throw new Error(`Google Sheets concretePour GET failed: ${response.status}`);
  return normalizeGoogleConcreteRows(await response.json());
}

async function loadCompressionData() {
  compressionStrengthData = readCompressionStrengthData();
  refreshCompressionViews();

  try {
    const googleRows = await fetchCompressionDataFromGoogleSheets();
    if (!googleRows) return false;
    writeCompressionStrengthData(googleRows);
    refreshCompressionViews();
    return true;
  } catch (error) {
    console.warn("Google Sheets 데이터를 불러오지 못해 localStorage 데이터를 사용합니다.", error);
    compressionStrengthData = readCompressionStrengthData();
    refreshCompressionViews();
    return false;
  }
}

async function loadConcretePourData() {
  concretePourData = readConcretePourData();
  refreshConcretePourViews();

  try {
    const googleRows = await fetchConcretePourDataFromGoogleSheets();
    if (!googleRows) return false;
    writeConcretePourData(googleRows);
    refreshConcretePourViews();
    return true;
  } catch (error) {
    console.warn("Google Sheets 타설현황 데이터를 불러오지 못해 localStorage 데이터를 사용합니다.", error);
    concretePourData = readConcretePourData();
    refreshConcretePourViews();
    return false;
  }
}

function makeGoogleCompressionPayload(record) {
  const item = normalizeCompressionRecord(record);
  return {
    type: "compressionStrength",
    id: item.id,
    testType: item.testType,
    location: item.location,
    spec: item.spec,
    age: item.age,
    pourDate: item.pourDate,
    testDate: item.testDate,
    averageStrength: item.averageStrength,
    manufacturer: item.manufacturer,
    resultStatus: item.resultStatus,
    createdAt: item.createdAt
  };
}

async function postCompressionDataToGoogleSheets(record) {
  if (!isGoogleSyncEnabled()) return { skipped: true };

  const response = await fetch(googleScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(makeGoogleCompressionPayload(record))
  });

  if (!response.ok) throw new Error(`Google Sheets POST failed: ${response.status}`);
  return { skipped: false };
}

function makeGoogleConcretePourPayload(record) {
  const item = normalizeConcretePourRecord(record);
  return {
    type: "concretePour",
    id: item.id,
    no: item.no,
    pourDate: item.pourDate,
    spec: item.spec,
    location: item.location,
    quantity: item.quantity,
    manufacturer: item.manufacturer,
    batch: item.batch,
    note: item.note,
    createdAt: item.createdAt
  };
}

async function postConcretePourDataToGoogleSheets(records) {
  if (!isGoogleSyncEnabled()) return { skipped: true };

  const response = await fetch(googleScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      type: "concretePour",
      rows: records.map(makeGoogleConcretePourPayload)
    })
  });

  if (!response.ok) throw new Error(`Google Sheets concretePour POST failed: ${response.status}`);
  return { skipped: false };
}

async function postDataMutationToGoogleSheets(type, action, payload) {
  if (!isGoogleSyncEnabled()) return { skipped: true };
  const response = await fetch(googleScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({ type, action, payload })
  });
  if (!response.ok) throw new Error(`Google Sheets ${type} ${action} failed: ${response.status}`);
  return { skipped: false };
}

function countCompressionResults(records = compressionStrengthData) {
  const normalized = records.map(normalizeCompressionRecord);
  return {
    total: normalized.length,
    formRemoval: normalized.filter(item => item.testType === "해체강도").length,
    day28: normalized.filter(item => item.testType === "28일 강도").length,
    resultRegistered: normalized.filter(item => item.resultStatus === "결과등록").length,
    resultPending: normalized.filter(item => item.resultStatus === "결과대기").length,
    retest: normalized.filter(item => ["불합격", "재시험", "불합격/재시험"].includes(item.resultStatus)).length
  };
}

function getCompressionSummaryCards() {
  const counts = countCompressionResults();
  return [
    { title: "전체 건수", value: counts.total, unit: "건", foot: `저장된 압축강도 ${counts.total}건` },
    { title: "해체강도", value: counts.formRemoval, unit: "건", foot: `재령 1일 ${counts.formRemoval}건` },
    { title: "28일 강도", value: counts.day28, unit: "건", foot: `재령 28일 ${counts.day28}건` },
    { title: "결과등록", value: counts.resultRegistered, unit: "건", foot: `평균강도 등록 ${counts.resultRegistered}건` },
    { title: "결과대기", value: counts.resultPending, unit: "건", foot: `평균강도 미등록 ${counts.resultPending}건`, warning: counts.resultPending > 0 },
    { title: "불합격/재시험", value: counts.retest, unit: "건", foot: `재시험 대상 ${counts.retest}건`, bad: counts.retest > 0 }
  ];
}

function parseQuantity(value) {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getConcretePourSummaryCards() {
  const monthKey = getCurrentMonthKey();
  const totalQuantity = concretePourData.reduce((sum, item) => sum + parseQuantity(item.quantity), 0);
  const monthRows = concretePourData.filter(item => String(item.pourDate || "").startsWith(monthKey));
  const monthQuantity = monthRows.reduce((sum, item) => sum + parseQuantity(item.quantity), 0);
  const makerTotals = concretePourData.reduce((acc, item) => {
    const maker = item.manufacturer || "미분류";
    acc[maker] = (acc[maker] || 0) + parseQuantity(item.quantity);
    return acc;
  }, {});
  const makerText = Object.entries(makerTotals)
    .map(([maker, quantity]) => `${maker} ${quantity}m³`)
    .join(" / ") || "제조사별 데이터 없음";

  return [
    { title: "전체 타설 건수", value: concretePourData.length, unit: "건", foot: `누계 ${concretePourData.length}건` },
    { title: "총 타설 물량", value: totalQuantity, unit: "m³", foot: `누계 ${totalQuantity}m³` },
    { title: "금월 타설 건수", value: monthRows.length, unit: "건", foot: `${monthKey} 기준` },
    { title: "금월 타설 물량", value: monthQuantity, unit: "m³", foot: `${monthKey} 기준` },
    { title: "제조사별 타설량", value: Object.keys(makerTotals).length, unit: "개사", foot: makerText }
  ];
}

function refreshCompressionViews() {
  compressionStrengthData = readCompressionStrengthData();
  renderDashboardCards();
  renderMetricCards("compressionSummaryCards", getCompressionSummaryCards());
  renderCompressionList();
}

function refreshConcretePourViews() {
  concretePourData = readConcretePourData();
  renderDashboardCards();
  renderMetricCards("concretePourSummaryCards", getConcretePourSummaryCards());
  renderConcretePourList();
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

function cleanupRegionText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[|_]+/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function firstReadableLine(value) {
  return cleanupRegionText(value)
    .split("\n")
    .map(line => cleanupBoardValue(line))
    .find(Boolean) || "";
}

function parseRegionSpec(text) {
  const compact = compactOcrText(text);
  const match = compact.match(/\b(\d{2})\s*[-–—]\s*(\d{2,3})\s*[-–—]\s*(\d{2})\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function parseRegionAge(text) {
  const compact = compactOcrText(text);
  const match = compact.match(/(\d{1,2})\s*일/) || compact.match(/(\d{1,2})/);
  return match ? `${match[1]}일` : "";
}

function parseRegionDate(text) {
  const compact = compactOcrText(text);
  const direct = compact.match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  if (direct) return formatDateParts(direct[1], direct[2], direct[3]);
  const numbers = compact.match(/\d+/g) || [];
  const yearIndex = numbers.findIndex(number => /^20\d{2}$/.test(number));
  if (yearIndex >= 0 && numbers[yearIndex + 1] && numbers[yearIndex + 2]) {
    return formatDateParts(numbers[yearIndex], numbers[yearIndex + 1], numbers[yearIndex + 2]);
  }
  if (numbers.length >= 3) return formatDateParts(numbers[0], numbers[1], numbers[2]);
  return "";
}

function parseRegionAverage(text) {
  const compact = compactOcrText(text);
  const mpaMatch = compact.match(/(\d{1,3}(?:\.\d+)?)\s*MPa/i);
  if (mpaMatch) return `${mpaMatch[1]} MPa`;
  const decimalNumbers = compact.match(/\d{1,3}\.\d+/g) || [];
  if (decimalNumbers.length) return `${decimalNumbers[decimalNumbers.length - 1]} MPa`;
  const integerMatch = compact.match(/\d{1,3}/);
  return integerMatch ? `${integerMatch[0]} MPa` : "";
}

function parseRegionLocation(text) {
  const value = cleanupRegionText(text).replace(/타설\s*부위/g, " ").trim() || firstReadableLine(text);
  return value.replace(/B\s*1\s*F/i, "B1F").trim();
}

function parseRegionManufacturer(text) {
  const value = cleanupRegionText(text).replace(/제\s*조\s*사|제조사/g, " ").trim() || firstReadableLine(text);
  return value.replace(/\s{2,}/g, " ").trim();
}

function buildRegionDebugText(regionTexts, fallbackText = "") {
  const lines = ["[영역별 OCR 원문]"];
  Object.entries(boardOcrRegions).forEach(([key, region]) => {
    lines.push(`\n## ${region.label} (${key})`);
    lines.push(cleanupRegionText(regionTexts[key] || "(인식 없음)"));
  });
  if (fallbackText) {
    lines.push("\n[Fallback 전체 OCR 원문]");
    lines.push(normalizeOcrText(fallbackText));
  }
  return lines.join("\n");
}

function extractBoardRegions(regionTexts) {
  const age = parseRegionAge(regionTexts.age);
  return {
    compression: {
      pouringArea: parseRegionLocation(regionTexts.location),
      spec: parseRegionSpec(regionTexts.spec),
      age,
      testType: age === "1일" ? "해체강도" : age === "28일" ? "28일 강도" : "",
      pouringDate: parseRegionDate(regionTexts.pourDate),
      testDate: parseRegionDate(regionTexts.testDate),
      formRemovalStrength: "",
      day28Strength: age === "28일" ? parseRegionAverage(regionTexts.average) : "",
      averageStrength: parseRegionAverage(regionTexts.average),
      manufacturer: parseRegionManufacturer(regionTexts.manufacturer)
    }
  };
}

function normalizePourDate(value) {
  const match = String(value || "").match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
  return match ? formatDateParts(match[1], match[2], match[3]) : String(value || "").trim();
}

function normalizeConcreteCellValue(key, value) {
  const text = cleanupRegionText(value)
    .replace(/[|_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (key === "no") {
    return (text.match(/\d{1,4}/) || [""])[0];
  }
  if (key === "pourDate") {
    return normalizePourDate(text.replace(/[년월.\/]/g, "-").replace(/일/g, ""));
  }
  if (key === "spec") {
    const match = text.match(/(\d{2})\D+(\d{2,3})\D+(\d{2,3})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : text.replace(/\s+/g, "");
  }
  if (key === "quantity") {
    return (text.match(/\d+(?:\.\d+)?/) || [""])[0];
  }
  if (key === "manufacturer") {
    if (/한\s*일|하\s*일|한입/.test(text)) return "한일";
    if (/쌍\s*용|상\s*용|쌍용/.test(text)) return "쌍용";
    if (/삼\s*표|삼표/.test(text)) return "삼표";
    if (/유\s*진|유진/.test(text)) return "유진";
    if (/아\s*주|아주/.test(text)) return "아주";
    return text.replace(/[^가-힣A-Za-z0-9㈜().-]/g, "");
  }
  if (key === "note") {
    if (/가\s*설|가설/.test(text)) return "가설";
    if (/본\s*타\s*설|본타설/.test(text)) return "본타설";
    if (/기\s*초|기초/.test(text)) return "기초";
    if (/벽\s*체|벽체/.test(text)) return "벽체";
    if (/슬\s*라\s*브|슬라브/.test(text)) return "슬라브";
    return text.replace(/[^가-힣A-Za-z0-9/().-]/g, "");
  }
  return text;
}

function isEmptyConcretePourRow(row) {
  return ![row.no, row.pourDate, row.spec, row.location, row.quantity, row.manufacturer, row.batch, row.note].some(Boolean);
}

async function recognizeConcretePourTableByCells(file, tesseractEngine) {
  const image = await loadImageFromFile(file);
  const sourceCanvas = drawImageToCanvas(image);
  const tableCanvas = cropConcreteCellCanvas(sourceCanvas, concretePourOcrLayout.table, 2, false);
  const originalTableCanvas = cropOriginalRatioToCanvas(sourceCanvas, concretePourOcrLayout.table, 2);
  const tablePreviewUrl = tableCanvas.toDataURL("image/png");
  const rows = [];
  const cellPreviews = [];
  const debugLines = [
    "[콘크리트 타설현황표 셀 단위 OCR]",
    `tableCropPreview=${tablePreviewUrl.slice(0, 180)}...`
  ];

  for (let rowIndex = 0; rowIndex < concretePourOcrLayout.maxRows; rowIndex += 1) {
    const y = rowIndex * concretePourOcrLayout.rowHeight;
    if (y + concretePourOcrLayout.rowHeight > 1) break;

    const row = {};
    const rawCells = {};

    for (const [key, label, x1, x2] of concretePourOcrLayout.columns) {
      setOcrStatus(`콘크리트 타설현황표 셀 OCR ${rowIndex + 1}행 ${label}`, "running");
      const cellRegion = {
        x: x1,
        y,
        w: x2 - x1,
        h: concretePourOcrLayout.rowHeight
      };
      const processedCellCanvas = cropConcreteCellCanvas(tableCanvas, cellRegion, key === "location" ? 2.0 : 2.8, false);
      const originalCellCanvas = cropOriginalRatioToCanvas(originalTableCanvas, cellRegion, key === "location" ? 2.0 : 2.8);
      const cellResult = await recognizeConcreteCellWithFallback(tesseractEngine, processedCellCanvas, originalCellCanvas, key);
      rawCells[key] = cellResult.raw;
      row[key] = cellResult.normalized;
      if (rowIndex < 8) {
        cellPreviews.push({
          label: `${rowIndex + 1}행 ${label}${cellResult.usedFallback ? " fallback" : ""}`,
          src: originalCellCanvas.toDataURL("image/png")
        });
      }
    }

    const normalizedRow = normalizeConcretePourRecord(row);
    debugLines.push(`\n## ${rowIndex + 1}행`);
    concretePourOcrLayout.columns.forEach(([key, label]) => {
      debugLines.push(`${label}: ${rawCells[key] || "(인식 없음)"} => ${normalizedRow[key] || "-"}`);
    });

    if (isEmptyConcretePourRow(normalizedRow)) {
      if (rows.length >= 1) break;
      continue;
    }
    rows.push(normalizedRow);
  }

  return {
    rows,
    debugText: debugLines.join("\n"),
    previewUrl: tablePreviewUrl,
    cellPreviews
  };
}

function parseConcretePourRows(text) {
  const lines = normalizeOcrText(text)
    .split("\n")
    .map(line => line
      .replace(/[|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean)
    .filter(line => !/콘크리트\s*타설현황|현장명|No\.?|타설일자|타설위치|물량|제조사|비고/i.test(line));

  return lines.map(line => {
    const match = line.match(/^(\d{1,4})\s+(20\d{2}[-./]\d{1,2}[-./]\d{1,2})\s+(\d{2}\s*[-–—]\s*\d{2,3}\s*[-–—]\s*\d{2,3})\s+(.+?)\s+(\d+(?:\.\d+)?)\s+([가-힣A-Za-z0-9()㈜.\-]+)(?:\s+([가-힣A-Za-z0-9()㈜.\-]+))?(?:\s+(.+))?$/);
    if (!match) return null;
    return normalizeConcretePourRecord({
      no: match[1],
      pourDate: normalizePourDate(match[2]),
      spec: match[3].replace(/\s+/g, "").replace(/[–—]/g, "-"),
      location: match[4].trim(),
      quantity: match[5],
      manufacturer: match[6],
      batch: match[8] ? match[7] : "",
      note: match[8] || match[7] || ""
    });
  }).filter(Boolean);
}

function buildConcretePourDebugText(text, rows) {
  return [
    "[콘크리트 타설현황표 OCR 원문]",
    normalizeOcrText(text || "(인식 없음)"),
    "",
    "[추출 행]",
    rows.length ? rows.map(row => `${row.no} / ${row.pourDate} / ${row.spec} / ${row.location} / ${row.quantity} / ${row.manufacturer} / ${row.batch} / ${row.note}`).join("\n") : "추출된 행 없음"
  ].join("\n");
}

function mergeMissingExtraction(primary, fallback) {
  const merged = { compression: { ...primary.compression } };
  Object.entries(fallback?.compression || {}).forEach(([key, value]) => {
    if (!merged.compression[key] && value) merged.compression[key] = value;
  });
  if (!merged.compression.testType && merged.compression.age === "1일") merged.compression.testType = "해체강도";
  if (!merged.compression.testType && merged.compression.age === "28일") merged.compression.testType = "28일 강도";
  return merged;
}

function countFilledExtraction(result) {
  return Object.values(result?.compression || {}).filter(Boolean).length;
}

function isConcretePourEntryType() {
  return selectedEntryType === "concretePourTablePhoto";
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

function setConcretePourCropPreview(dataUrl = "") {
  const rawBox = document.querySelector(".ocr-raw-box");
  if (!rawBox) return;
  let preview = document.getElementById("concretePourCropPreview");
  if (!dataUrl) {
    if (preview) preview.remove();
    return;
  }
  if (!preview) {
    preview = document.createElement("img");
    preview.id = "concretePourCropPreview";
    preview.alt = "콘크리트 타설현황표 OCR crop 미리보기";
    preview.style.cssText = "display:block;width:calc(100% - 24px);margin:0 12px 12px;border:1px solid #D9DDE3;background:#fff;";
    rawBox.appendChild(preview);
  }
  preview.src = dataUrl;
}

function setConcretePourCellPreviews(previews = []) {
  const rawBox = document.querySelector(".ocr-raw-box");
  if (!rawBox) return;
  let wrapper = document.getElementById("concretePourCellPreviews");
  if (!previews.length) {
    if (wrapper) wrapper.remove();
    return;
  }
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "concretePourCellPreviews";
    wrapper.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 12px 12px;";
    rawBox.appendChild(wrapper);
  }
  wrapper.innerHTML = previews.map(preview => `
    <figure style="margin:0;border:1px solid #D9DDE3;background:#fff;padding:6px;">
      <figcaption style="font-size:11px;font-weight:800;color:#0B1F3A;margin-bottom:4px;">${escapeHtml(preview.label)}</figcaption>
      <img src="${preview.src}" alt="${escapeHtml(preview.label)} crop" style="width:100%;display:block;">
    </figure>
  `).join("");
}

function renderConcretePourPreviewRows(rows = []) {
  const target = document.getElementById("concretePourPreviewBody");
  if (!target) return;
  const displayRows = rows.length ? rows : [];
  if (!displayRows.length) {
    target.innerHTML = `<tr><td colspan="8">콘크리트 타설현황표 사진 업로드 시 OCR 결과가 표시됩니다.</td></tr>`;
    return;
  }

  target.innerHTML = displayRows.map(row => `
    <tr>
      <td><input name="concretePour_no" value="${escapeHtml(row.no)}"></td>
      <td><input name="concretePour_pourDate" value="${escapeHtml(row.pourDate)}"></td>
      <td><input name="concretePour_spec" value="${escapeHtml(row.spec)}"></td>
      <td><input name="concretePour_location" value="${escapeHtml(row.location)}"></td>
      <td><input name="concretePour_quantity" value="${escapeHtml(row.quantity)}"></td>
      <td><input name="concretePour_manufacturer" value="${escapeHtml(row.manufacturer)}"></td>
      <td><input name="concretePour_batch" value="${escapeHtml(row.batch)}"></td>
      <td><input name="concretePour_note" value="${escapeHtml(row.note)}"></td>
    </tr>
  `).join("");
}

function getConcretePourPreviewRows() {
  const body = document.getElementById("concretePourPreviewBody");
  if (!body) return [];
  return [...body.querySelectorAll("tr")].map(row => {
    const get = name => row.querySelector(`[name="${name}"]`)?.value.trim() || "";
    return normalizeConcretePourRecord({
      no: get("concretePour_no"),
      pourDate: get("concretePour_pourDate"),
      spec: get("concretePour_spec"),
      location: get("concretePour_location"),
      quantity: get("concretePour_quantity"),
      manufacturer: get("concretePour_manufacturer"),
      batch: get("concretePour_batch"),
      note: get("concretePour_note")
    });
  }).filter(row => row.pourDate || row.location || row.quantity || row.manufacturer);
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
  renderConcretePourPreviewRows([]);
  setConcretePourCropPreview("");
  setConcretePourCellPreviews([]);
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
  return preprocessImageElementForOcr(image);
}

function preprocessImageElementForOcr(image) {
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

function drawImageToCanvas(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d").drawImage(image, 0, 0);
  return canvas;
}

function cropBoardRegionToCanvas(sourceCanvas, region) {
  const padding = 0.01;
  const sx = Math.max(0, Math.round((region.x - padding) * sourceCanvas.width));
  const sy = Math.max(0, Math.round((region.y - padding) * sourceCanvas.height));
  const sw = Math.min(sourceCanvas.width - sx, Math.round((region.w + padding * 2) * sourceCanvas.width));
  const sh = Math.min(sourceCanvas.height - sy, Math.round((region.h + padding * 2) * sourceCanvas.height));
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, sw * scale);
  canvas.height = Math.max(1, sh * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.45;
  const threshold = 170;
  for (let index = 0; index < data.length; index += 4) {
    const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    const value = contrasted > threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function cropRatioToCanvas(sourceCanvas, region, scale = 2.2) {
  const sx = Math.max(0, Math.round(region.x * sourceCanvas.width));
  const sy = Math.max(0, Math.round(region.y * sourceCanvas.height));
  const sw = Math.min(sourceCanvas.width - sx, Math.round(region.w * sourceCanvas.width));
  const sh = Math.min(sourceCanvas.height - sy, Math.round(region.h * sourceCanvas.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.55;
  const threshold = 172;
  for (let index = 0; index < data.length; index += 4) {
    const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    const value = contrasted > threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function cropOriginalRatioToCanvas(sourceCanvas, region, scale = 2) {
  const sx = Math.max(0, Math.round(region.x * sourceCanvas.width));
  const sy = Math.max(0, Math.round(region.y * sourceCanvas.height));
  const sw = Math.min(sourceCanvas.width - sx, Math.round(region.w * sourceCanvas.width));
  const sh = Math.min(sourceCanvas.height - sy, Math.round(region.h * sourceCanvas.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  canvas.getContext("2d", { willReadFrequently: true }).drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function cropConcreteCellCanvas(sourceCanvas, region, scale = 2.2, useThreshold = false) {
  const canvas = cropOriginalRatioToCanvas(sourceCanvas, region, scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const grayValues = new Uint8ClampedArray(canvas.width * canvas.height);
  const contrast = 1.14;

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    grayValues[pixel] = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
  }

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const pixel = y * canvas.width + x;
      const center = grayValues[pixel];
      const left = grayValues[y * canvas.width + Math.max(0, x - 1)];
      const right = grayValues[y * canvas.width + Math.min(canvas.width - 1, x + 1)];
      const top = grayValues[Math.max(0, y - 1) * canvas.width + x];
      const bottom = grayValues[Math.min(canvas.height - 1, y + 1) * canvas.width + x];
      let value = Math.max(0, Math.min(255, center * 1.45 - (left + right + top + bottom) * 0.1125));
      if (useThreshold) value = value > 178 ? 255 : 0;
      const dataIndex = pixel * 4;
      data[dataIndex] = value;
      data[dataIndex + 1] = value;
      data[dataIndex + 2] = value;
    }
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

async function recognizeImage(tesseractEngine, imageSource, logger) {
  logOcrLanguageLoad("kor+eng");
  const result = await tesseractEngine.recognize(imageSource, "kor+eng", {
    logger,
    tessedit_pageseg_mode: "6"
  });
  return normalizeOcrText(result?.data?.text || "");
}

function logOcrLanguageLoad(language) {
  if (ocrLanguageLoadLogged) return;
  ocrLanguageLoadLogged = true;
  console.info(`[OCR] Tesseract.js worker language requested: ${language}. kor traineddata should be loaded by Tesseract CDN worker.`);
}

async function recognizeCellImage(tesseractEngine, canvas, options = {}) {
  logOcrLanguageLoad("kor+eng");
  const result = await tesseractEngine.recognize(canvas.toDataURL("image/png"), "kor+eng", {
    tessedit_pageseg_mode: "7",
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: options.whitelist || concretePourWhitelist
  });
  return normalizeOcrText(result?.data?.text || "");
}

function isProbablyBrokenKoreanCell(key, raw, normalized) {
  if (!raw && !normalized) return true;
  if (/[�□]/.test(raw)) return true;
  if (["location", "manufacturer", "note", "batch"].includes(key) && raw && !/[가-힣]/.test(raw) && /[A-Za-z0-9]{4,}/.test(raw)) return true;
  return false;
}

async function recognizeConcreteCellWithFallback(tesseractEngine, processedCanvas, originalCanvas, key) {
  const processedRaw = await recognizeCellImage(tesseractEngine, processedCanvas);
  let normalized = normalizeConcreteCellValue(key, processedRaw);
  if (!isProbablyBrokenKoreanCell(key, processedRaw, normalized)) {
    return { raw: processedRaw, normalized, usedFallback: false };
  }

  const originalRaw = await recognizeCellImage(tesseractEngine, originalCanvas);
  const originalNormalized = normalizeConcreteCellValue(key, originalRaw);
  if (originalNormalized && (!normalized || originalNormalized.length >= normalized.length)) {
    return { raw: `${processedRaw}\n[원본 crop fallback]\n${originalRaw}`, normalized: originalNormalized, usedFallback: true };
  }
  return { raw: `${processedRaw}\n[원본 crop fallback]\n${originalRaw}`, normalized, usedFallback: true };
}

async function recognizeBoardRegions(file, tesseractEngine) {
  const image = await loadImageFromFile(file);
  const sourceCanvas = drawImageToCanvas(image);
  const regionTexts = {};
  const entries = Object.entries(boardOcrRegions);

  for (let index = 0; index < entries.length; index += 1) {
    const [key, region] = entries[index];
    setOcrStatus(`영역별 OCR 분석 중입니다 ${index + 1}/${entries.length}`, "running");
    const croppedCanvas = cropBoardRegionToCanvas(sourceCanvas, region);
    regionTexts[key] = await recognizeImage(tesseractEngine, croppedCanvas.toDataURL("image/png"));
  }

  return {
    regionTexts,
    extracted: extractBoardRegions(regionTexts)
  };
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
    if (isConcretePourEntryType()) {
      const cellResult = await recognizeConcretePourTableByCells(file, tesseractEngine);
      let rows = cellResult.rows;
      let debugText = cellResult.debugText;
      setConcretePourCropPreview(cellResult.previewUrl);
      setConcretePourCellPreviews(cellResult.cellPreviews);
      if (!rows.length) {
        const preprocessedImage = await preprocessImageForOcr(file).catch(() => file);
        const fallbackText = await recognizeImage(tesseractEngine, preprocessedImage, progress => {
          if (progress.status === "recognizing text" && Number.isFinite(progress.progress)) {
            const percent = Math.round(progress.progress * 100);
            setOcrStatus(`Fallback OCR 분석 중입니다 ${percent}%`, "running");
          }
        });
        rows = parseConcretePourRows(fallbackText);
        debugText = `${debugText}\n\n${buildConcretePourDebugText(fallbackText, rows)}`;
      }
      document.getElementById("ocrRawText").value = debugText;
      renderConcretePourPreviewRows(rows);
      setOcrStatus(rows.length ? "콘크리트 타설현황표 OCR 분석 완료, 추출 행을 검증 후 저장하세요" : "OCR 인식 실패, 직접 입력해주세요", rows.length ? "success" : "error");
      setOcrConfidenceStatus(rows.length ? (rows.length >= 3 ? "인식 성공" : "확인 필요") : "인식 실패", rows.length ? (rows.length >= 3 ? "success" : "review") : "error");
      return;
    }

    const regionResult = await recognizeBoardRegions(file, tesseractEngine);
    let extracted = regionResult.extracted;
    let fallbackText = "";

    if (countFilledExtraction(extracted) < 3) {
      const preprocessedImage = await preprocessImageForOcr(file).catch(() => file);
      fallbackText = await recognizeImage(tesseractEngine, preprocessedImage, progress => {
        if (progress.status === "recognizing text" && Number.isFinite(progress.progress)) {
          const percent = Math.round(progress.progress * 100);
          setOcrStatus(`Fallback OCR 분석 중입니다 ${percent}%`, "running");
        }
      });
      extracted = mergeMissingExtraction(extracted, extractOcrKeywords(fallbackText));
    }

    document.getElementById("ocrRawText").value = buildRegionDebugText(regionResult.regionTexts, fallbackText);
    populateOcrFields(extracted);
    const filledCount = countFilledExtraction(extracted);
    setOcrStatus(filledCount ? "영역별 OCR 분석 완료, 추출값을 검증 후 저장하세요" : "OCR 인식 실패, 직접 입력해주세요", filledCount ? "success" : "error");
    if (!filledCount) setOcrConfidenceStatus("인식 실패", "error");
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
  const compressionCounts = countCompressionResults();
  const concreteTotalQuantity = concretePourData.reduce((sum, item) => sum + parseQuantity(item.quantity), 0);
  const getMetric = card => {
    if (card.id === "compressive") {
      return {
        note: compressionCounts.total ? `결과등록 ${compressionCounts.resultRegistered}건 · 결과대기 ${compressionCounts.resultPending}건` : "등록된 데이터 없음",
        value: compressionCounts.total
      };
    }
    if (card.id === "readyMix") {
      return {
        note: concretePourData.length ? `총 물량 ${concreteTotalQuantity}m³` : "등록된 데이터 없음",
        value: concretePourData.length
      };
    }
    return { note: "등록된 데이터 없음", value: 0 };
  };

  target.innerHTML = mobileDashboardCards.map(card => {
    const metric = getMetric(card);
    return `
    <article class="mobile-dashboard-card">
      <span class="number-badge">${card.no}</span>
      <h3>${card.title}</h3>
      <div class="card-icon">${iconSvg(card.icon)}</div>
      <div class="card-divider"></div>
      <div class="card-note">${metric.note}</div>
      <div class="card-value"><strong>${metric.value}</strong>건</div>
    </article>
  `;
  }).join("");
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
      <h3>${escapeHtml(item.location)}</h3>
      <div class="data-fields">
        ${dataField("규격", item.spec)}
        ${dataField("제조사", item.manufacturer)}
        ${dataField("타설일자", item.pourDate)}
        ${dataField("시험일자", item.testDate)}
        ${dataField("재령", item.age)}
        ${dataField("시험구분", item.testType)}
        ${dataField("평균강도", item.averageStrength)}
        ${dataField("상태", item.resultStatus)}
      </div>
      ${actionButtons("compression", item.id)}
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
      ${actionButtons("material", item.id)}
    </article>
  `).join("");
}

function renderConcretePourList() {
  const target = document.getElementById("concretePourList");
  if (!target) return;
  if (!concretePourData.length) {
    target.innerHTML = `
      <article class="data-empty">
        <strong>등록된 콘크리트 타설현황 데이터가 없습니다.</strong>
        <p>타설현황표 사진을 등록하면 No., 타설일자, 규격, 타설위치, 물량, 제조사, 회차, 비고가 표시됩니다.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = concretePourData.map(item => `
    <article class="data-item">
      <h3>${escapeHtml(item.location || "타설위치 미입력")}</h3>
      <div class="data-fields">
        ${dataField("No.", item.no)}
        ${dataField("타설일자", item.pourDate)}
        ${dataField("규격", item.spec)}
        ${dataField("물량", item.quantity ? `${item.quantity}m³` : "")}
        ${dataField("제조사", item.manufacturer)}
        ${dataField("회차", item.batch)}
        ${dataField("비고", item.note)}
      </div>
      ${actionButtons("concretePour", item.id)}
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

function actionButtons(type, id) {
  return `
    <div class="data-actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
      <button type="button" data-edit-type="${type}" data-edit-id="${escapeHtml(id)}" style="min-height:38px;padding:0 12px;border:0;background:#1D4ED8;color:#fff;font-weight:900;border-radius:4px;">수정</button>
      <button type="button" data-delete-type="${type}" data-delete-id="${escapeHtml(id)}" style="min-height:38px;padding:0 12px;border:0;background:#E60012;color:#fff;font-weight:900;border-radius:4px;">삭제</button>
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
      },
      concretePour: getConcretePourPreviewRows()
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

function getOcrCompressionData(formData) {
  return {
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
  };
}

function hasOcrCompressionData(data) {
  return Object.values(data || {}).some(Boolean);
}

function validateMobileInput(formData) {
  const ocrData = getOcrCompressionData(formData);
  const concretePourRows = getConcretePourPreviewRows();
  if (concretePourRows.length) return { valid: true, ocrData, concretePourRows };
  if (hasOcrCompressionData(ocrData)) return { valid: true, ocrData };
  const title = String(formData.get("title") || "").trim();
  const date = String(formData.get("date") || "").trim();
  return {
    valid: Boolean(title && date),
    ocrData,
    concretePourRows
  };
}

function makeCompressionRecord(ocrData, formData) {
  const age = ocrData.age;
  const testType = ocrData.testType || (age === "1일" ? "해체강도" : age === "28일" ? "28일 강도" : "");
  const averageStrength = ocrData.averageStrength || ocrData.formRemovalStrength || ocrData.day28Strength || "";
  return {
    id: `compression-${Date.now()}`,
    category: "압축강도",
    testType,
    location: ocrData.pouringArea || String(formData.get("location") || "").trim() || "확인 필요",
    spec: ocrData.spec || "확인 필요",
    age,
    pourDate: ocrData.pouringDate || "",
    testDate: ocrData.testDate || String(formData.get("date") || "").trim(),
    averageStrength,
    manufacturer: ocrData.manufacturer || "확인 필요",
    resultStatus: averageStrength ? "결과등록" : "결과대기",
    createdAt: new Date().toISOString()
  };
}

function makeMaterialRecordFromForm(formData) {
  return normalizeMaterialApprovalRecord({
    id: editState?.type === "material" ? editState.id : `material-${Date.now()}`,
    materialName: String(formData.get("title") || "").trim(),
    company: String(formData.get("location") || "").trim(),
    trade: String(formData.get("trade") || "").trim(),
    submitDate: String(formData.get("date") || "").trim(),
    status: String(formData.get("status") || "검토중").trim(),
    note: String(formData.get("note") || "").trim(),
    createdAt: new Date().toISOString()
  });
}

function disableNativeValidation(form) {
  form.setAttribute("novalidate", "novalidate");
  form.querySelectorAll("[required]").forEach(field => field.removeAttribute("required"));
}

function setEntryType(type) {
  selectedEntryType = type;
  const typeInfo = mobileInputTypes[type];
  document.getElementById("selectedTypeNo").textContent = typeInfo.no;
  document.getElementById("selectedTypeTitle").textContent = typeInfo.label;
  document.querySelectorAll(".action-button").forEach(button => {
    button.classList.toggle("active", button.dataset.entryType === type);
  });
  setOcrStatus(type === "concretePourTablePhoto"
    ? "콘크리트 타설현황표 사진 업로드 시 OCR 분석을 실행합니다."
    : "압축강도 보드판 사진 업로드 시 OCR 분석을 실행합니다.");
}

function setSaveMode(type, id) {
  editState = type && id ? { type, id } : null;
  const saveButton = document.querySelector(".save-button");
  if (saveButton) saveButton.textContent = editState ? "수정 저장" : "저장";
}

function resetEditMode() {
  setSaveMode(null, null);
}

function editCompressionRecord(id) {
  const item = compressionStrengthData.find(record => record.id === id);
  if (!item) return;
  setEntryType("compressionTestPhoto");
  setFormValue("ocrCompression_pouringArea", item.location);
  setFormValue("ocrCompression_spec", item.spec);
  setFormValue("ocrCompression_age", item.age);
  setFormValue("ocrCompression_testType", item.testType);
  setFormValue("ocrCompression_pouringDate", item.pourDate);
  setFormValue("ocrCompression_testDate", item.testDate);
  setFormValue("ocrCompression_averageStrength", item.averageStrength);
  setFormValue("ocrCompression_manufacturer", item.manufacturer);
  setFormValue("date", item.testDate || item.pourDate);
  setFormValue("location", item.location);
  setSaveMode("compression", id);
  setTab("photo");
  showToast("압축강도 데이터를 수정합니다.");
}

function editConcretePourRecord(id) {
  const item = concretePourData.find(record => record.id === id);
  if (!item) return;
  setEntryType("concretePourTablePhoto");
  renderConcretePourPreviewRows([item]);
  setFormValue("date", item.pourDate);
  setFormValue("location", item.location);
  setSaveMode("concretePour", id);
  setTab("photo");
  showToast("콘크리트 타설현황 데이터를 수정합니다.");
}

function editMaterialRecord(id) {
  const item = materialApprovalData.find(record => record.id === id);
  if (!item) return;
  setEntryType("approvalDocPhoto");
  setFormValue("title", item.materialName);
  setFormValue("location", item.company);
  setFormValue("trade", item.trade);
  setFormValue("date", item.submitDate);
  setFormValue("status", item.status);
  setFormValue("note", item.note);
  setSaveMode("material", id);
  setTab("photo");
  showToast("자재공급원승인 데이터를 수정합니다.");
}

function deleteDataRecord(type, id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  let deleted = null;

  if (type === "compression") {
    const rows = readCompressionStrengthData();
    deleted = rows.find(item => item.id === id);
    writeCompressionStrengthData(rows.filter(item => item.id !== id));
    refreshCompressionViews();
  }

  if (type === "concretePour") {
    const rows = readConcretePourData();
    deleted = rows.find(item => item.id === id);
    writeConcretePourData(rows.filter(item => item.id !== id));
    refreshConcretePourViews();
  }

  if (type === "material") {
    const rows = readMaterialApprovalData();
    deleted = rows.find(item => item.id === id);
    writeMaterialApprovalData(rows.filter(item => item.id !== id));
    renderMaterialList();
  }

  if (!deleted) return;
  lastDeletedEntry = { type, item: deleted };
  postDataMutationToGoogleSheets(type, "delete", { id }).catch(error => console.warn("Google Sheets 삭제 연동 실패", error));
  showUndoToast("삭제되었습니다.");
}

function handleListAction(event) {
  const editButton = event.target.closest("[data-edit-type]");
  const deleteButton = event.target.closest("[data-delete-type]");
  if (editButton) {
    const { editType, editId } = editButton.dataset;
    if (editType === "compression") editCompressionRecord(editId);
    if (editType === "concretePour") editConcretePourRecord(editId);
    if (editType === "material") editMaterialRecord(editId);
  }
  if (deleteButton) {
    deleteDataRecord(deleteButton.dataset.deleteType, deleteButton.dataset.deleteId);
  }
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

function showUndoToast(message) {
  const toast = document.getElementById("mobileToast");
  toast.innerHTML = `${escapeHtml(message)} <button type="button" id="undoDeleteButton" style="margin-left:10px;border:0;background:#fff;color:#E60012;font-weight:900;border-radius:4px;padding:6px 10px;">삭제 취소(Undo)</button>`;
  toast.classList.add("show");
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    lastDeletedEntry = null;
    toast.classList.remove("show");
  }, 30000);
  document.getElementById("undoDeleteButton")?.addEventListener("click", restoreLastDeletedEntry, { once: true });
}

function restoreLastDeletedEntry() {
  if (!lastDeletedEntry) return;
  const { type, item } = lastDeletedEntry;
  if (type === "compression") writeCompressionStrengthData([item].concat(readCompressionStrengthData()));
  if (type === "concretePour") writeConcretePourData([item].concat(readConcretePourData()));
  if (type === "material") writeMaterialApprovalData([item].concat(readMaterialApprovalData()));
  refreshCompressionViews();
  refreshConcretePourViews();
  renderMaterialList();
  postDataMutationToGoogleSheets(type, "update", item).catch(error => console.warn("Google Sheets Undo 연동 실패", error));
  lastDeletedEntry = null;
  clearTimeout(undoTimer);
  showToast("삭제를 취소했습니다.");
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
  compressionStrengthData = readCompressionStrengthData();
  concretePourData = readConcretePourData();
  materialApprovalData = readMaterialApprovalData();
  renderDashboardCards();
  renderMetricCards("concretePourSummaryCards", getConcretePourSummaryCards());
  renderMetricCards("compressionSummaryCards", getCompressionSummaryCards());
  renderMetricCards("materialSummaryCards", materialSummary);
  renderCompressionList();
  renderConcretePourList();
  renderMaterialList();
  renderStatusList();
  setDefaultDate();
  setEntryType(selectedEntryType);
  loadCompressionData();
  loadConcretePourData();

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

  const mobileInputForm = document.getElementById("mobileInputForm");
  disableNativeValidation(mobileInputForm);
  document.getElementById("compressionList")?.addEventListener("click", handleListAction);
  document.getElementById("concretePourList")?.addEventListener("click", handleListAction);
  document.getElementById("materialList")?.addEventListener("click", handleListAction);

  mobileInputForm.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const validation = validateMobileInput(formData);
    if (!validation.valid) {
      showToast("필수 항목을 확인해주세요");
      return;
    }

    const entry = makeEntry(formData);
    const entries = readPhotoRegisterData();
    entries.push(entry);
    writePhotoRegisterData(entries);

    const hasOcrData = hasOcrCompressionData(validation.ocrData);
    const concretePourRows = validation.concretePourRows || [];
    const hasConcretePourData = concretePourRows.length > 0;
    const hasMaterialEdit = editState?.type === "material";
    let googleMessage = "";
    if (hasOcrData) {
      const compressionRecord = {
        ...makeCompressionRecord(validation.ocrData, formData),
        id: editState?.type === "compression" ? editState.id : `compression-${Date.now()}`
      };
      const compressionEntries = readCompressionStrengthData();
      const nextEntries = editState?.type === "compression"
        ? compressionEntries.map(item => item.id === editState.id ? compressionRecord : item)
        : [compressionRecord].concat(compressionEntries);
      writeCompressionStrengthData(nextEntries);
      refreshCompressionViews();

      try {
        const googleResult = editState?.type === "compression"
          ? await postDataMutationToGoogleSheets("compressionStrength", "update", compressionRecord)
          : await postCompressionDataToGoogleSheets(compressionRecord);
        googleMessage = googleResult.skipped ? "압축강도 현황에 저장되었습니다" : "Google Sheets 저장 완료";
      } catch (error) {
        console.warn("Google Sheets 저장 실패 / 로컬 저장만 완료", error);
        googleMessage = "Google Sheets 저장 실패 / 로컬 저장만 완료";
      }
    }

    if (hasConcretePourData) {
      const createdAt = new Date().toISOString();
      const concreteRecords = concretePourRows.map(row => normalizeConcretePourRecord({
        ...row,
        id: editState?.type === "concretePour" ? editState.id : row.id || `concrete-pour-${Date.now()}-${row.no || Math.random().toString(16).slice(2)}`,
        createdAt
      }));
      const pourEntries = readConcretePourData();
      const nextPourEntries = editState?.type === "concretePour"
        ? pourEntries.map(item => item.id === editState.id ? concreteRecords[0] : item)
        : concreteRecords.concat(pourEntries);
      writeConcretePourData(nextPourEntries);
      refreshConcretePourViews();

      try {
        const googleResult = editState?.type === "concretePour"
          ? await postDataMutationToGoogleSheets("concretePour", "update", concreteRecords[0])
          : await postConcretePourDataToGoogleSheets(concreteRecords);
        googleMessage = googleResult.skipped ? "콘크리트 타설현황에 저장되었습니다" : "Google Sheets 저장 완료";
      } catch (error) {
        console.warn("Google Sheets 타설현황 저장 실패 / 로컬 저장만 완료", error);
        googleMessage = "Google Sheets 저장 실패 / 로컬 저장만 완료";
      }
    }

    if (hasMaterialEdit) {
      const materialRecord = makeMaterialRecordFromForm(formData);
      const materialEntries = readMaterialApprovalData();
      writeMaterialApprovalData(materialEntries.map(item => item.id === editState.id ? materialRecord : item));
      renderMaterialList();
      try {
        const googleResult = await postDataMutationToGoogleSheets("materialApproval", "update", materialRecord);
        googleMessage = googleResult.skipped ? "자재공급원승인 현황에 저장되었습니다" : "Google Sheets 저장 완료";
      } catch (error) {
        console.warn("Google Sheets 자재승인 저장 실패 / 로컬 저장만 완료", error);
        googleMessage = "Google Sheets 저장 실패 / 로컬 저장만 완료";
      }
    }

    renderStatusList();
    event.currentTarget.reset();
    latestOcrFile = null;
    if (ocrRetryButton) ocrRetryButton.disabled = true;
    clearOcrFields();
    resetEditMode();
    setOcrStatus("압축강도 보드판 사진 업로드 시 OCR 분석을 실행합니다.");
    setDefaultDate();
    setTab(hasMaterialEdit ? "material" : hasConcretePourData ? "pour" : hasOcrData ? "compression" : "status");
    showToast((hasOcrData || hasConcretePourData || hasMaterialEdit) ? googleMessage : "사진 등록 데이터가 임시 저장되었습니다.");
  });

  window.addEventListener("storage", event => {
    if (event.key === mobilePortalConfig.compressionStorageKey) refreshCompressionViews();
    if (event.key === mobilePortalConfig.concretePourStorageKey) refreshConcretePourViews();
    if (event.key === mobilePortalConfig.materialApprovalStorageKey) {
      materialApprovalData = readMaterialApprovalData();
      renderMaterialList();
    }
  });
}

window.mobileQualityPortalStore = {
  config: mobilePortalConfig,
  materialApprovalData,
  get photoRegisterData() {
    return readPhotoRegisterData();
  },
  dashboardCards: mobileDashboardCards,
  get compressionStrengthData() {
    return readCompressionStrengthData();
  },
  get compressionSummary() {
    return getCompressionSummaryCards();
  },
  materialSummary,
  inputTypes: mobileInputTypes,
  extractOcrKeywords,
  handlePhotoOcr,
  readPhotoRegisterData,
  writePhotoRegisterData,
  readCompressionStrengthData,
  writeCompressionStrengthData,
  countCompressionResults,
  readConcretePourData,
  writeConcretePourData,
  parseConcretePourRows
};

document.addEventListener("DOMContentLoaded", setupMobilePortal);
