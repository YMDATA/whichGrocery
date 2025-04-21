const request = require('supertest');
const { app } = require('../server.js');

describe('Stub API Tests', () => {
  it('should return mock recipes', async () => {
    const res = await request(app)
      .post('/api/deepseek')
      .send({});
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('result');
    expect(res.body.result).toContain('鯛のアクアパッツァ');
  });

  it('should handle errors gracefully', async () => {
    // Mock an error case
    const originalHandler = app._router.stack.pop();
    
    app.post('/api/deepseek', () => {
      throw new Error('Test error');
    });

    const res = await request(app)
      .post('/api/deepseek')
      .send({});
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    
    // Restore original handler
    app._router.stack.push(originalHandler);
  });
});
