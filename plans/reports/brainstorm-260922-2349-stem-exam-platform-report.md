# Brainstorm: Nền tảng luyện đề & tạo đề KHTN (exam-lab)

- Ngày: 2026-09-22 · Cập nhật: 2026-09-23 theo prototype UI · Trạng thái: **đã duyệt nghiệp vụ + stack; đã có prototype UI 25 màn**
- Prototype: `design/ui-mockups/project/ExamLab.dc.html` · Inventory + gap: `from-design-handoff-to-plan-260923-0841-examlab-prototype-inventory-report.md` · **§9 là phần cập nhật mới nhất, đọc cùng §3**
- Repo: greenfield (chỉ có `.claude/`, `.gitignore` Next.js) → không ràng buộc stack
- Research liên quan: `researcher-260922-2344-stem-pdf-extraction-report.md` (đã lọc, xem §5)
- Prompt UI: `claude-design-prompt-260922-2349-stem-exam-platform-report.md`

## 1. Vấn đề (problem-first)

| Mục | Nội dung |
|---|---|
| Người dùng | HS THPT ôn thi; GV cần ra đề nhanh; admin quản lý kho nội dung |
| Nỗi đau | Đề nằm rải rác dạng PDF/Word, không tìm được theo dạng bài; HS không biết mình yếu dạng nào; GV mất nhiều giờ ghép đề theo ma trận |
| Nguyên nhân | Nội dung không được cấu trúc ở mức câu + dạng bài; thiếu lời giải kiểm chứng |
| Thành công | Câu hỏi có cấu trúc, gắn dạng bài, lời giải đã duyệt → HS luyện đúng chỗ yếu, GV sinh đề < 5s |

Giả định cần kiểm chứng sớm:
1. VLM trích xuất đủ tốt đề Toán VN (kể cả scan) → **test 10–20 đề thật trước khi làm UI**. Kill/đổi hướng nếu < 80% câu tách đúng.
2. Admin chịu soát ~20 phút/đề 50 câu → đo thời gian thực.
3. Cây dạng bài do con người sở hữu là đủ ổn định cho luyện tập + sinh đề.
4. HS dùng AI chấm tự luận dù chỉ "tham khảo" → đo tỉ lệ dùng/khiếu nại.

Evidence status: **weak** (ý tưởng founder, chưa có dữ liệu người dùng) → MVP hẹp (Toán THPT) để kiểm chứng.

## 2. Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Môn/cấp | **Toán THPT** trước, format THPT 2025; mở rộng Lý/Hóa/Sinh sau |
| MVP | Core loop: import + soát + taxonomy + lời giải AI có duyệt + luyện theo dạng bài + soạn đề theo ma trận |
| Giáo viên | Chỉ soạn/sinh/xuất đề + link làm bài; **không** quản lý lớp |
| Mô hình | Freemium, vài nghìn user; MVP đếm quota, chưa thu tiền |
| Tự luận | HS chụp ảnh **hoặc** giải bằng editor; **AI chấm tham khảo** theo rubric, có khiếu nại, không vào leaderboard |
| Nguồn import | **PDF (số + scan) + Word .docx** |
| Stack | **A. Monolith TypeScript** (xem §5) |
| Đội ngũ | Chủ yếu AI agent code → ưu tiên stack phổ biến, ít thành phần |
| Hosting | VPS + Docker (Coolify/Dokploy) |
| Prototype | Claude Design, MVP + Phase 2, UI tiếng Việt |

## 3. Nghiệp vụ

### 3.1 Vai trò
- **Admin**: import, soát, taxonomy, duyệt lời giải/biến thể AI, xử lý báo lỗi & khiếu nại, cấu hình quota.
- **Reviewer** (tùy chọn): GV chuyên môn được cấp quyền duyệt nội dung.
- **Giáo viên**: ma trận đề, sinh đề, trộn mã đề, xuất PDF/Word, chia sẻ link.
- **Học sinh**: luyện theo dạng bài, làm đề, nộp tự luận, (P2) tự sinh bài, challenge, leaderboard.

