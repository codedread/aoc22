
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

enum Direction {
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
  NORTH = 4,
}

const Pointy = {
  1: '>',
  2: 'V',
  3: '<',
  4: 'Ʌ',
};

class Strip {
  /** The x or y coordinate that is fixed, depending on the orientation. */
  fixed: number;

  vertical: boolean;

  /** The strip that the min-edge leads to and the new facing. */
  minStrip: Strip;
  /** Undefined means no change in facing. */
  minFacing: Direction|undefined;

  /** The strip that the max-edge leads to and the new facing. */
  maxStrip: Strip;
  /** Undefined means no change in facing. */
  maxFacing: Direction|undefined;

  /** By default, the strips wrap. */
  constructor(public min: number, public max: number, fixed: number, vertical: boolean) {
    this.fixed = fixed;
    this.vertical = vertical;
    this.maxStrip = this.minStrip = this;
    this.minFacing = this.maxFacing = undefined;
  }
}

class Me {
  coord: Coord;
  facing: Direction;
  constructor(x: number, y: number) {
    this.coord = { x, y };
    this.facing = Direction.EAST;
  }

  turnLeft() {
    this.facing--;
    if (this.facing <= 0) this.facing = Direction.NORTH;
  }

  turnRight() {
    this.facing++;
    if (this.facing > 4) this.facing = Direction.EAST;
  }
}

class Grid {
  walls: Set<string>;
  rows: Strip[];
  cols: Strip[];
  instructionString: string;
  me: Me;

  constructor(rows: Strip[], cols: Strip[], walls: Set<string>, instrStr: string) {
    // TODO: Copy?
    this.rows = rows;
    this.cols = cols;
    this.walls = walls;
    this.instructionString = instrStr;

    // TODO: Check for a wall?
    this.me = new Me(this.rows[0].min, 0);
  }

  async followInstructionsDammit(print: boolean = false) {
    let instrs = this.instructionString.slice(0);
    while (instrs.length > 0) {
      if (print) {
        printGrid(this);
        const buf = new Uint8Array(20);
        await Deno.stdin.read(buf);
      }

      if (instrs.match(/^[0-9]/)) {
        let steps = parseInt(instrs);
        instrs = instrs.slice(`${steps}`.length);

        const curRow = this.rows[this.me.coord.y];
        if (!curRow) console.log(`y=${this.me.coord.y}`);
        const curCol = this.cols[this.me.coord.x];
        let next = {...this.me.coord};
        let nextFacing: Direction|undefined;

        while (steps > 0) {
          switch (this.me.facing) {
            case Direction.EAST:
              next.x++;
              if (next.x > curRow.max) {
                next = getNextXY(curRow.maxFacing || this.me.facing, curRow.maxStrip);
                nextFacing = curRow.maxFacing;
              }
              break;
            case Direction.WEST:
              next.x--;
              if (next.x < curRow.min) {
                next = getNextXY(curRow.minFacing || this.me.facing, curRow.minStrip);
                nextFacing = curRow.minFacing;
              }
              break;
            case Direction.NORTH:
              next.y--;
              if (next.y < curCol.min) {
                next = getNextXY(curCol.minFacing || this.me.facing, curCol.minStrip);
                nextFacing = curCol.minFacing;
              }
              break;
            case Direction.SOUTH:
              next.y++;
              if (next.y > curCol.max) {
                next = getNextXY(curCol.maxFacing || this.me.facing, curCol.maxStrip);
                nextFacing = curCol.maxFacing;
              }
              break;
          }

          if (this.isWall(next.x, next.y)) {
            steps = 0;
          } else {
            this.me.coord = {...next};
            if (nextFacing) {
              this.me.facing = nextFacing;
            }
            steps--;
          }
          if (print) {
            printGrid(this);
            console.log(`next = ${next.x},${next.y}, steps left = ${steps}, instr=${instrs}`);
            const buf = new Uint8Array(20);
            await Deno.stdin.read(buf);
          }    
        }
      } else if (instrs.startsWith('L')) {
        this.me.turnLeft();
        instrs = instrs.slice(1);
        if (print) {
          printGrid(this);
          const buf = new Uint8Array(20);
          await Deno.stdin.read(buf);
        }  
      } else if (instrs.startsWith('R')) {
        this.me.turnRight();
        instrs = instrs.slice(1);
        if (print) {
          printGrid(this);
          const buf = new Uint8Array(20);
          await Deno.stdin.read(buf);
        }  
      } else {
        throw 'burp';
      }
    }
  }

