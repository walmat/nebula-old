import PropTypes from 'prop-types';

const taskProduct = PropTypes.shape({
  raw: PropTypes.string,
  variant: PropTypes.string,
  pos_keywords: PropTypes.arrayOf(PropTypes.string),
  neg_keywords: PropTypes.arrayOf(PropTypes.string),
  url: PropTypes.string,
});

export default taskProduct;
