import PropTypes from 'prop-types';

export const initialTaskSiteState = {
  special: null,
  apiKey: null,
  auth: null,
  name: null,
  url: null,
  supported: null,
  sizeOptionIndex: null,
};

const taskSite = PropTypes.shape({
  special: PropTypes.bool,
  apiKey: PropTypes.string,
  auth: PropTypes.bool,
  name: PropTypes.string,
  url: PropTypes.string,
  supported: PropTypes.string,
  sizeOptionIndex: PropTypes.number,
});

export default taskSite;
