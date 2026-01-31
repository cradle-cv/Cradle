export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF8F0]" style={{ fontFamily: '"Source Han Serif SC", "Noto Serif SC", "思源宋体", Arial, sans-serif' }}>
      {/* 顶部导航栏 */}
      <nav className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
              <span className="text-xl font-bold text-gray-900">艺术空间</span>
            </div>
            <ul className="hidden md:flex gap-8 text-sm text-gray-700">
              <li><a href="#daily" className="hover:text-gray-900">每日一展</a></li>
              <li><a href="#gallery" className="hover:text-gray-900">艺术阅览室</a></li>
              <li><a href="#collection" className="hover:text-gray-900">作品集</a></li>
              <li><a href="#artists" className="hover:text-gray-900">艺术家</a></li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-gray-900">🔍</button>
            <button className="text-gray-600 hover:text-gray-900">👤</button>
          </div>
        </div>
      </nav>

      {/* Hero区 - 左文右图 */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-16">
            {/* 左侧文字 */}
            <div className="flex-1">
              <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                探索艺术的<br/>
                无限可能 🎨<br/>
                与创作之美
              </h1>
              <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-xl">
                汇聚全球原创艺术家的创作灵感,在这里阅读艺术鉴赏文章,欣赏诗文、绘画、摄影等多元作品.与艺术家们共同探索创作的无限魅力
              </p>
              <div className="flex gap-4">
                <button className="px-8 py-4 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800">
                  探索作品
                </button>
                <button className="px-8 py-4 border-2 border-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50">
                  了解更多
                </button>
              </div>
            </div>

            {/* 右侧图片卡片 */}
            <div className="relative w-1/3 flex-shrink-0">
              <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl relative">
                <img 
                  src="/image/hero.jpg" 
                  alt="静谧时光"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-8 left-8 z-10">
                  <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">静谧时光</h3>
                  <p className="text-white drop-shadow-lg">张艺谋</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 每日一展大块 */}
      <section id="daily" className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">每日一展</h2>
          <p className="text-gray-600 mb-10">发现今日精选展览，感受艺术的魅力</p>
          
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
            <div className="grid md:grid-cols-2 gap-0">
              {/* 左侧大图 */}
              <div className="relative">
                <div className="absolute top-6 left-6 px-4 py-2 bg-[#F59E0B] text-white text-sm font-medium rounded-full z-10">
                  今日推荐
                </div>
                <div className="aspect-[4/3]">
                  <img 
                    src="/image/mryz.jpg" 
                    alt="展览"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* 右侧详情 */}
              <div className="p-10 flex flex-col justify-between">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">
                    光影诗篇：当代摄影艺术展
                  </h3>
                  
                  <div className="flex items-center gap-3 text-gray-600 mb-6">
                    <span>策展平</span>
                    <span>·</span>
                    <span>艺术空间一号展厅</span>
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-8">
                    本次展览汇集了艺术家群体近三年的摄影作品,通过独特的光影语言,探索城市与自然、传统与现代的对话。展览共展出50余幅作品,涵盖风光、人文、建筑等多个主题。
                  </p>

                  {/* 展览信息 */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <span className="text-[#F59E0B]">📅</span>
                      <div>
                        <div className="text-sm text-gray-500">展期</div>
                        <div className="font-medium text-gray-900">2024年1月15日 - 2月28日</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <span className="text-[#F59E0B]">🕐</span>
                      <div>
                        <div className="text-sm text-gray-500">开放时间</div>
                        <div className="font-medium text-gray-900">10:00 - 18:00（周一闭馆）</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="text-[#F59E0B]">🎫</span>
                      <div>
                        <div className="text-sm text-gray-500">门票</div>
                        <div className="font-medium text-gray-900">免费参观</div>
                      </div>
                    </div>
                  </div>

                  {/* 展览亮点 */}
                  <div className="mb-8">
                    <div className="text-sm text-gray-500 mb-3">展览亮点</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#F59E0B] rounded-full"></div>
                        <span className="text-sm text-gray-700">50余幅精选摄影作品</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#F59E0B] rounded-full"></div>
                        <span className="text-sm text-gray-700">艺术家现场导览</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#F59E0B] rounded-full"></div>
                        <span className="text-sm text-gray-700">互动体验区</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#F59E0B] rounded-full"></div>
                        <span className="text-sm text-gray-700">限量版画发售</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 底部按钮 */}
                <div className="flex gap-4">
                  <button className="flex-1 py-4 bg-[#F59E0B] text-white font-medium rounded-lg hover:bg-[#D97706]">
                    预约参观
                  </button>
                  <button className="px-6 py-4 text-gray-700 font-medium hover:text-gray-900">
                    了解更多 →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 艺术阅览室 */}
      <section id="gallery" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">艺术阅览室</h2>
              <p className="text-gray-600">浏览最新艺术活动,探索创作背后的故事</p>
            </div>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">查看全部 →</a>
          </div>

          {/* 3x2 网格 - 删除了二级筛选栏 */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                img: 'yls1.jpg', 
                title: '印象派的风景:感受去莫奈的花园时光', 
                intro: '深入探讨印象派大师莫奈的创作技法,了解他如何通过色彩和光影运用,将花园的自然意象永恒定格在画布上,并创了艺术史上的新纪元。',
                tag: null, 
                artist: '陈文文', 
                date: '2024年1月19日', 
                views: '80万', 
                likes: 24,
                readTime: '8分钟'
              },
              { 
                img: 'yls2.png', 
                title: '当代摄影中的极简主义美学探索', 
                intro: '极简主义摄影通过简化构图元素,强调与空白,创造出令人沉思的视觉体验。本文将带你了解如何在摄影创作中运用极简美学。',
                tag: null, 
                artist: '李摄平', 
                date: '2024年1月21日', 
                views: '86万', 
                likes: 18,
                readTime: '6分钟'
              },
              { 
                img: 'yls3.png', 
                title: '诗与画的对话:中国传统文人画的意境之美', 
                intro: '文人画融诗、书、画、印于一体,追求精神层面的表达。探索古代文人如何通过画作传达深远的传统文化内涵与哲学思考。',
                tag: null, 
                artist: '王雅芊', 
                date: '2024年1月10日', 
                views: '102万', 
                likes: 32,
                readTime: '10分钟'
              },
              { 
                img: 'yls4.png', 
                title: '色彩心理学:艺术作品中的情感表达', 
                intro: '色彩不仅是视觉元素,更是情感的载体。了解艺术家如何运用色彩心理学原理,在作品中传达复杂的情感与氛围。',
                tag: '艺术推送', 
                artist: '张画画', 
                date: '2024年1月9日', 
                views: '72万', 
                likes: 21,
                readTime: '7分钟'
              },
              { 
                img: 'yls5.png', 
                title: '雕塑艺术的空间叙事与古典到现代', 
                intro: '从古典雕塑到当代装置,探索三维艺术如何在空间中讲述故事,以及雕塑家如何通过形态与材质创造独特的叙事体验。',
                tag: '推荐艺术', 
                artist: '小雕塑', 
                date: '2024年1月5日', 
                views: '93万', 
                likes: 15,
                readTime: '9分钟'
              },
              { 
                img: 'yls6.png', 
                title: '街头艺术的崛起:从边缘到主流的文化转变', 
                intro: '曾被视为叛逆的涂鸦艺术,如今已成为当代艺术的重要组成。本文探讨街头艺术如何从地下文化走向艺术殿堂。',
                tag: '精选艺术', 
                artist: '赵喷绘', 
                date: '2024年1月3日', 
                views: '66万', 
                likes: 28,
                readTime: '8分钟'
              }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="relative overflow-hidden">
                  {item.tag && (
                    <div className="absolute top-3 left-3 px-3 py-1 bg-gray-700 text-white text-xs font-medium rounded z-10">
                      {item.tag}
                    </div>
                  )}
                  <div className="aspect-[4/3]">
                    <img 
                      src={`/image/${item.img}`}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#F59E0B] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                    {item.intro}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-300"></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.artist}</div>
                        <div className="text-xs text-gray-500">{item.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{item.readTime}</span>
                      <span className="flex items-center gap-1">❤️ {item.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 原创作品集 */}
      <section id="collection" className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-[#0D9488] mb-3">原创作品集</h2>
            <p className="text-gray-600">汇聚艺术家的创作灵感与才华</p>
          </div>

          {/* 分类按钮 */}
          <div className="flex justify-center gap-3 mb-10">
            <button className="px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-medium">全部</button>
            <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">摄文</button>
            <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">绘画</button>
            <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">摄影</button>
            <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200">雕塑</button>
          </div>

          {/* 4x2 网格 - 优化hover效果 */}
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { img: 'zpjhh1.jpeg', title: '晨光寻曲', artist: '张安君', likes: 342, comments: 23 },
              { img: 'zpjsy1.jpeg', title: '城市呼吸', artist: '李明辉', likes: 289, comments: 19 },
              { img: 'zpjsw2.jpeg', title: '山水之间', artist: '王画笔', likes: 455, comments: 31 },
              { img: 'zpjsy2.jpeg', title: '时光偷片', artist: '陈惠白', likes: 198, comments: 15 },
              { img: 'zpjsw1.jpeg', title: '静水流年', artist: '林书意', likes: 267, comments: 18 },
              { img: 'zpjsw3.jpeg', title: '抽象对话', artist: '王雨童', likes: 523, comments: 42 },
              { img: 'zpjsy3.jpeg', title: '自然之息', artist: '许摄影', likes: 412, comments: 28 },
              { img: 'zpjds1.jpeg', title: '形态推拟', artist: '小雕塑', likes: 356, comments: 21 }
            ].map((item, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-square rounded-lg overflow-hidden mb-3 relative">
                  <img 
                    src={`/image/${item.img}`}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Hover信息层 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                    <p className="text-white/90 text-sm mb-3">{item.artist}</p>
                    <div className="flex items-center gap-4 text-white text-sm">
                      <span className="flex items-center gap-1">
                        ❤️ {item.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        💬 {item.comments}
                      </span>
                    </div>
                  </div>
                </div>
                <h4 className="font-medium text-gray-900 mb-1 group-hover:text-[#0D9488] transition-colors">{item.title}</h4>
                <p className="text-sm text-gray-500">{item.artist}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 艺术家 */}
      <section id="artists" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3">艺术家</h2>
              <p className="text-gray-600">认识艺术社群活跃的创作者们</p>
            </div>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">查看所有艺术家 →</a>
          </div>

          {/* 3x2 艺术家卡片 */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { img: 'tx1.jpg', name: '张艺平', role: '油画家', intro: '专注于油画创作年,擅长捕捉光影与色彩的对比,艺术生态国内外展出并获奖。致力于探索当代艺术语言与传统经典的融合。' },
              { img: 'tx2.jpg', name: '李摄影', role: '摄影师', intro: '独立摄影师,专注于城市景观与人文纪实摄影。作品以极简构图和独特视角见长,探索空间感与艺术感的碰撞。' },
              { img: 'tx3.jpg', name: '王雅芊', role: '国画家', intro: '当代国画家,师承传统又勇于创新。作品融合东方美学思想与当代审美在传统宋明墨符号基础上的尝试,探索水墨艺术的当代表达。' },
              { img: 'tx4.jpg', name: '陈思远', role: '摄影师', intro: '肖片摄影爱好者,热衷于捕捉日常生活中的诗意瞬间。作品以自然光影和温暖色调为特色,用镜头关注生活美好,用画面表达对美的理解。' },
              { img: 'tx5.jpg', name: '林诗韵', role: '诗人书法家', intro: '诗人兼书法家,作品将文学之美与视觉艺术完美融合。诗作多次获奖于文学杂志刊登,致力于将传统书法与当代文化相结合,致力于传承与创新传统文化。' },
              { img: 'tx6.jpg', name: '赵晨曦', role: '抽象画家', intro: '当代抽象艺术家,作品以大胆的色彩和自由的表现形式著称,探索情感与形式的关系。作品多次在国内外重要展览中展出,获奖无数。' }
            ].map((artist, i) => (
              <div key={i} className="bg-white rounded-lg p-8 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden">
                  <img 
                    src={`/image/${artist.img}`}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{artist.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{artist.role}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-6 line-clamp-4">
                  {artist.intro}
                </p>
                <button className="px-8 py-2 border border-gray-300 text-gray-700 text-sm rounded-full hover:bg-gray-50">
                  查看作品
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 近期展览 */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900">近期展览</h2>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">查看全部展览 →</a>
          </div>

          {/* 3个横向展览卡片 */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: 'zlhb1.jpg', title: '光影诗篇:张艺谋个人画展', artist: '张艺谋', date: '2024年2月15日 - 3月15日', location: '北京当代艺术馆' },
              { img: 'zlhb2.jpg', title: '城市印象:李明轩摄影作品展', artist: '李明轩', date: '2024年2月20日 - 3月20日', location: '上海摄影艺术中心' },
              { img: 'zlhb3.jpg', title: '墨韵新境:当代水墨联展', artist: '王雅芊等', date: '2024年3月1日 - 4月1日', location: '广州艺术博览馆' }
            ].map((exhibit, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex gap-4 p-5">
                  <div className="w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden">
                    <img 
                      src={`/image/${exhibit.img}`}
                      alt={exhibit.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{exhibit.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{exhibit.artist}</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>📅 {exhibit.date}</p>
                      <p>📍 {exhibit.location}</p>
                    </div>
                    <button className="text-sm text-[#F59E0B] hover:underline mt-3">
                      了解详情 →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-[#1F2937] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* 品牌信息 */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500"></div>
                <div className="text-xl font-bold">艺术空间</div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                汇聚全球原创艺术家的创作台探索艺术的无限可能
              </p>
            </div>

            {/* 关于我们 */}
            <div>
              <h5 className="font-bold mb-4">关于我们</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">平台介绍</a></li>
                <li><a href="#" className="hover:text-white">团队成员</a></li>
                <li><a href="#" className="hover:text-white">联系我们</a></li>
                <li><a href="#" className="hover:text-white">加入我们</a></li>
              </ul>
            </div>

            {/* 艺术家服务 */}
            <div>
              <h5 className="font-bold mb-4">艺术家服务</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">上传作品</a></li>
                <li><a href="#" className="hover:text-white">创建展览</a></li>
                <li><a href="#" className="hover:text-white">艺术家认证</a></li>
                <li><a href="#" className="hover:text-white">版权保护</a></li>
              </ul>
            </div>

            {/* 订阅资讯 */}
            <div>
              <h5 className="font-bold mb-4">订阅艺术资讯</h5>
              <div className="space-y-3">
                <input 
                  type="email" 
                  placeholder="输入您的邮箱" 
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500"
                />
                <button className="w-full py-3 bg-[#10B981] text-white rounded font-medium hover:bg-[#059669]">
                  订阅
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-500">
            © 2024 艺术空间. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}