---
phase: 9
title: "Tự luận và AI chấm"
status: pending
priority: P2
dependencies: [8]
---

# Phase 9: Tự luận và AI chấm

## Overview
Học sinh nộp bài tự luận bằng ảnh chụp hoặc editor toán; AI chấm theo rubric từng bước với nhãn "tham khảo"; học sinh khiếu nại được và admin xử lý.

## Requirements
- Chức năng: upload nhiều ảnh (chụp/chọn file, xem trước, cắt, xóa), editor toán theo từng bước, job AI chấm, màn kết quả rubric, khiếu nại, hàng chờ khiếu nại cho admin.
- Phi chức năng: mỗi lần chấm trừ quota; điểm tự luận **không** vào xếp hạng; ảnh bài làm là dữ liệu cá nhân, chỉ chủ sở hữu và admin xem được.

## Architecture
- Editor: MathLive, mỗi bước là một dòng, serialize LaTeX. Thanh công cụ cần icon thật (nhãn trong prototype là chuỗi rác sinh từ việc bỏ dấu `\`).
- Job `grade-essay`: ảnh hoặc LaTeX + rubric của câu → điểm từng bước + nhận xét + tổng điểm tham khảo.
- Khiếu nại: học sinh nêu điểm mong muốn + lý do → `grading_appeal`, admin chấp nhận (chấm lại) hoặc giữ nguyên. SLA 24h.
- Ảnh lưu storage với đường dẫn ký hạn ngắn.

## Related Code Files
- Create: `src/app/(student)/essay/**`, `src/server/jobs/grade-essay.ts`, `src/components/domain/{math-editor,rubric}/*`
- Create: `src/app/(admin)/appeals/page.tsx`

## Implementation Steps
1. Tab "Chụp bài làm": upload nhiều trang, xem trước, cắt, xóa, giới hạn dung lượng và số trang.
2. Tab "Giải trên app": MathLive theo từng bước, thêm/xóa bước, lưu nháp.
3. Job chấm + ghi quota + `ai_usage_log`.
4. Màn kết quả: bảng rubric từng bước (điểm đạt/tối đa, tô bước sai), nhận xét AI, lời giải mẫu đặt cạnh, banner "Chấm tham khảo".
5. Khiếu nại + hàng chờ admin + chấm lại.
6. Chặn quota: hết lượt thì hiện trang gói (phase 12), không gọi AI.

## Success Criteria
- [ ] Hết quota thì **không** gọi API AI (có test)
- [ ] Học sinh khác không mở được ảnh bài làm của người khác (có test)
- [ ] Điểm tự luận không xuất hiện trong bất kỳ bảng xếp hạng nào
- [ ] Kết quả luôn hiện nhãn "tham khảo" và nút khiếu nại
- [ ] Chấm lại sau khiếu nại ghi đè điểm và lưu lịch sử phiên bản trước

## Risk Assessment
- **AI chấm ảnh viết tay sai nhiều** → nhãn tham khảo + khiếu nại; theo dõi tỉ lệ khiếu nại, nếu > 20% thì cân nhắc bỏ chấm ảnh, chỉ giữ editor.
- **Chi phí cao nhất hệ thống** → quota chặt (5 lượt/ngày Free), nén ảnh trước khi gửi.
- **MathLive trên mobile** → kiểm tra bàn phím ảo sớm; nếu tệ thì mobile chỉ dùng chụp ảnh.
