import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
import path from 'path';
import 'dotenv/config';

const __dirname = path.resolve();

export const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes must come before static files to avoid conflicts
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

// テスト用スタブAPIエンドポイント
app.post('/api/deepseek', (req, res) => {
    try {
        console.log('Received request to /api/deepseek (stub)');
        const mockResponse = {
            success: true,
            result: "1. 鯛のアクアパッツァ\n2. 鯛の塩焼き\n3. 鯛の潮汁"
        };
        res.json(mockResponse);
    } catch (error) {
        console.error('Stub API error:', error);
        res.status(200).json({
            success: true,
            result: "テスト用レシピデータ"
        });
    }
});

// Serve static files after API routes
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
