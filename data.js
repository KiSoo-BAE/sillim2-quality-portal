const qualityPortalData = {
  readyMix: {
    title: "콘크리트 타설현황",
    eyebrow: "READY-MIX PLACEMENT STATUS",
    description: "콘크리트 타설일자, 규격, 타설위치, 물량과 제조사를 조회합니다.",
    columns: ["No.", "타설일자", "규격", "타설위치", "물량", "제조사", "회차", "비고"],
    rows: []
  },
  materialArch: {
    title: "자재승인(건축)",
    eyebrow: "ARCHITECTURE MATERIAL APPROVAL",
    description: "건축 자재 승인 상태, 규격과 판정을 조회합니다.",
    columns: ["No.", "자재명", "업체명", "공종", "제출일", "승인일", "상태", "비고"],
    rows: []
  },
  materialCivil: {
    title: "자재승인(토목)",
    eyebrow: "CIVIL MATERIAL APPROVAL",
    description: "토목 자재 승인, 성적서 제출 여부와 상태를 조회합니다.",
    columns: ["No.", "자재명", "업체명", "공종", "제출일", "승인일", "상태", "비고"],
    rows: []
  },
  materialLandscape: {
    title: "자재승인(조경)",
    eyebrow: "LANDSCAPE MATERIAL APPROVAL",
    description: "조경 자재 승인과 샘플 확인 현황을 조회합니다.",
    columns: ["No.", "자재명", "업체명", "공종", "제출일", "승인일", "상태", "비고"],
    rows: []
  },
  compressive: {
    title: "콘크리트 압축강도",
    eyebrow: "CONCRETE COMPRESSIVE STRENGTH",
    description: "재령별 압축강도 시험 결과와 판정을 조회합니다.",
    columns: ["타설일자", "시험일자", "재령", "타설부위", "설계강도", "시험강도", "판정"],
    rows: []
  },
  requestTest: {
    title: "의뢰시험현황",
    eyebrow: "REQUESTED TEST STATUS",
    description: "외부 의뢰시험 진행상태와 결과 수령 여부를 조회합니다.",
    columns: ["의뢰일", "시험명", "의뢰기관", "결과수령일", "진행상태", "판정"],
    rows: []
  },
  nonconformity: {
    title: "품질부적합사항",
    eyebrow: "NONCONFORMANCE STATUS",
    description: "품질부적합 발생, 조치 담당, 조치예정 및 조치완료 상태를 추적합니다.",
    columns: ["발생일", "위치", "공종", "부적합 내용", "조치담당", "조치예정일", "조치완료일", "상태"],
    rows: []
  }
};

const qualityPortalStorageKeys = {
  // Same browser/device sync uses localStorage. Cross-device sync can later be
  // replaced with Google Sheets, Apps Script, or another backend API.
  compressionStrength: "qualityPortal_compressionStrengthData",
  concretePour: "qualityPortal_concretePourData",
  materialApprovalArchitecture: "qualityPortal_materialApproval_architecture",
  materialApprovalCivil: "qualityPortal_materialApproval_civil",
  materialApprovalLandscape: "qualityPortal_materialApproval_landscape"
};

window.qualityPortalStorageKeys = qualityPortalStorageKeys;
