# Prototype ExamLab — Inventory & Gap Analysis

- Ngày: 2026-09-23
- Nguồn: `design/ui-mockups/project/ExamLab.dc.html` (2.413 dòng, đọc full) + `support.js` (dc-runtime)
- Đối chiếu: `brainstorm-260922-2349-stem-exam-platform-report.md`
- Lưu ý bundle: `project/uploads/math1..4.webp` + `.thumbnail` **không được HTML tham chiếu** → ảnh trong prototype chỉ là placeholder xám.

## 1. 25 màn hình (điều hướng bằng `state.screen` 1–25, không có router)

| # | Màn | Vai trò | Độ hoàn thiện |
|---|---|---|---|
| 1 | Trang giới thiệu | public | full (chưa có footer/pricing) |
| 2 | Đăng nhập/Đăng ký | public | partial (chưa có quên MK, xác thực email) |
| 3 | Tổng quan HS (KPI, mastery, heatmap 8 tuần, ôn phần yếu) | HS | full |
| 4 | Duyệt chủ đề (cây 2 cấp) | HS | partial (hardcode Lớp 12; bộ lọc trơ) |
| 5 | Phiên luyện tập (4 loại câu + khung web/mobile) | HS | **full + có state thật** |
| 6 | Nộp tự luận (chụp ảnh / editor) | HS | partial (chưa upload/crop/editor thật) |
| 7 | Kết quả AI chấm (rubric từng bước) | HS | full |
| 8 | Làm đề đầy đủ + trang kết quả | HS | full (chỉ render 1 câu) |
| 9 | Tạo bài tương tự (AI) | HS | full |
| 10 | Thử thách (daily + bảng bài) | HS | full |
| 11 | Bảng xếp hạng (podium + ghim dòng mình) | HS | full |
| 12 | Hồ sơ & lịch sử (badges, progress) | HS | full |
| 13 | Tổng quan GV | GV | full |
| 14 | Ma trận đề | GV | **full + editable** |
| 15 | Xem lại đề đã sinh | GV | partial (đổi câu & kéo thả trơ) |
| 16 | Mã đề & xuất file | GV | full |
| 17 | Duyệt kho câu hỏi | GV | full (lọc chỉ hình thức) |
| 18 | Tổng quan admin (hàng chờ, job, chi phí AI) | Admin | full |
| 19 | Tải đề lên | Admin | full |
| 20 | **Không gian soát đề** (PDF + bbox + editor) | Admin | full, phức tạp nhất |
| 21 | Hàng chờ duyệt lời giải | Admin | full |
| 22 | Duyệt biến thể AI | Admin | full |
| 23 | Quản lý phân loại (cây 5 cấp) | Admin | full (expand trơ) |
| 24 | Báo lỗi & khiếu nại (có SLA) | Admin | full |
| 25 | Cài đặt (quota, model AI, users) | Admin | full |

**Hoàn toàn chưa có:** loading/skeleton, empty state, error state, 404, toast, trang gói/nâng cấp cho HS-GV, bài kiểm tra định vị, onboarding HS, kết quả đề online phía GV, xem lại từng câu sau khi làm đề.

## 2. Design system (không dùng framework CSS)

- Font: **Be Vietnam Pro** 300–700 (UI) + **Montserrat** 500–700 (heading/số) + mono cho mã câu/đồng hồ. KaTeX 0.16.9 cho công thức.
- Token màu sáng: `--bg #FBF5EF` · `--surface #FFF` · `--surface2 #F8F0E8` · `--ink #12283D` · `--ink2 #4A5A6E` · `--ink3 #8A94A2` · `--line #EBE0D5` · `--accent #1B5A8C` · `--ok #1B7550` · `--bad #C6453F` · `--warn #9A6408` · **`--ai #66399B`** (mọi bề mặt AI) — mỗi màu có biến `*Soft` đi kèm.
- Tối: `--bg #111419` · `--surface #171B22` · `--accent #79A6EC` · `--ai #B995E9`… Bật bằng `[data-theme="dark"]`, **không** theo `prefers-color-scheme`.
- Radius chủ yếu 8/7/13/9/5/14; shadow chuẩn `0 1px 2px + 0 10px 26px -14px`; nhãn micro in hoa `500 10.5px + letter-spacing .05–.08em` là pattern lặp nhiều nhất.
- Gradient `--grad` cho card khuyến nghị; nền sáng có 3 radial gradient + chrome `backdrop-filter`.
- **Không có `@media` nào**: responsive do JS đo `main.clientWidth < 880` → port bằng container query.

