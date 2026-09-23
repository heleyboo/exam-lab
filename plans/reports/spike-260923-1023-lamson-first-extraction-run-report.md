# Spike: lần chạy trích xuất thật đầu tiên

- Ngày: 2026-09-23
- Nguồn: `Tuyen tap de thi vao lop 10 chuyen Lam Son - Thanh Hoa.pdf` (181 trang, PDF số, sách có bản quyền)
- Phạm vi: trang 5–7 = đề 1, 2, 3 · môn Toán · **đề thi vào lớp 10 chuyên, toàn tự luận**
- Kết quả: `spike/out/lamson-de01-03`, `spike/out/lamson-de01-03-sonnet`, `spike/out/lamson-p6-promptfix`

## Số đo

| | Opus 5 | Sonnet 5 |
|---|---|---|
| Câu trích được | 13 | 13 |
| Token vào / ra | 23.280 / 4.948 | 23.859 / **10.044** |
| Chi phí 3 trang | 6.243đ | 3.852đ |
| Chi phí mỗi trang | **2.081đ** | **1.284đ** |
| Thời gian | 66s | 92s |
| Hình cắt đúng | 2/2 | **0/2** |

Ngưỡng plan là < 3.000đ/trang: **cả hai đều đạt**.

## Chất lượng

**Tốt hơn dự đoán ở phần chữ và công thức.** LaTeX đúng cú pháp và đúng ý toán trên toàn bộ câu đã đọc: `\sqrt{8+a^2+b^2}=ab+2`, `\begin{cases}`, `\dfrac`, `\sqrt[3]{}`. Tiếng Việt giữ nguyên dấu. Nhận đúng 13/13 câu là tự luận.

**Opus cắt hình chính xác, Sonnet thì không.** Câu có 2 bảng ô vuông: Opus trả về khung `36,19,26,16` và `36,42,24,16`, cắt ra đúng trọn từng bảng. Sonnet trả về `37,27,26,22` và `37,60,26,22`, cắt mất hàng trên cùng của bảng 1 và lẫn một phần bảng 2. Đây là tác vụ khó nhất của khâu trích xuất và là chênh lệch rõ ràng nhất giữa hai model.

**Sonnet chỉ rẻ hơn 38%, không phải 60% như bảng giá gợi ý**, vì nó sinh ra gấp đôi token đầu ra. Nó cũng chậm hơn (92s so với 66s) và có xu hướng chuẩn hoá lại văn bản gốc: đổi `4, 5, 6, 7, 8, 9` thành `$4,5,6,7,8,9$`, dọn khoảng trắng của đề. Đẹp hơn nhưng kém trung thực với bản gốc, trái với yêu cầu "giữ nguyên văn".

**Kết luận: giữ Opus 5 làm mặc định.** Rẻ hơn 800đ/trang không bù được việc admin phải sửa tay hình.

## Lỗi prompt đã phát hiện và sửa

`stem` bị lẫn nhãn số câu: `**Câu 1 (2 điểm).** 1. Cho hai số thực...`. Số câu đã có trường `number` riêng, để lẫn vào thân đề sẽ làm bẩn dữ liệu và hiển thị sai trên giao diện.

Không nhất quán: trang 5 sạch, trang 6 dính nhãn ở cả 5 câu. Đã thêm quy tắc 2b vào prompt và chạy lại trang 6 để kiểm chứng: 5/5 câu sạch nhãn, mất luôn `**` in đậm mà bản gốc không có. Tốn 2.074đ để xác nhận.

## Ba điều học được về nghiệp vụ

1. **Khoảng trang từ `spike:outline` là gần đúng.** Đề 2 thực tế trải qua cả trang 6 và 7 (câu 6 nằm ở trang 7), trong khi outline báo đề 2 chỉ ở trang 6. Đề trong sách không cắt theo ranh giới trang. Khi import thật, admin phải chỉnh lại ranh giới đề.
2. **Cảnh báo tự động hoạt động đúng.** Phát hiện 6 câu trùng số trong một lần chạy, vì 3 đề đều đánh số Câu 1–5. Tín hiệu đúng, không phải lỗi.
3. **Sách có bản quyền thương mại.** Dùng để đo thì ổn, nhưng nếu đưa vào kho phải gắn `visibility: restricted` và không để ra trang công khai.

## Chưa đo được

Lần chạy này **không kiểm chứng được phần quan trọng nhất của MVP**: đề thi vào 10 chuyên toàn tự luận, không có câu trắc nghiệm, Đúng/Sai hay trả lời ngắn nào. Format THPT 2025 với 4 loại câu vẫn chưa có số liệu. Cũng chưa đo được:

- PDF scan (nguồn chính đã chốt, và là phần khó nhất)
- File docx
- Độ chính xác của việc gắn bảng đáp án vào câu
- Tỉ lệ tách đúng ranh giới so với tổng số câu thật (chưa chấm tay)

## Ước tính chi phí

Với 2.081đ/trang bằng Opus 5:
- Phần đề của sách này, 37 trang: khoảng 77.000đ
- Tập mẫu dự kiến của spike, 60–80 trang: khoảng 125.000–167.000đ

## Câu hỏi còn mở

- Bao giờ có đề THPT format 2025 và đề scan của trường/sở để đo đúng phạm vi MVP?
- Có chấm tay 3 đề này để lấy số liệu chính thức cho nhóm "sách tuyển tập", hay để dành công chấm cho đề THPT?
- Đề chuyên dùng đánh số La Mã (`Câu I`) lẫn số Ả Rập; taxonomy và phần hiển thị có cần chuẩn hoá không?
