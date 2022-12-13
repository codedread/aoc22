import * as fs from 'fs';

const SHAPE_CHOICES = {
  'A': 'ROCK',
  'B': 'PAPER',
  'C': 'SCISSORS',
  'X': 'ROCK',
  'Y': 'PAPER',
  'Z': 'SCISSORS',
}

const LOSS = 0;
const TIE = 3;
const WIN = 6;

function pointsForGame(opponent, mine) {
  switch (opponent) {
    case 'ROCK': switch(mine) {
      case 'ROCK': return TIE;
      case 'PAPER': return WIN;
      case 'SCISSORS': return LOSS;
    }
    case 'PAPER': switch(mine) {
      case 'ROCK': return LOSS;
      case 'PAPER': return TIE;
      case 'SCISSORS': return WIN;
    }
    case 'SCISSORS': switch(mine) {
      case 'ROCK': return WIN;
      case 'PAPER': return LOSS;
      case 'SCISSORS': return TIE;
    }
  }
}

function choiceForGame(opponent, result) {
  switch (opponent) {
    case 'ROCK': switch(result) {
      case 'X': return 'SCISSORS';
      case 'Y': return 'ROCK';
      case 'Z': return 'PAPER';
    }
    case 'PAPER': switch(result) {
      case 'X': return 'ROCK';
      case 'Y': return 'PAPER';
      case 'Z': return 'SCISSORS';
    }
    case 'SCISSORS': switch(result) {
      case 'X': return 'PAPER';
      case 'Y': return 'SCISSORS';
      case 'Z': return 'ROCK';
    }
  }
}

const POINTS_FOR_SHAPE = {
  'ROCK': 1,
  'PAPER': 2,
  'SCISSORS': 3,
}

function part1() {
  const lines = fs.readFileSync('input.txt', 'utf-8').split(/\r?\n/);
  let score = 0;
  for (const line of lines) {
    const results = line.split(' ');
    if (results.length !== 2) continue;
    const oppShape = SHAPE_CHOICES[results[0]];
    const myShape = SHAPE_CHOICES[results[1]];
    score +=
        pointsForGame(oppShape, myShape) +
        POINTS_FOR_SHAPE[myShape];
  }
  console.log(score);
}

function part2() {
  const lines = fs.readFileSync('input.txt', 'utf-8').split(/\r?\n/);
  let score = 0;
  for (const line of lines) {
    const results = line.split(' ');
    if (results.length !== 2) continue;
    const oppShape = SHAPE_CHOICES[results[0]];
    const myShape = choiceForGame(oppShape, results[1]);
    score +=
        pointsForGame(oppShape, myShape) +
        POINTS_FOR_SHAPE[myShape];
  }
  console.log(score);
}

part2();