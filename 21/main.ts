type allowedOps = '+' | '-' | '*' | '/' | '=';

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
    if (this.name === 'humn') throw 'brat';
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

  has(dep: string): boolean {
    if (this.name === dep) return true;
    if (this.operation.num) return false;
    if (!this.operation.deps) throw 'is this even possible?';
    // Shortcut instead of looking for monkeys in the barrel.
    if (this.operation.deps.includes(dep)) return true;
    // Go searching in the barrel.
    return (barrel.get(this.operation.deps[0])!.has(dep) ||
        barrel.get(this.operation.deps[1])!.has(dep));
  }

  /**
   * Returns what the human must yell such that this monkey's operation
   * results in result.
   */
  match(result: number = 0): number {
    if (!this.operation.deps) throw `Don't call match() on an end monkey, you chimp!`;
    const depMonkeys: Monkey[] = [
      barrel.get(this.operation.deps![0])!,
      barrel.get(this.operation.deps![1])!,
    ];
    const humanDepNum = (depMonkeys[0].has(HUMAN_NAME) ? 0 : 1);
    const val = depMonkeys[1 - humanDepNum].do();
    let newResult: number;
    switch (this.operation.op) {
      case '=':
        // val = human
        newResult = val;
        break;
      case '+':
        // val + human = result
        newResult = result - val;
        break;
      case '-':
        // val - human = result
        if (humanDepNum === 1) newResult = val - result;
        // human - val = result
        else newResult = val + result;
        break;
      case '*':
        // val * human = result
        newResult = result / val;
        break;
      case '/':
        // val / human = result
        if (humanDepNum === 1) newResult = val / result;
        // human / val = result
        else newResult = val * result;
        break;
      default: throw 'wuzzup';
    }

    if (depMonkeys[humanDepNum].name === HUMAN_NAME) {
      return newResult;
    }
    return depMonkeys[humanDepNum].match(newResult);
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

const HUMAN_NAME = 'humn';

async function main2(filename: string) {
  await createBarrel(filename);
  const root = barrel.get('root')!;
  root.operation.op = '=';
  if (root.operation.deps) {
    console.log(root.match());
  }
  
}

// main1('input.txt');
main2('input.txt');