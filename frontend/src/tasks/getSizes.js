const sizes = [
  { code: '4', name: '4.0' },
  { code: '4.5', name: '4.5' },
  { code: '5', name: '5.0' },
  { code: '5.5', name: '5.5' },
  { code: '6', name: '6.0' },
  { code: '6.5', name: '6.5' },
  { code: '7', name: '7.0' },
  { code: '7.5', name: '7.5' },
  { code: '8', name: '8.0' },
  { code: '8.5', name: '8.5' },
  { code: '9', name: '9.0' },
  { code: '9.5', name: '9.5' },
  { code: '10', name: '10.0' },
  { code: '10.5', name: '10.5' },
  { code: '11', name: '11.0' },
  { code: '11.5', name: '11.5' },
  { code: '12', name: '12.0' },
  { code: '12.5', name: '12.5' },
  { code: '13', name: '13.0' },
  { code: '13.5', name: '13.5' },
  { code: '14', name: '14.0' },
];

export default function getAllSizes() {
  return JSON.parse(JSON.stringify(sizes));
}

export function getSizes(size) {
  return Object.assign({}, sizes.find(s => s.code === size));
}
