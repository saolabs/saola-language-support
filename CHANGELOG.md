# Changelog

Các thay đổi đáng chú ý của **Saola Language Support**.

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/),
đánh phiên bản theo [SemVer](https://semver.org/lang/vi/).

---

## [1.15.0] — 2026-08-31

### Sửa

- **Sửa phím tắt chú thích (Cmd + / / Ctrl + /)**: Bên ngoài `<script>`, phím tắt chú thích sẽ bọc thành comment Blade `{{-- ... --}}` thay vì chèn `//`. Trong khi đó, bên trong `<script>` vẫn dùng `//` của JavaScript như bình thường.


### Thêm

- **Icon riêng cho file `.sao`** — dùng brand mark SaoLabs (`icons/sao-file.svg`),
  khai báo qua `contributes.languages[].icon` nên không cần cài thêm icon theme và
  không ghi đè icon của các file khác.
- **Go to Definition (Cmd/Ctrl+Click)** cho đường dẫn view: `@extends`, `@include`,
  `@includeIf/When/Unless/First`, `@import`, `@each`, `@component` — hỗ trợ cả
  `__layout__ + 'base'` lẫn dotted path `'web.modules.demo.card'`.
- **Cmd/Ctrl+Click trên tag component** (`<featurecard>`, `<Header>`) nhảy tới file
  của `@import` tương ứng, khớp cả alias `as Name`.
- **Hover** trên directive hiện mô tả + snippet mẫu.

### Ghi chú

Đường dẫn view được resolve bằng cách so khớp đuôi path (nhiều segment cuối trùng
nhất thắng) thay vì đọc config của `ViewPathResolver` bên PHP, nên hoạt động với
mọi cách bố trí thư mục mà không cần cấu hình.

---

## [1.10.0] — 2026-08-04

### Thêm

- **Hỗ trợ `@computed`** — state dẫn xuất có memo hoá, chỉ tính lại khi
  dependency đổi:

  ```
  @states({ first: 'Sao', last: 'La' })
  @computed(fullName = first + ' ' + last)

  <blade>
      <h1>{{ fullName }}</h1>
  </blade>
  ```

  Hỗ trợ đầy đủ ở cả 4 mặt:
  - **Tô màu cú pháp** — nhận diện `@computed` như directive khai báo, cả
    trong template lẫn trong thẻ HTML (injection grammar).
  - **Snippet** `b:computed`.
  - **Gợi ý** (completion) khi gõ `@`.
  - **Không còn cảnh báo sai** — biến khai báo bằng `@computed` trước đây bị
    báo *"is not declared"* vì extension chỉ biết `@let`/`@const`/`@useState`/
    `@vars`/`@props`.

### Sửa

- **Dung lượng gói giảm 94%: 7.8 MB → 466 KB.** Hai nguyên nhân:
  - Thiếu `.vscodeignore` nên bản đóng gói nuốt cả `src/` (mã nguồn `.ts`),
    `out/` (đầu ra của `tsc`, không được load — `main` trỏ `dist/`) và
    sourcemap. Số file trong gói: 222 → 85.
  - Icon để ở 2048×2048 (7.8 MB) trong khi marketplace chỉ cần 128–256px.
    Nay dùng bản 256px (134 KB); bản gốc vẫn giữ trong repo tại
    `images/icon-2048-source.png` để xuất lại kích thước khác khi cần.

### Tương thích

Không có thay đổi phá vỡ. Cú pháp và cấu hình cũ giữ nguyên.

---

## Trước 1.10.0 (1.7.x – 1.9.0) — 2026-04

> **Lưu ý về tính chính xác:** dự án chưa ghi changelog và chưa gắn tag phiên
> bản trước 1.10.0, nên không thể quy từng thay đổi về đúng số phiên bản.
> Phần dưới chỉ tóm tắt các chủ đề lấy từ lịch sử commit có thật — **không
> phải** danh sách theo phiên bản.

Mốc thời gian (theo ngày tạo file `.vsix` trong repo):

| Phiên bản | Ngày |
|---|---|
| 1.7.1 | 2026-04-14 |
| 1.8.0 | 2026-04-15 |
| 1.9.0 | 2026-04-22 |

Các chủ đề chính trong giai đoạn này:

- Đổi tên và định vị lại extension thành **Saola Language Support**, hỗ trợ
  tô màu song ngữ cho file `.sao`.
- Chuyển language scope từ JavaScript sang PHP; đăng ký định danh `saola`.
- Thêm **injection grammar** để nhận diện directive kiểu Blade nằm bên trong
  thẻ HTML.
- Chuẩn hoá việc phân tích biến (variable parsing).
- Cập nhật marker gấp/mở khối (folding) và cải thiện regex khớp directive.

---

## Quy ước từ 1.10.0 trở đi

- Mỗi lần phát hành **phải** cập nhật file này trước khi chạy `npm run publish`.
- `MAJOR` — thay đổi phá vỡ cú pháp `.sao` hoặc cấu hình đã công bố.
  `MINOR` — thêm directive/tính năng. `PATCH` — sửa lỗi, không đổi hành vi.
- Nên gắn tag `v<version>` mỗi lần phát hành — hiện repo **chưa có tag nào**,
  nên không thể truy ngược thay đổi về từng phiên bản (xem mục 1.7.x–1.9.0).

> `package.json` đang khai báo `repository` là
> `template-languages/vscode-extension` — URL từ thời extension chưa đổi tên
> thành Saola. Cần cập nhật cho đúng repo hiện tại trước khi publish, vì
> Marketplace dùng trường này để hiện link mã nguồn.
