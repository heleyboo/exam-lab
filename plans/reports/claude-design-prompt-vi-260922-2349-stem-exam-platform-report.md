# Prompt Claude Design (bản tiếng Việt) — prototype ExamLab

Bản dịch của `claude-design-prompt-260922-2349-stem-exam-platform-report.md`. Copy toàn bộ nội dung trong khung bên dưới vào Claude Design.

```text
Hãy thiết kế một prototype web độ trung thực cao, có thể click được, cho "ExamLab" — nền tảng luyện đề và soạn đề thi dành cho học sinh và giáo viên Việt Nam, môn Toán THPT (lớp 10–12), sau này mở rộng sang Vật lý, Hóa học, Sinh học.

TOÀN BỘ CHỮ TRÊN GIAO DIỆN VÀ DỮ LIỆU MẪU PHẢI BẰNG TIẾNG VIỆT. Dùng nội dung Toán tiếng Việt thực tế, công thức hiển thị đúng chuẩn (kiểu LaTeX: phân số, tích phân, logarit, vectơ, giới hạn), ví dụ: "Cho hàm số y = x³ − 3x² + 2. Tìm giá trị cực đại của hàm số."

## Bối cảnh sản phẩm
- Bốn vai trò: Học sinh, Giáo viên, Admin, Reviewer (người duyệt nội dung). Có nút chuyển vai trò trong prototype để demo được mọi luồng.
- Các loại câu hỏi theo cấu trúc đề thi tốt nghiệp THPT từ 2025:
  1. Trắc nghiệm nhiều lựa chọn (4 phương án A–D)
  2. Trắc nghiệm Đúng/Sai (một câu dẫn, 4 ý a–d, mỗi ý chọn Đúng/Sai; chấm điểm từng phần 0,1 / 0,25 / 0,5 / 1)
  3. Trả lời ngắn (điền đáp số)
  4. Tự luận (học sinh chụp ảnh bài làm viết tay HOẶC gõ lời giải bằng trình soạn công thức ngay trên app)
- Phân loại nội dung: Môn → Lớp → Chương → Chủ đề → Dạng bài, kèm mức độ nhận thức: Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao.
- Nhãn trạng thái nội dung: Nháp, Chờ duyệt, Đã duyệt, Đã xuất bản, Từ chối. Nhãn nguồn gốc: Import, Admin, AI biến thể, HS tự sinh ("AI – chưa kiểm duyệt").
- Mọi tính năng AI đều được gắn nhãn rõ ràng; kết quả AI chấm tự luận gắn nhãn "Chấm tham khảo".
- Mô hình freemium: hiển thị số lượt AI còn lại (ví dụ "Còn 3/5 lượt AI hôm nay") kèm gợi ý nâng cấp gói.

## Định hướng hình ảnh
- Điềm tĩnh, tập trung, mang tính học thuật nhưng hiện đại; nhiều khoảng trắng; hiển thị công thức toán đẹp và rõ.
- Giao diện sáng là chính, có thêm phiên bản tối. Một màu nhấn chủ đạo (xanh dương đậm hoặc xanh ngọc) cùng các màu ngữ nghĩa cho đúng / sai / đang chờ.
- Ưu tiên desktop cho Admin và Giáo viên; responsive đầy đủ, ưu tiên mobile cho các màn luyện tập của Học sinh.
- Đảm bảo khả năng tiếp cận: độ tương phản chuẩn AA, trạng thái focus rõ ràng, vùng chạm lớn trên mobile.

## Các màn hình cần thiết kế

### Công khai
1. Trang giới thiệu (landing): giá trị cho học sinh và giáo viên, thẻ câu hỏi mẫu, nút kêu gọi Đăng ký / Đăng nhập.
2. Đăng nhập / đăng ký (email + Google), chọn vai trò Học sinh / Giáo viên.

### Học sinh
3. Trang tổng quan: chuỗi ngày học liên tiếp, số câu đã làm trong tuần, biểu đồ radar hoặc heatmap mức độ thành thạo theo chủ đề, thẻ gợi ý "Ôn phần yếu" (các Dạng bài yếu nhất), thẻ tiếp tục luyện tập, thẻ thử thách hằng ngày, vị trí rút gọn trên bảng xếp hạng.
4. Duyệt chủ đề: cây Lớp → Chương → Chủ đề → Dạng bài, hiển thị % thành thạo ở từng nút, số lượng câu hỏi, bộ lọc theo mức độ và loại câu.
5. Phiên luyện tập (theo Dạng bài): mỗi lần một câu, thanh tiến độ, đồng hồ, ô trả lời thay đổi theo từng loại câu trong 4 loại, phản hồi đúng/sai ngay, nút "Xem lời giải" với lời giải từng bước, "Báo lỗi câu hỏi", nút "Tạo bài tương tự". Thể hiện một trạng thái màn hình cho mỗi loại câu.
6. Nộp bài tự luận: hai tab — "Chụp bài làm" (tải ảnh/mở camera, xem trước nhiều trang, cắt ảnh) và "Giải trên app" (trình soạn công thức có thanh công cụ, viết theo từng dòng bước giải). Nút nộp bài hiển thị số lượt AI sẽ bị trừ.
7. Kết quả AI chấm (Chấm tham khảo): bảng rubric theo từng bước kèm điểm, tô sáng bước làm sai, nhận xét của AI, tổng điểm tham khảo, lời giải mẫu đặt cạnh để đối chiếu, nút "Khiếu nại kết quả".
8. Chế độ làm đề đầy đủ: làm một đề đã sinh với đồng hồ đếm ngược, lưới điều hướng câu hỏi, đánh dấu câu cần xem lại, xác nhận nộp bài, trang kết quả với phân tích điểm theo từng phần (Phần I/II/III) và theo Dạng bài.
9. "Tạo bài tương tự" (AI sinh bài cho học sinh): chọn Dạng bài + mức độ + số lượng → các câu được sinh ra kèm nhãn nổi bật "AI – chưa kiểm duyệt", không tính vào xếp hạng, hiển thị số lượt AI còn lại, nút "Đề xuất đưa vào kho".
10. Thử thách (kiểu LeetCode): bảng danh sách bài với các cột Tên, Dạng bài, Độ khó (Dễ/Trung bình/Khó), Tỉ lệ đúng, Trạng thái (đã giải/đã thử); bộ lọc; banner thử thách hằng ngày; trang chi tiết thử thách gồm đề bài, ô trả lời, lịch sử các lần nộp.
11. Bảng xếp hạng: các tab Tuần / Tháng / Tất cả; lọc theo khối lớp; bục vinh danh top 3; dòng của người dùng hiện tại được ghim; ghi chú "Chỉ tính câu đã kiểm duyệt".
12. Hồ sơ & lịch sử: lịch sử làm bài, tiến bộ mức thành thạo theo chủ đề qua thời gian, huy hiệu.

### Giáo viên
13. Trang tổng quan giáo viên: các đề gần đây, mẫu ma trận đề, nút nhanh "Tạo đề mới".
14. Trình tạo ma trận đề: bảng ma trận với hàng = Chủ đề/Dạng bài, cột = mức độ (NB/TH/VD/VDC) × loại câu; sửa trực tiếp số câu và điểm; tổng cộng cập nhật tức thời (tổng số câu, tổng điểm = 10); cảnh báo khi kho không đủ câu đã xuất bản; nạp mẫu "Cấu trúc THPT 2025 – Toán".
15. Xem lại đề đã sinh: câu hỏi nhóm theo Phần I/II/III, nút "Đổi câu khác cùng dạng" cho từng câu, kéo thả để sắp xếp lại, xem trước hiển thị đúng như bản in.
16. Mã đề & xuất file: chọn số mã đề (ví dụ 4), bật/tắt trộn câu hỏi / trộn phương án, xuất PDF / Word kèm đáp án, tạo link chia sẻ để học sinh làm online; xem trước bản in có phần đầu đề (Sở GD&ĐT, Trường, Mã đề, thời gian làm bài).
17. Duyệt kho câu hỏi (giáo viên chỉ xem): tìm kiếm, lọc theo phân loại / mức độ / loại câu / nguồn / năm, thẻ câu hỏi có công thức hiển thị đúng.

### Admin / Reviewer
18. Trang tổng quan admin: trạng thái các job import, số lượng trong các hàng chờ duyệt (Lời giải AI chờ duyệt, Ưu tiên – lệch đáp án, Biến thể AI, Báo lỗi, Khiếu nại), chi phí AI trong tháng, thống kê nội dung theo chủ đề.
19. Tải đề lên (import): kéo thả file PDF hoặc Word (.docx), form thông tin (Kỳ thi, Trường/Sở, Năm, Môn, Lớp), danh sách job kèm các bước tiến trình (Tải lên → Trích xuất → Phân loại → Kiểm tra trùng → Chờ soát).
20. Không gian soát đề sau import (màn quan trọng nhất của admin): chia đôi màn hình — bên trái: trình xem trang PDF gốc, tô khung (bounding box) cho từng câu; bên phải: danh sách câu đã tách, mỗi câu sửa được (trình soạn Markdown + LaTeX có xem trước trực tiếp, các phương án, đáp án, hình đính kèm có thể cắt lại), Dạng bài và mức độ do AI đề xuất kèm độ tin cậy, cảnh báo trùng lặp có liên kết tới câu tương tự đã có, thao tác gộp/tách câu, duyệt hàng loạt các câu đã chọn.
21. Hàng chờ duyệt lời giải: danh sách có bộ lọc "Khớp đáp án gốc" và "Lệch đáp án gốc" (ưu tiên); màn chi tiết hiển thị câu hỏi, đáp án gốc, lời giải từng bước do AI sinh (sửa được từng bước), các nút Duyệt / Sửa & duyệt / Từ chối kèm lý do.
22. Duyệt biến thể AI (Phase 2): câu gốc và các biến thể được sinh đặt cạnh nhau, trạng thái kiểm chứng (Đã kiểm chứng tự động / Cần kiểm tra), duyệt để đưa vào kho.
23. Quản lý phân loại: cây Môn → Lớp → Chương → Chủ đề → Dạng bài chỉnh sửa được, số câu hỏi ở mỗi nút, gộp/di chuyển nút, các Dạng bài mới do AI đề xuất đang chờ duyệt.
24. Báo lỗi & khiếu nại: báo lỗi nội dung và khiếu nại kết quả AI chấm tự luận, kèm quy trình xử lý.
25. Cài đặt: hạn mức lượt AI theo gói (Free / Pro), nhà cung cấp model AI, quản lý người dùng & phân quyền.

## Các component cần định nghĩa
Thẻ câu hỏi (4 loại), khối văn bản có công thức toán, nhãn trạng thái/nguồn gốc, chip mức độ, thanh và heatmap mức thành thạo, chỉ báo lượt AI, ô trong bảng ma trận, trình xem PDF có lớp phủ bounding box, dòng rubric từng bước, dòng bảng xếp hạng, thanh bước tiến trình job, các trạng thái rỗng / đang tải / lỗi.

## Sản phẩm bàn giao
Một prototype liên kết, điều hướng được giữa các màn theo từng vai trò, có hệ thống thiết kế nhất quán (màu sắc, typography, khoảng cách, component) và dữ liệu mẫu tiếng Việt thực tế. Ưu tiên độ trung thực cao nhất cho các màn 5, 7, 14, 16, 20, 21.
```
