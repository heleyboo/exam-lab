---
phase: 6
title: Soát và duyệt đề
status: in-progress
priority: P1
dependencies:
  - 4
  - 5
---

# Phase 6: Soát và duyệt đề

## Overview
Màn nặng nhất của admin: xem PDF gốc kèm khung bounding box bên trái, sửa từng câu bên phải, xử lý trùng, gộp/tách câu, duyệt theo lô. Kèm màn quản lý cây phân loại.

## Requirements
- Chức năng: viewer trang PDF + overlay bbox, editor Markdown+LaTeX có xem trước trực tiếp, sửa phương án và đáp án, gắn/cắt lại hình, chấp nhận hoặc sửa đề xuất dạng bài và mức độ của AI, xử lý trùng, gộp câu, tách câu, duyệt hàng loạt, chuyển trạng thái tới `published`.
- Phi chức năng: sửa 50 câu trong ≤ 20 phút; không mất dữ liệu khi refresh (lưu nháp tự động).

## Architecture
- Trang ảnh render sẵn ở phase 5, lưu storage; overlay dùng `BBoxOverlay` với `rect` theo % nên zoom không lệch.
- Click khung bên trái ⇄ cuộn tới câu bên phải và ngược lại.
- Sửa được khung: kéo/thu phóng khung rồi cắt lại hình (job nhỏ `recrop-figure`).
- Gộp câu: nối stem + hợp nhất hình, giữ `sourceRef` của câu đầu. Tách câu: cắt stem tại vị trí con trỏ thành 2 bản ghi.
- Chuyển trạng thái tập trung ở `src/server/services/question-workflow.ts` (một chỗ duy nhất kiểm tra điều kiện sang `published`: phải có đáp án + lời giải đã duyệt).

## Related Code Files
- Create: `src/app/(admin)/proofing/[jobId]/page.tsx`, `src/components/domain/proofing/*`
- Create: `src/app/(admin)/taxonomy/page.tsx` (cây 5 cấp, thêm/gộp/di chuyển node, duyệt dạng bài do AI đề xuất)
- Create: `src/server/services/question-workflow.ts`

## Implementation Steps
1. Viewer trang + overlay bbox + zoom + chuyển trang.
2. Danh sách câu bên phải: thẻ mở rộng được, editor ↔ xem trước, phương án, đáp án gốc, hình.
3. Đề xuất AI: hiện dạng bài và mức độ kèm % tin cậy riêng, một click để chấp nhận.
4. Cảnh báo trùng: hiện câu giống kèm %, hai hành động "đánh dấu là bản trùng" và "vẫn giữ (khác dữ kiện)".
5. Gộp câu / tách câu / duyệt hàng loạt.
6. Màn taxonomy: cây 5 cấp, sửa node, gộp và di chuyển, hàng chờ dạng bài do AI đề xuất.
7. Lưu nháp tự động + cảnh báo khi rời trang còn thay đổi chưa lưu.

## Success Criteria
- [ ] Soát xong đề 50 câu trong ≤ 20 phút (đo bằng đồng hồ thật, ghi vào report)
- [ ] Khung bbox khớp đúng vị trí ở mọi mức zoom
- [ ] Gộp và tách câu giữ đúng hình và nguồn
- [ ] Câu thiếu đáp án hoặc thiếu lời giải đã duyệt **không** chuyển được sang `published` (chặn ở service, có test)
- [ ] Refresh giữa chừng không mất nội dung đang sửa
- [ ] Đánh dấu trùng ghi `duplicateOfId` và ẩn câu trùng khỏi kho công khai

### Trạng thái
- **Xong**: màn soát chia đôi (ảnh trang kèm khung ↔ danh sách câu), sửa đề bài và đáp án, xử lý trùng, ghi nhật ký soát, chốt chặn xuất bản, báo cáo chất lượng sinh từ nhật ký soát.
- **Chưa làm**: màn quản lý cây phân loại, gộp và tách câu, duyệt hàng loạt, lưu nháp tự động, và **AI đề xuất dạng bài kèm độ tin cậy** (thiếu từ Phase 5, câu nhập vào hiện chưa được gắn phân loại).
- Kéo chỉnh khung và gộp/tách vốn đã được kế hoạch cho phép cắt nếu trễ; ba mục còn lại thì chưa.

## Risk Assessment
- **Màn quá phức tạp, dễ trễ** → làm theo thứ tự: viewer + sửa + duyệt trước; kéo chỉnh khung và gộp/tách sau; cắt được nếu trễ.
- **Ảnh trang nặng** → render sẵn nhiều mức độ phân giải, lazy load theo trang.
- **Xung đột 2 admin soát cùng job** → khóa mềm theo job, hiện ai đang mở.
