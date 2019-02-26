import React from 'react';

const renderSvgIcon = (Icon, props = {}) => {
  const base = {
    draggable: false,
    ...props,
  };
  if (!React.isValidElement(<Icon />) || Icon.constructor === String) {
    throw new Error(
      `Icon must be a valid React Component!\n\nMake sure you've imported the icon properly:\nimport { MySvg as ReactComponent } from './path/to/my/svg';`,
    );
  }
  return <Icon {...base} />;
};

export default renderSvgIcon;
