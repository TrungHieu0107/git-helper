export interface ConflictHunk {
  id: string;
  // line numbers are 1-based, matching Monaco's line system
  markerStartLine: number;   // line with <<<<<<<
  dividerLine: number;       // line with =======
  markerEndLine: number;     // line with >>>>>>>
  oursLines: [number, number];    // [startLine, endLine] inclusive, ours content
  theirsLines: [number, number];  // [startLine, endLine] inclusive, theirs content
  oursContent?: string;
  theirsContent?: string;
  fullMarkerText: string;    // The entire block from <<<<<<< to >>>>>>>
}

export interface ConflictSegment {
  id: string;
  type: 'common' | 'conflict';
  content?: string;
  ours?: string;
  theirs?: string;
  startLine?: number;
  endLine?: number;
}

export interface ParsedConflict {
  hunks: ConflictHunk[];
  oursContent: string;    // full text for left panel
  theirsContent: string;  // full text for right panel
  resultContent: string;  // full text for center panel (processed)
  mergedBase: string;     // the original raw content with markers
  displayBase: string;    // clean content with placeholders for result pane
  segments: ConflictSegment[];
}

export function parseConflictMarkers(raw: string): ParsedConflict {
  const lines = raw.split(/\r?\n/);
  
  let state: 'normal' | 'in_ours' | 'in_theirs' = 'normal';
  
  const hunks: ConflictHunk[] = [];
  let currentHunk: Partial<ConflictHunk> = {};
  let currentHunkLines: string[] = [];
  
  const oursLines: string[] = [];
  const theirsLines: string[] = [];
  const resultLines: string[] = [];
  const displayLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1; // 1-based
    
    if (state === 'normal') {
      if (line.startsWith('<<<<<<<')) {
        state = 'in_ours';
        currentHunkLines = [line];
        currentHunk = { 
          id: `hunk-${hunks.length}`,
          markerStartLine: lineNum, 
          oursLines: [lineNum + 1, lineNum],
          oursContent: "",
          theirsContent: ""
        };
        oursLines.push('');
        theirsLines.push('');
        resultLines.push('');
        displayLines.push(`<<<<<<< CONFLICT ${currentHunk.id} >>>>>>>`);
      } else {
        oursLines.push(line);
        theirsLines.push(line);
        resultLines.push(line);
        displayLines.push(line);
      }
    } else if (state === 'in_ours') {
      currentHunkLines.push(line);
      if (line.startsWith('=======')) {
        state = 'in_theirs';
        currentHunk.oursLines![1] = lineNum - 1;
        currentHunk.dividerLine = lineNum;
        currentHunk.theirsLines = [lineNum + 1, lineNum];
        oursLines.push('');
        theirsLines.push('');
        resultLines.push('');
        displayLines.push('');
      } else {
        oursLines.push(line);
        currentHunk.oursContent += (currentHunk.oursContent ? "\n" : "") + line;
        theirsLines.push('');
        resultLines.push('');
        displayLines.push('');
      }
    } else if (state === 'in_theirs') {
      currentHunkLines.push(line);
      if (line.startsWith('>>>>>>>')) {
        state = 'normal';
        currentHunk.theirsLines![1] = lineNum - 1;
        currentHunk.theirsLines![1] = lineNum - 1;
        currentHunk.markerEndLine = lineNum;
        currentHunk.fullMarkerText = currentHunkLines.join('\n');
        
        // fix up empty blocks where start > end
        if (currentHunk.oursLines![0] > currentHunk.oursLines![1]) {
           currentHunk.oursLines = [0, 0];
        }
        if (currentHunk.theirsLines![0] > currentHunk.theirsLines![1]) {
           currentHunk.theirsLines = [0, 0];
        }
        
        hunks.push(currentHunk as ConflictHunk);
        
        oursLines.push('');
        theirsLines.push('');
        resultLines.push('');
        displayLines.push(`>>>>>>> END CONFLICT ${currentHunk.id} >>>>>>>`);
        
        currentHunk = {};
        currentHunkLines = [];
      } else {
        oursLines.push('');
        theirsLines.push(line);
        currentHunk.theirsContent += (currentHunk.theirsContent ? "\n" : "") + line;
        resultLines.push('');
        displayLines.push('');
      }
    }
  }
  
  return {
    hunks,
    oursContent: oursLines.join('\n'),
    theirsContent: theirsLines.join('\n'),
    resultContent: resultLines.join('\n'),
    mergedBase: raw,
    displayBase: displayLines.join('\n'),
    segments: parseToSegments(raw)
  };
}

export function parseToSegments(raw: string): ConflictSegment[] {
  const lines = raw.split(/\r?\n/);
  const segments: ConflictSegment[] = [];
  let currentLines: string[] = [];
  let oursLines: string[] = [];
  let theirsLines: string[] = [];
  let state: 'normal' | 'ours' | 'theirs' = 'normal';
  let hunkCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('<<<<<<<')) {
      if (currentLines.length > 0) {
        segments.push({ type: 'common', content: currentLines.join('\n') });
        currentLines = [];
      }
      state = 'ours';
      oursLines = [];
    } else if (line.startsWith('=======')) {
      state = 'theirs';
      theirsLines = [];
    } else if (line.startsWith('>>>>>>>')) {
      state = 'normal';
      segments.push({
        id: `hunk-${hunkCount++}`,
        type: 'conflict',
        ours: oursLines.join('\n'),
        theirs: theirsLines.join('\n'),
        startLine: 0, // Will be calculated after assembly if needed
        endLine: 0
      });
      oursLines = [];
      theirsLines = [];
    } else {
      if (state === 'normal') currentLines.push(line);
      else if (state === 'ours') oursLines.push(line);
      else if (state === 'theirs') theirsLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    segments.push({ type: 'common', content: currentLines.join('\n') });
  }

  return segments;
}
