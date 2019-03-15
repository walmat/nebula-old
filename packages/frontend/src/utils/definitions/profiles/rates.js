import PropTypes from 'prop-types';

const rate = PropTypes.shape({
  name: PropTypes.string,
  rate: PropTypes.string,
});

const rateList = PropTypes.arrayOf(
  PropTypes.shape({
    site: PropTypes.shape({
      name: PropTypes.string,
      url: PropTypes.string,
    }),
    rates: PropTypes.arrayOf(rate),
    selectedRate: rate,
  }),
);

// export const initialShippingRatesState = [];

// temporarilyy put some data to adjust UI styling...
export const initialShippingRatesState = [
  {
    site: {
      name: 'Kith',
      url: 'https://kith.com',
    },
    rates: [
      {
        name: '5-7 Business Days',
        rate: 'shopify-UPS%20GROUND%20(5-7%20business%20days)-10.00',
      },
    ],
    selectedRate: null,
  },
  {
    site: {
      name: '12 AM RUN',
      url: 'https://12amrun.com',
    },
    rates: [
      {
        name: 'Small Goods Shipping',
        rate: 'shopify-Small%20Goods%20Shipping-7.00',
      },
    ],
    selectedRate: null,
  },
];

const shippingRates = PropTypes.arrayOf(rateList);

export default shippingRates;
