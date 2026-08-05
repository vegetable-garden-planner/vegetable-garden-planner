export type SpaceAvailability = "none" | "indoor" | "balcony" | "outdoor";
export type Sunlight = "low" | "partial" | "full";
export type CareTime = "low" | "medium" | "high";
export type GrowingGoal = "easy" | "edible" | "flowers";

export interface DiagnosisAnswers {
  space: SpaceAvailability;
  sunlight: Sunlight;
  careTime: CareTime;
  goal: GrowingGoal;
}

export interface DiagnosisRecommendation {
  spaceType: "실내 화분" | "베란다 재배" | "마당·텃밭";
  title: string;
  description: string;
  plants: readonly string[];
  preparation: readonly string[];
}

export function isCompleteDiagnosis(
  answers: Partial<DiagnosisAnswers>,
): answers is DiagnosisAnswers {
  return Boolean(
    answers.space && answers.sunlight && answers.careTime && answers.goal,
  );
}

export function getRecommendation(
  answers: DiagnosisAnswers,
): DiagnosisRecommendation {
  if (answers.space === "outdoor") {
    return createOutdoorRecommendation(answers);
  }

  if (answers.space === "balcony") {
    return createBalconyRecommendation(answers);
  }

  return createIndoorRecommendation(answers);
}

function createIndoorRecommendation(
  answers: DiagnosisAnswers,
): DiagnosisRecommendation {
  const plants = selectIndoorPlants(answers);

  return {
    spaceType: "실내 화분",
    title: answers.space === "none" ? "작은 화분 하나로 시작해 보세요" : "창가 한쪽이면 충분해요",
    description:
      "큰 공간 없이도 시작할 수 있어요. 햇빛이 드는 위치를 먼저 확인하고 관리하기 쉬운 식물 한두 개부터 키워보세요.",
    plants,
    preparation: ["지름 15~20cm 화분", "분갈이용 배양토", "물받침", "물주기 기록"],
  };
}

function createBalconyRecommendation(
  answers: DiagnosisAnswers,
): DiagnosisRecommendation {
  const plants = selectBalconyPlants(answers);

  return {
    spaceType: "베란다 재배",
    title: "화분 두세 개로 작은 베란다 정원을 시작해 보세요",
    description:
      "베란다의 햇빛 방향과 바람을 확인하면 잎채소와 허브도 충분히 키울 수 있어요. 이동할 수 있는 화분부터 시작하는 것이 안전해요.",
    plants,
    preparation: ["배수 구멍이 있는 화분", "채소·허브용 배양토", "물조리개", "햇빛 위치 확인"],
  };
}

function createOutdoorRecommendation(
  answers: DiagnosisAnswers,
): DiagnosisRecommendation {
  const plants = selectOutdoorPlants(answers);

  return {
    spaceType: "마당·텃밭",
    title: "작은 구역부터 텃밭 계획을 시작해 보세요",
    description:
      "처음부터 전체 공간을 채우기보다 관리할 수 있는 구역만 정하세요. 작물 간격과 계절을 확인하면 시행착오를 줄일 수 있어요.",
    plants,
    preparation: ["재배 구역 크기 측정", "지역과 일조 시간 확인", "배양토 또는 퇴비", "작물 배치 계획"],
  };
}

function selectIndoorPlants(answers: DiagnosisAnswers): readonly string[] {
  if (answers.sunlight === "low") {
    return answers.goal === "edible" ? ["새싹채소", "쪽파"] : ["스킨답서스", "테이블야자"];
  }

  if (answers.goal === "flowers") {
    return ["제라늄", "미니 장미"];
  }

  if (answers.goal === "edible") {
    return answers.careTime === "low" ? ["쪽파", "로즈마리"] : ["바질", "루꼴라"];
  }

  return ["스킨답서스", "로즈마리"];
}

function selectBalconyPlants(answers: DiagnosisAnswers): readonly string[] {
  if (answers.sunlight === "low") {
    return answers.goal === "flowers" ? ["베고니아", "임파첸스"] : ["쪽파", "새싹채소"];
  }

  if (answers.goal === "flowers") {
    return ["메리골드", "페튜니아"];
  }

  return answers.careTime === "low" ? ["로즈마리", "쪽파"] : ["상추", "바질"];
}

function selectOutdoorPlants(answers: DiagnosisAnswers): readonly string[] {
  if (answers.sunlight === "low") {
    return answers.goal === "flowers" ? ["아스틸베", "수국"] : ["부추", "깻잎"];
  }

  if (answers.goal === "flowers") {
    return ["메리골드", "백일홍"];
  }

  return answers.careTime === "low" ? ["상추", "열무"] : ["상추", "방울토마토"];
}
