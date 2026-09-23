/**
 * Giá API theo triệu token, đơn vị USD.
 * Nguồn: bảng giá Anthropic. Model nào không có trong bảng thì spike báo lỗi
 * thay vì đoán, để con số chi phí trong report luôn đúng.
 */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface Cost {
  usd: number;
  vnd: number;
}

export function priceOf(model: string): { input: number; output: number } {
  const price = PRICE_PER_MTOK[model];
  if (!price) {
    throw new Error(
      `Chưa có bảng giá cho model '${model}'. Thêm vào spike/lib/cost.ts rồi chạy lại.`,
    );
  }
  return price;
}

export function costOf(model: string, usage: Usage, usdToVnd: number): Cost {
  const price = priceOf(model);
  const usd =
    (usage.inputTokens / 1_000_000) * price.input +
    (usage.outputTokens / 1_000_000) * price.output;
  return { usd, vnd: usd * usdToVnd };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
  };
}

export function formatVnd(vnd: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(vnd) + "đ";
}
