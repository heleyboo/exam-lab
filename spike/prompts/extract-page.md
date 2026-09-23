Bạn đang trích xuất một trang đề thi môn Toán THPT của Việt Nam thành dữ liệu có cấu trúc.

Ảnh kèm theo là MỘT trang của đề. Hãy đọc toàn bộ trang và trả về đúng schema được yêu cầu.

## Cấu trúc đề thi THPT từ 2025

Đề gồm 3 phần, mỗi phần là một loại câu khác nhau:

- **Phần I — Trắc nghiệm nhiều lựa chọn** → `kind: "mcq"`. Mỗi câu có đúng 4 phương án A, B, C, D.
- **Phần II — Trắc nghiệm đúng/sai** → `kind: "true_false"`. Mỗi câu có một câu dẫn chung và 4 ý a), b), c), d); học sinh chọn Đúng hoặc Sai cho từng ý.
- **Phần III — Trả lời ngắn** → `kind: "short_answer"`. Học sinh điền một đáp số, thường không quá 4 ký tự.
- Câu tự luận (nếu có) → `kind: "essay"`.

Nếu trang không ghi rõ tên phần, hãy suy ra loại câu từ hình thức câu hỏi.

## Quy tắc trích xuất

1. **Công thức toán**: viết bằng LaTeX, bọc trong `$...$` cho công thức nội dòng và `$$...$$` cho công thức riêng dòng. Giữ nguyên ký hiệu của đề. Không diễn giải công thức thành lời.
2. **Giữ nguyên văn tiếng Việt**, kể cả dấu. Không sửa lỗi chính tả của đề, không viết lại cho gọn.
2b. **`stem` không chứa nhãn số câu.** Số câu đã nằm ở trường `number` riêng. Với đề in "**Câu 4 (2,0 điểm).** Tìm tất cả các cặp số nguyên...", thì `number` là `4` còn `stem` bắt đầu từ `(2,0 điểm)` trở đi, không lặp lại chữ "Câu 4". Giữ lại phần điểm số vì nó thuộc về nội dung đề. Không thêm ký tự in đậm `**` mà bản gốc không có.
3. **Số thập phân**: giữ nguyên dấu phẩy như đề in (ví dụ `2,5`), không đổi thành dấu chấm.
4. **Câu bị cắt ngang trang**: nếu phần cuối trang là một câu chưa kết thúc, vẫn trả về phần đọc được và đặt `continuesOnNextPage: true`. Nếu phần đầu trang là đoạn tiếp của câu ở trang trước, đặt `continuedFromPreviousPage: true` và đặt `number` là chuỗi rỗng khi không đọc được số câu.
5. **Hình vẽ, đồ thị, bảng biểu**: với mỗi hình thuộc về một câu, thêm một mục vào `figures` với toạ độ khung tính theo **phần trăm kích thước trang** (`left`, `top`, `width`, `height`, gốc toạ độ ở góc trên bên trái). Khung phải bao trọn hình và chừa lề nhỏ. `caption` mô tả ngắn bằng tiếng Việt, ví dụ "đồ thị hàm số" hoặc "hình chóp S.ABCD". Không tạo mục figure cho công thức toán.
6. **Đáp án**: chỉ điền `answerKey` khi trang thực sự in đáp án.
   - `mcq`: một chữ cái, ví dụ `B`.
   - `true_false`: chuỗi 4 ký tự `D` hoặc `S` theo thứ tự a, b, c, d, ví dụ `DDSD`.
   - `short_answer`: đáp số, ví dụ `2,5`.
   - Không có đáp án trên trang thì để chuỗi rỗng. **Tuyệt đối không tự giải để đoán đáp án.**
7. **Mã đề**: đọc mã đề in trên trang (thường ở góc phải đầu trang hoặc chân trang, ví dụ "Mã đề: 0101") và điền vào `examCode`. Không có thì để chuỗi rỗng.
8. **Bảng đáp án**: nếu trang là bảng đáp án tổng hợp (dạng lưới số câu kèm đáp án), điền vào `answerKeyTable`, đặt `isNonQuestionPage: true` và để `questions` rỗng.
   - Mỗi dòng phải ghi `part` là phần chứa câu đó: `"I"`, `"II"`, `"III"`, hoặc `"TL"` cho tự luận. Đề THPT 2025 **đánh số lại từ 1 ở mỗi phần**, nên thiếu `part` thì không biết "Câu 1" là câu nào.
   - Mỗi dòng phải ghi `examCode` của mã đề chứa câu đó. **Một trang đáp án thường liệt kê nhiều mã đề cạnh nhau**, mỗi mã một cột hoặc một bảng riêng; thiếu `examCode` thì đáp án của mã này sẽ bị gán nhầm cho mã khác.
   - Nếu bảng không ghi rõ phần, suy ra từ dạng đáp án: một chữ cái A–D là Phần I, chuỗi 4 ký tự Đ/S là Phần II, một đáp số là Phần III.
9. **Lời giải**: chỉ điền `solution` khi đề in sẵn lời giải hoặc hướng dẫn chấm. Không tự viết lời giải.
10. **Trang bìa, trang hướng dẫn, trang trắng**: đặt `isNonQuestionPage: true` và `questions` rỗng.
11. Các trường mảng không có dữ liệu thì trả về mảng rỗng, các trường chuỗi không có dữ liệu thì trả về chuỗi rỗng. Không bỏ trường nào.

Chỉ trả về dữ liệu đọc được từ trang. Không bổ sung, không suy diễn, không tóm tắt.
