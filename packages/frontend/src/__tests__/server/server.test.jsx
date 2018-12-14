/* global describe it expect beforeEach beforeAll jest test */
import React from 'react';
import { shallow } from 'enzyme';

import Server from '../../server/server';
import AWSCredentials from '../../server/awsCredentials';
import CreateProxies from '../../server/createProxies';
import CreateServer from '../../server/createServer';
import ViewLog from '../../server/viewLog';

describe('<Server />', () => {
  test('should render with proper components', () => {
    const wrapper = shallow(<Server />);
    expect(wrapper.find(AWSCredentials)).toHaveLength(1);
    expect(wrapper.find(CreateProxies)).toHaveLength(1);
    expect(wrapper.find(CreateServer)).toHaveLength(1);
    expect(wrapper.find(ViewLog)).toHaveLength(1);
  });
});
