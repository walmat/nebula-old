const AWS = require('aws-sdk');
const nebulaEnv = require('./src/utils/env');

nebulaEnv.setUpEnvironment();
const config = require('./src/utils/setupDynamoConfig').getConfig();
const { hash } = require('./hash');
const { salt, algo, output } = require('./hashConfig.json');

AWS.config.update(config);
const dynamodb = new AWS.DynamoDB();

const keys = [
  'd2ce126d-bc8f-4dfe-a415-b78dab7b0d5e',
  '7d2bf729-bba7-4c2d-8d91-64891aa72e85',
  'dd1579e8-5e27-4057-8ab1-41fac6f45561',
  '02edf1f2-59ab-40e4-8a98-c15158c39c2e',
  'b7eb88f8-3afc-4077-9153-90c46c0fa958',
  '4132a3ea-c091-47b4-b3b4-417b13f6e0af',
  'e5cf9cc8-b7a3-4e1b-9aec-f4af02a06fe3',
  '9b82865f-71dc-40e7-b1f9-b3d7c3204610',
  '0bbf3caf-e7fe-4c59-a0c0-a730ad792ef8',
  'ef40cb47-0daf-4026-a62c-d2bf4e426c6b',
  '0ff34be4-3eaa-4d41-b5b8-4ab81d3575b0',
  'fa769cc5-9e8e-4374-a1d0-84e1bb052507',
  '4ba9458b-61a9-4bfb-b874-1c20bc27ed4b',
  '7971b490-f698-4920-bbc3-8e6455e84d2a',
  'bebca968-bf40-41bd-972a-17771c59b8ec',
  '7d8a778e-7787-4bdf-ba63-cd187010cb98',
  'eac1a836-27d1-4efb-a369-53dfdeba3208',
  '1517d45f-7d2c-4418-bd01-756e76d644c8',
  'd4354175-3489-4f66-bbe2-cd5e9797b990',
  '823ecae6-8254-4c9b-b0cb-3af70310b50c',
  '7b9c14fa-d6e2-4564-b212-76b0356b8fe6',
  '6a8b6dc6-ac6f-4cee-8916-64156cebad56',
  '3a8eae9f-c493-4357-adc4-f1acbc918390',
  'f9f386b6-d9eb-4915-968a-1082790a0b19',
  '5b69900e-6629-40b8-8f57-5a0bd7d9948a',
  '73af986c-7507-4ac8-8028-590810775b32',
  'c6dc7c9a-4fed-41b7-9360-0add17ad98a6',
  'fd74ac78-7463-47eb-8eb9-9428b11066dd',
  '0139ba58-7931-4912-bb38-1c5dd7c7fa51',
  'ae3c99d1-b839-4e36-bf24-8a7230bf5fe6',
  '40941e5d-dfbf-409f-9432-3b4de2ddd554',
  '7ba2c9f5-0190-4356-b4a9-787a799bb245',
  '2b7e7846-187a-46bc-a6c4-dd098d431fe6',
  '49ae01f3-4dc4-413f-862a-b62a813a74f3',
  'efd37f93-5540-411a-8e23-60cfcdde9fe9',
  '4bbaec32-f012-47c9-adfe-17caba39331d',
  'ee7890fb-e82a-495c-a101-e437f3a06e26',
  '39c2f9ae-02d0-4f23-8b32-38514ebc91c6',
  'ab7b8bf5-5306-41fc-b73a-98637cb76a12',
  'f4e5c7db-a827-4af0-8205-380f7ff0630d',
  '728bd2ff-fca2-4cd0-b781-5aa1c2a4769e',
  'a26b7a3a-95c4-40f7-aea1-494e644e5c70',
  '4c588e13-f6f4-461f-bbc1-39b3e1b98307',
  'c994720b-097c-479c-957f-def6279b6e38',
  '25b31427-66c3-4744-a124-76deee165b7d',
  'e6e4e6f4-5141-4004-a96a-d9b9fec0f277',
  '5044b830-dc7c-413b-9ce7-e5270e907804',
  '6710eca4-4182-4014-9a25-a5a2ed62a867',
  'e03d971a-b564-40a1-b307-b4e3ac13b739',
  '128e4c5b-0446-4349-bb54-8d736a398b80',
  'f2474225-e9fe-437f-9f0e-99a07eb520c3',
  'ed05d4dd-5394-4535-b38a-6d7b33693638',
  '64312dc2-8ae7-4236-b2f9-33602a6335c9',
  'a031ad55-f2a1-4701-8fb1-9f47f5f34026',
  '6f28ceb0-ae7a-41a0-b622-1acfdf8dbaf1',
  '8790193d-77f0-48fc-9659-ce27912e70e6',
  'c8782cd3-e39d-483b-adfe-6ba38401cd39',
  '41c0d1bd-50ac-4259-9dc9-d182ad5b7347',
  '873b64a3-651e-4923-889e-b05abc4efb8c',
  '86f7e7d1-0a93-4df4-8090-74ba2c3d9e14',
  'd7732a40-18b9-4521-a4bc-1cbeaa14ac83',
  'ce6fb095-dd52-4654-a4c3-480db8619eb2',
  '142c012a-1570-4101-b05a-3f65b8cb62a1',
  'b6e3ab69-33c8-45bc-ad2e-eee02ba28523',
  '2480386d-b1f5-4093-af1e-134e5ed402e1',
  '5d2a802a-9d39-4da8-9233-b0b4ea379ce9',
  '64f694a6-959a-4371-9611-37a1674dbc85',
  '029c4cc0-c3db-4106-aa9f-ce382a100f83',
  'f09e2475-8582-480e-928d-ac3505f52144',
  '9e9e7a10-dc10-47ec-a5c3-b92dbd7e18ee',
  '0275f856-f0ca-4f90-b5c0-980fd7ccdcc2',
  '81e3fc71-4943-427c-8b67-68178bf6bc7a',
  '59cef257-c71a-4f32-aaa7-360bbb90bc16',
  'fa9ccffe-50fb-484e-85f1-67a3bb0a1153',
  'af071b82-6d98-43b4-95f6-22a810d9e523',
  '191daa25-3270-4ac8-bd89-c2f7d3231ecc',
  '9e5b73e2-2bce-42c7-bbf2-838d9be2b6d4',
  'cc9d4fdd-521a-4414-8369-f91922165f40',
  'cea5781d-d6da-46c3-b5e7-d0834a2357a6',
  'fa4a0a52-a306-42da-8b2f-6d3ee397d74f',
  '5ff086be-671a-4197-9f83-f57daa464db6',
  'fab81b27-1080-424d-98be-f211b0ab2c10',
  'ef260ce2-d6d1-4051-b5e6-914a1e0e5ae2',
  'b82375cf-bcc7-465b-bd58-ff6dbe78c11b',
  '97cc8d7e-75f9-4771-9144-86d41f6ba30e',
  'd63cd160-8c82-4f86-98b2-f14f13ec0c3e',
  '1c640abd-cae6-474e-b6b5-1fd865595f31',
  '58ee9302-c3bd-4d32-8dd0-1c91fa7a6162',
  'fae61b42-da74-4745-b1b1-fe98bd94527b',
  'a8f3a4e5-34eb-4f2d-8b46-3dcb965f1f8d',
  '40405ced-645d-41b1-a911-8dae3a687968',
  '5bcb6bae-9e7d-4c61-94c7-6cc5db89cbd6',
  '6cad3e32-a070-42bc-9660-04a45925060b',
  '719c47b8-de00-48d8-b66f-8c18eca06416',
  'b4b49a91-a76c-4abd-ad50-0c70b9e71e81',
  '29f68b01-6847-408c-a6f9-a365224820ea',
  '41c4c6c3-b314-46fd-a78c-f8a47d389929',
  '047b2fea-fdf7-43a7-9f90-3f02e5eaa895',
  'b4219cf4-7f9b-4e06-a815-74f70ea974d1',
  '7eb29515-73ea-4baf-903a-d36ee249e6d1',
  'd9b106c5-150c-43f2-9dde-bd1d209db7a5',
  'e1af6c51-baf0-4c99-b57e-10c5bd4f1f2b',
  'c2906121-21d7-497d-9f3c-5e9d039a384f',
  'fb8fbea4-f654-417a-bbce-b9715737e16a',
  '83dc1d1e-2958-485c-9ddf-50cd70f81f63',
  'f002d8fc-d118-4cf9-a8ec-12c8f1050b69',
  '6aef74cf-35cf-4acb-84f1-3372c69f9df7',
  '240b3346-9d0e-4282-ad5a-c4cdad3a8ce8',
  '0f7387dd-f5b2-4f49-9a47-0179462b04c6',
  'c7ea6690-cd9d-42ac-a0f2-d6d775851db0',
  'd2ffa09a-67ac-4912-951e-c47b85043323',
  'd2ffa09a-67ac-4912-951e-c47b85043323',
  '74499be4-bdf1-4640-85fe-580b5b48457b',
  '35f153e3-43b9-4632-9a49-ac49bf803b78',
  'cbf92704-0c7b-4819-8c5a-cbc5c4ba6e06',
  'b1b726ed-8c8d-403f-a51a-26ad761aad56',
  '61c36ea3-426b-47e9-bd12-13141d23c8c3',
  '084661df-c47c-40c7-aa22-69a48dc8467d',
  'ad5a6fb1-28c3-4392-8ac7-2ef38853ec5d',
  'e732ca4f-49ff-435d-99ac-5dbd16299e63',
  '1255cfae-4693-42b7-8e66-bb30d6310274',
  '80bd7f7b-1783-4062-8299-ce39bdb663fe',
  '66fca2ae-a53d-4555-ba65-3d78101cfcd9',
  '44086a58-184a-4da1-b185-567b30abe471',
  't-b91608f2-f1c0-44f8-94e2-689e4469f0b9',
];

