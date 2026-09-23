import { cn } from "@/lib/cn";

/** Khung thẻ dùng chung: nền surface, viền mảnh, bóng nhẹ. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[13px] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-b border-[var(--color-line)] px-5 py-4", className)}>{children}</div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-b-[13px] border-t border-[var(--color-line)] bg-[var(--color-surface-2)] px-5 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
