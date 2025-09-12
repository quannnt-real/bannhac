import React, { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Share2, Check, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import DonateInfo from './DonateInfo';

const QRCodeWithLogo = ({ value, size = 200, logoSrc = "/Logo_app.png" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const generateQR = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Generate QR code to canvas
      await QRCode.toCanvas(canvas, value, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for logo overlay
      });

      // Add logo overlay
      const ctx = canvas.getContext('2d');
      const logo = new Image();
      
      logo.onload = () => {
        // Logo with custom dimensions (84x48px ratio)
        const logoWidth = 84;
        const logoHeight = 48;
        const x = (size - logoWidth) / 2;
        const y = (size - logoHeight) / 2;
        
        // Draw white background for logo with padding
        const padding = 6;
        ctx.fillStyle = 'white';
        ctx.fillRect(x - padding, y - padding, logoWidth + (padding * 2), logoHeight + (padding * 2));
        
        // Optional: Draw border around logo background
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - padding, y - padding, logoWidth + (padding * 2), logoHeight + (padding * 2));
        
        // Draw logo with correct dimensions (preserving aspect ratio)
        ctx.drawImage(logo, x, y, logoWidth, logoHeight);
      };
      
      logo.crossOrigin = 'anonymous';
      logo.src = logoSrc;
    };

    if (value) {
      generateQR();
    }
  }, [value, size, logoSrc]);

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

const SharePanel = ({ isOpen, onClose, shareUrl, title = "Chia sẻ Playlist", onUpdateShareUrl }) => {
  const [copied, setCopied] = useState(false);
  const [pwaCodeCopied, setPwaCodeCopied] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today's date
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [currentShareUrl, setCurrentShareUrl] = useState(shareUrl);
  const [pwaCode, setPwaCode] = useState('');
  const qrCodeRef = useRef(null);

  // Helper function to create pretty URLs without unnecessary encoding
  const prettifyUrl = (url) => {
    if (!url) return url;
    return url
      .replace(/%2C/g, ',')
      .replace(/%7B/g, '{')
      .replace(/%7D/g, '}')
      .replace(/%22/g, '"')
      .replace(/%3A/g, ':');
  };

  // Helper function to extract PWA code from URL
  const extractPwaCode = (url) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // Extract all parameters except the domain and path
      const codeParams = [];
      
      // Add songs parameter
      if (params.get('songs')) {
        codeParams.push(`songs=${params.get('songs')}`);
      }
      
      // Add keys parameter if exists
      if (params.get('keys')) {
        codeParams.push(`keys=${params.get('keys')}`);
      }
      
      // Add date parameter if exists  
      if (params.get('date')) {
        codeParams.push(`date=${params.get('date')}`);
      }
      
      return codeParams.join('&');
    } catch (error) {
      return '';
    }
  };

  // Update share URL when date changes
  useEffect(() => {
    if (selectedDate && shareUrl) {
      const url = new URL(shareUrl, window.location.origin);
      url.searchParams.set('date', selectedDate);
      
      // Create pretty URL - avoid encoding basic characters
      const newShareUrl = prettifyUrl(url.toString());
      
      setCurrentShareUrl(newShareUrl);
      setPwaCode(extractPwaCode(newShareUrl));
      
      // Notify parent component about URL update
      if (onUpdateShareUrl) {
        onUpdateShareUrl(newShareUrl);
      }
    }
  }, [selectedDate, shareUrl]); // Removed onUpdateShareUrl from dependencies

  // Reset to original URL and today's date when panel opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      
      // Ensure the share URL is pretty formatted
      const prettyShareUrl = prettifyUrl(shareUrl);
      setCurrentShareUrl(prettyShareUrl);
      setPwaCode(extractPwaCode(prettyShareUrl));
    }
  }, [isOpen, shareUrl]);

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('vi-VN', options);
  };

  const getShareTitle = () => {
    if (selectedDate) {
      const formattedDate = formatDateForDisplay(selectedDate);
      return `Danh sách bài hát thờ phượng ngày ${formattedDate}`;
    }
    return title;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentShareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyPwaCode = async () => {
    try {
      await navigator.clipboard.writeText(pwaCode);
      setPwaCodeCopied(true);
      setTimeout(() => setPwaCodeCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = pwaCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setPwaCodeCopied(true);
      setTimeout(() => setPwaCodeCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-4">
          {/* Header - Compact */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-red-100 rounded-full p-1.5">
                <Share2 className="h-4 w-4 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Picker - Mobile-optimized */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Ngày thờ phượng
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                style={{
                  colorScheme: 'light',
                  WebkitAppearance: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {selectedDate && (
              <div className="mt-1 text-xs text-gray-500 px-1">
                {formatDateForDisplay(selectedDate)}
              </div>
            )}
          </div>

          {/* Compact 2-column layout */}
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* QR Code - Larger and centered */}
            <div className="flex justify-center">
              <div 
                ref={qrCodeRef}
                className="bg-white p-4 rounded-lg shadow-inner border border-gray-200"
              >
                <QRCodeWithLogo
                  value={currentShareUrl}
                  size={240}
                />
              </div>
            </div>

            {/* Links section */}
            <div className="space-y-3">
              {/* PWA Code - Compact */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mã PWA
                </label>
                <div className="flex items-center gap-1">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-600 break-all max-h-12 overflow-y-auto">
                    {pwaCode}
                  </div>
                  <Button
                    onClick={handleCopyPwaCode}
                    size="sm"
                    className={`shrink-0 h-7 px-2 text-xs ${
                      pwaCodeCopied 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-orange-500 hover:bg-orange-600'
                    } text-white`}
                  >
                    {pwaCodeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {/* Share URL - Compact */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Link chia sẻ
                </label>
                <div className="flex items-center gap-1">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-600 break-all max-h-12 overflow-y-auto">
                    {currentShareUrl}
                  </div>
                  <Button
                    onClick={handleCopyLink}
                    size="sm"
                    className={`shrink-0 h-7 px-2 text-xs ${
                      copied 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    } text-white`}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Compact */}
          <div className="text-center border-t border-gray-100 pt-3">
            <div className="text-xs text-blue-800 font-medium mb-1">
              {getShareTitle()}
            </div>
            <p className="text-xs text-gray-500">
              My Heart Belong to Jesus
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Quét mã QR hoặc copy link/mã PWA để chia sẻ
            </p>
            
            {/* Donate Information */}
            <DonateInfo variant="compact" className="mt-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SharePanel;
