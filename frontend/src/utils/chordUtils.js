// Chord utility functions - Complete mapping for both major and minor keys
export const chordMapping = {
  // Major keys (I, ii, iii, IV, V, vi, vii°)
  'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
  'C#': ['C#', 'D#m', 'E#m', 'F#', 'G#', 'A#m', 'B#dim'],
  'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
  'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'],
  'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
  'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
  'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'],
  'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
  'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'],
  'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
  'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'],
  'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'],
  
  // Minor keys (i, ii°, III, iv, v, VI, VII)
  'Am': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
  'A#m': ['A#m', 'B#dim', 'C#', 'D#m', 'E#m', 'F#', 'G#'],
  'Bm': ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A'],
  'Cm': ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb'],
  'C#m': ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B'],
  'Dm': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C'],
  'D#m': ['D#m', 'E#dim', 'F#', 'G#m', 'A#m', 'B', 'C#'],
  'Em': ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
  'Fm': ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb'],
  'F#m': ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E'],
  'Gm': ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F'],
  'G#m': ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#']
};

// Parse lyrics to separate chords from text
export const parseLyrics = (lyricText) => {
  if (!lyricText) return [];
  
  const lines = lyricText.split('\r\n').filter(line => line.trim());
  const parsedLines = [];
  
  lines.forEach(line => {
    // Enhanced section markers recognition
    if (line.match(/^\[(1|2|3|4|5|6|verse|chorus|pre-chorus|bridge|end|ending|outro|intro|hook|interlude|coda|tag|vamp|solo|instrumental|break|refrain|prechorus|postchorus)\]$/i)) {
      parsedLines.push({
        type: 'section',
        content: line.replace(/[\[\]]/g, ''),
        chords: [],
        text: ''
      });
      return;
    }
    
    // Parse chord lines - Enhanced pattern for complex chords
    const chordPattern = /\[([A-G][#b]?(?:\/[A-G][#b]?)?(?:m|maj|min|dim|aug|sus[24]?|add[0-9]+|[0-9]+)*)\]/g;
    const chords = [];
    const textParts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = chordPattern.exec(line)) !== null) {
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
  if (!chord || fromKey === toKey) return chord;
  
  // Extract root note and modifiers (m, 7, sus, etc.)
  const chordMatch = chord.match(/^([A-G][#b]?(?:m|dim|aug)?)(.*)/);
  if (!chordMatch) return chord;
  
  const [, baseChord, modifier] = chordMatch;
  
  // Use the same chromatic order as getAvailableKeys (with flats)
  const chromaticKeys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  // Helper function to normalize sharp/flat equivalents for lookup
  const normalizeKeyForLookup = (key) => {
    const equivalents = {
      // Sharp to flat (normalize to flat for consistency)
      'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
      'C#m': 'Dbm', 'D#m': 'Ebm', 'F#m': 'Gbm', 'G#m': 'Abm', 'A#m': 'Bbm'
    };
    return equivalents[key] || key;
  };
  
  // Helper function to determine if we should output sharp or flat
  const shouldUseSharp = (originalKey, targetKey) => {
    // If target key already uses sharp, keep it sharp
    if (targetKey.includes('#')) return true;
    // If original key uses sharp, prefer sharp
    if (originalKey.includes('#')) return true;
    // Default to flat for easier reading
    return false;
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
  
  // Determine output format preference
  const useSharp = shouldUseSharp(fromKey, toKey);
  
  // Helper function to transpose a single note
  const transposeNote = (note) => {
    const normalizedNote = normalizeKeyForLookup(note);
    const noteIndex = chromaticKeys.indexOf(normalizedNote);
    if (noteIndex === -1) return note;
    
    let newIndex = (noteIndex + semitoneShift) % 12;
    let newNote = chromaticKeys[newIndex];
    
    // Convert to sharp or flat based on preference
    if (useSharp && ['Eb', 'Ab', 'Bb', 'Db', 'Gb'].includes(newNote)) {
      const sharpEquivalents = {
        'Eb': 'D#', 'Ab': 'G#', 'Bb': 'A#', 'Db': 'C#', 'Gb': 'F#'
      };
      newNote = sharpEquivalents[newNote];
    }
    
    return newNote;
  };
  
  // Determine if chord is minor, major, or other
  let transposedChord;
  
  if (baseChord.endsWith('m') && !baseChord.endsWith('dim')) {
    // Minor chord
    const rootNote = baseChord.replace('m', '');
    const newRoot = transposeNote(rootNote);
    transposedChord = newRoot + 'm' + modifier;
  } else if (baseChord.endsWith('dim')) {
    // Diminished chord
    const rootNote = baseChord.replace('dim', '');
    const newRoot = transposeNote(rootNote);
    transposedChord = newRoot + 'dim' + modifier;
  } else if (baseChord.endsWith('aug')) {
    // Augmented chord
    const rootNote = baseChord.replace('aug', '');
    const newRoot = transposeNote(rootNote);
    transposedChord = newRoot + 'aug' + modifier;
  } else {
    // Major chord
    const newRoot = transposeNote(baseChord);
    transposedChord = newRoot + modifier;
  }
  
  // Handle slash chords (e.g., C/E -> C#/F)
  const slashMatch = modifier.match(/^(.*)\/([A-G][#b]?)(.*)$/);
  if (slashMatch) {
    const beforeSlash = slashMatch[1];
    const bassNote = slashMatch[2];
    const afterBass = slashMatch[3];
    
    const newBassNote = transposeNote(bassNote);
    const transposedRoot = transposedChord.replace(modifier, '');
    transposedChord = transposedRoot + beforeSlash + '/' + newBassNote + afterBass;
  }
  
  return transposedChord;
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