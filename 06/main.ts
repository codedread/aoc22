const LEN = 14;

function findMarker(s: string): number {
  for (let i = LEN - 1; i < s.length; ++i) {
    let foundDupe = false;
    const charMap = new Map();

    for (let j = i; j >= (i-LEN+1); --j) {
      if (charMap.has(s[j])) {
        foundDupe = true;
        break;
      }
      charMap.set(s[j], true);  
    }

    if (!foundDupe) {
      return i + 1;
    }
  }
  throw `Not found`;
}

async function main1() {
  const lines: string[] = (await Deno.readTextFile('input.txt')).split(/\r?\n/);
  console.log(findMarker(lines[0]));
}

main1();