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
  /** Special non-action signifying time has run out. */
  FINISH = "FINISH",
}

interface ActionNode {
  type: ActionType;
  /** The state of the world after this action. */
  world: World;
  next?: ActionNode[];
  parent?: ActionNode;
}

interface Blueprint {
  oreCostForOreCollectingRobot: number;
  oreCostForClayCollectingRobot: number;
  oreCostForObsidianCollectingRobot: number;
  clayCostForObsidianCollectingRobot: number;
  oreCostForGeodeCrackingRobot: number;
  obsidianCostForGeodeCrackingRobot: number;
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

  if (actionType === ActionType.START ||
      actionType === ActionType.FINISH) return true;
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
   */
  let couldHaveCreatedOreRobotButDidNot = false;
  let couldHaveCreatedClayRobotButDidNot = false;
  let couldHaveCreatedObsRobotButDidNot = false;
  let couldHaveCreatedGeodeRobotButDidNot = false;
  if (action.type === ActionType.WAIT) {
    couldHaveCreatedOreRobotButDidNot = canDo(ActionType.BUILD_ORE_ROBOT, action.world, blueprint);
    couldHaveCreatedClayRobotButDidNot = canDo(ActionType.BUILD_CLAY_ROBOT, action.world, blueprint);
    couldHaveCreatedObsRobotButDidNot = canDo(ActionType.BUILD_OBSIDIAN_ROBOT, action.world, blueprint);
    couldHaveCreatedGeodeRobotButDidNot = canDo(ActionType.BUILD_GEODE_ROBOT, action.world, blueprint);
  }

  if (action.type !== ActionType.START && action.type !== ActionType.FINISH) {
    // Accrue raw resources.
    action.world.ore += action.world.oreCollectingRobots;
    action.world.clay += action.world.clayCollectingRobots;
    action.world.obsidian += action.world.obsidianCollectingRobots;
    action.world.geode += action.world.geodeCrackingRobots;

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

  if (canDo(ActionType.WAIT, action.world, blueprint)) {
    action.next.push({
      type: ActionType.WAIT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }

  if (canDo(ActionType.BUILD_ORE_ROBOT, action.world, blueprint)
      && !couldHaveCreatedOreRobotButDidNot) {
    action.next.push({
      type: ActionType.BUILD_ORE_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_CLAY_ROBOT, action.world, blueprint)
      && !couldHaveCreatedClayRobotButDidNot) {
    action.next.push({
      type: ActionType.BUILD_CLAY_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_OBSIDIAN_ROBOT, action.world, blueprint)
      && !couldHaveCreatedObsRobotButDidNot) {
    action.next.push({
      type: ActionType.BUILD_OBSIDIAN_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_GEODE_ROBOT, action.world, blueprint)
      && !couldHaveCreatedGeodeRobotButDidNot) {
    action.next.push({
      type: ActionType.BUILD_GEODE_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }

  // Until our algorithm is further restricted, we can't go lower than this.
  // Currently printTree() results in over 8M lines of text!
  if (action.world.minutesLeft > 1) {
    for (const childAction of action.next) {
      doAction(childAction, blueprint);
    }
  }
}

const blueprints: Blueprint[] = [];
let blueprint: Blueprint;

async function parseBlueprints(filename: string) {
  const lines: string[] = (await Deno.readTextFile(filename)).split(/\r?\n/);
  for (const line of lines) {
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
      oreCostForOreCollectingRobot,
      oreCostForClayCollectingRobot,
      oreCostForObsidianCollectingRobot,
      clayCostForObsidianCollectingRobot,
      oreCostForGeodeCrackingRobot,
      obsidianCostForGeodeCrackingRobot,
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
  blueprint = blueprints[0];

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
  printTree(tree, 6);
}

main1('tiny.txt');
