package main

import (
	"math/rand"
	"github.com/gorilla/websocket"
	"errors"
	"sync"
	"fmt"
)

const (
	DICE_SIZE = 6
)

type Hole struct {
	X float64
	Y float64
	OpposingHoleIdx int
	Player int
	Winhole bool
	Stones []int
}

type GameBoard struct {
	Holes []*Hole `json:"holes"`
	NumPlayers int `json:"num_players"`
	CurrentPlayer int `json:"current_player"`
	RoundsRepeated int `json:"rounds_repeated"`
	Finished bool `json:"finished"`
}

type Event struct {
	Owngoal int `json:"owngoal"`
	Eaten int `json:"eaten"`
	Repeat int `json:"repeat"`
	Collected int `json:"repeat"`
	EndOfRound int `json:"end_of_round"`
	Index int `json:"index"`
	Victory int `json:"victory"` // 1 - won, 2 - tied, negative - lost
	Player int `json:"player"`
	Stones []int `json:"stones"`
}

type Rule struct {
	Event Event `json:"event"`
	TriggerOnOpponent bool `json:"trigger_on_opponent"`
	ScaleWithNum bool `json:"scale_with_num"`
	EmbedValue bool `json:"embed_value"`
	Text string `json:"text"`
	Min int `json:"min"`
	Max int `json:"max"`
}

type Action struct {
	Code string `json:"code"`
	Player string `json:"player"`
	Index int `json:"index"`
}

type Player struct {
	Name string `json:"name"`
	Conns map[*websocket.Conn]bool `json:"-"`
}

type Room struct {
	sync.RWMutex
	Code string `json:"code"`
	Players []*Player `json:"players"`
	Board *GameBoard `json:"board"`
	History []string `json:"history"`
	Rules []Rule `json:"rules"`
}

func NewRoom(code string, size int) (*Room, error) {
	var board *GameBoard
	if size == 2 {
		board = NewTwoPlayerBoard()
	} else {
		return nil, errors.New("Invalid board size")
	}
	return &Room{
		Code: code,
		Board: board,
		Rules: NewDefaultRules(),
		Players: []*Player{},
		History: []string{},
	}, nil
}

func (r *Room) GetPlayer(name string) (*Player, int) {
	for idx, player := range r.Players {
		if player.Name == name {
			return player, idx
		}
	}
	return nil, 0
}

func (g *GameBoard) Next(idx int) int {
	idx = idx + 1
	if idx > len(g.Holes) {
		idx = 0
	}
	return idx
}

func (g *GameBoard) NextPlayer(pidx int) int {
	return (pidx + 1) % g.NumPlayers
}

func (g *GameBoard) PlayerWinholeIdx(pidx int) int {
	for idx, hole := range g.Holes {
		if hole.Player == pidx && hole.Winhole {
			return idx
		}
	}
	return -1
}

func NewTwoPlayerBoard() *GameBoard {
	b := &GameBoard{
		Holes: []*Hole{},
		NumPlayers: 2,
		CurrentPlayer: rand.Intn(2),
	}

	b.Holes = append(b.Holes, &Hole{
		X: -3.5,
		Y: -1,
		OpposingHoleIdx: -1,
		Player: 0,
		Winhole: true,
		Stones: []int{},
	})
	for i := 0; i < 6; i++ {
		b.Holes = append(b.Holes, &Hole{
			X: -3.5 + float64(i) + 1.0,
			Y: -1,
			OpposingHoleIdx: 13 - i,
			Player: 0,
			Winhole: false,
			Stones: []int{},
		})
	}
	for i := 0; i < 6; i++ {
		b.Holes = append(b.Holes, &Hole{
			X: -3.5 + 6 - float64(i) + 1.0,
			Y: -1,
			OpposingHoleIdx: 7 - i,
			Player: 1,
			Winhole: false,
			Stones: []int{},
		})
	}
	b.Holes = append(b.Holes, &Hole{
		X: 3.5,
		Y: 1,
		OpposingHoleIdx: -1,
		Player: 1,
		Winhole: true,
		Stones: []int{},
	})
	return b
}

func Shuffle(l []int) []int {
	rand.Shuffle(len(l), func(i, j int) { l[i], l[j] = l[j], l[i] })
	return l
}

