import React from 'react';

import SelectProfile from './select';
import DeleteButton from './delete';

export default () => (
  <div className="row row--expand row--no-gutter-left" style={{ marginTop: 19 }}>
    <div className="col col--expand col--start">
      <div className="row row--start">
        <div className="col col--no-gutter">
          <div className="profiles-load col col--start col--no-gutter">
            <div className="row row--start row--gutter">
              <div className="col profiles-load__input-group">
                <SelectProfile />
                <DeleteButton className="profiles-load__input-group--delete" label="Delete" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)
