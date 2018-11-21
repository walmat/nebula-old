import PropTypes from 'prop-types';

export const initialTaskSiteState = {
  name: null,
  url: null,
  supported: null,
  auth: null,
};

const taskSite = PropTypes.shape({
  name: PropTypes.string,
  url: PropTypes.string,
  supported: PropTypes.bool,
  auth: PropTypes.bool,
});

export default taskSite;
