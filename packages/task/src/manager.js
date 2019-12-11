import EventEmitter from 'eventemitter3';

// Shared includes
import { Utils, Classes, Constants, Context } from './common';

// Shopify includes
import { Monitor as ShopifyMonitor, Task as ShopifyTask, RateFetcher } from './shopify';
import { Parse } from './shopify/utils';

// Supreme includes
import { Monitor as SupremeMonitor, Task as SupremeTask } from './supreme';

const { getParseType } = Parse;
const { createLogger, registerForEvent, deregisterForEvent, compareProductData } = Utils;
const { ProxyManager, WebhookManager, CaptchaManager } = Classes;
const { Platforms, Manager, Task, Monitor } = Constants;
const { ParseType } = Monitor;
const { Events } = Manager;
const { Events: TaskEvents, Types } = Task;

export default class TaskManager {
  get logPath() {
    return this._logPath;
  }

  constructor(logPath) {
    // Event Emitter for this manager
    this._events = new EventEmitter();

    // Logger file path
    this._logPath = logPath;

    // Tasks Map
    this._tasks = {};

    // Monitors Map
    this._monitors = {};

    // Logger
    this._logger = createLogger({
      dir: this._logPath,
      name: 'TaskManager',
      prefix: 'manager',
    });

    this.proxyManager = new ProxyManager(this._logger);
    this.captchaManager = new CaptchaManager(this._logger);
    this.webhookManager = new WebhookManager(this._logger);

    this.mergeStatusUpdates = this.mergeStatusUpdates.bind(this);
  }

  /**
   * Register a listener for status events
   *
   * @param {Callback} callback
   */
  registerForTaskEvents(callback) {
    this._events.on('status', callback);
  }

  /**
   * Remove a listener from status events
   *
   * @param {Callback} callback
   */
  deregisterForTaskEvents(callback) {
    this._events.removeListener('status', callback);
  }

  // TODO: Move this somewhere where it makes more sense?
  async handleSuccess(task) {
    // eslint-disable-next-line array-callback-return
    return Object.values(this._tasks).map(r => {
      // if we are using the same profile, emit the abort event
      this._logger.debug(
        'ONE CHECKOUT: Same profile?: %j, Same site?: %j, Same product?: %j',
        r.task.profile.id === task.profile.id,
        r.task.store === task.store.url,
        TaskManager._compareProductInput(task.product, r.task.product),
      );

      if (
        r.task.profile.id === task.profile.id &&
        r.task.store === task.store.url &&
        TaskManager._compareProductInput(task.product, r.task.product)
      ) {
        this._events.emit(
          'status',
          task.id,
          { message: 'Profile already used!', status: 'used' },
          TaskEvents.TaskStatus,
        );
        this.stop(r.task);
      }
    });
  }

  /**
   * Callback for Task Events
   *
   * This method is registered as a callback for all running tasks. The method
   * is used to merge all task events into a single stream, so only one
   * event handler is needed to consume all task events.
   *
   * @param {String} id the id of the task/monitor that emitted the event
   * @param {String} message the status message
   * @param {Task.Event} event the type of event that was emitted
   */
  mergeStatusUpdates(taskIds, message, event) {
    this._logger.silly('Tasks: %j posted new event %s - %j', taskIds, event, message);
    // For now only re emit Task Status Events
    if (event === TaskEvents.TaskStatus) {
      this._logger.silly('Reemitting this task update...');
      this._events.emit('status', taskIds, message, event);
    }

    if (event === TaskEvents.MonitorStatus) {
      this._logger.silly('Reemitting this monitor update...');
      this._events.emit('status', taskIds, message, event);
    }
  }

  changeDelay(delay, type) {
    this._logger.silly('Changing %s to: %s ms', type, delay);
    // since monitor/task pairs share the same context, we can just update the tasks' context here..
    return Promise.all(
      Object.values(this._tasks).map(t => {
        const task = t;
        task.context.task[type] = delay;

        const monitor = Object.values(this._monitors).find(m => m.context.hasId(task.context.id));
        if (monitor && monitor.delayer) {
          monitor.delayer.clear();
        }

        if (task.delayer) {
          task.delayer.clear();
        }
        return task;
      }),
    );
  }

