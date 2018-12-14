import PropTypes from 'prop-types';

export const initialTaskProductErrorState = {
  raw: null,
  variant: null,
  pos_keywords: null,
  neg_keywords: null,
  url: null,
};

const taskProductErrors = PropTypes.shape({
  raw: PropTypes.bool,
  variant: PropTypes.bool,
  pos_keywords: PropTypes.bool,
  neg_keywords: PropTypes.bool,
  url: PropTypes.bool,
});

export default taskProductErrors;