function storeKey(key) {
  const keyHash = hash(algo, key, salt, output);
  console.log(key, keyHash);

  // const params = {
  //   Item: {
  //     licenseKey: {
  //       S: keyHash,
  //     },
  //   },
  //   ReturnConsumedCapacity: 'TOTAL',
  //   TableName: 'Keys',
  // };
  // dynamodb.putItem(params, (err, data) => {
  //   if (err) console.log(err, err.stack); // an error occurred
  // });
}

async function getAllKeys() {
  try {
    const params = {
      TableName: 'Keys',
    };
    const result = await dynamodb.scan(params).promise();
    result.Items.forEach(key => console.log(key));
  } catch (err) {
    console.log(`Couldn't read the table Keys.`);
  }
}

async function getAllDiscord() {
  try {
    const params = {
      TableName: 'Discord',
    };
    const result = await dynamodb.scan(params).promise();
    result.Items.forEach(discord => console.log(discord));
  } catch (err) {
    console.log(`Couldn't read the table Discord.`);
  }
}

async function getAllUsers() {
  try {
    const params = {
      TableName: 'Users',
    };
    const result = await dynamodb.scan(params).promise();
    result.Items.forEach(user => console.log(user));
  } catch (err) {
    console.log(`Couldn't read the table Users.`);
  }
}

const run = async () => {
  await keys.map(key => storeKey(key));
};

// Respond to CLI
if (process.argv.length === 3) {
  switch (process.argv[2]) {
    case '-u': {
      getAllUsers();
      break;
    }
    case '-k': {
      getAllKeys();
      break;
    }
    case '-d': {
      getAllDiscord();
      break;
    }
    case '-a': {
      // Call all here
      getAllUsers();
      getAllKeys();
      getAllDiscord();
      break;
    }
    default: {
      storeKey(process.argv[2]);
      break;
    }
  }
} else {
  run();
}
