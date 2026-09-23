---
phase: 2
title: "Nền tảng và hạ tầng"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Nền tảng và hạ tầng

## Overview
Dựng khung dự án monolith TypeScript chạy được từ máy dev tới VPS: Next.js, Postgres + pgvector, pg-boss, Better Auth, storage S3-compatible, worker Node, Docker Compose.

## Requirements
- Chức năng: đăng ký/đăng nhập email + Google, 4 vai trò (student/teacher/admin/reviewer), middleware chặn route theo vai trò, 1 job "hello" chạy qua pg-boss chứng minh worker hoạt động, upload/đọc file qua storage.
- Phi chức năng: `docker compose up` là chạy được toàn bộ; biến môi trường có `.env.example`; không commit secret.

## Architecture
```
src/app/(public|student|teacher|admin)/...   # route groups theo vai trò
src/components/ui/                            # shadcn primitives
src/components/domain/                        # component nghiệp vụ (phase 4)
src/lib/                                      # tone.ts, mastery.ts, format-vi.ts
src/server/db/{index.ts,schema/*.ts}          # Drizzle + pgvector
src/server/auth/                              # Better Auth + RBAC helper
src/server/storage/                           # S3 client (MinIO/R2)
src/server/jobs/                              # định nghĩa + handler pg-boss
src/server/ai/                                # adapter model (phase 5)
src/worker/index.ts                           # process worker riêng
docker/{Dockerfile,Dockerfile.worker,compose.yml}
```
- Auth: Better Auth, session cookie. Vai trò lưu trên user; `scope` chỉ là text hiển thị (đã chốt, không phải RBAC).
- Worker là process riêng cùng codebase, dùng chung `src/server`.

## Related Code Files
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `drizzle.config.ts`, `.env.example`, `docker/*`, `src/server/**`, `src/app/layout.tsx`, `middleware.ts`
- Create: `vitest.config.ts`, `playwright.config.ts`

## Implementation Steps
1. Khởi tạo Next.js + TypeScript + Tailwind + shadcn/ui; bật `next/font` cho Be Vietnam Pro và Montserrat (nhớ subset `vietnamese`).
2. Postgres 16 + extension `vector`; Drizzle + migration đầu tiên (bảng user/session của Better Auth).
3. Better Auth: email/password + Google; bảng user có `role`, `school`, `classLabel`, `scopeLabel`, `plan`, `status`.
4. `middleware.ts` chặn route group theo vai trò; helper `requireRole()` dùng chung cho server action và route handler.
5. pg-boss: khởi tạo schema, một job mẫu, worker entry, script `dev:worker`.
6. Storage: client S3 cho MinIO (dev) và R2 (prod), helper `putObject/getSignedUrl`.
7. Docker Compose: `app`, `worker`, `postgres`, `minio`; thêm poppler + pandoc vào image worker.
8. Test khói: vitest cho `requireRole`, playwright cho luồng đăng nhập.

## Success Criteria
- [ ] `docker compose up` → mở được trang chủ, đăng nhập được, worker log job mẫu
- [ ] User sai vai trò truy cập route admin bị chặn **ở server**, không chỉ ẩn menu
- [ ] Upload file lên MinIO và đọc lại bằng signed URL
- [ ] `.env.example` đủ biến, không có secret thật trong repo

## Risk Assessment
- **Better Auth đổi API** → đọc docs bản hiện tại trước khi code (`/ck:docs-seeker`).
- **pg-boss version schema** → pin version, chạy migration của pg-boss trong worker khởi động.
- **Ảnh Docker nặng do poppler/pandoc** → chỉ cài vào image worker, không cài vào image app.
