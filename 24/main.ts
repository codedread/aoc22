/**
 * General idea:
 * - Have the blizzards moving along their path.
 * - Each minute, move the blizzards and then move the expedition to any open
 *   space, starting a path. Also start a path that waits in place.
 * - As minutes advance, if there are no spaces to move and a blizzard hits you,
 *   then kill that path.
 * - Since this puzzle is solvable, there must be some paths that reach the end.
 * - Pick the shortest path (the one that reaches it first).
 */

 enum Direction {
  NONE = 0,
  NORTH = 1,
  EAST = 2,
  SOUTH = 3,
  WEST = 4,
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

enum Action {
  START = 'START',
  WAIT = 'wait',
  MOVE_NORTH = 'move up',
  MOVE_EAST = 'move right',
  MOVE_SOUTH = 'move down',
  MOVE_WEST = 'move left',
}

interface PathNode {
  /** undefined for the root node. */
  parent?: PathNode;
  action: Action;
  /** Location after the action was taken. */
  loc: Coord;
  children: PathNode[];
}

class Grid {
  /** Tracks east blizzards. Address as [y][x]. */
  readonly eastBlizzards: boolean[][];
  /** Tracks west blizzards. Address as [y][x]. */
  readonly westBlizzards: boolean[][];
  /** Tracks north blizzards. Address as [x][y]. */
  readonly northBlizzards: boolean[][];
  /** Tracks south blizzards. Address as [x][y]. */
  readonly southBlizzards: boolean[][];

  /** The string representation of the start coord. */
  readonly start: Coord;
  /** The string representation of the finish coord. */
  readonly finish: Coord;

  /** How many minutes have elapsed. */
  mins: number;

  /** The current location of the expedition. */
  exp: Coord;

  /** A pointer to the left-most edge of the east blizzards. */
  eastPointer: number;
  /** A pointer to the left-most edge of the west blizzards. */
  westPointer: number;
  /** A pointer to the top-most edge of the north blizzards. */
  northPointer: number;
  /** A pointer to the top-most edge of the south blizzards. */
  southPointer: number;

  /** A map from minutes path to all path nodes at that minute. */
  paths: Map<number, PathNode[]>;

  /** width and height are minus the walls. */
  constructor(public width: number, public height: number,
              rawGrid: Direction[][]) {
    if (rawGrid.length !== height) throw 'bad rows';
    if (rawGrid[0].length !== width) throw 'bad cols';

    this.eastBlizzards = new Array(height);
    this.westBlizzards = new Array(height);
    this.northBlizzards = new Array(width);
    this.southBlizzards = new Array(width);

    for (let y = 0; y < height; ++y) {
      if (this.eastBlizzards[y] === undefined) {
        this.eastBlizzards[y] = new Array(width).fill(false);
      }
      if (this.westBlizzards[y] === undefined) {
        this.westBlizzards[y] = new Array(width).fill(false);
      }
      for (let x = 0; x < width; ++x) {
        if (this.northBlizzards[x] === undefined) {
          this.northBlizzards[x] = new Array(height).fill(false);
        }
        if (this.southBlizzards[x] === undefined) {
          this.southBlizzards[x] = new Array(height).fill(false);
        }
        switch (rawGrid[y][x]) {
          case Direction.NORTH: this.northBlizzards[x][y] = true; break;
          case Direction.EAST: this.eastBlizzards[y][x] = true; break;
          case Direction.SOUTH: this.southBlizzards[x][y] = true; break;
          case Direction.WEST: this.westBlizzards[y][x] = true; break;
        } 
      }
    }

    this.start = { x: 0, y: -1 };
    this.finish = { x: width - 1, y: height };
    this.mins = 0;

    this.exp = {...this.start};
    this.northPointer = 0;
    this.eastPointer = 0;
    this.westPointer = 0;
    this.southPointer = 0;

    const startPathNode: PathNode = {
      action: Action.START,
      loc: {...this.start},
      parent: undefined,
      children: [],
    };
    this.paths = new Map();
    this.paths.set(0, [startPathNode]);
  }

  getPrintableCharacter(x: number, y: number): string {
    const blizzards: string[] = [];
    const eastX = (x + this.eastPointer) % this.eastBlizzards[y].length;
    const westX = (x + this.westPointer) % this.westBlizzards[y].length;
    const northY = (y + this.northPointer) % this.northBlizzards[x].length;
    const southY = (y + this.southPointer) % this.southBlizzards[x].length;
    if (this.eastBlizzards[y][eastX]) {
      blizzards.push('>');
    }
    if (this.westBlizzards[y][westX]) {
      blizzards.push('<');
    }
    if (this.northBlizzards[x][northY]) {
      blizzards.push('^');
    }
    if (this.southBlizzards[x][southY]) {
      blizzards.push('v');
    }

    if (blizzards.length > 1) return blizzards.length + '';
    else if (blizzards.length === 1) return blizzards[0];
    else if (this.exp.x == x && this.exp.y === y) return 'E';
    return '.';
  }

  isEmpty(x: number, y: number): boolean {
    if (x < 0 || x >= this.width) return false;
    if (y < 0) return y === -1 && x === this.start.x;
    if (y >= this.height) return y === this.height && x === this.finish.x;
    const eastX = (x + this.eastPointer) % this.eastBlizzards[y].length;
    const westX = (x + this.westPointer) % this.westBlizzards[y].length;
    const northY = (y + this.northPointer) % this.northBlizzards[x].length;
    const southY = (y + this.southPointer) % this.southBlizzards[x].length;
    if (this.eastBlizzards[y][eastX]) return false;
    if (this.westBlizzards[y][westX]) return false;
    if (this.northBlizzards[x][northY]) return false;
    if (this.southBlizzards[x][southY]) return false;

    return true;
  }

  /**
   * Moves the blizzards and picks new actions for the expedition to take.
   * If paths to the exit are found, returns those paths.
   */
  advance(): PathNode[] {
    this.eastPointer--;
    if (this.eastPointer < 0) this.eastPointer = this.eastBlizzards[0].length - 1;

    this.southPointer--;
    if (this.southPointer < 0) this.southPointer = this.southBlizzards[0].length - 1;

    this.northPointer++;
    if (this.northPointer >= this.northBlizzards[0].length) this.northPointer = 0;

    this.westPointer++;
    if (this.westPointer >= this.westBlizzards[0].length) this.westPointer = 0;

    // Now grow the paths...
    const exitPaths: PathNode[] = [];
    // A map from location to path node. This ensures only 1 path node at this
    // level survives for each unique. location.
    let allChildPaths: Map<string, PathNode> = new Map();
    const allPaths = this.paths.get(this.mins)!;
    this.mins++;

    for (const path of allPaths) {
      const {x, y} = path.loc;

      // Check north.
      const c: Coord = { x: x, y: y - 1};
      if (this.isEmpty(c.x, c.y) && !allChildPaths.has(coordToString(c))) { //} && x !== this.start.x && (y - 1) !== this.start.y) {
        const newPath: PathNode = {
          parent: path,
          action: Action.MOVE_NORTH,
          loc: { ...c },
          children: [],
        };
        if (newPath.loc.x === this.finish.x && newPath.loc.y === this.finish.y) {
          exitPaths.push(newPath);
        }
        path.children.push(newPath);
        allChildPaths.set(coordToString(c), newPath);
      }

      // Check east.
      c.x = x + 1; c.y = y;
      if (this.isEmpty(c.x, c.y) && !allChildPaths.has(coordToString(c))) {
        const newPath: PathNode = {
          parent: path,
          action: Action.MOVE_EAST,
          loc: { ...c },
          children: [],
        };
        if (newPath.loc.x === this.finish.x && newPath.loc.y === this.finish.y) {
          exitPaths.push(newPath);
        }
        path.children.push(newPath);
        allChildPaths.set(coordToString(c), newPath);
      }
      
      // Check south.
      c.x = x; c.y = y + 1;
      if (this.isEmpty(c.x, c.y) && !allChildPaths.has(coordToString(c))) {
        const newPath: PathNode = {
          parent: path,
          action: Action.MOVE_SOUTH,
          loc: { ...c },
          children: [],
        };
        if (newPath.loc.x === this.finish.x && newPath.loc.y === this.finish.y) {
          exitPaths.push(newPath);
        }
        path.children.push(newPath);
        allChildPaths.set(coordToString(c), newPath);
      }

      // Check west.
      c.x = x - 1; c.y = y;
      if (this.isEmpty(c.x, c.y) && !allChildPaths.has(coordToString(c))) {
        const newPath: PathNode = {
          parent: path,
          action: Action.MOVE_WEST,
          loc: { ...c },
          children: [],
        };
        if (newPath.loc.x === this.finish.x && newPath.loc.y === this.finish.y) {
          exitPaths.push(newPath);
        }
        path.children.push(newPath);
        allChildPaths.set(coordToString(c), newPath);
      }

      // Since a blizzard did not land on us, we could wait...
      c.x = x; c.y = y;
      if (this.isEmpty(c.x, c.y) && !allChildPaths.has(coordToString(c))) {
        const newPath: PathNode = {
          parent: path,
          action: Action.WAIT,
          loc: { ...c },
          children: [],
        };
        path.children.push(newPath);
        allChildPaths.set(coordToString(c), newPath);
      }
    }

    console.log(`At ${this.mins} minutes, we have ${allChildPaths.size} paths.`);
    if (allChildPaths.size === 0) {
      throw `ye hath failed`;
    }

    this.paths.set(this.mins, Array.from(allChildPaths.values()));

    return exitPaths;
  }
}

async function loadGrid(filename: string): Promise<Grid> {
  // I trimmed out the blank lines in the inputs :P.
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  const gridHeight = lines.length - 2;
  const gridWidth = lines[0].length - 2;
  const rawGrid: Direction[][] = new Array(gridHeight);

  // Skip the first row as it is a wall.
  for (let y = 0; y < gridHeight; ++y) {
    rawGrid[y] = new Array(gridWidth).fill(Direction.NONE);
    // Add 1 to skip the north wall.
    const line = lines[y + 1];
    for (let x = 0; x < gridWidth; ++x) {
      // Add 1 because we ignore the west wall.
      const ch = line.charAt(x + 1);
      switch (ch) {
        case '^': rawGrid[y][x] = Direction.NORTH; break;
        case '>': rawGrid[y][x] = Direction.EAST; break;
        case 'v': rawGrid[y][x] = Direction.SOUTH; break;
        case '<': rawGrid[y][x] = Direction.WEST; break;
        case '.': break;
        default: throw `bad ch='${ch}'`;
      }
    }
  }
  return new Grid(gridWidth, gridHeight, rawGrid);
}

function printGrid(g: Grid) {
  console.clear();
  console.log(`Turn #${g.mins}, w=${g.width}, h=${g.height}`);
  console.log(`# of child paths at min ${g.mins} = ${g.paths.get(g.mins)!.length}`);
  let topStr = '#';
  if (g.exp.x === g.start.x && g.exp.y === g.start.y) {
    topStr += 'E';
  } else {
    topStr += '.';
  }
  topStr += '#'.repeat(g.width);
  console.dir(topStr);
  for (let y = 0; y < g.height; ++y) {
    let rowStr = '#';
    for (let x = 0; x < g.width; ++x) {
      rowStr += g.getPrintableCharacter(x, y);
    }
    rowStr += '#';
    console.log(rowStr);
  }
  let bottomStr = '#'.repeat(g.width);
  if (g.exp.x === g.finish.x && g.exp.y === g.finish.y) {
    bottomStr += 'E';
  } else {
    bottomStr += '.';
  }
  bottomStr += '#';
  console.log(bottomStr);
}

function printPath(p: PathNode) {
  const actions: Action[] = [];
  let n: PathNode|undefined = p;
  while (n) {
    actions.push(n.action);
    n = n.parent;
  }
  actions.reverse();
  for (const action of actions) {
    console.log(`action=${action}`);
  }
}

async function main1(filename: string) {
  const g = await loadGrid(filename);

  let endPaths;
  while (true) {
    endPaths = g.advance();
    if (endPaths.length > 0) {
      break;
    }      
  }
  console.log(`Found ${endPaths.length} exits in ${g.mins} minutes`);
}

main1('input.txt');
