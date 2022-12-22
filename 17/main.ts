const buf = new Uint8Array(20);
async function clearTerm() {
  const p = Deno.run({
    cmd: ["clear"]
  });
  await p.status();
}
clearTerm();

const AIR = 0;
const STONE = 1;
const FALLING_STONE = 2;
const WALL = 3;
const FLOOR = 4;

type Terrain = number;

/**
 * TODO:
 * - we have the problem of the cheap-o solution I used to copy the entire
 *   array on every block move. Instead, it might be easier to not copy, but
 *   only mutate the array in-place (with careful undo semantics if a collision
 *   occurs).
 * - another thing to consider is how the board is stored. Currently each row in
 *   the board stores 9 characters, which is (I think) 18 bytes per row on the
 *   board even though the walls are static and the only interesting thing is
 *   whether those 7 inner spaces are air or stone.
 * - change how the Board is stored, either:
 *   - modelled as a string (with each ASCII character representing a single row
 *     on the board). This means re-creating the string every time a row changes
 *     state, which could get very expensive with very tall boards
 *   OR
 *   - modelled as an array (with each row representing 8-bits). This means you
 *     could pack a number of rows into a single value in the array. If we
 *     choose 5 (the number of types of blocks), then every 5 rows is
 *     represented by a single #. Arrays being mutable make this particularly
 *     easy to update and extend.
 * - in either case, finding a repeating sequence should be easier by using
 *   indexOf(). If the index of a long-enough sequence always repeats over the
 *   exact same # of rows, then it's some simple math to figure out how the
 *   height changes over extremely large #s of blocks.
 */

interface Block {
  /** The y-coordinate of the bottom-most squares. */
  bottomY: number;
  /** The X-coordinate of the left-most squares. */
  leftX: number;

  /**
   * The arrays are always the same size and in reverse-y order.
   * For example,
   *
   * ..#
   * ..#
   * ###
   *
   * would be realized as [[2, 2, 2], [0, 0, 2], [0, 0, 2]].
   *
   * The bottom-left corner is always represented by terrain[0][0].
   */
  terrain: Terrain[][];
}

const BLOCKS: Block[] = [
  // Horizontal line.
  {
    terrain: [
      [FALLING_STONE, FALLING_STONE, FALLING_STONE, FALLING_STONE],
    ],
    bottomY: -1, leftX: -1,
  },
  // Cross
  {
    terrain: [
      [AIR, FALLING_STONE, AIR],
      [FALLING_STONE, FALLING_STONE, FALLING_STONE],
      [AIR, FALLING_STONE, AIR],
    ],
    bottomY: -1, leftX: -1,
  },
  // Backwards-L.
  {
    terrain: [
      [FALLING_STONE, FALLING_STONE, FALLING_STONE],
      [AIR, AIR, FALLING_STONE],
      [AIR, AIR, FALLING_STONE],
    ],
    bottomY: -1, leftX: -1,
  },
  // Vertical line.
  {
    terrain: [
      [FALLING_STONE],
      [FALLING_STONE],
      [FALLING_STONE],
      [FALLING_STONE],
    ],
    bottomY: -1, leftX: -1,
  },
  // Square block.
  {
    terrain: [
      [FALLING_STONE, FALLING_STONE],
      [FALLING_STONE, FALLING_STONE],
    ],
    bottomY: -1, leftX: -1,
  },
];

class Board {
  grid: Terrain[][] = [];

  /** The y of the highest block on the Board. */
  maxY: number = 0;

  /** The y of the lowest block on the Board. */
  floorY: number = 0;

  nextBlockIndex: number = 0;
  currentBlock: Block;

  constructor(public width: number) {
    this.grid.push(new Array<Terrain>(this.width + 2).fill(FLOOR));
    this.startNewBlock();
  }

  addRows(n: number) {
    if (n <= 0) throw `Bad n=${n}`;
    const newRow = new Array<Terrain>(this.width + 2).fill(AIR);
    newRow[0] = WALL;
    newRow[this.width + 1] = WALL;
    while (n > 0) {
      this.grid.push([...newRow]);
      n--;
    }
  }

  /** Returns true if the block moved successfully. */
  moveCurrentBlock(dx: number, dy: number): boolean {
    // Try to move the block in the proposed direction.
    const newGrid = structuredClone(this.grid);
    for (let by = 0; by < this.currentBlock.terrain.length; ++by) {
      for (let bx = 0; bx < this.currentBlock.terrain[by].length; ++bx) {
        let y = by + this.currentBlock.bottomY;
        let x = bx + this.currentBlock.leftX;

        // Remove block first so it doesn't interfere with itself.
        if (this.currentBlock.terrain[by][bx] !== AIR) {
          newGrid[y][x] = AIR;
        }
      }
    }

    for (let by = 0; by < this.currentBlock.terrain.length; ++by) {
      for (let bx = 0; bx < this.currentBlock.terrain[by].length; ++bx) {
        let y = by + this.currentBlock.bottomY;
        let x = bx + this.currentBlock.leftX;
        // Something blocks your way... abandon everything...
        if (this.currentBlock.terrain[by][bx] !== AIR &&
            newGrid[y + dy][x + dx] !== AIR) {
          return false;
        }
        if (this.currentBlock.terrain[by][bx] !== AIR) {
          newGrid[y + dy][x + dx] = this.currentBlock.terrain[by][bx];
        }
      }
    }

    this.grid = newGrid;
    this.currentBlock.bottomY += dy;
    this.currentBlock.leftX += dx;

    // const CHOP = 100;
    // if (this.grid.length > CHOP) {
    //   const linesChopped = this.grid.length - CHOP;
    //   this.grid = this.grid.slice(-CHOP);
    //   this.currentBlock.bottomY -= linesChopped;
    //   this.maxY -= linesChopped;
    //   this.floorY += linesChopped;
    // }
    return true;
  }

