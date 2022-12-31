enum Direction {
  NORTH = 1,
  SOUTH = 2,
  WEST = 3,
  EAST = 4,
}

interface Coord {
  x: number;
  y: number;
}

function xyToString(x: number, y: number): string {
  return `${x},${y}`;
}

function coordToString(c: Coord): string {
  return xyToString(c.x, c.y);
}

function stringToCoord(s: string) {
  const parts = s.split(',');
  return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
}

class Grid {
  curDir: Direction = Direction.NORTH;
  curRound: number = 0;

  constructor(public elves: Set<string>) {}

  /** Returns the min,max coordinates of elves in the grid. */
  findBounds(): Coord[] {
    const min: Coord = { x: Infinity, y: Infinity };
    const max: Coord = { x: -Infinity, y: -Infinity };

    for (const elfLocStr of this.elves.values()) {
      const c = stringToCoord(elfLocStr);
      if (c.x < min.x) min.x = c.x;
      if (c.y < min.y) min.y = c.y;
      if (c.x > max.x) max.x = c.x;
      if (c.y > max.y) max.y = c.y;
    }

    return [min, max];
  }

  /**
   * Returns the destination coordinate if the 3 spaces in that direction are
   * empty.
   */
  getDestCoordIfEmpty(locStr: string, dir: Direction): string|null {
    const {x, y} = stringToCoord(locStr);
    switch (dir) {
      case Direction.NORTH:
        if (!this.elves.has(xyToString(x-1, y-1))
            && !this.elves.has(xyToString(x-0, y-1))
            && !this.elves.has(xyToString(x+1, y-1))) {
          return coordToString({ x: x-0, y: y-1 });
        }
        return null;
      case Direction.EAST:
        if (!this.elves.has(xyToString(x+1, y-1))
            && !this.elves.has(xyToString(x+1, y-0))
            && !this.elves.has(xyToString(x+1, y+1))) {
          return coordToString({ x: x+1, y: y-0 });
        }
        return null;
      case Direction.SOUTH:
        if (!this.elves.has(xyToString(x-1, y+1))
            && !this.elves.has(xyToString(x-0, y+1))
            && !this.elves.has(xyToString(x+1, y+1))) {
          return coordToString({ x: x-0, y: y+1 });
        }
        return null;
      case Direction.WEST:
        if (!this.elves.has(xyToString(x-1, y-1))
            && !this.elves.has(xyToString(x-1, y-0))
            && !this.elves.has(xyToString(x-1, y+1))) {
          return coordToString({ x: x-1, y: y-0 });
        }
        return null;
    }
  }

  getEmptyGroundTiles(): number {
    const [min, max] = this.findBounds();
    const width = max.x - min.x + 1;
    const height = max.y - min.y + 1;
    return (width * height) - this.elves.size;
  }

  isIsolated(locStr: string): boolean {
    const {x, y} = stringToCoord(locStr);
    return !this.elves.has(xyToString(x-1, y-1))
        && !this.elves.has(xyToString(x-0, y-1))
        && !this.elves.has(xyToString(x+1, y-1))
        && !this.elves.has(xyToString(x+1, y-0))
        && !this.elves.has(xyToString(x+1, y+1))
        && !this.elves.has(xyToString(x-0, y+1))
        && !this.elves.has(xyToString(x-1, y+1))
        && !this.elves.has(xyToString(x-1, y-0));
  }

  /** Returns true if there were any elf moves. */
  processRound(): boolean {
    let moved = false;

    // A map from DESTINATION to SOURCE coordinates, both as strings.
    // (We use the destination as the key because we want a quick lookup to
    //  determine how many elves chose it).
    const destMap: Map<string, string[]> = new Map();

    // Loop through every elf.
    for (const elfLocStr of this.elves.values()) {
      // If this elf has no neighbors, then quit. They will not move.
      if (this.isIsolated(elfLocStr)) {
        continue;
      }

      // Evaluate each cardinal direction, starting at our current direction.
      let dir = this.curDir;
      for (let i = 0; i < 4; ++i) {
        // Look in dir, if it's empty, propose a move in that direction and move
        // on to the next elf.
        const destStr = this.getDestCoordIfEmpty(elfLocStr, dir);
        if (destStr) {
          if (!destMap.has(destStr)) {
            destMap.set(destStr, []);
          }
          destMap.get(destStr)!.push(elfLocStr);
          break;
        }
        // Otherwise keep looping.
        dir++;
        if (dir > 4) dir = Direction.NORTH;
      } // for each test direction
    } // for each elf

    // Then, do all the available moves that only had 1 elf proposing it.
    for (const [destStr, srcStrs] of destMap.entries()) {
      if (srcStrs.length === 1) {
        const srcStr = srcStrs[0];
        this.elves.delete(srcStr);
        this.elves.add(destStr);
        moved = true;
      }
    }

    // Finally, update the curDir and curRound.
    this.curDir++;
    if (this.curDir > 4) this.curDir = Direction.NORTH;
    this.curRound++;

    return moved;
  }
}

async function loadGrid(filename: string): Promise<Grid> {
  const elves: Set<string> = new Set();
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (let y = 0; y < lines.length; ++y) {
    const line = lines[y];
    if (line.length === 0) continue;
    for (let x = 0; x < line.length; ++x) {
      const ch = line.charAt(x);
      if (ch === '#') {
        elves.add(xyToString(x, y));
      }
    }
  }
  return new Grid(elves);
}

function printGrid(g: Grid) {
  console.log(`Round ${g.curRound}:`);
  const [min, max] = g.findBounds();
  for (let y = min.y - 2; y <= max.y + 2; ++y) {
    let rowStr = '';
    for (let x = min.x - 2; x <= max.x + 2; ++x) {
      if (g.elves.has(coordToString({x, y}))) {
        rowStr += '#';
      } else {
        rowStr += '.';
      }
    }
    console.log(rowStr);
  }
  console.log('');
}

/**
  const buf = new Uint8Array(20);
  await Deno.stdin.read(buf);
 */

async function main1(filename: string) {
  const g = await loadGrid(filename);
  // printGrid(g);
  for (let i = 0; i < 10; ++i) {
    g.processRound();
    // printGrid(g);
  }
  console.log(g.getEmptyGroundTiles());
}

async function main2(filename: string) {
  const g = await loadGrid(filename);
  // printGrid(g);

  while (g.processRound()) {}
  console.log(g.curRound);
}

// main1('input.txt');
main2('input.txt');