func NewDefaultRules() []Rule {
	rules := []Rule{
		Rule{
			Event: Event{
				Eaten: 1,
				Collected: 1,
				EndOfRound: 1,
			},
			TriggerOnOpponent: true,
			Text: "give a level 6 confession",
		},
		Rule{
			Event: Event{
				Eaten: 1,
			},
			TriggerOnOpponent: true,
			ScaleWithNum: true,
			Text: "take a drink!",
		},
		Rule{
			Event: Event{
				Collected: 1,
			},
			TriggerOnOpponent: true,
			ScaleWithNum: true,
			Text: "take a drink!",
		},
		Rule{
			Event: Event{
				EndOfRound: 1,
			},
			TriggerOnOpponent: true,
			ScaleWithNum: true,
			Text: "take a drink!",
		},
		Rule{
			Event: Event{
				EndOfRound: 1,
			},
			TriggerOnOpponent: true,
			ScaleWithNum: true,
			Text: "take a drink!",
		},
		Rule{
			Event: Event{
				Repeat: 1,
			},
			Text: "best/worst category",
			Max: 1,
		},
		Rule{
			Event: Event{
				Owngoal: 1,
			},
			Text: "give a dice roll confession",
		},
		Rule{
			Event: Event{
				Eaten: 1,
			},
			Text: "say a nice thing",
			Max: 1,
			Min: 1,
		},
		Rule{
			Event: Event{
				Eaten: 1,
			},
			Text: "say a mean thing",
			Max: 2,
			Min: 2,
		},
		Rule{
			Event: Event{
				Eaten: 1,
			},
			Text: "ask a dice roll truth",
			Min: 3,
		},
		Rule{
			Event: Event{
				Victory: 1,
			},
			Text: "give a level %s confession",
			EmbedValue: true,
			ScaleWithNum: true,
			Max: -1,
		},
	}
	return rules
}

func (r *Room) Combine(rule Rule, v int) []string {
	s := ""
	if rule.TriggerOnOpponent {
		for idx, player := range r.Players {
			if idx == rule.Event.Player {
				continue
			}
			s += player.Name + ","
		}
		s = s[:len(s)-1] + ": "
	} else {
		s = r.Players[rule.Event.Player].Name + ": "
	}
	s += rule.Text
	if rule.EmbedValue {
		s = fmt.Sprintf(s, v)
	}
	if rule.ScaleWithNum && v > 1 {
		out := []string{}
		for i := 0; i < v; i++ {
			out[i] = s
		}
		return out
	} else {
		return []string{s}
	}
}

func (r *Room) ApplyGenericRule(ev Event, rule Rule, f func(Event)int) ([]string, bool) {
	ret := []string{}

	valev := f(ev)
	valru := f(rule.Event)

	if valev == 0 || valru == 0 {
		return ret, false
	}

	if rule.Min != 0 && valev < rule.Min {
		return ret, false
	}

	if rule.Max != 0 && valev > rule.Max {
		return ret, false
	}

	if len(rule.Event.Stones) != 0 {
		for _, stone := range rule.Event.Stones {
			found := false
			for _, evstone := range ev.Stones {
				if stone == evstone {
					found = true
					break
				}
			}
			if !found {
				return ret, false
			}
		}
	}
	if valev < 0 {
		valev = valev * -1
	}
	return r.Combine(rule, valev), true
}

func (r *Room) ApplyRules(ev Event) []string {
	logs := []string{}

	for _, rule := range r.Rules {
		// Do all the generic rules
		nlogs, found := r.ApplyGenericRule(ev, rule, func(ev Event)int{
			return ev.Owngoal
		})
		logs = append(logs, nlogs...)
		if found {
			continue
		}

		nlogs, found = r.ApplyGenericRule(ev, rule, func(ev Event)int{
			return ev.Eaten
		})
		logs = append(logs, nlogs...)
		if found {
			continue
		}

		nlogs, found = r.ApplyGenericRule(ev, rule, func(ev Event)int{
			return ev.Repeat
		})
		logs = append(logs, nlogs...)
		if found {
			continue
		}
		
		nlogs, found = r.ApplyGenericRule(ev, rule, func(ev Event)int{
			return ev.Collected
		})
		logs = append(logs, nlogs...)
		if found {
			continue
		}

		nlogs, found = r.ApplyGenericRule(ev, rule, func(ev Event)int{
			return ev.EndOfRound
		})
		logs = append(logs, nlogs...)
		if found {
			continue
		}

		nlogs, found = r.ApplyGenericRule(ev, rule, func(ev Event)int{
			return ev.Victory
		})
		logs = append(logs, nlogs...)
		if found {
			continue
		}
	}
	return logs
}

func (r *Room) HandleEvents(evs []Event) string {
	logs := map[string]int{}
	for _, ev := range evs {
		incoming := r.ApplyRules(ev)
		for _, log := range incoming {
			logs[log] += 1
		}
	}
	out := ""
	for k, v := range logs {
		if v > 1 {
			out += fmt.Sprintf(k + " x%d" + "\n", v)
		} else {
			out += k + "\n"
		}
	}
	return out
}

