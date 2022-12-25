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

function canDo(actionType: ActionType, world: World): boolean {
  if (!blueprint) throw `No blueprint defined`;
  if (actionType === ActionType.WAIT ||
      actionType === ActionType.START ||
      actionType === ActionType.FINISH) return true;
  switch (actionType) {
    case ActionType.BUILD_ORE_ROBOT:
      return world.ore >= blueprint.oreCostForOreCollectingRobot;
    case ActionType.BUILD_CLAY_ROBOT:
      return world.ore >= blueprint.oreCostForClayCollectingRobot;
    case ActionType.BUILD_OBSIDIAN_ROBOT:
      return world.ore >= blueprint.oreCostForObsidianCollectingRobot &&
             world.clay >= blueprint.clayCostForObsidianCollectingRobot;
    case ActionType.BUILD_GEODE_ROBOT:
      return world.ore >= blueprint.oreCostForGeodeCrackingRobot &&
             world.obsidian >= blueprint.obsidianCostForGeodeCrackingRobot;
  }
}

/** Consume and produce in 1 minute. */
function doAction(action: ActionNode, iter: number = 0) {
  if (!blueprint) throw `No blueprint defined`;
  if (!canDo(action.type, action.world)) throw `Cannot manufacture robot: ${action.type}`;

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

  // Now we choose next actions on this node.
  if (!action.next) throw `Bad action.next`;
  if (canDo(ActionType.WAIT, action.world)) {
    action.next.push({
      type: ActionType.WAIT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_ORE_ROBOT, action.world)) {
    action.next.push({
      type: ActionType.BUILD_ORE_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_CLAY_ROBOT, action.world)) {
    action.next.push({
      type: ActionType.BUILD_CLAY_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_OBSIDIAN_ROBOT, action.world)) {
    action.next.push({
      type: ActionType.BUILD_OBSIDIAN_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }
  if (canDo(ActionType.BUILD_GEODE_ROBOT, action.world)) {
    action.next.push({
      type: ActionType.BUILD_GEODE_ROBOT,
      world: {...action.world},
      next: [],
      parent: action,
    });
  }

  if (action.world.minutesLeft > 9) {
    for (const childAction of action.next) {
      doAction(childAction, iter + 1);
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

function printTree(action: ActionNode, indent: number = 0) {
  const indentStr = ' '.repeat(indent);
  console.log(`${indentStr}action: ${action.type}`);
  console.log(`${indentStr}world: ${JSON.stringify(action.world, undefined, indent + 2)}`);
  console.log(`${indentStr}next: [`);
  if (action.next) {
    for (const childAction of action?.next) {
      printTree(childAction, indent + 2);
      console.log(`${indentStr}---`);
    }
  }
  console.log(`${indentStr}]`);
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
  doAction(tree);
  printTree(tree);
}

main1('tiny.txt');
