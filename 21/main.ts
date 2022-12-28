interface Operation {
  /** Defined if deps is not defined. The number the monkey shouts. */
  num?: number;
  /** Defined if num is not defined. Two monkey names. */
  deps?: string[];
  /** Defined if num is not defined. +, -, *, or / */
  op?: string;
}

class Monkey {
  constructor(public name: string, public operation: Operation) {}

  do(): number {
    if (this.operation.num) return this.operation.num;
    if (!this.operation.deps) throw `buh`;
    if (!this.operation.op) throw 'bruh';
    if (!barrel.has(this.operation.deps[0])) throw `bruuh`;
    if (!barrel.has(this.operation.deps[1])) throw `bruuuh`;

    const monkeyA = barrel.get(this.operation.deps[0])!.do();
    const monkeyB = barrel.get(this.operation.deps[1])!.do();
    switch (this.operation.op) {
      case '+': return monkeyA + monkeyB;
      case '-': return monkeyA - monkeyB;
      case '*': return monkeyA * monkeyB;
      case '/': return monkeyA / monkeyB;
    }
    throw `bruuuuh!`;
  }
}

const barrel: Map<string, Monkey> = new Map();

async function createBarrel(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (line.length === 0) continue;
    const parts = line.split(': ');
    const monkeyName = parts[0];
    const bits = parts[1].split(' ');
    const op: Operation = {};
    if (bits.length === 1) op.num = parseInt(bits[0]);
    else if (bits.length === 3) {
      op.deps = [ bits[0], bits[2] ]
      op.op = bits[1];
    } else throw `how?`;
    if (barrel.has(monkeyName)) throw `wut?`;
    barrel.set(monkeyName, new Monkey(monkeyName, op));
  }
}

async function main1(filename: string) {
  await createBarrel(filename);
  console.log(`${barrel.get('root')!.do()}`)
}

main1('input.txt');
