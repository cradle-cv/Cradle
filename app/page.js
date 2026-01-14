export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-[#8B7355] z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-serif font-bold text-[#3A3A3A] tracking-tight">
            CRADLE
          </div>
          <ul className="hidden md:flex gap-8 text-sm font-medium">
            <li><a href="#" className="text-[#5C4A3A] hover:text-[#D4745E] transition-colors">每日一展</a></li>
            <li><a href="#" className="text-[#5C4A3A] hover:text-[#D4745E] transition-colors">文学</a></li>
            <li><a href="#" className="text-[#5C4A3A] hover:text-[#D4745E] transition-colors">摄影</a></li>
            <li><a href="#" className="text-[#5C4A3A] hover:text-[#D4745E] transition-colors">绘画</a></li>
            <li><a href="#" className="text-[#5C4A3A] hover:text-[#D4745E] transition-colors">艺术家</a></li>
          </ul>
          <button className="px-6 py-2 bg-[#3A3A3A] text-white text-sm font-medium hover:bg-[#5C4A3A] transition-colors">
            会员登录
          </button>
        </div>
      </nav>

      {/* 今日展览标题区 - 强调日期 */}
      <main className="pt-20 px-8 max-w-7xl mx-auto">
        <section className="py-12 border-b-2 border-[#3A3A3A] mb-12">
          <div className="flex items-baseline gap-6 mb-4">
            <div className="text-7xl font-bold text-[#D4745E] font-mono">
              01/08
            </div>
            <div>
              <div className="text-sm font-medium text-[#7A6F5D] uppercase tracking-wider mb-1">
                TODAY ONLY
              </div>
              <div className="text-3xl font-bold text-[#3A3A3A]">
                今日限定展览
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 bg-[#3A3A3A] text-white font-medium">
              策展主题：偶然的相遇
            </span>
            <span className="text-[#7A6F5D]">
              • 每24小时更换一次，错过不再
            </span>
          </div>
        </section>

        {/* 今日作品 - 片段展示 */}
        <article className="grid md:grid-cols-2 gap-8 mb-20">
          {/* 作品图片 */}
          <div className="relative group cursor-pointer">
            <div className="aspect-[4/3] bg-gradient-to-br from-[#E8B54D] to-[#D4745E] border-2 border-[#3A3A3A] overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="text-xl font-medium">点击查看完整作品</p>
                </div>
              </div>
            </div>
            {/* 查看完整作品提示 */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#3A3A3A]/90 text-white p-4 transform translate-y-full group-hover:translate-y-0 transition-transform">
              <p className="text-sm font-medium">👆 点击进入完整展览</p>
            </div>
          </div>

          {/* 作品信息 */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex gap-3 mb-4 text-xs uppercase tracking-wider">
                <span className="text-[#D4745E] font-bold">水彩画</span>
                <span className="text-[#7A6F5D]">•</span>
                <span className="text-[#7A6F5D]">2024创作</span>
              </div>
              
              <h2 className="text-4xl font-bold text-[#3A3A3A] mb-6 leading-tight">
                晨光下的小镇
              </h2>

              <div className="space-y-4 mb-8">
                <p className="text-lg text-[#3A3A3A] leading-relaxed">
                  清晨的第一缕阳光洒在小镇的屋檐上，炊烟袅袅升起。
                  这幅作品捕捉了最平凡却最珍贵的瞬间...
                </p>
                <p className="text-[#7A6F5D] italic">
                  "我想画出记忆里家的味道——那种安稳、温暖、永远等待着你的感觉。"
                </p>
              </div>

              <div className="border-t border-[#D4D4D4] pt-4 mb-6">
                <p className="text-xs text-[#7A6F5D] uppercase tracking-wider mb-2">
                  策展人说
                </p>
                <p className="text-sm text-[#3A3A3A] font-medium">
                  在快速变化的时代，这件作品提醒我们慢下来，感受日常中被忽略的美好。
                </p>
              </div>
            </div>

            <button className="w-full py-4 bg-[#3A3A3A] text-white font-medium hover:bg-[#D4745E] transition-colors">
              查看完整作品与创作故事 →
            </button>
          </div>
        </article>

        {/* 艺术家专区 */}
        <section className="mb-20 py-12 border-t-2 border-[#3A3A3A]">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-[#3A3A3A] mb-2">
              今日艺术家
            </h3>
            <p className="text-[#7A6F5D]">每天认识一位原创艺术家</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 艺术家肖像 */}
            <div className="md:col-span-1">
              <div className="aspect-square bg-[#E8B54D]/20 border-2 border-[#3A3A3A] mb-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">👤</div>
                  <p className="text-sm text-[#7A6F5D]">艺术家肖像</p>
                </div>
              </div>
              <div className="text-center">
                <h4 className="text-2xl font-bold text-[#3A3A3A] mb-1">
                  李小雨
                </h4>
                <p className="text-sm text-[#7A6F5D] mb-3">水彩画家 · 90后</p>
                <div className="flex justify-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-[#FFFBF5] border border-[#D4D4D4]">
                    10件作品
                  </span>
                  <span className="px-2 py-1 bg-[#FFFBF5] border border-[#D4D4D4]">
                    520关注
                  </span>
                </div>
              </div>
            </div>

            {/* 艺术家介绍 */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h5 className="text-sm font-bold text-[#3A3A3A] uppercase tracking-wider mb-2">
                  关于艺术家
                </h5>
                <p className="text-[#3A3A3A] leading-relaxed">
                  李小雨，90后水彩画家，毕业于中央美术学院。她的作品专注于捕捉日常生活中被忽略的温暖瞬间，
                  用柔和的色彩和细腻的笔触，记录下那些平凡却珍贵的时刻。
                </p>
              </div>

              <div>
                <h5 className="text-sm font-bold text-[#3A3A3A] uppercase tracking-wider mb-2">
                  创作理念
                </h5>
                <p className="text-[#3A3A3A] leading-relaxed">
                  "艺术不应该只存在于美术馆，它应该回到生活本身。我想通过画笔，
                  让每个人都能重新发现自己生活中的美好。"
                </p>
              </div>

              <div className="pt-4">
                <button className="px-8 py-3 border-2 border-[#3A3A3A] text-[#3A3A3A] font-medium hover:bg-[#3A3A3A] hover:text-white transition-all">
                  查看艺术家主页 →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 为什么这样做 - 移到最后 */}
        <section className="mb-20 py-16 bg-[#FFFBF5] -mx-8 px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-[#3A3A3A] mb-4">
                为什么叫 CRADLE？
              </h3>
              <p className="text-lg text-[#7A6F5D]">
                关于反算法与艺术生长空间的思考
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white p-6 border border-[#D4D4D4]">
                <div className="text-3xl mb-3">🚫</div>
                <h4 className="text-xl font-bold text-[#3A3A3A] mb-3">
                  我们拒绝算法推荐
                </h4>
                <p className="text-[#5C4A3A] leading-relaxed">
                  推荐算法会让你困在舒适区。我们相信，真正的艺术发现应该充满意外和惊喜。
                  每天随机展示作品，让每个人都能走出自己的审美茧房。
                </p>
              </div>

              <div className="bg-white p-6 border border-[#D4D4D4]">
                <div className="text-3xl mb-3">🌱</div>
                <h4 className="text-xl font-bold text-[#3A3A3A] mb-3">
                  新人艺术家的摇篮
                </h4>
                <p className="text-[#5C4A3A] leading-relaxed">
                  每个艺术家都需要一个温暖的起点。在这里，没有流量焦虑，没有算法竞争，
                  只有纯粹的创作和真诚的欣赏。
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-[#7A6F5D] mb-4">
                已有 <span className="font-bold text-[#D4745E]">127</span> 位艺术家在这里成长
              </p>
              <button className="px-8 py-3 bg-[#D4745E] text-white font-medium hover:bg-[#C46654] transition-colors">
                申请成为入驻艺术家
              </button>
            </div>
          </div>
        </section>

        {/* 往期精选 */}
        <section className="mb-20">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-3xl font-bold text-[#3A3A3A] mb-2">
                往期展览
              </h3>
              <p className="text-[#7A6F5D]">回顾过去的精彩相遇</p>
            </div>
            <button className="text-sm text-[#3A3A3A] hover:text-[#D4745E] font-medium">
              查看全部 →
            </button>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-square bg-gradient-to-br from-[#9CAF88] to-[#8B7355] border border-[#D4D4D4] mb-3 group-hover:border-[#3A3A3A] transition-colors"></div>
                <p className="text-sm text-[#7A6F5D] mb-1">01/0{i}</p>
                <p className="text-sm font-medium text-[#3A3A3A] group-hover:text-[#D4745E] transition-colors">
                  作品标题 #{i}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 底部信息栏 */}
      <footer className="bg-[#3A3A3A] text-white py-8 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm">
            <p className="mb-1">© 2026 Cradle. 每天，一次意外的相遇。</p>
            <p className="text-[#A0A0A0]">反算法 · 反推荐 · 支持原创</p>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-[#D4745E] transition-colors">关于我们</a>
            <a href="#" className="hover:text-[#D4745E] transition-colors">入驻申请</a>
            <a href="#" className="hover:text-[#D4745E] transition-colors">联系方式</a>
          </div>
        </div>
      </footer>
    </div>
  );
}