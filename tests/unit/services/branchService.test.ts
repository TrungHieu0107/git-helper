import { describe, it, expect } from 'vitest';
import { parseBranchFromRef } from '../../../src/services/git/branchService';

describe('parseBranchFromRef', () => {
  it('should return branch name from full local ref', () => {
    expect(parseBranchFromRef('refs/heads/main')).toBe('main');
    expect(parseBranchFromRef('refs/heads/feature/login')).toBe('feature/login');
  });

  it('should return null for HEAD', () => {
    expect(parseBranchFromRef('HEAD')).toBeNull();
  });

  it('should return null for tags', () => {
    expect(parseBranchFromRef('refs/tags/v1.0')).toBeNull();
  });

  it('should return null for remote refs', () => {
    expect(parseBranchFromRef('refs/remotes/origin/main')).toBeNull();
  });

  it('should handle "HEAD -> branch" format from git log', () => {
    expect(parseBranchFromRef('HEAD -> main')).toBe('main');
    expect(parseBranchFromRef('HEAD -> feature/ui')).toBe('feature/ui');
  });

  it('should return raw string if no pattern matches', () => {
    expect(parseBranchFromRef('my-local-branch')).toBe('my-local-branch');
  });
});
