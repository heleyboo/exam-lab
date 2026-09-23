---
phase: 3
title: Domain schema và taxonomy
status: completed
priority: P1
dependencies:
  - 2
---

# Phase 3: Domain schema và taxonomy

## Overview
Dựng toàn bộ schema nghiệp vụ và seed cây phân loại Toán 10–12 + mẫu ma trận THPT 2025. Đây là nền cho mọi phase sau, nên làm một lần cho đúng.

## Requirements
- Chức năng: bảng + enum + quan hệ cho taxonomy, câu hỏi, đề nguồn, blueprint, đề thi, bài làm, mastery, báo lỗi/khiếu nại, quota, badge; seed dữ liệu thật của chương trình Toán THPT.
- Phi chức năng: enum khớp từ điển `TONE` của prototype; mọi bảng nội dung có `shortCode` cho người đọc; embedding lưu bằng pgvector.

## Architecture
Bảng chính (Drizzle, snake_case trong DB):
- `taxonomy_node`: cây `exam_track|subject|grade|chapter|topic|question_type`, `parentId`, `path` (ltree hoặc chuỗi materialized), `questionCount`.
  - **`exam_track` là cấp gốc** (`thpt-2025`, `vao-10-chuyen`): sản phẩm nhắm cả hai mảng, MVP chỉ seed nhánh THPT nhưng cấu trúc phải sẵn sàng. Thiếu cấp này thì thêm mảng thi vào 10 sau sẽ phải migrate toàn bộ cây.
  - Đề thi vào 10 chuyên toàn tự luận, nên mọi ràng buộc kiểu "đề phải có phần trắc nghiệm" đều sai — không cài ràng buộc đó ở bất kỳ đâu.
- `question`: `shortCode` (Q-#####), `kind` (mcq|true_false|short_answer|essay), `level` (NB|TH|VD|VDC), `status` (draft|pending_review|approved|published|rejected), `origin` (import|admin|ai_variant|**student_generated**), `stem` (Markdown+LaTeX), `typeNodeId`, `tagNodeIds[]`, `sourceExamId`, `sourcePage`, `sourceIndex`, `embedding vector`, `duplicateOfId`, `similarity`.
- `question_option` (mcq), `question_tf_item` (4 ý a–d + `correct`), `question_short_answer` (`value` ≤ 4 ký tự + quy tắc chuẩn hóa), `question_essay_rubric` (các bước + điểm).
- `question_figure`: `storageKey`, `rect` (l,t,w,h theo **% trang**), `page`.
- `question_solution`: `content`, `origin` (ai|admin), `model`, `generatedAt`, `matchesSourceKey` (bool), `status`, `rejectReason` (enum 4 giá trị gồm "đáp án gốc của đề sai").
- `source_exam`: file gốc, `examName`, `school`, `year`, `subject`, `grade`, `uploadedBy`, `status`, **`visibility`** (`public` | `restricted`), `takedownAt`.
- **`visibility` (quyết định bản quyền, Validation Session 1)**: câu kế thừa `visibility` từ đề nguồn. `public` (đề Bộ, đề minh họa) hiện ở mọi nơi kể cả trang công khai. `restricted` (đề trường/sở) chỉ dùng cho luyện tập và sinh đề của giáo viên, **không hiện ở trang công khai, không cho tải file gốc**. Mọi câu đều hiển thị nguồn. Gỡ nội dung = set `takedownAt` → ẩn toàn bộ câu của đề đó khỏi mọi truy vấn.
- `import_job`: 5 bước (`upload|extract|classify|dedupe|await_review`) + `state`.
- `exam_blueprint` + `exam_blueprint_row`: **3 chiều** — `topicNodeId` × `level` × `kind`, `count`, `pointsPerQuestion`, `part` (I|II|III) suy ra từ `kind`.
- `exam`, `exam_variant` (mã đề 101+), `exam_variant_item` (thứ tự câu + hoán vị phương án).
- `exam_session`: link online, `slug`, `opensAt`, `closesAt`.
- `attempt`, `attempt_answer` (đáp án + điểm + thời gian), `essay_submission` (ảnh hoặc nội dung editor), `ai_grading` (điểm từng bước + nhận xét + `advisory=true`), `grading_appeal`.
- `mastery`: `(userId, typeNodeId)` + `score`, `attempts`, `updatedAt`.
- `content_report`, `usage_quota`, `badge`, `user_badge`, `ai_usage_log` (token + chi phí VND theo job).

Module dùng chung ở `src/lib`: `tone.ts` (enum → màu), `mastery.ts` (ngưỡng 45/70 + quy tắc tổng hợp có trọng số theo số câu), `scoring.ts` (thang Đúng/Sai 0.1/0.25/0.5/1; chuẩn hóa đáp số ngắn), `format-vi.ts`.

## Related Code Files
- Create: `src/server/db/schema/*.ts`, `drizzle/**`, `src/lib/{tone,mastery,scoring,format-vi}.ts`
- Create: `scripts/seed/{taxonomy-math.ts,blueprint-thpt-2025.ts,demo.ts}`

## Implementation Steps
1. Viết schema theo mô tả trên; enum tiếng Anh trong code, nhãn tiếng Việt ở `tone.ts`.
2. Bật pgvector, chọn model embedding **đa ngôn ngữ**, index HNSW cho `question.embedding`.
3. Seed taxonomy Toán 10/11/12 theo chương trình GDPT 2018 tới cấp Dạng bài.
4. Seed mẫu blueprint "Cấu trúc THPT 2025 – Toán": 3 chiều, điểm theo phần (I 0,25 · II 1,0 · III 0,5), **tổng đúng 10,0 điểm và đúng 22 câu**. Mock của prototype sai cả hai: cho ra 11,80 điểm và 28 câu (đã kiểm chứng bằng cách tính lại `defMatrix`).
5. Viết `scoring.ts` + unit test cho cả 4 loại câu, đặc biệt thang điểm từng phần của Đúng/Sai và chuẩn hóa đáp số ngắn.
6. Seed demo tối thiểu để các phase sau có dữ liệu chạy.

## Success Criteria
<!-- Updated: Validation Session 1 - thêm visibility + takedown; mẫu ma trận phải đúng 22 câu / 10,0 điểm -->
- [ ] Migration chạy sạch từ DB rỗng
- [ ] Truy vấn kho có helper lọc `visibility` + `takedownAt` dùng chung, không lặp điều kiện ở từng chỗ gọi (có test)
- [ ] Seed ra cây taxonomy đủ 5 cấp cho Toán 10–12
- [ ] Blueprint mẫu tổng đúng 10,0 điểm và biểu diễn được "NB Đúng/Sai" lẫn "VDC nhiều lựa chọn"
- [ ] Unit test `scoring.ts` phủ: 0/1/2/3/4 ý đúng; đáp số `2` vs `2,0` vs ` 2 `; mcq; rubric tự luận
- [ ] Truy vấn pgvector tìm câu tương tự chạy dưới 100ms với 10k câu seed

## Risk Assessment
- **Cây dạng bài sai chuẩn** → seed lấy theo SGK/chương trình, đánh dấu node do AI đề xuất riêng để admin duyệt.
- **Ngưỡng phát hiện trùng** → hiệu chỉnh bằng dữ liệu thật ở phase 5, chưa chốt cứng ở đây.
- **Schema đổi về sau** → chấp nhận; chỉ khóa chặt phần `question` + `scoring` vì các phase sau phụ thuộc nặng.
