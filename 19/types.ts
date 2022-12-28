export interface World {
  minutesLeft: number;
  readonly maxMinutes: number;

  geode:  number;
  obsidian: number;
  clay: number;
  ore: number;

  geodeCrackingRobots: number;
  obsidianCollectingRobots: number;
  clayCollectingRobots: number;
  oreCollectingRobots: number;
}

export enum ActionType {
  /** Special non-action signifying time is now beginning. */
  START = "START",
  /** All of these are actions we can decide to take in a turn. */
  WAIT = "WAIT",
  BUILD_ORE_ROBOT = "BUILD_ORE_ROBOT",
  BUILD_CLAY_ROBOT = "BUILD_CLAY_ROBOT",
  BUILD_OBSIDIAN_ROBOT = "BUILD_OBSIDIAN_ROBOT",
  BUILD_GEODE_ROBOT = "BUILD_GEODE_ROBOT",
}

export interface ActionNode {
  type: ActionType;
  /** The state of the world after this action. */
  world: World;
  next?: ActionNode[];
  parent?: ActionNode;
}

export interface Blueprint {
  readonly index: number;
  readonly oreCostForOreCollectingRobot: number;
  readonly oreCostForClayCollectingRobot: number;
  readonly oreCostForObsidianCollectingRobot: number;
  readonly clayCostForObsidianCollectingRobot: number;
  readonly oreCostForGeodeCrackingRobot: number;
  readonly obsidianCostForGeodeCrackingRobot: number;

  maxGeodes: number;
  bestNode?: ActionNode;
}

export const ARITHMETIC_SUM: number[] = new Array(32);
ARITHMETIC_SUM[0] = 0;
for (let i = 1; i < ARITHMETIC_SUM.length; ++i) {
  ARITHMETIC_SUM[i] = ARITHMETIC_SUM[i - 1] + i;
}

