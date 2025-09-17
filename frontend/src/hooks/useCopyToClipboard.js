import { useState, useCallback } from 'react';

export const useCopyToClipboard = (resetTime = 2000) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetTime);
      return true;
    } catch (error) {
      // Fallback cho browser cũ
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), resetTime);
      return true;
    }
  }, [resetTime]);

  return { copied, copyToClipboard };
};