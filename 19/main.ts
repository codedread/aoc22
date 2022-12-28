import { parse } from 'https://deno.land/std@0.168.0/flags/mod.ts';
import { ActionNode, ActionType, Blueprint, World,
         doAction, parseBlueprints, printTree } from './types.ts';

const flags = parse(Deno.args, {
  boolean: ['test'],
  string: ['part', 'mins', 'print'],
  default: { part: '1', mins: undefined, print: undefined , test: false },
});

const RUN_PART = parseInt(flags.part);
if (RUN_PART !== 1 && RUN_PART !== 2) throw `Bad part ${flags.parts}`;

const TEST_MINUTES = flags.mins ? parseInt(flags.mins) : (RUN_PART === 1 ? 24 : 32);

const ALLOWED_PRINTS = ['best', 'leaves', 'tree'];
const printParts = flags.print ? flags.print.split(',') : [];
if (printParts.some(s => !ALLOWED_PRINTS.includes(s)))
  throw `Bad print: '${flags.print}'`;

const PRINT_BEST = printParts.includes('best');
const PRINT_LEAVES = printParts.includes('leaves');
const PRINT_TREE = printParts.includes('tree');

const INPUT_FILE = flags.test ? 'tiny.txt' : 'input.txt';

export let totalNodesAtEachLevel: number[] = [];
export let nodesProcessedAtEachLevel: number[] = [];

let blueprints: Blueprint[] = [];

async function main1(filename: string) {
  let timerId;
  const maxMinutes = 24;

  blueprints = await parseBlueprints(filename);

  let qualitySum = 0;
  for (const blueprint of blueprints) {
    totalNodesAtEachLevel = new Array(maxMinutes).fill(0);
    nodesProcessedAtEachLevel = new Array(maxMinutes).fill(0);

    const tree: ActionNode = {
      type: ActionType.START,
      world: {
        minutesLeft: maxMinutes,
        maxMinutes: maxMinutes,

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

    doAction(tree, blueprint, TEST_MINUTES, {
      totalNodesAtEachLevel,
      nodesProcessedAtEachLevel,
    });

    console.log(`Processed blueprint #${blueprint.index}`);
    qualitySum += (blueprint.index * blueprint.maxGeodes);

    if (PRINT_BEST && blueprint.bestNode) {
      const actions: ActionType[] = [];
      let action = blueprint.bestNode;
      while (action.parent) {
        actions.push(action.type);
        action = action.parent;
      }
      console.log(`${blueprint.index}: (${blueprint.maxGeodes})`);
      actions.reverse();
      for (let i = 0; i < actions.length; ++i) {
        console.log(`  ${i+1}: ${actions[i]}`);
      }
      console.log(`WORLD IS:`);
      console.log(`${JSON.stringify(blueprint.bestNode.world)}`);
    }

    if (PRINT_TREE) {
      printTree(tree, tree.world.maxMinutes);
    } else if (PRINT_LEAVES) {
      printTree(tree, tree.world.maxMinutes - TEST_MINUTES);
    }
  }

  if (timerId) {
    clearInterval(timerId);
  }

  console.log(qualitySum);
}

async function main2(filename: string) {
  const maxMinutes = 32;

  blueprints = await parseBlueprints(filename);
  let maxGeodesList: number[] = [];

  for (const blueprint of blueprints.slice(0, 3)) {
    totalNodesAtEachLevel = new Array(maxMinutes).fill(0);
    nodesProcessedAtEachLevel = new Array(maxMinutes).fill(0);

    const tree: ActionNode = {
      type: ActionType.START,
      world: {
        minutesLeft: maxMinutes,
        maxMinutes: maxMinutes,

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

    if (tree.world.maxMinutes < TEST_MINUTES) throw 'wut';

    console.log(`Processing blueprint #${blueprint.index}...`);

    const THEN = Date.now();
    doAction(tree, blueprint, TEST_MINUTES, {
      totalNodesAtEachLevel,
      nodesProcessedAtEachLevel,
    });
    const NOW = Date.now();
    console.log(`Took ${(NOW-THEN)}ms`)

    if (PRINT_BEST && blueprint.bestNode) {
      const actions: ActionType[] = [];
      let action = blueprint.bestNode;
      while (action.parent) {
        actions.push(action.type);
        action = action.parent;
      }
      console.log(`${blueprint.index}: (${blueprint.maxGeodes})`);
      actions.reverse();
      for (let i = 0; i < actions.length; ++i) {
        console.log(`  ${i+1}: ${actions[i]}`);
      }
    }

    if (PRINT_TREE) {
      printTree(tree, tree.world.maxMinutes);
    } else if (PRINT_LEAVES) {
      printTree(tree, tree.world.maxMinutes - TEST_MINUTES);
    }

    console.log(`Max geodes is ${blueprint.bestNode?.world.geode}`);
    maxGeodesList.push(blueprint.bestNode?.world.geode);

    if (PRINT_BEST && blueprint.bestNode) {
      const actions: ActionType[] = [];
      let action = blueprint.bestNode;
      while (action.parent) {
        actions.push(action.type);
        action = action.parent;
      }
      console.log(`${blueprint.index}: (${blueprint.maxGeodes})`);
      actions.reverse();
      for (let i = 0; i < actions.length; ++i) {
        console.log(`  ${i+1}: ${actions[i]}`);
      }
      console.log(`WORLD IS:`);
      console.log(`${JSON.stringify(blueprint.bestNode.world)}`);
    }
  }

  let productGeodes = 1;
  for (const maxGeodes of maxGeodesList) productGeodes *= maxGeodes;
  console.log(`Product of all maxes is ${productGeodes}`);
}

if (RUN_PART === 1) {
  main1(INPUT_FILE);
} else {
  main2(INPUT_FILE);
}
