import React from 'react';
import { Room, getPlayerColor } from './Elements'

interface HistoryProps {
  room?: Room
}

interface HistoryState {
}

class History extends React.Component<HistoryProps,HistoryState> {
  render() {
    let mod = this.props.room?.history.length || 0
    return (
      <div className="scrollable card buttonlist">
        History:
        {this.props.room?.history.map((_, index, array) => (
          <div key={array.length - 1 - index} style={{ color: getPlayerColor(index+400-mod).toCSS(true) }}>{
            array[array.length - 1 - index].split('\n').map((__, stridx, str) => (
              <div key={stridx}>{str[stridx]}</div>
            ))
          }</div>
        ))}
      </div>
    )
  }
}

export default History