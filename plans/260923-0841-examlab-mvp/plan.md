---
title: ExamLab MVP - Toán THPT
description: >-
  Nền tảng luyện đề + soạn đề Toán THPT: import PDF/docx thành ngân hàng câu hỏi
  có duyệt, luyện theo dạng bài, giáo viên soạn đề theo ma trận 3 chiều
status: in-progress
priority: P2
branch: main
tags:
  - mvp
  - examlab
  - nextjs
  - ai
blockedBy: []
blocks: []
created: '2026-09-23T01:50:25.707Z'
createdBy: 'ck:plan'
source: skill
---

# ExamLab MVP - Toán THPT

## Overview

Xây MVP nền tảng luyện đề và soạn đề **môn Toán THPT** theo format thi 2025. Vòng lặp chính: admin import đề PDF/docx → hệ thống tách từng câu và đề xuất phân loại → admin soát và duyệt → học sinh luyện theo dạng bài → giáo viên soạn đề theo ma trận và xuất file hoặc giao online.

**Nguồn quyết định:**
- Nghiệp vụ: `plans/reports/brainstorm-260922-2349-stem-exam-platform-report.md` (§9 là bản cập nhật mới nhất)
- Prototype UI: `design/ui-mockups/project/ExamLab.dc.html` — 25 màn, độ hoàn thiện cao
- Inventory + gap: `plans/reports/from-design-handoff-to-plan-260923-0841-examlab-prototype-inventory-report.md`
- Nghiên cứu trích xuất PDF: `plans/reports/researcher-260922-2344-stem-pdf-extraction-report.md` (đã lọc, có phần bác bỏ)

**Stack:** Next.js (App Router) + TypeScript · PostgreSQL + Drizzle + pgvector · pg-boss · Better Auth · MinIO/R2 · Claude API qua adapter · KaTeX + MathLive · Docker trên VPS. Worker Node cùng repo. Python sidecar chỉ xuất hiện ở Phase 2 sản phẩm (sympy).

**Quyết định đã chốt trước khi lập kế hoạch:**
- Ma trận đề **3 chiều** (mức độ × loại câu, nhóm cột theo Phần I/II/III) — khác prototype, vì bản 2 chiều không tạo được "NB Đúng/Sai" hay "VDC nhiều lựa chọn"
- Màn kết quả đề online cho giáo viên **nằm trong MVP**
- `scope` (trường/lớp/môn) **chỉ để hiển thị**, phân quyền vẫn theo vai trò

**Chốt thêm ở Validation Session 1 (2026-09-23):**
- Nguồn đề chính là **đề trường/sở**; kho có cột `visibility` (`public` | `restricted`) + ghi nguồn + cơ chế gỡ
- **PDF scan nằm trong MVP**: thêm tiền xử lý ảnh; sàn 60%, mục tiêu 80%; dưới sàn thì chuyển sang tối ưu nhập bán thủ công
- **Claude là model mặc định** cho trích xuất; Gemini chỉ đối chứng và làm phương án dự phòng
- Làm đề online **bắt buộc đăng nhập**
- Font bản in đề: **Times New Roman**

