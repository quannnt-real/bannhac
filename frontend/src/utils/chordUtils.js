// Chord utility functions
export const chordMapping = {
  'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'C#': ['C#', 'D#', 'F', 'F#', 'G#', 'A#', 'C'],
  'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'F'],
  'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#']
};

// Parse lyrics to separate chords from text
export const parseLyrics = (lyricText) => {
  if (!lyricText) return [];
  
  const lines = lyricText.split('\r\n').filter(line => line.trim());
  const parsedLines = [];
  
  lines.forEach(line => {
    // Skip section markers like [1], [chorus], [pre-chorus], etc.
    if (line.match(/^\[(1|2|3|chorus|pre-chorus|bridge|end|verse|outro|intro)\]$/i)) {
      parsedLines.push({
        type: 'section',
        content: line.replace(/[\[\]]/g, '').toUpperCase(),
        chords: [],
        text: ''
      });
      return;
    }
    
    // Parse chord lines
    const chordPattern = /\[([A-G][#b]?[m]?[0-9]*[sus|dim|aug|maj|min]*[0-9]*)\]/g;
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

// Transpose chord to new key
export const transposeChord = (chord, fromKey, toKey) => {
  const fromIndex = Object.keys(chordMapping).indexOf(fromKey);
  const toIndex = Object.keys(chordMapping).indexOf(toKey);
  
  if (fromIndex === -1 || toIndex === -1) return chord;
  
  const semitoneShift = toIndex - fromIndex;
  const chordKeys = Object.keys(chordMapping);
  
  // Extract base chord and modifiers
  const chordMatch = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!chordMatch) return chord;
  
  const baseChord = chordMatch[1];
  const modifier = chordMatch[2];
  
  const baseIndex = chordKeys.indexOf(baseChord);
  if (baseIndex === -1) return chord;
  
  let newIndex = (baseIndex + semitoneShift) % 12;
  if (newIndex < 0) newIndex += 12;
  
  return chordKeys[newIndex] + modifier;
};

// Get all available keys for transposition
export const getAvailableKeys = () => Object.keys(chordMapping);