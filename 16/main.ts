/**
 * Part 1 Observations:
 * - there are 15 non-zero flow rooms.
 * - first step is to figure out the shortest path between each non-zero valve.
 *   - 15 + 14 + 13 + ... + 1 = 120 shortest paths. That's easy to keep in memory and cache.
 * - there are 15 * 14 * 13 * 1 = 15! possible permutations of visiting each valve.
 *   - this is over 1T+ so we need to be able to do something other than try each permutation.
 * - if we think of each permutation as a branch in a tree, starting at AA, then we can
 *   try paths of length 1:  AA->BB, AA->DD, etc.
 * - at the first length, we will know what the maximum possible flow could be reach if the
 *   user had only 1 tunnel to get to each room. Sort those future rooms largest first and
 *   calculate some theoretical maximum for that path's sub-tree. If that theoretical maximum
 *   is *already smaller than the largest flow from an actual path* then we can eliminate that
 *   sub-tree.
 * - then move to the next layer of the tree (paths of length 2).
 * - the more paths we can eliminate early in the tree building, the more permutations it removes
 *   from evaluation.
 *
 * Part 2:
 * - we now have two separate trees of paths, both growing from AA
 * - the non-zero valves are shared, if tree 1 chooses BB, that removes it as a choice for tree 2
 * - the remaining non-chosen valves are shared between both and used to calculate theoretical
 *   maximum on both trees
 * - for paths of length 1:
 *   - if I choose BB, then elephant can choose CC, DD, EE, HH, or JJ - 5 combinations
 *   - if I choose CC, then elephant can choose DD, EE, HH, or JJ (but can't choose BB because that
 *     pair of AA->BB and AA->CC has already happened) - 4 combinations
 *   - if I choose DD, then elephant can choose EE, HH, or JJ - 3 combinations
 *   - if I choose EE, then elephant can choose HH or JJ - 2 combinations
 *   - if I choose HH, then elephant must choose JJ - 1 combination
 * - in the next round (length 2) we have 15 paired trees to consider:
 *   - for pair (AA->BB, AA->CC), I can choose AA->BB->DD and the elephant can choose AA->CC->EE
 * 
 */

interface ValveRoom {
  name: string;
  flowRate: number;
  tunnelNames: string[];
  tunnels: ValveRoom[];
}

const allRooms: Map<string, ValveRoom> = new Map();
const nonZeroFlowRooms: ValveRoom[] = [];

function getRoom(name: string): ValveRoom {
  const room = allRooms.get(name)!;
  if (!room) throw `No room ${name}`;
  return room;
}

const shortestRouteCache: Map<string, number> = new Map();
const pathPairCache: Set<string> = new Set();

/** Returns the minimum number of steps (minutes) to go from start to end. */
function getShortestRouteToRoom(start: ValveRoom, end: ValveRoom,
                                 visitedRooms: ValveRoom[] = [],
                                 costToGetToStart: number = 0): number {
  if (start == end) return 0;
  const mapKey = `${start.name}${end.name}`;
  const reverseMapKey = `${end.name}${start.name}`;
  if (shortestRouteCache.has(mapKey)) return shortestRouteCache.get(mapKey)!;
  if (shortestRouteCache.has(reverseMapKey)) return shortestRouteCache.get(reverseMapKey)!;

  let shortestRoute = Infinity;
  for (const tunnel of start.tunnels) {
    if (tunnel === end) return costToGetToStart + 1;
    // Never back-track in this search.
    if (!visitedRooms.includes(tunnel)) {
      // Try to visit all the un-visited tunnels and find the shortest route.
      const route = getShortestRouteToRoom(
          tunnel, end, [...visitedRooms, start], costToGetToStart + 1) + 1;
      if (route < shortestRoute) shortestRoute = route;
    }
  }

  if (shortestRoute !== Infinity) {
    shortestRouteCache.set(mapKey, shortestRoute);
    shortestRouteCache.set(reverseMapKey, shortestRoute);
  }
  return shortestRoute;
}

