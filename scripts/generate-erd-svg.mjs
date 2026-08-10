import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(projectRoot, "docs", "ERD.md");
const source = await readFile(sourcePath, "utf8");

const diagrams = [...source.matchAll(/```mermaid\s+erDiagram([\s\S]*?)```/g)].map(
  (match) => match[1],
);

if (diagrams.length !== 3) {
  throw new Error(`ERD Mermaid 블록은 3개여야 합니다. 현재: ${diagrams.length}개`);
}

const outputs = ["erd-core.svg", "erd-records.svg", "erd-extensions.svg"];

for (const [index, diagram] of diagrams.entries()) {
  const parsed = parseDiagram(diagram);
  const svg = renderDiagram(parsed, index);
  await writeFile(path.join(projectRoot, "docs", outputs[index]), svg, "utf8");
}

const firstRelease = {
  entities: [
    entity("REGIONS", "bigint id PK", "string name UK"),
    entity("USERS", "bigint id PK", "bigint region_id FK", "string email UK", "string password", "string nickname", "string role", "string status"),
    entity("GARDENS", "bigint id PK", "bigint owner_id FK", "bigint region_id FK", "string name", "decimal width", "decimal height", "decimal cell_size", "string environment"),
    entity("SEASONS", "bigint id PK", "bigint garden_id FK", "string name", "date start_date", "date end_date", "string status"),
    entity("TASK_TYPES", "bigint id PK", "string name UK", "string icon"),
    entity("CROP_FAMILIES", "bigint id PK", "string name UK", "int rotation_years"),
    entity("CROPS", "bigint id PK", "bigint family_id FK", "string name UK", "string difficulty", "text description"),
    entity("PLANTINGS", "bigint id PK", "bigint season_id FK", "bigint crop_id FK", "int start_x", "int start_y", "int width", "int height"),
    entity("TASKS", "bigint id PK", "bigint season_id FK", "bigint planting_id FK", "bigint task_type_id FK", "date due_date", "string status"),
    entity("TASK_COMPLETIONS", "bigint id PK", "bigint task_id FK", "bigint user_id FK", "datetime completed_at", "text memo"),
    entity("CULTIVATION_RULES", "bigint id PK", "bigint crop_id FK", "bigint region_id FK", "string environment", "date sowing_start", "date sowing_end"),
    entity("PLANT_SPACING_RULES", "bigint id PK", "bigint crop_id FK,UK", "decimal plant_spacing", "decimal row_spacing"),
    entity("PLANTING_DETAILS", "bigint id PK", "bigint planting_id FK,UK", "int quantity", "date sowing_date", "date transplant_date", "date harvest_start"),
    entity("WATERING_SCHEDULES", "bigint id PK", "bigint planting_id FK,UK", "int interval_days", "datetime next_watering_at", "boolean enabled"),
    entity("WATERING_LOGS", "bigint id PK", "bigint planting_id FK", "bigint user_id FK", "datetime watered_at", "decimal amount", "text memo"),
  ],
  relations: [
    relation("REGIONS", "USERS", "사용 지역"),
    relation("REGIONS", "GARDENS", "텃밭 지역"),
    relation("REGIONS", "CULTIVATION_RULES", "지역별 규칙"),
    relation("USERS", "GARDENS", "소유"),
    relation("GARDENS", "SEASONS", "재배 시즌"),
    relation("CROP_FAMILIES", "CROPS", "작물 과"),
    relation("CROPS", "CULTIVATION_RULES", "재배 규칙"),
    relation("CROPS", "PLANT_SPACING_RULES", "재식 간격", "||", "o|"),
    relation("SEASONS", "PLANTINGS", "작물 배치"),
    relation("CROPS", "PLANTINGS", "배치 작물"),
    relation("PLANTINGS", "PLANTING_DETAILS", "수량·날짜", "||", "o|"),
    relation("SEASONS", "TASKS", "재배 일정"),
    relation("PLANTINGS", "TASKS", "대상 작물"),
    relation("TASK_TYPES", "TASKS", "작업 종류"),
    relation("TASKS", "TASK_COMPLETIONS", "완료 기록"),
    relation("PLANTINGS", "WATERING_SCHEDULES", "물주기 일정", "||", "o|"),
    relation("PLANTINGS", "WATERING_LOGS", "물주기 기록"),
  ],
};

await writeFile(
  path.join(projectRoot, "docs", "erd-first-release.svg"),
  renderDiagram(firstRelease, 3),
  "utf8",
);