  private isWall(x: number, y: number): boolean {
    return this.walls.has(xyToString(x, y));
  }
}

async function createGrid(filename: string): Promise<Grid> {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  const walls: Set<string> = new Set();
  const rows: Strip[] = [];
  let columns: Strip[]|undefined;
  let instructionString: string|undefined;

  for (let y = 0; y < lines.length; ++y) {
    const line = lines[y];
    if (line.length === 0) continue;

    if (columns === undefined) {
      columns = new Array(line.length);
    } else if (line.length > columns.length) {
      const undefs = new Array(line.length - columns.length).fill(undefined);
      columns.push(...undefs);
    }

    if (line.match(/^[0-9]/)) {
      instructionString = line;
      break;
    }

    rows.push(new Strip(-1, -1, rows.length, false));

    for (let x = 0; x < line.length; ++x) {
      if (columns[x] === undefined) {
        columns[x] = new Strip(-1, -1, x, true);
      }

      const ch = line.charAt(x);
      // Physical space found.
      if (ch !== ' ') {
        if (!rows[y]) {
          throw `y=${y}, lines.length=${lines.length}`;
        }
        if (rows[y].min === -1) {
          rows[y].min = x;
        }
        rows[y].max = x;

        if (columns[x].min === -1) {
          columns[x].min = y;
        }
        columns[x].max = y;

        if (ch === '#') {
          walls.add(xyToString(x, y));
        } else if (ch !== '.') {
          throw `Found something other than space, #, or x: '${ch}'`;
        }
      }
    }
  }
  return new Grid(rows, columns!, walls, instructionString!);
}

function getNextXY(nextFacing: Direction, nextStrip: Strip): Coord {
  switch (nextFacing) {
    case Direction.NORTH:
      return { x: nextStrip.fixed, y: nextStrip.max };
    case Direction.EAST:
      return { x: nextStrip.min, y: nextStrip.fixed };
    case Direction.SOUTH:
      return { x: nextStrip.fixed, y: nextStrip.min };
    case Direction.WEST:
      return { x: nextStrip.max, y: nextStrip.fixed };
  }
}


/**
 * Perfect may be the enemy of good, but I'm not sure what the enemy is of this.
 * I'm "cheating" by hard-coding the edge mappings... :(
 */
