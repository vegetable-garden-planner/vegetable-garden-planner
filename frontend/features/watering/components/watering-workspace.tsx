import Link from "next/link";
import { GROWING_SPACE_LABELS } from "../../crop-catalog/data/crop-labels";
import type { CropReference } from "../../crop-catalog/domain/crop-reference";
import type { PersistedGrowingSeason } from "../../growing-season/domain/growing-season";
import type { GrowingSpace } from "../../growing-space/domain/growing-space";
import {
  getWateringScheduleStatus,
  type CompleteWateringInput,
  type WateringLog,
  type WateringSchedule,
  type WateringScheduleInput,
  type WateringScheduleUpdate,
} from "../domain/watering";
import { WateringCreateForm } from "./watering-create-form";
import type { WateringHistoryState } from "./watering-history";
import { WateringScheduleCard } from "./watering-schedule-card";
import styles from "./watering.module.css";

interface WateringWorkspaceProps {
  actionError: string;
  availableCrops: readonly CropReference[];
  busy: boolean;
  crops: readonly CropReference[];
  histories: Readonly<Record<string, WateringHistoryState>>;
  onCloseHistory: (scheduleId: string) => void;
  onComplete: (schedule: WateringSchedule, input: CompleteWateringInput) => Promise<boolean>;
  onCreate: (input: WateringScheduleInput) => Promise<boolean>;
  onDelete: (schedule: WateringSchedule) => Promise<void>;
  onLoadHistory: (scheduleId: string) => Promise<void>;
  onReopen: (schedule: WateringSchedule, log: WateringLog) => Promise<void>;
  onSnooze: (schedule: WateringSchedule, snoozedUntil: string) => Promise<boolean>;
  onUpdate: (schedule: WateringSchedule, input: WateringScheduleUpdate) => Promise<boolean>;
  placedCropCount: number;
  schedules: readonly WateringSchedule[];
  season: PersistedGrowingSeason;
  space: GrowingSpace;
}

export function WateringWorkspace(props: WateringWorkspaceProps) {
  const cropById = new Map(props.crops.map((crop) => [crop.id, crop]));
  const orderedSchedules = [...props.schedules].sort(compareSchedules);
  const statuses = orderedSchedules.map((schedule) => getWateringScheduleStatus(schedule, new Date()));
  const dueCount = statuses.filter((status) => status === "overdue" || status === "today").length;
  const activeCount = orderedSchedules.filter((schedule) => schedule.enabled).length;

  return (
    <div className={styles.page}>
      <section className={styles.overview} aria-labelledby="watering-season-title">
        <div className={styles.overviewCopy}>
          <p>현재 물주기 계획</p>
          <h2 id="watering-season-title">{props.season.name}</h2>
          <span>
            {props.space.name} · {GROWING_SPACE_LABELS[props.space.type]} · {props.season.startDate} ~ {props.season.endDate}
          </span>
          <strong>{getOverviewMessage(orderedSchedules.length, dueCount)}</strong>
        </div>
        <dl className={styles.overviewStats} aria-label="물주기 일정 현황">
          <WateringStat label="배치 작물" value={`${props.placedCropCount}종`} />
          <WateringStat label="활성 일정" value={`${activeCount}개`} />
          <WateringStat label="지금 확인" value={`${dueCount}개`} />
        </dl>
      </section>

      {props.actionError && <p className={styles.actionError} role="alert">{props.actionError}</p>}

      <div className={styles.workspace}>
        <main className={styles.mainColumn}>
          <div className={styles.sectionHeading}>
            <div><p>작물별 반복 관리</p><h2>물주기 일정</h2></div>
            <span>{orderedSchedules.length}개 일정</span>
          </div>
          {orderedSchedules.length > 0 ? (
            <ol className={styles.scheduleList}>
              {orderedSchedules.map((schedule) => (
                <WateringScheduleCard
                  crop={cropById.get(schedule.cropId)}
                  disabled={props.busy}
                  historyState={props.histories[schedule.id] ?? { status: "closed" }}
                  key={schedule.id}
                  onCloseHistory={() => props.onCloseHistory(schedule.id)}
                  onComplete={(input) => props.onComplete(schedule, input)}
                  onDelete={() => props.onDelete(schedule)}
                  onLoadHistory={() => props.onLoadHistory(schedule.id)}
                  onReopen={(log) => props.onReopen(schedule, log)}
                  onSnooze={(snoozedUntil) => props.onSnooze(schedule, snoozedUntil)}
                  onUpdate={(input) => props.onUpdate(schedule, input)}
                  schedule={schedule}
                  season={props.season}
                />
              ))}
            </ol>
          ) : (
            <WateringEmptyState
              description={props.placedCropCount === 0
                ? "격자는 있지만 배치된 작물이 없습니다. 키울 작물을 하나 이상 배치해 주세요."
                : "오른쪽 입력에서 배치 작물과 반복 간격을 정해 첫 물주기 일정을 만들어 보세요."}
              links={props.placedCropCount === 0
                ? [{ href: `/seasons/${props.season.id}/layout`, label: "작물 배치하러 가기" }]
                : []}
              title={props.placedCropCount === 0 ? "물주기 대상 작물이 없어요" : "아직 물주기 일정이 없어요"}
            />
          )}
        </main>

        <aside className={styles.sideColumn}>
          {props.availableCrops.length > 0 ? (
            <WateringCreateForm
              crops={props.availableCrops}
              disabled={props.busy}
              key={props.availableCrops.map((crop) => crop.id).join("-")}
              onCreate={props.onCreate}
              season={props.season}
            />
          ) : (
            <section className={styles.completePanel}>
              <p>{props.placedCropCount === 0 ? "일정 준비 전" : "일정 연결 완료"}</p>
              <h2>{props.placedCropCount === 0 ? "먼저 작물을 배치해 주세요" : "모든 배치 작물을 관리 중이에요"}</h2>
              <span>{props.placedCropCount === 0
                ? "텃밭 배치를 저장하면 이곳에서 작물별 반복 일정을 만들 수 있어요."
                : "새 작물을 배치하면 추가 일정 입력이 다시 나타납니다."}</span>
            </section>
          )}
          <WateringGuide seasonId={props.season.id} />
        </aside>
      </div>
    </div>
  );
}