  print(): string[] {
    const strs: string[] = [];
    for (let y = 0; y <  this.grid.length; ++y) {
      let rowStr = '';
      for (let x = 0; x < this.width + 2; ++x) {
        switch (this.grid[y][x]) {
          case AIR           : rowStr += '.'; break;
          case STONE         : rowStr += '#'; break;
          case FALLING_STONE : rowStr += '@'; break;
          case FLOOR         : rowStr += '-'; break;
          case WALL          : rowStr += '|'; break;
        }
      }
      strs.push(rowStr);
    }

    return strs.reverse();
  }

  startNewBlock() {
    // If the current block exists, then update the grid (turn falling stone
    // into stone).
    if (this.currentBlock) {
      for (let by = 0; by < this.currentBlock.terrain.length; ++by) {
        for (let bx = 0; bx < this.currentBlock.terrain[by].length; ++bx) {
          // console.log(`bottomY = ${this.currentBlock.bottomY}`);
          let y = by + this.currentBlock.bottomY;
          let x = bx + this.currentBlock.leftX;
          if (this.currentBlock.terrain[by][bx] !== AIR) {
            this.grid[y][x] = STONE;
          }
        }
      }
      // Set new maxY.
      let foundMaxY = false;
      for (let y = this.grid.length - 1; y >= 0; --y) {
        for (let x = 1; x < this.grid[y].length - 1; ++x) {
          if (this.grid[y][x] === STONE) {
            this.maxY = y;
            foundMaxY = true;
            break;
          }
        }
        if (foundMaxY) break;
      }
    }

    // Set and position the new block...
    // console.log(`maxY is ${this.maxY}`);
    this.currentBlock = BLOCKS[this.nextBlockIndex];
    this.currentBlock.bottomY = this.maxY + 4;
    this.currentBlock.leftX = 3; // 0 is the wall, starts two blocks in from that.
    // console.log(`newBlock is ${JSON.stringify(this.currentBlock)}`);

    let newTop = this.currentBlock.bottomY + this.currentBlock.terrain.length;
    // console.log(`newTop = ${newTop}`);
    // console.log(`grid length = ${this.grid.length}`);
    if (newTop > this.grid.length) {
      // console.log(`Added ${newTop - this.grid.length} new rows`);
      this.addRows(newTop - this.grid.length);
    }
    this.nextBlockIndex++;
    if (this.nextBlockIndex >= BLOCKS.length) this.nextBlockIndex = 0;

    // Update grid. It is safe to do because of the positioning rules.
    for (let by = 0; by < this.currentBlock.terrain.length; ++by) {
      for (let bx = 0; bx < this.currentBlock.terrain[by].length; ++bx) {
        let y = by + this.currentBlock.bottomY;
        let x = bx + this.currentBlock.leftX;

        if (this.currentBlock.terrain[by][bx] !== AIR) {
          this.grid[y][x] = this.currentBlock.terrain[by][bx];
        }
      }
    }
  }  
}

const BOARD_WIDTH = 7;
let board: Board;

function printBoard() {
  console.log('----------------');
  for (const s of board.print()) {
    console.log(s);
  }
}

async function waitForEnterThenClear() {
  console.log('Press enter:');
  await Deno.stdin.read(buf);
  await clearTerm();
}

function initializeBoard() {
  board = new Board(BOARD_WIDTH);
  printBoard();
}

async function main1(filename: string) {
  initializeBoard();

  let jetPattern = '';
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    jetPattern = line;
  }

  let numBlocksToFall = 2022; //1000000000000;
  let curBlockNum = 1;
  let patternPos = 0;
  while (curBlockNum <= numBlocksToFall) {
    const ch = jetPattern.charAt(patternPos);
    patternPos++;
    if (patternPos >= jetPattern.length) {
      patternPos = 0;
    }

    if (ch === '>') {
      board.moveCurrentBlock(1, 0);
    } else if (ch === '<') {
      board.moveCurrentBlock(-1, 0);
    } else {
      throw `bad juju: ${ch}`;
    }

    // printBoard();
    // await waitForEnterThenClear();

    if (!board.moveCurrentBlock(0, -1)) {
      board.startNewBlock();
      curBlockNum++;
      if (curBlockNum % 100 === 0) {
        console.log(`Doing ${curBlockNum}th block`);
      }  
    }

    // printBoard();
    // console.log(`current block num = ${curBlockNum}, maxY = ${board.maxY}, board height = ${board.grid.length}`);
    // await waitForEnterThenClear();
  }
  printBoard();

  console.log(`Tower height = ${board.floorY + board.maxY}, grid height = ${board.grid.length}`);
}

main1('input.txt');
