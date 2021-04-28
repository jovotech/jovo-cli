declare module 'download-git-repo' {
  function download(repo: string, dest: string, callback: Function): void;
  function download(repo: string, dest: string, opts: { clone: boolean }, callback: Function): void;

  export = download;
}
