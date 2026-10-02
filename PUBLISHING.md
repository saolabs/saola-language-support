# Publish Saola Language Support

Repository: https://github.com/saolabs/saola-language-support
Extension ID: `saolabs.saola-language-support`.
Manifest hiện tại: `1.17.0`; kiểm tra kho trước khi dùng version này.
Hướng dẫn cập nhật ngày 2026-10-02.

## Build và đóng gói

```bash
cd saola-language-support # từ workspace saola-ecosystem
npm ci
npm audit
npm test
npm run build
npx --package @vscode/vsce vsce ls
npx --package @vscode/vsce vsce package --out /tmp/saola-language-support.vsix
```

Kiểm tra VSIX có `dist/extension.js`, grammar, snippets, cấu hình ngôn ngữ, icon và TypeScript runtime libs.
`.vscodeignore` loại source/tests/output trung gian và bản VSIX cũ.
Script `npm run publish` hiện chỉ build và tạo VSIX, chưa upload lên Marketplace.

## Visual Studio Marketplace

1. Đăng nhập [publisher management](https://marketplace.visualstudio.com/manage).
2. Tạo publisher ID `saolabs` nếu chưa có, hoặc dùng tài khoản có quyền trên publisher đó.
3. Tạo extension mới hoặc chọn extension hiện có rồi upload VSIX đã kiểm tra.
4. Chờ xử lý, kiểm tra trang `saolabs.saola-language-support`, cài lại từ Marketplace.

CLI cũng hỗ trợ upload:

```bash
npx --package @vscode/vsce vsce login saolabs
npx --package @vscode/vsce vsce publish --packagePath /tmp/saola-language-support.vsix
```

Nếu dùng PAT, cấp quyền Marketplace Manage theo tài liệu hiện hành; nhập token qua prompt.
Microsoft công bố ngừng global PAT ngày 2026-12-01; với CI mới, dùng secure automated publishing bằng Microsoft Entra ID.
Giữ publisher và name khi cập nhật; tăng version nếu version đã tồn tại.

## Open VSX (tùy chọn)

Đăng nhập [Open VSX](https://open-vsx.org), hoàn thành publisher agreement, tạo access token và có quyền namespace `saolabs`.
Truyền token qua biến môi trường `OVSX_PAT`, không lưu trong repo.
Chỉ tạo namespace nếu chưa tồn tại và tài khoản có quyền:

```bash
npx ovsx create-namespace saolabs
npx ovsx publish /tmp/saola-language-support.vsix
```

Hai kho có quyền và lịch sử version riêng; kiểm tra kết quả ở cả hai khi phát hành.

## Version và Git

```bash
npm version 1.17.1 --no-git-tag-version # ví dụ; kiểm tra version chưa tồn tại
npm test
npm run build
npx --package @vscode/vsce vsce package --out /tmp/saola-language-support.vsix
git add package.json package-lock.json dist/extension.js dist/extension.js.map
git commit -m "chore: release extension"
git tag -a v1.17.1 -m "Release extension 1.17.1"
git push origin HEAD
git push origin v1.17.1
```

Upload VSIX sau các bước trên. Không publish extension này như npm library.

Nguồn: [VS Code publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [Open VSX publishing](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions).

## Dependency của công cụ phát hành

`typescript-estree` 6.21 pin minimatch 9.0.3 có advisory. Override hiện giữ cùng major 9 và chọn bản vá từ 9.0.7. esbuild được nâng lên 0.28.2; test, build và VSIX đã kiểm lại. Gỡ override khi nâng parser lên bản dùng minimatch an toàn.
