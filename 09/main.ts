const debug = false;

interface Knot {
  x: number;
  y: number;
  positions: Set<string>;
}

function distance(a: Knot, b: Knot): number {
  const deltaX = a.x - b.x;
  const deltaY = a.y - b.y;
  const dist = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
  if (debug) console.log(dist);
  return dist;
}

function areKnotsTouching(head: Knot, tail: Knot): boolean {
  return (distance(head, tail) < 2);
}

/** Returns a unique string of the position, to be used as a key. */
function getPosStr(pos: Knot): string {
  return `${pos.x},${pos.y}`;
}

function newKnot(x: number, y: number): Knot {
  const knot: Knot = {
    x,
    y,
    positions: new Set(),
  };
  knot.positions.add(getPosStr(knot));
  return knot;
}

function moveHeadOne(dir: string,head: Knot) {
  if (!['L','U','R','D'].includes(dir)) throw `bad dir=${dir}`;

  switch (dir) {
    case 'L': head.x--; break;
    case 'U': head.y--; break;
    case 'R': head.x++; break;
    case 'D': head.y++; break;
  }
  head.positions.add(getPosStr(head));
}

/** Moves the tail to be nearer the head, if necessary. */
function maybeMoveKnots(head: Knot, tail: Knot) {
  // Decide to move tail. Only moves if not touching.
  if (!areKnotsTouching(head, tail)) {
    // Move horizontally.
    if (head.x !== tail.x) {
      if (head.x < tail.x) tail.x--;
      else tail.x++;
    }
    // Move vertically.
    if (head.y !== tail.y) {
      if (head.y < tail.y) tail.y--;
      else tail.y++;
    }
    tail.positions.add(getPosStr(tail));
  }
}

async function main1() {
  const head = newKnot(0, 0);
  const tail = newKnot(0, 0);
  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    const [dirStr, numStr] = line.split(' ');
    const n = parseInt(numStr);
    for (let i = 0; i < n; ++i) {
      moveHeadOne(dirStr, head);
      maybeMoveKnots(head, tail);
    }
  }
  console.log(tail.positions.size);
}

async function main2() {
  const NUM_KNOTS = 10;
  const knots = new Array(NUM_KNOTS);
  for (let i = 0; i < NUM_KNOTS; ++i) { knots[i] = newKnot(0, 0); }

  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    const [dirStr, numStr] = line.split(' ');
    const n = parseInt(numStr);
    for (let i = 0; i < n; ++i) {
      moveHeadOne(dirStr, knots[0]);
      for (let k = 0; k < NUM_KNOTS - 1; ++k) {
        maybeMoveKnots(knots[k], knots[k+1]);
      }
    }
  }
  console.log(knots[NUM_KNOTS-1].positions.size);
}

//main1();
main2();
