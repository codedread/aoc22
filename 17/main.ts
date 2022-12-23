const buf = new Uint8Array(20);
async function clearTerm() {
  const p = Deno.run({
    cmd: ["clear"]
  });
  await p.status();
}

const AIR = 0;
const STONE = 1;
const FALLING_STONE = 2;
const WALL = 3;
const FLOOR = 4;

type Terrain = number;

/**
 * TODO:
 * - finding a repeating sequence should be easier by using
 *   indexOf(). If the index of a long-enough sequence always repeats over the
 *   exact same # of rows, then it's some simple math to figure out how the
 *   height changes over extremely large #s of blocks.
 * - note that the input is very large (10092 characters) which means to find
 *   a repeating sequence will require a large # of blocks to be processed.
 *   Each block will consume at least 3 "jet" symbols so this is at least
 *   10092 / 3 = 3364 blocks that need to drop before a repeating sequence can
 *   start to be searched for.
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

const INITIAL_SIZE = 4096;
const GROW_SIZE = 4096;

class Board {
  /**
   * Lower 7-bits are populated when stone is present. First byte is the lowest
   * row in the tower (bottom). Lowest bit is the left-most position on the row.
   */
  tower: Uint8Array = new Uint8Array(INITIAL_SIZE);

  /** The y of the highest block on the Board. */
  maxY: number = 0;

  nextBlockIndex: number = 0;
  currentBlock: Block;

  constructor(public width: number) {
    this.startNewBlock();
  }

  addRows(n: number) {
    if (n <= 0) throw `Bad n=${n}`;
    while (this.maxY + n > this.tower.length) {
      const newBuf = new ArrayBuffer(this.tower.length + GROW_SIZE);
      const newArr = new Uint8Array(newBuf);
      newArr.set(this.tower);
      this.tower = newArr;
      console.log(`Tower array now size ${this.tower.length} with first byte = ${this.tower[0]}`)
    }
  }

  /** Returns true if the block moved successfully. */
  moveCurrentBlock(dx: number, dy: number): boolean {
    // Try to move the block in the proposed direction.
    for (let by = 0; by < this.currentBlock.terrain.length; ++by) {
      let bitPos = this.currentBlock.leftX - 1 + dx;
      for (let bx = 0; bx < this.currentBlock.terrain[by].length; ++bx) {
        let y = by + this.currentBlock.bottomY;
        let x = bx + this.currentBlock.leftX;

        if (x + dx < 1 || x + dx > this.width) return false;
        if (y + dy < 1) return false;
        if (this.currentBlock.terrain[by][bx] !== AIR &&
            this.tower[y+dy] & (2 ** bitPos)) {
          return false;
        }
        bitPos++;
      }
    }

    this.currentBlock.bottomY += dy;
    this.currentBlock.leftX += dx;

    return true;
  }

  print(): string[] {
    const strs: string[] = [];
    strs.push('-'.repeat(this.width + 2));

    // Start y at 1 because 0 is the floor in the old board and bottomY is set based on this.
    for (let y = 1; y <= this.maxY + this.currentBlock.terrain.length + 3; ++y) {
      let rowStr = '|';
      let bitPos = 0;
      for (let x = 0; x < this.width; ++x) {
        if (y >= this.currentBlock.bottomY &&
            y < this.currentBlock.bottomY + this.currentBlock.terrain.length &&
            x >= this.currentBlock.leftX - 1 &&
            x < this.currentBlock.leftX - 1 + this.currentBlock.terrain[0].length) {
          let bx = x - (this.currentBlock.leftX - 1);
          let by = y - (this.currentBlock.bottomY);
          if (this.currentBlock.terrain[by][bx] === FALLING_STONE) {
            rowStr += '@';
          } else {
            rowStr += '.';
          }
        } else {
          if (this.tower[y] & (2 ** bitPos)) {
            rowStr += '#';
          } else {
            rowStr += '.';
          }
        }
        bitPos++;
      }
      rowStr += '|';
      strs.push(rowStr);
    }

    return strs.reverse();
  }

  startNewBlock() {
    // If the current block exists, then update the grid (turn falling stone
    // into stone).
    if (this.currentBlock) {
      for (let by = 0; by < this.currentBlock.terrain.length; ++by) {
        let bitPos = this.currentBlock.leftX - 1;
        let y = by + this.currentBlock.bottomY;
        let towerNum = this.tower[y];
        for (let bx = 0; bx < this.currentBlock.terrain[by].length; ++bx) {
          let x = bx + this.currentBlock.leftX;
          if (this.currentBlock.terrain[by][bx] !== AIR) {
            towerNum += 2 ** bitPos;
          }
          ++bitPos;
        }
        this.tower[y] = towerNum;
      }
      // Set new maxY.
      for (let y = Math.max(1, this.maxY); y < this.tower.length; ++y) {
        if (this.tower[y] === 0) {
          break;
        }
        this.maxY = y;
      }
    }

    // Set and position the new block...
    this.currentBlock = BLOCKS[this.nextBlockIndex];
    this.currentBlock.bottomY = this.maxY + 4;
    this.currentBlock.leftX = 3; // 0 is the wall, starts two blocks in from that.

    let newTop = this.currentBlock.bottomY + this.currentBlock.terrain.length;
    if (newTop > this.tower.length) {
      this.addRows(newTop - this.tower.length);
    }
    this.nextBlockIndex++;
    if (this.nextBlockIndex >= BLOCKS.length) this.nextBlockIndex = 0;
  }  
}

const BOARD_WIDTH = 7;
let board: Board;

function printBoard() {
  console.log('----------------');
  for (const s of board.print()) {
    console.log(s);
  }
  console.log(`currentBlock: ${board.currentBlock.leftX}, ${board.currentBlock.bottomY}`);
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
  await clearTerm();
  initializeBoard();
  // await waitForEnterThenClear();

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
    // console.log(`current block num = ${curBlockNum}, maxY = ${board.maxY}`);
    // await waitForEnterThenClear();
  }
  printBoard();

  console.log(`Tower height = ${board.maxY}`);
}

// tiny.txt produces a block pattern that repeats every 53 rows.
// input.txt produces a pattern of blocks that repeats every 2785 lines.
async function main2() {

}

main1('tiny.txt');
