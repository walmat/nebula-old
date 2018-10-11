/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import LogTask from '../../tasks/logTask';

describe('<LogTask />', () => {
  it('should render', () => {
    const wrapper = shallow(<LogTask />);
    expect(wrapper.find('div')).toHaveLength(1);
  });
});
