---
phase: 11
title: "Đề online và kết quả"
status: pending
priority: P2
dependencies: [8, 10]
---

# Phase 11: Đề online và kết quả

## Overview
Học sinh làm đề đầy đủ online theo link có lịch mở/đóng; giáo viên xem kết quả lớp. Đây là phần khép kín vòng "soạn đề → học sinh làm → giáo viên xem".

## Requirements
- Chức năng: link làm bài có `opensAt`/`closesAt`, màn làm đề (đồng hồ, lưới điều hướng, đánh dấu câu, xác nhận nộp), trang kết quả cho học sinh (điểm theo Phần I/II/III và theo dạng bài, **xem lại từng câu**), màn kết quả cho giáo viên (danh sách nộp, điểm, phổ điểm, câu sai nhiều, xuất CSV).
- Phi chức năng: chấm tự động **cả Phần I, II và III**; tự lưu bài làm để mất mạng không mất kết quả.

## Architecture
- `exam_session` giữ link + lịch; ngoài khung giờ thì chặn ở server.
- Bài làm lưu theo từng câu ngay khi chọn (optimistic + hàng đợi gửi lại khi mất mạng).
- Nộp bài: chấm tự động 3 loại câu tự động; câu tự luận trong đề (nếu có) để giáo viên xem, không chấm tự động.
- Kết quả giáo viên: tổng hợp theo `exam_session`, thống kê câu sai nhiều nhất theo dạng bài.

## Related Code Files
- Create: `src/app/(public)/e/[slug]/**` (làm bài qua link), `src/app/(student)/exams/**`
- Create: `src/app/(teacher)/exams/[id]/results/page.tsx`
- Create: `src/server/services/exam-session.ts`

## Implementation Steps
1. Tạo link + lịch mở/đóng ở màn xuất đề (phase 10).
2. Màn làm đề: đồng hồ đếm ngược, lưới 22+ ô có trạng thái đã trả lời / đánh dấu / bỏ trống, cảnh báo trước khi nộp.
3. Tự lưu từng câu + khôi phục khi tải lại.
4. Nộp và chấm; trang kết quả học sinh theo phần và theo dạng bài; **xem lại từng câu** kèm lời giải.
5. Màn kết quả giáo viên + xuất CSV.

## Success Criteria
<!-- Updated: Validation Session 1 - bắt buộc đăng nhập khi làm bài qua link -->
- [ ] Ngoài khung giờ thì không vào được, kiểm tra **ở server**
- [ ] Chưa đăng nhập thì link dẫn sang đăng nhập/đăng ký rồi quay lại đúng đề; kết quả gắn vào mastery và lịch sử của học sinh
- [ ] Mất mạng giữa chừng rồi vào lại vẫn còn nguyên bài làm
- [ ] Phần II (Đúng/Sai) được chấm tự động — sửa mâu thuẫn của prototype
- [ ] "Xem lại từng câu" hoạt động thật, không phải nút chết
- [ ] Giáo viên thấy danh sách nộp, điểm, phổ điểm và tải được CSV
- [ ] Hai học sinh làm cùng lúc không ảnh hưởng bài của nhau

## Risk Assessment
- **Đăng nhập**: đã chốt **bắt buộc đăng nhập** (Validation Session 1) để chống nộp hộ và gắn kết quả vào mastery/lịch sử. Rủi ro còn lại: học sinh chưa có tài khoản vào phút chót → cần luồng đăng ký nhanh ngay trên trang link.
- **Gian lận** → ngoài phạm vi MVP; chỉ ghi thời gian mỗi câu để phát hiện bất thường sau.
- **Nhiều học sinh nộp cùng lúc** → chấm trong transaction ngắn, đẩy phần tổng hợp sang job.
