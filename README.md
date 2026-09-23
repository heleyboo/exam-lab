# ExamLab

Nền tảng luyện đề và soạn đề môn Toán THPT theo cấu trúc đề thi tốt nghiệp từ 2025, hướng tới cả mảng luyện thi vào lớp 10 chuyên.

Repo đang ở **giai đoạn thẩm định**. Chưa có ứng dụng, mới có công cụ đo xem việc trích xuất đề thi thành dữ liệu từng câu có khả thi không.

## Ý tưởng

Admin nạp đề thi dạng PDF hoặc Word. Hệ thống tách thành từng câu, gắn dạng bài và mức độ, giữ nguyên công thức toán và hình vẽ. Sau khi người duyệt xác nhận, học sinh luyện theo từng dạng bài, còn giáo viên soạn đề mới theo ma trận rồi xuất ra file.

Bốn loại câu theo cấu trúc đề thi tốt nghiệp THPT 2025:

| Loại | Mô tả |
|---|---|
| Trắc nghiệm nhiều lựa chọn | 4 phương án A–D |
| Trắc nghiệm đúng/sai | 4 ý a–d, chấm theo thang 0,1 / 0,25 / 0,5 / 1 điểm |
| Trả lời ngắn | đáp số không quá 4 ký tự |
| Tự luận | chấm theo rubric từng bước |

## Đang có gì

`spike/` — công cụ đo chất lượng trích xuất. Xem [spike/README.md](spike/README.md) để biết cách chạy.

```bash
pnpm install
cp .env.example .env          # điền ANTHROPIC_API_KEY
brew install poppler imagemagick pandoc

pnpm spike:outline de.pdf     # dò ranh giới đề trong file nhiều đề
pnpm spike:extract de.pdf     # trích xuất thành JSON từng câu
pnpm spike:label spike/out/de # tạo file chấm tay
pnpm spike:score spike/out/de # tổng hợp thành báo cáo chất lượng
```

`design/ui-mockups/` — prototype giao diện 25 màn dựng bằng Claude Design, dùng làm tham chiếu khi code UI thật.

## Số đo thực tế

Đo trên đề chính thức kỳ thi tốt nghiệp THPT 2025 môn Toán, bản scan, mã đề 0101:

| Chỉ số | Kết quả |
|---|---|
| Câu trích được | 22/22, đúng cấu trúc 12 + 4 + 6 |
| Đáp án | 10 đúng, 0 sai, 2 để trống trên 12 ô đã kiểm bằng mắt |
| Chi phí | 2.506đ mỗi trang |
| Thời gian | khoảng 28 giây mỗi trang |

Hai ô để trống nằm dưới con dấu đỏ của Bộ. Model từ chối đoán thay vì bịa đáp án — đây là kiểu hỏng chấp nhận được, vì ô trống thì người duyệt nhìn là biết phải điền.

## Ba bài học rút ra từ việc chạy đề thật

**Hướng trang quyết định cả chi phí lẫn độ chính xác.** Ảnh bị xoay sai chiều vẫn được model đọc và không sinh ra lỗi nào, nhưng đáp án trả về sai ở một số ô, tốn gấp 13 lần tiền và lâu gấp 20 lần. Vì vậy công cụ tự dò hướng từng trang bằng một model nhỏ rồi mới trích xuất.

**Đề thi và bảng đáp án chính thức đánh số khác nhau.** Đề đánh lại từ 1 ở mỗi phần, bảng đáp án đánh liên tục 1 đến 22. Không khớp được thì không có dấu hiệu gì báo, chỉ là mọi câu đều thiếu đáp án.

**Một kỳ thi phát nhiều mã đề, trang đáp án liệt kê tất cả cạnh nhau.** Khoá đáp án thiếu mã đề thì đáp án của mã này gán sang mã khác, âm thầm và không thể phát hiện về sau.

## Nguyên tắc

Công cụ này sinh ra con số để quyết định hướng đi của cả dự án, nên nó ưu tiên **dừng và báo lỗi hơn là in ra một con số sai**. Tỉ lệ tách đúng lấy mẫu số là tổng số câu thật trên đề, không phải số câu model trả về, để câu bị bỏ sót không trở nên vô hình.

## Bản quyền nội dung

Đề thi và kết quả trích xuất **không** nằm trong repo. `spike/fixtures/` và `spike/out/` đã được gitignore. Đề của trường, sở và sách tuyển tập đều có bản quyền; khi đưa vào sản phẩm thật thì mỗi đề phải ghi nguồn và có cơ chế gỡ khi được yêu cầu.

## Công nghệ

TypeScript · Anthropic API · poppler · ImageMagick · pandoc · zod

Ứng dụng dự kiến dùng Next.js, PostgreSQL với pgvector, pg-boss, Better Auth, KaTeX và MathLive.
