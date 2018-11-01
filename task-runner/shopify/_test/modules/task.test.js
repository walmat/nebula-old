const task = {
    id: '01',
    product: {
      raw: '',
      pos_keywords: ['POD', 'WHITE'],
      neg_keywords: ['BLACK'],
      variant: "16303829483589",
      url: "https://kith.com/products/kith-x-vasque-sundowner-gtx-mauve",
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
        firstName: 'Matthew',
        lastName: 'Wall',
        address: '13411 Oak Park Blvd',
        apt: null,
        city: 'Oak Park',
        country: 'United States',
        state: 'Michigan',
        zipCode: '48237',
        phone: '5157206516',
      },
      billing: {
        firstName: 'Matthew',
        lastName: 'Wall',
        address: '13411 Oak Park Blvd',
        apt: null,
        city: 'Oak Park',
        country: 'United States',
        state: 'Michigan',
        zipCode: '48237',
        phone: '5157206516',
      },
      payment: {
        email: 'matthew.wallt@gmail.com',
        cardNumber: '4079413306285183',
        exp: '05/21',
        cvv: '188',
      },
    },
    sizes: ['8.5', '9', '9.5'],
    status: 'idle',
    errorDelay: 2000,
    monitorDelay: 2000,
  };
  
  module.exports = task;
  