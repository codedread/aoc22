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
   * row in the tower (bottom), so the falling blocks are 1-based indexing. The
   * lowest bit is the left-most position on the row.
   */
  tower: Uint8Array = new Uint8Array(INITIAL_SIZE);

  /**
   * Represents the gain in maxY once the nth block has landed on the tower.
   */
  growth: Uint8Array = new Uint8Array(INITIAL_SIZE);

  /** The y of the highest block on the Board. */
  maxY: number = 0;

  nextBlockIndex: number = 0;
  currentBlock: Block;
  /** The # of blocks that have landed. */
  numBlocks: number = 0;

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
    }
    while (this.maxY + n > this.growth.length) {
      const newBuf = new ArrayBuffer(this.growth.length + GROW_SIZE);
      const newArr = new Uint8Array(newBuf);
      newArr.set(this.growth);
      this.growth = newArr;
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
    const oldMaxY = this.maxY;
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
    this.growth[this.numBlocks] = (this.maxY - oldMaxY);
    this.numBlocks++;
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
  console.log('================');
  for (const s of board.print()) {
    console.log(s);
  }
  console.log(`currentBlock: ${board.currentBlock.leftX}, ${board.currentBlock.bottomY}`);
}

function printGrowth() {
  console.log('----------------');
  for (let h = 0; h < board.numBlocks + 10; ++h) {
    console.log(board.growth[h]);
  }
}

async function waitForEnterThenClear() {
  console.log('Press enter:');
  await Deno.stdin.read(buf);
  await clearTerm();
}

function initializeBoard() {
  board = new Board(BOARD_WIDTH);
  // printBoard();
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

  let numBlocksToFall = 2022;
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

    if (!board.moveCurrentBlock(0, -1)) {
      board.startNewBlock();
      curBlockNum++;
      if (curBlockNum % 100 === 0) {
        console.log(`Doing ${curBlockNum}th block`);
      }  
    }
  }
  printBoard();

  console.log(`Tower height = ${board.maxY}`);
}

function arrayIndexOf(arr: Uint8Array, subArr: Uint8Array, fromIndex: number): number {
  let found: boolean;
  const maxLen = arr.length - subArr.length + 1;
  // Loop from the from index to the end of possible sub-string matches.
  for (let i = fromIndex; i < maxLen; ++i) {
    found = true;
    // Now loop for the sub-array and check if we find it.
    for (let j = 0; j < subArr.length; ++j) {
      // On first non-match, break so we can increment i.
      if (arr[i + j] !== subArr[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  // If we get here, then found was never true - return -1.
  return -1;
}

function findAllSubArrayMatches(arr: Uint8Array, subArr: Uint8Array): number[] {
  const matchIndices: number[] = [];
  const L = subArr.length;
  let index = L;
  while (index < arr.length - L) {
    const matchIndex = arrayIndexOf(arr, subArr, index);
    if (matchIndex === -1) {
      break;
    }
    matchIndices.push(matchIndex);
    index = matchIndex + L;
  }

  return matchIndices;
}

// tiny.txt produces a block pattern that repeats every 53 rows.
// input.txt produces a pattern of blocks that repeats every 2785 lines.
async function main2(filename: string) {
  initializeBoard();

  let jetPattern = '';
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    jetPattern = line;
  }

  // Choose a large enough number that we capture the pattern repeating several
  // times (see below).
  let numBlocksToFall = 150000; // 2022; //1000000000000;
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

    if (!board.moveCurrentBlock(0, -1)) {
      board.startNewBlock();
      curBlockNum++;
    }
  }

  // The only way I could figure this being solved is to notice a pattern in the
  // output and then do some math. The pattern of blocks landing does repeat,
  // which means the pattern of how much the tower grows also repeats.
  // The goal is to find the start of a series of numbers that repeat
  // consistently with a delta that is a multiple of the number of blocks (5).

  // A sequence of 20 numbers long should be enough to guard against random
  // matches and not too long to lap the period of repetition.
  let sequenceLength = BLOCKS.length * 4;
  let testSequence = board.growth.subarray(0, sequenceLength);

  let found = false;
  let ind = 0;
  let matchIndices: number[] = [];
  while (!found) {
    testSequence = board.growth.subarray(ind, sequenceLength)
    matchIndices = findAllSubArrayMatches(board.growth, testSequence);
    if (matchIndices.length > 4) {
      found = true;
    } else {
      ind++;
    }
  }

  // Loop in reverse order and compare the delta between indices. If they are
  // all equal except for the first one, and the delta is a multiple of 5, then 
  // we found our first index. In fact, we know (by running the code and testing)
  // that this value is 1745).
  let deltas: number[] = [];
  for (let j = matchIndices.length - 1; j >= 1; --j) {
    const delta = matchIndices[j] - matchIndices[j - 1];
    deltas.push(delta);
  }

  deltas = deltas.filter(d => d === deltas[0]);
  if (deltas.length < 2) throw `something went very wrong`;
  const theDelta = deltas[0];

  const firstIndex = matchIndices[1];

  // Now sum up all the height gains to the first index.
  let initialSum = 0;
  for (let k = 0; k < firstIndex; ++k) {
    initialSum += board.growth[k];
  }

  // Now we find out how much each sequence of 1745 adds.
  let repeatingSum = 0;
  for (let k = firstIndex; k < firstIndex + theDelta; ++k) {
    repeatingSum += board.growth[k];
  }

  // Now we know that the height is initialSum + (m * repeatingSum) + anyRemainder.

  // I had an off-by-1 error here :(
  let N = 1000000000000 - firstIndex + 1;
  let totalSum = initialSum;
  const M = Math.floor(N / theDelta);
  const remainder = N - M * theDelta;
  totalSum += M * repeatingSum;
  for (let n = firstIndex; n < firstIndex + remainder; ++n) {
    totalSum += board.growth[n];    
  }
  console.log(totalSum);
}

// main1('input.txt');
main2('input.txt');
