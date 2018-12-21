/* global describe it expect beforeEach jest test */
import React from 'react';
import { shallow } from 'enzyme';

import {
  CreateTaskPrimitive,
  mapStateToProps,
  mapDispatchToProps,
} from '../../tasks/createTask';
import { TASK_FIELDS, taskActions } from '../../state/actions';
import { initialTaskStates } from '../../utils/definitions/taskDefinitions';
import { initialProfileStates } from '../../utils/definitions/profileDefinitions';
import getAllSites from '../../constants/getAllSites';
import getAllSizes from '../../constants/getAllSizes';
import getByTestId from '../../__testUtils__/getByTestId';

describe('<CreateTask />', () => {
  let defaultProps;

  const renderShallowWithProps = customProps => {
    const renderProps = {
      ...defaultProps,
      ...customProps,
    };
    return shallow(
      <CreateTaskPrimitive
        profiles={renderProps.profiles}
        task={renderProps.task}
        onFieldChange={renderProps.onFieldChange}
        onAddNewTask={renderProps.onAddNewTask}
        onKeyPress={renderProps.onKeyPress}
        errors={renderProps.errors}
      />
    );
  };

  beforeEach(() => {
    defaultProps = {
      profiles: [],
      task: { ...initialTaskStates.task },
      errors: { ...initialTaskStates.errors },
      onFieldChange: () => {},
      onAddNewTask: () => {},
    };
  });

  it('should render with required default props', () => {
    const wrapper = renderShallowWithProps();
    expect(wrapper.find('.tasks-create')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateTask.passwordInput')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateTask.usernameInput')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateTask.sizesSelect')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateTask.profileSelect')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateTask.siteSelect')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateTask.productInput')).toHaveLength(1);
    expect(getByTestId(wrapper, 'CreateTask.submitButton')).toHaveLength(1);
    getByTestId(wrapper, 'CreateTask.submitButton').simulate('keyPress');
  });

  describe('product input', () => {
    it('should render correctly with default props', () => {
      const wrapper = renderShallowWithProps();
      const productInput = getByTestId(wrapper, 'CreateTask.productInput');
      expect(productInput.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(productInput.prop('type')).toBe('text');
      expect(productInput.prop('onChange')).toBeDefined();
      expect(productInput.prop('value')).toBe('');
      expect(productInput.prop('required')).toBeTruthy();
    });

    it('should render correctly with non-default value', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          product: {
            ...initialTaskStates.product,
            raw: 'test',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const productInput = getByTestId(wrapper, 'CreateTask.productInput');
      expect(productInput.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(productInput.prop('type')).toBe('text');
      expect(productInput.prop('onChange')).toBeDefined();
      expect(productInput.prop('value')).toBe('test');
      expect(productInput.prop('required')).toBeTruthy();
    });

    it('should handle change events', () => {
      const customProps = {
        onFieldChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const productInput = getByTestId(wrapper, 'CreateTask.productInput');
      productInput.simulate('change', { target: { value: 'test' } });
      expect(customProps.onFieldChange).toHaveBeenCalledWith({
        field: TASK_FIELDS.EDIT_PRODUCT,
        value: 'test',
      });
    });
  });

  describe('site select', () => {
    it('should render correctly with default props', () => {
      const wrapper = renderShallowWithProps();
      const siteSelect = getByTestId(wrapper, 'CreateTask.siteSelect');
      expect(siteSelect.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(siteSelect.prop('onChange')).toBeDefined();
      expect(siteSelect.prop('value')).toBeNull();
      expect(siteSelect.prop('options')).toEqual(getAllSites());
      expect(siteSelect.prop('required')).toBeTruthy();
    });

    it('should render correctly with non-default value', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          site: {
            ...initialTaskStates.site,
            name: 'test',
            url: 'testurl',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const siteSelect = getByTestId(wrapper, 'CreateTask.siteSelect');
      expect(siteSelect.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(siteSelect.prop('onChange')).toBeDefined();
      expect(siteSelect.prop('value')).toEqual({
        value: 'testurl',
        label: 'test',
      });
      expect(siteSelect.prop('options')).toEqual(getAllSites());
      expect(siteSelect.prop('required')).toBeTruthy();
    });

    it('should handle change events', () => {
      const customProps = {
        onFieldChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const productInput = getByTestId(wrapper, 'CreateTask.siteSelect');
      productInput.simulate('change', {
        label: 'test',
        value: 'testUrl',
        auth: true,
      });
      expect(customProps.onFieldChange).toHaveBeenCalledWith({
        field: TASK_FIELDS.EDIT_SITE,
        value: {
          name: 'test',
          url: 'testUrl',
          auth: true,
        },
      });
    });
  });

  describe('profile select', () => {
    it('should render correctly with default props', () => {
      const wrapper = renderShallowWithProps();
      const profileSelect = getByTestId(wrapper, 'CreateTask.profileSelect');
      expect(profileSelect.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(profileSelect.prop('onChange')).toBeDefined();
      expect(profileSelect.prop('value')).toBeNull();
      expect(profileSelect.prop('options')).toEqual([]);
      expect(profileSelect.prop('required')).toBeTruthy();
    });

    it('should render correctly with non-default value', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          profile: {
            ...initialTaskStates.task.profile,
            id: 1,
            profileName: 'testProfile',
          },
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelect = getByTestId(wrapper, 'CreateTask.profileSelect');
      expect(profileSelect.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(profileSelect.prop('onChange')).toBeDefined();
      expect(profileSelect.prop('value')).toEqual({
        value: 1,
        label: 'testProfile',
      });
      expect(profileSelect.prop('options')).toEqual([]);
      expect(profileSelect.prop('required')).toBeTruthy();
    });

    it('should render with correct profile options', () => {
      const customProps = {
        profiles: [
          { ...initialProfileStates.profile, id: 1, profileName: 'test' },
          { ...initialProfileStates.profile, id: 2, profileName: 'test2' },
        ],
      };
      const wrapper = renderShallowWithProps(customProps);
      const profileSelect = getByTestId(wrapper, 'CreateTask.profileSelect');
      expect(profileSelect.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(profileSelect.prop('onChange')).toBeDefined();
      expect(profileSelect.prop('value')).toBeNull();
      expect(profileSelect.prop('options')).toEqual([
        { value: 1, label: 'test' },
        { value: 2, label: 'test2' },
      ]);
      expect(profileSelect.prop('required')).toBeTruthy();
    });

    describe('should handle change events', () => {
      test("when given profile doesn't match profile list", () => {
        const customProps = {
          onFieldChange: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const profileSelect = getByTestId(wrapper, 'CreateTask.profileSelect');
        profileSelect.simulate('change', { value: 1, label: 'test' });
        expect(customProps.onFieldChange).not.toHaveBeenCalled();
      });

      test('when given profile matches profile list', () => {
        const customProps = {
          profiles: [
            { ...initialProfileStates.profile, id: 1, profileName: 'test' },
            { ...initialProfileStates.profile, id: 2, profileName: 'test2' },
          ],
          onFieldChange: jest.fn(),
        };
        const wrapper = renderShallowWithProps(customProps);
        const profileSelect = getByTestId(wrapper, 'CreateTask.profileSelect');
        profileSelect.simulate('change', { value: 1, label: 'test' });
        expect(customProps.onFieldChange).toHaveBeenCalledWith({
          field: TASK_FIELDS.EDIT_PROFILE,
          value: customProps.profiles[0],
        });
      });
    });
  });

  describe('sizes select', () => {
    it('should render correctly with default props', () => {
      const wrapper = renderShallowWithProps();
      const sizesSelect = getByTestId(wrapper, 'CreateTask.sizesSelect');
      expect(sizesSelect.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(sizesSelect.prop('onChange')).toBeDefined();
      expect(sizesSelect.prop('value')).toEqual([]);
      expect(sizesSelect.prop('options')).toEqual(getAllSizes());
      expect(sizesSelect.prop('required')).toBeTruthy();
    });

    it('should render correctly with non-default value', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          sizes: ['4', '4.5', '5'],
        },
      };
      const wrapper = renderShallowWithProps(customProps);
      const sizesSelect = getByTestId(wrapper, 'CreateTask.sizesSelect');
      expect(sizesSelect.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(sizesSelect.prop('onChange')).toBeDefined();
      expect(sizesSelect.prop('value')).toEqual([
        { value: '4', label: '4' },
        { value: '4.5', label: '4.5' },
        { value: '5', label: '5' },
      ]);
      expect(sizesSelect.prop('options')).toEqual(getAllSizes());
      expect(sizesSelect.prop('required')).toBeTruthy();
    });

    it('should handle change events', () => {
      const customProps = {
        onFieldChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const sizesSelect = getByTestId(wrapper, 'CreateTask.sizesSelect');
      sizesSelect.simulate('change', [{ value: '4', label: '4.0' }]);
      expect(customProps.onFieldChange).toHaveBeenCalledWith({
        field: TASK_FIELDS.EDIT_SIZES,
        value: ['4'],
      });
    });
  });

  describe('username input', () => {
    it('should render correctly with default props', () => {
      const wrapper = renderShallowWithProps();
      const usernameInput = getByTestId(wrapper, 'CreateTask.usernameInput');
      expect(usernameInput.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(usernameInput.prop('type')).toBe('text');
      expect(usernameInput.prop('onChange')).toBeDefined();
      expect(usernameInput.prop('value')).toBe('');
      expect(usernameInput.prop('required')).toBeFalsy();
      expect(usernameInput.prop('disabled')).toBeTruthy();
    });

    describe('should render correctly with non-default values', () => {
      const setupInput = (testId, customProps) => {
        const wrapper = renderShallowWithProps(customProps);
        const input = getByTestId(wrapper, testId);
        expect(input.prop('className')).toEqual(
          expect.stringContaining('tasks-create__input')
        );
        expect(input.prop('type')).toBe('text');
        expect(input.prop('onChange')).toBeDefined();
        return input;
      };

      test('when no value is given and accounts are required', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: { url: 'testUrl', name: 'test', auth: true },
          },
        };
        const usernameInput = setupInput(
          'CreateTask.usernameInput',
          customProps
        );
        expect(usernameInput.prop('value')).toBe('');
        expect(usernameInput.prop('required')).toBeTruthy();
        expect(usernameInput.prop('disabled')).toBeFalsy();
      });

      test('when a value is given and accounts are not supported', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: { url: 'testUrl', name: 'test', auth: false },
            username: 'testUsername',
          },
        };
        const usernameInput = setupInput(
          'CreateTask.usernameInput',
          customProps
        );
        expect(usernameInput.prop('value')).toBe('testUsername');
        expect(usernameInput.prop('required')).toBeFalsy();
        expect(usernameInput.prop('disabled')).toBeTruthy();
      });

      test('when a value is given and site is not given', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: null,
            username: 'testUsername',
          },
        };
        const usernameInput = setupInput(
          'CreateTask.usernameInput',
          customProps
        );
        expect(usernameInput.prop('value')).toBe('testUsername');
        expect(usernameInput.prop('required')).toBeFalsy();
        expect(usernameInput.prop('disabled')).toBeTruthy();
      });

      test('when a value is given and accounts are supported', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: { url: 'testUrl', name: 'test', auth: true },
            username: 'testUsername',
          },
        };
        const usernameInput = setupInput(
          'CreateTask.usernameInput',
          customProps
        );
        expect(usernameInput.prop('value')).toBe('testUsername');
        expect(usernameInput.prop('required')).toBeTruthy();
        expect(usernameInput.prop('disabled')).toBeFalsy();
      });
    });

    it('should handle change events', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          site: { url: 'testUrl', name: 'test', auth: true },
        },
        onFieldChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const usernameInput = getByTestId(wrapper, 'CreateTask.usernameInput');
      usernameInput.simulate('change', { target: { value: 'test' } });
      expect(customProps.onFieldChange).toHaveBeenCalledWith({
        field: TASK_FIELDS.EDIT_USERNAME,
        value: 'test',
      });
    });
  });

  describe('password input', () => {
    it('should render correctly with default props', () => {
      const wrapper = renderShallowWithProps();
      const passwordInput = getByTestId(wrapper, 'CreateTask.passwordInput');
      expect(passwordInput.prop('className')).toEqual(
        expect.stringContaining('tasks-create__input')
      );
      expect(passwordInput.prop('type')).toBe('text');
      expect(passwordInput.prop('onChange')).toBeDefined();
      expect(passwordInput.prop('value')).toBe('');
      expect(passwordInput.prop('required')).toBeFalsy();
      expect(passwordInput.prop('disabled')).toBeTruthy();
    });

    describe('should render correctly with non-default values', () => {
      const setupInput = (testId, customProps) => {
        const wrapper = renderShallowWithProps(customProps);
        const input = getByTestId(wrapper, testId);
        expect(input.prop('className')).toEqual(
          expect.stringContaining('tasks-create__input')
        );
        expect(input.prop('type')).toBe('text');
        expect(input.prop('onChange')).toBeDefined();
        return input;
      };

      test('when no value is given and accounts are required', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: { url: 'testUrl', name: 'test', auth: true },
          },
        };
        const passwordInput = setupInput(
          'CreateTask.passwordInput',
          customProps
        );
        expect(passwordInput.prop('value')).toBe('');
        expect(passwordInput.prop('required')).toBeTruthy();
        expect(passwordInput.prop('disabled')).toBeFalsy();
      });

      test('when a value is given and accounts are not supported', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: { url: 'testUrl', name: 'test', auth: false },
            password: 'testPassword',
          },
        };
        const passwordInput = setupInput(
          'CreateTask.passwordInput',
          customProps
        );
        expect(passwordInput.prop('value')).toBe('testPassword');
        expect(passwordInput.prop('required')).toBeFalsy();
        expect(passwordInput.prop('disabled')).toBeTruthy();
      });

      test('when a value is given and no size it chosen', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: null,
            password: 'testPassword',
          },
        };
        const passwordInput = setupInput(
          'CreateTask.passwordInput',
          customProps
        );
        expect(passwordInput.prop('value')).toBe('testPassword');
        expect(passwordInput.prop('required')).toBeFalsy();
        expect(passwordInput.prop('disabled')).toBeTruthy();
      });

      test('when a value is given and accounts are supported', () => {
        const customProps = {
          task: {
            ...initialTaskStates.task,
            site: { url: 'testUrl', name: 'test', auth: true },
            password: 'testPassword',
          },
        };
        const passwordInput = setupInput(
          'CreateTask.passwordInput',
          customProps
        );
        expect(passwordInput.prop('value')).toBe('testPassword');
        expect(passwordInput.prop('required')).toBeTruthy();
        expect(passwordInput.prop('disabled')).toBeFalsy();
      });
    });

    it('should handle change events', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          site: { url: 'testUrl', name: 'test', auth: true },
        },
        onFieldChange: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const passwordInput = getByTestId(wrapper, 'CreateTask.passwordInput');
      passwordInput.simulate('change', { target: { value: 'test' } });
      expect(customProps.onFieldChange).toHaveBeenCalledWith({
        field: TASK_FIELDS.EDIT_PASSWORD,
        value: 'test',
      });
    });
  });

  describe('submit button', () => {
    it('should render correctly with default props', () => {
      const wrapper = renderShallowWithProps();
      const submitButton = getByTestId(wrapper, 'CreateTask.submitButton');
      expect(submitButton.prop('className')).toEqual(
        expect.stringContaining('tasks-create__submit')
      );
      expect(submitButton.prop('onKeyPress')).toBeDefined();
      expect(submitButton.prop('onClick')).toBeDefined();
      expect(submitButton.text()).toEqual('Submit');
    });

    it('should respond when clicked', () => {
      const customProps = {
        task: {
          ...initialTaskStates.task,
          id: 1,
        },
        onAddNewTask: jest.fn(),
      };
      const wrapper = renderShallowWithProps(customProps);
      const submitButton = getByTestId(wrapper, 'CreateTask.submitButton');
      const ev = { preventDefault: jest.fn() };
      submitButton.simulate('click', ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(customProps.onAddNewTask).toHaveBeenCalledWith(customProps.task);
    });
  });

  test('map state to props should return correct structure', () => {
    const state = {
      profiles: ['test profile', 'test profile 2'],
      taskToEdit: 'invalid!',
      extra: 'field',
    };
    const ownProps = {
      profiles: ['invalid!'],
      taskToEdit: 'ownPropsTaskEdit',
      extra: 'field',
    };
    const expected = {
      profiles: ['test profile', 'test profile 2'],
      task: 'ownPropsTaskEdit',
    };
    expect(mapStateToProps(state, ownProps)).toEqual(expected);
  });

  test('map dispatch to props should return correct structure', () => {
    const dispatch = jest.fn();
    const actual = mapDispatchToProps(dispatch);
    actual.onFieldChange({ field: 'test_field', value: 'test_value' });
    actual.onAddNewTask({ ...initialTaskStates.task });

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(
      1,
      taskActions.edit(null, 'test_field', 'test_value')
    );
    expect(dispatch).toHaveBeenNthCalledWith(2, expect.any(Function));
  });
});
