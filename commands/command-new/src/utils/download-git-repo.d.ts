declare module 'download-git-repo' {
  function download(repo: string, dest: string, opts: any, callback: Function): void;

  export = download;
}
