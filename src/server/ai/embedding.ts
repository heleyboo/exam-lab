import { EMBEDDING_DIMENSIONS } from "../db/schema/content";

/**
 * Sinh vector cho câu hỏi để phát hiện trùng.
 *
 * Dùng model đa ngôn ngữ chạy cục bộ: đề tiếng Việt, và việc này chạy theo lô
 * lúc nhập đề nên không cần độ trễ thấp. Chạy cục bộ cũng có nghĩa không gửi
 * nội dung đề ra dịch vụ thứ ba, phù hợp với ràng buộc bản quyền.
 */

const MODEL = process.env.EMBEDDING_MODEL ?? "Xenova/multilingual-e5-base";

type Extractor = (
  input: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

let extractor: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  extractor ??= (async () => {
    // Nạp muộn: model nặng vài trăm MB, chỉ tải khi thật sự cần nhúng.
    const { pipeline } = await import("@huggingface/transformers");
    return (await pipeline("feature-extraction", MODEL)) as unknown as Extractor;
  })();
  return extractor;
}

/**
 * Model họ e5 yêu cầu tiền tố để phân biệt câu truy vấn với đoạn văn bản.
 * Ở đây mọi câu hỏi đều là "passage" vì ta so câu với câu.
 */
function prepare(text: string): string {
  // Cắt bớt cho vừa cửa sổ của model; phần đầu câu đã đủ để nhận ra trùng lặp.
  return `passage: ${text.replace(/\s+/gu, " ").trim().slice(0, 1200)}`;
}

export async function embedQuestions(texts: readonly string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = await getExtractor();
  const output = await model(texts.map(prepare), { pooling: "mean", normalize: true });
  const vectors = output.tolist();

  for (const vector of vectors) {
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Model '${MODEL}' trả về ${vector.length} chiều nhưng cột trong database là ${EMBEDDING_DIMENSIONS}. ` +
          `Đổi model là phải migrate cột và nhúng lại toàn bộ kho.`,
      );
    }
  }
  return vectors;
}

export async function embedQuestion(text: string): Promise<number[]> {
  const [vector] = await embedQuestions([text]);
  if (!vector) throw new Error("Không sinh được vector cho câu hỏi");
  return vector;
}

export const EMBEDDING_MODEL_NAME = MODEL;
