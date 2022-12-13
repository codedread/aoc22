import * as fs from 'fs';

function aoc1() {
  let currentElf = [];
  let maxElf = -1;
  const lines = fs.readFileSync('input.txt', 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (line.length > 0) {
      currentElf.push(parseInt(line));
    } else {
      const sum = currentElf.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
      if (sum > maxElf) maxElf = sum;
      currentElf = [];
    }
  }
  console.log(maxElf);
}

function aoc2() {
  const elfCalories = [];
  let currentElf = [];
  const lines = fs.readFileSync('input.txt', 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (line.length > 0) {
      currentElf.push(parseInt(line));
    } else {
      elfCalories.push(currentElf.reduce((accumulator, currentValue) => accumulator + currentValue, 0));
      currentElf = [];
    }
  }
  elfCalories.sort((a, b) => b - a);
  console.dir(elfCalories[0] + elfCalories[1] + elfCalories[2]);
}

//aoc1();
aoc2();