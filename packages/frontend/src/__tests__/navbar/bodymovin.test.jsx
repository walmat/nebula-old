/* global describe it expect jest test beforeEach afterEach */
import React from 'react';
import { mount } from 'enzyme';

import Bodymovin from '../../navbar/bodymovin';
import animation from '../../navbar/nebula.json';

describe('<Bodymovin />', () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = window.document;
  });

  afterEach(() => {
    window.document = originalDocument;
  });

  it('should render when dom is available', () => {
    const options = {
      loop: true,
      autoplay: true,
      prerender: true,
      animationData: animation,
      rendererSettings: {
        progressiveLoad: false,
        preserveAspectRatio: 'xMidYMid slice',
      },
    };
    const wrapper = mount(<Bodymovin options={options} />);
    expect(wrapper.find(Bodymovin)).toBeDefined();
    expect(wrapper.find('react-bodymovin-container')).toBeDefined();
    wrapper.unmount();
  });

  it('should never update', () => {
    const options = {
      loop: true,
      autoplay: true,
      prerender: true,
      animationData: animation,
      rendererSettings: {
        progressiveLoad: false,
        preserveAspectRatio: 'xMidYMid slice',
      },
    };
    const wrapper = mount(<Bodymovin options={options} />);
    const shouldUpdate = wrapper.instance().shouldComponentUpdate({}, {});
    expect(shouldUpdate).toBeFalsy();
  });
});
