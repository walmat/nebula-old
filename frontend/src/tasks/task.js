import React, {Component} from "react";

class Task extends Component {

    constructor(props) {
        super(props);
        this.state = {
            data: []
        };
    }

    createTable = () => {
        let table_row = [];

        for (let i = 0; i < this.state.data.length; i++) {
            table_row.push(
                <tr>
                    <td>{this.state.data.edit}</td>
                    <td>{this.state.data.task_num}</td>
                    <td>{this.state.data.sku}</td>
                    <td>{this.state.data.profiles}</td>
                    <td>{this.state.data.sizes}</td>
                    <td>{this.state.data.num_pairs}</td>
                    <td>{this.state.data.actions.run}</td>
                    <td>{this.state.data.actions.stop}</td>
                    <td>{this.state.data.actions.destroy}</td>
                </tr>
            )
        }
        return table_row;
    };

    render() {
        return (
            <div>{this.createTable}</div>
        );
    }
}

export default Task;