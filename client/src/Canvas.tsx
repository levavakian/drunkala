import { Room, getPlayerColor } from './Elements'
import * as paper from "paper";
import { Path, Point, PointText } from "paper";
import React, { createRef,RefObject } from 'react';
import { api } from './api'
import { toast } from 'react-toastify';
import { getPlayerNames } from './Elements'

function Playerlist(props: any) {
  let player_names = getPlayerNames(props.room)
  return (
    <div>
      <div>

      </div>
        <span>Players: </span>
        {player_names.map((_, idx, arr) => {
          return <span style={{color: getPlayerColor(idx).toCSS(true)}}>{player_names[idx]} </span>
        })}
      <div>
        <span>Current player: </span>
        <span style={{color: getPlayerColor(props.room.board.current_player).toCSS(true)}}>{player_names[props.room.board.current_player]}</span>
      </div>
    </div>
  )
}

let stone_anims = new Map<number, StoneAnimInfo>()

interface CanvasProps {
  room: Room
  player: string
  load_board: () => void
}

interface CanvasState {
  width: number
  height: number
  loaded: boolean
}

class StoneAnimInfo {
  path: paper.Path;
  current_x: number;
  current_y: number;
  target_x: number;
  target_y: number;
  hole: number;

  constructor(path: paper.Path, current_x: number, current_y: number,
              target_x: number, target_y: number, hole: number)
  {
    this.path = path
    this.current_x = current_x
    this.current_y = current_y
    this.target_x = target_x
    this.target_y = target_y
    this.hole = hole
  }
}

class Canvas extends React.Component<CanvasProps, CanvasState> {
  canvasRef: RefObject<HTMLCanvasElement>
  layer: paper.Layer | undefined

  constructor(props: CanvasProps) {
    super(props)
    this.canvasRef = createRef<HTMLCanvasElement>()
    this.state = {
      width: 800,
      height:400,
      loaded: false,
    }
  }

  setupBoard = () => {
    this.layer = new paper.Layer()
    this.layer.activate()
  }

  onFrame = (event: any) => {
    for (let [, frame] of stone_anims.entries()) {
      let dx = frame.target_x - frame.current_x
      let dy = frame.target_y - frame.current_y
      if ((dx*dx + dy*dy) < .05) {
        continue
      }
      let angle = Math.atan2(dy, dx)
      frame.current_x = frame.current_x + 100*Math.cos(angle)*event.delta
      frame.current_y = frame.current_y + 100*Math.sin(angle)*event.delta
      frame.path.position = new Point(frame.current_x, frame.current_y)
    }
  }

  drawBoard = () => {
    if (!this.props.room) {
      return
    }
    this.layer?.removeChildren()

    var rectangle = new paper.Rectangle(new Point(0, 0), new paper.Size(800, 400));
    var cornerSize = new paper.Size(10, 10);
    var shape = new paper.Shape.Rectangle(rectangle, cornerSize);
    shape.strokeColor = new paper.Color('black');

    let trigupdate = new Path.Circle(new Point(this.state.width/2, this.state.height/2), 10)
    trigupdate.fillColor = new paper.Color('black')
    trigupdate.onMouseUp = () => {
      this.props.load_board()
    }

    for (let [idx, hole] of this.props.room.board.holes.entries()) {
        const cCenter = new Point(this.state.width/2 + hole.x*75, this.state.height/2 + hole.y*75)
        let pcircle = new Path.Circle(cCenter, 35)
        pcircle.strokeColor = getPlayerColor(hole.player)
        pcircle.fillColor = new paper.Color('#333333')
        let enter = ()=>{
          pcircle.fillColor = new paper.Color('#888888')
        }
        let leave = ()=>{
          pcircle.fillColor = new paper.Color('#333333')
        }
        let down = ()=>{
          pcircle.fillColor = new paper.Color('#33ff33')
        }
        let up = ()=>{
          pcircle.fillColor = new paper.Color('#888888')
          if (!this.props.player) {
            toast("Set your name before creating lobby")
            return
          }
          const code = this.props.room.code
          const name = this.props.player
          api("POST", "input", {"player": name, "code": code, index: idx}, (e: any) => {
            if (e.target.status !== 201) {
              toast(e.target.response.error)
              return
            }
            this.props.load_board()
          })
        }
        pcircle.onMouseEnter = enter
        pcircle.onMouseLeave = leave
        pcircle.onMouseDown = down
        pcircle.onMouseUp = up
        pcircle.sendToBack()

        let tCenter = new Point(cCenter.x, cCenter.y + 47)
        let ptext = new PointText(tCenter)
        ptext.fillColor = new paper.Color('black')
        ptext.justification = 'center'
        ptext.content = hole.stones.length.toString()

        for (let [, stone] of hole.stones.entries()) {
          let frame = stone_anims.get(stone)
          if (frame && frame.hole !== idx) {
            let scircle = new Path.Circle(new Point(frame.current_x, frame.current_y), 10)
            scircle.fillColor = getPlayerColor(stone)
            frame.path = scircle
            frame.hole = idx
            frame.target_x = this.state.width/2 + 75*hole.x + (Math.random()-0.5)*40
            frame.target_y = this.state.height/2 + 75*hole.y + (Math.random()-0.5)*40
            frame.path.onMouseEnter = enter
            frame.path.onMouseLeave = leave
            frame.path.onMouseDown = down
            frame.path.onMouseUp = up
          } else if (frame) {
            let scircle = new Path.Circle(new Point(frame.current_x, frame.current_y), 10)
            scircle.fillColor = getPlayerColor(stone)
            frame.path = scircle
            frame.path.onMouseEnter = enter
            frame.path.onMouseLeave = leave
            frame.path.onMouseDown = down
            frame.path.onMouseUp = up
          } else if (!frame) {
            const sCenter = new Point(cCenter.x + 40*(Math.random()-0.5), cCenter.y + 40*(Math.random()-0.5))
            let scircle = new Path.Circle(sCenter, 10)
            scircle.fillColor = getPlayerColor(stone)
            scircle.onMouseEnter = enter
            scircle.onMouseLeave = leave
            scircle.onMouseDown = down
            scircle.onMouseUp = up
            let nframe = new StoneAnimInfo(scircle, sCenter.x, sCenter.y, sCenter.x, sCenter.y, idx)
            stone_anims.set(stone, nframe)
          } 
        }

        // if (hole.opposing_hole_idx >= 0) {
        //   const oCenter = new Point(this.state.width/2 + this.props.room.board.holes[hole.opposing_hole_idx].x*75,
        //                             this.state.height/2 + this.props.room.board.holes[hole.opposing_hole_idx].y*75)
        //   let pLine = new Path.Line(cCenter, oCenter)
        //   pLine.strokeColor = new paper.Color('green')
        // }
    }
  };

  onImageLoad = () => {
    if (!this.canvasRef.current) {
      return
    }
    this.setState((prevState) => {
      return {
        width: 800,
        height: 400,
        loaded: true
      }
    })
    paper.setup(this.canvasRef.current)
    paper.view.onFrame = this.onFrame
    this.setupBoard()
  }

  componentDidMount() {
    this.onImageLoad()
  }

  render = () => {
    if (this.state.loaded) {
      this.drawBoard()
    }
    
    return (
      <div>
        <div className="Flexcolumn">
          <Playerlist room={this.props.room} height={this.state.height} />
          <canvas ref={this.canvasRef} style={{"width": this.state.width, "height": this.state.height}} {...this.props} id="canvas" width={this.state.width} height={this.state.height} />
        </div>
      </div>
    )
  }
}

export default Canvas;