import PropTypes from 'prop-types';

export const serverRow = PropTypes.shape({
  type: PropTypes.shape({
    id: PropTypes.number,
    value: PropTypes.string,
    label: PropTypes.string,
    sizes: PropTypes.arrayOf(PropTypes.number),
  }),
  size: PropTypes.shape({
    id: PropTypes.number,
    value: PropTypes.string,
    label: PropTypes.string,
    sizes: PropTypes.arrayOf(PropTypes.number),
  }),
  location: PropTypes.shape({
    id: PropTypes.number,
    value: PropTypes.string,
    label: PropTypes.string,
  }),
  charges: PropTypes.string,
  status: PropTypes.string,
  action: PropTypes.string,
});

export const serverList = PropTypes.arrayOf(serverRow);

export default serverList;
