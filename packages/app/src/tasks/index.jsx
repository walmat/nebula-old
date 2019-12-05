import React from 'react';

import ActionBar from './components/actionBar';
import ViewTask from './components/viewTask';
import CreateTask from './components/createTask';

import '../styles/index.scss';
import './styles/index.scss';

const Tasks = () => (
  <div className="container tasks">
    <div className="row row--expand" style={{ width: '100%' }}>
      <div className="col col--expand col--start" style={{ flexGrow: 0.5, width: '100%' }}>
        <div className="row row--start">
          <div className="col col--no-gutter-left">
            <h1 className="text-header tasks__title">Tasks</h1>
          </div>
        </div>
        <div className="row row--expand" style={{ marginTop: 15 }}>
          <div className="col col--expand">
            <div className="row row--expand">
              <div className="col col--start col--expand col--no-gutter-left">
                <CreateTask />
                <ViewTask />
              </div>
            </div>
          </div>
        </div>
        <ActionBar />
      </div>
    </div>
  </div>
);

export default Tasks;
