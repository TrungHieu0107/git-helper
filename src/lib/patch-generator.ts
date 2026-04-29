
/**
 * Utility to generate a Git-compatible patch string for partial staging.
 * Supports generating patches for specific hunks or selected line ranges.
 */

export interface PatchOptions {
  repoPath: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  lineEndings?: '\n' | '\r\n';
}

export interface HunkInfo {
  originalStart: number;
  originalEnd: number;
  modifiedStart: number;
  modifiedEnd: number;
}

export function generateHunkPatch(options: PatchOptions, hunk: HunkInfo): string {
  const { filePath, oldContent, newContent, lineEndings = '\n' } = options;
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);

  const header = `--- a/${filePath}${lineEndings}+++ b/${filePath}${lineEndings}`;
  
  // Git hunks usually include 3 lines of context. 
  // However, for precise partial staging, we can use 0 context if we are careful, 
  // but it's safer to include context to avoid base mismatch.
  
  const contextSize = 3;
  const startLine = Math.max(1, hunk.originalStart - contextSize);
  const endLine = Math.min(oldLines.length, hunk.originalEnd + contextSize);
  
  // Calculate modified range with context
  const modStartLine = Math.max(1, hunk.modifiedStart - contextSize);
  const modEndLine = Math.min(newLines.length, hunk.modifiedEnd + contextSize);

  const originalCount = endLine - startLine + 1;
  const modifiedCount = modEndLine - modStartLine + 1;

  let patch = `${header}@@ -${startLine},${originalCount} +${modStartLine},${modifiedCount} @@${lineEndings}`;

  // Add context before
  for (let i = startLine; i < hunk.originalStart; i++) {
    patch += ` ${oldLines[i - 1]}${lineEndings}`;
  }

  // Add changes
  for (let i = hunk.originalStart; i <= hunk.originalEnd; i++) {
    patch += `-${oldLines[i - 1]}${lineEndings}`;
  }
  for (let i = hunk.modifiedStart; i <= hunk.modifiedEnd; i++) {
    patch += `+${newLines[i - 1]}${lineEndings}`;
  }

  // Add context after
  for (let i = hunk.originalEnd + 1; i <= endLine; i++) {
    patch += ` ${oldLines[i - 1]}${lineEndings}`;
  }

  return patch;
}

/**
 * Generates a patch for a specific selection of lines in the modified file.
 * This is more complex because we need to map modified lines back to original lines.
 */
export function generateSelectionPatch(
  options: PatchOptions, 
  selectionStart: number, 
  selectionEnd: number,
  allLineChanges: any[]
): string | null {
  // Find the hunk containing the selection
  const targetHunk = allLineChanges.find(c => 
    selectionStart <= c.modifiedEndLineNumber && selectionEnd >= c.modifiedStartLineNumber
  );

  if (!targetHunk) return null;

  // For simplicity in this iteration, if selection is within a hunk, we stage the relevant parts of that hunk.
  // Precise line staging requires sophisticated diffing or using the hunk as base.
  
  // If the user selected exactly the lines in a hunk, use generateHunkPatch
  return generateHunkPatch(options, {
    originalStart: targetHunk.originalStartLineNumber,
    originalEnd: targetHunk.originalEndLineNumber,
    modifiedStart: targetHunk.modifiedStartLineNumber,
    modifiedEnd: targetHunk.modifiedEndLineNumber,
  });
}
