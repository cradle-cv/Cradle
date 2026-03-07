'use client';

export default function CategoriesSection({ categories, onSelectCategory, selectedCategory }) {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">五大非遗分类</h2>
          <p className="text-gray-600">江华瑶族文化的五个主要传承领域</p>
        </div>

        {/* 分类卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`cursor-pointer rounded-lg overflow-hidden transition transform hover:scale-105 ${
                selectedCategory === category.id
                  ? 'ring-2 ring-orange-500'
                  : 'hover:shadow-lg'
              }`}
            >
              {/* 图片 */}
              <div className="relative h-48 bg-gray-300 overflow-hidden">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover hover:scale-110 transition duration-300"
                />
              </div>

              {/* 内容 */}
              <div className="p-4 bg-white">
                <h3 className="text-lg font-bold text-gray-800 mb-2">{category.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}