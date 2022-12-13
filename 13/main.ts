enum Result {
  ORDER = -1,
  OUT_OF_ORDER = 1,
  INDETERMINATE = 0,
}

// Recursive type alias.
// Thank you Typescript!
type Value = number | Value[];

interface Pair {
  left: Value[];
  right: Value[];
}

/**
 * Returns -1 (ORDER) if the values are in the right order.
 * Returns 1 (OUT_OF_ORDER) if the values are in the wrong order.
 * Returns 0 (INDETERMINATE) otherwise.
 */
function compareTwoValues(v1: Value, v2: Value): Result {
  if (typeof v1 === 'number' && typeof v2 === 'number') {
    return (v1 < v2) ? Result.ORDER
             : (v1 > v2) ? Result.OUT_OF_ORDER
               : Result.INDETERMINATE;
  } else if (v1 instanceof Array && v2 instanceof Array) {
    let arrResult: Result;
    for (let i = 0; i < v1.length; ++i ) {
      // Right array ran out of values.
      if (v2.length < i + 1) {
        return Result.OUT_OF_ORDER;
      }
      arrResult = compareTwoValues(v1[i], v2[i]);
      if (arrResult !== Result.INDETERMINATE) {
        return arrResult;
      }
    }
    // Left array ran out of values.
    if (v1.length < v2.length) return Result.ORDER;
    return Result.INDETERMINATE;
  } else {
    if (v1 instanceof Array) return compareTwoValues(v1, [v2]);
    return compareTwoValues([v1], v2);
  }
}

// Thank you JSON!
function createPair(s1: string, s2: string): Pair {
  return {left: JSON.parse(s1), right: JSON.parse(s2)};
}

async function part1(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  let sum = 0;
  for (let i = 0; i < lines.length; i += 3) {
    const pairNum = Math.floor(i/3) + 1;
    const pair = createPair(lines[i], lines[i+1]);
    const result = compareTwoValues(pair.left, pair.right);
    if (result === Result.ORDER) {
      sum += pairNum;
    }
  }
  console.log(sum);
}

async function part2(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  const packets: Value[][] = [];
  for (let i = 0; i < lines.length; i += 3) {
    const pair = createPair(lines[i], lines[i+1]);
    packets.push(pair.left, pair.right);
  }
  // Divider packets.
  const divider1: Value[] = [[2]];
  const divider2: Value[] = [[6]];
  packets.push(divider1);
  packets.push(divider2);

  // Thank you JavaScript sort!
  packets.sort(compareTwoValues);

  const dInd1 = packets.indexOf(divider1) + 1;
  const dInd2 = packets.indexOf(divider2) + 1;
  console.log(dInd1 * dInd2);
}

// part1('input.txt');
part2('input.txt');