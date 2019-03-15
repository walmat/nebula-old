import PropTypes from 'prop-types';

import profile from './profile';

export const initialProfileListState = [];

const profileList = PropTypes.arrayOf(profile);

export default profileList;
