const limit = (val, max) => {
  if (val.length === 1 && val[0] >= max[0]) {
    return `0${val}`;
  }

  if (Number(val) <= 0) {
    return '01';
  } else if (val.length === 2 && val > max) { // this can happen when user paste number
    return max;
  }
  return val;
};
export default limit;
