import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { onImport, onExport } from '../../../constants/bridgeFns';
import { globalActions } from '../../../store/actions';

const Button = ({ onClick, data, label }) => (
  <button
    type="button"
    disabled // TODO: temporary...
    className="col col--expand col--no-gutter-left settings--export"
    tabIndex={0}
    onKeyPress={() => {}}
    onClick={() => onClick(data)}
  >
    {label}
  </button>
);

Button.propTypes = {
  label: PropTypes.string.isRequired,
  data: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired,
  onClick: PropTypes.func.isRequired,
};

const StateFunctionsPrimitive = ({ state, importState }) => (
  <div className="row row--expand row--no-gutter-left" style={{ flexGrow: 0 }}>
    <div className="col col--start col--expand col--no-gutter-right">
      <Button onClick={onExport} data={state} label="Export Application State" />
    </div>
    <div className="col col--start col--expand col--no-gutter-right">
      <Button onClick={onImport} data={importState} label="Import Application State" />
    </div>
  </div>
);

StateFunctionsPrimitive.propTypes = {
  state: PropTypes.objectOf(PropTypes.any).isRequired,
  importState: PropTypes.func.isRequired,
};

export const mapStateToProps = state => ({ state });

export const mapDispatchToProps = dispatch => ({
  importState: state => {
    dispatch(globalActions.import(state));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(StateFunctionsPrimitive);
