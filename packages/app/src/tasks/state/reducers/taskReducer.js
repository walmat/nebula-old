import { parseURL } from 'whatwg-url';
import {
  PROFILE_ACTIONS,
  TASK_ACTIONS,
  GLOBAL_ACTIONS,
  TASK_FIELDS,
  mapTaskFieldsToKey,
} from '../../../store/actions';
import { CurrentTask, SelectedTask, task as TaskState } from '../initial';
import { platformForSite } from '../../../constants/platforms';
import { mapTypeToNextType } from '../../../constants/tasks';

// shared reducer for editing current/selected task...
export const taskReducer = (state = TaskState, { field, value, sites }) => {
  // exit early if the payload is improper...
  if (!field) {
    return state;
  }

  // Check if we are editing a new task or an existing one
  switch (field) {
    case TASK_FIELDS.EDIT_PRODUCT: {
      let change = {
        ...state.product,
        raw: value || '',
      };

      if (!value || !value.startsWith('http')) {
        return { ...state, ...change };
      }
      const URL = parseURL(value);
      if (!URL || !URL.host) {
        return { ...state, ...change };
      }
      let newSite;

      sites.forEach(category => {
        const exists = category.options.find(s => URL.host.includes(s.value.split('/')[2]));
        if (exists) {
          newSite = exists;
        }
      });

      if (!newSite || newSite.label === state.site.name) {
        return { ...state, ...change };
      }
      change = {
        ...change,
        site: {
          url: newSite.value,
          name: newSite.label,
          apiKey: newSite.apiKey,
        },
        platform: platformForSite(newSite.value),
      };

      return { ...state, ...change };
    }
    case TASK_FIELDS.EDIT_SITE: {
      if (!value) {
        return state;
      }

      // if we're selecting the same site...
      // TODO: Should we do a shallow compare instead of just comparing the names?
      if (state.site && value.name && value.name === state.site.name) {
        return state;
      }

      return { ...state, platform: platformForSite(value.url), site: value };
    }
    case TASK_FIELDS.EDIT_SIZE:
      return { ...state, size: value };

    case TASK_FIELDS.EDIT_TASK_TYPE:
      return { ...state, type: mapTypeToNextType(state.type) };

    case TASK_FIELDS.TOGGLE_CAPTCHA:
      return { ...state, captcha: !state.captcha || true };

    case TASK_FIELDS.TOGGLE_RANDOM_IN_STOCK:
      return {
        ...state,
        product: {
          ...state.product,
          randomInStock: !state.product.randomInStock,
        },
      };

    case TASK_FIELDS.TOGGLE_ONE_CHECKOUT:
      return {
        ...state,
        oneCheckout: !state.oneCheckout,
      };
    case TASK_FIELDS.TOGGLE_RESTOCK_MODE:
      return { ...state, restockMode: !state.restockMode };

    case TASK_FIELDS.EDIT_TASK_ACCOUNT:
      return { ...state, account: value };

    case TASK_FIELDS.EDIT_TASK_CATEGORY:
      return { ...state, category: value };

    case TASK_FIELDS.EDIT_PRODUCT_VARIATION:
      return {
        ...state,
        product: {
          ...state.product,
          variation: value,
        },
      };

    case TASK_FIELDS.EDIT_CHECKOUT_DELAY: {
      const num = parseInt(value || '0', 10);
      const amount = !Number.isNaN(num) ? num : 0;

      return { ...state, checkoutDelay: amount };
    }
    case TASK_FIELDS.EDIT_AMOUNT: {
      const num = parseInt(value || '0', 10);
      const amount = !Number.isNaN(num) ? num : 0;

      return { ...state, amount };
    }
    default: {
      if (!mapTaskFieldsToKey[field]) {
        return state;
      }

      return { ...state, [mapTaskFieldsToKey[field]]: value };
    }
  }
};

export const currentTaskReducer = (state = CurrentTask, action = {}) => {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return CurrentTask;
  }

  if (type === TASK_ACTIONS.EDIT) {
    const { id } = action;
    if (!id) {
      return taskReducer(state, action);
    }
    return state;
  }

  if (type === PROFILE_ACTIONS.REMOVE) {
    const { id } = action;
    if (!id || !state.profile || state.profile.id !== id) {
      return state;
    }

    return { ...state, profile: null };
  }

  return state;
};

export const selectedTaskReducer = (state = SelectedTask, action = {}) => {
  const { type } = action;

  if (type === GLOBAL_ACTIONS.RESET) {
    return SelectedTask;
  }

  if (type === TASK_ACTIONS.EDIT) {
    const { id } = action;
    if (id) {
      return taskReducer(state, action);
    }
    return state;
  }

  if (type === TASK_ACTIONS.SELECT) {
    const { task } = action;

    if (!task) {
      return state;
    }

    return task;
  }

  if (type === TASK_ACTIONS.REMOVE) {
    const { response } = action;

    if (!response) {
      return state;
    }

    const { type: removalType, task } = response;

    if (removalType && removalType === 'all') {
      return SelectedTask;
    }

    if (!task || (task && !task.id)) {
      return state;
    }

    const { id } = task;

    if (id !== state.id) {
      return state;
    }

    return SelectedTask;
  }

  return state;
};
