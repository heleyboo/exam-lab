# Spike trích xuất đề (Phase 1)

Mục tiêu: đo xem có trích xuất được đề Toán THPT thành dữ liệu từng câu đủ tốt để làm sản phẩm hay không. **Đây là cổng chặn của cả dự án** — chưa có số liệu đạt ngưỡng thì chưa dựng giao diện.

Công cụ này sinh ra một con số để ra quyết định, nên nó được viết theo nguyên tắc: **thà dừng và báo lỗi còn hơn in ra một con số sai**.

## Chuẩn bị

```bash
pnpm install
cp .env.example .env     # điền ANTHROPIC_API_KEY
brew install poppler imagemagick pandoc   # nếu chưa có
```

Bỏ đề thật vào `spike/fixtures/` (thư mục này không được commit). Cần tối thiểu:

- 5 PDF số (xuất từ Word)
- 8 PDF scan (đề trường/sở, đây là nguồn chính và là phần khó nhất)
- 3 file `.docx`

## Chạy

```bash
# Trích xuất một đề
pnpm spike:extract spike/fixtures/de-thi-thu-lhp-2025.pdf

# Bản scan: thử DPI cao hơn và ép tiền xử lý ảnh
pnpm spike:extract spike/fixtures/de-scan.pdf --dpi 300 --preprocess on

# Đối chứng model khác
pnpm spike:extract spike/fixtures/de-scan.pdf --model claude-sonnet-5

# Chạy thử vài trang đầu của đề dày trước khi tốn cả tập
pnpm spike:extract spike/fixtures/de-day.pdf --pages 1-4

# Ép loại nguồn khi tự nhận dạng sai
pnpm spike:extract spike/fixtures/de-co-ocr.pdf --kind scan

# Đề kèm trang đáp án ở cuối file, chỉ lấy một mã đề
pnpm spike:extract spike/fixtures/de-thpt.pdf --pages 1-4,17 --exam-code 0101
```

### Hướng trang

Mặc định công cụ **tự dò hướng từng trang** bằng model nhỏ (Haiku) rồi xoay trước khi trích xuất. Tốn khoảng 70đ/trang, bằng 3% tiền trích xuất.

Không tắt tính năng này trừ khi có lý do rõ ràng. Đo trên đề tốt nghiệp THPT 2025: khi ảnh bị xoay sai chiều, model **vẫn đọc được và không báo lỗi gì**, nhưng trả về 3 đáp án sai trên 16 ô kiểm được, tốn gấp 13 lần tiền và lâu gấp 20 lần. Đáp án sai là kiểu lỗi tệ nhất vì không ai phát hiện ra.

```bash
pnpm spike:extract file.pdf --rotate off    # tắt dò hướng
pnpm spike:extract file.pdf --rotate 90     # ép góc xoay
```

Cách dò: hỏi model góc xoay, xoay theo, rồi **hỏi lại trên ảnh đã xoay**. Model hay nhầm 90 với 270 vì hai chiều nằm ngang trông na ná nhau, nhưng xoay nhầm chiều sẽ thành lộn ngược — mà lộn ngược thì model nhận rất chắc nhờ vị trí dấu tiếng Việt. Đo trên 6 ca gồm cả 4 góc: 6/6 đúng.

### Trang đáp án nhiều mã đề

Bảng đáp án của kỳ thi thật là lưới hàng chục mã đề nhân 22 câu, in nằm ngang. Lấy cả bảng tốn 30.706đ cho một trang và chạm trần token. Dùng `--exam-code` để chỉ lấy một mã: còn 2.114đ và 21 giây.

### File tuyển tập nhiều đề

**Không chạy cả file một lượt.** Công cụ giả định một lần chạy là một đề; gộp nhiều đề sẽ làm câu cuối đề này dính vào câu đầu đề sau, và đáp án "Phần I Câu 1" của đề sau ghi đè lên đề trước.

```bash
# Dò ranh giới đề rồi in sẵn lệnh cho từng đề
pnpm spike:outline spike/fixtures/tuyen-tap.pdf
```

Lệnh này đọc text của từng trang, tìm mốc "ĐỀ SỐ", "HƯỚNG DẪN GIẢI", bỏ qua trang mục lục, và không đếm các mốc "Đề số N" nằm trong phần lời giải. Chỉ chạy được với PDF có text layer; bản scan phải mở xem bằng mắt rồi tự điền `--pages`.

Luôn kiểm lại vài khoảng trang trước khi chạy hàng loạt — dò bằng chữ không phải lúc nào cũng đúng.

Sách thường để **lời giải ở phần riêng phía sau**, không nằm ngay sau mỗi đề. Công cụ chỉ ghép được đáp án trong cùng một lần chạy, nên phần đề và phần lời giải phải chạy riêng rồi ghép thủ công khi đọc kết quả.

