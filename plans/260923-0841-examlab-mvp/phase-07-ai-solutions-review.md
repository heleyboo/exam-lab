---
phase: 7
title: "Lời giải AI và hàng chờ duyệt"
status: pending
priority: P1
dependencies: [5, 6]
---

# Phase 7: Lời giải AI và hàng chờ duyệt

## Overview
Sinh lời giải từng bước cho câu thiếu lời giải, tự đối chiếu với đáp án gốc, và cho admin duyệt qua hàng chờ có ưu tiên.

## Requirements
- Chức năng: job sinh lời giải, cờ khớp/lệch đáp án gốc, hàng chờ 2 bộ lọc, màn duyệt hiển thị các bước sửa được, 3 hành động (duyệt / sửa rồi duyệt / từ chối kèm lý do).
- Phi chức năng: lời giải chỉ hiện với học sinh khi đã duyệt; lưu dấu model + thời điểm sinh.

## Architecture
- Job `generate-solution` chạy theo lô cho câu `origin=import` thiếu lời giải.
- So kết luận của AI với `answerKey` gốc → `matchesSourceKey`; lệch thì vào bộ lọc ưu tiên.
- Enum lý do từ chối: sai biến đổi đại số · sai đáp án cuối · thiếu điều kiện · **đáp án gốc của đề sai** (giá trị cuối kích hoạt cờ nghi ngờ trên `source_exam`).
- Lời giải lưu nhiều bước, mỗi bước có nội dung Markdown+LaTeX; admin sửa từng bước.

## Related Code Files
- Create: `src/server/jobs/generate-solution.ts`, `src/app/(admin)/solutions/page.tsx`, `src/components/domain/solution-review/*`
- Modify: `src/server/services/question-workflow.ts` (điều kiện publish cần lời giải đã duyệt)

## Implementation Steps
1. Prompt sinh lời giải từng bước cho 4 loại câu, bắt buộc nêu kết luận riêng để đối chiếu máy.
2. Job chạy lô + ghi `ai_usage_log`.
3. Hàng chờ: 2 bộ lọc (lệch / khớp), danh sách cuộn, chọn câu để xem chi tiết.
4. Màn duyệt: câu hỏi, đáp án gốc, các bước AI (bước nghi ngờ tô đậm), 3 hành động + lý do.
5. Khi duyệt, tự chuyển câu sang trạng thái tiếp theo nếu đã đủ điều kiện publish.

## Success Criteria
- [ ] Câu lệch đáp án gốc **luôn** vào bộ lọc ưu tiên và không bao giờ tự publish (có test)
- [ ] Duyệt xong lời giải thì học sinh mới thấy lời giải đó
- [ ] Lưu đúng model + ngày sinh cho mỗi lời giải
- [ ] Từ chối với lý do "đáp án gốc của đề sai" gắn cờ lên đề nguồn
- [ ] Duyệt 30 lời giải liên tiếp không phải tải lại trang

## Risk Assessment
- **AI giải sai nhưng kết luận trùng đáp án** (đúng kết quả, sai cách) → admin vẫn phải đọc; không tự động duyệt kể cả khi khớp.
- **Chi phí sinh lời giải hàng loạt** → chạy theo lô có hạn mức ngày, ưu tiên câu đã publish được dùng nhiều.
