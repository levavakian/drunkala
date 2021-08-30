import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { api } from './api'

interface JoinCreateProps {
  switchLobby: (code: string, name: string) => void
}
  
interface JoinCreateState {
  name: string
  join: string
  do_join: boolean
}
  
class JoinCreate extends React.Component<JoinCreateProps, JoinCreateState> {
  constructor(props: JoinCreateProps) {
    super(props)
    this.state = {
      name: "",
      join: "",
      do_join: false
  }
}

onNameChange = (event: any) => {
  this.setState((prevState) => {
    return {
      name: event.target.value
    }
  })
}

onJoinChange = (event: any) => {
  this.setState((prevState) => {
    return {
      join: event.target.value
    }
  })
}

onCreate = (event: any, hotseat: boolean) => {
  event.preventDefault()
  event.stopPropagation()
  if (!this.state.name) {
    toast("Set your name before creating lobby")
    return
  }
  api("POST", "create", {"size": 2, "hotseat": hotseat}, (e: any) => {
    if (e.target.status !== 201) {
      toast(e.target.response.error)
      return
    }
    const code = e.target.response.code
    const name = this.state.name
    api("POST", "join", {"code": code, "name": name}, (e: any) => {
      if (e.target.status !== 201) {
          toast(e.target.response.error)
          return
      }
      this.props.switchLobby(code, name)
    })
  })
}

onCreateMP = (event: any) => {
  return this.onCreate(event, false)
}

onCreateSP = (event: any) => {
  return this.onCreate(event, true)
}

onJoin = (event: any) => {
  event.preventDefault();
  if (!this.state.name) {
    toast("Set your name before joining lobby")
    return
  }
  if (!this.state.join) {
    toast("Set lobby code before joining lobby")
    return
  }
  const code = this.state.join
  const name = this.state.name
  api("POST", "join", {"code": code, "name": name}, (e: any) => {
    if (e.target.status !== 201) {
      toast(e.target.response?.error)
      return
    }
    this.props.switchLobby(code, name)
  })
}

onDoJoin = (ev: any) => {
  if (!this.state.name) {
    toast("Set your name before joining lobby")
    return
  } else {
    this.setState({
      do_join: true
    })
  }
}

inner = () => {
  if (this.state.do_join) {
    return (
      <div className="Flexcolumn">
        <input value={this.state.join} onChange={this.onJoinChange} placeholder="room code"></input>
        <span onClick={this.onJoin} className="cardanim buttonlist">Join</span>
        <span onClick={(ev: any) => {this.setState({do_join: false})}} className="cardanim buttonlist">Back</span>
      </div>
    )
  } else {
    return (
      <div>
          <div className="Flexrow">
            <span className="cardanim buttonlist">Name</span>
            <input value={this.state.name} onChange={this.onNameChange} placeholder="your name"></input>
          </div>
          <div onClick={this.onCreateMP} className="cardanim buttonlist">Multiplayer</div>
          <div onClick={this.onCreateSP} className="cardanim buttonlist">Hotseat</div>
          <div onClick={this.onDoJoin} className="cardanim buttonlist">Join Existing</div>
      </div>
    )
  }
}

render() {
  
  return (
    <div className="App">
      <ToastContainer />
      <header className="App-header">
        <div>Drunkala</div>
        {this.inner()}
      </header>
    </div>
  )
}
}

export default JoinCreate;