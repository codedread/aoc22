enum NodeType {
  DIR = 1,
  FILE = 2,
}

interface FileSystemNode {
  name: string;
  type: NodeType;
  /** Populated for every node but the top (/). */
  parent?: FileSystemNode;
  /** Only populated for Directories. */
  children?: FileSystemNode[];
  /** Only populated for files. */
  fileSize?: number;
}

function getDirectorySize(dir: FileSystemNode): number {
  if (dir.type !== NodeType.DIR) throw `Bad dir`;
  if (!dir.children) throw `Bad children`;

  let sum = 0;
  for (const child of dir.children) {
    if (child.type === NodeType.DIR) {
      sum += getDirectorySize(child);
    } else {
      if (child.fileSize === undefined) throw `File had no size!`;
      sum += child.fileSize;
    }
  }
  return sum;
}

function getFullPath(node: FileSystemNode): string {
  let path = '';
  if (node.parent) {
    path = getFullPath(node.parent) + '/';
  }
  return path + node.name;
}

function visitDir(node: FileSystemNode, visitorFn: (n: FileSystemNode) => any) {
  if (node.type !== NodeType.DIR) throw `Cannot visit a file`;
  for (const child of node.children!) {
    if (child.type === NodeType.DIR) {
      visitDir(child, visitorFn);
    }
  }
  visitorFn(node);
}

/** Returns the top node of the file system (/). */
function buildFileSystem(lines: string[]): FileSystemNode {
  const root: FileSystemNode = {
    name: '',
    type: NodeType.DIR,
  }
  let cwd: FileSystemNode = root;
  let isDirList: boolean = false;

  for (const line of lines) {
    if (line.length === 0) continue;
    if (line.startsWith('$ ')) {
      isDirList = false;

      // Change Current Directory.
      if (line.startsWith('$ cd ')) {
        const path = line.substring(5);
        if (path === '..') {
          if (!cwd.parent) {
            throw `cwd (${cwd.name}) has no parent`;
          }
          cwd = cwd.parent;
        } else {
          if (path === '/') {
            cwd = root;
          } else {
            if (!cwd.children) {
              throw `cwd (${cwd.name}) had no children`;
            }
            const childIndex = cwd.children.findIndex(n => n.name === path);
            if (childIndex === -1) {
              throw `cwd (${cwd.name}) had no child ${path}`;
            }
            cwd = cwd.children[childIndex];
          }
        }
      } else if (line === '$ ls') {
        isDirList = true;
      } else {
        throw `Unknown command: ${line}`;
      }
    } else {
      if (!isDirList) {
        throw `Was not in dir list mode: ${line}`;
      }

      // Add this entry to the file system, if not already there.
      if (!cwd.children) cwd.children = [];

      const parts = line.split(' ');
      if (cwd.children.find(n => n.name === parts[1])) {
        continue;
      }

      if (parts[0] === 'dir') {
        cwd.children.push({
          name: parts[1],
          type: NodeType.DIR,
          children: [],
          parent: cwd,
        });
      } else {
        cwd.children.push({
          name: parts[1],
          type: NodeType.FILE,
          parent: cwd,
          fileSize: parseInt(parts[0]),
        });
        if (isNaN(parseInt(parts[0]))) {
          console.log('woop');
          console.log(`line = '${line}'`);
        }
      }
    }
  }
  return root;
}

async function main1() {
  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  const fs = buildFileSystem(lines);
  const thoseDirs: FileSystemNode[] = [];
  let sum = 0;
  visitDir(fs, n => {
    const size = getDirectorySize(n);
    if (size <= 100000) {
      thoseDirs.push(n);
      sum += size;
    }
  });
  console.dir(sum);
}

const TOTAL_DISK_SIZE = 70000000;

async function main2() {
  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  const fs = buildFileSystem(lines);
  const diskUsed = getDirectorySize(fs);
  const diskSpaceFree = TOTAL_DISK_SIZE - diskUsed;
  const needToFree = 30000000 - diskSpaceFree;
  if (needToFree < 0) {
    throw `Have ${diskSpaceFree} free - more than enough!`;
  }
  console.log(`needToFree = ${needToFree}`);

  let bestDir: FileSystemNode|undefined = undefined;
  visitDir(fs, n => {
    const size = getDirectorySize(n);
    if (size >= needToFree) {
      if (!bestDir || size < getDirectorySize(bestDir)) {
        bestDir = n;
      }
    }
  });

  if (!bestDir) {
    throw 'Found no dir!';
  }

  console.log(getDirectorySize(bestDir));
}

//main1();
main2();