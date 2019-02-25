import React from 'react';

const renderSVGIcon = (Icon, props) => {
  const base = {
    draggable: false,
    ...props,
  };
  return <Icon {...base} />;
};

export default renderSVGIcon;
