import makeActionCreator from '../actionCreator';

// Top level Actions
export const TASK_ACTIONS = {
  ADD: 'ADD_TASK',
  REMOVE: 'REMOVE_TASK',
  EDIT: 'EDIT_TASK',
  SELECT: 'SELECT_TASK',
  LOAD: 'LOAD_TASK',
  UPDATE: 'UPDATE_TASK',
  START: 'START_TASK',
  STOP: 'STOP_TASK',
  ERROR: 'TASK_HANDLE_ERROR',
};

// Private API Requests
const _addTaskRequest = async task =>
  new Promise((resolve, reject) => {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/i;
    const keywordRegex = /^[+-][A-Za-z0-9&]+$/;
    const variantRegex = /^\d+$/;
    const copy = JSON.parse(JSON.stringify(task));
    const kws = task.product.raw.split(',').reduce((a, x) => a.concat(x.trim().split(' ')), []);
    const validKeywords = kws.map(val => keywordRegex.test(val));

    if (urlRegex.test(task.product.raw)) { // test a url match
      copy.product.url = copy.product.raw;
      resolve({ task: copy });
    } else if (variantRegex.test(task.product.raw)) { // test variant match
      copy.product.variant = copy.product.raw;
      resolve({ task: copy });
    } else if (validKeywords) { // test keyword match
      if (validKeywords.some(v => v === false)) {
        reject(new Error('Improper keywords'));
      } else {
        copy.product.pos_keywords = [];
        copy.product.neg_keywords = [];
        kws.map((kw) => {
          if (kw.slice(0, 1) === '+') { // positive keywords
            return copy.product.pos_keywords.push(kw.slice(1, kw.length));
          }
          // negative keywords
          return copy.product.neg_keywords.push(kw.slice(1, kw.length));
        });
        resolve({ task: copy });
      }
    } else { // reject any other input that fails
      reject(new Error('Unknown Input'));
    }
  });

const _destroyTaskRequest = async id =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id });
    }, 0);
  });

const _updateTaskRequest = async (id, task) =>
  // TODO: Replace this with an actual API call
  new Promise((resolve) => {
    setTimeout(() => {
      // API will likely do something like this:
      const copy = JSON.parse(JSON.stringify(task));
      if (copy.edits !== null) {
        const useAuth = (copy.edits.site && copy.edits.site.auth) || (copy.site && copy.site.auth);
        copy.profile = copy.edits.profile || copy.profile;
        copy.product = copy.edits.product || copy.product;
        copy.sizes = copy.edits.sizes || copy.sizes;
        copy.site = copy.edits.site || copy.site;
        if (useAuth && copy.edits.site) {
          copy.username = copy.edits.username;
          copy.password = copy.edits.password;
        } else if (!(useAuth && copy.site)) {
          copy.username = '';
          copy.password = '';
        }
      }
      copy.edits = {
        profile: copy.profile,
        product: copy.product,
        sizes: copy.sizes,
        site: copy.site,
        username: copy.username,
        password: copy.password,
        errors: {
          profile: null,
          product: null,
          sizes: null,
          site: null,
          username: null,
          password: null,
        },
      };
      resolve({ id, task: copy });
    }, 0);
  });

const _startTaskRequest = async (task, proxies) =>
  // TODO: Replace this with an actual API call
  new Promise((resolve, reject) => {
    // console.log(task, proxies);
    if (task.status === 'running') {
      reject(new Error('Already running'));
    } else {
      resolve({ task });
    }
  });

const _stopTaskRequest = async task =>
  // TODO: Replace this with an actual API call
  new Promise((resolve, reject) => {
    if (task.status === 'stopped') {
      reject(new Error('Already stopped'));
    } else {
      resolve({ task });
    }
  });

// Private Actions
const _addTask = makeActionCreator(TASK_ACTIONS.ADD, 'response');
const _destroyTask = makeActionCreator(TASK_ACTIONS.REMOVE, 'response');
const _updateTask = makeActionCreator(TASK_ACTIONS.UPDATE, 'response');
const _startTask = makeActionCreator(TASK_ACTIONS.START, 'response');
const _stopTask = makeActionCreator(TASK_ACTIONS.STOP, 'response');

// Public Actions
const editTask = makeActionCreator(TASK_ACTIONS.EDIT, 'id', 'field', 'value');
const selectTask = makeActionCreator(TASK_ACTIONS.SELECT, 'task');
// const loadTask = makeActionCreator(TASK_ACTIONS.LOAD, 'task');
const handleError = makeActionCreator(TASK_ACTIONS.ERROR, 'action', 'error');

// Public Thunks
const addTask = task =>
  dispatch => _addTaskRequest(task).then(
    response => dispatch(_addTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.ADD, error)),
  );

const destroyTask = id =>
  dispatch => _destroyTaskRequest(id).then(
    response => dispatch(_destroyTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.DESTROY, error)),
  );

const updateTask = (id, task) =>
  (dispatch, getState) => _updateTaskRequest(id, task).then(
    (response) => {
      dispatch(_updateTask(response));
      const state = getState();
      if (state.selectedTask && state.selectedTask.id === response.id) {
        dispatch(selectTask(null));
      }
    },
    error => dispatch(handleError(TASK_ACTIONS.UPDATE, error)),
  );

const clearEdits = (id, task) => {
  // Clear the edits so the update clears them out properly
  const copy = JSON.parse(JSON.stringify(task));
  copy.edits = null;
  return (dispatch, getState) => _updateTaskRequest(id, copy).then(
    (response) => {
      dispatch(_updateTask(response));
      const state = getState();
      if (state.selectedTask && state.selectedTask.id === response.id) {
        dispatch(selectTask(null));
      }
    },
    error => dispatch(handleError(TASK_ACTIONS.UPDATE, error)),
  );
};

const startTask = (task, proxies) =>
  dispatch => _startTaskRequest(task, proxies).then(
    response => dispatch(_startTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.START, error)),
  );

const stopTask = task =>
  dispatch => _stopTaskRequest(task).then(
    response => dispatch(_stopTask(response)),
    error => dispatch(handleError(TASK_ACTIONS.STOP, error)),
  );

// Field Edits
export const TASK_FIELDS = {
  EDIT_PRODUCT: 'EDIT_PRODUCT',
  EDIT_USERNAME: 'EDIT_USERNAME',
  EDIT_PASSWORD: 'EDIT_PASSWORD',
  EDIT_METHOD: 'EDIT_METHOD',
  EDIT_SITE: 'EDIT_SITE',
  EDIT_PROFILE: 'EDIT_PROFILE',
  EDIT_SIZES: 'EDIT_SIZES',
  EDIT_PAIRS: 'EDIT_PAIRS',
};

export const taskActions = {
  add: addTask,
  destroy: destroyTask,
  edit: editTask,
  clearEdits,
  select: selectTask,
  // load: loadTask,
  update: updateTask,
  start: startTask,
  stop: stopTask,
  error: handleError,
};

export const mapTaskFieldsToKey = {
  [TASK_FIELDS.EDIT_PRODUCT]: 'product',
  [TASK_FIELDS.EDIT_USERNAME]: 'username',
  [TASK_FIELDS.EDIT_PASSWORD]: 'password',
  [TASK_FIELDS.EDIT_SITE]: 'site',
  [TASK_FIELDS.EDIT_PROFILE]: 'profile',
  [TASK_FIELDS.EDIT_SIZES]: 'sizes',
  [TASK_FIELDS.EDIT_PAIRS]: 'pairs',
};