  /**
   * Start a task
   *
   * This method starts a given task if it has not already been started. The
   * requisite data is generated (id, open proxy if it is available, etc.) and
   * starts the task asynchronously.
   *
   * If the given task has already started, this method does nothing.
   * @param {Task} task
   * @param {object} options Options to customize the task:
   *   - type - The task type to start
   */
  async start(task, { type = Types.Normal }) {
    const proxy = await this.proxyManager.reserve(task.id, task.store.url, task.platform);

    this._logger.silly('Starting task for %s with proxy %j', task.id, proxy);
    return this._start([task, proxy, type]);
  }

  /**
   * Start multiple tasks
   *
   * This method is a convenience method to start multiple tasks
   * with a single call. The `start()` method is called for all
   * tasks in the given list.
   *
   * @param {List<Task>} tasks list of tasks to start
   * @param {object} options Options to customize the task:
   *   - type - The task type to start
   */
  startAll(tasks, options) {
    Promise.all([...tasks].map(t => this.start(t, options)));
  }

  /**
   * Called after a task gets updated and needs to restart
   */
  async restart(task) {
    this._logger.silly('Restarting task %s', task.id);

    const oldTask = this._tasks[task.id];

    if (!oldTask) {
      this._logger.warn('Task not found! Skipping restart..');
      return;
    }

    const monitor = Object.values(this._monitors).find(m => m.context.hasId(task.id));

    if (!monitor) {
      this._logger.warn('Task not found! Skipping restart..');
      return;
    }

    // patch into context...
    const parseType = getParseType(task.product, task.store, task.platform);
    monitor.context.task = task;
    oldTask.context.task = task;
    monitor.context.setParseType(parseType);
    oldTask.context.setParseType(parseType);
    if (monitor.delayer) {
      monitor.delayer.clear();
    }
  }

  restartAll(tasks, options) {
    Promise.all([...tasks].map(t => this.restart(t, options)));
  }

  /**
   * Stop a task
   *
   * This method stops a given task if it is running. This is done by sending
   * an abort signal to force the task to stop and cleanup anything it needs
   * to.
   *
   * This method does nothing if the given task has already stopped or
   * if it was never started.
   *
   * @param {Task} task the task to stop
   */
  stop({ id }) {
    this._logger.debug('Attempting to stop task with id: %s', id);
    const task = this._tasks[id];
    delete this._tasks[id];

    this._logger.info('Found task: %j', task || false);
    if (!task) {
      this._logger.warn('This task was not previously running or has already been stopped!');
      return null;
    }

    this._logger.info('Stopping task: %s', task.context.id);
    task.stop();

    const monitor = Object.values(this._monitors).find(m => m.context.hasId(id));
    this._logger.debug('Found monitor: %j', monitor || false);

    // this should never happen...
    if (!monitor) {
      this._logger.silly('Performing cleanup for task %s', id);
      return this._cleanup(task);
    }

    // Send abort signal
    this._logger.silly('Abort signal sent');
    monitor.stop(id);
    this._logger.silly('Performing cleanup for task and monitor %s', id);
    return this._cleanup(task, monitor);
  }

  /**
   * Stop multiple tasks
   *
   * This method is a convenience method to stop multiple tasks
   * with a single call. The `stop()` method is called for all
   * tasks in the given list.
   *
   * @param {List<Task>} tasks list of tasks to stop
   * @param {Map} options options associated with stopping tasks
   */
  stopAll(tasks, { force = false, wait = false }) {
    let tasksToStop = tasks;
    // if force option is set, force stop all running tasks
    if (force) {
      tasksToStop = Object.values(this._tasks).map(({ id }) => ({ id }));
      if (tasksToStop.length > 0) {
        this._logger.silly('Force Stopping %d tasks', tasksToStop.length, tasksToStop);
      }
    }
    return Promise.all([...tasksToStop].map(t => this.stop(t, { wait })));
  }

  // MARK: Private Methods
  async _setup(task, monitor) {
    // attach captcha handler
    this.captchaManager.attachHandler(task);

    // if we're spawning a new monitor, attach the monitor event register
    if (monitor) {
      registerForEvent(TaskEvents.MonitorStatus, monitor.context, this.mergeStatusUpdates);
    }

    // attach the task event register
    registerForEvent(TaskEvents.TaskStatus, task.context, this.mergeStatusUpdates);
  }

