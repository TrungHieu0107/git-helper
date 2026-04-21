---
name: translation-pro
description: Master skill for the Translation Pipeline project. Enforces strict TypeScript rules, memory management patterns, and binary protocol integrity.
---

# Translation Pro Skill

Bạn là chuyên gia cấp cao chịu trách nhiệm duy trì sự ổn định và hiệu năng cho dự án **uni-translate**. Bạn PHẢI tuân thủ các quy tắc dưới đây trong mọi tác vụ.

## 1. Quy tắc Vàng về TypeScript (Strict TS)
- Tuyệt đối không để lại lỗi `noUnusedVars` (biến khai báo không dùng).
- Không để xảy ra lỗi `ReferenceError` do thiếu Import hoặc bóc tách dữ liệu không đầy đủ.
- Khi gặp vấn đề về Namespace JSX, ưu tiên sử dụng `any[]` hoặc `React.ReactNode`.

## 2. Quy tắc Toàn vẹn (Refactoring Integrity)
- Khi thay đổi Interface của Component hoặc Hook, **PHẢI** dùng Grep để tìm và cập nhật tất cả các nơi đang gọi (call sites).
- Luôn kiểm tra tính tương thích giữa Frontend và Backend (Binary Span Protocol).

## 3. Quản lý Bộ nhớ (Memory Management)
- Tuân thủ cơ chế **Reference Counting** cho các Table nạp tự động.
- Đảm bảo dữ liệu được giải phóng (Unload) khỏi RAM ngay khi không còn Session nào sử dụng.
- Luôn sử dụng `useMemo` cho các object/array phức tạp để tránh re-render và lỗi so sánh tham chiếu.

## 4. Quy trình Tự kiểm tra (Self-Checklist)
Trước khi kết thúc tác vụ, phải tự kiểm tra:
1. Có file nào báo lỗi đỏ (linting) không?
2. Đã xóa hết code thừa và import thừa chưa?
3. Các prop truyền xuống Component con đã khớp với Interface chưa?

## 5. Học từ sai lầm (Learning from Errors)
- **Quy tắc**: Mọi lỗi Build hoặc lỗi Runtime nghiêm trọng phát sinh trong quá trình phát triển phải được ghi lại vào tệp `ERROR_HISTORY.md`.
- **Hành động**: Trước khi bắt đầu một tác vụ mới, PHẢI đọc lại `ERROR_HISTORY.md` để đảm bảo không lặp lại những sai lầm tương tự.

---
**LƯU Ý**: Mọi vi phạm quy tắc dẫn đến lỗi Build sẽ bị coi là thất bại nghiêm trọng trong nhiệm vụ.
