/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React from 'react';
import Modal from 'react-modal';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { makeTheme } from '../../../app/state/selectors';
import { THEMES } from '../../../constants';

import ModalBody from './modal';

const modalStyles = {
  [THEMES.LIGHT]: {
    overlay: {
      backgroundColor: 'rgba(244, 244, 244, 0.83)',
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '5px',
      border: 'none',
      boxShadow: '0 0 10px',
      backgroundColor: '#f4f4f4',
      opacity: 1,
      zIndex: 99999,
    },
  },
  [THEMES.DARK]: {
    overlay: {
      backgroundColor: 'rgba(44, 47, 51, 0.83)',
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '5px',
      border: 'none',
      boxShadow: '0 0 10px',
      backgroundColor: '#23272a',
      opacity: 1,
      zIndex: 99999,
    },
  },
};

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

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreateTaskPrimitive);
