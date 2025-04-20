import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.post('/api/scrape', async (req, res) => {
    try {
        const { url } = req.body;
        const scrapeResult = await fetch('http://localhost:3001/mcp/web-scraper/scrape_products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        }).then(res => res.json());
        
        if (!scrapeResult.success) {
            throw new Error('Failed to scrape products');
        }
        
        res.json({ success: true, products: scrapeResult.products });
    } catch (error) {
        res.status(500).json({ error: 'Scraping failed' });
    }
});

app.post('/api/suggest-recipe', async (req, res) => {
    try {
        const { products } = req.body;
        const prompt = `以下の食材を使って、簡単で美味しい晩御飯のレシピを提案してください:\n${products.join('\n')}`;
        
        const response = await fetch(process.env.DEEPSEEK_API_URL!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }

        res.json({ 
            success: true, 
            recipe: data.choices[0]?.message?.content || 'レシピを生成できませんでした'
        });
    } catch (error) {
        res.status(500).json({ error: 'Recipe suggestion failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
