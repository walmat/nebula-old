import React, { Component } from 'react';
import { connect } from 'react-redux';

import './tasks.css';

class LogTask extends Component {
  render() {
    return (
      <div>
      </div>
    );
  }
}

LogTask.propTypes = {};


const mapStateToProps = (state, ownProps) => ({});

const mapDispatchToProps = dispatch => ({});

export default connect(mapStateToProps, mapDispatchToProps)(LogTask);