**Chốt thêm 2026-09-23 (sau khi xem kho đề thật):**
- Sản phẩm nhắm **cả hai mảng**: Toán THPT (format thi 2025) và **luyện thi vào lớp 10 chuyên** (THCS, toàn tự luận). **MVP vẫn chỉ làm THPT**, nhưng schema và taxonomy phải nhận thêm mảng thi vào 10 mà không phải đập đi làm lại.
- Hệ quả thiết kế: cây phân loại cần gốc theo **kỳ thi** (THPT 2025 · Thi vào 10 chuyên), không chỉ theo lớp; `kind` phải cho phép đề chỉ có `essay`; ma trận đề phải hoạt động cả khi đề không có phần trắc nghiệm nào.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Spike trích xuất đề](./phase-01-extraction-spike.md) | In Progress |
| 2 | [Nền tảng và hạ tầng](./phase-02-foundation-infra.md) | Pending |
| 3 | [Domain schema và taxonomy](./phase-03-domain-schema-taxonomy.md) | Pending |
| 4 | [Design system và component](./phase-04-design-system.md) | Pending |
| 5 | [Pipeline import đề](./phase-05-import-pipeline.md) | Pending |
| 6 | [Soát và duyệt đề](./phase-06-proofing-approval.md) | Pending |
| 7 | [Lời giải AI và hàng chờ duyệt](./phase-07-ai-solutions-review.md) | Pending |
| 8 | [Luyện tập học sinh](./phase-08-student-practice.md) | Pending |
| 9 | [Tự luận và AI chấm](./phase-09-essay-ai-grading.md) | Pending |
| 10 | [Giáo viên soạn và xuất đề](./phase-10-teacher-authoring-export.md) | Pending |
| 11 | [Đề online và kết quả](./phase-11-online-exam-results.md) | Pending |
| 12 | [Vận hành và hoàn thiện](./phase-12-ops-polish.md) | Pending |

### Phụ thuộc giữa các phase

```
1 (spike, CỔNG CHẶN)
└── 2 hạ tầng
    ├── 3 schema ──┬── 5 import ── 6 soát/duyệt ──┬── 7 lời giải AI
    │              │                              ├── 8 luyện tập ── 9 tự luận ──┐
    │              │                              └── 10 soạn đề ────────────────┤
    └── 4 design system ──────────────────────────────────────────────┐          │
                                                          8 + 10 ── 11 đề online │
                                                                     9 + 11 ── 12 vận hành
```
- Phase 1 **chặn toàn bộ**: không đạt ngưỡng thì phải đổi hướng trước khi viết UI.
- Phase 3 và 4 chạy song song được (schema và design system không đụng nhau).
- Phase 7, 8, 10 chạy song song được sau khi có phase 6.

## Tiêu chí nghiệm thu MVP

- [ ] Import đề Toán PDF 50 câu: ≥ 90% câu tách đúng ranh giới, admin soát xong ≤ 20 phút
- [ ] Chạy đúng 4 loại câu; Đúng/Sai chấm theo thang 0,1 / 0,25 / 0,5 / 1
- [ ] Học sinh không truy cập được nội dung chưa `published`, chặn ở API không chỉ ở UI
- [ ] Lời giải AI lệch đáp án gốc luôn vào hàng ưu tiên và không tự publish
- [ ] Giáo viên tạo ma trận 3 chiều, sinh đề 50 câu < 5 giây, trộn 4 mã, xuất PDF/Word công thức đúng
- [ ] Học sinh làm đề online, giáo viên xem được kết quả và tải CSV
- [ ] Quota AI chặn đúng theo ngày/user; hết lượt thì không gọi API
- [ ] Reviewer không vào được màn cài đặt; học sinh bấm nâng cấp không bị đổi vai trò

## Ngoài phạm vi MVP

Phase 2 sản phẩm: AI sinh biến thể có duyệt (đề mẫu tham số + sympy), học sinh tự sinh bài, challenge kiểu leetcode, leaderboard.
Phase 3 sản phẩm: thanh toán SePay/VietQR, mở rộng Lý/Hóa/Sinh, quản lý lớp cho giáo viên, contest có giờ.

## Lỗi của prototype phải sửa khi dựng UI

1. Mẫu ma trận "THPT 2025" tổng **11,80 điểm** thay vì 10,0; điểm/câu khai theo hàng thay vì theo phần
2. Link nâng cấp của học sinh nhảy sang màn cài đặt admin **và đổi vai trò người dùng**
3. Màn xuất đề ghi Phần II không chấm tự động, mâu thuẫn 2 màn khác — Phần II **có** chấm tự động
4. Reviewer dùng chung toàn bộ menu admin kể cả quản lý user và cấu hình model
5. Thiếu enum `student_generated` và hàng chờ duyệt cho câu học sinh đề xuất
6. Cây chủ đề phía học sinh chỉ 2 cấp, thiếu Lớp và Chủ đề
7. Nút "Xem lại từng câu" và "Báo lỗi câu hỏi" chưa dẫn đi đâu
8. Không có trạng thái rỗng/đang tải/lỗi ở bất kỳ màn nào
9. Không có `aria-*` nào; ô ma trận và `<select>` thiếu label

