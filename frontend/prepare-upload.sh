#!/bin/bash

echo "📦 Chuẩn bị files để upload lên cPanel (Static Website)..."

# Tạo thư mục tạm để chuẩn bị files
rm -rf cpanel-upload
mkdir cpanel-upload

# Copy toàn bộ build folder
echo "📁 Copy build files..."
cp -r build/* cpanel-upload/

# Copy .htaccess để hỗ trợ React Router (nếu có)
if [ -f .htaccess ]; then
    cp .htaccess cpanel-upload/
fi

# Tạo file zip từ nội dung bên trong thư mục cpanel-upload
echo "🗜️  Đang nén files..."
cd cpanel-upload
zip -r ../bannhac-website.zip . -q
cd ..

# Xóa thư mục tạm
rm -rf cpanel-upload

# Hiển thị kích thước file
file_size=$(ls -lh bannhac-website.zip | awk '{print $5}')
echo "✅ File zip đã sẵn sàng: bannhac-website.zip ($file_size)"
echo ""
echo "🚀 Các bước tiếp theo:"
echo "1. Upload file 'bannhac-website.zip' lên cPanel"
echo "2. Đăng nhập cPanel → File Manager"
echo "3. Vào thư mục 'public_html'"
echo "4. Upload file 'bannhac-website.zip'"
echo "5. Click chuột phải vào file zip → Extract"
echo "6. Xóa file zip sau khi giải nén"
echo "7. Truy cập domain của bạn để xem kết quả"
echo ""
echo "⚠️  Lưu ý: Đảm bảo cPanel hỗ trợ .htaccess cho Apache"
echo ""
echo "📄 File zip chứa:"
unzip -l bannhac-website.zip | head -20
