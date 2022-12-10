interface Instruction {
  numCycles: number;
  /** A function that is called at the end of a cycle. */
  endFn: (cpu: Cpu) => void;
}

function createAddX(v: number): Instruction {
   return { numCycles: 2, endFn: (cpu: Cpu) => cpu.x += v };
}

function createNoop(): Instruction {
  return { numCycles: 1, endFn: () => {} };
}

/** A function that is called every cycle. */
type CycleFunction = (cycle: number, x: number) => void;

class Cpu {
  x: number;
  constructor(private program: Instruction[] = []) {}

  /**
   * Runs the whole program up to lastCycle (or to completion, if specified).
   * Runs cycleFn during each cycle.
   */
  run(cycleFn: CycleFunction, lastCycle?: number) {
    this.x = 1;
    let cycle = 0;
    for (const instr of this.program) {
      for (let c = 0; c < instr.numCycles; ++c) {
        cycle++;
        cycleFn(cycle, this.x);
        if (lastCycle && cycle >= lastCycle) return;
      }
      instr.endFn(this);
    }
    return cycle;
  }
}

async function loadCpu(filename: string): Promise<Cpu> {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  const program: Instruction[] = [];
  for (const line of lines) {
    if (line === 'noop') {
      program.push(createNoop());
    } else if (line.startsWith('addx ')) {
      program.push(createAddX(parseInt(line.substring(5))));
    }
  }
  return new Cpu(program);
}

const CYCLES_OF_INTEREST = [20, 60, 100, 140, 180, 220];

async function main1() {
  let signalStrength = 0;
  let signalStrengthSum = 0;
  const cpu = await loadCpu('input.txt');
  for (const cycleOfInterest of CYCLES_OF_INTEREST) {
    cpu.run((cycle, x) => signalStrength = cycle * x, cycleOfInterest);
    signalStrengthSum += signalStrength;
  }
  console.log(signalStrengthSum);
}

function render(pixel: number, x: number): string {
  return (pixel >= (x - 1) && pixel <= (x + 1)) ? '#' : '.';
}

async function main2() {
  let CRT: string = '';
  const cpu = await loadCpu('input.txt');
  cpu.run((cycle, x) => CRT += render((cycle - 1) % 40, x));
  for (let p = 0; p < 240; p += 40) {
    console.log(CRT.substring(p, p + 40));
  }
}

//main1();
main2();
