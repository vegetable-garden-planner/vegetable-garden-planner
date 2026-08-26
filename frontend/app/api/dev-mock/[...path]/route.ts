/* ==================================================================
   ⚠️ 개발용 임시 파일 — 디자인 확인 전용 (TEMPORARY / DEV ONLY)

   localhost에서 Google/Kakao OAuth 없이 로그인 이후 화면
   (/dashboard, /spaces, /seasons, /crops, /plans …)의 UI를 보기 위한
   가짜 API 응답기다.

   ------------------------------------------------------------------
   동작 조건 (셋 다 만족해야만 응답한다)
     1) process.env.NODE_ENV !== "production"
     2) next.config.ts 의 dev 전용 rewrite 블록이 살아 있을 것
        (DEV_MOCK_AUTH=off 로 실행하면 기존 /api/v1 → 실제 backend 로 나간다)
     3) 요청이 로컬(127.0.0.1 / localhost)에서 온 것
   production 빌드에서는 어떤 경로로 들어와도 404만 돌려준다.

   ------------------------------------------------------------------
   지우는 방법 (원상복구)
     1) 이 폴더 통째로 삭제:  frontend/app/api/dev-mock/
     2) next.config.ts 의 "개발용 임시 블록" if 문 삭제
   그러면 기존 로그인·API 코드는 손댄 곳이 없으므로 완전히 원래대로 돌아간다.

   기존 인증 코드(features/auth/**), api-client, next.config 의 backend rewrite,
   backend 자체는 한 줄도 수정하지 않았다. 데이터는 전부 이 파일 안의
   메모리 값이며 서버를 끄면 사라진다. 운영 DB는 건드리지 않는다.
   ================================================================== */

import { NextResponse, type NextRequest } from "next/server";
import { CROP_REFERENCES, CROP_SOURCES } from "@/features/crop-catalog/data/crop-references";

const DEV_ONLY = process.env.NODE_ENV !== "production";

/* ------------------------------------------------------------------ 날짜 */
const DAY = 86_400_000;
const now = () => new Date();
const iso = (offsetDays: number, hour = 9) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const dateOnly = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

/* -------------------------------------------------------- 가짜 로그인 사용자 */
const USER = {
  id: "dev-user-0001",
  email: "dev@simeobom.local",
  nickname: "디자인 확인",
  role: "member",
  createdAt: iso(-120),
};

/* ------------------------------------------------------------ 가짜 재배 공간 */
const SPACES = [
  {
    id: "space-balcony",
    name: "남향 베란다",
    type: "balcony",
    sunlight: "partial",
    widthCm: 180,
    lengthCm: 60,
    depthCm: 25,
    address: "서울특별시 마포구 월드컵북로 120",
    latitude: 37.5665,
    longitude: 126.978,
    orientation: "south",
    shadeLevel: "some",
    estimatedSunlightHours: 4.5,
    notes: "오전에 해가 길게 들어오는 자리예요.",
    version: 1,
    createdAt: iso(-90),
    updatedAt: iso(-12),
  },
  {
    id: "space-window",
    name: "거실 창가 선반",
    type: "indoor",
    sunlight: "low",
    widthCm: 90,
    lengthCm: 30,
    depthCm: 20,
    address: null,
    latitude: null,
    longitude: null,
    orientation: "east",
    shadeLevel: "heavy",
    estimatedSunlightHours: 2,
    notes: "",
    version: 1,
    createdAt: iso(-40),
    updatedAt: iso(-5),
  },
];

/* -------------------------------------------------------------- 가짜 시즌 */
const SEASONS = [
  {
    id: "season-spring",
    spaceId: "space-balcony",
    name: "봄 잎채소 시즌",
    startDate: dateOnly(-30),
    endDate: dateOnly(35),
    notes: "상추와 시금치 위주로 짧게 돌려 심는 중.",
    featuredCropId: "lettuce",
    status: "active",
    version: 3,
    createdAt: iso(-32),
    updatedAt: iso(-2),
  },
  {
    id: "season-summer",
    spaceId: "space-window",
    name: "실내 잎채소 시즌",
    startDate: dateOnly(14),
    endDate: dateOnly(120),
    notes: "",
    featuredCropId: "spinach",
    status: "planned",
    version: 1,
    createdAt: iso(-6),
    updatedAt: iso(-6),
  },
];