## 3. Hợp đồng component (`data-*`, do hàm `paint()` áp dụng)

Cần chuyển thành variant (cva/tailwind-variants). Quan trọng nhất:
`data-choice=ok|bad|sel|flag|off` (ô đáp án) · `data-bar/lbar=<pct>` (ngưỡng mastery **<45 bad, <70 warn, ≥70 ok**) · `data-heat=0..4` · `data-step=done|now|err|todo` (stepper job) · `data-rect="l,t,w,h"` + `data-box=sel|dup|off` (overlay bbox PDF, đơn vị **% trang**) · `data-status/diff/tone` → từ điển `TONE` · `data-split` (2 cột→1) · `data-table=<px>` · `data-indent/weight` (cây taxonomy) · `data-podium` · `data-me` · `data-switch/knob`.

**`TONE` = danh sách enum tiếng Việt chuẩn**: Dễ/Trung bình/Khó · Đã giải/Đã thử/Chưa làm · Nháp/Chờ duyệt/Đã duyệt/Đã xuất bản/Từ chối · Lệch đáp án/Khớp đáp án · Đã kiểm chứng tự động/Cần kiểm tra · Đang xử lý/Hoàn tất/Lỗi · Mới/Đang xem/Đã xử lý · Import/Admin/AI biến thể/AI – chưa kiểm duyệt/Trùng lặp.

## 4. Data shape rút ra từ mock (dùng làm nền cho schema)

- **Question**: `code Q-18420` · `type` 4 giá trị · `level` NB/TH/VD/VDC · `status` 5 giá trị · `origin` Import|Admin|AI biến thể · `stem` (Markdown + `$LaTeX$`) · `path` (chuỗi taxonomy + nguồn đề).
- **Đúng/Sai**: key `["D","D","D","S"]`, thang điểm `[0, 0.1, 0.25, 0.5, 1]` theo số ý đúng.
- **Trả lời ngắn**: input tối đa **4 ký tự**, so khớp chuỗi chính xác.
- **Import Job**: 5 bước `Tải lên → Trích xuất → Phân loại → Kiểm tra trùng → Chờ soát`, state `done|now|err|todo`.
- **ProofQuestion**: `src` (Markdown thô) ↔ `preview`, `aiType + conf`, `aiLevel + conf2` (**2 điểm tin cậy riêng**), `dup + dupPct + dupCode`, `figure`, `key` (đáp án gốc).
- **AiSolution**: các bước có cờ `bad` + `note` giải thích, dấu model `AI · gpt-math-4 · 12/09`, enum lý do từ chối 4 giá trị (gồm **"Đáp án gốc của đề sai"**).
- **Variant**: `verify`, `changed`, `note` (trace CAS hiển thị cho admin).
- **MatrixRow**: `{topic, n[4], pt[4]}` — điểm/câu khai **theo từng hàng**.
- **User**: `role` + **`scope`** (Toàn hệ thống | Toán 12 | THPT Chuyên LHP | Lớp 12A3) + `plan` + `status` (có **duyệt tài khoản GV**).
- Ngoài ra: Badge, Podium/Rank (`pts` ≠ số câu đúng), Heat 56 ô, Report/Appeal có SLA, Quota, Model config, Cost (VND).

## 5. Quyết định nghiệp vụ mới do prototype đặt ra (chưa có trong brainstorm)

