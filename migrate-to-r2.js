/**
 * Supabase Storage → Cloudflare R2 图片迁移脚本
 * 
 * 使用方法：
 * 1. 确保已安装依赖: npm install @aws-sdk/client-s3
 * 2. 在项目根目录运行: node migrate-to-r2.js
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const { createClient } = require('@supabase/supabase-js')

// ========== 配置 ==========
// 从 .env.local 复制你的值
const SUPABASE_URL = 'https://ghnrxnoqqteuxxtqlzfv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_6oNGn9wFtBu-U6aGpjd8Zw_QhszOlJT'

const R2_ENDPOINT = 'https://db45f6d4c619ed78eb8ef4d0d2cc738e.r2.cloudflarestorage.com'        // ← 填你的
const R2_ACCESS_KEY_ID = '6f26a74056ea5be932ef56cdbb440170'  // ← 填你的
const R2_SECRET_ACCESS_KEY = '6aa3dccd582bbcab988ed5d2617ec3294d7f0380bdf63de5c0497e44081ba789'      // ← 填你的
const R2_BUCKET_NAME = 'cradle-cv'
const R2_PUBLIC_URL = 'https://pub-2fbdb6b273bb4051a9f31fbd8a96cf21.r2.dev'

const OLD_BASE = `${SUPABASE_URL}/storage/v1/object/public/image/`
// =============================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const S3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

// 需要检查的表和字段
const TABLES_TO_CHECK = [
  { table: 'artworks', columns: ['image_url'] },
  { table: 'artists', columns: ['avatar_url', 'cover_image'] },
  { table: 'collections', columns: ['cover_image'] },
  { table: 'exhibitions', columns: ['cover_image', 'poster_image'] },
  { table: 'partners', columns: ['logo_url'] },
  { table: 'gallery_works', columns: ['cover_image', 'artist_avatar'] },
  { table: 'articles', columns: ['cover_image'] },
]

async function migrate() {
  console.log('🚀 开始迁移 Supabase Storage → Cloudflare R2\n')

  const allUrls = new Set()

  // 1. 收集所有 Supabase 图片 URL
  console.log('📋 第一步：扫描数据库中的图片链接...\n')
  for (const { table, columns } of TABLES_TO_CHECK) {
    try {
      const { data, error } = await supabase.from(table).select(`id, ${columns.join(', ')}`)
      if (error) {
        console.log(`  ⚠️  表 ${table} 跳过: ${error.message}`)
        continue
      }
      if (!data || data.length === 0) continue

      let count = 0
      for (const row of data) {
        for (const col of columns) {
          const url = row[col]
          if (url && url.includes('supabase.co/storage')) {
            allUrls.add(url)
            count++
          }
        }
      }
      if (count > 0) console.log(`  ✓ ${table}: 发现 ${count} 个图片链接`)
    } catch (e) {
      console.log(`  ⚠️  表 ${table} 跳过: ${e.message}`)
    }
  }

  console.log(`\n📊 共发现 ${allUrls.size} 个需要迁移的图片\n`)

  if (allUrls.size === 0) {
    console.log('✅ 没有需要迁移的图片，退出')
    return
  }

  // 2. 下载并上传到 R2
  console.log('📦 第二步：下载并上传到 R2...\n')
  let success = 0
  let failed = 0
  const urlMap = {} // old -> new

  for (const oldUrl of allUrls) {
    // 从 URL 提取路径: artworks/1770251944658-svxtron.jpg
    const path = oldUrl.replace(OLD_BASE, '')
    const newUrl = `${R2_PUBLIC_URL}/${path}`

    try {
      // 下载
      const response = await fetch(oldUrl)
      if (!response.ok) {
        console.log(`  ✗ 下载失败: ${path} (${response.status})`)
        failed++
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') || 'image/jpeg'

      // 上传到 R2
      await S3.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        Body: buffer,
        ContentType: contentType,
      }))

      urlMap[oldUrl] = newUrl
      success++
      console.log(`  ✓ [${success}/${allUrls.size}] ${path}`)
    } catch (e) {
      console.log(`  ✗ 失败: ${path} - ${e.message}`)
      failed++
    }
  }

  console.log(`\n📊 上传完成: ✓ ${success} 成功, ✗ ${failed} 失败\n`)

  // 3. 更新数据库 URL
  console.log('🔄 第三步：更新数据库链接...\n')
  let updated = 0

  for (const { table, columns } of TABLES_TO_CHECK) {
    try {
      const { data, error } = await supabase.from(table).select(`id, ${columns.join(', ')}`)
      if (error || !data) continue

      for (const row of data) {
        const updates = {}
        let needUpdate = false

        for (const col of columns) {
          const oldUrl = row[col]
          if (oldUrl && urlMap[oldUrl]) {
            updates[col] = urlMap[oldUrl]
            needUpdate = true
          }
        }

        if (needUpdate) {
          const { error: updateErr } = await supabase
            .from(table)
            .update(updates)
            .eq('id', row.id)

          if (updateErr) {
            console.log(`  ✗ 更新失败: ${table} id=${row.id}: ${updateErr.message}`)
          } else {
            updated++
          }
        }
      }
    } catch (e) {
      // skip
    }
  }

  console.log(`  ✓ 更新了 ${updated} 条数据库记录\n`)

  // 完成
  console.log('=' .repeat(50))
  console.log('🎉 迁移完成！')
  console.log(`   图片迁移: ${success}/${allUrls.size}`)
  console.log(`   数据库更新: ${updated} 条`)
  console.log('')
  console.log('⚠️  确认网站正常后，可以去 Supabase Storage 删除旧图片释放空间')
  console.log('=' .repeat(50))
}

migrate().catch(console.error)
