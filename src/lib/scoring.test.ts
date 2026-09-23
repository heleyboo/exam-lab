import { describe, expect, it } from "vitest";
import {
  normalizeShortAnswer,
  POINTS_PER_QUESTION,
  scoreEssay,
  scoreMcq,
  scoreShortAnswer,
  scoreTrueFalse,
  TRUE_FALSE_LADDER,
} from "./scoring";

describe("câu Đúng/Sai - thang điểm của Bộ", () => {
  const correct = [true, false, true, false];

  it("đúng 0 tới 4 ý cho đúng thang 0 · 0,1 · 0,25 · 0,5 · 1", () => {
    const cases: [boolean[], number, number][] = [
      [[false, true, false, true], 0, 0],
      [[true, true, false, true], 1, 0.1],
      [[true, false, false, true], 2, 0.25],
      [[true, false, true, true], 3, 0.5],
      [[true, false, true, false], 4, 1],
    ];
    for (const [answer, expectedCount, expectedPoints] of cases) {
      const result = scoreTrueFalse(answer, correct);
      expect(result.correctCount).toBe(expectedCount);
      expect(result.points).toBe(expectedPoints);
    }
  });

  it("thang điểm không tuyến tính: đúng 2 trên 4 ý chỉ được một phần tư điểm", () => {
    expect(TRUE_FALSE_LADDER[2]).toBe(0.25);
    expect(TRUE_FALSE_LADDER[2]).not.toBe(0.5);
  });

  it("ý bỏ trống tính là sai", () => {
    const result = scoreTrueFalse([true, false], correct);
    expect(result.correctCount).toBe(2);
  });

  it("từ chối câu không đủ 4 ý thay vì chấm bừa", () => {
    expect(() => scoreTrueFalse([true], [true, false, true])).toThrow(/đúng 4 ý/);
  });
});

describe("câu trả lời ngắn - chuẩn hoá đáp số", () => {
  it("'2', '2,0', '2.0' và ' 2 ' là cùng một đáp án", () => {
    for (const answer of ["2", "2,0", "2.0", " 2 ", "2,00"]) {
      expect(scoreShortAnswer(answer, "2")).toBe(true);
    }
  });

  it("giữ nguyên dấu phẩy thập phân kiểu Việt Nam", () => {
    expect(scoreShortAnswer("1,04", "1.04")).toBe(true);
    expect(scoreShortAnswer("96,5", "96,5")).toBe(true);
  });

  it("số khác nhau vẫn phải sai", () => {
    expect(scoreShortAnswer("2,5", "2")).toBe(false);
    expect(scoreShortAnswer("-2", "2")).toBe(false);
  });

  it("bỏ trống là sai, không phải đúng", () => {
    expect(scoreShortAnswer(null, "2")).toBe(false);
    expect(scoreShortAnswer("", "2")).toBe(false);
  });

  it("đáp án chữ thì so không phân biệt hoa thường", () => {
    expect(normalizeShortAnswer(" Abc ")).toBe("abc");
  });
});

describe("câu nhiều lựa chọn", () => {
  it("so không phân biệt hoa thường và khoảng trắng", () => {
    expect(scoreMcq(" b ", "B")).toBe(true);
    expect(scoreMcq("A", "B")).toBe(false);
    expect(scoreMcq(null, "B")).toBe(false);
  });
});

describe("tự luận chấm theo rubric", () => {
  const steps = [{ maxPoints: 0.75 }, { maxPoints: 0.75 }, { maxPoints: 1.5 }];

  it("cộng điểm từng bước", () => {
    const result = scoreEssay(steps, [{ points: 0.75 }, { points: 0.5 }, { points: 1 }]);
    expect(result.points).toBe(2.25);
    expect(result.maxPoints).toBe(3);
  });

  it("không cho chấm vượt trần của bước", () => {
    const result = scoreEssay(steps, [{ points: 10 }, { points: 0 }, { points: 0 }]);
    expect(result.points).toBe(0.75);
  });

  it("không cho điểm âm", () => {
    const result = scoreEssay(steps, [{ points: -5 }, { points: 0 }, { points: 0 }]);
    expect(result.points).toBe(0);
  });

  it("thiếu điểm cho một bước thì bước đó tính 0", () => {
    const result = scoreEssay(steps, [{ points: 0.75 }]);
    expect(result.points).toBe(0.75);
  });
});

describe("điểm mỗi câu theo phần", () => {
  it("khớp cấu trúc đề THPT 2025: 12 câu Phần I + 4 Phần II + 6 Phần III = 10 điểm", () => {
    const total =
      12 * POINTS_PER_QUESTION.I + 4 * POINTS_PER_QUESTION.II + 6 * POINTS_PER_QUESTION.III;
    expect(total).toBe(10);
  });
});
