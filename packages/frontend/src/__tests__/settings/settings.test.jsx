/* global describe it expect beforeEach afterEach jest test */
import React from 'react';
import { shallow } from 'enzyme';
import { SettingsPrimitive } from '../../settings/settings';

describe('<Settings />', () => {
  const renderShallowWithProps = () => shallow(<SettingsPrimitive />);

  it('renders as pure component', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.container.settings')).toHaveLength(1);
  });
});
