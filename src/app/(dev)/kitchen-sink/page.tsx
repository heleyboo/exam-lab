import { A4Preview } from "@/components/domain/a4-preview";
import { AiNotice } from "@/components/domain/ai-notice";
import { AnswerOption } from "@/components/domain/answer-option";
import { BBoxOverlay } from "@/components/domain/bbox-overlay";
import { DeviceFrame } from "@/components/domain/device-frame";
import { HeatmapWeeks } from "@/components/domain/heatmap-weeks";
import { JobStepper } from "@/components/domain/job-stepper";
import { MasteryBar } from "@/components/domain/mastery-bar";
import { Podium } from "@/components/domain/podium";
import { QuestionCard } from "@/components/domain/question-card";
import { MathMarkdown } from "@/components/math-markdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/states";
import { CONTENT_STATUS_TONE, QUESTION_ORIGIN_TONE } from "@/lib/tone";
import { MatrixDemo } from "./matrix-demo";
import { ThemeToggle } from "./theme-toggle";

/**
 * Trang soi toàn bộ component ở cả nền sáng lẫn nền tối.
 * Chỉ dùng khi phát triển, không nằm trong luồng người dùng.
 */
export const metadata = { title: "Kitchen sink · ExamLab" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function KitchenSink() {
  const days = Array.from({ length: 56 }, (_, index) => ({
    level: (index % 5) as 0 | 1 | 2 | 3 | 4,
    label: `Ngày ${index + 1}`,
  }));

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Nội bộ</p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Kitchen sink
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Nhãn trạng thái">
        <div className="flex flex-wrap gap-2">
          {Object.values(CONTENT_STATUS_TONE).map((status) => (
            <Badge key={status.label} tone={status.tone}>
              {status.label}
            </Badge>
          ))}
          {Object.values(QUESTION_ORIGIN_TONE).map((origin) => (
            <Badge key={origin.label} tone={origin.tone}>
              {origin.label}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Công thức toán, render sẵn phía server">
        <Card>
          <CardBody>
            <MathMarkdown
              source={[
                "Cho hàm số $y=\\dfrac{ax+b}{cx+d}$ với $ad-bc\\neq 0$.",
                "",
                "$$\\int_{1}^{2}\\left(2x+1\\right)\\,\\mathrm{d}x = 4$$",
                "",
                "| Nhóm | $[0;40)$ | $[40;80)$ |",
                "|---|---|---|",
                "| Tần số | 11 | 10 |",
                "",
                "Công thức hỏng: $\\frac{1}{$ vẫn không làm vỡ trang.",
              ].join("\n")}
            />
          </CardBody>
        </Card>
      </Section>

      <Section title="Thẻ câu hỏi, bốn loại">
        <div className="space-y-4">
          <QuestionCard
            shortCode="Q-18420"
            kind="mcq"
            level="TH"
            status="published"
            origin="import"
            stem="Họ nguyên hàm của hàm số $f(x)=x^2$ là"
            path="Toán · Lớp 12 · Nguyên hàm · Đề minh hoạ 2025"
            options={[
              { key: "A", text: "$\\dfrac{1}{3}x^3+C$", isCorrect: true },
              { key: "B", text: "$2x^3+C$" },
              { key: "C", text: "$3x^3+C$" },
              { key: "D", text: "$\\dfrac{1}{2}x^2+C$" },
            ]}
            revealAnswer
          />
          <QuestionCard
            shortCode="Q-18421"
            kind="true_false"
            level="VD"
            status="pending_review"
            origin="ai_variant"
            stem="Cho hàm số $f(x)=x^3-12x-8$."
            trueFalseItems={[
              { key: "a", text: "Đạo hàm là $f'(x)=3x^2-12$.", correct: true },
              { key: "b", text: "Phương trình $f'(x)=0$ có tập nghiệm $S=\\{2\\}$.", correct: false },
              { key: "c", text: "$f(2)=24$.", correct: false },
              { key: "d", text: "Giá trị lớn nhất trên $[-3;3]$ bằng 24.", correct: true },
            ]}
            revealAnswer
          />
          <QuestionCard
            shortCode="Q-18422"
            kind="short_answer"
            level="VDC"
            status="draft"
            origin="student_generated"
            stem="Tính thể tích khối chóp, làm tròn đến hàng phần trăm."
            shortAnswer="1,04"
            revealAnswer
          />
          <QuestionCard
            shortCode="Q-18423"
            kind="essay"
            status="approved"
            origin="admin"
            stem="Chứng minh rằng với mọi $a,b>0$ ta có $\\dfrac{a}{b}+\\dfrac{b}{a}\\geq 2$."
          />
        </div>
      </Section>

      <Section title="Ô phương án">
        <div className="space-y-2">
          <AnswerOption optionKey="A" state="idle">
            Chưa chọn
          </AnswerOption>
          <AnswerOption optionKey="B" state="selected" note="Em chọn">
            Đã chọn, chưa chấm
          </AnswerOption>
          <AnswerOption optionKey="C" state="correct" note="Đáp án đúng">
            Đáp án đúng
          </AnswerOption>
          <AnswerOption optionKey="D" state="wrong" note="Em chọn">
            Chọn sai
          </AnswerOption>
        </div>
      </Section>

      <Section title="Dải thông báo AI">
        <div className="space-y-2">
          <AiNotice title="Chấm tham khảo">
            Điểm do AI chấm, không tính vào bảng xếp hạng. Em có thể khiếu nại.
          </AiNotice>
          <AiNotice title="AI – chưa kiểm duyệt">
            Câu này do AI sinh theo yêu cầu của em, chưa qua người duyệt.
          </AiNotice>
        </div>
      </Section>

      <Section title="Độ thành thạo">
        <Card>
          <CardBody className="space-y-4">
            <MasteryBar label="Tích phân đổi biến" score={82} attempts={24} />
            <MasteryBar label="Cực trị hàm số" score={58} attempts={16} />
            <MasteryBar label="Phương trình mặt cầu" score={31} attempts={9} />
            <MasteryBar label="Xác suất có điều kiện" score={70} attempts={2} />
          </CardBody>
        </Card>
      </Section>

      <Section title="Hoạt động 8 tuần">
        <Card>
          <CardBody>
            <HeatmapWeeks days={days} />
          </CardBody>
        </Card>
      </Section>

      <Section title="Tiến trình nạp đề">
        <Card>
          <CardBody className="space-y-6">
            <JobStepper
              steps={[
                { label: "Tải lên", state: "done" },
                { label: "Trích xuất", state: "done" },
                { label: "Phân loại", state: "current" },
                { label: "Kiểm tra trùng", state: "todo" },
                { label: "Chờ soát", state: "todo" },
              ]}
            />
            <JobStepper
              steps={[
                { label: "Tải lên", state: "done" },
                { label: "Trích xuất", state: "error" },
                { label: "Phân loại", state: "todo" },
                { label: "Kiểm tra trùng", state: "todo" },
                { label: "Chờ soát", state: "todo" },
              ]}
            />
          </CardBody>
        </Card>
      </Section>

      <Section title="Ma trận và bàn phím">
        <Card>
          <CardBody>
            <MatrixDemo />
          </CardBody>
        </Card>
      </Section>

      <Section title="Soát đề: ảnh trang kèm khung câu">
        <div className="@container">
          <div className="grid gap-4 @[600px]:grid-cols-2">
            <BBoxOverlay
              pageImageUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='210' height='297'%3E%3Crect width='210' height='297' fill='white'/%3E%3Ctext x='16' y='40' font-size='9'%3ECâu 1. Cho hình lăng trụ...%3C/text%3E%3Ctext x='16' y='120' font-size='9'%3ECâu 2. Cho hình hộp...%3C/text%3E%3C/svg%3E"
              pageLabel="Trang 1 của đề minh hoạ"
              boxes={[
                { id: "1", label: "Câu 1", left: 6, top: 9, width: 86, height: 22, state: "selected" },
                { id: "2", label: "Câu 2", left: 6, top: 36, width: 86, height: 20, state: "duplicate" },
                { id: "3", label: "Câu 3", left: 6, top: 60, width: 86, height: 18 },
              ]}
            />
            <Card>
              <CardHeader>
                <p className="eyebrow">Khung đang chọn</p>
              </CardHeader>
              <CardBody className="text-sm text-[var(--color-ink-2)]">
                Toạ độ khung lưu theo phần trăm kích thước trang nên phóng to thu nhỏ vẫn khớp.
              </CardBody>
            </Card>
          </div>
        </div>
      </Section>

      <Section title="Bản in đề">
        <A4Preview
          header={{
            authority: "Bộ Giáo dục và Đào tạo",
            school: "Kỳ thi tốt nghiệp THPT 2025",
            examCode: "0101",
            duration: "Thời gian làm bài 90 phút",
          }}
        >
          <p className="font-bold">PHẦN I. Thí sinh trả lời từ câu 1 đến câu 12.</p>
          <p className="mt-2">Câu 1: Họ nguyên hàm của hàm số f(x) = x² là</p>
        </A4Preview>
      </Section>

      <Section title="Bảng xếp hạng">
        <Podium
          entries={[
            { rank: 2, name: "Trần B", school: "THPT Chuyên LHP", points: 3120 },
            { rank: 1, name: "Nguyễn A", school: "THPT Chuyên LS", points: 3642 },
            { rank: 3, name: "Lê C", school: "THPT Nguyễn Huệ", points: 2980 },
          ]}
        />
      </Section>

      <Section title="Khung điện thoại">
        <DeviceFrame>
          <div className="space-y-3 p-4">
            <p className="eyebrow">Câu 7/12</p>
            <MathMarkdown source="Tập nghiệm của phương trình $\sin x = 0$ là" />
            <AnswerOption optionKey="A" state="idle">
              $x = k\pi$
            </AnswerOption>
          </div>
        </DeviceFrame>
      </Section>

      <Section title="Trạng thái rỗng, lỗi, đang tải">
        <div className="space-y-3">
          <EmptyState
            title="Chưa có câu hỏi nào"
            description="Dạng bài này chưa có câu đã xuất bản. Thử dạng khác hoặc quay lại sau."
          />
          <ErrorState description="Không tải được danh sách. Kiểm tra kết nối rồi thử lại." />
          <Card>
            <CardBody>
              <LoadingSkeleton />
            </CardBody>
          </Card>
        </div>
      </Section>
    </main>
  );
}
