const task = {
    id: '01',
    product: {
      raw: '',
      pos_keywords: ['POD', 'WHITE'],
      neg_keywords: ['BLACK'],
      variant: "16303770894405",
      url: "https://kith.com/collections/all/products/kith-capsule-tee-navy",
    },
    site: {
      url: 'https://kith.com',
      name: 'Kith',
    },
    profile: {
      id: '0',
      profileName: 'test profile',
      billingMatchesShipping: true,
      shipping: {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Test Street',
        apt: '',
        city: 'Test',
        country: 'United States',
        state: 'Iowa',
        zipCode: '50010',
        phone: '5155555555',
      },
      billing: {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Test Street',
        apt: '',
        city: 'Test',
        country: 'United States',
        state: 'Iowa',
        zipCode: '50010',
        phone: '5155555555',
      },
      payment: {
        email: 'matthew.wallt@gmail.com',
        cardNumber: '4079413306285183',
        exp: '05/21',
        cvv: '188',
      },
    },
    username: 'matthew.wallt@gmail.com',
    password: 'mattwall7',
    sizes: ['8.5', '9', '9.5'],
    status: 'idle',
    errorDelay: 2000,
    monitorDelay: 2000,
  };
  
  module.exports = task;
  