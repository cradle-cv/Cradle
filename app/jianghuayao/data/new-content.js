// 六大非遗分类
export const categoriesData = [
  {
    id: 'folk',
    name: '民俗',
    description: '瑶族传统民俗和节日庆典',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=400&fit=crop'
  },
  {
    id: 'music',
    name: '曲艺',
    description: '民歌、戏剧等传统表演艺术',
    image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=500&h=400&fit=crop'
  },
  {
    id: 'language',
    name: '语言',
    description: '瑶语言和文字的传承保护',
    image: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=500&h=400&fit=crop'
  },
  {
    id: 'food',
    name: '饮食',
    description: '瑶族特色美食和烹饪技艺',
    image: 'https://images.unsplash.com/photo-1495503049210-bbb5a6a480c2?w=500&h=400&fit=crop'
  },
  {
    id: 'medicine',
    name: '医药',
    description: '传统医药知识和草药应用',
    image: 'https://images.unsplash.com/photo-1576091160550-112173f7f869?w=500&h=400&fit=crop'
  },
  {
    id: 'craft',
    name: '手工',
    description: '传统手工艺和工艺技能',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&h=400&fit=crop'
  }
];

// 江华映象三种类型
export const imageryTypesData = [
  { id: 'people', name: '人物', color: 'blue' },
  { id: 'story', name: '故事', color: 'purple' },
  { id: 'technique', name: '技艺', color: 'orange' }
];

// 示例文章数据
export const articleSamples = {
  folk: [
    {
      title: '瑶族春节庆典',
      excerpt: '江华瑶族春节有其独特的庆祝方式...',
      content: '春节期间，瑶族群众会进行传统的祭祀活动、舞狮舞龙、放鞭炮等庆祝活动...',
      image: 'https://images.unsplash.com/photo-1516575334481-f410b4769ef0?w=500&h=400&fit=crop',
      year: '2024'
    }
  ],
  music: [
    {
      title: '瑶族民歌',
      excerpt: '瑶族传统民歌，内容丰富...',
      content: '瑶族民歌旋律优美，歌词蕴含丰富的文化内涵...',
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=500&h=400&fit=crop',
      year: '2024'
    }
  ]
};

// 示例映象数据
export const imagerySamples = {
  people: [
    {
      title: '盘王',
      subtitle: '瑶族始祖',
      excerpt: '传说中的瑶族始祖',
      content: '盘王是瑶族文化的精神核心，代表着瑶族人民对祖先的尊敬和文化的传承。',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      year: '2024'
    }
  ],
  story: [
    {
      title: '织布的故事',
      subtitle: '工艺传承',
      excerpt: '江华瑶族的织布技艺已有千年历史...',
      content: '从选材到织造，每一步都饱含着工匠对传统的执着和对美的追求。',
      image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&h=400&fit=crop',
      year: '2024'
    }
  ],
  technique: [
    {
      title: '瑶族织布技艺',
      subtitle: '民间手工艺',
      excerpt: '传统纺织技艺的介绍...',
      content: '这项技艺已有千年历史，瑶族妇女通过纺织创造出色彩丰富、图案精美的布料...',
      image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&h=400&fit=crop',
      year: '2024'
    }
  ]
};
