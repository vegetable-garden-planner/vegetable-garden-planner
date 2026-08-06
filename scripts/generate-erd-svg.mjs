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
  const columns = diagramIndex === 0 ? 5 : 4;
  const boxWidth = diagramIndex === 0 ? 280 : 300;
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
`;
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
      <text x="${position.x + 82}" y="${y + 16}" font-size="12" fill="#111827">${escapeXml(name)}</text>
      ${keyText ? `<text x="${position.x + position.width - 10}" y="${y + 16}" text-anchor="end" font-size="10" font-weight="600" fill="#9a3412">${escapeXml(keyText)}</text>` : ""}`;
    })
    .join("\n");

  return `<g filter="url(#shadow)">
    <rect x="${position.x}" y="${position.y}" width="${position.width}" height="${position.height}" rx="4" fill="#ffffff" stroke="#64748b" stroke-width="1.2"/>
    <path d="M${position.x + 4} ${position.y}H${position.x + position.width - 4}Q${position.x + position.width} ${position.y} ${position.x + position.width} ${position.y + 4}V${position.y + headerHeight}H${position.x}V${position.y + 4}Q${position.x} ${position.y} ${position.x + 4} ${position.y}Z" fill="#f4b4a6"/>
    <text x="${position.x + 10}" y="${position.y + 22}" font-size="13" font-weight="600" fill="#3f3f46">${escapeXml(entity.name)}</text>
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

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
