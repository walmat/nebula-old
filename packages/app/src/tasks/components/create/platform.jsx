import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import ShopifyFields from './shopify';
import SupremeFields from './supreme';

import { makeCurrentTask } from '../../state/selectors';

import { Platforms } from '../../../constants';

const PlatformFields = ({ platform }) => {
  switch (platform) {
    case Platforms.Shopify:
      return <ShopifyFields />;
    case Platforms.Supreme:
      return <SupremeFields />;
    default:
      return null;
  }
};

PlatformFields.propTypes = {
  platform: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
  platform: makeCurrentTask(state).platform,
});

const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PlatformFields);
