const mobileInputTypes = {
  photo: { no: "01", label: "사진 등록", syncTarget: "sitePhotos" },
  qualityIssue: { no: "02", label: "품질 지적사항 등록", syncTarget: "nonconformity" },
  sor: { no: "03", label: "SOR 현황 등록", syncTarget: "sorStatus" },
  testStatus: { no: "04", label: "시험 현황 등록", syncTarget: "requestTest" },
  notice: { no: "05", label: "공지사항 등록", syncTarget: "notice" },
  completionPhoto: { no: "06", label: "완료 사진 업로드", syncTarget: "completionPhotos" }
};

const mobileInputStoreKey = "sillim2MobileQualityInputs";

const mobileInputSchema = {
  version: "20260604-mobile1",
  projectName: "신림2재정비촉진구역 주택재개발정비사업",
  fields: ["entryType", "title", "location", "trade", "date", "status", "note", "photo"],
  futureSync: {
    storage: "Google Sheets 또는 Apps Script API",
    dashboard: "PC 현황판과 KPI 대시보드",
    status: "local-first placeholder"
  }
};

let selectedEntryType = "photo";

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(mobileInputStoreKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  localStorage.setItem(mobileInputStoreKey, JSON.stringify(entries));
}

function makeEntry(formData) {
  const typeInfo = mobileInputTypes[selectedEntryType];
  const photo = formData.get("photo");
  return {
    id: `mobile-${Date.now()}`,
    schemaVersion: mobileInputSchema.version,
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

function renderRecentEntries() {
  const entries = readEntries().slice().reverse().slice(0, 5);
  const target = document.getElementById("recentEntries");
  if (!entries.length) {
    target.innerHTML = `<p class="recent-empty">아직 저장된 모바일 입력 데이터가 없습니다.</p>`;
    return;
  }
  target.innerHTML = entries.map(entry => `
    <article class="recent-item">
      <strong>${entry.entryTypeLabel} · ${entry.title || "제목 없음"}</strong>
      <span>${entry.location || "위치 미입력"} / ${entry.trade || "공종 미입력"} / ${entry.status}</span>
      <span>${entry.date || "날짜 미입력"}${entry.photo ? ` / 사진: ${entry.photo.name}` : ""}</span>
    </article>
  `).join("");
}

function showToast(message) {
  const toast = document.getElementById("mobileToast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function setDefaultDate() {
  const dateInput = document.querySelector("input[name='date']");
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

function setupMobileInputPage() {
  document.querySelectorAll(".action-button").forEach(button => {
    button.addEventListener("click", () => setEntryType(button.dataset.entryType));
  });

  document.getElementById("mobileInputForm").addEventListener("submit", event => {
    event.preventDefault();
    const entry = makeEntry(new FormData(event.currentTarget));
    const entries = readEntries();
    entries.push(entry);
    writeEntries(entries);
    renderRecentEntries();
    event.currentTarget.reset();
    setDefaultDate();
    showToast("모바일 입력 데이터가 임시 저장되었습니다.");
  });

  document.getElementById("clearEntries").addEventListener("click", () => {
    writeEntries([]);
    renderRecentEntries();
    showToast("임시 저장 데이터가 초기화되었습니다.");
  });

  setDefaultDate();
  setEntryType(selectedEntryType);
  renderRecentEntries();
}

window.mobileQualityInputStore = {
  schema: mobileInputSchema,
  readEntries,
  writeEntries
};

document.addEventListener("DOMContentLoaded", setupMobileInputPage);
