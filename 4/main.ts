console.log(`Hello, world!`);

/** Returns true if r1 completely overlaps with r2. */
function doesFullOverlap(r1: number[], r2: number[]): boolean {
  return (r1[0] >= r2[0]) && (r1[1] <= r2[1]);
}

function doesPartialOverlap(r1: number[], r2: number[]): boolean {
  return (r1[1] >= r2[0]) && (r1[1] <= r2[1]);
}

async function _main1() {
  const lines = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    if (line.length === 0) continue;
    const [range1, range2] = line.split(',').map(r => r.split('-').map(n => parseInt(n)));

    if (doesFullOverlap(range1, range2) || doesFullOverlap(range2, range1)) {
      count++;
    }
  }
  console.log(count);
}

async function main2() {
  const lines = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    if (line.length === 0) continue;
    const [range1, range2] = line.split(',').map(r => r.split('-').map(n => parseInt(n)));

    if (doesPartialOverlap(range1, range2) || doesPartialOverlap(range2, range1)) {
      count++;
    }
  }
  console.log(count);
}

main2();