## Dependencies

Không có plan nào khác trong repo. Phụ thuộc bên ngoài: Claude API (có adapter đổi sang Gemini), poppler + pandoc trong image worker, Playwright cho xuất PDF.

## Câu hỏi còn mở

Đã đóng ở Validation Session 1: nguồn đề và bản quyền, PDF scan, model mặc định, đăng nhập khi làm đề online, font bản in.

Không chặn, chốt sau:
- Công thức điểm leaderboard (thuộc Phase 2 sản phẩm)
- Trần ngân sách AI có chặn thật hay chỉ cảnh báo
- Badges là tính năng thật hay trang trí
- Bài kiểm tra định vị đầu vào có làm không
- SSO tài khoản trường
- Đề `restricted` có được phép xuất PDF/Word trong đề của giáo viên không, hay chỉ dùng để luyện tập trên nền tảng (hiện plan cho phép xuất, chỉ cấm hiện công khai và cấm tải file gốc)

## Validation Log

### Session 1 — 2026-09-23

**Verification Results**
- Tier: Full (12 phase). Repo greenfield nên không có code để đối chiếu; kiểm chứng các số liệu plan trích từ prototype.
- Claims checked: 12 · Verified: 12 · Failed: 0 · Unverified: 0
- Đã xác nhận: token màu (`--accent #1B5A8C`, `--ai #66399B`, `--ok #1B7550`, `--bad #C6453F`, `--bg #FBF5EF`); 0 `@media` + 1 chỗ `clientWidth < 880`; `goSettings: ()=>this.go(25)` gây rò vai trò từ 2 link "Xem gói"/"Nâng cấp"; KaTeX 0.16.9; thang Đúng/Sai `[0,0.1,0.25,0.5,1]`; trả lời ngắn `st.short.trim()==="2"` + giới hạn 4 ký tự; chuỗi "Phần I & III" ở màn xuất đề.
- **Phát hiện mới**: `defMatrix()` cho tổng **11,80 điểm** và **28 câu**, trong khi các màn khác ghi 22 câu · 10,0 điểm. Mock sai cả điểm lẫn số câu → ghi vào Phase 3.

**Quyết định**
| Câu hỏi | Chốt | Lan truyền |
|---|---|---|
| Nguồn đề spike + kho ban đầu | Đề trường/sở là chính | Phase 1, 3, 5 |
| Xử lý bản quyền | Ghi nguồn + cột `visibility` + gỡ theo yêu cầu | Phase 3, 5, 10 |
| PDF scan kém thì sao | Cố làm trong MVP; **sàn 60%, mục tiêu 80%**, giới hạn spike 2 tuần | Phase 1, 5 |
| Model mặc định | Claude; Gemini đối chứng và dự phòng | Phase 1, 5 |
| Đề online | Bắt buộc đăng nhập | Phase 11 |
| Font bản in | Times New Roman | Phase 10 |

**Đánh giá rủi ro sau validation**: chọn đề trường/sở + giữ scan làm Phase 1 nặng hơn đáng kể (thêm tiền xử lý ảnh, thêm đối chứng model). Ước tính spike từ ~1 tuần lên ~2 tuần. Đây là rủi ro đã biết và được chấp nhận có ý thức, không phải bỏ sót.

### Whole-Plan Consistency Sweep
- Đã rà `plan.md` + 12 phase sau khi lan truyền.
- Sửa các chỗ mâu thuẫn: ngưỡng scan (Phase 1), font bản in (Phase 10, bỏ khỏi mục câu hỏi mở), đăng nhập đề online (Phase 11), `visibility` xuất hiện nhất quán ở Phase 3 (schema) → Phase 5 (import) → Phase 10 (xuất đề).
- Không còn mâu thuẫn chưa giải quyết.
