
interface MoveInstruction {
  numberCrates: number;
  /** 1-indexed. */
  fromColumn: number;
  /** 1-indexed. */
  toColumn: number;
}

interface CrateStack {
  /** The first element is the bottom, the last element is the top. */
  crates: string[];
}

async function main1() {
  const instructions: MoveInstruction[] = [];
  const stacks: CrateStack[] = new Array(9);
  for (let s = 0; s < 9; ++s) {
    stacks[s] = {crates: []};
  }

  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  for (const line of lines) {
    if (line.includes('[')) {
      // Crate letters appear at indices 1, 5, 9, 13, etc.
      for (let i = 1; i < line.length; ++i) {
        let n = (i - 1);
        if ((n % 4) === 0) {
          const ch = line.charAt(i);
          if (ch >= 'A' && ch <= 'Z') {
            stacks[n/4].crates.unshift(ch);
          }
        }
      }
    } else if (line.includes('move ')) {
      const parts = line.split(' ');
      instructions.push({
        numberCrates: parseInt(parts[1]),
        fromColumn: parseInt(parts[3]),
        toColumn: parseInt(parts[5]),
      });
    }
  }

  for (const inst of instructions) {
    for (let i = 0; i < inst.numberCrates; ++i) {
      if (stacks[inst.fromColumn - 1].crates.length === 0) {
        throw `Stack ${inst.fromColumn} is empty`;
      }
      const crate = stacks[inst.fromColumn - 1].crates.pop();
      stacks[inst.toColumn - 1].crates.push(crate as string);
    }
  }

  let answer = '';
  for (const stack of stacks) {
    const stackLength = stack.crates.length;
    answer += stack.crates[stackLength - 1];
  }
  console.log(answer);
}


async function main2() {
  const instructions: MoveInstruction[] = [];
  const stacks: CrateStack[] = new Array(9);
  for (let s = 0; s < 9; ++s) {
    stacks[s] = {crates: []};
  }

  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  for (const line of lines) {
    if (line.includes('[')) {
      // Crate letters appear at indices 1, 5, 9, 13, etc.
      for (let i = 1; i < line.length; ++i) {
        let n = (i - 1);
        if ((n % 4) === 0) {
          const ch = line.charAt(i);
          if (ch >= 'A' && ch <= 'Z') {
            stacks[n/4].crates.unshift(ch);
          }
        }
      }
    } else if (line.includes('move ')) {
      const parts = line.split(' ');
      instructions.push({
        numberCrates: parseInt(parts[1]),
        fromColumn: parseInt(parts[3]),
        toColumn: parseInt(parts[5]),
      });
    }
  }
  console.dir(stacks);
  console.log(`===============================`);

  for (const inst of instructions) {
    const crates = stacks[inst.fromColumn - 1].crates.slice(-inst.numberCrates);
    for (let j = 0; j < inst.numberCrates; ++j) stacks[inst.fromColumn - 1].crates.pop();
    stacks[inst.toColumn - 1].crates = stacks[inst.toColumn - 1].crates.concat(crates);
  }

  console.dir(stacks);
  console.log(`===============================`);
  let answer = '';
  for (const stack of stacks) {
    const stackLength = stack.crates.length;
    answer += stack.crates[stackLength - 1];
  }
  console.log(answer);
}

// main1();
main2();