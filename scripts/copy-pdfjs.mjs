// 把 pdfjs-dist 自带的 worker、CJK 字符映射表、标准字体复制到 public/pdfjs/，
// 供 /pdf 工具页在浏览器里渲染缩略图用。在 dev / build 之前自动运行。
// 这些文件不进 git（见 .gitignore），每次从 node_modules 复制，保证和安装的版本一致。
// 复制失败不会中断构建：最坏情况只是 /pdf 页的缩略图显示不出来。
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

try {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const src = join(root, 'node_modules', 'pdfjs-dist')
  const dest = join(root, 'public', 'pdfjs')
  if (!existsSync(src)) throw new Error('node_modules/pdfjs-dist 不存在')
  mkdirSync(dest, { recursive: true })
  cpSync(join(src, 'legacy', 'build', 'pdf.worker.min.mjs'), join(dest, 'pdf.worker.min.mjs'))
  cpSync(join(src, 'cmaps'), join(dest, 'cmaps'), { recursive: true })
  cpSync(join(src, 'standard_fonts'), join(dest, 'standard_fonts'), { recursive: true })
  console.log('[copy-pdfjs] 已复制到 public/pdfjs')
} catch (e) {
  console.warn('[copy-pdfjs] 跳过：', e.message)
}
