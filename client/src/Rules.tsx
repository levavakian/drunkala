import React from 'react';
// import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import { api } from './api'
import { Room, Rule } from './Elements'

interface RulesProps {
    room?: Room
    name: string
  }
  
interface RulesState {
}

class Rules extends React.Component<RulesProps,RulesState> {
  
    constructor(props: RulesProps) {
      super(props)
      this.state = {
      }
    }

    displayRule = (rule: Rule, id: number) => {
        return (
            <div key={id} className="card buttonlist">
                <div>
                    {rule.text}
                </div>
                <span>
                    Trigger on opponent:
                </span>
                <input
                  type="checkbox"
                  id="trigger_on_opponent"
                  name="trigger_on_opponent"
                  checked={rule.trigger_on_opponent}
                  disabled={true}
                  style={{height: "20px", width: "20px", marginBottom: "15px"}} />
                <span>
                    Trigger on victim:
                </span>
                <input
                  type="checkbox"
                  id="trigger_on_victim"
                  name="trigger_on_victim"
                  checked={rule.trigger_on_victim}
                  disabled={true}
                  style={{height: "20px", width: "20px", marginBottom: "15px"}} />
                <span>
                    Scale with value:
                </span>
                <input
                  type="checkbox"
                  id="scale_with_num"
                  name="scale_with_num"
                  checked={rule.scale_with_num}
                  disabled={true}
                  style={{height: "20px", width: "20px", marginBottom: "15px"}} />
                {/* <br /> */}
                <span>
                    Embed value:
                </span>
                <input
                  type="checkbox"
                  id="embed_value"
                  name="embed_value"
                  checked={rule.embed_value}
                  disabled={true}
                  style={{height: "20px", width: "20px", marginBottom: "15px"}} />
                <span>
                    Cycle value on die:
                </span>
                <input
                  type="checkbox"
                  id="cycle_value_on_die"
                  name="cycle_value_on_die"
                  checked={rule.cycle_value_on_die}
                  disabled={true}
                  style={{height: "20px", width: "20px", marginBottom: "15px"}} />
                <br />
                <span>Min: {rule.min} </span> <span>Max: {rule.max}</span>
            </div>
        )
    }

    render() {
        return (
            <div className="card buttonlist">
                {this.props.room?.rules.map((rule, index, arr) => {
                    return this.displayRule(rule, index)
                })}
            </div>
        )
    }
}

export default Rules;