  async _cleanup(task, monitor) {
    const { context: taskContext } = task;

    if (monitor) {
      const { context: monitorContext } = monitor;
      this._logger.debug('Remaining monitor ids: %j', monitorContext.ids);

      if (!monitorContext.ids.length) {
        this._logger.debug('Freeing monitor!');
        deregisterForEvent(TaskEvents.MonitorStatus, task.context, this.mergeStatusUpdates);
        monitor.context.events.removeAllListeners();
        delete this._monitors[monitorContext.id];
      }
    }

    // Cleanup captcha handler
    this.captchaManager.detachHandler(task);

    // Cleanup manager handlers
    deregisterForEvent(TaskEvents.TaskStatus, task.context, this.mergeStatusUpdates);

    // If we have a proxy, make sure to free that up
    if (taskContext.proxy) {
      this.proxyManager.release(
        taskContext.id,
        taskContext.task.store.url,
        task.platform,
        taskContext.proxy.id,
      );
    }

    return taskContext.id;
  }

  async _start([task, proxy, type]) {
    let newTask;
    let monitor;

    const { platform, id } = task;

    switch (platform) {
      case Platforms.Shopify: {
        const parseType = getParseType(task.product, null, platform);

        const context = new Context({
          id,
          task,
          type,
          parseType,
          proxy,
          logger: createLogger({
            dir: this._logPath,
            name: `Task-${id}`,
            prefix: `task-${id}`,
          }),
          proxyManager: this.proxyManager,
          webhookManager: this.webhookManager,
        });

        if (type === Types.Normal) {
          newTask = new ShopifyTask(context);

          const found = Object.values(this._monitors).find(async m => {
            if (m.platform === platform) {
              const { context: mContext } = m;
              const isSameProduct = await compareProductData(
                mContext.task.product,
                context.task.product,
                parseType,
              );

              this._logger.debug(
                'Same product data?: %j Same URL?: %j',
                isSameProduct,
                mContext.task.store.url === context.task.store.url,
              );

              if (isSameProduct && mContext.task.store.url === context.task.store.url) {
                return m;
              }
            }
            return null;
          });

          this._logger.debug('Existing monitor? %j', found || false);

          if (found) {
            this._logger.debug('Existing monitor found! Just adding id');
            found.context.addId(id);
            // patch the context as well..
            context.task.product = found.context.task.product;
          } else {
            monitor = new ShopifyMonitor(context);
          }
        } else if (type === Types.Rates) {
          newTask = new RateFetcher(context);
        }
        break;
      }
      case Platforms.Supreme: {
        const context = new Context({
          id,
          task,
          parseType: ParseType.Keywords,
          proxy,
          logger: createLogger({
            dir: this._logPath,
            name: `Task-${id}`,
            prefix: `task-${id}`,
          }),
          proxyManager: this.proxyManager,
          webhookManager: this.webhookManager,
        });

        newTask = new SupremeTask(context);

        const found = Object.values(this._monitors).find(async m => {
          if (m.platform === platform) {
            const { context: mContext } = m;
            const isSameProduct = await compareProductData(
              mContext.task.product,
              context.task.product,
              ParseType.Keywords,
            );

            this._logger.debug(
              'Same product?: %j Same category?: %j Same URL?: %j',
              isSameProduct,
              mContext.task.category === context.task.category,
              mContext.task.store.url === context.task.store.url,
            );

            if (
              isSameProduct &&
              mContext.task.category === context.task.category &&
              mContext.task.store.url === context.task.store.url
            ) {
              return m;
            }
          }
          return null;
        });

        this._logger.debug('Existing monitor? %j', found || false);

        if (found) {
          this._logger.debug('Existing monitor found! Just adding ids');
          found.context.addId(id);
          // patch in the context as well..
          context.task.product = found.context.task.product;
        } else {
          this._logger.debug('No monitor found! Creating a new monitor');
          monitor = new SupremeMonitor(context);
        }
        break;
      }
      default:
        break;
    }

    // Return early if invalid task was created...
    if (!newTask) {
      return;
    }

    if (monitor) {
      this._monitors[id] = monitor;
    }
    this._tasks[id] = newTask;

    this._logger.silly('Attaching events...');
    this._setup(newTask, monitor);

    // Start the task/monitor
    this._logger.silly('Starting...');
    try {
      if (monitor) {
        this._logger.verbose('Monitor %s started without errors', id);
        monitor.run();
      }
      newTask.run();
      this._logger.verbose('Task %s started without errors', id);
    } catch (error) {
      this._logger.error('Task %s was unable to start due to an error: %s', id, error.toString());
      this.stop(task);
    }
  }
}

TaskManager.Events = Events;
