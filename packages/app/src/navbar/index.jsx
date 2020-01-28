import React from 'react';

import Harvesters from './components/harvesters';
import NavbarIconRows from './components/icons';
import Versioning from './components/versioning';

import Logo from '../styles/images/navbar/logo.png';

import './styles/index.scss';

const NavbarPrimitive = () => (
  <div className="container navbar">
    <div className="row">
      <div className="col col--gutter">
        <div className="row row--expand">
          <div className="col col--start col--expand">
            <div className="row row--start row--gutter navbar__logo">
              <img className="navbar__logo--image" src={Logo} width={75} alt="" />
            </div>
            <div className="col col--expand col--no-gutter navbar__icons">
              <NavbarIconRows />
            </div>
            <Harvesters />
            <Versioning />
          </div>
        </div>
      </div>
      <div className="col col--no-gutter col--start">
        <div className="navbar--separator" />
      </div>
    </div>
  </div>
);

export default NavbarPrimitive;