Khi chấm, **tính tuyển tập thành một nhóm riêng**, đừng gộp với đề trường/sở: sách in sạch và đều hơn nhiều, gộp chung sẽ cho ra con số lạc quan hơn thực tế.

Thư mục kết quả mặc định là `spike/out/<tên-đề>-<model>-<dpi>-<preprocess>`, nên chạy 200 DPI rồi 300 DPI sẽ ra hai thư mục khác nhau thay vì đè lên nhau.

| File | Nội dung |
|---|---|
| `questions.json` | Câu đã ghép trang, gắn đáp án, mỗi hình có số trang riêng |
| `meta.json` | Cấu hình, token, chi phí VND, trang lỗi, cảnh báo tự động |
| `raw/page-NNN.json` | Dữ liệu thô model trả về từng trang, để truy nguyên khi sai |
| `pages-raw/`, `pages/` | Ảnh render gốc và ảnh sau tiền xử lý |
| `figures/` | Hình đã cắt |
| `source.md` | Chỉ với `.docx`: bản Markdown pandoc tạo ra |

Một trang lỗi không làm hỏng cả lần chạy: trang đó được ghi vào `failedPages` và `complete: false`, phần còn lại vẫn lưu đầy đủ.

## Chấm chất lượng

Không có cách tự động đáng tin để biết một câu tách đúng hay sai, nên phải chấm tay một lần:

```bash
pnpm spike:label spike/out/de-thi-thu-lhp-2025-claude-opus-5-200-auto
# mở labels.json, đối chiếu với đề gốc, điền các trường
pnpm spike:score spike/out/de-thi-thu-lhp-2025-claude-opus-5-200-auto

# sau khi chấm hết cả tập, gộp lại - đây mới là số để ra quyết định
pnpm spike:score --all spike/out
```

Cần điền trong `labels.json`:

| Trường | Ý nghĩa |
|---|---|
| `expectedQuestionCount` | **Bắt buộc.** Tổng số câu thực sự có trên đề gốc, đếm tay một lần |
| `expectedFigures` | Số hình câu đó thực sự có trên đề (0 nếu không có) |
| `boundaryOk` | Tách đúng ranh giới, không dính câu khác, không mất phần nào |
| `kindOk` | Nhận đúng loại câu |
| `latexOk` | Công thức đúng, không sai ký hiệu toán |
| `figureOk` | Hình gắn đúng câu và cắt đủ (`null` nếu câu không có hình) |
| `answerOk` | Đáp án khớp đề gốc (`null` nếu đề không in đáp án) |

**Mẫu số là `expectedQuestionCount`, không phải số câu model trả về.** Nếu lấy mẫu số theo model thì câu bị bỏ sót sẽ vô hình: model trả về 16 câu của đề 22 câu, chấm đúng cả 16, report sẽ in 100% trong khi 27% đề chưa bao giờ được trích xuất.

`labels.json` gắn chặt với một lần chạy cụ thể (prompt, thời điểm, số câu). Chạy lại extract rồi chấm bằng nhãn cũ sẽ bị chặn chứ không âm thầm cho ra số sai.

## Ngưỡng quyết định

| Chỉ số | Ngưỡng |
|---|---|
| Tách đúng ranh giới, PDF số | ≥ 90% |
| Tách đúng ranh giới, PDF scan | mục tiêu 80%, **sàn 60%** |
| Nhận đúng loại câu | ≥ 90% |
| LaTeX đúng | ≥ 85% |
| Hình gắn đúng câu | ≥ 70% |
| Chi phí | < 3.000đ/trang |

Bản scan dưới sàn 60%: theo plan thì dừng tối ưu AI, chuyển sang tối ưu màn soát cho việc nhập nhanh. Giới hạn thời gian spike là 2 tuần.

Tỉ lệ đáp án khớp đề gốc là số tham khảo, không phải cổng chặn — plan không đặt ngưỡng cho nó.

## Cảnh báo tự động

Mỗi lần chạy tự kiểm vài bất biến của format THPT 2025 và ghi vào `meta.json`: câu nhiều lựa chọn không đủ 4 phương án, câu Đúng/Sai không đủ 4 ý, đáp án sai định dạng, trùng số câu trong cùng phần, dòng bảng đáp án không khớp câu nào, cờ ghép trang mâu thuẫn. Đọc các cảnh báo này trước khi chấm tay để biết chỗ cần soi.

## Chi phí

Mặc định `claude-opus-5` (5 USD vào / 25 USD ra mỗi triệu token). Đặt `SPIKE_MODEL=claude-sonnet-5` để giảm khoảng 60%. Nên chạy cả hai trên vài đề rồi so trước khi chốt.

Với `.docx` không có khái niệm trang nên chi phí mỗi trang để trống, chỉ đo chi phí mỗi câu.

## Lưu ý bản quyền

Đề trường/sở có bản quyền. Không commit file đề vào repo. Khi import vào sản phẩm thật, mỗi đề phải ghi nguồn và gắn `visibility` (xem Phase 3 trong plan).