class Path {
  public minsPerStop: number[] = [0];
  constructor(
      public maxMinutes: number = 30,
      public stops: ValveRoom[] = [],
      public remainingStops: ValveRoom[] = []) {
    if (stops.length < 1) throw `Bad path, no stops`;
    let cur = this.stops[0];
    let minsTotal = 0;
    for (let i = 1; i < this.stops.length; ++i) {
      let minsSpent = getShortestRouteToRoom(cur, this.stops[i]) + 1;
      minsTotal += minsSpent;
      if (minsTotal > this.maxMinutes) {
        throw `Path would take longer than 30 mins, what is the point?`;
      }
      this.minsPerStop.push(minsSpent);
      cur = this.stops[i];
    }
  }

  /** The length of a path. AA->BB would return 1. */
  getLength(): number { return this.stops.length - 1; }

  /** Returns the total flow over maxMinutes of all visited valves. */
  getTotalFlow(): number {
    let minsLeft = this.maxMinutes;
    let totalFlow = 0;
    let totalFlowPerMin = 0;
    for (let i = 1; i < this.stops.length; ++i) {
      let minsSpent = this.minsPerStop[i];
      totalFlow += totalFlowPerMin * minsSpent;
      totalFlowPerMin += this.stops[i].flowRate;
      minsLeft -= minsSpent;
    }
    if (minsLeft > 0) {
      totalFlow += totalFlowPerMin * minsLeft;
    }

    return totalFlow;
  }

  /**
   * Returns the total flow of all visited valves plus the maximum total of the
   * remaining valves if they would be theoretically visited in the best order
   * as fast as possible (2 mins).
   */
  getBestCaseTotalFlow(): number {
    let totalBestCaseFlow = this.getTotalFlow();
    let remainingValves = [...this.remainingStops];
    remainingValves.sort((a, b) => b.flowRate - a.flowRate);

    let remainingMins = this.maxMinutes;
    for (const m of this.minsPerStop) remainingMins -= m;

    // Assume we can magically get to and open each valve within 2 mins.
    let moreFlowPerMin = 0;
    let i = 0;
    while (remainingMins > 1 && i < remainingValves.length) {
      remainingMins -= 2;
      totalBestCaseFlow += (moreFlowPerMin * 2);
      moreFlowPerMin += remainingValves[i].flowRate;
      i++;
    }
    if (remainingMins > 0) {
      totalBestCaseFlow += moreFlowPerMin * remainingMins;
    }

    return totalBestCaseFlow;
  }

  printPath(): string {
    let pathSegs: string[] = [];
    let minsSpent = 0;
    for (let i = 0; i < this.stops.length; ++i) {
      minsSpent += this.minsPerStop[i];
      pathSegs.push(`${this.stops[i].name}-${this.stops[i].flowRate} (${minsSpent}m)`);
    }
    return `${pathSegs.join(' -> ')} (${this.getTotalFlow()}, best=${this.getBestCaseTotalFlow()})`;
  }
}

class PathPairs {
  constructor(
      public maxMinutes: number = 26,
      public pathA: Path, public pathB: Path,
      public remainingStops: ValveRoom[] = []) {}

  getLength(): number {
    return Math.max(this.pathA.getLength(), this.pathB.getLength());
  }

  getTotalFlow(): number {
    return this.pathA.getTotalFlow() + this.pathB.getTotalFlow();
  }

  getKey(reverse: boolean = false): string {
    let path1 = reverse ? this.pathA : this.pathB;
    let path2 = reverse ? this.pathB : this.pathA;
    let keyStr = '';
    for (const s of path1.stops) {
      keyStr += s.name;
    }
    for (const s of path2.stops) {
      keyStr += s.name;
    }
    return keyStr;
  }

  /**
   * Returns the total flow of all visited valves plus the maximum total of the
   * remaining valves if they would be theoretically visited in the best order
   * as fast as possible (2 minutes).
   */
   getBestCaseTotalFlow(): number {
    let totalBestCaseFlow = this.getTotalFlow();
    let remainingValves = [...this.remainingStops];
    remainingValves.sort((a, b) => b.flowRate - a.flowRate);

    let remainderMinsA = this.maxMinutes;
    for (const m of this.pathA.minsPerStop) remainderMinsA -= m;
    let remainderMinsB = this.maxMinutes;
    for (const m of this.pathB.minsPerStop) remainderMinsB -= m;

    let moreFlowA = 0;
    let moreFlowB = 0;
    let i = 0;
    // Assume the elephant and I can magically get to and open each remaining valve within 2 mins.
    while ((remainderMinsA > 2 || remainderMinsB > 2) && i < remainingValves.length) {
      if (remainderMinsA > 2) {
        remainderMinsA -= 2;
        moreFlowA += remainingValves[i].flowRate * remainderMinsA;
        i++;
      }
      if (remainderMinsB > 2 && i < remainingValves.length) {
        remainderMinsB -= 2;
        moreFlowB += remainingValves[i].flowRate * remainderMinsB;
        i++;
      }
    }

    return totalBestCaseFlow + moreFlowA + moreFlowB;
  }

