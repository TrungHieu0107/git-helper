# Zustand Store Shape

```ts
interface RepoMeta {
  path: string;
  name: string;
}

interface AppStore {
  repos: RepoMeta[];          // list of opened repos
  activeRepoPath: string | null;
  activeBranch: string | null;
  activeCommitOid: string | null;
  repoInfo: RepoInfo | null;
  repoStatus: RepoStatus | null;
  isLoadingRepo: boolean;
  repoError: string | null;
}
```