function entity(name, ...attributes) {
  return { name, attributes };
}

function relation(from, to, label, fromCardinality = "||", toCardinality = "o{") {
  return { from, to, label, fromCardinality, toCardinality };
}

function parseDiagram(diagram) {
  const entities = [];
  const relations = [];
  const lines = diagram.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    const entityMatch = trimmed.match(/^([A-Z][A-Z0-9_]*)\s*\{$/);

    if (entityMatch) {
      const attributes = [];
      index += 1;

      while (index < lines.length && lines[index].trim() !== "}") {
        const attribute = lines[index].trim();
        if (attribute) attributes.push(attribute);
        index += 1;
      }

      entities.push({ name: entityMatch[1], attributes });
      continue;
    }

    const relationMatch = trimmed.match(
      /^([A-Z][A-Z0-9_]*)\s+([|o}{]+)--([|o}{]+)\s+([A-Z][A-Z0-9_]*)\s*:\s*(.+)$/,
    );

    if (relationMatch) {
      relations.push({
        from: relationMatch[1],
        fromCardinality: relationMatch[2],
        toCardinality: relationMatch[3],
        to: relationMatch[4],
        label: relationMatch[5],
      });
    }
  }

  return { entities, relations };
}

function renderDiagram({ entities, relations }, diagramIndex) {
  const columns = diagramIndex === 0 || diagramIndex === 3 ? 5 : 4;
  const boxWidth = diagramIndex === 0 ? 310 : diagramIndex === 3 ? 340 : 330;
  const headerHeight = 34;
  const rowHeight = 24;
  const gapX = 110;
  const gapY = 70;
  const margin = 45;
  const positions = new Map();
  const rowHeights = [];

  entities.forEach((entity, index) => {
    const row = Math.floor(index / columns);
    const boxHeight = headerHeight + Math.max(entity.attributes.length, 1) * rowHeight;
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, boxHeight);
  });

  const rowOffsets = [];
  rowHeights.reduce((offset, height, index) => {
    rowOffsets[index] = offset;
    return offset + height + gapY;
  }, margin);

  entities.forEach((entity, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions.set(entity.name, {
      x: margin + column * (boxWidth + gapX),
      y: rowOffsets[row],
      width: boxWidth,
      height: headerHeight + Math.max(entity.attributes.length, 1) * rowHeight,
    });
  });

  const width = margin * 2 + columns * boxWidth + (columns - 1) * gapX;
  const height =
    margin +
    rowHeights.reduce((total, rowHeightValue) => total + rowHeightValue, 0) +
    Math.max(rowHeights.length - 1, 0) * gapY +
    margin;

  const relationMarkup = relations
    .map((relation, relationIndex) =>
      renderRelation(relation, relationIndex, positions),
    )
    .join("\n");
  const entityMarkup = entities
    .map((entity) => renderEntity(entity, positions.get(entity.name), headerHeight, rowHeight))
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">심어봄 데이터베이스 ERD</title>
  <desc id="desc">테이블의 주요 컬럼과 일대일, 일대다 관계를 표시한 엔터티 관계도</desc>
  <defs>
    <marker id="one" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
      <path d="M6 1V11" stroke="#374151" stroke-width="1.5" fill="none"/>
    </marker>
    <marker id="many" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
      <path d="M10 6L1 1M10 6L1 6M10 6L1 11" stroke="#374151" stroke-width="1.25" fill="none"/>
    </marker>
    <marker id="optional" viewBox="0 0 12 12" refX="6" refY="6" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
      <circle cx="6" cy="6" r="4" stroke="#374151" stroke-width="1.25" fill="#ffffff"/>
    </marker>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#111827" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <g aria-label="관계선">${relationMarkup}</g>
  <g aria-label="테이블">${entityMarkup}</g>