  print(): string {
    return `${this.pathA.printPath()} + ${this.pathB.printPath()}; ((${this.getTotalFlow()}, L=${this.getLength()}, BEST=${this.getBestCaseTotalFlow()}))`;
  }  
}

async function constructTunnels(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    const words = line.split(' ');
    const name = words[1];
    const flowRate = parseInt(words[4].split('=')[1]);
    const room: ValveRoom = {
      name,
      flowRate,
      tunnelNames: [],
      tunnels: [],
    };
    for (let i = 9; i < words.length; ++i) {
      room.tunnelNames.push(words[i].slice(0, 2));
    }
    allRooms.set(room.name, room);
    if (room.flowRate > 0) {
      nonZeroFlowRooms.push(room);
    }
  }

  for (const room of allRooms.values()) {
    for (const tunnelName of room.tunnelNames) {
      if (!allRooms.has(tunnelName)) {
        throw `Bad room! ${tunnelName}`;
      }
      const dest = getRoom(tunnelName);
      room.tunnels.push(dest);
      const mapKey = `${room.name}${dest.name}`;
      const reverseMapKey = `${dest.name}${room.name}`;
      shortestRouteCache.set(mapKey, 1);
      shortestRouteCache.set(reverseMapKey, 1); 
    }
  }

  let cur = getRoom('AA');
  for (let i = 0; i < nonZeroFlowRooms.length - 1; ++i) {
    for (let j = i; j < nonZeroFlowRooms.length; ++j) {
      getShortestRouteToRoom(cur, nonZeroFlowRooms[j]);
    }
    cur = nonZeroFlowRooms[i];
  }
}

async function main1(filename: string) {
  await constructTunnels(filename);

  // Start at AA.
  const allPaths = [new Path(30, [getRoom('AA')], [...nonZeroFlowRooms])];

  // Look at possible paths...
  let maxLength = 0;
  let bestFlowSoFar = 0;
  while (allPaths.length > 0) {
    if (allPaths[0].getLength() > maxLength) {
      maxLength = allPaths[0].getLength();
      allPaths.sort((a, b) => b.getTotalFlow() - a.getTotalFlow());
      bestFlowSoFar = allPaths[0].getTotalFlow();
    }
    const path = allPaths.shift()!;
    // Take next step.
    for (let f = 0; f < path.remainingStops.length; ++f) {
      const newStop = path.remainingStops[f];
      const stops = [...path.stops];
      stops.push(newStop);

      const remainingStops = [...path.remainingStops];
      remainingStops.splice(f, 1);

      try {
        const newPath = new Path(30, stops, remainingStops);
        if (newPath.getBestCaseTotalFlow() >= bestFlowSoFar) {
          allPaths.push(newPath);
        }
      } catch (err) {
        // This path will take longer than 30 mins, we do not consider it.
      }
    }
  }

  console.log(`Best flow = ${bestFlowSoFar}`);
}