/* -------------------------------------------------------------- 가짜 일정 */
const TASKS = [
  task("task-1", "season-spring", "lettuce", "watering", "상추 물주기", -1, "pending"),
  task("task-2", "season-spring", "lettuce", "fertilizing", "웃거름 주기", 0, "pending"),
  task("task-3", "season-spring", "spinach", "harvest", "시금치 솎아내기", 3, "pending"),
  task("task-4", "season-spring", "lettuce", "sowing", "상추 2차 파종", 9, "pending"),
  task("task-5", "season-spring", "lettuce", "transplanting", "모종 옮겨심기", -8, "completed"),
  task("task-6", "season-summer", "spinach", "sowing", "대파 씨앗 준비", 16, "pending"),
];

function task(
  id: string,
  seasonId: string,
  cropId: string,
  type: string,
  title: string,
  dueInDays: number,
  status: "pending" | "completed",
) {
  return {
    id,
    seasonId,
    cropId,
    type,
    title,
    dueDate: dateOnly(dueInDays),
    notes: "",
    status,
    completedAt: status === "completed" ? iso(dueInDays) : null,
    version: 1,
    createdAt: iso(-20),
    updatedAt: iso(-20),
  };
}

/* ------------------------------------------------------------- 가짜 물주기 */
const WATERING = [
  {
    id: "water-1",
    seasonId: "season-spring",
    cropId: "lettuce",
    intervalDays: 2,
    nextWateringAt: iso(0, 8),
    enabled: true,
    version: 2,
    createdAt: iso(-25),
    updatedAt: iso(-1),
  },
  {
    id: "water-2",
    seasonId: "season-spring",
    cropId: "spinach",
    intervalDays: 3,
    nextWateringAt: iso(2, 8),
    enabled: true,
    version: 1,
    createdAt: iso(-20),
    updatedAt: iso(-2),
  },
];

/* -------------------------------------------------------------- 가짜 기록 */
const RECORDS = [
  record("rec-1", "harvest", -2, "상추 겉잎을 조금 솎아 수확했어요.", 120, "g"),
  record("rec-2", "growth", -5, "본잎이 네 장까지 올라왔어요."),
  record("rec-3", "watering", -1, "겉흙이 말라 물을 충분히 주었어요."),
  record("rec-4", "work", -9, "화분 자리를 창가 쪽으로 옮겼어요."),
];

function record(
  id: string,
  type: string,
  daysAgo: number,
  notes: string,
  quantity: number | null = null,
  unit: string | null = null,
) {
  return {
    id,
    seasonId: "season-spring",
    type,
    occurredAt: iso(daysAgo, 17),
    notes,
    quantity,
    unit,
    photoUrl: null,
    version: 1,
    createdAt: iso(daysAgo, 17),
    updatedAt: iso(daysAgo, 17),
  };
}

/* -------------------------------------------------------- 가짜 화분 배치 */
const PLACEMENTS = [
  { id: "pl-1", seasonId: "season-spring", spaceId: "space-balcony", cropId: "lettuce", quantity: 8, position: { order: 0 } },
  { id: "pl-2", seasonId: "season-spring", spaceId: "space-balcony", cropId: "spinach", quantity: 3, position: { order: 1 } },
  { id: "pl-3", seasonId: "season-summer", spaceId: "space-window", cropId: "spinach", quantity: 2, position: { order: 0 } },
];

const LAYOUTS = [
  {
    seasonId: "season-spring",
    spaceId: "space-balcony",
    spaceWidthCm: 180,
    spaceLengthCm: 60,
    cellSizeCm: 15,
    columns: 12,
    rows: 4,
    placements: [
      { cellIndex: 0, cropId: "lettuce" },
      { cellIndex: 1, cropId: "lettuce" },
      { cellIndex: 13, cropId: "spinach" },
    ],
    version: 2,
    updatedAt: iso(-3),
  },
];

