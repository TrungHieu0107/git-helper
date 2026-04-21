export interface TreeNode {
  name: string;
  fullPath: string;
  status?: string;
  children: Map<string, TreeNode>;
  isFolder: boolean;
}

export type ViewMode = 'path' | 'tree';

export interface FileStatus {
  path: string;
  status: string;
}
