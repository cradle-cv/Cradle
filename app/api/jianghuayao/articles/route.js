import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - 获取所有文章
export async function GET(request) {
  try {
    console.log('获取文章列表...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置');
    
    const { data, error } = await supabase
      .from('jianghuayao_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase 错误:', error);
      throw new Error(`Supabase 错误: ${error.message}`);
    }

    console.log('成功获取 ' + (data?.length || 0) + ' 篇文章');
    return Response.json(data || []);
  } catch (error) {
    console.error('GET /api/jianghuayao/articles 错误:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - 创建文章
export async function POST(request) {
  try {
    console.log('创建新文章...');
    
    const body = await request.json();
    console.log('接收到的数据:', body);

    const { data, error } = await supabase
      .from('jianghuayao_articles')
      .insert([
        {
          title: body.title,
          subtitle: body.subtitle || null,
          excerpt: body.excerpt || null,
          content: body.content || null,
          image: body.image || null,
          year: body.year || new Date().getFullYear().toString(),
          related_type: body.relatedType,
          type: body.type,
        }
      ])
      .select();

    if (error) {
      console.error('Supabase 插入错误:', error);
      throw new Error(`插入失败: ${error.message}`);
    }

    console.log('文章创建成功:', data?.[0]?.id);
    return Response.json(data?.[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/jianghuayao/articles 错误:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}