### 3.2 Mô hình dữ liệu
- **Taxonomy**: Subject → Grade → Chapter → Topic → **QuestionType (dạng bài)**; mức độ NB/TH/VD/VDC. 1 dạng chính + tag phụ. Admin sở hữu, AI chỉ đề xuất.
- **Question**: `kind` = `mcq` | `true_false` (4 ý a–d) | `short_answer` (đáp số + sai số) | `essay` (rubric từng bước); nội dung Markdown+LaTeX + ảnh; đáp án; lời giải; nguồn; `origin` = import|admin|ai_variant|student_generated; `status` = draft→pending_review→approved→published|rejected; embedding.
- **SourceExam**: file gốc, metadata (trường, năm, kỳ thi), trạng thái job, câu đã tách + tọa độ trang.
- **ExamBlueprint**: dòng (topic/dạng × mức độ × kind × số câu × điểm); có mẫu hệ thống "THPT 2025 Toán".
- **Exam / ExamVariant**: đề sinh từ blueprint, N mã đề trộn câu/phương án.
- **Attempt / AttemptAnswer**: điểm, thời gian; essay: ảnh/editor content + AiGrading (điểm từng bước, nhận xét, `advisory=true`, trạng thái khiếu nại).
- **Mastery**: theo (student, dạng bài), cập nhật sau mỗi câu.
- **ContentReport**: báo lỗi câu từ người dùng.
- **UsageQuota**: đếm lượt AI theo user/ngày/gói.
- (P2) **Challenge**, **LeaderboardEntry**, **VariantTemplate** (đề mẫu tham số).

### 3.3 Quy tắc chấm
- `mcq`: đúng/sai.
- `true_false` theo thang Bộ: đúng 1/2/3/4 ý → 0.1/0.25/0.5/1 điểm.
- `short_answer`: đáp số ≤ 4 ký tự theo format THPT 2025, so khớp sau chuẩn hóa (dấu thập phân, số 0 thừa, khoảng trắng). Xem §9.2 — bỏ "sai số cho phép".
- `essay`: AI chấm tham khảo; không tính leaderboard.

### 3.4 Luồng
1. **Import**: upload → job nền. PDF: render trang → VLM trích JSON theo schema → crop hình theo bbox. docx: pandoc → Markdown+LaTeX → LLM tách câu. → AI đề xuất dạng/mức độ, map bảng đáp án, check trùng (pgvector) → **màn soát 2 cột** (PDF gốc | câu tách; sửa/gộp/tách/gắn hình) → duyệt theo lô.
2. **Lời giải AI**: câu thiếu lời giải → AI giải từng bước → so với đáp án gốc (khớp → hàng thường; lệch → ưu tiên) → admin duyệt/sửa. HS chỉ thấy khi `published`.
3. **Luyện dạng bài**: chọn topic/dạng hoặc "ôn phần yếu" → làm từng câu, phản hồi ngay, xem lời giải → cập nhật mastery.
4. **Soạn đề**: blueprint (hoặc mẫu) → bốc câu `published` → đổi câu cùng dạng → trộn N mã → xuất PDF/Word + đáp án hoặc link online.
5. **Tự luận**: ảnh/editor (MathLive) → AI chấm tham khảo (trừ quota) → khiếu nại → admin xem.
6. **(P2) Biến thể AI**: VariantTemplate tham số (đúng by design) + LLM paraphrase; hoặc LLM sinh + sympy kiểm → hàng duyệt admin.
7. **(P2) HS tự sinh bài**: chọn dạng → AI sinh → nhãn "AI – chưa kiểm duyệt", không tính điểm, trừ quota; HS có thể báo lỗi / đề xuất đưa vào kho.
8. **(P2) Challenge + Leaderboard**: bộ bài theo độ khó, acceptance rate, daily challenge, streak; bảng tuần/tháng/all-time; chỉ câu published chấm tự động; chống gian lận cơ bản (điểm chỉ lần đúng đầu tiên, giới hạn tốc độ, loại bất thường thời gian).

### 3.5 Phân phase
- **MVP**: §3.4 luồng 1–5, auth, quota đếm lượt.
- **Phase 2**: luồng 6–8.
- **Phase 3**: thanh toán SePay/VietQR, Lý/Hóa/Sinh (mhchem, đơn vị), lớp học GV, contest có giờ.

