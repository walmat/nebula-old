import React from 'react';

const renderSvgIcon = (Icon, props) => {
  const base = {
    draggable: false,
    ...props,
  };
  return <Icon {...base} />;
};

export default renderSvgIcon;
