import React, { Component } from 'react';
import { TASK_FIELDS, taskActions } from '../state/Actions';
import PropTypes from 'prop-types';

import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';
import './Tasks.css';
import {connect} from "react-redux";

class CreateTask extends Component {

    constructor(props) {
        super(props);
    }

    createOnChangeHandler(field) {
        return (event) => {
            this.props.onChange({field: field, value: event.target.value});
        }
    }

    render() {
        return (
            <div>
                <p className="body-text" id="create-label">Create</p>
                <div id="create-box" />
                <p id="sku-label">Input SKU</p>
                <input id="sku" type="text" placeholder="SKU 000000" onChange={this.createOnChangeHandler(taskActions.EDIT_SKU)} value={this.props.value.sku} required />
                <p id="profiles-label">Billing Profiles</p>
                <select id="profiles" type="text" onChange={this.createOnChangeHandler(taskActions.EDIT_BILLING)} value={this.props.value.billingProfile} required>

                </select>
                <div id="dropdown-profiles-box" />
                <img src={DDD} id="dropdown-profiles-arrow" draggable="false" />
                <p id="size-label">Sizes</p>
                <select id="size" type="text" onChange={this.createOnChangeHandler(taskActions.EDIT_SIZES)} required />
                <img src={DDD} id="dropdown-size-arrow" draggable="false" />
                <p id="pairs-label"># Pairs</p>
                <input id="pairs" type="text" placeholder="00" onChange={this.createOnChangeHandler(taskActions.EDIT_PAIRS)} required />
                <button id="submit-tasks" >Submit</button>
            </div>
        );
    }
}

CreateTask.propTypes = {
    errors: PropTypes.object,
    onChange: PropTypes.func,
    value: PropTypes.object
};

const mapStateToProps = (state) => {
    return {
        errors: state.currentTask.errors,
        value: state.currentTask,
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        onChange: (changes) => {
            dispatch(taskActions.edit(0, TASK_FIELDS.EDIT, changes.value, changes.field));
        },
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(CreateTask);