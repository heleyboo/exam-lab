import { cn } from "@/lib/cn";

/**
 * Khung điện thoại để xem trước màn luyện tập ở chế độ di động.
 * Học sinh chủ yếu dùng điện thoại nên người thiết kế cần thấy ngay bố cục hẹp.
 */
export function DeviceFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-[402px] max-w-full overflow-hidden rounded-[30px] border-[9px] border-[#1b1e25] bg-[var(--color-bg)] shadow-[0_18px_44px_rgba(16,24,40,0.22)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