export function canDo(actionType: ActionType, world: World, blueprint: Blueprint, special: boolean): boolean {
  /**
   * Now we choose next actions on this node.
   *
   * We must put some restrictions on the code so that the tree produced is not
   * exponential in nature and is positioned to get the best result. We observe
   * the following rules:
   *
   * - Never wait if we can afford any robot.
   * - Never build more ore robots if we can build any type of robot every min.
   * - Never build more clay robots if we can build an obsidian robot every min.
   * - Never build more obsidian robots if we can build a geode robot every min.
   */
  const maxOreNeeded = Math.max(
      blueprint.oreCostForOreCollectingRobot,
      blueprint.oreCostForClayCollectingRobot,
      blueprint.oreCostForObsidianCollectingRobot,
      blueprint.oreCostForGeodeCrackingRobot);
  const maxClayNeeded = blueprint.clayCostForObsidianCollectingRobot;
  const maxObsidianNeeded = blueprint.obsidianCostForGeodeCrackingRobot;
  const canAffordOreRobot = world.ore >= blueprint.oreCostForOreCollectingRobot;
  const canAffordClayRobot = world.ore >= blueprint.oreCostForClayCollectingRobot;
  const canAffordObsRobot = world.ore >= blueprint.oreCostForObsidianCollectingRobot
      && world.clay >= blueprint.clayCostForObsidianCollectingRobot;
  const canAffordGeodeRobot = world.ore >= blueprint.oreCostForGeodeCrackingRobot
      && world.obsidian >= blueprint.obsidianCostForGeodeCrackingRobot;

  if (actionType === ActionType.START) return true;

  switch (actionType) {
    case ActionType.WAIT:
      /**
       * WAITs seem to be the biggest thing in the tree, since it can be done any
       * time and at any layer. We need to discourage unnecessary chains of WAITs.
       *
       * - if we are not gaining any clay:
       *   - no waiting once we have max ore for {ore,clay} robots.
       * - else if we are gaining clay:
       *   - if we are not gaining any obsidian:
       *     - no waiting once we have max ore for {ore,clay,obsidian} robots
       *       and clay for obsidian robots.
       *   - else if we are gaining any obsidian:
       *     - no waiting once we have max ore for {ore,clay,obsidian,geode}
       *       robots and obsidian for geode robots.
       */
      let doNotWait = false;
      if (world.clayCollectingRobots === 0) {
        doNotWait = world.ore >= Math.max(
                             blueprint.oreCostForOreCollectingRobot,
                             blueprint.oreCostForClayCollectingRobot);
      } else {
        if (world.obsidianCollectingRobots === 0) {
          doNotWait =
              world.ore >= Math.max(
                               blueprint.oreCostForOreCollectingRobot,
                               blueprint.oreCostForClayCollectingRobot,
                               blueprint.oreCostForObsidianCollectingRobot) &&
              world.clay >= blueprint.clayCostForObsidianCollectingRobot;
        } else {
          doNotWait = world.ore >= maxOreNeeded &&
              world.obsidian >= blueprint.obsidianCostForGeodeCrackingRobot;
        }
      }

      // Do not wait if we can afford any type of robot.
      if (!doNotWait) {
        doNotWait =
            (canAffordOreRobot && canAffordClayRobot && canAffordObsRobot &&
             canAffordGeodeRobot);
      }

      // THE BELOW LOGIC WAS FAULTY, IT WAS CAUSING ME TO GET THE WRONG ANSWER.
      // I'M STILL NOT SURE WHY. THE PROGRAM TAKES ALMOST TWICE AS LONG TO RUN
      // WITHOUT THIS.
      /**
       * If we can buy a robot of type X and it will not prevent us from buying
       * a robot of any other type in the next minute (taking into account how
       * resources will grow), then there is zero reason to wait. Might as well
       * build that robot as it has no negative consequences.
       * This is to account for the following scenario:
       * - minute X: can afford ore,clay robots, but not obsidian,geode robots
       * - minute X+1: can afford obsidian,geode robots even if we had built
       *   an ore,clay robot during minute X
       * - in the above scenario, we do not want to wait at minute X as there
       *   are zero benefits to doing that, might as well purchase the robot.
       */
      // if (!doNotWait) {
      //   const nextOre = world.ore + world.oreCollectingRobots;
      //   const nextClay = world.clay + world.clayCollectingRobots;
      //   const nextObs = world.obsidian + world.obsidianCollectingRobots;
      //   const canAffordNextOreRobot = nextOre > blueprint.oreCostForOreCollectingRobot;
      //   const canAffordNextClayRobot = nextOre > blueprint.oreCostForClayCollectingRobot;
      //   const canAffordNextObsRobot = nextOre > blueprint.oreCostForObsidianCollectingRobot
      //       && nextClay > blueprint.clayCostForObsidianCollectingRobot;
      //   const canAffordNextGeodeRobot = nextOre > blueprint.oreCostForGeodeCrackingRobot
      //       && nextObs > blueprint.obsidianCostForGeodeCrackingRobot;
      //   if (canAffordOreRobot && 
      //       (canAffordNextClayRobot && canAffordNextObsRobot && canAffordNextGeodeRobot)) {
      //     doNotWait = true;
      //   } else if (canAffordClayRobot &&
      //       (canAffordNextOreRobot && canAffordNextObsRobot && canAffordNextGeodeRobot)) {
      //     doNotWait = true;
      //   } else if (canAffordObsRobot &&
      //       (canAffordNextOreRobot && canAffordNextClayRobot && canAffordNextGeodeRobot)) {
      //     doNotWait = true;
      //   } else if (canAffordGeodeRobot &&
      //       (canAffordNextOreRobot && canAffordNextClayRobot && canAffordNextObsRobot)) {
      //     doNotWait = true;
      //   }
      // }
      return !doNotWait;

    case ActionType.BUILD_ORE_ROBOT:
      // Stop building ore robots once we have enough ore per minute.
      return world.ore >= blueprint.oreCostForOreCollectingRobot
             && world.oreCollectingRobots < maxOreNeeded;

    case ActionType.BUILD_CLAY_ROBOT:
      // Stop building clay robots once we either have enough clay per minute.
      return world.ore >= blueprint.oreCostForClayCollectingRobot
             && world.clayCollectingRobots < maxClayNeeded;
    
    case ActionType.BUILD_OBSIDIAN_ROBOT:
      // Stop building obsidian robots once we have enough obsidian per minute.
      return world.ore >= blueprint.oreCostForObsidianCollectingRobot &&
             world.clay >= blueprint.clayCostForObsidianCollectingRobot &&
             world.obsidianCollectingRobots < maxObsidianNeeded;

    case ActionType.BUILD_GEODE_ROBOT:
      return world.ore >= blueprint.oreCostForGeodeCrackingRobot &&
             world.obsidian >= blueprint.obsidianCostForGeodeCrackingRobot;
  }
}