## 4. Tiêu chí nghiệm thu MVP
- Import đề Toán PDF 50 câu: ≥ 90% câu tách đúng ranh giới; admin soát ≤ 20 phút.
- 4 loại câu chạy đúng, chấm Đúng/Sai đúng thang Bộ.
- HS không truy cập được nội dung chưa `published` (kiểm ở API, không chỉ UI).
- Sinh đề 50 câu từ blueprint < 5s; trộn 4 mã; PDF xuất hiển thị công thức đúng.
- Quota AI chấm tự luận chặn đúng theo ngày/user.
- Lời giải AI lệch đáp án gốc luôn bị đẩy vào hàng ưu tiên, không tự publish.

## 5. Tech stack

### Phương án đã đánh giá
| | A. Monolith TS ✅ | B. Next.js + FastAPI | C. NestJS + SPA |
|---|---|---|---|
| Codebase | 1 | 2 | 2 |
| PDF/OCR | Qua VLM API + CLI (pandoc, poppler) | Python mạnh | Như A |
| Hợp AI agent code | Tốt nhất | Trung bình | Kém (boilerplate) |
| Vận hành VPS | Đơn giản | Thêm service | Thêm service |
| Kết luận | **Chọn** | Không đáng cho MVP | Loại |

### Stack chốt
- **App**: Next.js (App Router) + TypeScript, Tailwind + shadcn/ui.
- **Toán**: KaTeX (render, mhchem sau), MathLive (nhập công thức), Markdown + remark-math.
- **DB**: PostgreSQL + Drizzle ORM + **pgvector** (embedding **đa ngôn ngữ** — không dùng all-MiniLM, chỉ tốt tiếng Anh).
- **Job queue**: pg-boss (trên Postgres, không cần Redis); worker Node process cùng repo.
- **Auth**: Better Auth (email + Google), RBAC 4 vai trò.
- **Storage**: MinIO trên VPS hoặc Cloudflare R2 (PDF, ảnh hình, ảnh bài làm).
- **AI**: Claude API (vision trích xuất, giải, chấm) qua **adapter** để đổi Gemini khi cần giảm chi phí; structured output theo JSON schema; log prompt/chi phí mỗi job.
- **Import**: PDF → ảnh trang (poppler/pdftoppm trong Docker) → VLM; docx → pandoc (OMML → LaTeX; MathType OLE cần kiểm thử riêng).
- **Xuất đề**: HTML + KaTeX → PDF qua Playwright/Chromium; Word qua pandoc.
- **P2**: Python sidecar nhỏ (FastAPI + sympy) cho kiểm chứng biến thể.
- **Deploy**: Docker Compose (app, worker, postgres, minio) trên VPS qua Coolify/Dokploy.

### Đánh giá lại research (đã lọc)
- Giữ: VLM trực tiếp là tối ưu cho volume thấp + tiếng Việt; không tool nào tự link hình ↔ câu → cần soát; Marker GPL + điều kiện thương mại → tránh; Docling (MIT) là phương án tự host dự phòng; template tham số là cách sinh biến thể đáng tin nhất.
- Bác: ước tính chi phí Claude $1.5–3/trang (sai bậc độ lớn; thực tế cỡ vài cent/trang); embedding all-MiniLM cho tiếng Việt; các % accuracy không có benchmark đề THPT VN → chỉ tham khảo.

## 6. Rủi ro & giảm thiểu
| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Trích xuất sai công thức/hình | Cao | Spike 10–20 đề thật trước; màn soát bắt buộc; lưu tọa độ để đối chiếu |
| AI giải/chấm sai | Cao | Đối chiếu đáp án gốc; duyệt bắt buộc; chấm tự luận gắn nhãn tham khảo + khiếu nại |
| Chi phí AI vượt freemium | TB | Quota, cache, adapter đổi model, log chi phí/job |
| Bản quyền đề | TB | Lưu nguồn; ưu tiên đề công khai (Bộ GD, minh họa); cơ chế gỡ |
| Taxonomy lỏng | TB | Admin sở hữu; seed theo CT GDPT 2018 Toán 10–12 |
| Leaderboard gian lận (P2) | Thấp | Chỉ câu auto-grade, điểm lần đúng đầu, phát hiện bất thường |

## 7. Chỉ số thành công
- Thời gian soát trung bình/đề; % câu tách đúng; % lời giải AI được duyệt không sửa.
- HS: số câu luyện/tuần, retention D7/D30, mastery cải thiện theo dạng.
- GV: số đề sinh/tuần, thời gian từ tạo blueprint → xuất file.
- Chi phí AI / user hoạt động / tháng.

