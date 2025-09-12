// Parse lyrics to separate chords from text
export const parseLyrics = (lyricText) => {
  if (!lyricText) return [];
  
  const lines = lyricText.split('\r\n').filter(line => line.trim());
  const parsedLines = [];
  
  lines.forEach(line => {
    // Enhanced section markers recognition - support numbers, named sections, and "name number" patterns
    if (line.match(/^\[(\d+|verse|chorus|pre-chorus|bridge|end|ending|outro|intro|hook|interlude|coda|tag|vamp|solo|instrumental|break|refrain|prechorus|postchorus|verse \d+|chorus \d+|bridge \d+|intro \d+|outro \d+|pre-chorus \d+|prechorus \d+|postchorus \d+)\]$/i)) {
      let sectionContent = line.replace(/[\[\]]/g, '');
      
      // Convert numbers to "Verse: X"
      if (/^\d+$/.test(sectionContent)) {
        sectionContent = `Verse: ${sectionContent}`;
      }
      // Convert "section name number" to "Section Name: number"
      else if (/^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|postchorus) (\d+)$/i.test(sectionContent)) {
        sectionContent = sectionContent.replace(/^(verse|chorus|bridge|intro|outro|pre-chorus|prechorus|postchorus) (\d+)$/i, (match, sectionName, number) => {
          // Capitalize first letter and add colon
          const capitalizedSection = sectionName.charAt(0).toUpperCase() + sectionName.slice(1).toLowerCase();
          return `${capitalizedSection}: ${number}`;
        });
      }
      
      parsedLines.push({
        type: 'section',
        content: sectionContent,
        chords: [],
        text: ''
      });
      return;
    }
    
    // Check for inline chords pattern: `[chord] [chord]`
    const inlineChordPattern = /`([^`]+)`/g;
    const inlineMatch = line.match(inlineChordPattern);
    
    if (inlineMatch) {
      // Extract inline chords from backtick pattern
      const inlineChordsText = inlineMatch[0].slice(1, -1); // Remove backticks
      // FIXED: Moved slash part AFTER quality part to properly handle chords like D7/F#
      // FIXED: Moved parentheses BEFORE slash part to handle chords like Am7(b5)/C
      const chordPattern = /\[\s*([A-G][#b]?(?:(?:mMaj|maj|Maj|mmaj|mM|m(?!aj)|min|dim|aug|sus[24]?|add[0-9]+|M|alt|ø|o|\+|°|Δ|φ|\\|_|power|pow)[0-9]*(?:[#b][0-9]+)*|[0-9]+(?:[#b][0-9]+)*|[#b][0-9]+)*(?:\([^)]*\))?(?:\/[A-G][#b]?)?)\s*\]/g;
      const inlineChords = [];
      let match;
      
      while ((match = chordPattern.exec(inlineChordsText)) !== null) {
        inlineChords.push(match[1]);
      }
      
      // Create inline chord line
      const textWithoutBackticks = line.replace(inlineChordPattern, '').trim();
      parsedLines.push({
        type: 'inline-chords',
        content: line,
        chords: inlineChords,
        text: textWithoutBackticks,
        inlineChordText: inlineChordsText
      });
      return;
    }
    
    // Parse chord lines - Ultra comprehensive pattern for ALL possible chord types
    // Includes: Major, minor, 7th, maj7, mMaj7, sus, add, dim, aug, power chords, altered, etc.
    // FIXED: Moved slash part AFTER quality part to properly handle chords like D7/F#
    // FIXED: Moved parentheses BEFORE slash part to handle chords like Am7(b5)/C
    const chordPattern = /\[\s*([A-G][#b]?(?:(?:mMaj|maj|Maj|mmaj|mM|m(?!aj)|min|dim|aug|sus[24]?|add[0-9]+|M|alt|ø|o|\+|°|Δ|φ|\\|_|power|pow)[0-9]*(?:[#b][0-9]+)*|[0-9]+(?:[#b][0-9]+)*|[#b][0-9]+)*(?:\([^)]*\))?(?:\/[A-G][#b]?)?)\s*\]/g;
    const chords = [];
    const textParts = [];
    let lastIndex = 0;
    let match;
    let iterations = 0; // Safety counter to prevent infinite loops
    const maxIterations = 1000; // Reasonable limit
    
    // Reset regex lastIndex to ensure clean start
    chordPattern.lastIndex = 0;
    
    while ((match = chordPattern.exec(line)) !== null && iterations < maxIterations) {
      iterations++;
      
      // Add text before chord
      if (match.index > lastIndex) {
        textParts.push(line.substring(lastIndex, match.index));
      }
      
      // Add chord
      chords.push({
        chord: match[1],
        position: textParts.join('').length
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      textParts.push(line.substring(lastIndex));
    }
    
    const text = textParts.join('');
    
    if (text.trim() || chords.length > 0) {
      parsedLines.push({
        type: 'lyric',
        content: line,
        chords: chords,
        text: text.trim()
      });
    }
  });
  
  return parsedLines;
};

// Enhanced transpose function to handle both major and minor chords
export const transposeChord = (chord, fromKey, toKey) => {
  // Add safety checks
  if (!chord || !fromKey || !toKey || typeof chord !== 'string') {
    return chord;
  }
  if (fromKey === toKey) return chord;
  
  try {
    // Ultra comprehensive pattern for ALL chord types - UPDATED to match parseLyrics pattern
    // FIXED: Now handles 7alt, CMaj7, CmMaj7, slash chords, and parentheses correctly
    const chordMatch = chord.match(/^([A-G][#b]?)((?:(?:mMaj|maj|Maj|mmaj|mM|m(?!aj)|min|dim|aug|sus[24]?|add[0-9]+|M|alt|ø|o|\+|°|Δ|φ|\\|_|power|pow)[0-9]*(?:[#b][0-9]+)*|[0-9]+(?:[#b][0-9]+)*|[#b][0-9]+)*)(\([^)]*\))?(\/[A-G][#b]?)?$/);
    if (!chordMatch) {
      return chord;
    }
    
    const [, rootNote, quality, parentheses, slashPart] = chordMatch;
    const safeQuality = quality || ''; // Quality part (7, maj7, m7, etc.)
    const safeParentheses = parentheses || ''; // Parentheses part ((b5), (#11), etc.)
    const safeSlashPart = slashPart || ''; // Slash part (/F#, /C, etc.)
    const modifier = safeQuality + safeParentheses + safeSlashPart; // Recombine all modifiers
    
    // Use the same chromatic order as getAvailableKeys (with flats)
    const chromaticKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    // Helper function to normalize sharp/flat equivalents for lookup
    const normalizeKeyForLookup = (key) => {
      if (!key) return '';
      const equivalents = {
        // Sharp to flat (normalize to flat for consistency)
        'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
        'C#m': 'Dbm', 'D#m': 'Ebm', 'F#m': 'Gbm', 'G#m': 'Abm', 'A#m': 'Bbm'
      };
      return equivalents[key] || key;
    };
    
    // Define scales to determine which accidentals to use
    const keyScales = {
      // Major scales
      'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
      'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
      'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
      'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
      'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
      'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
      'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
      'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
      'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
      'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
      'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
      
      // Natural minor scales
      'Am': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      'Bbm': ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
      'Bm': ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
      'Cm': ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
      'Dbm': ['Db', 'Eb', 'E', 'Gb', 'Ab', 'A', 'B'],
      'Dm': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
      'Ebm': ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'B', 'Db'],
      'Em': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
      'Fm': ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
      'Gbm': ['Gb', 'Ab', 'A', 'B', 'Db', 'D', 'E'],
      'Gm': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
      'Abm': ['Ab', 'Bb', 'B', 'Db', 'Eb', 'E', 'Gb'],
      
      // Additional enharmonic equivalents for sharp keys
      'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
      'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
      'C#m': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
      'D#m': ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'],
      'F#m': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
      'G#m': ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
      'A#m': ['A#', 'B#', 'C#', 'D#', 'E#', 'F#', 'G#']
    };
    
    // Helper function to determine correct accidental based on target key AND original preference
    const getCorrectAccidental = (note, targetKey, originalNote = null) => {
      const targetScale = keyScales[targetKey];
      if (!targetScale) return note;
      
      // ENHANCEMENT: Preserve original accidental preference when possible
      if (originalNote) {
        const originalIsSharp = originalNote.includes('#');
        const originalIsFlat = originalNote.includes('b');
        
        // If original used sharps, prefer sharp equivalents
        // If original used flats, prefer flat equivalents
        const enharmonicEquivalents = {
          'Db': 'C#', 'C#': 'Db',
          'Eb': 'D#', 'D#': 'Eb', 
          'Gb': 'F#', 'F#': 'Gb',
          'Ab': 'G#', 'G#': 'Ab',
          'Bb': 'A#', 'A#': 'Bb'
        };
        
        // Try to maintain preference first
        if (originalIsSharp && note.includes('b')) {
          const sharpEquiv = enharmonicEquivalents[note];
          if (sharpEquiv && sharpEquiv.includes('#')) {
            return sharpEquiv;
          }
        } else if (originalIsFlat && note.includes('#')) {
          const flatEquiv = enharmonicEquivalents[note];
          if (flatEquiv && flatEquiv.includes('b')) {
            return flatEquiv;
          }
        }
      }
      
      // Original logic: Check if the note (or its enharmonic equivalent) exists in the target scale
      const enharmonicEquivalents = {
        'Db': 'C#', 'C#': 'Db',
        'Eb': 'D#', 'D#': 'Eb', 
        'Gb': 'F#', 'F#': 'Gb',
        'Ab': 'G#', 'G#': 'Ab',
        'Bb': 'A#', 'A#': 'Bb'
      };
      
      // First, check if the note itself is in the scale
      if (targetScale.includes(note)) {
        return note;
      }
      
      // If not, check the enharmonic equivalent
      const enharmonic = enharmonicEquivalents[note];
      if (enharmonic && targetScale.includes(enharmonic)) {
        return enharmonic;
      }
      
      // If neither is in the scale, return the note as is
      return note;
    };
    
    // Calculate semitone shift between keys (only using root notes)
    const fromKeyRoot = normalizeKeyForLookup(fromKey.replace(/m$/, '')); // Remove 'm' if minor and normalize
    const toKeyRoot = normalizeKeyForLookup(toKey.replace(/m$/, '')); // Remove 'm' if minor and normalize
    
    const fromIndex = chromaticKeys.indexOf(fromKeyRoot);
    const toIndex = chromaticKeys.indexOf(toKeyRoot);
    
    if (fromIndex === -1 || toIndex === -1) return chord;
    
    // Calculate semitone difference
    let semitoneShift = toIndex - fromIndex;
    if (semitoneShift < 0) semitoneShift += 12;
    
    // Helper function to transpose a single note with preference preservation
    const transposeNote = (note, originalNote = null) => {
      const normalizedNote = normalizeKeyForLookup(note);
      const noteIndex = chromaticKeys.indexOf(normalizedNote);
      if (noteIndex === -1) return note;
      
      let newIndex = (noteIndex + semitoneShift) % 12;
      let transposedNote = chromaticKeys[newIndex];
      
      // Apply correct accidental based on target key's scale AND preserve original preference
      return getCorrectAccidental(transposedNote, toKey, originalNote);
    };
    
    // Determine chord type and transpose accordingly (order matters!)
    let transposedChord;
    
    // Transpose the root note (preserve original preference)
    const newRoot = transposeNote(rootNote, rootNote);
    
    // Reconstruct the chord with transposed root
    transposedChord = newRoot + safeQuality + safeParentheses;
    
    // Handle slash chords separately (preserve bass note preference)
    if (safeSlashPart) {
      const bassNote = safeSlashPart.substring(1); // Remove the '/' to get bass note
      const newBassNote = transposeNote(bassNote, bassNote);
      transposedChord = transposedChord + '/' + newBassNote;
    }
    
    return transposedChord;
  } catch (error) {
    return chord; // Return original chord if error occurs
  }
};

// Get available keys for transposition based on original key type
export const getAvailableKeys = (originalKey = null) => {
  // Standard chromatic order (semitones) - using flats for better readability when going down
  const majorKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const minorKeys = ['Am', 'Bbm', 'Bm', 'Cm', 'Dbm', 'Dm', 'Ebm', 'Em', 'Fm', 'Gbm', 'Gm', 'Abm'];
  
  // If originalKey is provided, return only keys of the same type
  if (originalKey) {
    const isOriginalMinor = originalKey.includes('m');
    
    if (isOriginalMinor) {
      // Return minor keys in chromatic order starting from Am
      return minorKeys;
    } else {
      // Return major keys in chromatic order starting from C
      return majorKeys;
    }
  }
  
  // Fallback: return all keys (for backward compatibility)
  return [...majorKeys, ...minorKeys];
};

// Get the next key (for transpose up)
export const getNextKey = (currentKey, availableKeys) => {
  if (!currentKey || typeof currentKey !== 'string') return 'C';
  
  const keys = availableKeys || getAvailableKeys(currentKey);
  if (!keys || keys.length === 0) return currentKey;
  
  // Normalize keys for comparison (handle enharmonic equivalents)
  const normalizeKeyForComparison = (key) => {
    if (!key) return '';
    const enharmonicMap = {
      'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
      'C#m': 'Dbm', 'D#m': 'Ebm', 'F#m': 'Gbm', 'G#m': 'Abm', 'A#m': 'Bbm'
    };
    return enharmonicMap[key] || key;
  };
  
  const currentIndex = keys.findIndex(key => 
    normalizeKeyForComparison(key) === normalizeKeyForComparison(currentKey)
  );
  
  if (currentIndex === -1) return currentKey; // Key not found, return original
  
  const nextIndex = (currentIndex + 1) % keys.length;
  let nextKey = keys[nextIndex];
  
  // Convert to sharp notation when going up
  const sharpEquivalents = {
    'Ebm': 'D#m', 'Abm': 'G#m', 'Bbm': 'A#m',
    'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#',
    'Dbm': 'C#m', 'Gbm': 'F#m',
    'Db': 'C#', 'Gb': 'F#'
  };
  
  return sharpEquivalents[nextKey] || nextKey;
};

// Get the previous key (for transpose down)  
export const getPrevKey = (currentKey, availableKeys) => {
  if (!currentKey || typeof currentKey !== 'string') return 'C';
  
  const keys = availableKeys || getAvailableKeys(currentKey);
  if (!keys || keys.length === 0) return currentKey;
  
  // Normalize keys for comparison (handle enharmonic equivalents)
  const normalizeKeyForComparison = (key) => {
    if (!key) return '';
    const enharmonicMap = {
      'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
      'C#m': 'Dbm', 'D#m': 'Ebm', 'F#m': 'Gbm', 'G#m': 'Abm', 'A#m': 'Bbm'
    };
    return enharmonicMap[key] || key;
  };
  
  const currentIndex = keys.findIndex(key => 
    normalizeKeyForComparison(key) === normalizeKeyForComparison(currentKey)
  );
  
  if (currentIndex === -1) return currentKey; // Key not found, return original
  
  const prevIndex = currentIndex === 0 ? keys.length - 1 : currentIndex - 1;
  return keys[prevIndex]; // Keep flat notation when going down
};

// Get the next whole tone key (for transpose up by 1 whole tone = 2 semitones)
export const getNextWholeToneKey = (currentKey, availableKeys) => {
  if (!currentKey || typeof currentKey !== 'string') return 'C';
  
  const keys = availableKeys || getAvailableKeys(currentKey);
  if (!keys || keys.length === 0) return currentKey;
  
  // Normalize keys for comparison (handle enharmonic equivalents)
  const normalizeKeyForComparison = (key) => {
    if (!key) return '';
    const enharmonicMap = {
      'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
      'C#m': 'Dbm', 'D#m': 'Ebm', 'F#m': 'Gbm', 'G#m': 'Abm', 'A#m': 'Bbm'
    };
    return enharmonicMap[key] || key;
  };
  
  const currentIndex = keys.findIndex(key => 
    normalizeKeyForComparison(key) === normalizeKeyForComparison(currentKey)
  );
  
  if (currentIndex === -1) return currentKey; // Key not found, return original
  
  // Move up by 2 semitones (1 whole tone)
  const nextIndex = (currentIndex + 2) % keys.length;
  let nextKey = keys[nextIndex];
  
  // Convert to sharp notation when going up
  const sharpEquivalents = {
    'Ebm': 'D#m', 'Abm': 'G#m', 'Bbm': 'A#m',
    'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#',
    'Dbm': 'C#m', 'Gbm': 'F#m',
    'Db': 'C#', 'Gb': 'F#'
  };
  
  return sharpEquivalents[nextKey] || nextKey;
};

// Get the previous whole tone key (for transpose down by 1 whole tone = 2 semitones)  
export const getPrevWholeToneKey = (currentKey, availableKeys) => {
  if (!currentKey || typeof currentKey !== 'string') return 'C';
  
  const keys = availableKeys || getAvailableKeys(currentKey);
  if (!keys || keys.length === 0) return currentKey;
  
  // Normalize keys for comparison (handle enharmonic equivalents)
  const normalizeKeyForComparison = (key) => {
    if (!key) return '';
    const enharmonicMap = {
      'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
      'C#m': 'Dbm', 'D#m': 'Ebm', 'F#m': 'Gbm', 'G#m': 'Abm', 'A#m': 'Bbm'
    };
    return enharmonicMap[key] || key;
  };
  
  const currentIndex = keys.findIndex(key => 
    normalizeKeyForComparison(key) === normalizeKeyForComparison(currentKey)
  );
  
  if (currentIndex === -1) return currentKey; // Key not found, return original
  
  // Move down by 2 semitones (1 whole tone)
  const prevIndex = currentIndex >= 2 ? currentIndex - 2 : currentIndex - 2 + keys.length;
  return keys[prevIndex]; // Keep flat notation when going down
};