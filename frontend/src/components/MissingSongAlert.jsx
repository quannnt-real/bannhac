import React, { useState } from 'react';
import { AlertTriangle, Mail, MessageCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

const MissingSongAlert = ({ songId }) => {
  const [emailSent, setEmailSent] = useState(false);

  const sendErrorReport = () => {
    // Tạo nội dung email tự động với thông tin chi tiết
    const subject = encodeURIComponent(`[Báo lỗi] Bài hát ID ${songId} không tồn tại`);
    
    const body = encodeURIComponent(
      `Xin chào Admin,\n\n` +
      `Tôi đang cố gắng truy cập bài hát với ID: ${songId}\n` +
      `Nhưng hệ thống báo bài hát không tồn tại.\n\n` +
      `Thông tin chi tiết:\n` +
      `- ID bài hát: ${songId}\n` +
      `- URL hiện tại: ${window.location.href}\n` +
      `- Thời gian: ${new Date().toLocaleString('vi-VN')}\n` +
      `- Trình duyệt: ${navigator.userAgent}\n` +
      `- Kết nối: ${navigator.onLine ? 'Online' : 'Offline'}\n\n` +
      `Vui lòng kiểm tra và xử lý.\n\n` +
      `Trân trọng!`
    );
    
    // Mở email client với nội dung sẵn
    window.location.href = `mailto:quan.1991.nguyen@gmail.com?subject=${subject}&body=${body}`;
    
    // Hiển thị thông báo cảm ơn
    setEmailSent(true);
    
    // Reset sau 5 giây
    setTimeout(() => setEmailSent(false), 5000);
  };

  return (
    <Card className="border-orange-200 bg-orange-50 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-2">
              ⚠️ Bài hát ID {songId} không tồn tại
            </h3>
            <p className="text-sm text-orange-800 mb-3">
              Bài hát có thể đã bị xóa hoặc có lỗi hệ thống. 
              Vui lòng báo cho Admin để được hỗ trợ.
            </p>
            
            {emailSent ? (
              <Alert className="bg-green-50 border-green-200 mb-3">
                <AlertDescription className="text-green-800 text-sm">
                  ✅ Cảm ơn bạn đã báo lỗi! Chúng tôi sẽ xử lý sớm nhất có thể.
                </AlertDescription>
              </Alert>
            ) : (
              <Button 
                onClick={sendErrorReport}
                className="mb-3 w-full sm:w-auto"
                variant="default"
                size="sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                Gửi báo lỗi cho Admin
              </Button>
            )}
            
            <div className="text-sm text-gray-700 bg-white/50 rounded p-3 space-y-1.5">
              <p className="font-medium text-gray-800 mb-2">Hoặc liên hệ trực tiếp:</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📧 Email:</span>
                  <a 
                    href="mailto:quan.1991.nguyen@gmail.com" 
                    className="text-blue-600 hover:underline"
                  >
                    quan.1991.nguyen@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">💬 Zalo:</span>
                  <a 
                    href="https://zalo.me/0935631103" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline"
                  >
                    0935631103
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">📘 Facebook:</span>
                  <a 
                    href="https://facebook.com/tehillah.nguyen" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline"
                  >
                    Tehillah Nguyễn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MissingSongAlert;
