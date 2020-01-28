/* eslint-disable react/jsx-wrap-multilines */
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Switch from 'react-switch';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeTheme } from '../../../../app/state/selectors';
import { makeCurrentTask } from '../../../state/selectors';
import { THEMES } from '../../../../constants';

const ForceCaptcha = ({ theme, captcha, onToggle }) => (
  <div className="col col--start col--no-gutter col--expand">
    <Switch
      checked={captcha}
      checkedIcon={
        <svg width="48" height="48" viewBox="-5 -5 29 29" version="1.1">
          <g id="surface1">
            <path
              style={{
                stroke: 'none',
                fillRule: 'nonzero',
                fill: 'rgb(10.980392%,22.745098%,66.27451%)',
                fillOpacity: '1',
              }}
              d="M 8 3.996094 L 7.996094 3.824219 L 7.996094 0.585938 L 7.101562 1.480469 C 6.367188 0.585938 5.253906 0.0117188 4.007812 0.0117188 C 2.707031 0.0117188 1.554688 0.632812 0.824219 1.589844 L 2.289062 3.074219 C 2.433594 2.808594 2.636719 2.582031 2.886719 2.40625 C 3.140625 2.207031 3.503906 2.042969 4.007812 2.042969 C 4.066406 2.042969 4.113281 2.050781 4.148438 2.066406 C 4.769531 2.113281 5.308594 2.457031 5.625 2.953125 L 4.589844 3.992188 L 8 3.992188"
            />
            <path
              style={{
                stroke: 'none',
                fillRule: 'nonzero',
                fill: 'rgb(25.882353%,52.156863%,95.686275%)',
                fillOpacity: '1',
              }}
              d="M 3.984375 0.0117188 L 3.8125 0.015625 L 0.574219 0.015625 L 1.46875 0.910156 C 0.574219 1.644531 0 2.757812 0 4.003906 C 0 5.304688 0.621094 6.457031 1.578125 7.1875 L 3.0625 5.722656 C 2.796875 5.578125 2.570312 5.375 2.394531 5.125 C 2.195312 4.871094 2.03125 4.507812 2.03125 4.003906 C 2.03125 3.945312 2.039062 3.898438 2.054688 3.863281 C 2.101562 3.242188 2.445312 2.703125 2.945312 2.386719 L 3.980469 3.421875 L 3.984375 0.0117188 "
            />
            <path
              style={{
                stroke: 'none',
                fillRule: 'nonzero',
                fill: 'rgb(67.058824%,67.058824%,67.058824%)',
                fillOpacity: '1',
              }}
              d="M 0 4.003906 L 0.00390625 4.175781 L 0.00390625 7.414062 L 0.898438 6.519531 C 1.632812 7.414062 2.746094 7.988281 3.996094 7.988281 C 5.292969 7.988281 6.445312 7.367188 7.175781 6.410156 L 5.710938 4.925781 C 5.566406 5.191406 5.363281 5.417969 5.117188 5.59375 C 4.859375 5.792969 4.496094 5.957031 3.996094 5.957031 C 3.933594 5.957031 3.886719 5.949219 3.851562 5.933594 C 3.230469 5.886719 2.691406 5.542969 2.375 5.046875 L 3.414062 4.007812 C 2.097656 4.011719 0.613281 4.015625 0 4.007812"
            />
          </g>
        </svg>
      }
      onChange={() => onToggle()}
      onColor={theme === THEMES.LIGHT ? '#dcdcdc' : '#2c2f33'}
      onHandleColor="#6d6e70"
      handleDiameter={18}
      uncheckedIcon={false}
      boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
      activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
      height={31}
      className="react-switch"
    />
  </div>
);

ForceCaptcha.propTypes = {
  theme: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  captcha: PropTypes.bool.isRequired,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  captcha: makeCurrentTask(state).captcha,
});

export const mapDispatchToProps = dispatch => ({
  onToggle: () => {
    dispatch(taskActions.edit(null, TASK_FIELDS.TOGGLE_CAPTCHA));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ForceCaptcha);