func (r *Room) DoAction(a *Action) error {
	if len(r.Players) < r.Board.NumPlayers {
		return errors.New("waiting for more players")
	}
	p, pidx := r.GetPlayer(a.Player)
	if p == nil || pidx != r.Board.CurrentPlayer {
		return errors.New("wrong player")
	}
	if a.Index < 0 || a.Index >= len(r.Board.Holes) {
		return errors.New("specified hole does not exist")
	}
	if r.Board.Holes[a.Index].Player != pidx {
		return errors.New("player does not own this hole")
	}
	if r.Board.Holes[a.Index].Winhole {
		return errors.New("winholes can not be moved")
	}

	// Pick up the stones
	evs := []Event{}
	stones := Shuffle(r.Board.Holes[a.Index].Stones)
	r.Board.Holes[a.Index].Stones = []int{}

	// Drop each stone
	hIdx := a.Index
	for idx, stone := range stones {
		hIdx = r.Board.Next(hIdx)

		last := idx == len(stones) - 1
		repeat := last && r.Board.Holes[hIdx].Winhole && r.Board.Holes[hIdx].Player == pidx

		if repeat {
			r.Board.RoundsRepeated += 1
			evs = append(evs, Event{Repeat: r.Board.RoundsRepeated, Player: pidx})
		} else {
			r.Board.RoundsRepeated = 0
			r.Board.CurrentPlayer = r.Board.NextPlayer(r.Board.CurrentPlayer)
		}

		r.Board.Holes[hIdx].Stones = append(r.Board.Holes[hIdx].Stones, stone)

		if r.Board.Holes[hIdx].Winhole {
			if r.Board.Holes[hIdx].Player == pidx {
				evs = append(evs, Event{Collected: 1, Index: hIdx, Player: pidx, Stones: []int{stone}})
			} else {
				evs = append(evs, Event{Owngoal: 1, Index: hIdx, Player: pidx, Stones: []int{stone}})
				evs = append(evs, Event{Collected: 1, Index: hIdx, Player: r.Board.Holes[hIdx].Player, Stones: []int{stone}})
			}
		}

		if last && len(r.Board.Holes[hIdx].Stones) == 1 && !r.Board.Holes[hIdx].Winhole{
			winIdx := r.Board.PlayerWinholeIdx(pidx)
			oppositeHoleIdx := r.Board.Holes[hIdx].OpposingHoleIdx
			numEaten := len(r.Board.Holes[oppositeHoleIdx].Stones)
			ev := Event{Eaten: numEaten, Player: pidx, Index: hIdx}

			ev.Stones = append(ev.Stones, r.Board.Holes[hIdx].Stones...)
			ev.Stones = append(ev.Stones, r.Board.Holes[oppositeHoleIdx].Stones...)

			r.Board.Holes[winIdx].Stones = append(r.Board.Holes[winIdx].Stones, r.Board.Holes[hIdx].Stones...)
			r.Board.Holes[winIdx].Stones = append(r.Board.Holes[winIdx].Stones, r.Board.Holes[oppositeHoleIdx].Stones...)

			r.Board.Holes[hIdx].Stones = []int{}
			r.Board.Holes[oppositeHoleIdx].Stones = []int{}

			evs = append(evs, ev)
		}
	}

	// Check for end condition
	nFreeStones := make([]int, r.Board.NumPlayers)
	for _, hole := range r.Board.Holes {
		if hole.Winhole {
			continue
		}
		nFreeStones[hole.Player] += len(hole.Stones)
	}
	gameOver := false
	for _, free := range nFreeStones {
		if free == 0 {
			gameOver = true
		}
	}

	// Handle game ending
	if gameOver {
		r.Board.Finished = true
		freeStones := make([][]int, r.Board.NumPlayers)
		pWinHoles := make([]int, r.Board.NumPlayers)
		for i := 0; i < r.Board.NumPlayers; i++ {
			pWinHoles[i] = r.Board.PlayerWinholeIdx(i)
		}

		for _, hole := range r.Board.Holes {
			if hole.Winhole {
				continue
			}
			freeStones[hole.Player] = append(freeStones[hole.Player], hole.Stones...)
			hole.Stones = []int{}
		}

		for idx, stones := range freeStones {
			evs = append(evs, Event{EndOfRound: len(stones), Player: idx, Stones: stones})
			r.Board.Holes[pWinHoles[idx]].Stones = append(r.Board.Holes[pWinHoles[idx]].Stones, stones...)
		}

		maxStones := 0
		nTied := 0
		totalStones := make([]int, r.Board.NumPlayers)
		for idx, _ := range totalStones {
			total := len(r.Board.Holes[pWinHoles[idx]].Stones)
			if  total > maxStones {
				maxStones = total
				nTied = 0
			} else if total == maxStones {
				nTied++
			}
		}
		for idx, _ := range totalStones {
			total := len(r.Board.Holes[pWinHoles[idx]].Stones)
			vic := 0
			if total == maxStones && nTied == 0 {
				vic = 1
			} else if total == maxStones && nTied > 0 {
				vic = 2
			} else {
				vic = total - maxStones
			}
			evs = append(evs, Event{Victory: vic, Player: idx})
		}
	}

	// Handle Rules
	r.History = append(r.History, r.HandleEvents(evs))

	return nil
}