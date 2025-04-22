#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer from 'puppeteer';
import express from 'express';
import cors from 'cors';

interface Product {
  name: string;
  price: string;
  imageUrl?: string;
  description?: string;
  isRecommend?: boolean;
}

class WebScraperServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "web-scraper",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

    private async scrapeProducts(url: string): Promise<Product[]> {
        // テスト用モックデータ
        if (process.env.NODE_ENV === 'development') {
            return [{
                name: "テスト商品",
                price: "1,000円",
                imageUrl: "https://example.com/test.jpg",
                description: "テスト説明",
                isRecommend: true
            }];
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
    const page = await browser.newPage();
    
    // ユーザーエージェントを最新版に更新
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 証明書エラーを無視
    await page.setBypassCSP(true);
    
    // デバッグ用にページ遷移をログに出力
    console.log(`Navigating to: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // デバッグ用にスクリーンショットを保存
    await page.screenshot({path: 'debug_screenshot.png'});
    console.log('Screenshot saved to debug_screenshot.png');
    
    // ページのHTMLをログに出力
    const html = await page.content();
    console.log(`Page HTML (first 500 chars): ${html.substring(0, 500)}...`);
    
    try {
      await page.waitForSelector('.product-list-item', { 
        timeout: 30000,
        visible: true 
      });
      console.log('Found .product-list-item selector');
    } catch (error) {
      console.error('Could not find .product-list-item selector:', error);
      throw error;
    }

    const products = await page.evaluate(() => {
      const items: Product[] = [];
      // 商品情報を取得
      document.querySelectorAll('.product-list-item').forEach((el) => {
        const name = el.querySelector('.product-name')?.textContent?.trim() || 'No name';
        const price = el.querySelector('.product-price')?.textContent?.trim() || 'No price';
        const imageUrl = el.querySelector('.product-image img')?.getAttribute('src') || '';
        const description = el.querySelector('.product-description')?.textContent?.trim() || '';
        
        items.push({ 
          name, 
          price,
          imageUrl,
          description,
          isRecommend: true
        });
      });
      return items;
    });

    await browser.close();
    return products;
  }

  private formatMarkdown(products: Product[]): string {
    let markdown = "| 商品名 | 価格 | 画像 | 説明 |\n";
    markdown += "|--------|------|------|------|\n";
    products.forEach(product => {
      const image = product.imageUrl ? `![image](${product.imageUrl})` : '';
      markdown += `| ${product.name} | ${product.price} | ${image} | ${product.description} |\n`;
    });
    return markdown;
  }

  private formatCSV(products: Product[]): string {
    let csv = '商品名,価格,画像URL,説明\n';
    products.forEach(product => {
      csv += `"${product.name.replace(/"/g, '""')}","${product.price.replace(/"/g, '""')}","${product.imageUrl?.replace(/"/g, '""') || ''}","${product.description?.replace(/"/g, '""') || ''}"\n`;
    });
    return csv;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "scrape_products",
          description: "Scrape product information from a URL",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "URL to scrape",
                format: "uri"
              }
            },
            required: ["url"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'scrape_products') {
        throw new Error('Unknown tool');
      }

      const url = request.params.arguments?.url;
      if (typeof url !== 'string') {
        throw new Error('URL is required');
      }

      try {
        const products = await this.scrapeProducts(url);
        if (products.length === 0) {
          return {
            content: [{
              type: "text",
              text: "スクレイピングは成功しましたが、商品が見つかりませんでした。セレクタが正しいか確認してください。"
            }],
            isError: true
          };
        }
        const markdown = this.formatMarkdown(products);
        return {
          content: [{
            type: "text",
            text: markdown
          }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Scraping error: ${errorMsg}`);
        return {
          content: [{
            type: "text",
            text: `スクレイピング失敗: ${errorMsg}\n\nデバッグ情報:\n- URL: ${url}\n- 使用セレクタ: .product_element_wrapper`
          }],
          isError: true
        };
      }
    });
  }

  async run() {
    // MCPサーバー接続
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // HTTPサーバー起動
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    app.post('/mcp/web-scraper/scrape_products', async (req, res) => {
      try {
        const result = await this.scrapeProducts(req.body.url);
        const format = req.query.format === 'csv' ? 'csv' : 'markdown';
        if (format === 'csv') {
          const csv = this.formatCSV(result);
          res.setHeader('Content-Type', 'text/csv');
          res.send(csv);
        } else {
          res.json({
            success: true,
            products: result,
            markdown: this.formatMarkdown(result)
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.listen(3001, () => {
      console.error('Web Scraper HTTP server running on port 3001');
    });
  }
}

const server = new WebScraperServer();
server.run().catch(console.error);
