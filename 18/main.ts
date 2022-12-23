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
let externalAirField: Set<string> = new Set();

/**
 * Returns the two points representing the diagonal of the entire lava field.
 * Returns [min, max].
 */
function getLavaFieldExtents(): Coord[] {
  const max: Coord = { x: -Infinity, y: -Infinity, z: -Infinity };
  const min: Coord = { x: Infinity,  y: Infinity,  z: Infinity  };

  for (const cstr of lavaField.keys()) {
    const c = stringToCoord(cstr);
    if (c.x > max.x) max.x = c.x;
    if (c.x < min.x) min.x = c.x;
    if (c.y > max.y) max.y = c.y;
    if (c.y < min.y) min.y = c.y;
    if (c.z > max.z) max.z = c.z;
    if (c.z < min.z) min.z = c.z;
  }
  return [ min, max ];
}

/**
 * This determines if lava at point s is touching any other lava.
 */
function getSurfaceArea(s: string): number {
  if (!lavaField.has(s)) {
    throw `Lava field doesn't have anything at ${s}`;
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

/**
 * This determines if air at point s is touching any external air.
 */
 function getExternalSurfaceArea(s: string): number {
  const c = stringToCoord(s);
  let faces = 0;
  if (externalAirField.has(coordToString({x: c.x - 1, y: c.y + 0, z: c.z + 0 }))) faces++;
  if (externalAirField.has(coordToString({x: c.x + 1, y: c.y + 0, z: c.z + 0 }))) faces++;
  if (externalAirField.has(coordToString({x: c.x + 0, y: c.y - 1, z: c.z + 0 }))) faces++;
  if (externalAirField.has(coordToString({x: c.x + 0, y: c.y + 1, z: c.z + 0 }))) faces++;
  if (externalAirField.has(coordToString({x: c.x + 0, y: c.y + 0, z: c.z - 1 }))) faces++;
  if (externalAirField.has(coordToString({x: c.x + 0, y: c.y + 0, z: c.z + 1 }))) faces++;
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

/**
 * Visits each space in a region and calls fn on it. To evaluate a single
 * "sheet", for example on the x-plane, set min.x === max.x.
 */
function visitSpace(min: Coord, max: Coord, fn: (c: Coord, s: string) => void) {
  for (let z = min.z; z <= max.z; ++z) {
    for (let y = min.y; y <= max.y; ++y) {
      for (let x = min.x; x <= max.x; ++x) {
        const c: Coord = {x, y, z};
        const s = coordToString(c);
        fn(c, s);
      }
    }
  }
}

/**
 * Evaluates an entire space to see if any non-lava space is touching external
 * air. If so, that space becomes external air. Continues to run until no new
 * external air spaces have been discovered. This takes care of perverse
 * conditions like tunnels of air on one side of the space connecting to
 * external air on the other side of the space.
 */
function followExternalAir(min: Coord, max: Coord) {
  let numNewExternalAirSpaces: number;
  do {
    numNewExternalAirSpaces = 0;
    visitSpace(min, max, (c,s) => {
      // Not interested in lava or external air spaces (just unevaluated air).
      if (lavaField.has(s) || externalAirField.has(s)) return;
      if (getExternalSurfaceArea(s) > 0) {
        externalAirField.add(s);
        numNewExternalAirSpaces++;
      }
    });
  } while (numNewExternalAirSpaces > 0);
}

function buildAirField(min: Coord, max: Coord) {
  // Establish outer external air shell first.

  const c1: Coord = { ...min };
  const c2: Coord = { ...max };

  // lower z face.
  c1.z = c2.z = min.z - 1;
  visitSpace(c1, c2, (c,s) => externalAirField.add(s));

  // upper z face.
  c1.z = c2.z = max.z + 1;
  visitSpace(c1, c2, (c,s) => externalAirField.add(s));

  // lower y face.
  c1.z = min.z; c2.z = max.z;
  c1.y = c2.y = min.y - 1;
  visitSpace(c1, c2, (c,s) => externalAirField.add(s));

  // upper y face.
  c1.y = c2.y = max.y + 1;
  visitSpace(c1, c2, (c,s) => externalAirField.add(s));

  // lower x face.
  c1.y = min.y; c2.y = max.y;
  c1.x = c2.x = min.x - 1;
  visitSpace(c1, c2, (c,s) => externalAirField.add(s));

  // upper x face.
  c1.x = c2.x = max.x + 1;
  visitSpace(c1, c2, (c,s) => externalAirField.add(s));

  // Now evaluate the space within for external air.
  followExternalAir(min, max);
}

async function main2(filename: string) {
  await buildLavaField(filename);

  const [min, max] = getLavaFieldExtents();

  /**
   * The approach here will be to start on the edges of the field, where there
   * is definitely external air and identify any air coordinate that is
   * touching external air and then work inwards until every air coordinate has
   * been reached. This is the only foolproof way I know about to avoid pockets
   * of air trapped in pockets of lava, etc.
   */
  buildAirField(min, max);

  let sumSurfaceArea = 0;
  for (const cstr of lavaField.keys()) {
    sumSurfaceArea += getExternalSurfaceArea(cstr);
  }

  console.log(sumSurfaceArea);
}

// main1('input.txt');
main2('input.txt');
