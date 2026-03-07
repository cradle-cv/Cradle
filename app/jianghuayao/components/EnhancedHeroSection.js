'use client';

import Link from 'next/link';

export default function EnhancedHeroSection() {
  return (
    <section 
      className="relative h-96 md:h-[500px] overflow-hidden flex items-center bg-cover bg-center"
      style={{
        backgroundImage: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=600&fit=crop")',
      }}
    >
      {/* 深色覆盖层 */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* 内容 */}
      <div className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-white">
            {/* 主标题 */}
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              探索江华瑶族
              <br />
              非物质文化遗产
            </h2>

            {/* 描述文本 */}
            <p className="text-base md:text-lg text-white/90 mb-8 max-w-2xl leading-relaxed">
              江华瑶族自治县是全国瑶族人口最多的自治县，被誉为"神州瑶都"。这里拥有 2 项国家级非遗、6 项省级非遗、16 项市级非遗，是瑶族文化的富集地和活态传承典范。
            </p>

            {/* 按钮组 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/jianghuayao"
                className="inline-block bg-orange-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 transition shadow-lg hover:shadow-xl"
              >
                📚 探索非遗
              </Link>
              <Link
                href="/jianghuayao/imagery"
                className="inline-block bg-white text-orange-600 px-8 py-3 rounded-lg font-bold hover:bg-orange-50 transition shadow-lg hover:shadow-xl"
              >
                🎭 江华映象
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}