</svg>
`.replace(/[ \t]+$/gm, "");
}

function renderEntity(entity, position, headerHeight, rowHeight) {
  const rows = entity.attributes.length ? entity.attributes : ["(속성 생략)"];
  const attributes = rows
    .map((attribute, index) => {
      const y = position.y + headerHeight + index * rowHeight;
      const fill = index % 2 === 0 ? "#ffffff" : "#f1f5f9";
      const [type = "", name = "", ...keys] = attribute.split(/\s+/);
      const keyText = keys.join(" ");

      return `<rect x="${position.x + 1}" y="${y}" width="${position.width - 2}" height="${rowHeight}" fill="${fill}"/>
      <text x="${position.x + 10}" y="${y + 16}" font-size="12" fill="#64748b">${escapeXml(type)}</text>
      <text x="${position.x + 82}" y="${y + 16}" font-size="12" fill="#111827">${escapeXml(columnTitle(name))}</text>
      ${keyText ? `<text x="${position.x + position.width - 10}" y="${y + 16}" text-anchor="end" font-size="10" font-weight="600" fill="#9a3412">${escapeXml(keyText)}</text>` : ""}`;
    })
    .join("\n");

  return `<g filter="url(#shadow)">
    <rect x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" rx="4" fill="#ffffff" stroke="#64748b" stroke-width="1.2"/>
    <path d="M${position.x + 4} ${position.y}H${position.x + position.width - 4}Q${position.x + position.width} ${position.y} ${position.x + position.width} ${position.y + 4}V${position.y + headerHeight}H${position.x}V${position.y + 4}Q${position.x} ${position.y} ${position.x + 4} ${position.y}Z" fill="#f4b4a6"/>
    <text x="${position.x + 10}" y="${position.y + 22}" font-size="13" font-weight="600" fill="#3f3f46">${escapeXml(entityTitle(entity.name))}</text>
    ${attributes}
  </g>`;
}

function renderRelation(relation, relationIndex, positions) {
  const from = positions.get(relation.from);
  const to = positions.get(relation.to);
  if (!from || !to) return "";

  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const horizontal = Math.abs(fromCenter.x - toCenter.x) >= Math.abs(fromCenter.y - toCenter.y);
  let start;
  let end;
  let pathData;

  if (horizontal) {
    const leftToRight = fromCenter.x < toCenter.x;
    start = { x: leftToRight ? from.x + from.width : from.x, y: fromCenter.y };
    end = { x: leftToRight ? to.x : to.x + to.width, y: toCenter.y };
    const middleX = (start.x + end.x) / 2 + ((relationIndex % 3) - 1) * 8;
    pathData = `M${start.x} ${start.y}H${middleX}V${end.y}H${end.x}`;
  } else {
    const topToBottom = fromCenter.y < toCenter.y;
    start = { x: fromCenter.x, y: topToBottom ? from.y + from.height : from.y };
    end = { x: toCenter.x, y: topToBottom ? to.y : to.y + to.height };
    const middleY = (start.y + end.y) / 2 + ((relationIndex % 3) - 1) * 8;
    pathData = `M${start.x} ${start.y}V${middleY}H${end.x}V${end.y}`;
  }

  const labelX = (start.x + end.x) / 2;
  const labelY = (start.y + end.y) / 2 - 5;
  const fromMarker = markerFor(relation.fromCardinality);
  const toMarker = markerFor(relation.toCardinality);

  return `<path d="${pathData}" fill="none" stroke="#64748b" stroke-width="1.15" marker-start="url(#${fromMarker})" marker-end="url(#${toMarker})"/>
    <rect x="${labelX - 35}" y="${labelY - 10}" width="70" height="15" rx="3" fill="#f8fafc" fill-opacity="0.92"/>
    <text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="9" fill="#475569">${escapeXml(relation.label)}</text>`;
}

function markerFor(cardinality) {
  if (cardinality.includes("{")) return "many";
  if (cardinality.includes("o")) return "optional";
  return "one";
}

function entityLabels() {
  return {
  USERS: "사용자",
  CLIMATE_ZONES: "기후 구분",
  REGIONS: "지역",
  SOCIAL_ACCOUNTS: "소셜 로그인 계정",
  USER_SETTINGS: "사용자 설정",
  PASSWORD_RESET_TOKENS: "비밀번호 재설정 토큰",
  GARDENS: "텃밭",
  GARDEN_MEMBERS: "텃밭 구성원",
  SEASONS: "재배 시즌",
  SEASON_REVIEWS: "시즌 평가",
  SEASON_SNAPSHOTS: "시즌 배치 스냅샷",
  CROP_FAMILIES: "작물 과",
  CROPS: "작물",
  CROP_CATEGORIES: "작물 분류",
  CROP_CATEGORY_MAP: "작물·분류 연결",
  CULTIVATION_RULES: "재배 규칙",
  PLANT_SPACING_RULES: "재식 간격 규칙",
  WATERING_RULES: "물주기 규칙",
  CROP_SCHEDULE_TEMPLATES: "일정 생성 기준",
  CROP_SOURCES: "작물 정보 출처",
  PLANTINGS: "배치 작물",
  PLANTING_DETAILS: "배치 상세",
  PLANTING_WARNINGS: "배치 경고",
  LAYOUT_VERSIONS: "배치도 버전",
  TASK_TYPES: "작업 종류",
  TASKS: "재배 일정",
  TASK_RECURRENCES: "반복 일정",
  TASK_COMPLETIONS: "일정 완료 기록",
  WATERING_SCHEDULES: "물주기 일정",
  WATERING_LOGS: "물주기 기록",
  WATERING_SNOOZES: "물주기 미루기",
  WORK_LOGS: "작업 기록",
  GROWTH_RECORDS: "성장 기록",
  RECORD_IMAGES: "기록 사진",
  HARVEST_RECORDS: "수확 기록",
  HARVEST_IMAGES: "수확 사진",
  HARVEST_REVIEWS: "수확 평가",
  NOTIFICATIONS: "알림",
  NOTIFICATION_SETTINGS: "알림 설정",
  NOTIFICATION_LOGS: "알림 발송 기록",
  };
}

function columnLabels() {
  return {
  id: "번호",
  region_id: "지역 번호",
  climate_zone_id: "기후 구분 번호",
  owner_id: "소유자 번호",
  garden_id: "텃밭 번호",
  season_id: "시즌 번호",
  family_id: "작물 과 번호",
  crop_id: "작물 번호",
  planting_id: "배치 작물 번호",
  task_type_id: "작업 종류 번호",
  task_id: "일정 번호",
  user_id: "사용자 번호",
  email: "이메일",
  password: "비밀번호",
  nickname: "닉네임",
  role: "권한",
  status: "상태",
  notification_enabled: "알림 사용 여부",
  email_enabled: "이메일 알림 여부",
  unit: "단위",
  provider: "로그인 제공자",
  provider_user_id: "제공자 사용자 번호",
  token: "인증 토큰",
  created_at: "생성 시각",
  joined_at: "가입 시각",
  name: "이름",
  width: "가로 크기",
  height: "세로 크기",
  cell_size: "격자 크기",
  environment: "재배 환경",
  start_date: "시작일",
  end_date: "종료일",
  rotation_years: "연작 제한 연수",
  difficulty: "난이도",
  description: "설명",
  rating: "평점",
  result: "결과",
  layout_data: "배치 데이터",
  saved_at: "저장 시각",
  image: "이미지",
  category_id: "분류 번호",
  sowing_start: "파종 시작일",
  sowing_end: "파종 종료일",
  plant_spacing: "포기 간격",
  row_spacing: "줄 간격",
  growth_stage: "성장 단계",
  guide_text: "안내 내용",
  base_event: "기준 사건",
  offset_days: "기준일 차이",
  source_name: "출처 이름",
  source_url: "출처 주소",
  reviewed_at: "검토 시각",
  start_x: "시작 X 좌표",
  start_y: "시작 Y 좌표",
  quantity: "포기 수",
  sowing_date: "파종일",
  transplant_date: "정식일",
  harvest_start: "수확 시작일",
  warning_type: "경고 종류",
  level: "경고 수준",
  message: "메시지",
  resolved_at: "해결 시각",
  created_by: "작성자 번호",
  version: "버전",
  icon: "아이콘",
  due_date: "예정일",
  frequency: "반복 방식",
  interval_value: "반복 간격",
  completed_at: "완료 시각",
  memo: "메모",
  interval_days: "반복 일수",
  next_watering_at: "다음 물주기",
  enabled: "사용 여부",
  watered_at: "물을 준 시각",
  amount: "물의 양",
  original_date: "원래 예정일",
  snoozed_until: "미룬 시각",
  worked_at: "작업 시각",
  recorded_at: "기록 시각",
  condition: "상태",
  record_type: "기록 종류",
  record_id: "기록 번호",
  image_url: "이미지 주소",
  harvested_at: "수확 시각",
  quality: "품질",
  type: "유형",
  title: "제목",
  read_at: "읽은 시각",
  channel: "발송 채널",
  sent_at: "발송 시각",
  };
}

function entityTitle(name) {
  const label = entityLabels()[name];
  return label ? `${name} · ${label}` : name;
}

function columnTitle(name) {
  const label = columnLabels()[name];
  return label ? `${name} · ${label}` : name;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
