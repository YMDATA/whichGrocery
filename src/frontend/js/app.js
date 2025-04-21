// products配列をMarkdownテーブルに変換
function formatMarkdown(products) {
    let markdown = "| 商品名 | 価格 | 画像 | 説明 |\n";
    markdown += "|--------|------|------|------|\n";
    products.forEach(product => {
        const image = product.imageUrl ? `![image](${product.imageUrl})` : '';
        markdown += `| ${product.name} | ${product.price} | ${image} | ${product.description || ''} |\n`;
    });
    return markdown;
}

// MarkdownテーブルをHTMLに変換
function markdownToHtml(markdown) {
    const lines = markdown.split('\n');
    let html = '';
    
    lines.forEach(line => {
        if (line.startsWith('|')) {
            // テーブル行を処理
            const cells = line.split('|').slice(1, -1);
            html += '<tr>';
            cells.forEach(cell => {
                const content = cell.trim();
                // 画像マークダウンを処理
                if (content.startsWith('![')) {
                    const alt = content.match(/!\[(.*?)\]/)[1];
                    const src = content.match(/\((.*?)\)/)[1];
                    html += `<td><img src="${src}" alt="${alt}" width="100"></td>`;
                } else {
                    html += `<td>${content}</td>`;
                }
            });
            html += '</tr>';
        }
    });
    
    return `
        <table class="product-table">
            <thead>
                <tr>
                    <th>商品名</th>
                    <th>価格</th>
                    <th>画像</th>
                    <th>説明</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `;
}

// サンプルURLを挿入
document.getElementById('sampleUrlBtn').addEventListener('click', () => {
    document.getElementById('url').value = 'https://tokubai.co.jp/%E3%83%A4%E3%83%9E%E3%83%8A%E3%82%AB/493';
});

document.getElementById('scrapeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('url').value;
    const resultTop = document.getElementById('resultTop');
    const resultBottom = document.getElementById('resultBottom');
    
    resultTop.innerHTML = '処理中...';
    
    try {
        // MCPスクレイピングAPIを呼び出し
        const response = await fetch('/mcp/web-scraper/scrape_products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        console.log('API Response:', data); // レスポンスをログ出力
        
        if (!data.success) {
            throw new Error('スクレイピングに失敗しました');
        }
        
        if (!data.products || data.products.length === 0) {
            throw new Error('商品情報が取得できませんでした');
        }
        
        // products配列からmarkdownを生成
        const markdown = formatMarkdown(data.products);
        
        // MarkdownをHTMLに変換して表示
        // 上側に基本情報を表示
        resultTop.innerHTML = `
            <h2>スクレイピング結果</h2>
            <p>${data.products.length}件の商品が見つかりました</p>
        `;
        
        // 下側に詳細結果を表示
        resultBottom.innerHTML = markdownToHtml(markdown);
        
        // ボタンで下側のみ表示/非表示を切り替え
        const toggleBtn = document.getElementById('toggleResult');
        toggleBtn.onclick = () => {
            resultBottom.style.display = resultBottom.style.display === 'none' ? 'block' : 'none';
            toggleBtn.textContent = resultBottom.style.display === 'none' ? '詳細結果を表示' : '詳細結果を非表示';
        };

        // スクレイピング後に自動的にレシピ検索を実行
        const resultMiddle = document.getElementById('resultMiddle');
        resultMiddle.innerHTML = 'レシピ検索中...';
        
        try {
            const ingredients = data.products.map(p => p.name).join(', ');
            const prompt = `以下の食材を使って作れる晩御飯の献立を3つ提案してください。他の食材を少し使っても構いません。\n食材: ${ingredients}`;
            
            console.log('Sending request to /api/deepseek with prompt:', prompt);
            const response = await fetch('http://localhost:3000/api/deepseek', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });
            console.log('Received response:', response);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${errorText}`);
            }

            const recipeData = await response.json().catch(e => {
                throw new Error(`Failed to parse API response: ${e.message}`);
            });
            
            if (!recipeData?.success) {
                throw new Error(recipeData?.error || 'レシピ検索に失敗しました');
            }
            
            resultMiddle.innerHTML = `
                <h3>おすすめレシピ</h3>
                <div class="recipes">${recipeData.result.replace(/\n/g, '<br>')}</div>
            `;
        } catch (error) {
            resultMiddle.innerHTML = `レシピ検索エラー: ${error.message}`;
        }
    } catch (error) {
        resultTop.innerHTML = `エラー: ${error.message}`;
    }
});
