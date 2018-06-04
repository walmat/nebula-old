import React, { Component } from 'react';
import { TASK_FIELDS, taskActions } from '../state/Actions';
import PropTypes from 'prop-types';

import DDD from '../_assets/dropdown-down.svg';
import DDU from '../_assets/dropdown-up.svg';
import './Tasks.css';
import {connect} from "react-redux";
import getAllSizes from "./getSizes";
import getAllProfiles from './getProfiles';

class CreateTask extends Component {

    constructor(props) {
        super(props);
    }

    createOnChangeHandler(field) {
        return (event) => {
            this.props.onChange({field: field, value: event.target.value});
        }
    }

    buildSizeOptions = () => {
        let sizes = getAllSizes();
        return sizes.map((size) => {
            return <option key={size.name} value={size.name}>{size.name}</option>
        })
    }

    buildProfileOptions = () => {
        let billings = getAllProfiles();
        return billings.map((profile) => {
            return <option key={profile.name} value={profile.name}>{profile.name}</option>
        })
    }

    render() {
        return (
            <div>
                <p className="body-text" id="create-label">Create</p>
                <div id="create-box" />
                <p id="sku-label">Input SKU</p>
                <input id="sku" type="text" placeholder="SKU 000000" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SKU)} value={this.props.value.sku} required />
                <p id="profiles-label">Billing Profiles</p>
                <select id="profiles" type="text" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_BILLING)} value={this.props.value.billingProfile} required>
                    <option value="" selected disabled hidden>{'Choose Profiles'}</option>
                    {this.buildProfileOptions()}
                </select>
                <div id="dropdown-profiles-box" />
                <img src={DDD} id="dropdown-profiles-arrow" draggable="false" />
                <p id="size-label">Sizes</p>
                <select id="size" type="text" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_SIZES)} required>
                    <option value="" selected disabled hidden>{'Choose Size'}</option>
                    {this.buildSizeOptions()}
                </select>
                <img src={DDD} id="dropdown-size-arrow" draggable="false" />
                <p id="pairs-label"># Pairs</p>
                <input id="pairs" type="text" placeholder="00" onChange={this.createOnChangeHandler(TASK_FIELDS.EDIT_PAIRS)} required />
                <button id="submit-tasks">Submit</button>
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
            dispatch(taskActions.edit(null, changes.field, changes.value));
        },
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(CreateTask);