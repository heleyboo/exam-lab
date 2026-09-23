---
phase: 10
title: "Giáo viên soạn và xuất đề"
status: pending
priority: P1
dependencies: [6]
---

# Phase 10: Giáo viên soạn và xuất đề

## Overview
Giáo viên khai ma trận **3 chiều**, hệ thống bốc câu từ kho, đổi câu, trộn nhiều mã đề, xuất PDF/Word kèm đáp án. Kèm màn duyệt kho câu hỏi (chỉ xem).

## Requirements
- Chức năng: trình tạo ma trận 3 chiều (mức độ × loại câu, nhóm cột theo Phần I/II/III), mẫu THPT 2025, cảnh báo kho thiếu câu, sinh đề, đổi từng câu cùng dạng, kéo thả sắp xếp, trộn 1–8 mã đề, xuất PDF và Word, xem trước bản in.
- Phi chức năng: sinh đề 50 câu < 5 giây; **preview và file xuất dùng chung một template**.

## Architecture
- Ma trận 3 chiều: hàng = chủ đề/dạng bài, cột = (loại câu × mức độ) nhóm dưới Phần I/II/III. Điểm/câu theo phần: I 0,25 · II 1,0 · III 0,5. Tổng phải bằng 10,0 mới cho sinh đề.
- Cấu trúc phần và điểm/câu **thuộc về mẫu ma trận, không hardcode**: đề thi vào 10 chuyên (mảng thứ hai của sản phẩm) toàn tự luận, không có Phần I/II/III và điểm mỗi câu khác nhau. Mẫu "THPT 2025" chỉ là một cấu hình trong số nhiều cấu hình.
- Bốc câu: chỉ lấy `published`, loại câu đã dùng trong đề khác của cùng giáo viên trong N ngày (tùy chọn), ưu tiên đa dạng nguồn.
- Trộn mã đề: hoán vị câu và phương án theo seed lưu trong `exam_variant` để tái tạo lại được bản in.
- Xuất: HTML + KaTeX → Playwright → PDF; Word qua pandoc (LaTeX → OMML). **Font bản in: Times New Roman** (thông lệ đề thi VN), không dùng Montserrat như preview của prototype.
- Câu `visibility=restricted` vẫn được bốc vào đề của giáo viên, nhưng **không** xuất hiện ở trang công khai và không cho tải file đề gốc.

## Related Code Files
- Create: `src/app/(teacher)/{dashboard,blueprint,exams,bank}/**`
- Create: `src/server/services/{exam-generation,exam-export}.ts`
- Create: `src/server/jobs/export-exam.ts`, `src/templates/exam-paper/*` (template dùng chung cho preview + xuất)

## Implementation Steps
1. Trình tạo ma trận: ô nhập số câu, tổng theo hàng/cột, tổng điểm + trạng thái hợp lệ, cảnh báo thiếu câu trong kho theo từng ô.
2. Nạp mẫu "Cấu trúc THPT 2025 – Toán" đã sửa cho tổng đúng 10,0.
3. Sinh đề + màn xem lại theo Phần I/II/III, đổi câu cùng dạng, kéo thả bằng dnd-kit có hỗ trợ bàn phím.
4. Mã đề: chọn 1–8, bật/tắt trộn câu và trộn phương án, xem trước từng mã.
5. Xuất PDF/Word kèm tùy chọn đáp án và lời giải; header đề (Sở GD&ĐT, trường, mã đề, thời gian).
6. Màn duyệt kho câu hỏi cho giáo viên: tìm kiếm + lọc thật theo taxonomy/mức độ/loại/nguồn/năm.

## Success Criteria
- [ ] Ma trận biểu diễn được "NB Đúng/Sai" và "VDC nhiều lựa chọn" (điểm khác biệt so với prototype)
- [ ] Không cho sinh đề khi tổng điểm ≠ 10,0 hoặc kho thiếu câu
- [ ] Sinh đề 50 câu < 5 giây
- [ ] Xuất 4 mã đề, công thức hiển thị đúng trong cả PDF và Word
- [ ] Bản in trên màn hình và file xuất giống nhau (cùng template)
- [ ] Giáo viên **không** sửa được câu trong kho (chỉ xem)

## Risk Assessment
- **Bảng ma trận 3 chiều quá rộng** → nhóm cột theo Phần, thu gọn được từng phần, cuộn ngang có cột hàng cố định.
- **Word giữ công thức** → kiểm chứng pandoc → OMML sớm ở phase này; nếu không đạt thì xuất Word dạng ảnh công thức và ghi rõ hạn chế.
- **Font bản in** → đã chốt Times New Roman (Validation Session 1); kiểm tra dấu tiếng Việt và công thức KaTeX hiển thị ổn với font này trong bản PDF.
