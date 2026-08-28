import Link from "next/link";
import type {
  DashboardAlert,
  DashboardAlertSummary,
  DashboardAlertUrgency,
} from "../domain/dashboard-alert";

const URGENCY_STYLES: Record<DashboardAlertUrgency, string> = {
  overdue: "border-red-200 bg-red-50 text-red-800",
  today: "border-amber-200 bg-amber-50 text-amber-900",
  upcoming: "border-leaf/15 bg-leaf-soft/50 text-leaf-dark",
};

export function DashboardAlertList({
  summary,
}: {
  summary: DashboardAlertSummary;
}) {
  const hiddenCount = summary.totalCount - summary.alerts.length;

  return (
    <section className="surface-panel mt-6 p-6" aria-labelledby="dashboard-alert-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-leaf">다가오는 관리 일정</p>
          <h2 className="mt-1 text-xl font-bold" id="dashboard-alert-title">일정 알림</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold" aria-label="일정 알림 요약">
          <span className="rounded-full bg-red-50 px-3 py-1.5 text-red-700">기한 지남 {summary.overdueCount}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">오늘 {summary.todayCount}</span>
          <span className="rounded-full bg-leaf-soft px-3 py-1.5 text-leaf-dark">7일 이내 {summary.upcomingCount}</span>
        </div>
      </div>

      {summary.alerts.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {summary.alerts.map((alert) => <AlertItem alert={alert} key={`${alert.source}-${alert.id}`} />)}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl bg-cream p-5 text-sm leading-6 text-muted">
          기한이 지났거나 7일 안에 예정된 재배·물주기 일정이 없습니다.
        </p>
      )}

      {hiddenCount > 0 && (
        <p className="mt-4 text-sm font-bold text-muted">알림 {hiddenCount}개가 더 있습니다. 각 시즌의 재배 일정에서 확인해 주세요.</p>
      )}
      <p className="mt-4 text-xs leading-5 text-muted">현재 알림은 앱을 열었을 때 대시보드에서 확인할 수 있습니다. 푸시·이메일 알림은 후속 알림 인프라 연결 후 제공됩니다.</p>
    </section>
  );
}

function AlertItem({ alert }: { alert: DashboardAlert }) {
  return (
    <li>
      <Link className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 ${URGENCY_STYLES[alert.urgency]}`} href={alert.href}>
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          <span>{getUrgencyLabel(alert)}</span>
          <time dateTime={alert.dueDate}>{alert.dueDate}</time>
        </div>
        <p className="mt-2 font-bold text-ink">{alert.title}</p>
        <p className="mt-1 text-xs font-bold opacity-70">{alert.source === "watering" ? "물주기 일정" : "재배 일정"}</p>
      </Link>
    </li>
  );
}

function getUrgencyLabel(alert: DashboardAlert) {
  if (alert.urgency === "overdue") return `${Math.abs(alert.daysFromToday)}일 지남`;
  if (alert.urgency === "today") return "오늘 할 일";
  return `${alert.daysFromToday}일 뒤`;
}