| Quyết định | Chi tiết |
|---|---|
| Hạn mức freemium cụ thể | Chấm tự luận 5/ngày (Free) vs 100/tháng (Pro); sinh biến thể 3/ngày vs không giới hạn; GV 3 đề/tháng vs 50; mã đề 2 vs 8; xuất Word kèm đáp án chỉ Pro |
| Trần ngân sách AI tháng | 18,4 tr₫ = 82% hạn mức + bóc tách chi phí theo tác vụ |
| Cấu hình model theo tác vụ | 4 tác vụ, mỗi tác vụ chọn model + fallback, admin sửa được |
| Trường/lớp là thuộc tính user | `school`, `scope` dùng cho leaderboard và RBAC |
| Duyệt tài khoản GV | GV mới ở trạng thái `Chờ duyệt` |
| SLA | Báo lỗi 48h, khiếu nại 24h |
| Xử lý trùng câu | `duplicate_of` + `similarity %` + 2 hành động (đánh dấu trùng / vẫn giữ) |
| Gộp & tách câu khi soát | Nút trên toolbar màn 20 |
| Lịch mở/đóng đề online | Mở 25/09 07:00 – đóng 09:00 |
| Mã ngắn cho người đọc | `Q-`, `V-`, `R-`, mã đề `101+`, challenge `#142` |
| Badges | 5 huy hiệu cho HS |

## 6. Mâu thuẫn phải xử lý trước khi code

| # | Mâu thuẫn | Đề xuất xử lý |
|---|---|---|
| M1 | **Ma trận chỉ có 4 cột mức độ**, mỗi mức hard-map sang một phần/điểm (VD→Phần III 0,5đ; VDC→Phần II 1,0đ) → không thể tạo "NB Đúng/Sai" hay "VDC nhiều lựa chọn" | Cần chốt: giữ 2 chiều (mức độ) hay khôi phục 3 chiều (mức độ × loại câu) |
| M2 | Mẫu "THPT 2025" nạp vào tổng **11,80 điểm**, không phải 10,0 → hiện trạng thái lỗi đỏ; `pt` khai theo hàng, trái với chú thích ngay dưới bảng | Sửa mock: điểm theo phần (I 0,25 · II 1,0 · III 0,5), tổng 10,0 |
| M3 | Màn 1 và 5 nói Phần II chấm tự động, màn 16 nói chỉ Phần I & III | Phần II **có** chấm tự động; sửa màn 16 |
| M4 | Trả lời ngắn: prototype so chuỗi 4 ký tự, kế hoạch nói có sai số | Format THPT 2025 đúng là ≤4 ký tự → theo prototype, nhưng cần chuẩn hóa (dấu phẩy/chấm thập phân, bỏ số 0 thừa) |
| M5 | Link nâng cấp gói của HS/GV nhảy sang màn Cài đặt admin **và đổi luôn role** | Lỗi rõ ràng; cần trang gói riêng cho HS/GV |
| M6 | Reviewer dùng chung toàn bộ nav admin, kể cả quota/model/user | Reviewer chỉ được các màn 20–24 |
| M7 | Mastery hiển thị ở 3 cấp (Chương/Chủ đề/Dạng) nhưng chưa có quy tắc tổng hợp | Lưu ở Dạng bài, cấp trên tính bình quân có trọng số theo số câu |
| M8 | Enum `origin` thiếu "HS tự sinh" dù màn 9 sinh ra loại này, và không có hàng chờ admin cho "Đề xuất đưa vào kho" | Bổ sung enum + hàng chờ |
| M9 | Cây taxonomy: admin 5 cấp, HS chỉ 2 cấp (thiếu Lớp, Chủ đề) | Màn HS dùng đủ cấp, cho phép thu gọn |
| M10 | Badge "Còn n/5 lượt AI" hiện cho mọi vai trò dù GV/admin có đơn vị quota khác | Hiện theo vai trò |
| M11 | Màn 4 gán **1 loại câu cho mỗi Dạng bài**, các màn khác coi loại câu thuộc từng câu | Loại câu thuộc câu; màn 4 chỉ hiện loại chiếm đa số |