/** Consume and produce in 1 minute. */
export function doAction(action: ActionNode, blueprint: Blueprint, TEST_MINUTES: number,
  stats: { totalNodesAtEachLevel: number[], nodesProcessedAtEachLevel: number[] }) {
  if (!blueprint) throw `No blueprint defined`;

  let special = false;
  if (!canDo(action.type, action.world, blueprint, special)) throw `Cannot build robot: ${action.type}`;

  /**
   * Other circumstances mean a sub-tree is dead (not worth following). We can
   * eliminate these sub-trees by not producing some child actions.
   *
   * - If we waited last turn, but could have created a robot of a certain type
   *   then we should never try to create a robot of that type in this sub-tree.
   *   That makes no sense, since we should have created it last turn (there is
   *   zero benefit to wait).
   *
   * ^== This eliminates HUGE swathes of useless sub-trees.
   */
  let couldHaveBuiltOreRobotButDidNot = false;
  let couldHaveBuiltClayRobotButDidNot = false;
  let couldHaveBuiltObsRobotButDidNot = false;
  let couldHaveBuiltGeodeRobotButDidNot = false;
  if (action.type === ActionType.WAIT) {
    couldHaveBuiltOreRobotButDidNot = canDo(ActionType.BUILD_ORE_ROBOT, action.world, blueprint, special);
    couldHaveBuiltClayRobotButDidNot = canDo(ActionType.BUILD_CLAY_ROBOT, action.world, blueprint, special);
    couldHaveBuiltObsRobotButDidNot = canDo(ActionType.BUILD_OBSIDIAN_ROBOT, action.world, blueprint, special);
    couldHaveBuiltGeodeRobotButDidNot = canDo(ActionType.BUILD_GEODE_ROBOT, action.world, blueprint, special);
  }

  if (action.type !== ActionType.START) {
    // Accrue raw resources.
    action.world.ore += action.world.oreCollectingRobots;
    action.world.clay += action.world.clayCollectingRobots;
    action.world.obsidian += action.world.obsidianCollectingRobots;
    action.world.geode += action.world.geodeCrackingRobots;
    if (action.world.geode > blueprint.maxGeodes) {
      blueprint.maxGeodes = action.world.geode;
      blueprint.bestNode = action;
      console.log(`Max geode count so far is ${action.world.geode}`);
    }

    // Build robot (deduct resource cost and add a robot).
    switch (action.type) {
      case ActionType.BUILD_ORE_ROBOT:
        action.world.oreCollectingRobots++;
        action.world.ore -= blueprint.oreCostForOreCollectingRobot;
        break;
      case ActionType.BUILD_CLAY_ROBOT:
        action.world.clayCollectingRobots++;
        action.world.ore -= blueprint.oreCostForClayCollectingRobot;
        break;
      case ActionType.BUILD_OBSIDIAN_ROBOT:
        action.world.obsidianCollectingRobots++;
        action.world.ore -= blueprint.oreCostForObsidianCollectingRobot;
        action.world.clay -= blueprint.clayCostForObsidianCollectingRobot;
        break;
      case ActionType.BUILD_GEODE_ROBOT:
        action.world.geodeCrackingRobots++;
        action.world.ore -= blueprint.oreCostForGeodeCrackingRobot;
        action.world.obsidian -= blueprint.obsidianCostForGeodeCrackingRobot;
        break;
    }

    action.world.minutesLeft--;
    
    const mins = action.world.maxMinutes - action.world.minutesLeft - 1;
    stats.totalNodesAtEachLevel[mins]++;
  }

  // If we have more minutes to evaluate, see what next actions should exist.
  if (action.world.minutesLeft > action.world.maxMinutes - TEST_MINUTES) {
    if (!action.next) throw `Bad action.next`;

    // In certain conditions, if we have not made any geode robots, then this
    // sub-tree is dead to us. It will never win.
    if (action.world.geodeCrackingRobots === 0) {
      /**
       * If there is only 1 minute left and we haven't made a geode robot, this
       * sub-tree is useless, it will not crack any geodes.
       */
      if (action.world.minutesLeft <= 1) {
        return;
      }

      /**
       * If we could magically build a geode robot every minute hence, could we
       * make enough geodes to beat the current best node if the best node just
       * waited until the end of its run? If not, drop this sub-tree, it can
       * never beat the current winner.
       */
      if (blueprint.bestNode) {
        const magicalBestMaxGeodes = ARITHMETIC_SUM[action.world.minutesLeft - 1];
        const worstCaseMaxGeodes = blueprint.bestNode.world.geode +
            (blueprint.bestNode.world.minutesLeft * blueprint.bestNode.world.geodeCrackingRobots);
        if (magicalBestMaxGeodes <= worstCaseMaxGeodes) {
          return;
        }
      }
    }

    if (canDo(ActionType.WAIT, action.world, blueprint, special)
        && (action.world.minutesLeft > 2 || action.world.geodeCrackingRobots > 0)) {
      const node: ActionNode = {
        type: ActionType.WAIT,
        world: structuredClone(action.world),
        next: [],
        parent: action,
      };
      action.next.push(node);
    }

    if (canDo(ActionType.BUILD_ORE_ROBOT, action.world, blueprint, special)
        && !couldHaveBuiltOreRobotButDidNot) {
      const node: ActionNode = {
        type: ActionType.BUILD_ORE_ROBOT,
        world: structuredClone(action.world),
        next: [],
        parent: action,
      };
      action.next.push(node);
    }

    if (canDo(ActionType.BUILD_CLAY_ROBOT, action.world, blueprint, special)
        && !couldHaveBuiltClayRobotButDidNot
        && action.world.minutesLeft > 3) {
      const node: ActionNode = {
        type: ActionType.BUILD_CLAY_ROBOT,
        world: structuredClone(action.world),
        next: [],
        parent: action,
      };
      action.next.push(node);
    }

    // Only build an obsidian robot if we can, if we did not wait last turn
    // instead of building one, and we have more than 2 mins left (otherwise we
    // cannot see the benefits of this robot since we have to use its obsidian
    // to build a geode robot and then another minute to crack a geode).
    if (canDo(ActionType.BUILD_OBSIDIAN_ROBOT, action.world, blueprint, special)
        && !couldHaveBuiltObsRobotButDidNot
        && action.world.minutesLeft > 2) {
      const node: ActionNode = {
        type: ActionType.BUILD_OBSIDIAN_ROBOT,
        world: structuredClone(action.world),
        next: [],
        parent: action,
      };
      action.next.push(node);
    }

    // Only build a geode robot if we can, if we did not wait last turn instead
    // of building one, and we have more than 1 min left.
    if (canDo(ActionType.BUILD_GEODE_ROBOT, action.world, blueprint, special)
        && !couldHaveBuiltGeodeRobotButDidNot) {
      const node: ActionNode = {
        type: ActionType.BUILD_GEODE_ROBOT,
        world: structuredClone(action.world),
        next: [],
        parent: action,
      };
      action.next.push(node);
    }

    for (const childAction of action.next) {
      doAction(childAction, blueprint, TEST_MINUTES, stats);
    }
  }

  // Clean up time... this keeps the memory low...
  if (action.next && action.next.length > 0) {
    action.next = [];
  }
}

