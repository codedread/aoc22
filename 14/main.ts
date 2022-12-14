enum Tile {
  AIR = 0,
  ROCK = 1,
  SAND = 2,
}

interface Coord {
  x: number,
  y: number,
}

type CoordStr = string;

function fromCoordToStr(c: Coord): CoordStr {
  return `${c.x},${c.y}`;
}

function fromStrToCoord(s: CoordStr) {
  const parts = s.split(',');
  const coord: Coord = { x: parseInt(parts[0]), y: parseInt(parts[1]) };
  return coord;
}

interface Grid {
  tiles: Map<CoordStr, Tile>;
  lowestRockY: number;
}

function getTileAt(g: Grid, x, y: number): Tile {
  const c: Coord = { x, y };
  const key = fromCoordToStr(c);
  let tile: Tile;
  if (!g.tiles.has(key)) tile = Tile.AIR;
  else tile = g.tiles.get(key)!;
  return tile;
}

async function createGrid(filename: string): Promise<Grid> {
  const grid: Grid = {
    tiles: new Map(),
    lowestRockY: -Infinity,
  };

  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    const coords = line.split(' -> ');
    let cur = fromStrToCoord(coords[0]);
    grid.tiles.set(fromCoordToStr(cur), Tile.ROCK);
    for (let i = 1; i < coords.length; ++i) {
      const next = fromStrToCoord(coords[i]);
      // Vertical line.
      if (cur.x === next.x) {
        while (next.y !== cur.y) {
          cur.y += (cur.y < next.y) ? 1 : -1;
          grid.tiles.set(fromCoordToStr(cur), Tile.ROCK);
          if (cur.y > grid.lowestRockY) {
            grid.lowestRockY = next.y;
          }
        }
      }
      // Horizontal line.
      else {
        while (next.x !== cur.x) {
          cur.x += (cur.x < next.x) ? 1 : -1;
          grid.tiles.set(fromCoordToStr(cur), Tile.ROCK);
        }
      }
    }
  }

  return grid;
}

/** The input.txt grid is pretty sick! */
function printGrid(g: Grid, withFloor: boolean = false) {
  let up = Infinity, down = -Infinity, left = Infinity, right = -Infinity;
  for (const keyStr of g.tiles.keys()) {
    const c = fromStrToCoord(keyStr);
    if (c.y > down) down = c.y;
    if (c.y < up) up = c.y;
    if (c.x < left) left = c.x;
    if (c.x > right) right = c.x;
  }

  console.log(`bounds: ${[left, up, right, down]}`);
  let extraX = withFloor ? 5 : 1;
  let extraY = withFloor ? 1 : 0;
  for (let y = 0; y <= g.lowestRockY + extraY; ++y) {
    let rowStr = '';
    for (let x = left - extraX; x <= right + extraX; ++x) {
      const tile = getTileAt(g, x, y);
      switch (tile) {
        case Tile.AIR:  rowStr += '.'; break;
        case Tile.ROCK: rowStr += '#'; break;
        case Tile.SAND: rowStr += 'o'; break;
      }
    }
    console.log(rowStr);
  }
  if (withFloor) {
    let floorStr = '';
    for (let x = left - extraX; x <= right + extraX; ++x) {
      floorStr += '#';
    }
    console.log(floorStr);
  }
  console.log('================================================');
  console.log('');
}

/** Returns the count of sand units needed until an abyss flow is reached. */
function dropSandUntilAbyss(g: Grid): number {
  let count = 0;
  let curSand: Coord = { x: 500, y: 0 };
  while (curSand.y < g.lowestRockY) {
    let next: Coord = { x: curSand.x, y: curSand.y + 1 };
    if (getTileAt(g, next.x, next.y) !== Tile.AIR) {
      // Try to fall diagonal left.
      next.x = curSand.x - 1;
      if (getTileAt(g, next.x, next.y) !== Tile.AIR) {
        // Try to fall diagonal right.
        next.x = curSand.x + 1;
        if (getTileAt(g, next.x, next.y) !== Tile.AIR) {
          // Leave sand at rest where it is...
          g.tiles.set(fromCoordToStr(curSand), Tile.SAND);
          count++;
          // Start a new unit of sand.
          curSand = { x: 500, y: 0 };
          // printGrid(g);
          continue;
        }
      }
    }

    // The only way to get here is if the sand was not blocked at next.
    curSand = next;
  }

  // Take off the falling unit of sand...
  return count;
}

/** Returns the count of sand units needed until no more sand can drop. */
function dropSandUntilBlocked(g: Grid): number {
  let count = 0;
  let cur: Coord = { x: 500, y: 0 };
  while (getTileAt(g, 500, 0) === Tile.AIR) {
    let next: Coord = { x: cur.x, y: cur.y + 1 };
    if (getTileAt(g, next.x, next.y) !== Tile.AIR || next.y >= g.lowestRockY + 2) {
      // Try to fall diagonal left.
      next.x = cur.x - 1;
      if (getTileAt(g, next.x, next.y) !== Tile.AIR || next.y >= g.lowestRockY + 2) {
        // Try to fall diagonal right.
        next.x = cur.x + 1;
        if (getTileAt(g, next.x, next.y) !== Tile.AIR || next.y >= g.lowestRockY + 2) {
          // Leave sand at rest where it is...
          g.tiles.set(fromCoordToStr(cur), Tile.SAND);
          count++;
          // Start a new unit of sand.
          cur = { x: 500, y: 0 };
          continue;
        }
      }
    }

    // The only way to get here is if the sand was not blocked at next.
    cur = next;
  }
  // yowza!
  // printGrid(g, true);
  return count;
}

async function main1(filename: string) {
  const grid = await createGrid(filename);
  console.log(dropSandUntilAbyss(grid));
}

async function main2(filename: string) {
  const grid = await createGrid(filename);
  console.log(dropSandUntilBlocked(grid));
}

// main1('input.txt');
main2('input.txt');