function linkCubeEdges(grid: Grid, tiny: boolean) {
  /**
   * Go through every horizontal and vertical strip, linking it to the appropriate
   * edges on each min/max.
   */
  if (tiny) {
    const SIZE = 4;
    for (let y = 0; y < grid.rows.length; ++y) {
      // First row (face A)
      if (y < SIZE) {
        // West edge of A goes to north edge of C.
        const A = y;
        const C = y + SIZE;
        grid.rows[A].minStrip = grid.cols[C];
        grid.rows[A].minFacing = Direction.SOUTH;
        grid.cols[C].minStrip = grid.rows[A];
        grid.cols[C].minFacing = Direction.EAST;

        // East edge of A goes to west edge of F, inverted.
        const F = grid.rows.length - y - 1;
        grid.rows[A].maxStrip = grid.rows[F];
        grid.rows[A].maxFacing = Direction.WEST;
        grid.rows[F].maxStrip = grid.rows[A];
        grid.rows[F].maxFacing = Direction.EAST;
      }
      // Second row (faces B and D).
      else if (y < (2 * SIZE)) {
        // West edge of B goes to south edge of F, inverted.
        const fy = y - SIZE;
        const B = y;
        const F = grid.cols.length - 1 - fy;
        grid.rows[B].minStrip = grid.cols[F];
        grid.rows[B].minFacing = Direction.NORTH;
        grid.cols[F].maxStrip = grid.rows[B];
        grid.cols[F].maxFacing = Direction.EAST;

        // East edge of D goes to north edge of F, inverted.
        const D = y;
        grid.rows[D].maxStrip = grid.cols[F];
        grid.rows[D].maxFacing = Direction.SOUTH;
        grid.cols[F].minStrip = grid.rows[D];
        grid.cols[F].minFacing = Direction.WEST;
      }
      // Third rows (faces E and F).
      else {
        // West edge of E goes to south edge of C, inverted.
        const fy = y - (2 * SIZE);
        const E = y;
        const C = (2 * SIZE) - 1 - fy;
        grid.rows[E].minStrip = grid.cols[C];
        grid.rows[E].minFacing = Direction.NORTH;
        grid.cols[C].maxStrip = grid.rows[E];
        grid.cols[C].maxFacing = Direction.EAST;

        // East edge of F goes to east edge of A, inverted. Already covered above.
      }
    }

    for (let x = 0; x < grid.cols.length; ++x) {
      // First column (face B)
      if (x < SIZE) {
        // North edge of B goes to north edge of A, inverted.
        const B = x;
        const A = (3 * SIZE) - 1 - x;
        grid.cols[B].minStrip = grid.cols[A];
        grid.cols[B].minFacing = Direction.SOUTH;
        grid.cols[A].minStrip = grid.cols[B];
        grid.cols[A].minFacing = Direction.SOUTH;

        // South edge of B goes to south edge of E, inverted.
        const E = A;
        grid.cols[B].maxStrip = grid.cols[E];
        grid.cols[B].maxFacing = Direction.NORTH;
        grid.cols[E].maxStrip = grid.cols[B];
        grid.cols[E].maxFacing = Direction.NORTH;
      }
      // Second column (face C).
      else if (x < (2 * SIZE)) {
        // North edge of C goes to east edge of A. Already covered above.
        // South edge of C goes to west edge of E, inverted. Already covered aboe.
      }
      // Third column (faces A and E).
      else if (x < (3 * SIZE)) {
        // North edge of A goes to north edge of B. Already covered above.
        // South edge of E goes to south edge of B. Already covered above.
      }
      // Fourth column (face F).
      else {
        // North edge of F goes to east edge of D, inverted. Already covered above.
        // South edge of F goes to west edge of B, inverted. Already covered above.
      }
    }
  } else {
    const SIZE = 50;
    for (let y = 0; y < grid.rows.length; ++y) {
      // First row (face G)
      if (y < SIZE) {
        // West edge of G goes to west edge of J, inverted.
        const G = y;
        const J = (3 * SIZE) - 1 - y;
        grid.rows[G].minStrip = grid.rows[J];
        grid.rows[G].minFacing = Direction.EAST;
        grid.rows[J].minStrip = grid.rows[G];
        grid.rows[J].minFacing = Direction.EAST;

        // East edge of H goes to west edge of K, inverted.
        const H = G;
        const K = J;
        grid.rows[H].maxStrip = grid.rows[K];
        grid.rows[H].maxFacing = Direction.WEST;
        grid.rows[K].maxStrip = grid.rows[H];
        grid.rows[K].maxFacing = Direction.WEST;
      }
      // Second row (face I).
      else if (y < (2 * SIZE)) {
        // West edge of I goes to north edge of J.
        const fy = y - SIZE;
        const I = y;
        const J = fy;
        grid.rows[I].minStrip = grid.cols[J];
        grid.rows[I].minFacing = Direction.SOUTH;
        grid.cols[J].minStrip = grid.rows[I];
        grid.cols[J].minFacing = Direction.EAST;

        // East edge of I goes to south edge of H.
        const H = (2 * SIZE) + fy;
        grid.rows[I].maxStrip = grid.cols[H];
        grid.rows[I].maxFacing = Direction.NORTH;
        grid.cols[H].maxStrip = grid.rows[I];
        grid.cols[H].maxFacing = Direction.WEST;
      }
      // Third row (faces J and K).
      else if (y < (3 * SIZE)) {
        // West edge of J goes to west edge of G, inverted. Already covered above.
        // East edge of K goes to west edge of H, inverted. Already covered above.
      }
      // Fourth row (face L).
      else {
        // West edge of L goes to north edge of G.
        const fy = y - (3 * SIZE);
        const L = y;
        const G = SIZE + fy;
        grid.rows[L].minStrip = grid.cols[G];
        grid.rows[L].minFacing = Direction.SOUTH;
        grid.cols[G].minStrip = grid.rows[L];
        grid.cols[G].minFacing = Direction.EAST;

        // East edge of L goes to south edge of K.
        const K = G;
        grid.rows[L].maxStrip = grid.cols[K];
        grid.rows[L].maxFacing = Direction.NORTH;
        grid.cols[K].maxStrip = grid.rows[L];
        grid.cols[K].maxFacing = Direction.WEST;
      }
    }

    for (let x = 0; x < grid.cols.length; ++x) {
      // First column (faces J and L)
      if (x < SIZE) {
        // North edge of J goes to west edge of I, inverted. Already covered above.
        // South edge of L goes to north edge of H.
        const L = x;
        const H = (2 * SIZE) + x;
        grid.cols[L].maxStrip = grid.cols[H];
        grid.cols[L].maxFacing = Direction.SOUTH;
        grid.cols[H].minStrip = grid.cols[L];
        grid.cols[H].minFacing = Direction.NORTH;
      }
      // Second column (faces G and K).
      else if (x < (2 * SIZE)) {
        // North edge of G goes to west edge of L. Already covered above.
        // South edge of K goes to east edge of L. Already covered aboe.
      }
      // Third column (face H).
      else if (x < (3 * SIZE)) {
        // North edge of H goes to south edge of L. Already covered above.
        // South edge of H goes to west edge of I. Already covered above.
      }
    }
  }
}


