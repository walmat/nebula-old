import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import CreatableSelect from 'react-select/creatable';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeSites, makeTheme } from '../../../../app/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';

import { createStore } from '../../../../constants/tasks';

import {
  DropdownIndicator,
  IndicatorSeparator,
  Control,
  Menu,
  MenuList,
  Option,
  colourStyles,
} from '../../../../styles/components/select';
import { buildStyle } from '../../../../styles';

const handleCreateStore = (event, field, onChange) => {
  const newStore = createStore(event);

  if (!newStore) {
    return null;
  }
  return onChange(newStore);
};

const StoreSelect = ({ theme, store, sites, onSelect }) => {
  let newTaskStoreValue = null;
  if (store && store.name !== null) {
    newTaskStoreValue = {
      value: store.url,
      label: store.name,
    };
  }

  return (
    <div className="col col--expand col--no-gutter tasks--create__input-group--store">
      <p className="tasks--create__label">Store</p>
      <CreatableSelect
        isClearable={false}
        required
        className="tasks--create__input tasks--create__input--field"
        classNamePrefix="select"
        placeholder="Choose Store"
        components={{
          DropdownIndicator,
          IndicatorSeparator,
          Control,
          Option,
          Menu,
          MenuList,
        }}
        styles={colourStyles(theme, buildStyle(false, null))}
        isOptionDisabled={option => !option.supported && option.supported !== undefined}
        onChange={e =>
          onSelect({
            name: e.label,
            url: e.value,
            apiKey: e.apiKey,
          })
        }
        onCreateOption={e => handleCreateStore(e, onSelect)}
        options={sites}
        value={newTaskStoreValue}
      />
    </div>
  );
};

StoreSelect.propTypes = {
  theme: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  sites: PropTypes.arrayOf(PropTypes.any).isRequired,
  store: PropTypes.objectOf(PropTypes.any).isRequired,
};

const mapStateToProps = state => ({
  theme: makeTheme(state),
  sites: makeSites(state),
  store: makeCurrentTask(state).store,
});

const mapDispatchToProps = dispatch => ({
  onSelect: value => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_STORE, value));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(StoreSelect);
