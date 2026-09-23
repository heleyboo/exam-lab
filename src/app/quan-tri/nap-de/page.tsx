import { desc, eq } from "drizzle-orm";
import { requireRoleOrRedirect } from "@/server/auth/session";
import { ROUTE_GROUP_ROLES } from "@/server/auth/roles";
import { db } from "@/server/db";
import { importJob, sourceExam } from "@/server/db/schema";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { JobStepper, type StepState } from "@/components/domain/job-stepper";
import { JOB_STATE_TONE, VISIBILITY_TONE } from "@/lib/tone";
import { UploadForm } from "./upload-form";

const STEPS = [
  { key: "upload", label: "Tải lên" },
  { key: "extract", label: "Trích xuất" },
  { key: "classify", label: "Phân loại" },
  { key: "dedupe", label: "Kiểm tra trùng" },
  { key: "await_review", label: "Chờ soát" },
] as const;

/** Bước nào đã qua, bước nào đang chạy, bước nào lỗi. */
function stepStates(currentStep: string, state: string): { label: string; state: StepState }[] {
  const currentIndex = STEPS.findIndex((step) => step.key === currentStep);
  return STEPS.map((step, index) => {
    if (index < currentIndex) return { label: step.label, state: "done" as StepState };
    if (index > currentIndex) return { label: step.label, state: "todo" as StepState };
    if (state === "error") return { label: step.label, state: "error" as StepState };
    if (state === "done") return { label: step.label, state: "done" as StepState };
    return { label: step.label, state: "current" as StepState };
  });
}

export default async function NapDe() {
  await requireRoleOrRedirect(ROUTE_GROUP_ROLES.admin);

  const jobs = await db
    .select({
      id: importJob.id,
      step: importJob.step,
      state: importJob.state,
      error: importJob.error,
      warnings: importJob.warnings,
      createdAt: importJob.createdAt,
      examName: sourceExam.examName,
      shortCode: sourceExam.shortCode,
      school: sourceExam.school,
      visibility: sourceExam.visibility,
    })
    .from(importJob)
    .innerJoin(sourceExam, eq(importJob.sourceExamId, sourceExam.id))
    .orderBy(desc(importJob.createdAt))
    .limit(20);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header>
        <p className="eyebrow">Quản trị</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Nạp đề</h1>
      </header>

      <Card>
        <CardHeader>
          <h2 className="font-medium">Tải đề lên</h2>
        </CardHeader>
        <CardBody>
          <UploadForm />
        </CardBody>
      </Card>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          Tiến trình gần đây
        </h2>

        {jobs.length === 0 ? (
          <EmptyState
            title="Chưa nạp đề nào"
            description="Tải một file đề lên để bắt đầu. Đề 4 trang mất khoảng hai phút."
          />
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Card>
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[var(--color-ink-3)]">
                        {job.shortCode}
                      </span>
                      <span className="font-medium">{job.examName}</span>
                      {job.school && (
                        <span className="text-sm text-[var(--color-ink-2)]">· {job.school}</span>
                      )}
                      <Badge tone={VISIBILITY_TONE[job.visibility].tone}>
                        {VISIBILITY_TONE[job.visibility].label}
                      </Badge>
                      <Badge tone={JOB_STATE_TONE[job.state].tone}>
                        {JOB_STATE_TONE[job.state].label}
                      </Badge>
                    </div>

                    <JobStepper steps={stepStates(job.step, job.state)} />

                    {job.error && <p className="text-sm text-[var(--color-bad)]">{job.error}</p>}
                    {job.warnings.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-[var(--color-ink-2)]">
                          {job.warnings.length} cảnh báo
                        </summary>
                        <ul className="mt-2 space-y-1 text-[var(--color-ink-2)]">
                          {job.warnings.slice(0, 10).map((warning, index) => (
                            <li key={index}>· {warning}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
