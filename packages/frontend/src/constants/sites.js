const sites = [
  {
    label: 'Shopify',
    supported: true,
    options: [
      {
        label: '12AM Run',
        value: 'https://12amrun.com',
        apiKey: 'e5b0d0dc103ac126c494f8cc1fd70fe9',
        supported: true,
      },
      {
        label: 'A-Ma-Maniere',
        value: 'https://a-ma-maniere.com',
        apiKey: '23348e90253d0a4895d5524b79914bbe',
        supported: true,
      },
      {
        label: 'APB Store',
        value: 'https://apbstore.com',
        apiKey: 'cf7dd82098a4388648acb12a5a9aa063',
        supported: true,
      },
      {
        label: 'Addict Miami',
        value: 'https://www.addictmiami.com',
        apiKey: '902bdaf4657c0001f57576ff2d7e9950',
        supported: true,
      },
      {
        label: 'Anti Social Social Club',
        value: 'https://shop.antisocialsocialclub.com',
        apiKey: '4189262a3c6b7c3fea963c5602c51182',
        supported: true,
      },
      {
        label: 'Atmos NYC',
        value: 'https://atmosny.com',
        apiKey: '5d257a7900ff521cf3affdcc1ba2bcbc',
        supported: true,
      },
      {
        label: 'BBC Ice Cream US',
        value: 'https://shop.bbcicecream.com',
        apiKey: '344bd1cc389a1b9d715d6a9103761258',
        supported: true,
      },
      {
        label: 'BBC Ice Cream EU',
        value: 'https://bbcicecream.eu',
        apiKey: '5d18d2cf2f1179ec99f8c127120d5d88',
        supported: true,
      },
      {
        label: 'Bape',
        value: 'https://us.bape.com',
        apiKey: 'a45de9ba54947c6286e329042853dafc',
        supported: true,
      },
      {
        label: 'Beatnic Online',
        value: 'https://beatniconline.com',
        apiKey: 'f40672d49a69047fc526dceb4255ae7a',
        supported: true,
      },
      {
        label: 'Black Market US',
        value: 'http://blkmkt.us',
        apiKey: '8fe3dbccac6a59eefb67a5bbeb490b42',
        supported: true,
      },
      {
        label: 'Blends',
        value: 'https://blendsus.com',
        apiKey: 'a695a9ac76b89f50663628617f8498f6',
        supported: true,
      },
      {
        label: 'Bodega',
        value: 'https://shop.bdgastore.com',
        apiKey: 'dbd316d5c797eb8e3caede9dd08f92ef',
        supported: true,
      },
      {
        label: 'Bows & Arrows',
        value: 'https://bowsandarrowsberkeley.com',
        apiKey: '4e1a1ec97a4ba0c0b8c4042f75b3e6dd',
        supported: true,
      },
      {
        label: 'Bring the Heat Bots',
        value: 'https://bringtheheatbots.com',
        apiKey: '6147e9f3c3886ac3deee7e77546da729',
        supported: true,
      },
      {
        label: 'Burn Rubber',
        value: 'https://burnrubbersneakers.com',
        apiKey: '7bbda6e82f72c3dba50a7f27be6227ec',
        supported: true,
      },
      {
        label: 'Commonwealth',
        value: 'https://commonwealth-ftgg.com',
        apiKey: '9f57a59e7362969406227b0d77620ba9',
        supported: true,
      },
      {
        label: 'Concepts',
        value: 'https://cncpts.com',
        apiKey: '5f6b24ca255661ff3414cee10472efd1',
        supported: true,
      },
      {
        label: 'Courtside Sneakers',
        value: 'https://courtsidesneakers.com',
        apiKey: 'df3f69558213cc0733a48de759c86409',
        supported: true,
      },
      {
        label: 'DSM US',
        value: 'https://eflash-us.doverstreetmarket.com',
        apiKey: 'c61dfd7121456f05d58cedf7a0b068b6',
        special: true,
        supported: true,
      },
      {
        label: 'DSM UK',
        value: 'https://eflash.doverstreetmarket.com',
        apiKey: '0386ed516cfb121c71eee5a33b357cc6',
        special: true,
        supported: true,
      },
      {
        label: 'DSM SG',
        value: 'https://eflash-sg.doverstreetmarket.com',
        apiKey: '0867cfd02e49786c54fd1a9fd02f03cd',
        special: true,
        supported: true,
      },
      {
        label: 'DSM JP',
        value: 'https://eflash-jp.doverstreetmarket.com',
        apiKey: '8cbefa53e1484d3a39a41396a00b9fe9',
        special: true,
        supported: true,
      },
      {
        label: 'Exclucity',
        value: 'https://shop.exclucitylife.com',
        apiKey: 'c4fc1d7d22415da024299c8629e85d3a',
        supported: true,
      },
      {
        label: 'Extra Butter',
        value: 'https://shop.extrabutterny.com',
        apiKey: '9474824e25b8e9a0f6ecd7d8be9a79de',
        supported: true,
      },
      {
        label: 'Feature',
        value: 'https://featuresneakerboutique.com',
        apiKey: 'd3ced42695b5dc27734d4638c3a97ae1',
        supported: true,
      },
      {
        label: 'Funko Shop',
        value: 'https://funko-shop.myshopify.com',
        apiKey: 'a861544cb572058d21ab033f62010615',
        special: true,
        supported: true,
      },
      {
        label: 'Graffiti Prints',
        value: 'https://graffitiprints.myshopify.com',
        apiKey: 'ae5f37d01a094736115bd94fb9b94db5',
        supported: true,
      },
      {
        label: 'Haven',
        value: 'https://shop.havenshop.com',
        apiKey: 'b2d28cc6049fca1d79dbc390a0fef334',
        supported: true,
      },
      {
        label: 'HBO Shop',
        value: 'https://shop.hbo.com',
        apiKey: 'd141a5b5b5850619d4142b03dbe80753',
        supported: true,
      },
      {
        label: 'Highs & Lows',
        value: 'https://highsandlows.net.au',
        apiKey: '29452cd62f80a6435ff15e311766261d',
        supported: true,
      },
      {
        label: 'History Of NY',
        value: 'https://shophny.com',
        apiKey: 'f3eaf4a05d9a5476835fd1ca23b1845b',
        supported: true,
      },
      {
        label: 'Hotoveli',
        value: 'https://hotoveli.com',
        apiKey: 'c15497edebc46d4178eb823ce3b7b695',
        supported: true,
      },
      {
        label: 'John Geigerco',
        value: 'https://johngeigerco.com',
        apiKey: '74710b3ac1c583d3e1e17aef8ba07c84',
        supported: true,
      },
      {
        label: 'Kith',
        value: 'https://kith.com',
        apiKey: '08430b96c47dd2ac8e17e305db3b71e8',
        supported: true,
      },
      {
        label: 'Kylie Cosmetics',
        value: 'https://kyliecosmetics.com',
        apiKey: 'd3ec1d3b053a5239a379cb3f1d99cf90',
        supported: true,
      },
      {
        label: 'Lapstone & Hammer',
        value: 'https://lapstoneandhammer.com',
        apiKey: '49b214ac5d8865c0b591436dc44be785',
        supported: true,
      },
      {
        label: 'Livestock',
        value: 'https://deadstock.ca',
        apiKey: '29c1e1054770e9694717256c270f4359',
        supported: true,
      },
      {
        label: 'Machus',
        value: 'https://machusonline.com',
        apiKey: '85ef1c2852f958c66504c5bf1768c729',
        supported: true,
      },
      {
        label: 'Marathon Sports',
        value: 'https://shop.marathonsports.com',
        apiKey: '5b9e6bee71016ff1e2911a44701f4d89',
        supported: true,
      },
      {
        label: 'NRML',
        value: 'https://nrml.ca',
        apiKey: '6f55f8c75577c1063d8489c94d9ab122',
        supported: true,
      },
      {
        label: 'Noirfonce',
        value: 'https://noirfonce.eu',
        apiKey: '39aa752c77d4ac53e9daf9d49f61c0ad',
        supported: true,
      },
      {
        label: 'Notre',
        value: 'https://notre-shop.com',
        apiKey: '2f85af10bb30c1b7a78259b6c1c49d53',
        supported: true,
      },
      {
        label: 'Obey Giant',
        value: 'https://store.obeygiant.com',
        apiKey: '2aaaddc9a967cab510a9f6e00dfba13c',
        supported: true,
      },
      {
        label: 'Octobers Very Own US',
        value: 'https://us.octobersveryown.com',
        apiKey: '97f3874f6d268f1c681d88ef789edee3',
        supported: true,
      },
      {
        label: 'Octobers Very Own UK',
        value: 'https://uk.octobersveryown.com',
        apiKey: 'a388ac8dce2553267e06840eda2f07c4',
        supported: true,
      },
      {
        label: 'Off The Hook',
        value: 'https://offthehook.ca',
        apiKey: '2e0e6c2f045e1c04714f65b0a0b30b0c',
        supported: true,
      },
      {
        label: 'Oipolloi',
        value: 'https://www.oipolloi.com',
        apiKey: 'fc5579f3adf2889237757219239a7f40',
        supported: true,
      },
      {
        label: 'Omocat',
        value: 'https://www.omocat-shop.com',
        apiKey: 'c981c52d7e758c188f193028d90b4eb4',
        supported: true,
      },
      {
        label: 'Oneness 287',
        value: 'https://www.onenessboutique.com',
        apiKey: '5de5d471976e82ceba582a81606e0ac5',
        supported: true,
      },
      {
        label: 'Packer Shoes',
        value: 'https://packershoes.com',
        apiKey: 'b26bacc7a6c3fb5ea949af1df91f3d1b',
        supported: true,
      },
      {
        label: 'Palace US',
        value: 'https://shop-usa.palaceskateboards.com',
        apiKey: '59571a4e503fc3164848c544a5fda777',
        special: true,
        supported: true,
      },
      {
        label: 'Palace UK',
        value: 'https://shop.palaceskateboards.com',
        apiKey: 'c1369ef0027f554f66e555f2c1347048',
        special: true,
        supported: true,
      },
      {
        label: 'Palace JP',
        value: 'https://shop-jp.palaceskateboards.com',
        apiKey: '174834a020c4994e48f0405e0017ea51',
        special: true,
        supported: true,
      },
      {
        label: 'Par-5 Milano Yeezy',
        value: 'https://par5-milano-yeezy.com',
        apiKey: 'a5ed56888e0d5653c9f59687ed58b0fe',
        supported: true,
      },
      {
        label: 'Places+Faces',
        value: 'https://shop.placesplusfaces.com',
        apiKey: '5a3ea828f3e6dbe89acd803835adcfca',
        supported: true,
      },
      {
        label: 'Premier',
        value: 'https://thepremierstore.com',
        apiKey: '8c89a0773c5d8422ed2309eccd694464',
        supported: true,
      },
      {
        label: 'Proper LBC',
        value: 'https://properlbc.com',
        apiKey: '5c6d8f621dc3cd0cc5f37886ea8aa34f',
        supported: true,
      },
      {
        label: 'RSVP Gallery',
        value: 'https://rsvpgallery.com',
        apiKey: '68861eece3d19735546a05faf429e759',
        supported: true,
      },
      {
        label: 'Reigning Champ',
        value: 'https://us.reigningchamp.com',
        apiKey: 'cdecb98ef85c1fac66576864dbd5ab9c',
        supported: true,
      },
      {
        label: 'Renarts',
        value: 'https://renarts.com',
        apiKey: 'fe288dcbb1f39f890295118d31cef77e',
        supported: true,
      },
      {
        label: 'Rime NYC',
        value: 'https://www.rimenyc.com',
        apiKey: '1b12b20efde8a2055a4b11b7821a4e02',
        supported: true,
      },
      {
        label: 'Rise 45',
        value: 'https://rise45.com',
        apiKey: 'f2be3597cd0ea22e67c89a3b5b5b22fd',
        supported: true,
      },
      {
        label: 'Rock City Kicks',
        value: 'https://rockcitykicks.com',
        apiKey: '0e2c941e4486f31180e1385a50546d2d',
        supported: true,
      },
      {
        label: 'Ronin Division',
        value: 'https://www.ronindivision.com',
        apiKey: 'ce83c8b3b27a07c74b13ada3f4d492f4',
        supported: true,
      },
      {
        label: 'Ronnie Fieg',
        value: 'https://shop.ronniefieg.com',
        apiKey: '918f5b1828654f4587fca2eba1f6c8fb',
        supported: true,
      },
      {
        label: 'Saint Alfred',
        value: 'https://saintalfred.com',
        apiKey: '849af6fa065de14b021e119a4ad12bc0',
        supported: true,
      },
      {
        label: 'Senera Williams',
        value: 'https://www.serenawilliams.com',
        apiKey: '27a25c367f6d5ae709433e0cb07fff6c',
        supported: true,
      },
      {
        label: 'Shoe Gallery Miami',
        value: 'https://shoegallerymiami.com',
        apiKey: '4b29eb8c96c04b163ae2fac313043717',
        supported: true,
      },
      {
        label: 'Shop Nice Kicks',
        value: 'https://shopnicekicks.com',
        apiKey: '9d6556dc3ee20bf6b1a0971ad22f8238',
        supported: true,
      },
      {
        label: 'Sneaker Politics',
        value: 'https://sneakerpolitics.com',
        apiKey: 'e7f4837ec5196326af7949de4b8381fe',
        supported: true,
      },
      {
        label: 'Sneaker World Shop',
        value: 'https://sneakerworldshop.com',
        apiKey: '16237dc64c7903f7ba0eab11b553137a',
        supported: true,
      },
      {
        label: 'Social Status PGH',
        value: 'https://www.socialstatuspgh.com',
        apiKey: 'a62a7cdb1689c171a551ac61e92dc08a',
        supported: true,
      },
      {
        label: 'Solefly',
        value: 'https://solefly.com',
        apiKey: 'b51037e17cfc5e142a20ef01f0b44751',
        supported: true,
      },
      {
        label: 'Staple Pigeon',
        value: 'https://staplepigeon.com',
        apiKey: '2d91ae06229ae2f075a0db19de909e7c',
        supported: true,
      },
      {
        label: 'Stone Island (UK)',
        value: 'https://www.stoneisland.co.uk',
        apiKey: 'aa1ba753ddfb01280ad3bcdc72f34206',
        supported: true,
      },
      {
        label: 'Suede',
        value: 'https://suede-store.com',
        apiKey: '71f164fa1c603d9d3da229312d52cc1d',
        supported: true,
      },
      {
        label: 'Trophy Room',
        value: 'https://www.trophyroomstore.com',
        apiKey: '1b124ca786ab5fc9065699f1a383a139',
        supported: true,
      },
      {
        label: 'Undefeated',
        value: 'https://undefeated.com',
        apiKey: 'a0faf54ad7ec6fbbab86cd3f949c3cb9',
        localCheckout: true,
        supported: true,
      },
      {
        label: 'Unknown',
        value: 'https://unknwn.com',
        apiKey: '5ba2ba340438b8d9aaca1a5ddb1ad0f5',
        supported: true,
      },
      {
        label: 'Vlone',
        value: 'https://vlone.co',
        apiKey: '9230a93fa2cc3d0ade7bc1ebdc4c57ab',
        supported: true,
      },
      {
        label: 'Wish ATL',
        value: 'https://wishatl.com',
        apiKey: '7678df516143cdcb4c72168e8556b583',
        supported: true,
      },
      {
        label: 'World Of Hombre',
        value: 'https://worldofhombre.com',
        apiKey: '4fb4d606b320228541a5d97b0ce8b614',
        supported: true,
      },
      {
        label: 'Xhibition',
        value: 'https://www.xhibition.co',
        apiKey: '7f11f1a79cb6f8d07bca2f1d113177ef',
        supported: true,
      },
      {
        label: 'Yeezy Supply',
        value: 'https://yeezysupply.com',
        apiKey: 'afa13d942580749aa2985b086cc0bdcb',
        supported: true,
      },
      {
        label: 'Yeezy Supply (Asia)',
        value: 'https://asia.yeezysupply.com',
        apiKey: 'afa13d942580749aa2985b086cc0bdcb',
        supported: true,
      },
      {
        label: 'Yeezy Supply (Europe)',
        value: 'https://europe.yeezysupply.com',
        apiKey: 'afa13d942580749aa2985b086cc0bdcb',
        supported: true,
      },
      {
        label: 'Yeezy Supply 350',
        value: 'https://350.yeezysupply.com',
        apiKey: 'afa13d942580749aa2985b086cc0bdcb',
        supported: true,
      },
      {
        label: 'Yeezy Supply 700',
        value: 'https://700.yeezysupply.com',
        apiKey: 'afa13d942580749aa2985b086cc0bdcb',
        supported: true,
      },
      {
        label: 'Justin Timberlake',
        value: 'https://shop.justintimberlake.com',
        apiKey: '912ee12555b1728feefb55f85c6d7ba8',
        supported: true,
      },
      {
        label: 'The Closet Inc',
        value: 'https://theclosetinc.com',
        apiKey: '5e2769503be62e4bc6e746fb31678180',
        supported: true,
      },
      {
        label: 'Fear Of God',
        value: 'https://fearofgod.com',
        apiKey: '0cf616930515540d894572734816ed6a',
        supported: true,
      },
      {
        label: 'Stampd',
        value: 'https://stampd.com',
        apiKey: 'fa5d510170a2da81eaaea8c83437f2c5',
        supported: true,
      },
      {
        label: 'Travis Scott (AJ1)',
        value: 'https://aj1.travisscott.com',
        apiKey: '8eadffbda47bb8f4167fbf8a086590e0',
        supported: true,
      },
      {
        label: 'Travis Scott (Astros)',
        value: 'https://astros.travisscott.com',
        apiKey: '8eadffbda47bb8f4167fbf8a086590e0',
        supported: true,
      },
      {
        label: 'Travis Scott Shop',
        value: 'https://shop.travisscott.com',
        apiKey: '8eadffbda47bb8f4167fbf8a086590e0',
        supported: true,
      },
      {
        label: 'Just Don',
        value: 'https://justdon.com',
        apiKey: '2df51fc89cc41bbe749aed235d8e0df9',
        supported: true,
      },
      {
        label: 'Less One Seven',
        value: 'https://lessoneseven.com',
        apiKey: '29d7874ed8083fa025a2e863ef87f145',
        supported: true,
      },
      {
        label: 'The Dark Side Initiative',
        value: 'https://thedarksideinitiative.com',
        apiKey: '3332f96a11efce8997d46bc4962c9737',
        supported: true,
      },
      {
        label: 'Fice Gallery',
        value: 'https://ficegallery.com',
        apiKey: '1b5be89fa110de5f11243a85cce0e119',
        supported: true,
      },
      {
        label: 'Hanon Shop',
        value: 'https://hanon-shop.com',
        apiKey: 'f73913c594921bdd6a18a32bc2e2d7df',
        supported: true,
      },
      {
        label: 'Good As Gold',
        value: 'https://goodasgoldshop.com',
        apiKey: '07db20111ebed93006480b20356a4c7a',
        supported: true,
      },
      {
        label: 'Lace Up NYC',
        value: 'https://laceupnyc.com',
        apiKey: '299490a7a803c9be7370c4805e897bca',
        supported: true,
      },
      {
        label: 'Ellen Shop',
        value: 'https://www.ellenshop.com',
        apiKey: '7ab71d2c78d37b30c90d7cdd32aa92e4',
        supported: true,
      },
      {
        label: 'Toy Tokyo',
        value: 'https://launch.toytokyo.com',
        apiKey: '5def25a5a53c2da81aac5a6aee9733d1',
        supported: true,
      },
      {
        label: 'Nebula Bots',
        value: 'https://nebulabots.com',
        apiKey: '6526a5b5393b6316a64853cfe091841c',
        supported: true,
      },
      {
        label: 'Diamond Supply',
        value: 'https://diamondsupplyco.com',
        apiKey: 'c0912fe6e726508128a3a35ab0cde034',
        supported: true,
      },
    ],
  },
  {
    label: 'Supreme',
    supported: true,
    options: [
      {
        label: 'Supreme US',
        value: 'https://www.supremenewyork.com',
        supported: true,
      },
      {
        label: 'Supreme EU',
        value: 'https://www.supremenewyork.com',
        supported: true,
      },
      {
        label: 'Supreme JP',
        value: 'https://www.supremenewyork.com',
        supported: true,
      },
    ],
  },
  {
    label: 'Footsites',
    options: [
      {
        label: 'Foot Locker',
        value: 'https://footlocker.com',
        supported: false,
      },
      {
        label: 'Foot Action',
        value: 'https://footaction.com',
        supported: false,
      },
      {
        label: 'Champs',
        value: 'https://www.champssports.com',
        supported: false,
      },
    ],
  },
  {
    label: 'Mesh',
    supported: true,
    options: [
      {
        label: 'Size? (UK)',
        value: 'https://www.size.co.uk',
        supported: false,
      },
      {
        label: 'JD Sports (US)',
        value: 'https://www.jdsports.com',
        supported: false,
      },
      {
        label: 'JD Sports (UK)',
        value: 'https://www.jdsports.co.uk',
        supported: false,
      },
      {
        label: 'Foot Patrol',
        value: 'https://www.footpatrol.com',
        supported: false,
      },
      {
        label: 'The Hip Store (UK)',
        value: 'https://www.thehipstore.co.uk',
        supported: false,
      },
    ],
  },
];

module.exports = sites;
