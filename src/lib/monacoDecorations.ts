import { ConflictHunk } from './conflictParser';

export const OURS_HIGHLIGHT_CLASS = 'conflict-ours-highlight';
export const OURS_MARKER_CLASS    = 'conflict-ours-marker';
export const THEIRS_HIGHLIGHT_CLASS = 'conflict-theirs-highlight';
export const THEIRS_MARKER_CLASS    = 'conflict-theirs-marker';
export const RESULT_EMPTY_CLASS = 'conflict-result-empty';
export const ACTIVE_HUNK_CLASS = 'conflict-active-hunk';

export function buildOursDecorations(hunks: ConflictHunk[], monacoRange: any, activeIndex?: number): any[] {
  return hunks.flatMap((hunk, index) => {
    const decs: any[] = [];
    const isActive = index === activeIndex;
    
    if (hunk.oursLines[0] > 0 && hunk.oursLines[1] > 0) {
      decs.push({
        range: new monacoRange(hunk.oursLines[0], 1, hunk.oursLines[1], 1),
        options: { 
          isWholeLine: true, 
          className: `${OURS_HIGHLIGHT_CLASS} ${isActive ? ACTIVE_HUNK_CLASS : ''}` 
        }
      });
    }
    decs.push({
      range: new monacoRange(hunk.markerStartLine, 1, hunk.markerStartLine, 1),
      options: { isWholeLine: true, className: OURS_MARKER_CLASS }
    });
    return decs;
  });
}

export function buildTheirsDecorations(hunks: ConflictHunk[], monacoRange: any, activeIndex?: number): any[] {
  return hunks.flatMap((hunk, index) => {
    const decs: any[] = [];
    const isActive = index === activeIndex;

    if (hunk.theirsLines[0] > 0 && hunk.theirsLines[1] > 0) {
      decs.push({
        range: new monacoRange(hunk.theirsLines[0], 1, hunk.theirsLines[1], 1),
        options: { 
          isWholeLine: true, 
          className: `${THEIRS_HIGHLIGHT_CLASS} ${isActive ? ACTIVE_HUNK_CLASS : ''}` 
        }
      });
    }
    decs.push({
      range: new monacoRange(hunk.markerEndLine, 1, hunk.markerEndLine, 1),
      options: { isWholeLine: true, className: THEIRS_MARKER_CLASS }
    });
    return decs;
  });
}

export function buildResultDecorations(hunks: ConflictHunk[], monacoRange: any, activeIndex?: number): any[] {
  return hunks.map((hunk, index) => ({
    range: new monacoRange(hunk.markerStartLine, 1, hunk.markerEndLine, 1),
    options: { 
      isWholeLine: true, 
      className: `${RESULT_EMPTY_CLASS} ${index === activeIndex ? ACTIVE_HUNK_CLASS : ''}` 
    }
  }));
}
