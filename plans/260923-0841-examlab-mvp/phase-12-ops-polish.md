---
phase: 12
title: "Vận hành và hoàn thiện"
status: pending
priority: P2
dependencies: [9, 11]
---

# Phase 12: Vận hành và hoàn thiện

## Overview
Phần quản trị vận hành và những thứ prototype không có nhưng bắt buộc phải có khi chạy thật: quota và trang gói, cấu hình model AI, quản lý người dùng, báo lỗi, trạng thái rỗng/tải/lỗi, a11y, deploy.

## Requirements
- Chức năng: màn cài đặt (quota Free/Pro, model theo từng tác vụ + fallback, ngân sách AI tháng, quản lý và **duyệt tài khoản giáo viên**), tổng quan admin, hàng chờ báo lỗi, **hàng chờ câu hỏi do học sinh đề xuất**, trang gói cho học sinh và giáo viên.
- Phi chức năng: mọi màn có trạng thái rỗng/đang tải/lỗi; a11y đạt AA; deploy được lên VPS bằng một lệnh.

## Architecture
- Quota đọc từ bảng cấu hình, kiểm tra tập trung ở `src/server/services/quota.ts` (mọi job AI gọi qua đây).
- Cấu hình model theo tác vụ đọc bởi `src/server/ai/adapter.ts`.
- Ngân sách AI tháng: cộng dồn từ `ai_usage_log`, vượt ngưỡng thì cảnh báo và chặn job không thiết yếu.
- Trang gói: hiển thị hạn mức Free/Pro theo **vai trò người đang xem**, chưa gắn thanh toán.

## Related Code Files
- Create: `src/app/(admin)/{dashboard,settings,reports,suggestions}/**`
- Create: `src/app/(student)/plan/page.tsx`, `src/app/(teacher)/plan/page.tsx`
- Create: `src/server/services/quota.ts`, `.github/workflows/ci.yml`, `docs/deployment.md`

## Implementation Steps
1. Dịch vụ quota + chặn tập trung; badge quota hiển thị **theo vai trò** (học sinh: lượt AI/ngày; giáo viên: số đề/tháng).
2. Trang gói riêng cho học sinh và giáo viên — sửa lỗi prototype đẩy người dùng sang màn cài đặt admin và đổi luôn vai trò.
3. Màn cài đặt admin: quota, model theo tác vụ, ngân sách, danh sách user + duyệt tài khoản giáo viên.
4. **Reviewer chỉ thấy các màn duyệt** (soát đề, lời giải, taxonomy, báo lỗi, khiếu nại) — không có cài đặt. Kiểm tra ở server.
5. Hàng chờ báo lỗi (SLA 48h) và hàng chờ câu hỏi học sinh đề xuất (`origin=student_generated`).
6. Tổng quan admin: số lượng hàng chờ, job import, chi phí AI, thống kê nội dung.
7. Rà soát toàn bộ: trạng thái rỗng/tải/lỗi/404, toast, a11y (label, aria, focus), định dạng số tiếng Việt qua `Intl`.
8. CI (lint + typecheck + test), Docker Compose production, `docs/deployment.md`, sao lưu Postgres.

## Success Criteria
- [ ] Reviewer không truy cập được màn cài đặt kể cả khi gõ thẳng URL (có test)
- [ ] Học sinh bấm "Nâng cấp" ra trang gói của học sinh, vai trò **không** đổi
- [ ] Vượt ngưỡng ngân sách AI thì job không thiết yếu bị chặn và có cảnh báo
- [ ] Mọi danh sách có trạng thái rỗng và trạng thái lỗi tử tế
- [ ] Kiểm tra a11y tự động không còn lỗi mức nghiêm trọng
- [ ] Deploy lên VPS chạy được, có hướng dẫn và sao lưu DB

## Risk Assessment
- **Rà soát cuối dễ bị cắt khi trễ tiến độ** → a11y và trạng thái rỗng làm ngay trong từng phase trước, phase này chỉ còn rà lại.
- **Cấu hình model sai làm chết job** → validate cấu hình khi lưu, có fallback mặc định.
- **Backup** → bật `pg_dump` định kỳ ngay ngày deploy đầu tiên, đừng để sau.
