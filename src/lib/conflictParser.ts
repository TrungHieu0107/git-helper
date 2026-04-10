export interface ConflictHunk {
  // line numbers are 1-based, matching Monaco's line system
  markerStartLine: number;   // line with <<<<<<<
  dividerLine: number;       // line with =======
  markerEndLine: number;     // line with >>>>>>>
  oursLines: [number, number];    // [startLine, endLine] inclusive, ours content
  theirsLines: [number, number];  // [startLine, endLine] inclusive, theirs content
}

export interface ParsedConflict {
  hunks: ConflictHunk[];
  oursContent: string;    // full text for left panel — only ours blocks, markers removed
  theirsContent: string;  // full text for right panel — only theirs blocks, markers removed
  resultContent: string;  // full text for center panel — conflict blocks replaced with empty lines
}

export function parseConflictMarkers(raw: string): ParsedConflict {
  const lines = raw.split(/\r?\n/);
  
  let state: 'normal' | 'in_ours' | 'in_theirs' = 'normal';
  
  const hunks: ConflictHunk[] = [];
  let currentHunk: Partial<ConflictHunk> = {};
  
  const oursLines: string[] = [];
  const theirsLines: string[] = [];
  const resultLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1; // 1-based
    
    if (state === 'normal') {
      if (line.startsWith('<<<<<<<')) {
        state = 'in_ours';
        currentHunk = { markerStartLine: lineNum, oursLines: [lineNum + 1, lineNum] };
        oursLines.push('');
        theirsLines.push('');
        resultLines.push('');
      } else {
        oursLines.push(line);
        theirsLines.push(line);
        resultLines.push(line);
      }
    } else if (state === 'in_ours') {
      if (line.startsWith('=======')) {
        state = 'in_theirs';
        currentHunk.oursLines![1] = lineNum - 1;
        currentHunk.dividerLine = lineNum;
        currentHunk.theirsLines = [lineNum + 1, lineNum];
        oursLines.push('');
        theirsLines.push('');
        resultLines.push('');
      } else {
        oursLines.push(line);
        theirsLines.push('');
        resultLines.push('');
      }
    } else if (state === 'in_theirs') {
      if (line.startsWith('>>>>>>>')) {
        state = 'normal';
        currentHunk.theirsLines![1] = lineNum - 1;
        currentHunk.markerEndLine = lineNum;
        
        // fix up empty blocks where start > end
        if (currentHunk.oursLines![0] > currentHunk.oursLines![1]) {
           currentHunk.oursLines = [0, 0];
        }
        if (currentHunk.theirsLines![0] > currentHunk.theirsLines![1]) {
           currentHunk.theirsLines = [0, 0];
        }
        
        hunks.push(currentHunk as ConflictHunk);
        currentHunk = {};
        
        oursLines.push('');
        theirsLines.push('');
        resultLines.push('');
      } else {
        oursLines.push('');
        theirsLines.push(line);
        resultLines.push('');
      }
    }
  }
  
  // Ensure same exact line breaks (preserve CRLF if any, but array join is enough for Monaco matching lines)
  // Usually Monaco lines are defined by the array entries when joined with \n
  return {
    hunks,
    oursContent: oursLines.join('\n'),
    theirsContent: theirsLines.join('\n'),
    resultContent: resultLines.join('\n')
  };
}
