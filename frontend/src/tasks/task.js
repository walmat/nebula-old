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
                    <td>{this.state.data.run}</td>
                    <td>{this.state.data.stop}</td>
                    <td>{this.state.data.destroy}</td>
                </tr>
            )
        }
        return table_row;
    };

    render() {
        return (
            <div id="view-scroll-box">{this.createTable}</div>
        );
    }
}

export default Task;