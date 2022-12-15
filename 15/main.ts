
interface Beacon {
  x: number;
  y: number;
}

interface Sensor {
  /** Sensor x. */
  sx: number;
  /** Sensor y. */
  sy: number;
  /** Closest beacon x. */
  bx: number;
  /** Closest beacon x. */
  by: number;
}

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Returns the [min, max] x bounds for a given row.
 * If min > max, then there is no sensor coverage at that row.
 */
function getSensorCoveragePtsAtRowForSensor(rowY: number, s: Sensor): number[] {
  let minx: number = Infinity;
  let maxx: number = -Infinity;

  const dist = calculateDistance(s.sx, s.sy, s.bx, s.by);

  // Start at the x-position of the sensor at that row, find its distance.
  const sVertDist = calculateDistance(s.sx, s.sy, s.sx, rowY);
  if (sVertDist < dist) {
    const delta = dist - sVertDist;
    let x = s.sx - delta;
    if (x < minx) minx = x;
    x = s.sx + delta;
    if (x > maxx) maxx = x;
  }

  return [minx, maxx];
}

function getNumCoveredSquaresMinusBeacons(xRange: number[], rowY: number): number {
  let countEmptySquares = 0;
  for (let x = xRange[0]; x <= xRange[1]; ++x) {
    const coordKey = xyToString(x, rowY);
    if (!beacons.has(coordKey)) countEmptySquares++;
  }
  return countEmptySquares;
}

function xyToString(x: number, y: number): string {
  return JSON.stringify([x, y]);
}

function stringToXY(s: string): number[] {
  return JSON.parse(s);
}

let sensors: Sensor[] = [];
let beacons: Map<string, Beacon> = new Map();

async function populateSensorsAndBeacons(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    const parts = line.split(' at x=');
    const sParts = parts[1].split(', y=');
    const bParts = parts[2].split(', y=');
    const s: Sensor = {
      sx: parseInt(sParts[0]),
      sy: parseInt(sParts[1]),
      bx: parseInt(bParts[0]),
      by: parseInt(bParts[1]),
    };
    sensors.push(s);

    const coordKey = xyToString(s.bx, s.by);
    if (!beacons.has(coordKey)) {
      beacons.set(coordKey, {x: s.bx, y: s.by});
    }
  }
}

async function main1(filename: string, rowUnderTest: number) {
  await populateSensorsAndBeacons(filename);
  const ranges: number[][] = [];
  for (const s of sensors) {
    const range = getSensorCoveragePtsAtRowForSensor(rowUnderTest, s);
    if (range[0] > range[1]) continue;
    ranges.push(range);
  }

  ranges.sort((r1, r2) => r1[0] - r2[0]);

  let latestX = -Infinity;
  let count = 0;
  for (const range of ranges) {
    for (let x = range[0]; x <= range[1]; ++x) {
      if (latestX >= x) continue;
      if (!beacons.has(xyToString(x, rowUnderTest))) {
        count++;
      }
    }
    latestX = Math.max(latestX, range[1]);
  }
  console.log(count);
}

async function main2(filename: string, size: number) {
  await populateSensorsAndBeacons(filename);
  for (let row = 0; row <= size; ++row) {
    const ranges: number[][] = [];
    for (const s of sensors) {
      const r = getSensorCoveragePtsAtRowForSensor(row, s);
      if (r[0] > r[1]) continue;
      ranges.push(r);
    }
    ranges.sort((r1, r2) => r1[0] - r2[0]);

    let curX = 0;
    let minX = size;
    let maxX = 0;
    for (const r of ranges) {
      if (r[0] < minX) minX = r[0];
      if (r[1] > maxX) maxX = r[1];

      if (curX < Math.max(minX, r[0]) - 1) {
        console.log((curX + 1) * 4000000 + row);
        return;
      }
      if (r[1] > curX) curX = r[1];
      if (r[1] > maxX) maxX = r[1];
      if (curX >= size) continue;
    }
  }
}

// main1('input.txt', 2000000);
main2('input.txt', 4000000);
