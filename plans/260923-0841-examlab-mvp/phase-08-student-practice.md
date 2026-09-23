---
phase: 8
title: "Luyện tập học sinh"
status: pending
priority: P1
dependencies: [4, 6]
---

# Phase 8: Luyện tập học sinh

## Overview
Vòng lặp chính của học sinh: duyệt chủ đề theo cây, luyện theo dạng bài, chấm ngay 3 loại câu tự động, xem lời giải, cập nhật độ thành thạo, xem tổng quan và lịch sử.

## Requirements
- Chức năng: màn tổng quan (KPI, mastery, heatmap 8 tuần, ôn phần yếu, tiếp tục phiên), cây chủ đề **đủ 5 cấp**, phiên luyện tập cho mcq / đúng-sai / trả lời ngắn, xem lời giải, báo lỗi câu hỏi, hồ sơ và lịch sử.
- Phi chức năng: mobile-first cho màn luyện tập; vùng chạm ≥ 44px; nội dung chưa `published` không bao giờ lộ qua API.

## Architecture
- Server action `submitAnswer` dùng `src/lib/scoring.ts`; **chấm ở server**, client không giữ đáp án trước khi nộp.
- Mastery cập nhật theo `(userId, typeNodeId)`; cấp Chủ đề và Chương tính bình quân có trọng số theo số câu.
- "Ôn phần yếu" = lấy dạng bài có mastery thấp nhất và đủ số câu đã publish.
- Câu tự luận ở phiên luyện tập chỉ hiện nút dẫn sang phase 9.

## Related Code Files
- Create: `src/app/(student)/{dashboard,topics,practice,profile}/**`
- Create: `src/server/services/{practice,mastery}.ts`
- Create: `src/app/(student)/practice/actions.ts`

## Implementation Steps
1. Cây chủ đề 5 cấp, có thu gọn, hiện số câu và % thành thạo mỗi node, bộ lọc mức độ và loại câu chạy thật.
2. Phiên luyện tập: lấy câu theo dạng bài, hiện tiến độ và đồng hồ, giao diện trả lời theo từng loại (keypad số cho trả lời ngắn).
3. Chấm + phản hồi ngay + xem lời giải đã duyệt.
4. Báo lỗi câu hỏi: dialog thật, ghi `content_report`.
5. Cập nhật mastery + heatmap + streak.
6. Màn tổng quan và hồ sơ/lịch sử.

## Success Criteria
- [ ] Gọi API lấy câu hỏi **không** trả về đáp án trước khi nộp (có test)
- [ ] Câu chưa `published` không xuất hiện ở bất kỳ endpoint nào của học sinh (có test)
- [ ] Thang điểm Đúng/Sai chấm đúng 0,1 / 0,25 / 0,5 / 1
- [ ] Trả lời ngắn chấp nhận `2`, `2,0`, ` 2 ` như nhau
- [ ] Mastery đổi sau mỗi câu và "ôn phần yếu" trả đúng dạng bài yếu nhất
- [ ] Màn luyện tập dùng được bằng một tay trên mobile

## Risk Assessment
- **Học sinh xem đáp án qua devtools** → chấm ở server, không gửi kèm đáp án.
- **Mastery nhảy loạn khi ít dữ liệu** → dùng trung bình có làm mượt, cần tối thiểu 5 câu mới hiện %.
- **Thiếu câu đã publish cho dạng bài** → hiện trạng thái rỗng tử tế, gợi ý dạng khác.
