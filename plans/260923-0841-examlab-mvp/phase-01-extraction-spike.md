---
phase: 1
title: Spike trích xuất đề
status: in-progress
priority: P1
dependencies: []
---

# Phase 1: Spike trích xuất đề

## Overview
Chứng minh pipeline trích xuất đề Toán THPT (PDF số, PDF scan, docx) → JSON từng câu đủ tốt để làm sản phẩm. **Cổng chặn**: không đạt thì phải đổi hướng trước khi viết bất kỳ UI nào.

## Requirements
- Chức năng: script CLI chạy trên 10–20 đề thật → xuất JSON theo schema câu hỏi + ảnh cắt theo bounding box + báo cáo đo lường.
- Phi chức năng: chi phí/trang đo được; chạy lại được (lưu response thô để so sánh giữa các lần đổi prompt).
- Không làm UI, không DB, không auth ở phase này.

## Architecture
- `pdftoppm` (poppler, trong Docker) render mỗi trang → PNG 150–200 DPI.
- Gửi ảnh trang + prompt JSON schema cho VLM. **Claude vision là mặc định**; Gemini chỉ chạy đối chứng trên tập scan để biết chênh lệch chất lượng/chi phí.
- docx: `pandoc` → Markdown + LaTeX → LLM tách câu (không cần ảnh).
- Output: `out/<exam>/questions.json`, `out/<exam>/figures/*.png`, `out/<exam>/raw/*.json`.
- Schema câu hỏi: `kind` (mcq | true_false | short_answer | essay), `stem` (Markdown+LaTeX), `options[]`, `tfItems[]`, `answerKey`, `solution?`, `figures[] {rect: "l,t,w,h" % trang, page}`, `sourceRef {page, index}`.

## Related Code Files
<!-- Updated: đã dựng xong bộ khung, đường dẫn thực tế khác mô tả ban đầu -->
- Đã tạo: `spike/run-extract.ts`, `spike/score.ts`, `spike/schema.ts`, `spike/lib/*.ts`, `spike/prompts/*.md`, `spike/README.md`
- Đã tạo: `package.json`, `tsconfig.json`, `.env.example`, `pnpm-workspace.yaml`
- `spike/fixtures/` và `spike/out/` đã vào `.gitignore` (đề có bản quyền, không commit)
- **Không làm `docker/spike.Dockerfile`**: spike chạy bằng poppler/imagemagick/pandoc cài qua Homebrew trên máy dev. Các công cụ này sẽ đóng gói vào image worker ở Phase 5, nơi thật sự cần chạy trên VPS.

## Implementation Steps
1. Thu thập 10–20 đề Toán THPT thật, **chủ yếu đề trường/sở** (đúng nguồn sẽ dùng thật) + vài đề công khai của Bộ làm mốc so sánh. Tối thiểu 5 PDF số, **8 PDF scan**, 3 docx.
1b. Tiền xử lý ảnh cho bản scan: deskew, khử nhiễu, cắt viền, thử 150 và 300 DPI; đo ảnh hưởng tới độ chính xác.
2. Viết schema JSON + prompt trích xuất (few-shot với 1 câu mỗi loại theo format THPT 2025).
3. Pipeline PDF: render trang → gọi VLM theo từng trang → ghép câu bị cắt ngang trang → cắt hình theo bbox.
4. Pipeline docx: pandoc → LLM tách câu.
5. Map bảng đáp án cuối đề vào từng câu.
6. Chấm điểm thủ công 1 lần: đọc từng đề, đánh dấu câu nào tách đúng/sai, LaTeX đúng/sai, hình gắn đúng/sai.
7. Viết report: `plans/reports/spike-*-extraction-quality-report.md` gồm tỉ lệ theo từng loại nguồn, lỗi hay gặp, chi phí/trang, thời gian/đề.

### Trạng thái
- **Xong**: bộ khung `spike/` chạy được, đã qua code review và sửa 8 lỗi có thể cho ra số đo sai. Kiểm chứng bằng PDF tự tạo: dọn ảnh cũ, đánh số trang theo tên file, giới hạn khoảng trang, bảng đáp án khoá theo (phần, số câu), hình giữ đúng số trang, chặn ghép câu sai vị trí, kẹp toạ độ vượt biên, chặn cờ sai chính tả, chặn chấm nhãn cũ cho bản mới, chặn chấm khi thiếu tổng số câu thật.
- **Chờ**: đề thật (≥ 5 PDF số, 8 PDF scan, 3 docx) để chạy và chấm. Chưa có số liệu thì phase chưa đạt.
- **Đã cắt**: đối chứng Gemini. Chỉ so Opus 5 với Sonnet 5 — đủ để biết đánh đổi chất lượng/chi phí mà không cần thêm SDK và API key. Nếu bản scan không đạt mục tiêu 80%, cân nhắc mở lại.

## Success Criteria
<!-- Updated: Validation Session 1 - nguồn đề trường/sở, scan bắt buộc trong MVP, sàn 60% cho scan, Claude mặc định -->
- [ ] ≥ 90% câu tách đúng ranh giới trên PDF số; **mục tiêu 80% trên PDF scan, sàn 60%**
- [ ] Dưới sàn 60% với scan → dừng tối ưu AI, chuyển sang tối ưu màn soát cho nhập nhanh (ghi rõ kết luận trong report)
- [ ] ≥ 85% công thức LaTeX đúng (đọc hiểu được, không sai ký hiệu toán)
- [ ] ≥ 70% hình gắn đúng câu (phần còn lại admin sửa tay)
- [ ] Nhận đúng cả 4 loại câu theo format THPT 2025
- [ ] Chi phí đo được và < 3.000đ/trang
- [ ] Report có kết luận rõ: tiếp tục / đổi công cụ / đổi cách nhập liệu

## Risk Assessment
- **Scan là rủi ro lớn nhất và đã được chọn giữ trong MVP** → tiền xử lý ảnh + đối chứng Sonnet 5; sàn 60% quyết định có chuyển sang hướng nhập bán thủ công hay không. Giới hạn thời gian spike 2 tuần để không trượt vô hạn.
- **Hình vẽ hình học phức tạp** → chấp nhận admin cắt tay ở phase 6, không cố tự động hóa.
- **Bản quyền đề trường/sở** → **không commit file gốc**; mỗi đề phải ghi nguồn (trường, năm, kỳ thi); kho dùng cột `visibility` (xem Phase 3).
