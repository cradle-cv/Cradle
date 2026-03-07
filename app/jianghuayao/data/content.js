// 五大非遗分类
export const categoriesData = [
  {
    id: 'folk-customs',
    name: '民俗文化',
    description: '瑶族传统民俗和节日庆典',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=400&fit=crop'
  },
  {
    id: 'crafts',
    name: '民间手工艺',
    description: '织布、刺绣等传统工艺技能',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&h=400&fit=crop'
  },
  {
    id: 'performing-arts',
    name: '表演艺术',
    description: '歌舞、戏剧等传统表演形式',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=500&h=400&fit=crop'
  },
  {
    id: 'food-culture',
    name: '饮食文化',
    description: '瑶族特色美食和烹饪技艺',
    image: 'https://images.unsplash.com/photo-1495503049210-bbb5a6a480c2?w=500&h=400&fit=crop'
  },
  {
    id: 'language',
    name: '瑶语文化',
    description: '瑶语言和文字的传承保护',
    image: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=400&fit=crop'
  }
];

// 非遗内容详细数据
export const heritageData = [
  // 民俗文化
  {
    id: 'folk-1',
    title: '瑶族春节庆典',
    category: 'folk-customs',
    categoryName: '民俗文化',
    description: '江华瑶族春节有其独特的庆祝方式，包括盘王节、祭祀祖先等传统仪式，延续数千年的文化传统。',
    details: '春节期间，瑶族群众会进行传统的祭祀活动、舞狮舞龙、放鞭炮等庆祝活动，体现了对祖先的尊敬和对美好生活的祈愿。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1516575334481-f410b4769ef0?w=500&h=400&fit=crop'
  },
  {
    id: 'folk-2',
    title: '盘王节庆祝',
    category: 'folk-customs',
    categoryName: '民俗文化',
    description: '瑶族最重要的传统节日，纪念瑶族始祖盘王，通常在农历十月十六日举行。',
    details: '盘王节是瑶族人民欢庆团圆、感谢祖先庇护的盛大节日，期间会进行传统舞蹈、音乐表演和社区聚集。',
    year: '2020',
    area: '江华县各地',
    image: 'https://images.unsplash.com/photo-1519174584622-f7f0c4872368?w=500&h=400&fit=crop'
  },
  {
    id: 'folk-3',
    title: '传统祭祀仪式',
    category: 'folk-customs',
    categoryName: '民俗文化',
    description: '瑶族祖先祭祀的传统仪式，体现了深厚的家族文化和宗教信仰。',
    details: '包括祭祀盘王、祭祀各家族祖先的仪式，使用传统的祭祀用品和程序，是瑶族文化的核心内容。',
    year: '2022',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=400&fit=crop'
  },
  {
    id: 'folk-4',
    title: '瑶族婚俗',
    category: 'folk-customs',
    categoryName: '民俗文化',
    description: '瑶族独特的婚礼习俗，包括订婚、迎亲、合卺等传统程序。',
    details: '瑶族婚俗保留了多种古老的传统程序，体现了瑶族文化对婚姻和家庭的重视。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&h=400&fit=crop'
  },

  // 民间手工艺
  {
    id: 'craft-1',
    title: '瑶族传统织布',
    category: 'crafts',
    categoryName: '民间手工艺',
    description: '江华瑶族妇女的传统纺织技艺，使用手工纺车和织布机制作传统服饰面料。',
    details: '这项技艺已有千年历史，瑶族妇女通过纺织创造出色彩丰富、图案精美的布料，用于制作传统服装。',
    year: '2019',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&h=400&fit=crop'
  },
  {
    id: 'craft-2',
    title: '瑶族刺绣艺术',
    category: 'crafts',
    categoryName: '民间手工艺',
    description: '瑶族传统刺绣工艺，以精细的针法和丰富的色彩闻名，是服饰和家纺的重要装饰手法。',
    details: '瑶族刺绣图案通常反映瑶族文化主题，采用多种针法和配色技巧，每一件作品都是精美的艺术品。',
    year: '2020',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1565193566173-7cde20ba4313?w=500&h=400&fit=crop'
  },
  {
    id: 'craft-3',
    title: '竹编工艺',
    category: 'crafts',
    categoryName: '民间手工艺',
    description: '利用当地竹资源制作各种生活用品和装饰品的传统手工艺。',
    details: '竹编工艺包括篮子、筐、帽子等生活用品的制作，体现了瑶族人民的智慧和对自然资源的利用。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1572923659802-841e7b938ebc?w=500&h=400&fit=crop'
  },
  {
    id: 'craft-4',
    title: '陶艺制作',
    category: 'crafts',
    categoryName: '民间手工艺',
    description: '传统陶艺制作工艺，使用本地陶土手工制作各种陶器。',
    details: '包括陶器烧制、釉料制作等技艺，制作出的陶器既实用又具有艺术价值。',
    year: '2022',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&h=400&fit=crop'
  },

  // 表演艺术
  {
    id: 'perform-1',
    title: '瑶族长鼓舞',
    category: 'performing-arts',
    categoryName: '表演艺术',
    description: '瑶族最具代表性的舞蹈，舞者拿着长鼓，随着鼓声有节奏地舞动，充满活力。',
    details: '长鼓舞通常在节庆活动中表演，舞蹈动作激烈而优美，是瑶族文化的象征。',
    year: '2018',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1516575334481-f410b4769ef0?w=500&h=400&fit=crop'
  },
  {
    id: 'perform-2',
    title: '瑶族民歌',
    category: 'performing-arts',
    categoryName: '表演艺术',
    description: '瑶族传统民歌，内容丰富，包括情歌、劳动歌、历史歌等多种类型。',
    details: '瑶族民歌旋律优美，歌词蕴含丰富的文化内涵，是瑶族文化的重要组成部分。',
    year: '2019',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=500&h=400&fit=crop'
  },
  {
    id: 'perform-3',
    title: '瑶族舞蹈',
    category: 'performing-arts',
    categoryName: '表演艺术',
    description: '瑶族的多种传统舞蹈形式，每种舞蹈都有独特的动作和文化意义。',
    details: '包括铜鼓舞、竹竿舞等多种形式，每种舞蹈都展现了瑶族人民的热情和文化特色。',
    year: '2020',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=400&fit=crop'
  },
  {
    id: 'perform-4',
    title: '瑶族民间戏剧',
    category: 'performing-arts',
    categoryName: '表演艺术',
    description: '瑶族特有的戏剧表演形式，融合了音乐、舞蹈和故事叙述。',
    details: '这些戏剧通常讲述历史故事或民间传说，是传承瑶族文化的重要形式。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=500&h=400&fit=crop'
  },

  // 饮食文化
  {
    id: 'food-1',
    title: '瑶族油茶',
    category: 'food-culture',
    categoryName: '饮食文化',
    description: '瑶族传统饮品，用茶叶、花生、芝麻等材料制作，营养丰富。',
    details: '油茶是瑶族日常生活中的重要饮品，也是招待客人的传统饮品，有多种制作方法。',
    year: '2020',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1597318689207-6e07f088db7d?w=500&h=400&fit=crop'
  },
  {
    id: 'food-2',
    title: '瑶族粽子',
    category: 'food-culture',
    categoryName: '饮食文化',
    description: '瑶族特色的粽子，包裹方式独特，馅料丰富多样。',
    details: '瑶族粽子有咸粽和甜粽两种，制作工艺复杂，是传统节日的重要食品。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1585182050561-5c1b464b6ad9?w=500&h=400&fit=crop'
  },
  {
    id: 'food-3',
    title: '瑶族腊肉',
    category: 'food-culture',
    categoryName: '饮食文化',
    description: '瑶族传统的腊肉制作工艺，选用上等猪肉，经过传统烟熏腌制。',
    details: '瑶族腊肉香味独特，营养丰富，是瑶族家庭的传统食品，也是馈赠客人的佳礼。',
    year: '2022',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1504674900436-6b769e66d09f?w=500&h=400&fit=crop'
  },
  {
    id: 'food-4',
    title: '瑶族山野菜',
    category: 'food-culture',
    categoryName: '饮食文化',
    description: '江华特产的各种山野菜的制作和烹饪方法，体现了瑶族与大自然的和谐。',
    details: '包括各种野生蕨类、野笋、野果等的采集、储存和烹饪方法。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=400&fit=crop'
  },

  // 瑶语文化
  {
    id: 'lang-1',
    title: '瑶语言传承',
    category: 'language',
    categoryName: '瑶语文化',
    description: '瑶族语言的保护和传承，包括日常用语、民谣等。',
    details: '瑶语是瑶族文化的重要载体，包含了丰富的文化信息和历史记忆。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=400&fit=crop'
  },
  {
    id: 'lang-2',
    title: '瑶族谚语与成语',
    category: 'language',
    categoryName: '瑶语文化',
    description: '瑶族人民在长期实践中创造的谚语和成语，蕴含生活智慧。',
    details: '这些谚语和成语反映了瑶族人民的价值观和人生哲学。',
    year: '2020',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=400&fit=crop'
  },
  {
    id: 'lang-3',
    title: '瑶族史诗叙述',
    category: 'language',
    categoryName: '瑶语文化',
    description: '瑶族口头传承的历史故事和创世史诗。',
    details: '这些故事和史诗是瑶族历史和文化的活生生记录。',
    year: '2022',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=400&fit=crop'
  },
  {
    id: 'lang-4',
    title: '瑶族教育传统',
    category: 'language',
    categoryName: '瑶语文化',
    description: '瑶族传统的语言教育方法和文化传承方式。',
    details: '通过家庭教育、社区实践等方式传承瑶族语言和文化。',
    year: '2021',
    area: '江华县',
    image: 'https://images.unsplash.com/photo-1427504494785-cdaf466e6c54?w=500&h=400&fit=crop'
  }
];