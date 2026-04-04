import { execFile } from 'node:child_process';

export function openInBrowser(url: string): void {
  const platform = process.platform;

  let command: string;
  let args: string[];

  if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '""', url];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  const child = execFile(command, args, (error) => {
    if (error) {
      console.error(`Could not open browser: ${error.message}`);
    }
  });

  child.unref();
}
