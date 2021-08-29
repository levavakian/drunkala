import React from 'react';
import './App.css';
import Lobby from './Lobby'
import JoinCreate from './JoinCreate'

interface AppState {
  lobby?: string;
  name?: string;
}

class App extends React.Component<{}, AppState> {
  constructor(props: any) {
    super(props)
    let state = this.loadState()
    this.state = {
      ...state
    }
  }

  loadState = () => {
    return {
      lobby: undefined,
      name: undefined
    }
  }

  switchLobby = (code: string, name: string) => {
    this.setState((prevState) => {
      return {
        lobby: code,
        name: name
      }
    })
  }

  render() {
    if (this.state.lobby && this.state.name) {
      return (
        <Lobby
          lobby={this.state.lobby}
          name={this.state.name} />
      )
    } else {
      return (
        <JoinCreate 
          switchLobby={this.switchLobby} />
      )
    }
  }
}

export default App;