export async function parseBlueprints(filename: string): Promise<Blueprint[]> {
  const blueprints: Blueprint[] = [];
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (line.length === 0) continue;
    let oreCostForOreCollectingRobot: number;
    let oreCostForClayCollectingRobot: number;
    let oreCostForObsidianCollectingRobot: number;
    let clayCostForObsidianCollectingRobot: number;
    let oreCostForGeodeCrackingRobot: number;
    let obsidianCostForGeodeCrackingRobot: number;
  
    const oreOres = line.split('Each ore robot costs ');
    oreCostForOreCollectingRobot = parseInt(oreOres[1]);
    
    const oreClays = oreOres[1].split('Each clay robot costs ');
    oreCostForClayCollectingRobot = parseInt(oreClays[1]);

    const oreObsidian = oreClays[1].split('Each obsidian robot costs ');
    oreCostForObsidianCollectingRobot = parseInt(oreObsidian[1]);

    const clayObsidian = oreObsidian[1].split(' ore and ');
    clayCostForObsidianCollectingRobot = parseInt(clayObsidian[1]);

    const oreGeode = clayObsidian[1].split(' clay. Each geode robot costs ');
    oreCostForGeodeCrackingRobot = parseInt(oreGeode[1]);

    obsidianCostForGeodeCrackingRobot = parseInt(clayObsidian[2]);

    blueprints.push({
      index: i + 1,
      oreCostForOreCollectingRobot,
      oreCostForClayCollectingRobot,
      oreCostForObsidianCollectingRobot,
      clayCostForObsidianCollectingRobot,
      oreCostForGeodeCrackingRobot,
      obsidianCostForGeodeCrackingRobot,
      maxGeodes: 0,
    });
  }
  return blueprints;
}

/**
 * If the world has maxMinsLeft minutes left or less, the nodes will be printed.
 */
export function printTree(action: ActionNode, maxMinsLeft = 0, indent: number = 0) {
  const indentStr = ' '.repeat(indent);
  if (action.world.minutesLeft <= maxMinsLeft) {
    console.log(`${indentStr}action: ${action.type}`);
    console.log(`${indentStr}world: ${action.world.minutesLeft}/${action.world.maxMinutes} ` +
        `o:${action.world.ore}/c:${action.world.clay}/ob:${action.world.obsidian}/g:${action.world.geode} ` +
        `or:${action.world.oreCollectingRobots}/cr:${action.world.clayCollectingRobots}/` +
        `obr:${action.world.obsidianCollectingRobots}/gr:${action.world.geodeCrackingRobots},`);
    console.log(`${indentStr}next: [`);
  }
  if (action.next) {
    for (const childAction of action?.next) {
      printTree(childAction, maxMinsLeft, indent + 2);
    }
  }
  if (action.world.minutesLeft <= maxMinsLeft) {
    console.log(`${indentStr}]`);
  }
}
