import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { captchaActions, HARVESTER_FIELDS } from '../state/actions';

import './captcha.css';
import '../app.css';

class Harvester extends Component {
  static async harvest(token) {
    if (window.Bridge) {
      window.Bridge.harvest(token).then(() => {
        window.Bridge.refresh('captcha');
      });
    } else {
      console.error('Unable to harvest token');
    }
  }

  async componentDidMount() {
    try {
      console.log();
    } catch (err) {
      console.log(err);
    //   this.setState({error: true});
    }
  }

  render() {
    return (
      <div className="container">
        <form action="/submit" method="post" style={{ marginTop: '50%' }}>
          <div
            className="g-recaptcha"
            // data-sitekey={sitekey}
            data-callback={Harvester.harvest(this.val())}
          />
          <script type="text/javascript" src="https://www.google.com/recaptcha/api.js" />
        </form>
      </div>
    );
  }
}

Harvester.propTypes = {
//   captchas: PropTypes.objectOf(PropTypes.any).isRequired
};

const mapStateToProps = state => ({
  captchas: state.captchas,
});

const mapDispatchToProps = dispatch => ({
  addCaptcha: (event) => {
    dispatch(captchaActions.add(event, HARVESTER_FIELDS.ADD_CAPTCHA));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Harvester);
