import { ConflictHunk } from './conflictParser';

export const OURS_HIGHLIGHT_CLASS = 'conflict-ours-highlight';
export const OURS_MARKER_CLASS    = 'conflict-ours-marker';
export const THEIRS_HIGHLIGHT_CLASS = 'conflict-theirs-highlight';
export const THEIRS_MARKER_CLASS    = 'conflict-theirs-marker';
export const RESULT_EMPTY_CLASS = 'conflict-result-empty';

export function buildOursDecorations(hunks: ConflictHunk[], monacoRange: any): any[] {
  return hunks.flatMap(hunk => {
    const decs: any[] = [];
    if (hunk.oursLines[0] > 0 && hunk.oursLines[1] > 0) {
      decs.push({
        range: new monacoRange(hunk.oursLines[0], 1, hunk.oursLines[1], 1),
        options: { isWholeLine: true, className: OURS_HIGHLIGHT_CLASS }
      });
    }
    decs.push({
      range: new monacoRange(hunk.markerStartLine, 1, hunk.markerStartLine, 1),
      options: { isWholeLine: true, className: OURS_MARKER_CLASS }
    });
    return decs;
  });
}

export function buildTheirsDecorations(hunks: ConflictHunk[], monacoRange: any): any[] {
  return hunks.flatMap(hunk => {
    const decs: any[] = [];
    if (hunk.theirsLines[0] > 0 && hunk.theirsLines[1] > 0) {
      decs.push({
        range: new monacoRange(hunk.theirsLines[0], 1, hunk.theirsLines[1], 1),
        options: { isWholeLine: true, className: THEIRS_HIGHLIGHT_CLASS }
      });
    }
    decs.push({
      range: new monacoRange(hunk.markerEndLine, 1, hunk.markerEndLine, 1),
      options: { isWholeLine: true, className: THEIRS_MARKER_CLASS }
    });
    return decs;
  });
}

export function buildResultDecorations(hunks: ConflictHunk[], monacoRange: any): any[] {
  return hunks.map(hunk => ({
    range: new monacoRange(hunk.markerStartLine, 1, hunk.markerEndLine, 1),
    options: { isWholeLine: true, className: RESULT_EMPTY_CLASS }
  }));
}
