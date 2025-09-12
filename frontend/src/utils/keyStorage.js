// Utility for handling song keys storage
// Use URL for small keys, sessionStorage for larger keys

const MAX_URL_LENGTH = 100; // Very conservative limit to force sessionStorage usage

export const storeKeys = (keys) => {
  if (!keys || Object.keys(keys).length === 0) {
    return '';
  }

  try {
    const keysJson = JSON.stringify(keys);
    const encodedKeys = encodeURIComponent(keysJson);
    
    // If encoded string is too long, store in sessionStorage
    if (encodedKeys.length > MAX_URL_LENGTH) {
      const storageKey = `songKeys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(storageKey, keysJson);
      return `storage:${storageKey}`;
    }
    
    return encodedKeys;
  } catch (error) {
    return '';
  }
};

export const retrieveKeys = (keysParam) => {
  if (!keysParam) {
    return {};
  }

  try {
    // Check if it's a storage reference
    if (keysParam.startsWith('storage:')) {
      const storageKey = keysParam.replace('storage:', '');
      const storedKeys = sessionStorage.getItem(storageKey);
      
      if (!storedKeys) {
        return {};
      }
      
      const parsed = JSON.parse(storedKeys);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
    
    // Check if it's already a valid JSON string (partially decoded by browser)
    if (keysParam.startsWith('{') && keysParam.endsWith('}')) {
      try {
        const parsed = JSON.parse(keysParam);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (directParseError) {
        // Fall through to URL decode approach
      }
    }
    
    // Regular URL-encoded keys
    const decoded = decodeURIComponent(keysParam);
    
    // Additional safety checks for valid JSON format
    if (!decoded || decoded.trim() === '') {
      return {};
    }
    
    // Check if JSON is properly formed
    if (!decoded.startsWith('{') || !decoded.endsWith('}')) {
      // Try to fix common truncation issues
      let fixedJson = decoded;
      if (decoded.startsWith('{') && !decoded.endsWith('}')) {
        // Strategy 1: If ends with incomplete string, try to close it
        if (decoded.endsWith('"') || decoded.match(/:"[^"]*$/)) {
          // Ends with incomplete value, close the string and object
          fixedJson = decoded + '"}';
        } else if (decoded.match(/:\s*$/)) {
          // Ends with colon, likely missing value
          fixedJson = decoded + '""}';
        } else {
          // General case: just close the object
          fixedJson = decoded + '}';
        }
        
        try {
          const parsed = JSON.parse(fixedJson);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        } catch (fixError) {
          // Last resort: try to extract song IDs and provide default keys
          const songIdMatches = decoded.match(/"(\d+)":/g);
          if (songIdMatches) {
            const result = {};
            songIdMatches.forEach(match => {
              const songId = match.replace(/[":]/g, '');
              result[songId] = 'C'; // Default key
            });
            return result;
          }
        }
      }
      return {};
    }
    
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

export const cleanupOldKeys = () => {
  // Clean up old storage keys (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('songKeys_')) {
      const timestamp = parseInt(key.split('_')[1]);
      if (timestamp < oneHourAgo) {
        sessionStorage.removeItem(key);
      }
    }
  }
};
