import * as paper from "paper";

class Player {
  name: string;

  constructor(props: any) {
    this.name = props.name
  }
}

class Hole {
    x: number;
    y: number;
    opposing_hole_idx: number;
    player: number;
    winhole: boolean;
    stones: number[];

    constructor(props: any) {
        this.x = props.x
        this.y = props.y
        this.opposing_hole_idx = props.opposing_hole_idx
        this.player = props.player
        this.winhole = props.winhole
        this.stones = props.stones
    }
}

class GameBoard {
  holes: Hole[];
  num_players: number;
  current_player: number;
  rounds_repeated: number;
  finished: boolean;

  constructor(props: any) {
    this.holes = []
    for (let holejson of props.holes) {
      this.holes.push(new Hole(holejson))
    }
    this.num_players = props.num_players
    this.current_player = props.current_player
    this.rounds_repeated = props.rounds_repeated
    this.finished = props.finished
  }
}

class Action {
  player: string;
  index: number;
  code: string;
  reset: boolean;

  constructor(props: any) {
    this.player = props.player
    this.index = props.index
    this.code = props.code
    this.reset = props.reset
  }
}

class Event {
    owngoal: number;
    eaten: number;
    repeat: number;
    collected: number;
    end_of_round: number;
    index: number;
    victory: number;
    player: number;
    stones: number[];

    constructor(props: any) {
        this.owngoal = props.owngoal
        this.eaten = props.eaten
        this.repeat = props.repeat
        this.collected = props.collected
        this.end_of_round = props.end_of_round
        this.index = props.index
        this.victory = props.victory
        this.player = props.player
        this.stones = props.stones
    }
}

class Rule {
    event: Event;
    trigger_on_opponent: boolean;
    trigger_on_victim: boolean;
    scale_with_num: boolean;
    embed_value: boolean;
    text: string;
    min: number;
    max: number;
    cycle_value_on_die: boolean;

    constructor(props: any) {
        this.event = new Event(props.event)
        this.trigger_on_opponent = props.trigger_on_opponent
        this.trigger_on_victim = props.trigger_on_victim
        this.scale_with_num = props.scale_with_num
        this.embed_value = props.embed_value
        this.text = props.text
        this.min = props.min
        this.max = props.max
        this.cycle_value_on_die = props.cycle_value_on_die
    }
}

class Room {
  code: string;
  board: GameBoard;
  players: Player[];
  history: string[];
  rules: Rule[];
  sp_mode: boolean;

  constructor(props: any) {
    this.code = props.code
    this.board = new GameBoard(props.board)
    this.players = []
    this.history = props.history
    this.sp_mode = props.sp_mode
    for (let jsonplayer of props.players) {
      this.players.push(new Player(jsonplayer))
    }
    this.rules = []
    for (let jsonrule of props.rules) {
        this.rules.push(new Rule(jsonrule))
      }
  }
}

const getPlayerColor = (idx: number) => {
  let color = new paper.Color("red")
  color.hue += idx*230
  return color
}

const getPlayerNames = (room: Room) => {
  let player_names = new Array<string>(room.board.num_players)
  for (let i = 0; i < room.board.num_players; i++) {
    player_names[i] = "Player " + (i+1).toString()
    if (i < room.players.length) {
      player_names[i] = room.players[i].name
    }
  }
  return player_names
}

export { Room, Player, GameBoard, Hole, Action, getPlayerColor, getPlayerNames, Rule, Event }