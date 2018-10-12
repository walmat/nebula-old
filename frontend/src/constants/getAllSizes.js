const sizes = [
  { value: 'Random', label: 'Random' },
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
  return sizes;
}

export function getSize(size) {
  return sizes.find(s => s.value === size);
}
