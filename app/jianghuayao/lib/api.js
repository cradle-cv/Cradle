const API_BASE = '/api/jianghuayao';

// 获取所有文章
export async function fetchArticles() {
  try {
    const response = await fetch(`${API_BASE}/articles`);
    if (!response.ok) throw new Error('获取文章失败');
    return await response.json();
  } catch (error) {
    console.error('获取文章失败:', error);
    return [];
  }
}

// 创建文章
export async function createArticle(article) {
  try {
    const response = await fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article),
    });
    if (!response.ok) throw new Error('创建文章失败');
    return await response.json();
  } catch (error) {
    console.error('创建文章失败:', error);
    throw error;
  }
}

// 更新文章
export async function updateArticle(id, article) {
  try {
    const response = await fetch(`${API_BASE}/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article),
    });
    if (!response.ok) throw new Error('更新文章失败');
    return await response.json();
  } catch (error) {
    console.error('更新文章失败:', error);
    throw error;
  }
}

// 删除文章
export async function deleteArticle(id) {
  try {
    const response = await fetch(`${API_BASE}/articles/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('删除文章失败');
    return await response.json();
  } catch (error) {
    console.error('删除文章失败:', error);
    throw error;
  }
}

// 上传图片
export async function uploadImage(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('上传失败');
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('上传图片失败:', error);
    throw error;
  }
}
```

---

## ⚙️ 环境变量配置

在你的 `.env.local` 中添加：
```
# Supabase（已有，保留）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxx

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_ACCESS_KEY_ID=xxx
CLOUDFLARE_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET=your-bucket-name
CLOUDFLARE_R2_PUBLIC_URL=https://your-r2-domain