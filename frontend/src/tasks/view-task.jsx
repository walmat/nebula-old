import React, {Component} from "react";

class ViewTask extends Component {

    constructor(props) {
        super(props);
    }

    createTable = () => {
        let table_row = [];

        for (let i = 0; i < this.props.data.length; i++) {
            table_row.push(
                <tr>
                    <td>{this.props.data.edit}</td>
                    <td>{this.props.data.task_num}</td>
                    <td>{this.props.data.sku}</td>
                    <td>{this.props.data.profiles}</td>
                    <td>{this.props.data.sizes}</td>
                    <td>{this.props.data.num_pairs}</td>
                    <td>{this.props.data.actions.run}</td>
                    <td>{this.props.data.actions.stop}</td>
                    <td>{this.props.data.actions.destroy}</td>
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

export default ViewTask;