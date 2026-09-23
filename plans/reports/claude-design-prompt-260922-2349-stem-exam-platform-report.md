# Claude Design prompt — ExamLab prototype

Copy everything inside the fence below into Claude Design.

```text
Design a clickable, high-fidelity web prototype for "ExamLab" — a Vietnamese exam-practice and exam-authoring platform for high-school Mathematics (THPT, grades 10–12), later expanding to Physics, Chemistry, Biology.

ALL UI TEXT AND SAMPLE CONTENT MUST BE IN VIETNAMESE. Use realistic Vietnamese math content with properly rendered formulas (LaTeX-style: fractions, integrals, logarithms, vectors, limits), e.g. "Cho hàm số y = x³ − 3x² + 2. Tìm giá trị cực đại của hàm số."

## Product context
- Four roles: Học sinh (student), Giáo viên (teacher), Admin, Reviewer. Provide a role switcher in the prototype so all flows can be demoed.
- Question kinds follow the 2025 Vietnamese national exam format:
  1. Trắc nghiệm nhiều lựa chọn (4 options A–D)
  2. Trắc nghiệm Đúng/Sai (one stem, 4 statements a–d, each marked Đúng/Sai; partial scoring 0.1/0.25/0.5/1)
  3. Trả lời ngắn (numeric short answer)
  4. Tự luận (essay; student uploads a photo of handwritten work OR types in an in-app math editor)
- Taxonomy: Môn → Lớp → Chương → Chủ đề → Dạng bài, plus cognitive level: Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao.
- Content lifecycle badges: Nháp, Chờ duyệt, Đã duyệt, Đã xuất bản, Từ chối. Content origin badges: Import, Admin, AI biến thể, HS tự sinh ("AI – chưa kiểm duyệt").
- AI features are always clearly labeled; AI essay grading is labeled "Chấm tham khảo".
- Freemium: show remaining AI quota (e.g. "Còn 3/5 lượt AI hôm nay") and an upgrade hint.

## Visual direction
- Calm, focused, academic but modern; generous whitespace; excellent math typography.
- Light mode primary with a dark-mode variant. One confident accent color (deep blue or teal) plus semantic colors for correct/incorrect/pending.
- Desktop-first for Admin and Teacher; fully responsive, mobile-first for Student practice screens.
- Accessible: AA contrast, clear focus states, large tap targets on mobile.

## Screens to design

### Public
1. Landing page: value proposition for students and teachers, sample question card, CTA đăng ký / đăng nhập.
2. Sign in / sign up (email + Google), choose role Học sinh / Giáo viên.

### Student (Học sinh)
3. Dashboard: streak, questions solved this week, mastery radar or heatmap by topic, "Ôn phần yếu" recommendation cards (weakest Dạng bài), continue-practice card, daily challenge card, mini leaderboard position.
4. Topic browser: tree Lớp → Chương → Chủ đề → Dạng bài with mastery % per node, question counts, filters by level and question kind.
5. Practice session (by Dạng bài): one question at a time, progress bar, timer, answer input adapted to each of the 4 kinds, instant feedback, "Xem lời giải" with step-by-step solution, "Báo lỗi câu hỏi", "Tạo bài tương tự" button. Show one screen state for each question kind.
6. Essay submission: two tabs — "Chụp bài làm" (upload/camera, multi-page preview, crop) and "Giải trên app" (math editor with formula toolbar, step lines). Submit button shows quota cost.
7. AI grading result (Chấm tham khảo): rubric table per step with points, highlighted wrong step, AI comments, total advisory score, reference solution side by side, "Khiếu nại kết quả" action.
8. Full exam mode: take a generated exam with timer, question navigator grid, flag for review, submit confirmation, result page with score breakdown by part (Phần I/II/III) and by Dạng bài.
9. "Tạo bài tương tự" (student AI generator): pick Dạng bài + level + quantity → generated questions with prominent "AI – chưa kiểm duyệt" badge, not counted for ranking, quota indicator, "Đề xuất đưa vào kho" action.
10. Challenges (LeetCode-style): problem list table with columns Tên, Dạng bài, Độ khó (Dễ/Trung bình/Khó), Tỉ lệ đúng, Trạng thái (solved/attempted); filters; daily challenge banner; challenge detail page with problem, answer box, submissions history.
11. Leaderboard: tabs Tuần / Tháng / Tất cả; filters by grade; top-3 podium; current user row pinned; note "Chỉ tính câu đã kiểm duyệt".
12. Profile & history: attempts history, mastery by topic over time, badges.

### Teacher (Giáo viên)
13. Teacher dashboard: recent exams, blueprint templates, quick "Tạo đề mới".
14. Exam blueprint builder (Ma trận đề): matrix table with rows = Chủ đề/Dạng bài and columns = level (NB/TH/VD/VDC) × question kind, editable counts and points, live totals (question count, total score = 10), bank availability warnings when not enough published questions; load template "Cấu trúc THPT 2025 – Toán".
15. Generated exam review: questions grouped by Phần I/II/III, per-question "Đổi câu khác cùng dạng" swap, drag to reorder, preview rendering exactly as printed.
16. Variants & export: choose number of mã đề (e.g. 4), shuffle questions/options toggles, export PDF / Word with answer key, create share link for online attempt; print preview with exam header (Sở GD&ĐT, Trường, Mã đề, thời gian làm bài).
17. Question bank browser (read-only for teachers): search, filter by taxonomy/level/kind/source/year, question cards with rendered math.

### Admin / Reviewer
18. Admin dashboard: import jobs status, review queue counts (Lời giải AI chờ duyệt, Ưu tiên – lệch đáp án, Biến thể AI, Báo lỗi, Khiếu nại), AI cost this month, content stats by topic.
19. Import upload: drag-and-drop PDF or Word (.docx), metadata form (Kỳ thi, Trường/Sở, Năm, Môn, Lớp), job list with progress steps (Tải lên → Trích xuất → Phân loại → Kiểm tra trùng → Chờ soát).
20. Import review workspace (most important admin screen): split view — left: original PDF page viewer with highlighted bounding boxes per question; right: extracted question list, each editable (Markdown+LaTeX editor with live preview, options, answer key, figure attachments with re-crop), AI-suggested Dạng bài and level with confidence, duplicate warning linking to similar existing question, actions merge/split questions, approve selected in batch.
21. Solution review queue: list with filter "Khớp đáp án gốc" vs "Lệch đáp án gốc" (priority); detail shows question, original answer key, AI step-by-step solution with editable steps, Approve / Edit & approve / Reject with reason.
22. AI variant review (Phase 2): parent question vs generated variants side by side, verification status (Đã kiểm chứng tự động / Cần kiểm tra), approve into bank.
23. Taxonomy manager: editable tree Môn → Lớp → Chương → Chủ đề → Dạng bài, question counts per node, merge/move nodes, AI-suggested new Dạng bài awaiting approval.
24. Reports & appeals: content error reports and essay-grading appeals with resolution workflow.
25. Settings: quota per plan (Free / Pro), AI model provider, user & role management.

## Components to define
Question card (4 kinds), math-rendered text block, status/origin badges, level chip, mastery bar and heatmap, quota indicator, matrix table cell, PDF viewer with bounding-box overlay, rubric step row, leaderboard row, job progress stepper, empty/loading/error states.

## Deliverable
A connected prototype with navigation between screens per role, consistent design system (colors, typography, spacing, components), and realistic Vietnamese sample data. Prioritize fidelity on screens 5, 7, 14, 16, 20, 21.
```
