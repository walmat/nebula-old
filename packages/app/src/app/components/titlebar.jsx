import React from 'react';
import PropTypes from 'prop-types';

import { close, minimize, deactivate } from '../../constants/bridgeFns';

import { THEMES } from '../../constants/themes';
import { ReactComponent as CloseIcon } from '../../styles/images/app/close.svg';
import { ReactComponent as DeactivateIcon } from '../../styles/images/app/logout.svg';
import { ReactComponent as MinimizeIcon } from '../../styles/images/app/minimize.svg';
import { ReactComponent as NightModeIcon } from '../../styles/images/app/moon.svg';
import { ReactComponent as LightModeIcon } from '../../styles/images/app/sun.svg';

import { renderSvgIcon } from '../../utils';

const Titlebar = ({ theme, store, onSetTheme, onKeyPress }) => (
  <div className="titlebar">
    <div
      className="deactivate-button"
      role="button"
      tabIndex={0}
      title="deactivate"
      onKeyPress={onKeyPress}
      onClick={() => deactivate(store)}
      draggable="false"
    >
      {renderSvgIcon(DeactivateIcon, {
        alt: '',
        style: { marginTop: '6px', marginLeft: '6px' },
      })}
    </div>
    <div
      className="minimize-button"
      role="button"
      tabIndex={0}
      title="minimize"
      onKeyPress={onKeyPress}
      onClick={() => minimize()}
      draggable="false"
    >
      {renderSvgIcon(MinimizeIcon)}
    </div>
    <div
      className="close-button"
      role="button"
      tabIndex={0}
      title="close"
      onKeyPress={onKeyPress}
      onClick={() => close()}
      draggable="false"
    >
      {renderSvgIcon(CloseIcon, {
        alt: '',
        style: { marginTop: '6px', marginLeft: '6px' },
      })}
    </div>
    <div
      className="theme-icon"
      role="button"
      tabIndex={0}
      title="theme"
      onKeyPress={onKeyPress}
      onClick={onSetTheme}
      draggable="false"
    >
      {theme === THEMES.LIGHT
        ? renderSvgIcon(NightModeIcon, {
            alt: 'night mode',
            style: { marginTop: '5px', marginLeft: '5px' },
          })
        : renderSvgIcon(LightModeIcon, {
            alt: 'light mode',
            style: { marginTop: '6px', marginLeft: '4px' },
          })}
    </div>
  </div>
);

Titlebar.propTypes = {
  theme: PropTypes.string.isRequired,
  store: PropTypes.objectOf(PropTypes.any).isRequired,
  onSetTheme: PropTypes.func.isRequired,
  onKeyPress: PropTypes.func,
};

Titlebar.defaultProps = {
  onKeyPress: () => {},
};

export default Titlebar;
