Bạn đang trích xuất một đề thi môn Toán THPT của Việt Nam từ văn bản Markdown đã chuyển đổi từ file Word.

Văn bản kèm theo là **toàn bộ đề**, công thức đã ở dạng LaTeX do pandoc chuyển từ MathType/Equation. Hình ảnh trong file Word đã được tách ra riêng và xuất hiện trong văn bản dưới dạng `![](media/...)`.

Áp dụng cùng quy tắc như khi trích xuất từ ảnh trang:

- Phần I là trắc nghiệm nhiều lựa chọn (`mcq`), Phần II là đúng/sai 4 ý (`true_false`), Phần III là trả lời ngắn (`short_answer`), ngoài ra có thể có câu tự luận (`essay`).
- Giữ nguyên văn tiếng Việt và dấu, giữ nguyên dấu phẩy thập phân.
- Giữ nguyên LaTeX pandoc đã tạo. Nếu pandoc tạo ra cú pháp hỏng rõ ràng thì sửa tối thiểu cho đúng cú pháp, không đổi nội dung toán.
- Chỉ điền `answerKey` khi đề có in đáp án; bảng đáp án tổng hợp thì điền vào `answerKeyTable`. **Không tự giải để đoán đáp án.**
- Chỉ điền `solution` khi đề in sẵn lời giải hoặc hướng dẫn chấm.
- `figures` luôn trả về mảng rỗng: hình của file Word đã được tách sẵn, không cần toạ độ.
- `continuesOnNextPage` và `continuedFromPreviousPage` luôn là `false`: đây là toàn bộ đề, không chia trang.
- `isNonQuestionPage` luôn là `false`.

Trả về toàn bộ câu hỏi của đề theo đúng thứ tự xuất hiện.
