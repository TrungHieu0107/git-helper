# Stability & Build Rules

> **Core Philosophy:** "Code must not only look clean, it must build flawlessly and never crash at runtime."
> 
> Áp dụng chặt chẽ cho toàn bộ quá trình phát triển dự án Tauri (React/TypeScript + Rust).

## 1. Zero-Crash Guarantee (Đảm bảo không Crash)

### 1.1 Defensive Programming (Lập trình phòng thủ)
Luôn luôn đề phòng trường hợp dữ liệu bị thiếu hoặc API trả về lỗi:
- **TypeScript:** Tuyệt đối sử dụng Optional Chaining (`?.`) và Nullish Coalescing (`??`) khi truy cập object nested.
  ```ts
  // ❌ Nguy hiểm: Sẽ crash nếu user hoặc profile là null
  const avatar = user.profile.avatarUrl;
  
  // ✅ An toàn
  const avatar = user?.profile?.avatarUrl ?? DEFAULT_AVATAR;
  ```
- **Rust:** Không bao giờ sử dụng `.unwrap()` trong code production. Luôn xử lý lỗi một cách rõ ràng bằng `match` hoặc toán tử `?`.
  ```rust
  // ❌ Nguy hiểm: Sẽ panic/crash app nếu file không tồn tại
  let content = fs::read_to_string("config.json").unwrap();

  // ✅ An toàn: Trả về Result để frontend xử lý
  let content = fs::read_to_string("config.json").map_err(|e| e.to_string())?;
  ```

### 1.2 Global Error Handling
- **Frontend:** Tất cả các component render UI phải được bọc trong một `ErrorBoundary` ở cấp độ cao nhất. Lỗi ở một component nhỏ không được phép làm trắng màn hình toàn bộ ứng dụng.
- **Backend (Tauri/Rust):** Các command gửi lên từ frontend phải luôn được bọc bằng `Result<T, String>`. Tuyệt đối không để Rust backend bị Panic.

---

## 2. Compile & Build First (Quy tắc Build Code)

Mã nguồn được coi là "hoàn thành" chỉ khi nó vượt qua các bài kiểm tra biên dịch (Compilation).

### 2.1 Không Bỏ Qua Type Checker (Strict Mode)
- **TypeScript:** Hạn chế tối đa việc sử dụng kiểu `any`. Mọi dữ liệu đi qua API hoặc Store đều phải có `interface` hoặc `type` rõ ràng.
- **Kiểm tra trước khi commit:** Phải đảm bảo lệnh `npx tsc --noEmit` chạy thành công không có lỗi đỏ (Red squiggly lines).

### 2.2 Quy trình Build Tauri/Rust
- Đảm bảo Rust codebase luôn xanh: Chạy `cargo check` hoặc `cargo clippy` để phát hiện lỗi logic và lifetime trước khi build.
- Xóa bỏ các cảnh báo (Warnings) không cần thiết: Tránh import biến mà không dùng tới, thêm `#[allow(dead_code)]` nếu thực sự là hàm tiện ích đang chờ sử dụng.

---

## 3. Clean Code & Architecture (Kiến trúc Sạch)

### 3.1 Ngăn chặn Dependency Cycle (Vòng lặp phụ thuộc)
Tuyệt đối không để xảy ra hiện tượng Circular Dependency, đặc biệt là trong các file cấu hình hoặc Global Store (`store.ts` gọi `repo.ts`, `repo.ts` lại import `store.ts`).
- **Cách giải quyết:** Tách logic ra thành các file utils riêng biệt, hoặc sử dụng cơ chế Inject/Callback. Thường xuyên kiểm tra thứ tự khởi tạo của App (Initialization Sequence).

### 3.2 Tối ưu hóa UI/UX Performance (React)
- Sử dụng `@tanstack/react-virtual` cho các danh sách dài (ví dụ: hàng nghìn commit). Không bao giờ render toàn bộ DOM ra màn hình cùng lúc.
- Lạm dụng `useState` cho các giá trị thay đổi liên tục (như scroll, resize) sẽ gây tụt FPS. Hãy sử dụng `useRef` hoặc CSS thuần (như `group-hover` của Tailwind) thay vì kích hoạt Re-render.
- Hạn chế CSS phức tạp như `backdrop-blur` (Glassmorphism) chồng chéo lên nhau quá nhiều lớp, thay vào đó hãy sử dụng Opaque Masking (màu nền đặc che khuất) để tăng hiệu năng vẽ của trình duyệt.

---

## 4. Checklist Trước Khi Kết Thúc Task
Trước khi báo cáo Task hoàn thành, bạn **PHẢI** tự hỏi:
1. [ ] Code mới thêm vào có phá vỡ tính năng cũ không? (Regression)
2. [ ] Giao diện (UI) có bị vỡ khi resize màn hình hoặc khi dữ liệu bị trống (Empty State) không?
3. [ ] Có quên xóa các dòng `console.log()` hoặc `println!()` dùng để debug không?
4. [ ] Lệnh TypeScript/Rust Compiler có đang báo lỗi nào không?
5. [ ] Các cảnh báo linter đã được giải quyết hoặc lý giải hợp lý chưa?
