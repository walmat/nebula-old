const s = [
  { value: 'https://kith.com', label: 'Kith' },
];

export default function getAllSizes() {
  return s;
}

export function getSites(site) {
  return Object.assign({}, s.find(t => t.value === site));
}