export function WateringLoadingState() {
  return (
    <div className={styles.loading} aria-label="물주기 관리 정보를 불러오는 중" role="status">
      <div /><div className={styles.loadingGrid}><span /><span /></div>
    </div>
  );
}

export function WateringLoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <section className={styles.errorState} role="alert">
      <p>물주기 관리 정보를 불러오지 못했습니다.</p>
      <h2>{message}</h2>
      {onRetry ? <button onClick={onRetry} type="button">다시 시도</button> : <Link href="/seasons">시즌 목록으로 돌아가기</Link>}
    </section>
  );
}

export function WateringEmptyState({
  description,
  links,
  title,
}: {
  description: string;
  links: readonly { href: string; label: string }[];
  title: string;
}) {
  return (
    <section className={styles.emptyState}>
      <span aria-hidden="true">물</span>
      <p>다음 단계 안내</p>
      <h2>{title}</h2>
      <strong>{description}</strong>
      {links.length > 0 && <div>{links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</div>}
    </section>
  );
}

function WateringGuide({ seasonId }: { seasonId: string }) {
  return (
    <section className={styles.guidePanel}>
      <p>관리 가이드</p>
      <h2>식물 상태를 함께 확인하세요</h2>
      <ul>
        <li>반복 간격은 기준일이며 흙의 마름과 날씨에 따라 조절합니다.</li>
        <li>완료 기록에는 실제 물 준 시각과 양을 남길 수 있습니다.</li>
        <li>한 번 미룬 일정과 완료 취소는 이력에서 확인할 수 있습니다.</li>
      </ul>
      <nav aria-label="시즌 관련 화면">
        <Link href={`/seasons/${seasonId}/layout`}><span>배치 확인</span><strong>이동 →</strong></Link>
        <Link href={`/seasons/${seasonId}/tasks`}><span>재배 일정</span><strong>이동 →</strong></Link>
        <Link href={`/seasons/${seasonId}/records`}><span>시즌 기록</span><strong>이동 →</strong></Link>
      </nav>
    </section>
  );
}

function WateringStat({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function getOverviewMessage(scheduleCount: number, dueCount: number): string {
  if (scheduleCount === 0) return "첫 일정을 만들면 오늘 할 일을 한눈에 볼 수 있어요.";
  if (dueCount === 0) return "지금 바로 확인할 일정이 없습니다. 다음 물주기까지 식물 상태를 살펴보세요.";
  return `오늘 또는 기한이 지난 물주기 ${dueCount}개를 먼저 확인해 주세요.`;
}

function compareSchedules(left: WateringSchedule, right: WateringSchedule): number {
  return Date.parse(left.nextWateringAt) - Date.parse(right.nextWateringAt)
    || left.cropId.localeCompare(right.cropId, "ko-KR");
}
