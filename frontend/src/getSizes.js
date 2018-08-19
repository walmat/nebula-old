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

const s = [
  { value: '4', label: '4.0' },
  { value: '4.5', label: '4.5' },
  { value: '5', label: '5.0' },
  { value: '5.5', label: '5.5' },
  { value: '6', label: '6.0' },
  { value: '6.5', label: '6.5' },
  { value: '7', label: '7.0' },
  { value: '7.5', label: '7.5' },
  { value: '8', label: '8.0' },
  { value: '8.5', label: '8.5' },
  { value: '9', label: '9.0' },
  { value: '9.5', label: '9.5' },
  { value: '10', label: '10.0' },
  { value: '10.5', label: '10.5' },
  { value: '11', label: '11.0' },
  { value: '11.5', label: '11.5' },
  { value: '12', label: '12.0' },
  { value: '12.5', label: '12.5' },
  { value: '13', label: '13.0' },
  { value: '13.5', label: '13.5' },
  { value: '14', label: '14.0' },
];

export default function getAllSizes() {
  return s;
  // return JSON.parse(JSON.stringify(sizes));
}

export function getSizes(size) {
  return Object.assign({}, sizes.find(s => s.code === size));
}
