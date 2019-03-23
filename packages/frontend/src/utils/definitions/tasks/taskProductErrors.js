import PropTypes from 'prop-types';

const taskProductErrors = PropTypes.shape({
  raw: PropTypes.bool,
  variant: PropTypes.bool,
  pos_keywords: PropTypes.bool,
  neg_keywords: PropTypes.bool,
  url: PropTypes.bool,
});

export default taskProductErrors;