function printGrid(g: Grid) {
  console.clear();
  for (let y = 0; y < g.rows.length; ++y) {
    if (g.rows[y].min === -1) {
      console.log(`y=${y}`);
      console.dir(g.rows[y]);
    }
    let rowStr = '%c' + ' '.repeat(g.rows[y].min);
    let meThere = false;
    for (let x = g.rows[y].min; x <= g.rows[y].max; ++x) {
      if (g.me.coord.x === x && g.me.coord.y === y) {
        if (g.walls.has(xyToString(x, y))) throw 'impossible';
        meThere = true;
        rowStr += `%c${Pointy[g.me.facing]}%c`;
      }
      else if (g.walls.has(xyToString(x, y))) rowStr += '#';
      else rowStr += '.';
    }
    if (meThere) {
      console.log(rowStr, 'background-color: black', 'background-color: red', 'background-color: black');
    } else {
      console.log(rowStr, 'background-color: black');
    }
  }
}

async function main1(filename: string) {
  const grid = await createGrid(filename);
  printGrid(grid);
  grid.followInstructionsDammit(true);
  let row = grid.me.coord.y + 1;
  let column = grid.me.coord.x + 1;
  let facing = grid.me.facing - 1;
  console.log(1000 * row + 4 * column + facing);
}

async function main2(filename: string) {
  const grid = await createGrid(filename);
  linkCubeEdges(grid, filename === 'tiny.txt');
  grid.followInstructionsDammit(false);
  let row = grid.me.coord.y + 1;
  let column = grid.me.coord.x + 1;
  let facing = grid.me.facing - 1;
  console.log(1000 * row + 4 * column + facing);
}

// main1('tiny.txt');
main2('input.txt');
