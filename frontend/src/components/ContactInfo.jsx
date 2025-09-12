import React from 'react';
import { MessageSquare, Music } from 'lucide-react';
import { Button } from './ui/button';

const ContactInfo = ({ className = '' }) => {
  const zaloInfo = {
    phoneNumber: '0935631103',
    displayName: 'Zalo: 0935631103',
    message: 'Yêu cầu bài hát thiếu'
  };

  const handleContactZalo = () => {
    // Mở Zalo với số điện thoại (web hoặc app)
    const zaloUrl = `https://zalo.me/${zaloInfo.phoneNumber}`;
    window.open(zaloUrl, '_blank');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-500">Thiếu bài hát?</span>
      <Button
        onClick={handleContactZalo}
        variant="ghost"
        size="sm"
        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 h-7"
        title={zaloInfo.message}
      >
        <MessageSquare className="h-3 w-3" />
        <span className="text-xs font-medium">Zalo: {zaloInfo.phoneNumber}</span>
        <Music className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default ContactInfo;
