interface Coord {
  x: number;
  y: number;
  z: number;
}

function stringToCoord(s: string): Coord {
  const numStrs = s.split(',');
  if (numStrs.length !== 3) throw `Bad string for coord: ${s}`;
  return {
    x: parseInt(numStrs[0]),
    y: parseInt(numStrs[1]),
    z: parseInt(numStrs[2]),
  }
}

function coordToString(c: Coord): string {
  return `${c.x},${c.y},${c.z}`;
}

let lavaField: Set<string> = new Set();

function getSurfaceArea(s: string): number {
  if (!lavaField.has(s)) {
    throw `No lava particle at ${s}`;
  }
  const c = stringToCoord(s);
  let faces = 6;
  if (lavaField.has(coordToString({x: c.x - 1, y: c.y + 0, z: c.z + 0 }))) faces--;
  if (lavaField.has(coordToString({x: c.x + 1, y: c.y + 0, z: c.z + 0 }))) faces--;
  if (lavaField.has(coordToString({x: c.x + 0, y: c.y - 1, z: c.z + 0 }))) faces--;
  if (lavaField.has(coordToString({x: c.x + 0, y: c.y + 1, z: c.z + 0 }))) faces--;
  if (lavaField.has(coordToString({x: c.x + 0, y: c.y + 0, z: c.z - 1 }))) faces--;
  if (lavaField.has(coordToString({x: c.x + 0, y: c.y + 0, z: c.z + 1 }))) faces--;
  return faces;
}

async function buildLavaField(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    lavaField.add(line);
  }
}

async function main1(filename: string) {
  await buildLavaField(filename);

  let sumSurfaceArea = 0;
  for (const cstr of lavaField.keys()) {
    sumSurfaceArea += getSurfaceArea(cstr);
  }

  console.log(sumSurfaceArea);
}

main1('input.txt');
