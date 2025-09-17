import React, { useState } from 'react';
import { Heart, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

const DonateInfo = ({ variant = 'default', className = '' }) => {
  const { copied: infoBankCopied, copyToClipboard: copyInfoBank } = useCopyToClipboard();
  
  // Thông tin donate - có thể thay đổi theo nhu cầu
  const donateInfo = {
    bankName: 'Tiên Phong Bank (TP Bank)',
    accountNumber: '0935631103',
    accountName: 'NGUYEN NGOC THIEN QUAN',
    message: 'Ủng hộ dự án Hợp Âm Thánh Ca'
  };


  const handleCopyAccountNumber = () => {
    copyInfoBank(donateInfo.accountNumber);
  }


  // Variant compact cho SharePanel footer
  if (variant === 'compact') {
    return (
      <div className={`text-center ${className}`}>
        <div className="flex items-center justify-center gap-1 mb-1">
          <Heart className="h-3 w-3 text-red-500" />
          <span className="text-xs text-gray-600 font-medium">Ủng hộ dự án</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">{donateInfo.bankName}:</span>
          <span className="text-xs font-mono text-blue-600">{donateInfo.accountNumber}</span>
          <Button
            onClick={handleCopyAccountNumber}
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-gray-100"
          >
            {infoBankCopied ? (
              <Check className="h-2.5 w-2.5 text-green-500" />
            ) : (
              <Copy className="h-2.5 w-2.5 text-gray-400" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Variant full cho OfflineManagerPanel
  return (
    <div className={`p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-100 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Heart className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium text-gray-700">Ủng hộ dự án</span>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Dự án phi lợi nhuận phục vụ cộng đồng Cơ đốc. Mọi đóng góp đều được trân trọng!
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Ngân hàng:</span>
          <span className="text-xs font-semibold text-gray-700">{donateInfo.bankName}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Số tài khoản:</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono font-semibold text-blue-600">
              {donateInfo.accountNumber}
            </span>
            <Button
              onClick={handleCopyAccountNumber}
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-white/50"
              title="Copy số tài khoản"
            >
              {infoBankCopied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-gray-500" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <span className="text-xs text-gray-500">Chủ TK:</span>
          <span className="text-xs font-semibold text-gray-700 text-right">
            {donateInfo.accountName}
          </span>
        </div>
        
        <div className="pt-1 border-t border-red-100">
          <p className="text-xs text-gray-500 italic">
            💝 {donateInfo.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DonateInfo;
