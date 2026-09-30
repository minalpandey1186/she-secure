import request from 'supertest';
import { app } from '../src/app';
import { authService } from '../src/services/authentication/auth.service';
import { authorityRepository } from '../src/repositories/authority.repository';

describe('Auth & Session Management API', () => {
  beforeAll(async () => {
    authorityRepository.clearMemoryStore();
    await authService.seedDefaultAuthorities();
  });

  it('should authenticate Admin user and return JWT bearer token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@shesecure.org',
        password: 'AdminPassword123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('should reject invalid passwords with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@shesecure.org',
        password: 'WrongPassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 when accessing protected /me endpoint without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return user info when accessing /me with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'operator@shesecure.org',
        password: 'OperatorPassword123!'
      });

    const token = loginRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('operator@shesecure.org');
    expect(meRes.body.data.user.role).toBe('OPERATOR');
  });
});
