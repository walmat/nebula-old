/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import { TaskRowPrimitive, mapStateToProps, mapDispatchToProps } from '../../tasks/taskRow';
import { TASK_FIELDS, taskActions } from '../../state/actions';
import { initialTaskStates } from '../../utils/definitions/taskDefinitions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';
import getAllSites from '../../constants/getAllSites';
import getAllSizes from '../../constants/getAllSizes';

import getByTestId from '../../__testUtils__/getByTestId';

describe('<TaskRow />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <TaskRowPrimitive
        isEditing={renderProps.isEditing}
        task={renderProps.task}
        edits={renderProps.edits}
        proxies={renderProps.proxies}
        profiles={renderProps.profiles}
        onSelectTask={renderProps.onSelectTask}
        onStartTask={renderProps.onStartTask}
        onStopTask={renderProps.onStopTask}
        onDestroyTask={renderProps.onDestroyTask}
        onEditTask={renderProps.onEditTask}
        onCommitEdits={renderProps.onCommitEdits}
        onCancelEdits={renderProps.onCancelEdits}
        onKeyPress={renderProps.onKeyPress}
        errors={renderProps.errors}
      />,
    );
  };

  beforeEach(() => {
    defaultProps = {
      isEditing: false,
      task: { ...initialTaskStates.task },
      edits: { ...initialTaskStates.edit },
      proxies: [],
      profiles: [],
      errors: { ...initialTaskStates.edit.errors },
      onSelectTask: () => {},
      onStartTask: () => {},
      onStopTask: () => {},
      onDestroyTask: () => {},
      onEditTask: () => {},
      onCommitEdits: () => {},
      onCancelEdits: () => {},
    };
  });

  const testIfTableRowComponentsAreRendered = wrapper => {
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    expect(wrapper.find('.tasks-row').length).toBeGreaterThanOrEqual(1);
    expect(wrapper.find('.tasks-row__id')).toHaveLength(1);
    expect(wrapper.find('.tasks-row__product')).toHaveLength(1);
    expect(wrapper.find('.tasks-row__sites')).toHaveLength(1);
    expect(wrapper.find('.tasks-row__profile')).toHaveLength(1);
    expect(wrapper.find('.tasks-row__sizes')).toHaveLength(1);
    expect(wrapper.find('.tasks-row__account')).toHaveLength(1);
    expect(wrapper.find('.tasks-row__actions')).toHaveLength(1);
    expect(wrapper.find('.tasks-row__actions__button')).toHaveLength(3);
    expect(wrapper.find('.tasks-edit')).toHaveLength(1);
    expect(getByTestId(wrapper, 'TaskRow.button.edit')).toHaveLength(1);
    expect(getByTestId(wrapper, 'TaskRow.button.action.start')).toHaveLength(1);
    expect(getByTestId(wrapper, 'TaskRow.button.action.stop')).toHaveLength(1);
    expect(getByTestId(wrapper, 'TaskRow.button.action.destroy')).toHaveLength(1);
  };

  const testIfEditMenuComponentsAreRendered = (wrapper, isShowing) => {
    const expected = isShowing ? 1 : 0;
    expect(wrapper.find('.tasks-row-container')).toHaveLength(1);
    expect(wrapper.find('.tasks-row--edit')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.productInput')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.siteSelect')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.profileSelect')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.sizesSelect')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.usernameInput')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.passwordInput')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.button.save')).toHaveLength(expected);
    expect(getByTestId(wrapper, 'TaskRow.edit.button.cancel')).toHaveLength(expected);
  };

  const testButtonValues = (wrapper, tag, title, className) => {
    const button = getByTestId(wrapper, `TaskRow.button.${tag}`);
    expect(button.prop('role')).toBe('button');
    expect(button.prop('title')).toBe(title);
    expect(button.prop('onClick')).toBeDefined();
    expect(button.prop('onKeyPress')).toBeDefined();
    expect(button.childAt(0).prop('className')).toBe(className);
    button.simulate('keyPress');
  };

  const testActionButtonValues = (wrapper, tag, title, className) =>
    testButtonValues(wrapper, `action.${tag}`, title, className);

  const testTableRowValues = (wrapper, { id, product, siteName, profileName, sizes, account }) => {
    expect(wrapper.find('.tasks-row__id').text()).toBe(id || '--');
    expect(wrapper.find('.tasks-row__product').text()).toBe(product || 'None');
    expect(wrapper.find('.tasks-row__sites').text()).toBe(siteName || 'None');
    expect(wrapper.find('.tasks-row__profile').text()).toBe(profileName || 'None');
    expect(wrapper.find('.tasks-row__sizes').text()).toBe(sizes || 'None');
    expect(wrapper.find('.tasks-row__account').text()).toBe(account || 'None');
  };

  const testEditMenuValues = (wrapper, { product, site, profile, sizes, username, password }) => {
    expect(getByTestId(wrapper, 'TaskRow.edit.productInput').prop('value')).toBe(product || null);
    expect(getByTestId(wrapper, 'TaskRow.edit.siteSelect').prop('value')).toEqual(site || null);
    expect(getByTestId(wrapper, 'TaskRow.edit.profileSelect').prop('value')).toEqual(
      profile || null,
    );
    expect(getByTestId(wrapper, 'TaskRow.edit.sizesSelect').prop('value')).toEqual(sizes || []);
    expect(getByTestId(wrapper, 'TaskRow.edit.usernameInput').prop('value')).toBe(username || '');
    expect(getByTestId(wrapper, 'TaskRow.edit.passwordInput').prop('value')).toBe(password || '');
  };

  it('should render with required default props', () => {
    const wrapper = renderShallowWithProps();
    // Table Row Components Are Present
    testIfTableRowComponentsAreRendered(wrapper);
    // no edit menu items
    testIfEditMenuComponentsAreRendered(wrapper, false);
    // test default values
    testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
    testActionButtonValues(wrapper, 'stop', 'Stop Task', '');
    testActionButtonValues(wrapper, 'start', 'Start Task', '');
    testTableRowValues(wrapper, {});
  });

  it('should render with required default props when editing', () => {
    const customProps = {
      isEditing: true,
    };
    const wrapper = renderShallowWithProps(customProps);
    // Table Row Components Are Present
    testIfTableRowComponentsAreRendered(wrapper);
    // Edit menu items are present
    testIfEditMenuComponentsAreRendered(wrapper, true);
    // test default values
    testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
    testActionButtonValues(wrapper, 'stop', 'Stop Task', '');
    testActionButtonValues(wrapper, 'start', 'Start Task', '');
    testTableRowValues(wrapper, {});
    testEditMenuValues(wrapper, {});
  });

  describe('should render when not editing with given values', () => {
    const initialTests = wrapper => {
      // Table Row Components Are Present
      testIfTableRowComponentsAreRendered(wrapper);
      // no edit menu items
      testIfEditMenuComponentsAreRendered(wrapper, false);
      // Default action values
      testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
      testActionButtonValues(wrapper, 'stop', 'Stop Task', '');
      testActionButtonValues(wrapper, 'start', 'Start Task', '');
    };

    test('id < 10', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          id: 1,
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { id: '01' });
    });

    test('id >= 10', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          id: 10,
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { id: '10' });
    });

    test('product is given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          product: {
            ...initialTaskStates.product,
            raw: 'test product',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { product: 'test product' });
    });

    test('site name is given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          site: {
            ...initialTaskStates.site,
            name: 'test site name',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { siteName: 'test site name' });
    });

    test('profile name is given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          profile: {
            ...initialProfileStates.profile,
            profileName: 'test profile name',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { profileName: 'test profile name' });
    });

    test('one size is given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          sizes: ['4.5'],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { sizes: '4.5' });
    });

    test('multiple sizes are given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          sizes: ['4', '4.5', '5', '5.5'],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { sizes: '4, 4.5, 5, 5.5' });
    });

    test('username and password are not given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          username: '',
          password: '',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { account: 'None' });
    });

    test('username is given, but password is not given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          username: 'user',
          password: '',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { account: 'None' });
    });

    test('username is not given, but password is given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          username: '',
          password: 'pass',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { account: 'None' });
    });

    test('both username and password are given', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          username: 'user',
          password: 'pass',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      initialTests(wrapper);
      testTableRowValues(wrapper, { account: 'user' });
    });
  });

  describe('should render when editing with given values', () => {
    const initialTests = wrapper => {
      // Table Row Components Are Present
      testIfTableRowComponentsAreRendered(wrapper);
      // no edit menu items
      testIfEditMenuComponentsAreRendered(wrapper, true);
      // Default action values
      testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
      testActionButtonValues(wrapper, 'stop', 'Stop Task', '');
      testActionButtonValues(wrapper, 'start', 'Start Task', '');
    };

    describe('for table row', () => {
      test('id < 10', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            id: 1,
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { id: '01' });
        testEditMenuValues(wrapper, {});
      });

      test('id >= 10', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            id: 10,
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { id: '10' });
        testEditMenuValues(wrapper, {});
      });

      test('product is given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            product: {
              ...initialTaskStates.product,
              raw: 'test product',
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { product: 'test product' });
        testEditMenuValues(wrapper, {});
      });

      test('site name is given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            site: {
              ...initialTaskStates.site,
              name: 'test site name',
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { siteName: 'test site name' });
        testEditMenuValues(wrapper, {});
      });

      test('profile name is given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            profile: {
              ...initialProfileStates.profile,
              profileName: 'test profile name',
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { profileName: 'test profile name' });
        testEditMenuValues(wrapper, {});
      });

      test('one size is given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            sizes: ['4.5'],
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { sizes: '4.5' });
        testEditMenuValues(wrapper, {});
      });

      test('multiple sizes are given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            sizes: ['4', '4.5', '5', '5.5'],
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { sizes: '4, 4.5, 5, 5.5' });
        testEditMenuValues(wrapper, {});
      });

      test('username and password are not given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            username: '',
            password: '',
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { account: 'None' });
        testEditMenuValues(wrapper, {});
      });

      test('username is given, but password is not given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            username: 'user',
            password: '',
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { account: 'None' });
        testEditMenuValues(wrapper, {});
      });

      test('username is not given, but password is given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            username: '',
            password: 'pass',
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { account: 'None' });
        testEditMenuValues(wrapper, {});
      });

      test('both username and password are given', () => {
        const customProps = {
          isEditing: true,
          task: {
            ...initialTaskStates.task,
            username: 'user',
            password: 'pass',
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, { account: 'user' });
        testEditMenuValues(wrapper, {});
      });
    });

    describe('for edit row', () => {
      test('product is given with null raw', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            product: {
              ...initialTaskStates.product,
              raw: null,
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, { product: null });
      });

      test('product is given with valid raw', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            product: {
              ...initialTaskStates.product,
              raw: 'test product',
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, { product: 'test product' });
      });

      test('profile is given with null id', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            profile: {
              ...initialProfileStates.profile,
              id: null,
              profileName: 'test name',
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, { profile: null });
      });

      test('profile is given with valid id', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            profile: {
              ...initialProfileStates.profile,
              id: 1,
              profileName: 'test name',
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, {
          profile: { value: 1, label: 'test name' },
        });
      });

      test('one size is given', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            sizes: ['4.5'],
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, {
          sizes: [{ value: '4.5', label: '4.5' }],
        });
      });

      test('multiple sizes are given', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            sizes: ['4', '4.5', '5', '5.5'],
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, {
          sizes: [
            { value: '4', label: '4' },
            { value: '4.5', label: '4.5' },
            { value: '5', label: '5' },
            { value: '5.5', label: '5.5' },
          ],
        });
      });

      test('site is given', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            site: {
              ...initialTaskStates.site,
              url: 'test url',
              name: 'test name',
            },
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, {
          site: { value: 'test url', label: 'test name' },
        });
      });

      test('username is given', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            username: 'test username',
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, { username: 'test username' });
      });

      test('password is given', () => {
        const customProps = {
          isEditing: true,
          edits: {
            ...initialTaskStates.edit,
            password: 'test password',
          },
        };
        const wrapper = renderShallowWithProps(customProps);
        initialTests(wrapper);
        testTableRowValues(wrapper, {});
        testEditMenuValues(wrapper, { password: 'test password' });
      });
    });
  });

  describe('table row edit button', () => {
    it('should render with initial (idle) status', () => {
      const wrapper = renderShallowWithProps();
      testButtonValues(wrapper, 'edit', 'Edit Task', '');
    });

    it('should render with running status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'running',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testButtonValues(wrapper, 'edit', 'Edit Task', '');
    });

    it('should render with stopped status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'stopped',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testButtonValues(wrapper, 'edit', 'Edit Task', '');
    });

    it('should render when editing', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      testButtonValues(wrapper, 'edit', 'Edit Task', 'active');
    });

    it('should respond to events', () => {
      const customProps = {
        onSelectTask: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const editButton = getByTestId(wrapper, 'TaskRow.button.edit');
      editButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      editButton.simulate('click');
      expect(customProps.onSelectTask).toHaveBeenCalledWith(defaultProps.task);

      // Set the editing flag to true to test the deselect case
      wrapper.setProps({
        isEditing: true,
      });
      customProps.onSelectTask.mockClear();
      editButton.simulate('click');
      expect(customProps.onSelectTask).toHaveBeenCalledWith(null);
    });
  });

  describe('table row start button', () => {
    it('should render with initial (idle) status', () => {
      const wrapper = renderShallowWithProps();
      testActionButtonValues(wrapper, 'start', 'Start Task', '');
    });

    it('should render with running status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'running',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'start', 'Start Task', 'active');
    });

    it('should render with stopped status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'stopped',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'start', 'Start Task', '');
    });

    it('should render when editing', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'start', 'Start Task', '');
    });

    it('should respond to events', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          id: 1,
        },
        proxies: ['test proxies'],
        onStartTask: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const startButton = getByTestId(wrapper, 'TaskRow.button.action.start');
      startButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      startButton.simulate('click');
      expect(customProps.onStartTask).toHaveBeenCalledWith(customProps.task, customProps.proxies);
    });
  });

  describe('table row stop button', () => {
    it('should render with initial (idle) status', () => {
      const wrapper = renderShallowWithProps();
      testActionButtonValues(wrapper, 'stop', 'Stop Task', '');
    });

    it('should render with running status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'running',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'stop', 'Stop Task', '');
    });

    it('should render with stopped status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'stopped',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'stop', 'Stop Task', 'active');
    });

    it('should render when editing', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'stop', 'Stop Task', '');
    });

    it('should respond to events', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          id: 1,
        },
        onStopTask: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const startButton = getByTestId(wrapper, 'TaskRow.button.action.stop');
      startButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      startButton.simulate('click');
      expect(customProps.onStopTask).toHaveBeenCalledWith(customProps.task);
    });
  });

  describe('table row destroy button', () => {
    it('should render with initial (idle) status', () => {
      const wrapper = renderShallowWithProps();
      testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
    });

    it('should render with running status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'running',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
    });

    it('should render with stopped status', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          status: 'stopped',
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
    });

    it('should render when editing', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      testActionButtonValues(wrapper, 'destroy', 'Destroy Task', '');
    });

    it('should respond to events', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          id: 1,
        },
        onDestroyTask: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const startButton = getByTestId(wrapper, 'TaskRow.button.action.destroy');
      startButton.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      startButton.simulate('click');
      expect(customProps.onDestroyTask).toHaveBeenCalledWith(customProps.task);
    });
  });

  describe('edit menu product input', () => {
    it('should render with correct properties', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.productInput');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__input'));
      expect(input.prop('type')).toBe('text');
      expect(input.prop('required')).toBeTruthy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should respond to change event', () => {
      const customProps = {
        isEditing: true,
        onEditTask: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.productInput');
      input.simulate('change', { target: { value: 'changed' } });
      expect(customProps.onEditTask).toHaveBeenCalledWith(defaultProps.task, {
        field: TASK_FIELDS.EDIT_PRODUCT,
        value: 'changed',
      });
    });
  });

  describe('edit menu site select', () => {
    it('should render with correct properties', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.siteSelect');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__select'));
      expect(input.prop('options')).toEqual(getAllSites());
      expect(input.prop('required')).toBeTruthy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should respond to change event', () => {
      const customProps = {
        isEditing: true,
        onEditTask: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.siteSelect');
      input.simulate('change', { value: 'invalid', label: 'invalid' });
      expect(customProps.onEditTask).not.toHaveBeenCalled();
      input.simulate('change', { value: 'https://kith.com', label: 'Kith' });
      expect(customProps.onEditTask).toHaveBeenCalledWith(defaultProps.task, {
        field: TASK_FIELDS.EDIT_SITE,
        value: {
          url: 'https://kith.com',
          name: 'Kith',
          auth: false,
        },
      });
    });
  });

  describe('edit menu profile select', () => {
    it('should render with correct properties', () => {
      const customProps = {
        profiles: [
          { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
          { ...initialProfileStates.profile, id: 2, profileName: 'profile2' },
        ],
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.profileSelect');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__select'));
      expect(input.prop('options')).toEqual([
        { value: 1, label: 'profile1' },
        { value: 2, label: 'profile2' },
      ]);
      expect(input.prop('required')).toBeTruthy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should respond to change event', () => {
      const customProps = {
        profiles: [
          { ...initialProfileStates.profile, id: 1, profileName: 'profile1' },
          { ...initialProfileStates.profile, id: 2, profileName: 'profile2' },
        ],
        isEditing: true,
        onEditTask: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.profileSelect');
      input.simulate('change', { value: 3, label: 'invalidProfile' });
      expect(customProps.onEditTask).not.toHaveBeenCalled();
      input.simulate('change', { value: 1, label: 'profile1' });
      expect(customProps.onEditTask).toHaveBeenCalledWith(defaultProps.task, {
        field: TASK_FIELDS.EDIT_PROFILE,
        value: customProps.profiles[0],
      });
    });
  });

  describe('edit menu sizes select', () => {
    it('should render with correct properties', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.sizesSelect');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__select'));
      expect(input.prop('options')).toEqual(getAllSizes());
      expect(input.prop('required')).toBeTruthy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should respond to change event', () => {
      const customProps = {
        isEditing: true,
        onEditTask: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.sizesSelect');
      input.simulate('change', [
        { value: '4', label: '4' },
        { value: '4.5', label: '4.5' },
        { value: '5', label: '5' },
        { value: '5.5', label: '5.5' },
      ]);
      expect(customProps.onEditTask).toHaveBeenCalledWith(defaultProps.task, {
        field: TASK_FIELDS.EDIT_SIZES,
        value: ['4', '4.5', '5', '5.5'],
      });
    });
  });

  describe('edit menu username input', () => {
    it('should render with correct properties', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.usernameInput');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__input'));
      expect(input.prop('type')).toBe('text');
      expect(input.prop('required')).toBeFalsy();
      expect(input.prop('disabled')).toBeTruthy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should render with correct properties when not disabled', () => {
      const customProps = {
        isEditing: true,
        edits: {
          ...initialTaskStates.edit,
          site: {
            ...initialTaskStates.site,
            auth: true,
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.usernameInput');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__input'));
      expect(input.prop('type')).toBe('text');
      expect(input.prop('required')).toBeTruthy();
      expect(input.prop('disabled')).toBeFalsy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should respond to change event', () => {
      const customProps = {
        isEditing: true,
        onEditTask: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.usernameInput');
      input.simulate('change', { target: { value: 'changed' } });
      expect(customProps.onEditTask).toHaveBeenCalledWith(defaultProps.task, {
        field: TASK_FIELDS.EDIT_USERNAME,
        value: 'changed',
      });
    });
  });

  describe('edit menu password input', () => {
    it('should render with correct properties', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.passwordInput');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__input'));
      expect(input.prop('type')).toBe('text');
      expect(input.prop('required')).toBeFalsy();
      expect(input.prop('disabled')).toBeTruthy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should render with correct properties when not disabled', () => {
      const customProps = {
        isEditing: true,
        edits: {
          ...initialTaskStates.edit,
          site: {
            ...initialTaskStates.site,
            auth: true,
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.passwordInput');
      expect(input.prop('className')).toEqual(expect.stringContaining('edit-field__input'));
      expect(input.prop('type')).toBe('text');
      expect(input.prop('required')).toBeTruthy();
      expect(input.prop('disabled')).toBeFalsy();
      expect(input.prop('onChange')).toBeDefined();
    });

    it('should respond to change event', () => {
      const customProps = {
        isEditing: true,
        onEditTask: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const input = getByTestId(wrapper, 'TaskRow.edit.passwordInput');
      input.simulate('change', { target: { value: 'changed' } });
      expect(customProps.onEditTask).toHaveBeenCalledWith(defaultProps.task, {
        field: TASK_FIELDS.EDIT_PASSWORD,
        value: 'changed',
      });
    });
  });

  describe('edit menu save button', () => {
    it('should render correctly', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const button = getByTestId(wrapper, 'TaskRow.edit.button.save');
      expect(button.prop('className')).toEqual(expect.stringContaining('action__button'));
      expect(button.prop('className')).toEqual(expect.stringContaining('action__button--save'));
      expect(button.prop('onClick')).toBeDefined();
      expect(button.prop('onKeyPress')).toBeDefined();
      expect(button.text()).toBe('Save');
    });

    it('should respond to events', () => {
      const customProps = {
        isEditing: true,
        task: {
          ...initialTaskStates.task,
          id: 1,
        },
        onCommitEdits: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const button = getByTestId(wrapper, 'TaskRow.edit.button.save');
      button.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      button.simulate('click');
      expect(customProps.onCommitEdits).toHaveBeenCalledWith(customProps.task);
    });
  });

  describe('edit menu cancel button', () => {
    it('should render correctly', () => {
      const customProps = {
        isEditing: true,
      };
      const wrapper = renderShallowWithProps(customProps);
      const button = getByTestId(wrapper, 'TaskRow.edit.button.cancel');
      expect(button.prop('className')).toEqual(expect.stringContaining('action__button'));
      expect(button.prop('className')).toEqual(expect.stringContaining('action__button--cancel'));
      expect(button.prop('onClick')).toBeDefined();
      expect(button.prop('onKeyPress')).toBeDefined();
      expect(button.text()).toBe('Cancel');
    });

    it('should respond to events', () => {
      const customProps = {
        isEditing: true,
        task: {
          ...initialTaskStates.task,
          id: 1,
        },
        onCancelEdits: jest.fn(),
        onKeyPress: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const button = getByTestId(wrapper, 'TaskRow.edit.button.cancel');
      button.simulate('keyPress');
      expect(customProps.onKeyPress).toHaveBeenCalled();
      button.simulate('click');
      expect(customProps.onCancelEdits).toHaveBeenCalledWith(customProps.task);
    });
  });

  test('map state to props returns correct structure', () => {
    const state = {
      profiles: ['profiles'],
      settings: {
        proxies: ['proxies'],
        errors: {
          proxies: [],
        },
      },
      selectedTask: { id: 1 },
      task: 'invalid',
      edits: 'invalid',
      isEditing: false,
      extra: 'fields',
    };
    const ownProps1 = {
      profiles: 'invalid',
      settings: 'invalid',
      selectedTask: 'invalid',
      isEditing: false,
      task: {
        id: 1,
        edits: 'edits',
      },
    };
    const expected1 = {
      profiles: ['profiles'],
      proxies: ['proxies'],
      task: {
        id: 1,
        edits: 'edits',
      },
      edits: 'edits',
      isEditing: true,
    };
    expect(mapStateToProps(state, ownProps1)).toEqual(expected1);
    const ownProps2 = {
      ...ownProps1,
      task: {
        ...ownProps1.task,
        id: 2,
      },
    };
    const expected2 = {
      ...expected1,
      isEditing: false,
      task: {
        ...expected1.task,
        id: 2,
      },
    };
    expect(mapStateToProps(state, ownProps2)).toEqual(expected2);
  });

  test('map dispatch to props returns correct structure', () => {
    const dispatch = jest.fn();
    const testTask = { id: 1 };
    const actual = mapDispatchToProps(dispatch);
    actual.onEditTask(testTask, { field: 'test_field', value: 'test_value' });
    actual.onCancelEdits(testTask);
    actual.onCommitEdits(testTask);
    actual.onSelectTask(testTask);
    actual.onUpdateTask(testTask);
    actual.onStartTask(testTask, ['proxies']);
    actual.onStopTask(testTask);
    actual.onDestroyTask(testTask);

    expect(dispatch).toHaveBeenCalledTimes(8);
    expect(dispatch).toHaveBeenNthCalledWith(1, taskActions.edit(1, 'test_field', 'test_value'));
    expect(dispatch).toHaveBeenNthCalledWith(2, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(3, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(4, taskActions.select(testTask));
    expect(dispatch).toHaveBeenNthCalledWith(5, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(6, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(7, expect.any(Function));
    expect(dispatch).toHaveBeenNthCalledWith(8, expect.any(Function));
  });
});
