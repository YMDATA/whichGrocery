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

document.getElementById('scrapeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('url').value;
    const resultDiv = document.getElementById('result');
    
    resultDiv.innerHTML = '処理中...';
    
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
        resultDiv.innerHTML = `
            <h2>スクレイピング結果</h2>
            ${markdownToHtml(markdown)}
        `;
    } catch (error) {
        resultDiv.innerHTML = `エラー: ${error.message}`;
    }
});
