
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

class Strip {
  constructor(public min: number, public max: number) {}
}

enum Direction {
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
  NORTH = 4,
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

  async followInsructionsDammit() {
    let instrs = this.instructionString.slice(0);
    while (instrs.length > 0) {
      if (instrs.match(/^[0-9]/)) {
        let steps = parseInt(instrs);
        instrs = instrs.slice(`${steps}`.length);

        const curRow = this.rows[this.me.coord.y];
        const curCol = this.cols[this.me.coord.x];
        let nextX = this.me.coord.x;
        let nextY = this.me.coord.y;

        while (steps > 0) {
          switch (this.me.facing) {
            case Direction.EAST:
              nextX++;
              if (nextX > curRow.max) nextX = curRow.min;
              break;
            case Direction.WEST:
              nextX--;
              if (nextX < curRow.min) nextX = curRow.max;
              break;
            case Direction.NORTH:
              nextY--;
              if (nextY < curCol.min) nextY = curCol.max;
              break;
            case Direction.SOUTH:
              nextY++;
              if (nextY > curCol.max) nextY = curCol.min;
              break;
          }
          if (this.isWall(nextX, nextY)) {
            steps = 0;
          } else {
            this.me.coord.x = nextX;
            this.me.coord.y = nextY;
            steps--;
          }
        }
      } else if (instrs.startsWith('L')) {
        this.me.turnLeft();
        instrs = instrs.slice(1);
      } else if (instrs.startsWith('R')) {
        this.me.turnRight();
        instrs = instrs.slice(1);
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

    rows.push(new Strip(-1, -1));

    for (let x = 0; x < line.length; ++x) {
      if (columns[x] === undefined) {
        columns[x] = new Strip(-1, -1);
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

function printGrid(g: Grid) {
  console.clear();
  for (let y = 0; y < g.rows.length; ++y) {
    let rowStr = ' '.repeat(g.rows[y].min);
    for (let x = g.rows[y].min; x < g.rows[y].max; ++x) {
      if (g.me.coord.x === x && g.me.coord.y === y) {
        if (g.walls.has(xyToString(x, y))) throw 'impossible';  
      }
      else if (g.walls.has(xyToString(x, y))) rowStr += '#';
      else rowStr += '.';
    }
    console.log(rowStr);
  }
}

// 139080 is too high.
async function main1(filename: string) {
  const grid = await createGrid(filename);
  // printGrid(grid);
  grid.followInsructionsDammit();
  let row = grid.me.coord.y + 1;
  let column = grid.me.coord.x + 1;
  let facing = grid.me.facing - 1;
  console.log(1000 * row + 4 * column + facing);
}

main1('input.txt');
