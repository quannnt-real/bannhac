#!/bin/bash

echo "📦 Chuẩn bị files để upload lên cPanel (Static Website)..."

# Tạo thư mục để upload
rm -rf cpanel-upload
mkdir cpanel-upload

# Copy toàn bộ build folder
echo "📁 Copy build files..."
cp -r build/* cpanel-upload/

# Copy .htaccess để hỗ trợ React Router
cp .htaccess cpanel-upload/

echo "✅ Files đã sẵn sàng trong thư mục 'cpanel-upload'"
echo ""
echo "🚀 Các bước tiếp theo:"
echo "1. Zip toàn bộ thư mục 'cpanel-upload' (hoặc upload từng file)"
echo "2. Đăng nhập cPanel → File Manager"
echo "3. Vào thư mục 'public_html'"
echo "4. Upload và giải nén (hoặc upload từng file)"
echo "5. Truy cập domain của bạn để xem kết quả"
echo ""
echo "⚠️  Lưu ý: Đảm bảo cPanel hỗ trợ .htaccess cho Apache"
