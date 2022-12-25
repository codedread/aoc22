interface World {
  minutesLeft: number;

  geode:  number;
  obsidian: number;
  clay: number;
  ore: number;

  geodeCrackingRobots: number;
  obsidianCollectingRobots: number;
  clayCollectingRobots: number;
  oreCollectingRobots: number;
}

enum ActionType {
  /** Special non-action signifying time is now beginning. */
  START = "START",
  /** All of these are actions we can decide to take in a turn. */
  WAIT = "WAIT",
  BUILD_ORE_ROBOT = "BUILD_ORE_ROBOT",
  BUILD_CLAY_ROBOT = "BUILD_CLAY_ROBOT",
  BUILD_OBSIDIAN_ROBOT = "BUILD_OBSIDIAN_ROBOT",
  BUILD_GEODE_ROBOT = "BUILD_GEODE_ROBOT",
}

interface ActionNode {
  type: ActionType;
  /** The state of the world after this action. */
  world: World;
  next?: ActionNode[];
  parent?: ActionNode;
}

interface Blueprint {
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

const ARITHMETIC_SUM: Map<number, number> = new Map();
ARITHMETIC_SUM.set(0, 0);
for (let i = 1; i < 24; ++i) {
  ARITHMETIC_SUM.set(i, i + ARITHMETIC_SUM.get(i-1)!);
}

function canDo(actionType: ActionType, world: World, blueprint: Blueprint): boolean {
  /**
   * Now we choose next actions on this node.
   *
   * We must some restrictions on the code so that the tree produced is not
   * exponential in nature and is positioned to get the best result. We observe
   * the following rules:
   *
   * - Never wait if:
   *   - we can buy a clay robot and have 0 clay robots (necessary to win).
   *   - we can buy an obsidian robot and have 0 obsidian robots (same as above).
   *   - we can buy a geode robot and have 0 geod robots (same).
   *   - we can afford any robot.
   * - Never build more ore robots if we can build any type of robot every min.
   *   (We get enough ore to do anything every minute)
   * - Never build more clay robots if we can build an obsidian robot every min.
   *   (We get enough clay to use it every minute)
   * - Never build more obsidian robots if we can build a geode robot every min.
   *   (We get enough obsidion to use it every minute).
   * - 
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
      const doNotWait = (
        (world.clayCollectingRobots === 0 && canAffordClayRobot) ||
        (world.obsidianCollectingRobots === 0 && canAffordObsRobot) ||
        (world.geodeCrackingRobots === 0 && canAffordGeodeRobot) ||
        (canAffordOreRobot && canAffordClayRobot && canAffordObsRobot && canAffordGeodeRobot)
      );
      return !doNotWait;
    case ActionType.BUILD_ORE_ROBOT:
      return world.ore >= blueprint.oreCostForOreCollectingRobot &&
             world.oreCollectingRobots < maxOreNeeded;
    case ActionType.BUILD_CLAY_ROBOT:
      return world.ore >= blueprint.oreCostForClayCollectingRobot &&
             world.clayCollectingRobots < maxClayNeeded;
    case ActionType.BUILD_OBSIDIAN_ROBOT:
      return world.ore >= blueprint.oreCostForObsidianCollectingRobot &&
             world.clay >= blueprint.clayCostForObsidianCollectingRobot &&
             world.obsidianCollectingRobots < maxObsidianNeeded;
    case ActionType.BUILD_GEODE_ROBOT:
      return world.ore >= blueprint.oreCostForGeodeCrackingRobot &&
             world.obsidian >= blueprint.obsidianCostForGeodeCrackingRobot;
  }
}

/** Consume and produce in 1 minute. */
function doAction(action: ActionNode, blueprint: Blueprint) {
  if (!blueprint) throw `No blueprint defined`;
  if (!canDo(action.type, action.world, blueprint)) throw `Cannot build robot: ${action.type}`;

  /**
   * Other circumstances mean a sub-tree is dead (not worth following). We can
   * eliminate these sub-trees by not producing some child actions.
   *
   * - If we waited last turn, but could have created a robot of a certain type
   *   then we should not try to create a robot of that type next. That makes no
   *   sense, since we should have created it last turn (there is zero benefit
   *   to wait).
   *
   * ^== This eliminates HUGE swathes of useless sub-trees.
   */
  let couldHaveBuiltOreRobotButDidNot = false;
  let couldHaveBuiltClayRobotButDidNot = false;
  let couldHaveBuiltObsRobotButDidNot = false;
  let couldHaveBuiltGeodeRobotButDidNot = false;
  if (action.type === ActionType.WAIT) {
    couldHaveBuiltOreRobotButDidNot = canDo(ActionType.BUILD_ORE_ROBOT, action.world, blueprint);
    couldHaveBuiltClayRobotButDidNot = canDo(ActionType.BUILD_CLAY_ROBOT, action.world, blueprint);
    couldHaveBuiltObsRobotButDidNot = canDo(ActionType.BUILD_OBSIDIAN_ROBOT, action.world, blueprint);
    couldHaveBuiltGeodeRobotButDidNot = canDo(ActionType.BUILD_GEODE_ROBOT, action.world, blueprint);
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
    }

    // Manufactor robot (deduct resource cost and add a robot).
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
  }

  if (!action.next) throw `Bad action.next`;

  if (action.world.geodeCrackingRobots === 0) {
    /**
     * If there is only 1 minute left and we haven't made a geode robot, this
     * sub-tree is useless, it will not crack any geodes.
     */
    if (action.world.minutesLeft <= 1 && action.world.geodeCrackingRobots === 0) {
      return;
    }

   /**
    * If we have no geode robots yet. Pretend we could magically build 1
    * obsidian robot each turn hence, figure out how many turns it would take
    * to give us enough obsidian to buy a geode robot. If we don't have that
    * many minutes+1 (to create at least one geode), then kill this sub-tree.
    */
   if (action.world.obsidian < blueprint.obsidianCostForGeodeCrackingRobot) {
      const obsidianNeeded = blueprint.obsidianCostForGeodeCrackingRobot - action.world.obsidian;
      let futureObsidian = action.world.obsidianCollectingRobots;
      let minsNeeded = 0;
      while (futureObsidian < obsidianNeeded) {
        minsNeeded++;
        futureObsidian += (action.world.obsidianCollectingRobots + minsNeeded);
      }
      if (minsNeeded >= action.world.minutesLeft - 1) {
        return;
      }
    }
  }

  if (canDo(ActionType.WAIT, action.world, blueprint)
      && (action.world.minutesLeft > 2 || action.world.geodeCrackingRobots > 0)) {
    action.next.push({
      type: ActionType.WAIT,
      world: structuredClone(action.world),
      next: [],
      parent: action,
    });
  }

  if (canDo(ActionType.BUILD_ORE_ROBOT, action.world, blueprint)
      && !couldHaveBuiltOreRobotButDidNot) {
    action.next.push({
      type: ActionType.BUILD_ORE_ROBOT,
      world: structuredClone(action.world),
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_CLAY_ROBOT, action.world, blueprint)
      && !couldHaveBuiltClayRobotButDidNot
      && action.world.minutesLeft > 3) {
    action.next.push({
      type: ActionType.BUILD_CLAY_ROBOT,
      world: structuredClone(action.world),
      next: [],
      parent: action,
    });
  }

  // Only build an obsidian robot if we can, if we did not wait last turn
  // instead of building one, and we have more than 2 mins left (otherwise we
  // cannot see the benefits of this robot since we have to use its obsidian
  // to build a geode robot and then another minute to crack a geode).
  if (canDo(ActionType.BUILD_OBSIDIAN_ROBOT, action.world, blueprint)
      && !couldHaveBuiltObsRobotButDidNot
      && action.world.minutesLeft > 2) {
    action.next.push({
      type: ActionType.BUILD_OBSIDIAN_ROBOT,
      world: structuredClone(action.world),
      next: [],
      parent: action,
    });
  }

  // Only build a geode robot if we can, if we did not wait last turn instead
  // of building one, and we have more than 1 min left.
  if (canDo(ActionType.BUILD_GEODE_ROBOT, action.world, blueprint)
      && !couldHaveBuiltGeodeRobotButDidNot) {
    action.next.push({
      type: ActionType.BUILD_GEODE_ROBOT,
      world: structuredClone(action.world),
      next: [],
      parent: action,
    });
  }

  if (action.world.minutesLeft > 0) {
    for (const childAction of action.next) {
      doAction(childAction, blueprint);
    }
  }
}

const blueprints: Blueprint[] = [];
let blueprint: Blueprint;

async function parseBlueprints(filename: string) {
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
}

function printTree(action: ActionNode, maxMinsLeft = 0, indent: number = 0) {
  const indentStr = ' '.repeat(indent);
  if (action.world.minutesLeft <= maxMinsLeft) {
    console.log(`${indentStr}action: ${action.type}`);
    console.log(`${indentStr}world: ${JSON.stringify(action.world, undefined, indent + 2)}`);
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

async function main1(filename: string) {
  await parseBlueprints(filename);

  let qualitySum = 0;
  for (const blueprint of blueprints) {
    const tree: ActionNode = {
      type: ActionType.START,
      world: {
        minutesLeft: 24,
      
        ore: 0,
        clay: 0,
        obsidian: 0,
        geode: 0,
      
        oreCollectingRobots: 1,
        clayCollectingRobots: 0,
        obsidianCollectingRobots: 0,
        geodeCrackingRobots: 0,
      },
      next: [],
    };

    doAction(tree, blueprint);
    console.log(`Processed blueprint #${blueprint.index}`);
    qualitySum += (blueprint.index * blueprint.maxGeodes);
    
    // if (blueprint.bestNode) {
    //   const actions: ActionType[] = [];
    //   let action = blueprint.bestNode;
    //   while (action.parent) {
    //     actions.push(action.type);
    //     action = action.parent;
    //   }
    //   console.log(`${blueprint.index}: (${blueprint.maxGeodes})`);
    //   actions.reverse();
    //   for (let i = 0; i < actions.length; ++i) {
    //     console.log(`  ${i+1}: ${actions[i]}`);
    //   }
    // }
    //printTree(tree, 1);
    //break;
  }
  console.log(qualitySum);
}

main1('input.txt');