## 7. Ghi chú triển khai (Next.js + Tailwind + shadcn/ui)

- **`paint()` phải viết lại hoàn toàn**: ~30 hợp đồng `data-*` đang áp bằng `querySelectorAll` sau mỗi lần render. Chuyển sang cva. Tách `TONE` và ngưỡng 45/70 thành module dùng chung vì đây là **ngữ nghĩa nghiệp vụ**, không phải style.
- **Responsive đo bằng JS** (`main.clientWidth < 880`, tương đương viewport ~1190px do sidebar 258px) → dùng container query cho đúng.
- **KaTeX**: prototype quét toàn bộ DOM sau mỗi update, không hợp React/SSR. Dùng `remark-math` + `rehype-katex`, self-host font. Lưu ý có `$…$` nằm trong `title=""` và `placeholder=""` — KaTeX không render được ở đó, cần cách khác.
- **Màn 20 là hạng mục nặng nhất**: cần ảnh trang thật (pdftoppm) hoặc pdf.js, overlay bbox, zoom giữ đúng tọa độ, click đồng bộ hai bên, và vẽ/chỉnh khung. Định dạng `rect` theo % dùng lại được.
- **Bản in A4** ở màn 15/16/20 là mô phỏng thủ công. Preview và bản xuất thật phải **dùng chung một template**, nếu không sẽ lệch. Prototype dùng Montserrat cho giấy thi, trong khi đề thi VN thường dùng Times New Roman — cần chốt.
- **Editor toán màn 6** hiện là tĩnh; nhãn toolbar đang là chuỗi rác sinh ra do strip dấu `\` (`"fraca/b"`, `"sqrtx"`) → cần MathLive + icon thật.
- **shadcn/ui phủ được**: Button, Input, Select, Checkbox, Switch, Slider, Tabs, Table, Badge, Card, Progress, Textarea, ScrollArea, Sheet. **Phải tự viết ~12 component**: mastery bar theo ngưỡng, heatmap 8 tuần, ô ma trận, stepper job, overlay bbox, podium, keypad số, khung thiết bị, bản in A4.
- **Hệ màu không phải theo chuẩn shadcn** (dùng cặp `x`/`xSoft`, không phải `--primary/--primary-foreground`). Cần chốt sớm: map sang tên shadcn hay giữ hệ hiện tại rồi restyle primitive.
- Không có canvas/SVG; icon là ký tự Unicode → thay bằng `lucide-react`, giữ `∫` làm logo.
- Số liệu đang format bằng `.replace(".", ",")` → dùng `Intl.NumberFormat('vi-VN')`.
- Mock data trong `renderVals()` sạch, **bê thẳng làm seed/fixture + type TypeScript được**.
- **Nợ a11y**: không có `aria-*` nào, hàng bảng click được nhưng thiếu role, ô ma trận và `<select>` thiếu label, heatmap chỉ có `title`. Đã tốt: `:focus-visible` và vùng chạm 44–48px.

## Câu hỏi còn mở

1. Ma trận 2 chiều hay 3 chiều (M1) — chặn cả màn 14 lẫn schema `ExamBlueprint`.
2. Kết quả đề online phía GV có trong MVP không (link + lịch + chấm tự động đã thiết kế nhưng không có màn xem kết quả).
3. `scope` là RBAC thật trong MVP hay chỉ hiển thị? Quyết định này kéo theo có cần bảng trường/lớp ngay MVP không.
4. Công thức điểm leaderboard (1.845 điểm từ 512 câu đúng → có trọng số chưa định nghĩa).
5. Trần ngân sách AI có chặn/cảnh báo thật hay chỉ hiển thị?
6. Badges là tính năng thật của MVP hay trang trí?
7. Bài kiểm tra định vị đầu vào có làm không (mới có chữ, chưa có màn)?
8. Font bản in đề: Montserrat hay Times New Roman?
9. Còn mở từ brainstorm: nguồn đề & bản quyền, tỉ lệ scan/số, SSO trường học.
