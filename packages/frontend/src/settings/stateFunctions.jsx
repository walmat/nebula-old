import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { globalActions } from '../state/actions';

export class StateFunctionsPrimitive extends PureComponent {

    constructor(props) {
        super(props);

        this.onExport = this.onExport.bind(this);
        this.onImport = this.onImport.bind(this);
    }

    onExport = async () => {
        // const { exportState } = this.props;
        
        const exportedState = { ...this.props };
        delete exportedState.exportState;
        delete exportedState.importState;
        delete exportedState.onKeyPress;
        delete exportedState.theme;
        
        if (window.Bridge) {
          const { error, success } = await window.Bridge.showSave(exportedState);
          console.log(error, success);

          if (error) {

          }
        }
    }    
    
    onImport = async () => {
        const { importState } = this.props;
        if (window.Bridge) {
          const { success, data } = await window.Bridge.showOpen();

          if (success) {
            importState(data);
          }
        }
    }   

    render() {
        const { onKeyPress } = this.props;
        return (
            <div className="row row--gutter">
                <div className="col col--no-gutter-left">
                    <button 
                        type="button"
                        className="settings--export"
                        tabIndex={0}
                        onKeyPress={onKeyPress}
                        onClick={this.onExport}
                    >
                        Export Application State
                    </button>
                </div>
                <div className="col col--no-gutter-left">
                    <button 
                        type="button"
                        className="settings--import"
                        tabIndex={0}
                        onKeyPress={onKeyPress}
                        onClick={this.onImport}
                    >
                        Import Application State
                    </button>
                </div>
            </div>
        );
    }
}

StateFunctionsPrimitive.propTypes = {
  exportState: PropTypes.func.isRequired,
  importState: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

StateFunctionsPrimitive.defaultProps = {
  onKeyPress: () => {},
};

export const mapDispatchToProps = dispatch => ({
  exportState: (state, file) => {
    dispatch(globalActions.export(state, file));
  },
  importState: state => {
    dispatch(globalActions.import(state));
  },
});

export default connect(
  state => state,
  mapDispatchToProps,
)(StateFunctionsPrimitive);