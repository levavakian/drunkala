import React from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { api } from './api'
import { Room, getPlayerNames } from './Elements'

interface InteractionProps {
    room?: Room
    name: string
}

interface InteractionState {
    hiddenDie: number
}

class Interaction extends React.Component<InteractionProps,InteractionState> {
    constructor(props: InteractionProps) {
      super(props)
      this.state = {
        hiddenDie: 1
      }
    }

    doPing = (evt: any) => {
        api("POST", "ping", {"code": this.props.room?.code, "name": this.props.name}, (e: any) => {
            if (e.target.response?.error) {
            toast(e.target.response.error)
            }
        })
    }

    doRestart = (evt: any) => {
        const code = this.props.room?.code
        const name = this.props.name
        api("POST", "input", {"player": name, "code": code, index: 0, reset: true}, (e: any) => {
            if (e.target.status !== 201) {
                toast(e.target.response.error)
                return
            }
        })  
    }

    makePing() {
        if (!this.props.room) {
            return <span>Waiting for room...</span>
        }

        if (this.props.room.board.finished) {
            return <span className="cardanim buttonlist">The game has ended</span>
        }

        let pidx = this.props.room.players.map((player,idx,parr)=>{return player.name}).indexOf(this.props.name)
        let player_names = getPlayerNames(this.props.room)
        if (pidx >= 0 && pidx === this.props.room.board.current_player) {
            return <span className="cardanim buttonlist">No one to ping</span>
        }
        return <span onClick={this.doPing} className="cardanim buttonlist">Ping: {player_names[this.props.room.board.current_player]}</span>
    }

    makeReset() {
        if (!this.props.room || !this.props.room.board.finished) {
            return <></>
        }
        return <span className="cardanim buttonlist" onClick={this.doRestart}>Restart Game</span>
    }

    dieRoll = (evt: any) => {
        this.setState({
            hiddenDie: 1 + Math.floor(Math.random() * Math.floor(6))
        })
    }

    render() {
        return (
          <div className="Flexcolumn">
            <div className="Flexrow">
              <span onClick={this.dieRoll} className="cardanim buttonlist">Hidden Die: {this.state.hiddenDie}</span>
              {this.makePing()}
              {this.makeReset()}
            </div>
          </div>
        )
      }
}

export default Interaction;