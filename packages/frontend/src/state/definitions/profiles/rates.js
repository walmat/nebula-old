import PropTypes from 'prop-types';

export const rate = PropTypes.shape({
  name: PropTypes.string,
  rate: PropTypes.string,
  price: PropTypes.string,
});

export const rateEntry = PropTypes.shape({
  site: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
  }),
  rates: PropTypes.arrayOf(rate),
  selectedRate: rate,
});

export const initialShippingRatesState = [];

const rates = PropTypes.arrayOf(rateEntry);

export default rates;