## 8. Bước tiếp theo
1. **Spike trích xuất** (trước mọi UI): 10–20 đề Toán thật (PDF số, scan, docx) → đo % tách đúng, lỗi LaTeX, link hình, chi phí/trang.
2. Seed taxonomy Toán 10–12 + blueprint mẫu THPT 2025.
3. Chạy prompt Claude Design → chốt UI prototype.
4. `/ck:plan` cho MVP với report này làm đầu vào.

## 9. Cập nhật theo prototype (2026-09-23)

Prototype Claude Design đã có 25 màn, độ hoàn thiện cao. Phần này **ghi đè** các mục tương ứng ở §2–§4 khi có xung đột.

### 9.1 Quyết định mới lấy từ prototype (chấp nhận)
| Chủ đề | Chốt theo prototype |
|---|---|
| Quota Free/Pro | Chấm tự luận 5/ngày vs 100/tháng · Sinh biến thể 3/ngày vs không giới hạn · GV 3 đề/tháng vs 50 · mã đề 2 vs 8 · xuất Word kèm đáp án chỉ Pro → **đóng câu hỏi mở "quota free"** |
| Cấu hình AI | Model + fallback cấu hình được **theo từng tác vụ** trong màn Cài đặt (mở rộng ý "adapter" ở §5) |
| Chi phí AI | Có ngân sách tháng (VND) + % đã dùng + bóc tách theo tác vụ |
| Tài khoản | GV đăng ký phải qua **admin duyệt** (`status = chờ duyệt`) |
| RBAC | `role` + **`scope`** (toàn hệ thống / môn-lớp / trường / lớp) |
| Trường & lớp | Là thuộc tính user ngay MVP (dùng cho leaderboard + scope), dù **quản lý lớp vẫn ở Phase 3** |
| SLA | Báo lỗi 48h · khiếu nại chấm AI 24h |
| Trùng câu | Lưu `duplicate_of` + `similarity` + 2 hành động: đánh dấu trùng / vẫn giữ (khác dữ kiện) |
| Soát đề | Có **gộp câu / tách câu**; bbox lưu theo **% trang** (`l,t,w,h`); **2 điểm tin cậy riêng** cho dạng bài và mức độ |
| Lời giải AI | Lưu dấu model + ngày; enum lý do từ chối 4 giá trị, gồm **"Đáp án gốc của đề sai"** |
| Biến thể AI | Lưu trace kiểm chứng CAS dạng text, hiển thị cho người duyệt |
| Đề online | Có **lịch mở/đóng**, không chỉ là link |
| Mã ngắn | `Q-`, `V-`, `R-`, mã đề `101+`, challenge `#142` song song với UUID |
| Gamification | Có **badges** (5 huy hiệu) — thêm entity `Badge` vào §3.2 |

### 9.2 Mâu thuẫn đã tự quyết (sửa khi dựng lại UI)
- **Phần II (Đúng/Sai) CÓ chấm tự động.** Màn "Mã đề & xuất file" ghi sai, sửa lại.
- **Trả lời ngắn theo prototype**: tối đa 4 ký tự đúng format THPT 2025, **bỏ "sai số cho phép"** ở §3.3; thay bằng chuẩn hóa (dấu thập phân `,`/`.`, số 0 thừa, khoảng trắng).
- **Mẫu ma trận THPT 2025 phải tổng đúng 10,0 điểm**; điểm/câu theo **phần** (I 0,25 · II 1,0 · III 0,5), không khai theo từng hàng như mock (mock hiện ra 11,80 điểm).
- **Trang gói/nâng cấp riêng cho HS và GV.** Hiện link nâng cấp nhảy sang Cài đặt admin và đổi luôn vai trò — lỗi phải sửa.
- **Reviewer chỉ được các màn duyệt** (soát đề, lời giải, biến thể, taxonomy, báo lỗi/khiếu nại). Không có quota, model AI, quản lý user.
- **Mastery lưu ở cấp Dạng bài**; Chủ đề và Chương tính bình quân có trọng số theo số câu. Ngưỡng màu 45% / 70% là quyết định sản phẩm, giữ nguyên.
- **Loại câu thuộc từng câu hỏi**, không thuộc Dạng bài. Màn duyệt chủ đề chỉ hiển thị loại chiếm đa số.
- **Bổ sung `origin = student_generated`** vào bộ lọc kho + **hàng chờ admin** cho "Đề xuất đưa vào kho" (hiện là luồng cụt).
- Cây chủ đề phía HS dùng **đủ 5 cấp** như phía admin, cho thu gọn.
- Badge quota hiển thị **theo vai trò** (HS: lượt AI/ngày; GV: số đề/tháng).

