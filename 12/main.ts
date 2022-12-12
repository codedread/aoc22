interface Coord {
  x: number;
  y: number;
}

interface Loc {
  coord: Coord;
  height: number;
  visited: boolean;

  west?: Loc;
  east?: Loc;
  north?: Loc;
  south?: Loc;
}

interface Grid {
  locs: Loc[][];
  readonly start: Loc;
  readonly end: Loc;
}

interface PathNode {
  loc: Loc;
  prev: PathNode|null;
  next: PathNode[];
}

async function loadGrid(filename: string): Promise<Grid> {
  let start: Loc|undefined;
  let end: Loc|undefined;
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  const locs: Loc[][] = [];
  let cur: Coord = {x: -1, y: -1};
  for (const line of lines) {
    const row: Loc[] = [];
    cur.y++;
    for (cur.x = 0; cur.x < line.length; cur.x++) {
      const loc: Loc = {
        coord: {...cur},
        height: 0,
        visited: false,
      };

      const ch = line.charAt(cur.x);
      if (ch === 'S') {
        start = loc;
      } else if (ch === 'E') {
        loc.height = 25;
        end = loc;
      } else {
        loc.height = (ch.charCodeAt(0) - 'a'.charCodeAt(0));
      }
      row.push(loc);
    }
    locs.push(row);
  }

  if (!start) throw `No start!`;
  if (!end) throw `No end!`;

  // Link location directions.
  for (let y = 0; y < locs.length; ++y) {
    for (let x = 0; x < locs[y].length; ++x) {
      const loc = locs[y][x];
      if (x > 0) loc.west = locs[y][x - 1];
      if (x < locs[y].length - 1) loc.east = locs[y][x + 1]; 
      if (y > 0) loc.north = locs[y - 1][x];
      if (y < locs.length - 1) loc.south = locs[y + 1][x];
    }
  }

  return {
    locs,
    start,
    end,
  }
}

let shortestPathLength = Infinity;
let shortestPathToEnd: PathNode;

/**
 * loc is where we are visiting.
 * Updates n with up to 4 paths to follow.
 */
function branchPath(n: PathNode, start: Loc, end: Loc) {
  n.loc.visited = true;
  if (n.loc === end) {
    let pathLength = 0;
    let cur = n;
    while (cur.loc !== start) {
      if (!cur.prev) { throw `No prev!`; }
      cur = cur.prev;
      ++pathLength;
    }

    if (pathLength < shortestPathLength) {
      shortestPathLength = pathLength;
      shortestPathToEnd = n;
    }
  }

  for (const dir of [n.loc.north, n.loc.east, n.loc.south, n.loc.west]) {
    if (!dir) continue;
    if (dir.visited !== true && (n.loc.height >= dir.height - 1)) {
      dir.visited = true;
      n.next.push({
        loc: dir,
        prev: n,
        next: [],
      });
    }
  }
}

function dumpPath(n: PathNode, start: Loc) {
  const locs: Loc[] = [];
  let cur = n;
  while (cur.loc !== start) {
    locs.push(cur.loc);
    if (!cur.prev) throw `Once again, no prev!`;
    cur = cur.prev;
  }
  locs.push(start);

  let pathStr = '';
  for (let i = locs.length - 1; i >= 0; --i) {
    if (i < locs.length - 1) {
      pathStr += ` -> `;
    }
    pathStr += `(${locs[i].coord.x},${locs[i].coord.y})`;
  }
  console.log(pathStr);
}

async function main1(filename: string) {
  const grid = await loadGrid(filename);

  const head: PathNode = {
    loc: grid.start,
    prev: null,
    next: [],
  }

  const pathsToFollow: PathNode[] = [ head ];
  while (pathsToFollow.length > 0) {
    const path = pathsToFollow.shift();
    if (!path) throw `huh?`;
    branchPath(path, grid.start, grid.end);
    if (path.next.length > 0) {
      pathsToFollow.push(...path.next);
    }
    if (pathsToFollow.length > 100) break;
  }

  console.log(shortestPathLength);
}

main1('input.txt');
