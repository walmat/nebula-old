import React from 'react';
import PropTypes from 'prop-types';

import { ReactComponent as CloseIcon } from '../../../../styles/images/tasks/close.svg';
import { renderSvgIcon } from '../../../../utils';

const CloseModal = ({ toggleCreate }) => (
  <div
    role="button"
    id="create-modal"
    tabIndex={0}
    style={{ position: 'absolute', top: 0, right: 0 }}
    title="close"
    onKeyPress={() => {}}
    onClick={() => toggleCreate()}
    draggable="false"
  >
    {renderSvgIcon(CloseIcon)}
  </div>
);

CloseModal.propTypes = {
  toggleCreate: PropTypes.func.isRequired,
};

export default CloseModal;
