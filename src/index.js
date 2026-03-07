export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (pathname === '/api/articles' && method === 'GET') {
        return await getArticles(env, corsHeaders);
      }

      if (pathname === '/api/articles' && method === 'POST') {
        return await createArticle(request, env, corsHeaders);
      }

      if (pathname.match(/^\/api\/articles\/\d+$/) && method === 'GET') {
        const id = pathname.split('/').pop();
        return await getArticle(id, env, corsHeaders);
      }

      if (pathname.match(/^\/api\/articles\/\d+$/) && method === 'PUT') {
        const id = pathname.split('/').pop();
        return await updateArticle(id, request, env, corsHeaders);
      }

      if (pathname.match(/^\/api\/articles\/\d+$/) && method === 'DELETE') {
        const id = pathname.split('/').pop();
        return await deleteArticle(id, env, corsHeaders);
      }

      if (pathname === '/api/upload' && method === 'POST') {
        return await uploadImage(request, env, corsHeaders);
      }

      return new Response(
        JSON.stringify({ error: '路由不存在' }),
        { status: 404, headers: corsHeaders }
      );
    } catch (error) {
      console.error('API 错误:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

async function getArticles(env, corsHeaders) {
  try {
    const data = await env.JIANGHUAYAO_ARTICLES.get('articles_list');
    const articles = data ? JSON.parse(data) : [];
    return new Response(JSON.stringify(articles), { headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '获取文章失败: ' + error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function getArticle(id, env, corsHeaders) {
  try {
    const data = await env.JIANGHUAYAO_ARTICLES.get('articles_list');
    const articles = data ? JSON.parse(data) : [];
    const article = articles.find(a => a.id === parseInt(id));

    if (!article) {
      return new Response(
        JSON.stringify({ error: '文章不存在' }),
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify(article), { headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '获取文章失败: ' + error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function createArticle(request, env, corsHeaders) {
  try {
    const article = await request.json();

    if (!article.title || !article.relatedType) {
      return new Response(
        JSON.stringify({ error: '标题和分类为必填项' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const data = await env.JIANGHUAYAO_ARTICLES.get('articles_list');
    const articles = data ? JSON.parse(data) : [];

    const newId = articles.length > 0 ? Math.max(...articles.map(a => a.id)) + 1 : 1;

    const newArticle = {
      id: newId,
      title: article.title,
      subtitle: article.subtitle || '',
      excerpt: article.excerpt || '',
      content: article.content || '',
      image: article.image || '',
      year: article.year || new Date().getFullYear().toString(),
      relatedType: article.relatedType,
      type: article.type || 'heritage',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    articles.push(newArticle);
    await env.JIANGHUAYAO_ARTICLES.put('articles_list', JSON.stringify(articles));

    return new Response(JSON.stringify(newArticle), {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '创建文章失败: ' + error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function updateArticle(id, request, env, corsHeaders) {
  try {
    const updates = await request.json();

    const data = await env.JIANGHUAYAO_ARTICLES.get('articles_list');
    const articles = data ? JSON.parse(data) : [];

    const index = articles.findIndex(a => a.id === parseInt(id));

    if (index === -1) {
      return new Response(
        JSON.stringify({ error: '文章不存在' }),
        { status: 404, headers: corsHeaders }
      );
    }

    articles[index] = {
      ...articles[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await env.JIANGHUAYAO_ARTICLES.put('articles_list', JSON.stringify(articles));

    return new Response(JSON.stringify(articles[index]), { headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '更新文章失败: ' + error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function deleteArticle(id, env, corsHeaders) {
  try {
    const data = await env.JIANGHUAYAO_ARTICLES.get('articles_list');
    const articles = data ? JSON.parse(data) : [];

    const filtered = articles.filter(a => a.id !== parseInt(id));

    await env.JIANGHUAYAO_ARTICLES.put('articles_list', JSON.stringify(filtered));

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '删除文章失败: ' + error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function uploadImage(request, env, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(
        JSON.stringify({ error: '没有上传文件' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: '只支持 JPG, PNG, WebP, GIF 格式' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: '文件不能超过 5MB' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop().toLowerCase();
    const filename = `jianghuayao/images/${timestamp}-${random}.${ext}`;

    const buffer = await file.arrayBuffer();

    await env.R2_BUCKET.put(filename, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const publicUrl = `https://cdn.cradle.art/${filename}`;

    return new Response(
      JSON.stringify({
        filename,
        url: publicUrl,
        size: buffer.byteLength,
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: '上传图片失败: ' + error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}