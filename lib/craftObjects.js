/**
 * 工坊好物 —— 前台与后台共用的常量和小工具
 * 物件表 craft_objects / 购买渠道 craft_object_offers / 关联 craft_object_links
 */

// 物件分类：数据库里有检查约束，增删分类时要同时改约束
export const OBJECT_CATEGORIES = ['笔墨', '纸', '印', '织绣', '器物', '版画']

// 后台币种下拉的常用项，也可以手填任何三位 ISO 币种代码
export const COMMON_CURRENCIES = [
  { code: 'TWD', label: '新台币' },
  { code: 'HKD', label: '港币' },
  { code: 'CNY', label: '人民币' },
  { code: 'MOP', label: '澳门元' },
  { code: 'SGD', label: '新加坡元' },
  { code: 'MYR', label: '马来西亚令吉' },
  { code: 'USD', label: '美元' },
  { code: 'CAD', label: '加拿大元' },
  { code: 'AUD', label: '澳大利亚元' },
  { code: 'NZD', label: '新西兰元' },
  { code: 'GBP', label: '英镑' },
  { code: 'EUR', label: '欧元' },
  { code: 'JPY', label: '日元' },
]

// 访客所在国家或地区 → 当地币种，用来把最近的购买渠道排在前面
const EURO_COUNTRIES = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']
const COUNTRY_CURRENCY = {
  TW: 'TWD', HK: 'HKD', MO: 'MOP', CN: 'CNY', SG: 'SGD', MY: 'MYR',
  US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', GB: 'GBP', JP: 'JPY',
}
export function currencyForCountry(country) {
  if (!country) return null
  const c = country.toUpperCase()
  if (EURO_COUNTRIES.includes(c)) return 'EUR'
  return COUNTRY_CURRENCY[c] || null
}

// 价格显示：有数字按币种格式化，没有数字就用文字说明
export function formatOfferPrice(offer) {
  if (offer.price !== null && offer.price !== undefined && offer.price !== '') {
    try {
      const n = new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: offer.currency || 'TWD',
        currencyDisplay: 'code',
        maximumFractionDigits: Number(offer.price) % 1 === 0 ? 0 : 2,
      }).format(Number(offer.price))
      return offer.price_note ? `${n}　${offer.price_note}` : n
    } catch (e) {
      return `${offer.currency} ${offer.price}`
    }
  }
  return offer.price_note || ''
}

// 渠道排序：与访客币种相同的排前面，其余按后台设定的顺序
export function sortOffersForVisitor(offers, visitorCurrency) {
  return [...(offers || [])].sort((a, b) => {
    const am = visitorCurrency && a.currency === visitorCurrency ? 0 : 1
    const bm = visitorCurrency && b.currency === visitorCurrency ? 0 : 1
    if (am !== bm) return am - bm
    return (a.display_order || 0) - (b.display_order || 0)
  })
}

// 销售方名称：合作伙伴 / 认证艺术家 / 外部店铺
export function sellerName(offer) {
  if (offer.seller_kind === 'partner') return offer.partners?.name || offer.seller_name || '合作方'
  if (offer.seller_kind === 'artist') return offer.artists?.display_name || offer.seller_name || '艺术家本人'
  return offer.seller_name || '外部店铺'
}

export const OFFER_SELECT =
  '*, partners:seller_partner_id(id, name), artists:seller_artist_id(id, display_name)'

export const LINK_ROLE_LABEL = {
  kit_required: '材料包 · 必备',
  kit_optional: '材料包 · 可选',
  related: '延伸推荐',
}

export const LINK_TARGET_LABEL = {
  workshop: '工作坊',
  artist: '艺术家',
  curation: '阅览室期次',
  article: '文章',
}
