
function toSNAFU(n: number): string {
  const base5 = Number(n).toString(5);
  const base5digits = base5.split('').map(d => parseInt(d));
  // Shove a 0 onto the front of the digits...
  base5digits.unshift(0);
  let s = '';
  for (let i = base5digits.length - 1; i >= 0; --i) {
    const ch = base5digits[i];
    if (ch < 3) {
      s = ch + s;
    } else {
      s = ((ch === 3) ? '=' : '-') + s;
      // Increment the next higher digit.
      let j = i - 1;
      base5digits[j]++;
      // Handle overflow.
      while (base5digits[j] > 4) {
        base5digits[j] -= 5;
        --j;
        base5digits[j]++;
      }
    }
  }
  // Get rid of any leading 0.
  if (s.charAt(0) === '0') {
    s = s.substring(1);
  }

  return s;
}

function toDecimal(snafuStr): number {
  let place = 1;
  let num = 0;
  for (let i = snafuStr.length - 1; i >= 0; --i) {
    const ch = snafuStr.charAt(i);
    if (ch === '=') num += (-2) * place;
    else if (ch === '-') num += -place;
    else {
      const mult = parseInt(ch);
      num += mult * place;
    }
    place *= 5;
  }
  return num;
}

async function main1(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  const nums: number[] = [];
  for (let y = 0; y < lines.length; ++y) {
    const line = lines[y];
    if (line.length === 0) continue;
    nums.push(toDecimal(line));
  }

  let sum = 0;
  for (const num of nums) {
    sum += num;
  }

  console.log(toSNAFU(sum));
}

main1('input.txt');
