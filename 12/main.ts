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
      if (ch === 'S') { start = loc; }
      else if (ch === 'E') { loc.height = 25; end = loc; }
      else { loc.height = (ch.charCodeAt(0) - 'a'.charCodeAt(0)); }

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
 * n is the node where we are visiting.
 * If an adjacent node has not been visited, and followFn() returns true,
 * then that node will be added as a possible path to follow.
 * If endFn() returns true, it means the goal has been reached.
 */
function branchPath(n: PathNode,
    followFn: (from: Loc, to: Loc) => boolean,
    endFn: (loc: Loc) => boolean) {
  n.loc.visited = true;
  if (endFn(n.loc)) {
    let pathLength = 0;
    let cur = n;
    while (cur.prev) {
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
    if (dir.visited !== true && followFn(n.loc, dir)) {
      dir.visited = true;
      n.next.push({
        loc: dir,
        prev: n,
        next: [],
      });
    }
  }
}

async function main1(filename: string) {
  const grid = await loadGrid(filename);

  const head: PathNode = {
    loc: grid.end,
    prev: null,
    next: [],
  }

  const pathsToFollow: PathNode[] = [ head ];
  while (pathsToFollow.length > 0) {
    const path = pathsToFollow.shift();
    if (!path) throw `huh?`;
    branchPath(path,
      (from: Loc, to: Loc) => (from.height - 1 <= to.height),
      (loc: Loc) => loc === grid.start);
    if (path.next.length > 0) {
      pathsToFollow.push(...path.next);
    }
    if (pathsToFollow.length > 100) break;
  }

  console.log(shortestPathLength);
}

async function main2(filename: string) {
  const grid = await loadGrid(filename);

  const head: PathNode = {
    loc: grid.end,
    prev: null,
    next: [],
  }

  const pathsToFollow: PathNode[] = [ head ];
  while (pathsToFollow.length > 0) {
    const path = pathsToFollow.shift();
    if (!path) throw `huh?`;
    branchPath(path,
      (from: Loc, to: Loc) => (from.height - 1 <= to.height),
      (loc: Loc) => loc.height === 0);
    if (path.next.length > 0) {
      pathsToFollow.push(...path.next);
    }
    if (pathsToFollow.length > 100) break;
  }

  console.log(shortestPathLength);
}

// main1('input.txt');
main2('input.txt');
