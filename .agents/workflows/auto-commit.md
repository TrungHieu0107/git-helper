---
description: Tự động stage và commit các thay đổi của dự án vào Git sau mỗi tính năng hoặc request.
---

Workflow này có nhiệm vụ tạo Git commit sau khi hoàn tất một request. Nó sẽ tự động đóng gói các thay đổi nhằm đảm bảo lịch sử phát triển liên tục mà không cần lệnh thủ công.

// turbo-all
1. Kiểm tra trạng thái hiện tại (`git status`).
2. Add toàn bộ các tệp cần thiết: `git add .`
3. Đọc lại nội dung cập nhật mới nhất từ `memory.md` và tóm tắt thành thông điệp Conventional Commit rõ ràng (vd: `feat: ...`, `fix: ...`, `refactor: ...`).
4. Thực thi việc lưu trữ bằng lệnh: `git commit -m "..."`.
5. Đảm bảo mọi thay đổi đã được commit sạch sẽ.
