'use client';

import { useState } from 'react';
import { User, BookOpen, Heart, ChevronRight } from 'lucide-react';

export default function JianghuaImagery() {
  const [activeTab, setActiveTab] = useState('people');
  const [selectedItem, setSelectedItem] = useState(null);

  // 人物数据
  const peopleData = [
    {
      id: 'p1',
      name: '盘王',
      role: '瑶族始祖',
      description: '传说中的瑶族始祖，被瑶族人民尊为文化象征，每年农历十月十六日举办盘王节纪念。',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      details: '盘王是瑶族文化的精神核心，代表着瑶族人民对祖先的尊敬和文化的传承。'
    },
    {
      id: 'p2',
      name: '传统工匠',
      role: '非遗传承人',
      description: '江华县的民间工匠，他们用灵巧的双手传承着瑶族的织布、刺绣、陶艺等传统技艺。',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      details: '他们是瑶族文化的守护者，通过代际相传，将古老的技艺融入当代生活。'
    },
    {
      id: 'p3',
      name: '瑶族妇女',
      role: '文化保护者',
      description: '瑶族妇女是民俗文化的主要传承者，在家庭和社区中传承瑶族的传统和习俗。',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      details: '她们用歌声、手艺和生活实践，诠释着瑶族文化的深刻内涵。'
    },
  ];

  // 故事数据
  const storiesData = [
    {
      id: 's1',
      title: '盘王的传说',
      category: '民间故事',
      excerpt: '相传盘王是瑶族的始祖，他英勇善战，为瑶族人民开创了新的家园...',
      image: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=400&h=300&fit=crop',
      content: '这是一个代代相传的故事，讲述了盘王如何带领瑶族人民克服困难，建立繁荣的文明。'
    },
    {
      id: 's2',
      title: '织布的故事',
      category: '工艺传承',
      excerpt: '江华瑶族的织布技艺已有千年历史，每一块布料都承载着文化的记忆...',
      image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=400&h=300&fit=crop',
      content: '从选材到织造，每一步都饱含着工匠对传统的执着和对美的追求。'
    },
    {
      id: 's3',
      title: '山寨节庆',
      category: '文化活动',
      excerpt: '每年的盘王节，整个江华县都沉浸在欢乐的节日氛围中...',
      image: 'https://images.unsplash.com/photo-1516575334481-f410b4769ef0?w=400&h=300&fit=crop',
      content: '长鼓舞、民歌、祭祀等传统活动，再现了瑶族文化的魅力。'
    },
  ];

  // 记忆数据
  const memoriesData = [
    {
      id: 'm1',
      title: '童年的油茶',
      author: '村民记述',
      year: 2020,
      excerpt: '小时候最美好的记忆，就是阿婆泡的那碗热油茶...',
      image: 'https://images.unsplash.com/photo-1597318689207-6e07f088db7d?w=400&h=300&fit=crop',
      memory: '那温暖的味道，伴随了我们整个童年，也见证了家族的繁衍和文化的传承。'
    },
    {
      id: 'm2',
      title: '母亲的手艺',
      author: '传承人讲述',
      year: 2021,
      excerpt: '母亲的刺绣针法，是我最想学的东西...',
      image: 'https://images.unsplash.com/photo-1565193566173-7cde20ba4313?w=400&h=300&fit=crop',
      memory: '每一针每一线，都是母亲对我们的爱，也是对传统的坚守。'
    },
    {
      id: 'm3',
      title: '山歌的回忆',
      author: '村民记述',
      year: 2022,
      excerpt: '那些在田间地头唱起的山歌，诉说着劳作的故事...',
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=300&fit=crop',
      memory: '山歌不仅是音乐，更是瑶族人民对生活、对爱情、对历史的诗意表达。'
    },
  ];

  const tabConfig = {
    people: {
      label: '人物',
      icon: User,
      data: peopleData,
      color: 'blue'
    },
    stories: {
      label: '故事',
      icon: BookOpen,
      data: storiesData,
      color: 'purple'
    },
    memories: {
      label: '记忆',
      icon: Heart,
      data: memoriesData,
      color: 'red'
    }
  };

  const currentTab = tabConfig[activeTab];
  const displayData = currentTab.data;

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            江华映象
          </h2>
          <p className="text-gray-600 text-lg">
            人物、故事、记忆中的江华瑶族文化
          </p>
        </div>

        {/* Tab 导航 */}
        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {Object.entries(tabConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSelectedItem(null);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition ${
                  activeTab === key
                    ? `bg-${config.color === 'blue' ? 'blue' : config.color === 'purple' ? 'purple' : 'red'}-500 text-white`
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-400'
                }`}
              >
                <Icon size={20} />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* 内容网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayData.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition cursor-pointer group"
            >
              {/* 图片 */}
              <div className="relative h-48 overflow-hidden bg-gray-300">
                <img
                  src={item.image}
                  alt={item.name || item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
                <div className={`absolute top-3 right-3 bg-${
                  activeTab === 'people' ? 'blue' : 
                  activeTab === 'stories' ? 'purple' : 'red'
                }-500 text-white text-xs px-3 py-1 rounded-full`}>
                  {item.role || item.category || '记忆'}
                </div>
              </div>

              {/* 内容 */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {item.name || item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {item.description || item.excerpt}
                </p>
                {item.author && (
                  <p className="text-xs text-gray-500 mb-3">— {item.author}</p>
                )}
                <button className={`text-sm font-medium flex items-center gap-1 text-${
                  activeTab === 'people' ? 'blue' : 
                  activeTab === 'stories' ? 'purple' : 'red'
                }-600 hover:text-${
                  activeTab === 'people' ? 'blue' : 
                  activeTab === 'stories' ? 'purple' : 'red'
                }-700`}>
                  了解更多 <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 详情模态框 */}
        {selectedItem && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 图片 */}
              <div className="relative h-64 bg-gray-300 overflow-hidden">
                <img
                  src={selectedItem.image}
                  alt={selectedItem.name || selectedItem.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 内容 */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {selectedItem.name || selectedItem.title}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selectedItem.role || selectedItem.category || selectedItem.author}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <p className="text-gray-700 leading-relaxed mb-4">
                  {selectedItem.details || selectedItem.content || selectedItem.memory}
                </p>

                {selectedItem.year && (
                  <div className="text-sm text-gray-600 border-t pt-4">
                    记录年份：{selectedItem.year}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
