---
phase: 5
title: Pipeline import đề
status: completed
priority: P1
dependencies:
  - 1
  - 3
---

# Phase 5: Pipeline import đề

## Overview
Đưa kết quả spike thành job chạy nền thật: upload PDF/docx → trích xuất từng câu → AI đề xuất dạng bài và mức độ → kiểm tra trùng → đẩy vào hàng chờ soát.

## Requirements
- Chức năng: màn upload + metadata, job 5 bước có tiến trình, lưu câu ở trạng thái `draft`, cắt và lưu hình, map bảng đáp án, chấm điểm tin cậy riêng cho dạng bài và mức độ, phát hiện trùng.
- Phi chức năng: job chạy lại được không sinh trùng; ghi log token + chi phí VND mỗi job; file gốc lưu ở storage, không lưu trong DB.

## Architecture
- `src/server/ai/adapter.ts`: interface `extractQuestions`, `suggestTaxonomy`, `generateSolution`, `gradeEssay`; hai implement Claude và Gemini, chọn theo cấu hình (bảng cấu hình model đọc ở phase 12).
- Job pg-boss `import-exam` chia 5 bước ghi `import_job.state`: `upload → extract → classify → dedupe → await_review`; mỗi bước commit tiến trình để UI hiển thị stepper.
- PDF: `pdftoppm` render trang trong worker; **tiền xử lý ảnh cho bản scan** (deskew, khử nhiễu, DPI theo kết quả Phase 1) bằng `sharp`; gọi VLM theo trang (**Claude mặc định**); ghép câu bị cắt ngang trang; cắt hình theo `rect` %.
- Metadata import có `visibility` (`public` cho đề Bộ, `restricted` cho đề trường/sở); câu kế thừa từ đề nguồn.
- docx: `pandoc` → Markdown + LaTeX → LLM tách câu.
- Dedupe: embedding → pgvector; ≥ 0,95 đánh dấu trùng gần chắc chắn, 0,85–0,95 cảnh báo cho admin; lưu `duplicateOfId` + `similarity`.

## Related Code Files
- Create: `src/server/ai/*`, `src/server/jobs/import-exam.ts`, `src/server/services/{extraction,dedupe,figures}.ts`
- Create: `src/app/(admin)/import/page.tsx` (upload + danh sách job)
- Modify: `src/server/db/schema/{source-exam,import-job,question}.ts` nếu spike lộ thêm trường cần lưu

## Implementation Steps
1. Port script spike thành service, giữ nguyên prompt đã hiệu chỉnh.
2. Viết adapter AI + đo token/chi phí, ghi `ai_usage_log`.
3. Job 5 bước + cập nhật tiến trình; lỗi ở bước nào thì `state=err` và giữ nguyên dữ liệu đã trích được.
4. Cắt hình, upload storage, gắn `rect` + `page` vào câu.
5. Map bảng đáp án cuối đề; câu không map được thì đánh dấu thiếu đáp án.
6. Sinh embedding + dedupe.
7. Màn upload: kéo thả PDF/docx, form metadata (kỳ thi, trường/sở, năm, môn, lớp, **visibility**), 2 tùy chọn (tự kiểm tra trùng, AI đề xuất dạng/mức), danh sách job có stepper.

## Success Criteria
<!-- Updated: Validation Session 1 - tiền xử lý scan, Claude mặc định, visibility khi import -->
- [ ] Import 1 đề 50 câu chạy hết 5 bước, câu vào DB ở trạng thái `draft` với đầy đủ nguồn (trang, số thứ tự câu)
- [ ] Đề scan chạy qua bước tiền xử lý ảnh và đạt ít nhất mức sàn đo ở Phase 1
- [ ] Câu kế thừa đúng `visibility` từ đề nguồn
- [ ] Chạy lại cùng file không tạo bản sao (idempotent theo checksum file)
- [ ] Hình được cắt và gắn đúng câu theo `rect` %
- [ ] Câu trùng ≥ 0,95 tự gắn cờ, 0,85–0,95 hiện cảnh báo
- [ ] `ai_usage_log` ghi đúng token và chi phí VND mỗi job
- [ ] Job lỗi giữa chừng không mất dữ liệu đã trích

## Câu hỏi còn mở
- **Một file chứa nhiều đề** (tuyển tập, tập đề ôn) là tình huống có thật khi admin upload. Spike xử lý bằng cách dò ranh giới rồi chạy từng khoảng trang (`spike/outline.ts`). Bản sản phẩm cần quyết: bắt admin tách file trước khi upload, hay hệ thống tự dò ranh giới rồi cho admin xác nhận trước khi trích xuất.
- Sách tuyển tập để lời giải ở phần riêng phía sau, không nằm cạnh đề. Ghép lời giải vào đúng câu trong trường hợp này chưa có thiết kế.

## Risk Assessment
- **Câu bị cắt ngang trang** → gửi kèm phần cuối trang trước làm ngữ cảnh; nếu vẫn lỗi thì để admin gộp tay ở phase 6.
- **Chi phí vượt dự tính** → giới hạn số trang mỗi job, cảnh báo trước khi chạy đề dày.
- **Prompt drift khi đổi model** → prompt lưu thành file có version, ghi version vào `ai_usage_log`.
