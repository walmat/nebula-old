import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import moment from 'moment';
import momentLocalizer from 'react-widgets-moment';
import DateTimePicker from 'react-widgets/lib/DateTimePicker';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';
import { makeTheme } from '../../../../app/state/selectors';

import 'react-widgets/dist/css/react-widgets.css';
import { THEMES } from '../../../../constants';

moment.locale('en');
momentLocalizer();

const ScheduleToggle = ({ theme, schedule, onChange }) => (
  <div className="col col--start col--expand" style={{ flexGrow: 1 }}>
    <DateTimePicker
      containerClassName={theme === THEMES.LIGHT ? 'rw--light' : 'rw--dark'}
      dropUp
      placeholder="No schedule"
      format="MM/DD   h:mm:ss A"
      step={60}
      min={new Date()}
      value={schedule ? new Date(schedule) : null}
      onChange={onChange}
    />
  </div>
);

ScheduleToggle.propTypes = {
  theme: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  schedule: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
};

ScheduleToggle.defaultProps = {
  schedule: null,
};

export const mapStateToProps = state => ({
  theme: makeTheme(state),
  schedule: makeCurrentTask(state).schedule,
});

export const mapDispatchToProps = dispatch => ({
  onChange: date => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_DATE_TIME, date));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(ScheduleToggle);
