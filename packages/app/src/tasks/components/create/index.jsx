/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import Modal from 'react-modal';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeTheme } from '../../../app/state/selectors';
import { modalStyles } from '../../../constants';

import ModalBody from './modal';

const CreateTaskPrimitive = ({ show, toggleCreate, theme }) => (
  <Modal isOpen={show} style={modalStyles[theme]} onRequestClose={toggleCreate} ariaHideApp={false}>
    <ModalBody toggleCreate={toggleCreate} />
  </Modal>
);

CreateTaskPrimitive.propTypes = {
  show: PropTypes.bool.isRequired,
  toggleCreate: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
};

export const mapStateToProps = (state, ownProps) => ({
  show: ownProps.show,
  toggleCreate: ownProps.toggleCreate,
  theme: makeTheme(state),
});

export const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(CreateTaskPrimitive);
