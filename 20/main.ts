interface Numb {
  /** This number's value. */
  val: number;

  /** A pointer to the original next number. */
  originalNext?: Numb;
}

async function createNumbs(filename: string): Promise<Numb[]> {
  const numbs: Numb[] = [];
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (line.length === 0) continue;
    numbs.push({val: parseInt(line)});
  }
  for (let i = 0; i < numbs.length - 1; ++i) {
    numbs[i].originalNext = numbs[i + 1];
  }
  return numbs;
}

function findNthValue(i: number, numbs: Numb[]): number {
  const zeroIndex = numbs.findIndex(n => n.val === 0);
  const N = numbs.length;
  let nthIndex = zeroIndex + i;
  while (nthIndex < 0) nthIndex += N;
  while (nthIndex >= N) nthIndex -= N;

  return numbs[nthIndex].val;
}

/**
 * Moves n that number of spots in the array, taking into account circular
 * wrapping in numbs.
 */
function mixNumb(n: Numb, numbs: Numb[]) {
  const N = numbs.length;

  let oldIndex = numbs.indexOf(n);
  if (oldIndex === -1) throw `wuh`;

  const move = (n.val % (N - 1));
  let newIndex = oldIndex + move;
  // Even though it shouldn't matter, prefer negative-moving values to go at the
  // end of the list, not the beginning to match the AoC example.
  if (newIndex === 0 && n.val < 0) newIndex = N - 1;
  while (newIndex < 0) newIndex += (N - 1);
  while (newIndex >= N) newIndex -= (N - 1);

  // Pluck n from oldIndex.
  numbs.splice(oldIndex, 1);

  // Insert n into newIndex.
  numbs.splice(newIndex, 0, n);
}

async function main1(filename: string) {
  const numbs = await createNumbs(filename);
  let n: Numb|undefined = numbs[0];
  while (n) {
    mixNumb(n, numbs);
    n = n.originalNext;
  }

  const x = findNthValue(1000, numbs);
  const y = findNthValue(2000, numbs);
  const z = findNthValue(3000, numbs);

  console.log(x);
  console.log(y);
  console.log(z);

  let sum = x + y + z;
  console.log(sum);
}

const DECRYPTION_KEY = 811589153;
async function main2(filename: string) {
  const numbs = (await createNumbs(filename))
  numbs.forEach(n => n.val *= DECRYPTION_KEY);
  const first: Numb|undefined = numbs[0];

  for (let i = 0; i < 10; ++i) {
    let n: Numb|undefined = first;
    while (n) {
      mixNumb(n, numbs);
      n = n.originalNext;
    }
  }

  const x = findNthValue(1000, numbs);
  const y = findNthValue(2000, numbs);
  const z = findNthValue(3000, numbs);

  console.log(x);
  console.log(y);
  console.log(z);

  let sum = x + y + z;
  console.log(`sum = ${sum}`);
}

// main1('input.txt');
main2('input.txt');
