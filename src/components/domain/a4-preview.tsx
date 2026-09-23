import { cn } from "@/lib/cn";

/**
 * Xem trước bản in đề.
 *
 * Dùng Times New Roman theo thông lệ đề thi Việt Nam. Bản xem trước và file
 * xuất ra phải dùng chung một template, nếu không hai bên sẽ lệch nhau.
 */
export function A4Preview({
  header,
  children,
  className,
}: {
  header: { authority: string; school: string; examCode: string; duration: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[640px] bg-white p-8 text-black shadow-[0_2px_12px_rgba(16,24,40,0.16)]",
        className,
      )}
      style={{ fontFamily: '"Times New Roman", Times, serif', aspectRatio: "210 / 297" }}
    >
      <div className="flex justify-between text-sm">
        <div className="text-center">
          <div className="font-bold uppercase">{header.authority}</div>
          <div className="uppercase">{header.school}</div>
        </div>
        <div className="text-center">
          <div className="font-bold uppercase">Đề thi chính thức</div>
          <div className="italic">{header.duration}</div>
          <div className="mt-1 border border-black px-2 py-0.5 font-bold">
            Mã đề {header.examCode}
          </div>
        </div>
      </div>
      <div className="mt-6 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