async function main2(filename: string) {
  await constructTunnels(filename);

  // Both start at AA.
  const pairedPaths = [new PathPairs(
    26,
    new Path(26, [getRoom('AA')]),
    new Path(26, [getRoom('AA')]),
    [...nonZeroFlowRooms])];
  let maxLength = 0;
  let bestPairPathSoFar = pairedPaths[0];
  let bestFlowSoFar = 0;
  let numEliminatedPathPairs = 0;

  while (pairedPaths.length > 0) {
    if (pairedPaths[0].getLength() > maxLength) {
      console.log(`# of eliminated path pairs = ${numEliminatedPathPairs}`);
      numEliminatedPathPairs = 0;
      console.log(`===== Path length ${pairedPaths[0].getLength()} reached =====`)
      maxLength = pairedPaths[0].getLength();
      pairedPaths.sort((a, b) => b.getTotalFlow() - a.getTotalFlow());
      if (pairedPaths[0].getTotalFlow() > bestFlowSoFar) {
        bestFlowSoFar = pairedPaths[0].getTotalFlow();
        bestPairPathSoFar = pairedPaths[0];
      }
      console.log(`               *_*_*_*_* Flow to beat = ${bestFlowSoFar}`)
      console.log(`               *_*_*_*_* Path to beat = ${pairedPaths[0].print()}`)
    }

    const nextPair = pairedPaths.shift()!;

    let numASkipped = 0;
    let numBSkipped = 0;
  
    // Both me and the elephant need to take the next steps.
    let pathA: Path = nextPair.pathA;
    let pathB: Path = nextPair.pathB;
    let remainingStops = [...nextPair.remainingStops];

    // Pick next step for human...
    let humanIndex = 0;
    let elephantIndex = 0;
    for (humanIndex = 0; humanIndex < remainingStops.length; ++humanIndex) {
      let newStopA = remainingStops[humanIndex];

      try {
        const stopsA = [...nextPair.pathA.stops, newStopA];
        pathA = new Path(26, stopsA);

        // Pick next step for elephant...
        for (elephantIndex = 0; elephantIndex < remainingStops.length; ++elephantIndex) {
          // Skip the step the human chose.
          if (humanIndex < remainingStops.length && elephantIndex === humanIndex) {
            continue;
          }
    
          const newStopB = remainingStops[elephantIndex];
          try {
            const stopsB = [...nextPair.pathB.stops, newStopB];
            pathB = new Path(26, stopsB);

            // Now set up a pair-path...
            const thisRemainingPaths = [...remainingStops];
            // Carefully splice things out...
            thisRemainingPaths.splice(humanIndex, 1);
            if (elephantIndex < humanIndex) {
              thisRemainingPaths.splice(elephantIndex, 1);
            } else {
              thisRemainingPaths.splice(elephantIndex - 1, 1);
            }
      
            try {
              const newPathPair = new PathPairs(26, pathA, pathB, thisRemainingPaths);
              if (!pathPairCache.has(newPathPair.getKey(true)) &&
                  newPathPair.getBestCaseTotalFlow() >= bestFlowSoFar) {
                pairedPaths.push(newPathPair);
                pathPairCache.add(newPathPair.getKey());
              } else {
                numEliminatedPathPairs++;
              }
            } catch (err) {
              // This path will take longer than 26 mins, we do not consider it.
            }      
          }
          // Keep looping to find a next stop the elephant can choose.
          catch (err) {
            numBSkipped++;
          }
        }
      }
      // If this stop couldn't be used for pathA (human), we keep looping to find one.
      catch (err) {
        numASkipped++;
      }
    }

    // Now also check if pathA stops, can pathB keep going? And vice versa.
    if (numBSkipped === remainingStops.length) {
      pathB = nextPair.pathB;
      for (humanIndex = 0; humanIndex < remainingStops.length; ++humanIndex) {
        let newStopA = remainingStops[humanIndex];

        try {
          const stopsA = [...nextPair.pathA.stops, newStopA];
          pathA = new Path(26, stopsA);

          const thisRemainingPaths = [... remainingStops];
          thisRemainingPaths.splice(humanIndex, 1);
          const newPathPair = new PathPairs(26, pathA, pathB, thisRemainingPaths);
          if (newPathPair.getBestCaseTotalFlow() >= bestFlowSoFar) {
            pairedPaths.push(newPathPair);
          } else {
            numEliminatedPathPairs++;
          }
        } catch (err) {}
      }
    }

    if (numASkipped === remainingStops.length) {
      pathA = nextPair.pathA;
      for (elephantIndex = 0; elephantIndex < remainingStops.length; ++elephantIndex) {
        let newStopB = remainingStops[elephantIndex];

        try {
          const stopsB = [...nextPair.pathB.stops, newStopB];
          pathB = new Path(26, stopsB);

          const thisRemainingPaths = [... remainingStops];
          thisRemainingPaths.splice(elephantIndex, 1);
          const newPathPair = new PathPairs(26, pathA, pathB, thisRemainingPaths);
          if (newPathPair.getBestCaseTotalFlow() >= bestFlowSoFar) {
            pairedPaths.push(newPathPair);
          } else {
            numEliminatedPathPairs++;
          }
        } catch (err) {}
      }
    }
  }
  console.log(`Best flow = ${bestFlowSoFar}`);
  console.log(bestPairPathSoFar.print());
}

// main1('input.txt');
main2('input.txt');
