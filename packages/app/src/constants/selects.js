const buildOptions = (list, value, label) =>
  list.map(datum => ({ value: datum[value], label: datum[label] }));

export const buildProfileOptions = profiles => buildOptions(profiles, 'id', 'name');
export const buildAccountOptions = accounts =>
  accounts.map(({ id, name, username, password }) => ({
    label: name,
    value: {
      id,
      name,
      username,
      password,
    },
  }));
export const buildWebhookOptions = webhooks => buildOptions(webhooks, 'id', 'name');
export const buildCategoryOptions = () => {
  const categories = [
    'new',
    'Accessories',
    'Bags',
    'Hats',
    'Jackets',
    'Pants',
    'Shirts',
    'Shoes',
    'Shorts',
    'Skate',
    'Sweatshirts',
    'T-Shirts',
    'Tops/Sweaters',
  ];
  return categories.map(cat => ({ label: cat, value: cat }));
};