### 9.3 Bổ sung vào phạm vi MVP (phát sinh từ prototype)
1. **Trang gói & nâng cấp** cho HS và GV (chưa thu tiền, chỉ hiện hạn mức và CTA).
2. **Hàng chờ "HS đề xuất câu hỏi"** cho admin.
3. **Trạng thái rỗng / đang tải / lỗi / 404 / toast** — prototype không có màn nào, nhưng bắt buộc khi code thật.
4. **Duyệt tài khoản GV** trong màn quản lý user.
5. **Xem lại từng câu** sau khi nộp đề (nút hiện có nhưng chưa dẫn đi đâu).
6. **Màn kết quả đề online cho GV** — *cần chốt, xem câu hỏi còn mở*.
7. Onboarding HS (chọn lớp, mục tiêu) và **bài kiểm tra định vị** — *cần chốt*.

### 9.4 Phase UI (thêm vào §3.5, chạy sau spike trích xuất)
- **UI-0 Design system**: token màu (cặp `x`/`xSoft`, có `--ai` riêng cho mọi bề mặt AI), font Be Vietnam Pro + Montserrat (nhớ subset `vietnamese`), dark mode bằng `[data-theme]`, KaTeX SSR qua `remark-math` + `rehype-katex`, module dùng chung cho từ điển `TONE` và ngưỡng mastery.
- **UI-1 Component**: ~30 hợp đồng `data-*` của prototype chuyển thành variant (cva). shadcn phủ phần lớn form/table; **~12 component tự viết**: mastery bar, heatmap 8 tuần, ô ma trận, stepper job, overlay bbox, podium, keypad số, khung thiết bị, bản in A4.
- **UI-2 Màn theo vai trò**: HS → GV → Admin.
- **UI-3 Màn 20 (soát đề)**: tách riêng vì nặng nhất — ảnh trang thật, overlay bbox, zoom, đồng bộ click hai bên, vẽ/chỉnh khung.
- Lưu ý port: prototype **không có `@media` nào**, responsive do JS đo bề rộng vùng nội dung (ngưỡng 880px ≈ viewport 1190px) → dùng container query. Mock data trong `renderVals()` bê thẳng làm seed + type.
- **Preview bản in và file xuất phải dùng chung một template**, nếu không sẽ lệch.
- Trả nợ a11y ngay khi dựng: prototype không có `aria-*` nào, thiếu label cho ô ma trận và `<select>`, heatmap chỉ có `title`.

## Câu hỏi còn mở
Chặn việc lập kế hoạch:
1. **Ma trận đề 2 chiều hay 3 chiều?** Prototype chỉ có 4 cột mức độ và hard-map mỗi mức sang một phần (VD→Phần III, VDC→Phần II) nên không thể tạo "NB Đúng/Sai" hay "VDC nhiều lựa chọn". Chặn cả màn ma trận lẫn schema `ExamBlueprint`.
2. **Màn kết quả đề online cho GV có trong MVP không?** Link, lịch và chấm tự động đã thiết kế nhưng không có chỗ xem ai nộp, điểm bao nhiêu.
3. **`scope` là RBAC thật trong MVP hay chỉ hiển thị?** Quyết định có cần bảng trường/lớp ngay MVP.

Chốt sau, không chặn:
4. Công thức điểm leaderboard (mock: 1.845 điểm từ 512 câu đúng → có trọng số chưa định nghĩa).
5. Trần ngân sách AI có chặn/cảnh báo thật hay chỉ hiển thị?
6. Badges là tính năng thật hay trang trí?
7. Bài kiểm tra định vị đầu vào có làm không?
8. Font bản in đề: Montserrat (như preview) hay Times New Roman (thông lệ đề thi VN)?
9. Nguồn đề ban đầu & bản quyền; tỉ lệ đề scan vs đề số; SSO trường học.
