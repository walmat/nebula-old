/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { ViewLogPrimitive, mapStateToProps } from '../../server/viewLog';
import { initialServerStates } from '../../utils/definitions/serverDefinitions';
import ServerRow from '../../server/serverRow';

describe('<ViewLog />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(<ViewLogPrimitive servers={renderProps.servers} />);
  };

  beforeEach(() => {
    defaultProps = {
      servers: [],
    };
  });

  it('should render with default props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.server-table')).toHaveLength(1);
    expect(wrapper.find(ServerRow)).toHaveLength(0);
  });

  it('should render correct number of rows', () => {
    const customProps = {
      servers: [{ id: 1 }, { id: 2 }, { id: 3 }],
    };
    const wrapper = renderShallowWithProps(customProps);
    expect(wrapper.find('.server-table')).toHaveLength(1);
    expect(wrapper.find(ServerRow)).toHaveLength(3);
    const data = wrapper.find(ServerRow).map(w => ({ server: w.prop('server') }));
    expect(data).toEqual([{ server: { id: 1 } }, { server: { id: 2 } }, { server: { id: 3 } }]);
  });

  test('map state to props should return correct structure', () => {
    const state = {
      servers: ['test'],
      extra: 'field',
    };
    const expected = { servers: ['test'] };
    expect(mapStateToProps(state)).toEqual(expected);
  });
});
