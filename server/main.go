package main

import (
	"log"
	"math/rand"
	"net/http"
	"encoding/json"
	"os"
	"github.com/gorilla/websocket"
	"sync"
)

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"

func RandStringRunes(n int) string {
    b := make([]byte, n)
    for i := range b {
        b[i] = letters[rand.Intn(len(letters))]
    }
    return string(b)
}

func setupHeaders(w *http.ResponseWriter, req *http.Request) bool {
	if nocors := os.Getenv("NOCORS"); nocors != "" {
		(*w).Header().Set("Access-Control-Allow-Origin", "*")
	}
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Authorization")
	(*w).Header().Set("Content-Type", "application/json")

	if req.Method != http.MethodPost && req.Method != http.MethodGet {
		(*w).WriteHeader(http.StatusOK)
		return false
	}
	return true
 }

 type JSONError struct {
	Error string `json:"error"`
}

func WriteError(w http.ResponseWriter ,err string, statusCode int) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(JSONError{err})
}

func (r *Room) NotifyPlayers() {
	for _, player := range r.Players {
		for ws, _ := range player.Conns {
			err := ws.WriteJSON(struct{}{})
			if err != nil {
				ws.Close()
				delete(player.Conns, ws)
			}
		}
	}
}

type LockedRooms struct {
	sync.RWMutex
	Rooms map[string]*Room
}

func HandleCreate(rooms *LockedRooms) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if !setupHeaders(&w, r) {
			return
		}

		type CreateReq struct {
			Size int
		}
		var createReq CreateReq
		err := json.NewDecoder(r.Body).Decode(&createReq)
		if err != nil {
			WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}

		rooms.Lock()
		defer rooms.Unlock()

		type CreateRes struct {
			Code string `json:"code"`
		}
		
		for i := 0; i < 10000; i++ {
			code := &CreateRes{Code: RandStringRunes(6)}

			if _, ok := rooms.Rooms[code.Code]; ok {
				continue
			}

			nr, err := NewRoom(code.Code, createReq.Size)
			if err != nil {
				WriteError(w, err.Error(), http.StatusBadRequest)
			}

			rooms.Rooms[code.Code] = nr
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(code)
			return
		}

		WriteError(w, "could not create unique room code", http.StatusInternalServerError)
		return
	}
}

func HandlePing(rooms *LockedRooms) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if !setupHeaders(&w, r) {
			return
		}

		type PingReq struct {
			Code string
			Name string
		}
		var req PingReq
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}
		if req.Code == "" {
			WriteError(w, "lobby code missing from ping request", http.StatusBadRequest)
			return
		}

		if req.Name == "" {
			WriteError(w, "name missing from ping request", http.StatusBadRequest)
			return
		}

		rooms.Lock()
		room, ok := rooms.Rooms[req.Code]
		rooms.Unlock()

		if !ok {
			WriteError(w, "no such lobby", http.StatusBadRequest)
			return
		}

		room.Lock()
		defer room.Unlock()

		type Ping struct {
			Ping string `json:"ping"`
		}

		for idx, player := range room.Players {
			if req.Name != player.Name && idx == room.Board.CurrentPlayer {
				for ws, _ := range player.Conns {
					nerr := ws.WriteJSON(Ping{req.Name})
					if nerr != nil {
						err = nerr
					}
				}
			}
		}

		if err != nil {
			WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}
		
		w.WriteHeader(http.StatusOK)
	}
}

func HandleJoin(rooms *LockedRooms) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if !setupHeaders(&w, r) {
			return
		}

		type JoinReq struct {
			Code string
			Name string
		}
		var joinReq JoinReq
		err := json.NewDecoder(r.Body).Decode(&joinReq)
		if err != nil {
			WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}
		if joinReq.Code == "" || joinReq.Name == "" {
			WriteError(w, "name or lobby code missing from join request", http.StatusBadRequest)
			return
		}

		rooms.Lock()
		room, ok := rooms.Rooms[joinReq.Code]
		rooms.Unlock()

		if !ok {
			WriteError(w, "tried to join nonexistant lobby", http.StatusBadRequest)
			return
		}

		room.Lock()
		defer room.Unlock()

		for _, player := range room.Players {
			if player.Name == joinReq.Name {
				w.WriteHeader(http.StatusCreated)
				json.NewEncoder(w).Encode(room)
				return
			}
		}

		newPlayer := &Player{Name: joinReq.Name, Conns: map[*websocket.Conn]bool{}}
		room.Players = append(room.Players, newPlayer)

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(room)
		room.NotifyPlayers()

		return
	}
}

func HandleAction(rooms *LockedRooms) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if !setupHeaders(&w, r) {
			return
		}

		var input Action
		err := json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}
		if input.Code == "" {
			WriteError(w, "lobby code missing from input", http.StatusBadRequest)
			return
		}
		if input.Player == "" {
			WriteError(w, "name missing from input", http.StatusBadRequest)
			return
		}

		rooms.Lock()
		room, ok := rooms.Rooms[input.Code]
		rooms.Unlock()

		if !ok {
			WriteError(w, "no such lobby", http.StatusBadRequest)
			return
		}

		room.Lock()
		defer room.Unlock()

		err = room.DoAction(&input)

		if err == nil {
			room.NotifyPlayers()
		}
		if err != nil {
			WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusCreated)
	}
}

func HandleRule(rooms *LockedRooms) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if !setupHeaders(&w, r) {
			return
		}

		type RuleReq struct {
			Code string
			Delete bool
			Id int
			Rule Rule
		}
		var req RuleReq
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			WriteError(w, err.Error(), http.StatusBadRequest)
			return
		}
		if req.Code == "" {
			WriteError(w, "lobby code missing from prompt request", http.StatusBadRequest)
			return
		}

		rooms.Lock()
		room, ok := rooms.Rooms[req.Code]
		rooms.Unlock()

		if !ok {
			WriteError(w, "no such lobby", http.StatusBadRequest)
			return
		}

		room.Lock()
		defer room.Unlock()

		if req.Delete {
			if req.Id < len(room.Rules) && req.Id > 0 {
				room.Rules = append(room.Rules[:req.Id], room.Rules[req.Id+1:]...)
			} else {
				WriteError(w, "invalid rule id", http.StatusBadRequest)
				return
			}
		} else {
			room.Rules = append(room.Rules, req.Rule)
		}

		w.WriteHeader(http.StatusOK)
		room.NotifyPlayers()
	}
}

func main() {
	log.Println("Hello World")
}