import React from 'react';

import ViewTask from './components/viewTask';
import LogTask from './components/logTask';
import CreateTask from './components/createTask';

import '../styles/index.scss';
import './styles/index.scss';

export default () => (
  <div className="container tasks">
    <div className="row row--expand" style={{ width: '100%' }}>
      <div className="col col--expand col--start" style={{ flexGrow: 0.5 }}>
        <div className="row row--start">
          <div className="col col--no-gutter-left">
            <h1 className="text-header tasks__title">Tasks</h1>
          </div>
        </div>
        <div className="row row--expand">
          <div className="col col--expand">
            <div className="row row--start">
              <div className="col col--no-gutter-left">
                <p className="body-text section-header tasks-create__section-header">Create</p>
              </div>
            </div>
            <div className="row row--expand">
              <div className="col col--start col--expand col--no-gutter-left">
                <CreateTask />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col col--expand col--start" style={{ flexGrow: 5 }}>
        <LogTask />
      </div>
    </div>
    <ViewTask />
  </div>
);
