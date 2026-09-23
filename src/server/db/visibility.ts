import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import { question, sourceExam } from "./schema";

/**
 * Điều kiện lọc nội dung theo trạng thái và bản quyền.
 *
 * Bắt buộc dùng helper này ở mọi truy vấn kho câu hỏi. Lặp lại điều kiện ở từng
 * chỗ gọi thì sớm muộn sẽ có một chỗ quên, và chỗ quên đó làm lộ nội dung chưa
 * duyệt hoặc nội dung đã bị yêu cầu gỡ.
 */

export type Audience =
  /** Trang công khai, người chưa đăng nhập. Chỉ thấy nội dung `public`. */
  | "public"
  /** Học sinh và giáo viên đã đăng nhập. Thấy cả nội dung `restricted`. */
  | "member"
  /** Người duyệt nội dung. Thấy mọi trạng thái, trừ nội dung đã gỡ. */
  | "reviewer";

/**
 * Nội dung đã gỡ theo yêu cầu bản quyền phải biến mất với TẤT CẢ mọi người,
 * kể cả người duyệt. Đây là điều kiện duy nhất không có ngoại lệ.
 */
function notTakenDown(): SQL {
  return or(isNull(sourceExam.id), isNull(sourceExam.takedownAt))!;
}

/**
 * Truy vấn dùng helper này phải join `sourceExam` (left join, vì câu do admin
 * tự soạn không có đề nguồn).
 */
export function visibleTo(audience: Audience): SQL {
  if (audience === "reviewer") {
    return notTakenDown();
  }

  const published = eq(question.status, "published");
  if (audience === "member") {
    return and(published, notTakenDown())!;
  }
  return and(published, eq(question.visibility, "public"), notTakenDown())!;
}
