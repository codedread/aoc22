import * as fs from 'fs';

function getPriority(ch) {
  const code = ch.charCodeAt(0) + 1;
  if (ch >= 'a' && ch <= 'z') return code - 'a'.charCodeAt(0);
  else return code - 'A'.charCodeAt(0) + 26;
}

function main1() {
  const lines = fs.readFileSync('input.txt', 'utf-8').split(/\r?\n/);
  let sum = 0;
  for (const line of lines) {
    const comp1 = line.substring(0, line.length/2);
    const comp2 = line.substring(line.length/2);
    for (let i = 0; i < comp1.length; ++i) {
      const ch = comp1.charAt(i);
      if (comp2.indexOf(ch) !== -1) {
        sum += getPriority(ch);
        break;
      }
    }
  }
  console.log(sum);
}

function main2() {
  const lines = fs.readFileSync('input.txt', 'utf-8').split(/\r?\n/);
  let sum = 0;
  for (let i = 0; i < lines.length; i += 3) {
    const sack1 = lines[i];
    const sack2 = lines[i + 1];
    const sack3 = lines[i + 2];
    for (let i = 0; i < sack1.length; ++i) {
      const ch = sack1.charAt(i);
      if (sack2.indexOf(ch) !== -1 && sack3.indexOf(ch) !== -1) {
        console.log([i, ch, sack2.indexOf(ch), sack3.indexOf(ch), sack1, sack2, sack3]);
        sum += getPriority(ch);
        break;
      }
    }
  }
  console.log(sum);
}

// main1();
main2();