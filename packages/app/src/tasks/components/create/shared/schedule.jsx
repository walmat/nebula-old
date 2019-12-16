import React from 'react';
import DateTimePicker from 'react-datetime-picker';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

const ScheduleToggle = ({ schedule, onChange }) => (
  <div className="col col--start col--expand" style={{ flexGrow: 1 }}>
    <DateTimePicker
      onChange={onChange}
      value={schedule}
      calendarIcon={null}
      showLeadingZeros
      format="M/dd/y hh:mm:ss a"
      dayPlaceholder="dd"
      monthPlaceholder="mm"
      yearPlaceholder="yyyy"
      hourPlaceholder="00"
      minutePlaceholder="00"
      secondPlaceholder="00"
      disableCalendar
      disableClock
    />
  </div>
);

ScheduleToggle.propTypes = {
  onChange: PropTypes.func.isRequired,
  schedule: PropTypes.bool.isRequired,
};

export const mapStateToProps = state => ({
  schedule: makeCurrentTask(state).schedule,
});

export const mapDispatchToProps = dispatch => ({
  onChange: date => {
    dispatch(taskActions.edit(null, TASK_FIELDS.EDIT_DATE_TIME, date));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ScheduleToggle);
