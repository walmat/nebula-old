import PropTypes from 'prop-types';

export const initialTaskProductState = {
  raw: '',
  variant: null,
  pos_keywords: null,
  neg_keywords: null,
  url: null,
};

const taskProduct = PropTypes.shape({
  raw: PropTypes.string,
  variant: PropTypes.string,
  pos_keywords: PropTypes.arrayOf(PropTypes.string),
  neg_keywords: PropTypes.arrayOf(PropTypes.string),
  url: PropTypes.string,
});

export default taskProduct;
