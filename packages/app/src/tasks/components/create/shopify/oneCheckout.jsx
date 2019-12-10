import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { TASK_FIELDS, taskActions } from '../../../../store/actions';
import { makeCurrentTask } from '../../../state/selectors';

import { renderSvgIcon } from '../../../../utils';
import { ReactComponent as NotOneCheckoutIcon } from '../../../../styles/images/tasks/one-checkout-off.svg';
import { ReactComponent as OneCheckoutIcon } from '../../../../styles/images/tasks/one-checkout.svg';

const OneCheckout = ({ oneCheckout, onToggle }) => (
  <div
    className="col col--gutter"
    style={{ marginBottom: 18, flexGrow: 1 }}
    onClick={() => onToggle()}
    role="button"
    tabIndex={0}
    onKeyPress={() => {}}
  >
    {oneCheckout
      ? renderSvgIcon(OneCheckoutIcon, {
          alt: 'One Checkout',
          title: 'One Checkout',
        })
      : renderSvgIcon(NotOneCheckoutIcon, {
          alt: 'One Checkout',
          title: 'One Checkout',
        })}
  </div>
);

OneCheckout.propTypes = {
  onToggle: PropTypes.func.isRequired,
  oneCheckout: PropTypes.bool.isRequired,
};

export const mapStateToProps = state => ({
  oneCheckout: makeCurrentTask(state).oneCheckout,
});

export const mapDispatchToProps = dispatch => ({
  onToggle: () => {
    dispatch(taskActions.edit(null, TASK_FIELDS.TOGGLE_ONE_CHECKOUT));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(OneCheckout);
