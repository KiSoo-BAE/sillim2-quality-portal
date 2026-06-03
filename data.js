const qualityPortalData = {
  readyMix: {
    title: "레미콘 타설현황",
    eyebrow: "READY-MIX PLACEMENT STATUS",
    description: "레미콘 타설 이력, 위치, 설계강도, 제조사와 타설 상태를 조회합니다.",
    columns: ["타설일자", "동", "층", "타설부위", "설계강도", "제조사", "타설량", "상태"],
    rows: []
  },
  materialArch: {
    title: "자재공급원승인(건축)",
    eyebrow: "ARCHITECTURE MATERIAL APPROVAL",
    description: "건축 자재 공급원 승인 상태, 규격과 판정을 조회합니다.",
    columns: ["자재명", "규격", "제조사", "승인일", "적용공종", "승인상태", "판정"],
    rows: []
  },
  materialCivil: {
    title: "자재공급원승인(토목)",
    eyebrow: "CIVIL MATERIAL APPROVAL",
    description: "토목 자재 공급원 승인, 성적서 제출 여부와 상태를 조회합니다.",
    columns: ["자재명", "규격", "제조사", "승인일", "적용공종", "승인상태", "판정"],
    rows: []
  },
  materialLandscape: {
    title: "자재공급원승인(조경)",
    eyebrow: "LANDSCAPE MATERIAL APPROVAL",
    description: "조경 자재 공급원 승인과 샘플 확인 현황을 조회합니다.",
    columns: ["자재명", "규격", "제조사", "승인일", "적용공종", "승인상태", "판정"],
    rows: []
  },
  compressive: {
    title: "콘크리트압축강도",
    eyebrow: "CONCRETE COMPRESSIVE STRENGTH",
    description: "재령별 압축강도 시험 결과와 판정을 조회합니다.",
    columns: ["타설일자", "시험일자", "재령", "동", "층", "타설부위", "설계강도", "시험강도", "판정"],
    rows: []
  },
  requestTest: {
    title: "의뢰시험현황",
    eyebrow: "REQUESTED TEST STATUS",
    description: "외부 의뢰시험 진행상태와 결과 수령 여부를 조회합니다.",
    columns: ["의뢰일", "시험명", "의뢰기관", "시험예정일", "결과수령일", "진행상태", "판정"],
    rows: []
  },
  nonconformity: {
    title: "품질부적합사항",
    eyebrow: "NONCONFORMANCE STATUS",
    description: "품질부적합 발생, 조치 담당, 조치완료 및 재발방지대책을 추적합니다.",
    columns: ["발생일", "위치", "공종", "부적합 내용", "조치담당", "조치예정일", "조치완료일", "상태", "재발방지대책"],
    rows: []
  }
};
