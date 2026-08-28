import assert from "node:assert/strict";
import test from "node:test";
import { createHomeHeadline, createHomePlanCards, type HomePlanInput } from "./home-plan-card.ts";

const TODAY = "2026-05-10";

const base: HomePlanInput = {
  crops: [
    { id: "lettuce", name: "상추", familyName: "국화과", category: "leaf", difficulty: "easy", plantingMaterial: "seedling", supportedSpaces: ["balcony"], plantingPeriod: { startMonth: 4, endMonth: 4, label: "" }, harvestPeriod: { startMonth: 5, endMonth: 6, label: "" }, plantSpacingCm: 25, minPotDepthCm: 15, sunRequirement: "partial", needsSupport: false, summary: "", sourceId: "" },
    { id: "spinach", name: "시금치", familyName: "명아주과", category: "leaf", difficulty: "easy", plantingMaterial: "seed", supportedSpaces: ["balcony"], plantingPeriod: { startMonth: 3, endMonth: 4, label: "" }, harvestPeriod: { startMonth: 5, endMonth: 5, label: "" }, plantSpacingCm: 5, minPotDepthCm: 15, sunRequirement: "partial", needsSupport: false, summary: "", sourceId: "" },
  ],
  cropImages: { lettuce: "/figma/image3.webp" },
  layouts: [],
  placements: [
    { seasonId: "s1", cropId: "lettuce", quantity: 6 },
    { seasonId: "s1", cropId: "spinach", quantity: 4 },
  ],
  records: [
    { id: "r1", seasonId: "s1", type: "growth", occurredAt: "2026-05-08T09:00:00Z", notes: "본잎이 올라왔어요", quantity: null, unit: null, photoUrl: null, version: 1, createdAt: "", updatedAt: "" },
    { id: "r2", seasonId: "s1", type: "work", occurredAt: "2026-05-01T09:00:00Z", notes: "흙 보충", quantity: null, unit: null, photoUrl: null, version: 1, createdAt: "", updatedAt: "" },
  ],
  seasons: [
    { id: "s1", spaceId: "sp1", name: "봄 잎채소", startDate: "2026-05-01", endDate: "2026-07-30", notes: "", featuredCropId: null, createdAt: "" },
    { id: "s2", spaceId: "sp2", name: "여름 계획", startDate: "2026-06-20", endDate: "2026-09-20", notes: "", featuredCropId: "spinach", createdAt: "" },
  ],
  spaceLabels: { balcony: "베란다", indoor: "실내 화분", garden: "마당·텃밭" },
  spaces: [
    { id: "sp1", name: "남향 베란다", type: "balcony", sunlight: "full", widthCm: 60, lengthCm: 20, depthCm: 25, address: null, latitude: null, longitude: null, orientation: null, shadeLevel: null, estimatedSunlightHours: null, notes: "", version: 1, createdAt: "", updatedAt: "" },
    { id: "sp2", name: "거실 선반", type: "indoor", sunlight: "low", widthCm: 40, lengthCm: 20, depthCm: 20, address: null, latitude: null, longitude: null, orientation: null, shadeLevel: null, estimatedSunlightHours: null, notes: "", version: 1, createdAt: "", updatedAt: "" },
  ],
  tasks: [
    { id: "t1", seasonId: "s1", cropId: "lettuce", type: "watering", title: "상추 물주기", dueDate: "2026-05-08", notes: "", status: "pending", completedAt: null, version: 1, createdAt: "", updatedAt: "" },
    { id: "t2", seasonId: "s1", cropId: "lettuce", type: "harvest", title: "상추 수확", dueDate: "2026-05-20", notes: "", status: "pending", completedAt: null, version: 1, createdAt: "", updatedAt: "" },
    { id: "t3", seasonId: "s1", cropId: null, type: "other", title: "완료된 일", dueDate: "2026-05-02", notes: "", status: "completed", completedAt: "2026-05-02", version: 1, createdAt: "", updatedAt: "" },
  ],
  today: TODAY,
};

test("진행 중인 계획이 앞에 온다", () => {
  const cards = createHomePlanCards(base);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].seasonId, "s1");
  assert.equal(cards[0].status, "active");
  assert.equal(cards[1].status, "planned");
});

test("실제 배치된 작물과 포기 수만 카드에 담긴다", () => {
  const [card] = createHomePlanCards(base);
  assert.deepEqual(card.crops.map((crop) => [crop.name, crop.quantity]), [["상추", 6], ["시금치", 4]]);
  assert.equal(card.crops[0].image, "/figma/image3.webp");
  assert.equal(card.crops[1].image, null, "이미지가 없는 작물은 null 이어야 한다");
});

test("배치가 없고 대표 작물만 있으면 수량 없이 그 작물만 보여 준다", () => {
  const [, planned] = createHomePlanCards(base);
  assert.deepEqual(planned.crops, [{ cropId: "spinach", name: "시금치", image: null, quantity: null }]);
});

test("재배 일수와 진행률은 실제 날짜로 계산한다", () => {
  const [card] = createHomePlanCards(base);
  assert.equal(card.growingDay, 10);
  assert.ok(card.progress > 0 && card.progress < 100);
});

test("아직 시작 전인 계획은 재배 일수가 없다", () => {
  const [, planned] = createHomePlanCards(base);
  assert.equal(planned.growingDay, null);
});

test("가장 가까운 미완료 작업만 다음 할 일로 쓴다", () => {
  const [card] = createHomePlanCards(base);
  assert.equal(card.nextTask?.title, "상추 물주기");
  assert.equal(card.nextTask?.inDays, -2, "기한이 지난 작업은 음수 일수");
});

test("기한 지난 작업이 있을 때만 경고 수가 잡힌다", () => {
  const [card, planned] = createHomePlanCards(base);
  assert.equal(card.overdueCount, 1);
  assert.equal(planned.overdueCount, 0);
});

test("실제 저장된 최신 메모만 쓰고, 없으면 null 이다", () => {
  const [card, planned] = createHomePlanCards(base);
  assert.equal(card.latestNote?.text, "본잎이 올라왔어요");
  assert.equal(planned.latestNote, null);
});

test("배치 링크는 공간 종류에 따라 갈린다", () => {
  const [card, planned] = createHomePlanCards(base);
  assert.equal(card.placementHref, "/seasons/s1/placements");
  assert.equal(planned.placementHref, "/seasons/s2/placements");

  const gardenCards = createHomePlanCards({
    ...base,
    spaces: [{ ...base.spaces[0], type: "garden" }, base.spaces[1]],
  });
  assert.equal(gardenCards[0].placementHref, "/seasons/s1/layout");
});

test("상단 문구는 시스템이 아는 사실만 말한다", () => {
  const cards = createHomePlanCards(base);
  assert.equal(createHomeHeadline([], 0), "아직 시작한 재배 계획이 없어요.");
  assert.equal(createHomeHeadline(cards, 2), "오늘 해야 할 일이 2개 있어요.");
  assert.equal(createHomeHeadline(cards, 0), "1개의 재배를 진행하고 있어요.");
});
