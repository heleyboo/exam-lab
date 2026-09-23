---
phase: 4
title: "Design system và component"
status: pending
priority: P1
dependencies: [2]
---

# Phase 4: Design system và component

## Overview
Chuyển design system của prototype (token CSS + ~30 hợp đồng `data-*`) thành thư viện component React dùng lại được, kèm render toán KaTeX chạy được với SSR.

## Requirements
- Chức năng: token màu sáng/tối, typography, component nghiệp vụ, trang "kitchen sink" xem toàn bộ component.
- Phi chức năng: không dùng `paint()` kiểu quét DOM; responsive bằng container query; a11y có `aria-*` và label đầy đủ ngay từ đầu.

## Architecture
- Token: biến CSS theo cặp `x` / `xSoft` — `accent #1B5A8C`, `ok #1B7550`, `bad #C6453F`, `warn #9A6408`, **`ai #66399B`** (mọi bề mặt AI), nền `#FBF5EF`, surface `#FFF`/`#F8F0E8`, line `#EBE0D5`, ink `#12283D`/`#4A5A6E`/`#8A94A2`. Dark mode qua `[data-theme="dark"]`, Tailwind `darkMode: ['class','[data-theme="dark"]']`.
- Variant bằng `cva`; ngưỡng mastery (45/70) và từ điển `TONE` **import từ `src/lib`**, không nhúng vào component (chúng là ngữ nghĩa nghiệp vụ).
- Toán: `remark-math` + `rehype-katex` render phía server; self-host font KaTeX. Chỗ prototype nhét `$…$` vào `title`/`placeholder` phải đổi sang tooltip render thật.
- Responsive: container query, mốc gốc 880px của vùng nội dung.

## Related Code Files
- Create: `src/app/globals.css` (token), `tailwind.config.ts`, `src/components/ui/*` (shadcn), `src/components/domain/*`, `src/lib/math/render.tsx`
- Create: `src/app/(dev)/kitchen-sink/page.tsx`
- Reference (chỉ đọc): `design/ui-mockups/project/ExamLab.dc.html`

## Implementation Steps
1. Khai báo token + dark mode + nền gradient nhẹ của bản sáng; kiểm tra tương phản AA.
2. Cài shadcn: Button, Input, Select, Checkbox, Switch, Slider, Tabs, Table, Badge, Card, Progress, Textarea, ScrollArea, Sheet, Dialog, Toast.
3. Viết **~12 component tự làm**: `QuestionCard` (4 biến thể), `AnswerOption` (`ok|bad|sel|flag|off`), `MasteryBar` (theo ngưỡng), `Heatmap8Weeks`, `MatrixCell`, `JobStepper`, `BBoxOverlay`, `Podium`, `NumericKeypad`, `DeviceFrame`, `A4Preview`, `AiNotice`.
4. Viết `StatusBadge` đọc từ `TONE`.
5. Render toán SSR + fallback khi LaTeX lỗi (hiện mã gốc, không làm vỡ trang).
6. Trạng thái dùng chung: `EmptyState`, `LoadingSkeleton`, `ErrorState` — prototype thiếu hoàn toàn.
7. Trang kitchen-sink liệt kê mọi component ở cả 2 theme.

## Success Criteria
- [ ] Kitchen-sink hiển thị đủ component ở sáng + tối, không lỗi tương phản AA
- [ ] Công thức toán render đúng khi tắt JavaScript (SSR)
- [ ] Không còn code quét DOM để gán style
- [ ] Bảng và lưới co giãn đúng ở bề rộng < 880px của vùng nội dung
- [ ] Mọi input có label; bảng click được có role và trạng thái bàn phím

## Risk Assessment
- **KaTeX nặng** → chỉ nạp CSS ở layout cần toán, self-host font, tránh nạp JS phía client khi đã SSR.
- **Lệch màu so với prototype** → copy thẳng giá trị hex trong file mockup, không ước lượng.
- **shadcn không khớp hệ màu** (dùng `--primary/--primary-foreground`) → restyle primitive theo token của dự án, quyết một lần ở bước 1.