/* ------------------------------------------------------------------ 라우팅 */
function respond(path: string, method: string): NextResponse | null {
  const route = `${method} ${path}`;

  // --- 인증 -------------------------------------------------------
  if (route === "GET v1/me") return ok(USER);
  if (route === "POST v1/auth/login") return ok({ user: USER });
  if (route === "POST v1/auth/register") return ok({ user: USER });
  if (route === "POST v1/auth/logout") return empty();
  if (route === "DELETE v1/me") return empty();
  if (route === "POST v1/auth/email-availability") return ok({ available: true });

  // --- 목록 -------------------------------------------------------
  if (route === "GET v1/spaces") return ok(SPACES);
  if (route === "GET v1/seasons") return ok(SEASONS);
  if (route === "GET v1/crops") return ok(CROP_REFERENCES);
  if (route === "GET v1/crop-sources") return ok(CROP_SOURCES);
  if (route === "GET v1/tasks") return ok(TASKS);
  if (route === "GET v1/watering-schedules") return ok(WATERING);
  if (route === "GET v1/records") return ok(RECORDS);
  if (route === "GET v1/container-placements") return ok(PLACEMENTS);
  if (route === "GET v1/layouts") return ok(LAYOUTS);

  // --- 시즌 하위 --------------------------------------------------
  const season = /^v1\/seasons\/([^/]+)\/(.+)$/.exec(path);
  if (method === "GET" && season) {
    const [, seasonId, sub] = season;
    if (sub.startsWith("records")) return ok(RECORDS.filter((r) => r.seasonId === seasonId));
    if (sub.startsWith("watering-schedules")) return ok(WATERING.filter((w) => w.seasonId === seasonId));
    if (sub.startsWith("tasks")) return ok(TASKS.filter((t) => t.seasonId === seasonId));
    if (sub.startsWith("container-placements")) {
      return ok({ seasonId, placements: PLACEMENTS.filter((p) => p.seasonId === seasonId), version: 1 });
    }
    if (sub.startsWith("layout")) {
      return ok(LAYOUTS.find((l) => l.seasonId === seasonId) ?? LAYOUTS[0]);
    }
    if (sub.startsWith("summary")) {
      return ok({
        seasonId,
        status: SEASONS.find((s) => s.id === seasonId)?.status ?? "active",
        recordCounts: { work: 1, growth: 1, harvest: 1, watering: 1 },
        harvestTotals: [{ unit: "g", quantity: 120 }],
        taskCompletion: { total: 5, completed: 1, rate: 0.2 },
        generatedAt: now().toISOString(),
      });
    }
  }

  // --- 공간 메모 --------------------------------------------------
  if (method === "GET" && /^v1\/spaces\/[^/]+\/memos/.test(path)) return ok([]);

  // --- 기타 -------------------------------------------------------
  if (path.startsWith("v1/subscriptions/me")) return fail(404, "구독이 없습니다.");
  if (path.startsWith("v1/locations/geocode")) {
    return ok({ latitude: 37.5665, longitude: 126.978, address: "서울특별시 마포구" });
  }
  if (path.startsWith("v1/push-subscriptions")) return empty();

  // 쓰기 요청은 화면이 깨지지 않을 만큼만 성공으로 돌려준다 (저장되지는 않는다)
  if (method !== "GET") return empty();

  return null;
}

/* ------------------------------------------------------------------ 응답 */
function ok(data: unknown) {
  return NextResponse.json({ data });
}

function empty() {
  return new NextResponse(null, { status: 204 });
}

function fail(status: number, message: string) {
  return NextResponse.json({ error: { code: "DEV_MOCK", message } }, { status });
}

function isLocalRequest(request: NextRequest): boolean {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!DEV_ONLY || !isLocalRequest(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { path } = await context.params;
  const joined = path.join("/");

  // CSRF 쿠키 흉내 — 폼 저장 버튼이 쿠키를 찾다가 터지지 않게 한다
  if (joined === "csrf") {
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set("XSRF-TOKEN", "dev-mock-token", { path: "/", httpOnly: false });
    return response;
  }

  const response = respond(joined, request.method);
  if (response) return response;

  return fail(404, `dev-mock에 준비되지 않은 경로입니다: ${request.method} /${joined}`);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
