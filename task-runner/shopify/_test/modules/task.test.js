const task = {
    id: '01',
    product: {
      raw: '',
      pos_keywords: ['POD', 'WHITE'],
      neg_keywords: ['BLACK'],
      variants: ["16907588960325"],
      url: '',
    },
    site: {
      url: 'https://kithnyc.myshopify.com',
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
    sizes: ['8.5'],
    status: 'idle',
    errorDelay: 2000,
    monitorDelay: 2000,
    shippingPoll: 2500,
  };
  
  module.exports = task;
  