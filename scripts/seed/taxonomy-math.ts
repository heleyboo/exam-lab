/**
 * Cây phân loại Toán THPT theo Chương trình GDPT 2018.
 *
 * Gốc là kỳ thi chứ không phải môn: sản phẩm nhắm cả THPT 2025 lẫn thi vào 10
 * chuyên, thiếu cấp này thì thêm mảng sau sẽ phải migrate cả cây.
 *
 * Dạng bài ở đây là bộ khởi đầu do người soạn, không phải danh sách đầy đủ.
 * Dạng bài do AI đề xuất về sau được gắn cờ riêng và phải qua admin duyệt.
 */

export interface TaxonomySeedNode {
  slug: string;
  name: string;
  children?: TaxonomySeedNode[];
}

/** Chủ đề kèm các dạng bài của nó. */
function topic(slug: string, name: string, types: [string, string][]): TaxonomySeedNode {
  return {
    slug,
    name,
    children: types.map(([s, n]) => ({ slug: s, name: n })),
  };
}

export const MATH_TAXONOMY: TaxonomySeedNode = {
  slug: "thpt-2025",
  name: "Thi tốt nghiệp THPT 2025",
  children: [
    {
      slug: "toan",
      name: "Toán",
      children: [
        {
          slug: "lop-10",
          name: "Lớp 10",
          children: [
            {
              slug: "menh-de-tap-hop",
              name: "Mệnh đề và tập hợp",
              children: [
                topic("menh-de", "Mệnh đề", [
                  ["xet-tinh-dung-sai", "Xét tính đúng sai của mệnh đề"],
                  ["menh-de-chua-bien", "Mệnh đề chứa biến và lượng từ"],
                ]),
                topic("tap-hop", "Tập hợp", [
                  ["phep-toan-tap-hop", "Các phép toán trên tập hợp"],
                  ["tap-hop-so", "Tập hợp số và khoảng đoạn"],
                ]),
              ],
            },
            {
              slug: "ham-so-bac-hai",
              name: "Hàm số bậc hai và đồ thị",
              children: [
                topic("do-thi-parabol", "Đồ thị hàm số bậc hai", [
                  ["dinh-parabol", "Xác định đỉnh và trục đối xứng"],
                  ["doc-do-thi-bac-hai", "Đọc đồ thị hàm số bậc hai"],
                ]),
                topic("dau-tam-thuc", "Dấu của tam thức bậc hai", [
                  ["giai-bat-phuong-trinh-bac-hai", "Giải bất phương trình bậc hai"],
                ]),
              ],
            },
            {
              slug: "he-thuc-luong-tam-giac",
              name: "Hệ thức lượng trong tam giác",
              children: [
                topic("dinh-li-sin-cos", "Định lí sin và định lí côsin", [
                  ["tinh-canh-goc-tam-giac", "Tính cạnh và góc trong tam giác"],
                  ["tinh-dien-tich-tam-giac", "Tính diện tích tam giác"],
                ]),
              ],
            },
            {
              slug: "vecto-lop-10",
              name: "Vectơ",
              children: [
                topic("phep-toan-vecto", "Các phép toán vectơ", [
                  ["tong-hieu-vecto", "Tổng và hiệu hai vectơ"],
                  ["tich-vo-huong", "Tích vô hướng của hai vectơ"],
                ]),
              ],
            },
            {
              slug: "xac-suat-lop-10",
              name: "Xác suất",
              children: [
                topic("bien-co-xac-suat", "Biến cố và xác suất", [
                  ["tinh-xac-suat-co-ban", "Tính xác suất của biến cố"],
                ]),
              ],
            },
          ],
        },
        {
          slug: "lop-11",
          name: "Lớp 11",
          children: [
            {
              slug: "ham-so-luong-giac",
              name: "Hàm số lượng giác và phương trình lượng giác",
              children: [
                topic("phuong-trinh-luong-giac", "Phương trình lượng giác", [
                  ["pt-luong-giac-co-ban", "Phương trình lượng giác cơ bản"],
                  ["pt-luong-giac-thuong-gap", "Phương trình lượng giác thường gặp"],
                ]),
                topic("tinh-chat-ham-luong-giac", "Tính chất hàm số lượng giác", [
                  ["tap-xac-dinh-luong-giac", "Tập xác định và tập giá trị"],
                ]),
              ],
            },
            {
              slug: "day-so-cap-so",
              name: "Dãy số, cấp số cộng và cấp số nhân",
              children: [
                topic("cap-so-cong", "Cấp số cộng", [
                  ["so-hang-tong-quat-csc", "Số hạng tổng quát của cấp số cộng"],
                  ["tong-n-so-hang-csc", "Tổng n số hạng đầu của cấp số cộng"],
                ]),
                topic("cap-so-nhan", "Cấp số nhân", [
                  ["so-hang-tong-quat-csn", "Số hạng tổng quát của cấp số nhân"],
                ]),
              ],
            },
            {
              slug: "mu-logarit",
              name: "Hàm số mũ và hàm số lôgarit",
              children: [
                topic("phuong-trinh-mu-logarit", "Phương trình mũ và lôgarit", [
                  ["pt-mu-co-ban", "Phương trình mũ cơ bản"],
                  ["pt-logarit-co-ban", "Phương trình lôgarit cơ bản"],
                ]),
                topic("bat-phuong-trinh-mu-logarit", "Bất phương trình mũ và lôgarit", [
                  ["bpt-mu-logarit", "Giải bất phương trình mũ và lôgarit"],
                ]),
              ],
            },
            {
              slug: "quan-he-vuong-goc",
              name: "Quan hệ vuông góc trong không gian",
              children: [
                topic("goc-khoang-cach", "Góc và khoảng cách trong không gian", [
                  ["goc-duong-thang-mat-phang", "Góc giữa đường thẳng và mặt phẳng"],
                  ["khoang-cach-diem-mat-phang", "Khoảng cách từ điểm đến mặt phẳng"],
                ]),
                topic("the-tich-khoi-da-dien", "Thể tích khối đa diện", [
                  ["the-tich-khoi-chop", "Thể tích khối chóp"],
                  ["the-tich-khoi-lang-tru", "Thể tích khối lăng trụ"],
                ]),
              ],
            },
            {
              slug: "xac-suat-lop-11",
              name: "Xác suất có điều kiện",
              children: [
                topic("xac-suat-dieu-kien", "Xác suất có điều kiện", [
                  ["cong-thuc-bayes", "Công thức Bayes và sơ đồ cây"],
                ]),
              ],
            },
          ],
        },
        {
          slug: "lop-12",
          name: "Lớp 12",
          children: [
            {
              slug: "ung-dung-dao-ham",
              name: "Ứng dụng đạo hàm để khảo sát hàm số",
              children: [
                topic("don-dieu-cuc-tri", "Tính đơn điệu và cực trị", [
                  ["xet-tinh-don-dieu", "Xét tính đơn điệu của hàm số"],
                  ["tim-cuc-tri", "Tìm cực trị của hàm số"],
                  ["cuc-tri-tham-so", "Cực trị của hàm số chứa tham số"],
                ]),
                topic("gia-tri-lon-nhat-nho-nhat", "Giá trị lớn nhất và nhỏ nhất", [
                  ["gtln-gtnn-tren-doan", "Giá trị lớn nhất, nhỏ nhất trên đoạn"],
                  ["gtln-gtnn-thuc-te", "Bài toán tối ưu thực tế"],
                ]),
                topic("tiem-can-do-thi", "Tiệm cận và đồ thị hàm số", [
                  ["tim-tiem-can", "Tìm tiệm cận đứng và tiệm cận ngang"],
                  ["doc-bang-bien-thien", "Đọc bảng biến thiên và đồ thị"],
                ]),
              ],
            },
            {
              slug: "nguyen-ham-tich-phan",
              name: "Nguyên hàm và tích phân",
              children: [
                topic("nguyen-ham", "Nguyên hàm", [
                  ["nguyen-ham-co-ban", "Nguyên hàm của hàm số cơ bản"],
                  ["nguyen-ham-doi-bien", "Nguyên hàm bằng phương pháp đổi biến"],
                ]),
                topic("tich-phan", "Tích phân", [
                  ["tich-phan-co-ban", "Tích phân cơ bản"],
                  ["tich-phan-doi-bien", "Tích phân đổi biến"],
                  ["tich-phan-tung-phan", "Tích phân từng phần"],
                ]),
                topic("ung-dung-tich-phan", "Ứng dụng của tích phân", [
                  ["dien-tich-hinh-phang", "Diện tích hình phẳng"],
                  ["the-tich-vat-the-tron-xoay", "Thể tích vật thể tròn xoay"],
                ]),
              ],
            },
            {
              slug: "toa-do-khong-gian",
              name: "Phương pháp toạ độ trong không gian",
              children: [
                topic("vecto-toa-do", "Vectơ và toạ độ trong không gian", [
                  ["toa-do-diem-vecto", "Toạ độ điểm và vectơ"],
                ]),
                topic("mat-phang-duong-thang", "Mặt phẳng và đường thẳng", [
                  ["phuong-trinh-mat-phang", "Phương trình mặt phẳng"],
                  ["phuong-trinh-duong-thang", "Phương trình đường thẳng"],
                  ["vi-tri-tuong-doi", "Vị trí tương đối và khoảng cách"],
                ]),
                topic("mat-cau", "Mặt cầu", [
                  ["phuong-trinh-mat-cau", "Phương trình mặt cầu"],
                ]),
              ],
            },
            {
              slug: "thong-ke-lop-12",
              name: "Thống kê",
              children: [
                topic("mau-so-lieu-ghep-nhom", "Mẫu số liệu ghép nhóm", [
                  ["tu-phan-vi-ghep-nhom", "Tứ phân vị của mẫu ghép nhóm"],
                  ["phuong-sai-do-lech-chuan", "Phương sai và độ lệch chuẩn"],
                ]),
              ],
            },
            {
              slug: "xac-suat-lop-12",
              name: "Xác suất",
              children: [
                topic("xac-suat-toan-phan", "Xác suất toàn phần", [
                  ["cong-thuc-xac-suat-toan-phan", "Công thức xác suất toàn phần"],
                ]),
              ],
            },
          ],
        },
      ],
    },
  ],
};
