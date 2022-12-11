interface Operation {
  type: 'add' | 'mult' | 'exp';
  val: number;
  fn: (w: number) => number,
}

interface WorryLevel {
  // At high enough values this will lose accuracy.
  value: number;
  // Tracks the remainder values when dividing by a given number.
  remainders: Map<number, number>;
}

interface Item {
  worryLevel: WorryLevel;
}

interface Monkey {
  items: Item[];
  op: Operation;
  divisibleBy: number;
  succeedMonkeyNumber: number;
  failMonkeyNumber: number;
  inspectCount: number;
}

function createOp(s: string): Operation {
  const eqn = s.split('Operation: new = ')[1];
  const parts = eqn.split(' ');
  if (parts[0] !== 'old') throw `Bad op: ${s}`;
  if (parts[1] === '+') {
    if (parts[2] === 'old') {
      return { type: 'mult', val: 2, fn: (w) => w * 2 };
    } else {
      return { type: 'add', val: parseInt(parts[2]), fn: (w) => w + parseInt(parts[2]) };
    }
  } else if (parts[1] === '*') {
    if (parts[2] === 'old') {
      return { type: 'exp', val: 2, fn: (w) => Math.pow(w, 2) };
    } else {
      return { type: 'mult', val: parseInt(parts[2]), fn: (w) => w * parseInt(parts[2]) };
    }
  }
  throw `Really bad op: ${s}`;
}

async function readMonkeySpecs(filename: string): Promise<Monkey[]> {
  const monkeys: Monkey[] = [];
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    if (lines[i].startsWith('Monkey ')) {
      const monkey: Monkey = {
        items: lines[i+1].split(': ')[1]
                 .split(', ')
                 .map(n => {
                  return {
                    worryLevel: {
                      value: parseInt(n),
                      remainders: new Map(),
                    },
                  };
                 }),
        op: createOp(lines[i+2]),
        divisibleBy: parseInt(lines[i+3].split('Test: divisible by ')[1]),
        succeedMonkeyNumber: parseInt(lines[i+4].split('If true: throw to monkey ')[1]),
        failMonkeyNumber: parseInt(lines[i+5].split('If false: throw to monkey ')[1]),
        inspectCount: 0,
      };
      monkeys.push(monkey);
    }
  }

  // Set up remainder map for all items.
  for (const monkey of monkeys) {
    for (const item of monkey.items) {
      for (const divisor of monkeys.map(m => m.divisibleBy)) {
        item.worryLevel.remainders.set(divisor, item.worryLevel.value % divisor);
      }
    }
  }

  return monkeys;
}

// Relies on the worry level value.
function runRound(monkeys: Monkey[]) {
  for (const monkey of monkeys) {
    for (const item of monkey.items) {
      // Inspect item.
      item.worryLevel.value = monkey.op.fn(item.worryLevel.value);
      monkey.inspectCount++;
      // Relief that there is no damage.
      item.worryLevel.value = Math.floor(Number(item.worryLevel.value / 3));
      // Test item.
      let monkeyIndex = (item.worryLevel.value % monkey.divisibleBy) === 0 ?
          monkey.succeedMonkeyNumber :
          monkey.failMonkeyNumber;
      if (monkeyIndex < 0 || monkeyIndex >= monkeys.length) {
        throw `Bad monkey index: ${monkeyIndex}`;
      }
      // Throw item to monkey.
      monkeys[monkeyIndex].items.push(item);
    }
    monkey.items = [];
  }
}

/**
 * Adjusts all the item's remainders by performing all operations on the remainders.
 * Also, the monkey's inspectCount is incremented.
 */
function inspectItem(monkey: Monkey, item: Item) {
  const worry = item.worryLevel;
  worry.value = monkey.op.fn(worry.value);
  for (const divisor of worry.remainders.keys()) {
    let r = worry.remainders.get(divisor)!;
    const op = monkey.op;
    switch (op.type) {
      case 'add': r = (r + op.val) % divisor; break;
      case 'mult': r = (r * op.val) % divisor; break;
      case 'exp': r = (Math.pow(r, op.val)) % divisor; break;
    }
    worry.remainders.set(divisor, r);
  }
  monkey.inspectCount++;
}

// Only uses the remainder values.
function runBigRound(monkeys: Monkey[]) {
  for (const monkey of monkeys) {
    for (const item of monkey.items) {
      // Inspect item.
      inspectItem(monkey, item);
      // Test item.
      let monkeyIndex = item.worryLevel.remainders.get(monkey.divisibleBy) === 0 ?
          monkey.succeedMonkeyNumber :
          monkey.failMonkeyNumber;
      if (monkeyIndex < 0 || monkeyIndex >= monkeys.length) {
        throw `Bad monkey index: ${monkeyIndex}`;
      }
      // Throw item to monkey.
      monkeys[monkeyIndex].items.push(item);
    }
    monkey.items = [];
  }
}

async function main1() {
  const monkeys = await readMonkeySpecs('input.txt');
  for (let i = 0; i < 20; ++i) {
    runRound(monkeys);
  }
  monkeys.sort((a, b) => a.inspectCount > b.inspectCount ? -1 : 1);

  let topMonkey = monkeys[0];
  let secondBanana = monkeys[1];
  console.log(topMonkey.inspectCount * secondBanana.inspectCount);
}

async function main2() {
  const monkeys = await readMonkeySpecs('input.txt');
  for (let i = 0; i < 10000; ++i) {
    runBigRound(monkeys);
  }
  monkeys.sort((a, b) => a.inspectCount > b.inspectCount ? -1 : 1);

  let topMonkey = monkeys[0];
  let secondBanana = monkeys[1];
  console.log(topMonkey.inspectCount * secondBanana.inspectCount);
}

// main1();
main2();
