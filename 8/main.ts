interface Tree {
  treeHeight: number;
}

interface Grid {
  width: number;
  height: number;
  trees: Tree[][];
}

function getTreeAt(x: number, y: number): Tree {
  const tree = grid.trees[y][x];
  if (!tree) throw `bad tree (${x}, ${y})`;
  return tree;
}

let grid: Grid;

function isTreeVisible(x: number, y: number): boolean {
  if (x < 0 || x >= grid.width) throw `bad x=${x}`;
  if (y < 0 || y >= grid.height) throw `bad y=${y}`;
  const tree = getTreeAt(x, y);

  const heightToBeat = tree.treeHeight;
  // Try from left:
  let isVisible = true;
  for (let i = 0; i < x; ++i) {
    if (getTreeAt(i, y).treeHeight >= heightToBeat) {
      isVisible = false;
      break;
    }
  }
  if (isVisible) return true;

  // Try from top:
  isVisible = true;
  for (let i = 0; i < y; ++i) {
    if (getTreeAt(x, i).treeHeight >= heightToBeat) {
      isVisible = false;
      break;
    }
  }
  if (isVisible) return true;

  // Try from right:
  isVisible = true;
  for (let i = grid.width - 1; i > x; --i) {
    if (getTreeAt(i, y).treeHeight >= heightToBeat) {
      isVisible = false;
      break;
    }
  }
  if (isVisible) return true;

  // Try from bottom:
  isVisible = true;
  for (let i = grid.height - 1; i > y; --i) {
    if (getTreeAt(x, i).treeHeight >= heightToBeat) {
      isVisible = false;
      break;
    }
  }

  return isVisible;
}

function getScenicScore(x: number, y: number): number {
  if (x < 1 || x >= grid.width - 1) throw `bad x=${x}`;
  if (y < 1 || y >= grid.height - 1) throw `bad y=${y}`;
  const heightToBeat = getTreeAt(x, y).treeHeight;

  let leftScore = 0,
      downScore = 0,
      upScore = 0,
      rightScore = 0;

  // Look left...
  for (let i = x - 1; i >= 0; --i) {
    leftScore++;
    if (getTreeAt(i, y).treeHeight >= heightToBeat) break;
  }

  // Look down...
  for (let i = y + 1; i < grid.height; ++i) {
    downScore++;
    if (getTreeAt(x, i).treeHeight >= heightToBeat) break;
  }

  // Look up...
  for (let i = y - 1; i >= 0; --i) {
    upScore++;
    if (getTreeAt(x, i).treeHeight >= heightToBeat) break;
  }

  // Look right...
  for (let i = x + 1; i < grid.width; ++i) {
    rightScore++;
    if (getTreeAt(i, y).treeHeight >= heightToBeat) break;
  }

  // Turn the world magenta

  return leftScore * downScore * upScore * rightScore;
}

async function constructGrid() {
  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  for (const line of lines) {
    if (line.length > 0) {
      if (!grid) {
        grid = {
          width: line.length,
          height: 0,
          trees: [],
        };
      }

      const treeRow: Tree[] = [];
      for (let i = 0; i < line.length; ++i) {
        treeRow.push({
          treeHeight: parseInt(line.charAt(i)),
        });
      }

      if (grid.width !== treeRow.length) throw `bad grid`;

      grid.trees.push(treeRow);
      grid.height++;
    }
  }
  if (grid.width !== grid.trees[0].length) throw `bad width`;
  if (grid.height !== grid.trees.length) throw `bad height`;
  console.log(`Grid is ${grid.width} wide and ${grid.height} tall`);
}

async function main1() {
  await constructGrid();
  let visibleCount = 0;
  for (let y = 0; y < grid.height; ++y) {
    for (let x = 0; x < grid.width; ++x) {
      if (isTreeVisible(x, y)) visibleCount++;
    }
  }
  console.log(visibleCount);
}

async function main2() {
  await constructGrid();
  let bestScenicScore = 0, bestX = 0, bestY = 0;
  // None of the edges can be scenic, since at least one direction
  // score will be 0.
  for (let y = 1; y < grid.height - 1; ++y) {
    for (let x = 1; x < grid.width - 1; ++x) {
      const newScore = getScenicScore(x, y);
      if (newScore > bestScenicScore) {
        bestScenicScore = newScore;
        bestX = x; bestY = y;
      }
    }
  }
  console.log([bestScenicScore, bestX, bestY]);
}

//main1();
main2();
