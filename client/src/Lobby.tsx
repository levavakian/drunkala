import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { api, wsURL } from './api'
import { Room } from './Elements'
import Canvas from './Canvas'
import History from './History'
import Interaction from './Interaction'
// import Rules from './Rules'

interface LobbyProps {
  lobby: string;
  name: string;
}

interface LobbyState {
  room?: Room
//   img?: paper.Raster
}
  
class Lobby extends React.Component<LobbyProps, LobbyState> {
  timerId?: number
  ws?: WebSocket
  last_ws_update: Date

  constructor(props: LobbyProps) {
    super(props)
    this.last_ws_update = new Date()
    this.state = {
    }
  }

  componentDidMount() {
    this.loadFromServer()
    this.ws = this.makeWS()
    this.timerId = window.setInterval(
      () => this.poll(),
      10000
    )
  }

  makeWS() {
    let socket = new WebSocket(wsURL + `/api/stream?name=${this.props.name}&code=${this.props.lobby}`)
    socket.onmessage = (ev: MessageEvent<any>) => {
      this.last_ws_update = new Date()
      let parsed = JSON.parse(ev.data)
      if ('heartbeat' in parsed) {
        return
      }
      if ('ping' in parsed) {
        toast(parsed.ping + " asks that you hurry up")
        return
      }
      this.loadFromServer()
    }
    return socket
  }

  poll() {
    let now = new Date()
    let timeDiff = (now.getTime() - this.last_ws_update.getTime()) / 1000
    if (timeDiff > 10)
    {
      this.loadFromServer()
      this.ws?.close()
      this.ws = this.makeWS()
    }
  }

  componentWillUnmount() {
    if (this.timerId) {
      clearInterval(this.timerId)
    }
  }

  loadFromServer() {
    api("POST", "state", {"code": this.props.lobby}, (e: any) => {
      if (e.target.status !== 200) {
        toast("error", e.target.response?.error)
        return
      }
      let room = new Room(e.target.response)
      this.setState((prevState) => {
        return {
          room: room
        }
      })
    })
  }

  render() {
    return (
      <div>
        <ToastContainer />
        <div className="App-banner">Drunkala || Lobby is {this.props.lobby} || Name is {this.props.name}
          { this.state.room ? <Canvas room={this.state.room} player={this.props.name} load_board={() => {this.loadFromServer()}} /> : <></> }
          <Interaction room={this.state.room} name={this.props.name}></Interaction>
          <History room={this.state.room} />
          {/* <Rules room={this.state.room} name={this.props.name} /> */}
        </div>
      </div>
    )
  }
}

export default Lobby;