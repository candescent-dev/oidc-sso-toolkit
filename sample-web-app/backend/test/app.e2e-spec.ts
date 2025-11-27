import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthorizeDto } from './../src/auth/dto/authorize.dto';
import { SsoConfigService } from '../src/ssoConfig/ssoConfig.service';
import { SsoConfigServiceMock } from '../src/ssoConfig/ssoConfig.service.mock';
import { APP_CONFIG } from '../src/appConfig/appConfig.provider';
import { CACHE_MANAGER } from '@nestjs/cache-manager/dist';
import { ERROR_CODE } from '../src/auth/errors/auth.errors';

  let fetchfromPost_client_id: string;
  let fetchfromPost_client_secret: string;
  let fetchfromPost_created_at: string;
  let redirect_uri = 'https://yourapp.com/callback';
  let stateVal = 'statetest123';
  let code: string, state: string;
  let authCode: string;

  const authoriseApi = '/auth/authorize';
  const clientApi = '/client';
  const tokenApi = '/auth/token';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let agent: any;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(SsoConfigService)
        .useValue(SsoConfigServiceMock)
        .overrideProvider(APP_CONFIG)
        .useValue({
          backendPort: 9999,
        })
        .compile();

      app = moduleFixture.createNestApplication();
      console.log('** BEFORE init **');
      await app.init();
      agent = request.agent(app.getHttpServer());
      jest.useFakeTimers();
      console.log('app initialized successfully');
    } catch (e) {
      console.error('Beforeall failed:', e);
      throw e;
    }
  });

  afterAll(async () => {
    // await app.close();
  });


  it('validate POST client api should have client details in response', async () => {
    console.log('validate POST client api should have client details in response');
    const res = await agent.post(clientApi).catch((err: any) => {
      console.error('Supertest Error:', err.res?.text || err);
      throw err;
    });
    console.log('Post client API Response Body:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('client_id');
    expect(res.body).toHaveProperty('client_secret');
    expect(res.body).toHaveProperty('created_at');
    fetchfromPost_client_id = res.body.client_id;
    fetchfromPost_client_secret = res.body.client_secret;
    fetchfromPost_created_at = res.body.created_at;
  });

  it('validate GET client api should get same client details in respone', async () => {
    console.log('validate GET client api should get same client details in respone');
    const res = await agent.get(clientApi).catch((err: any) => {
      console.error('Supertest Error:', err.res?.text || err);
      throw err;
    });
    console.log('Get client API Response Body:', res.body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Credentials retrieved from cache.');
    expect(res.body).toHaveProperty('credentials.client_id');
    expect(res.body.credentials.client_id).toBe(fetchfromPost_client_id);
    expect(res.body).toHaveProperty('credentials.client_secret');
    expect(res.body.credentials.client_secret).toBe(fetchfromPost_client_secret);
    expect(res.body).toHaveProperty('credentials.created_at');
    expect(res.body.credentials.created_at).toBe(fetchfromPost_created_at);
    authCode = Buffer.from(fetchfromPost_client_id + ':' + fetchfromPost_client_secret).toString(
      'base64',
    );
    console.log('authCode -> ' + authCode);
  }, 3000);

  it('validate authorise api generating redirectUrl with code and state', async () => {
    console.log('validate authorise api generating redirectUrl with code and state');
    const res = await agent
      .get(authoriseApi)
      .query({
        client_id: fetchfromPost_client_id,
        response_type: 'code',
        scope: 'openid',
        redirect_uri: redirect_uri,
        state: stateVal,
      })
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    console.log('authorise API Response Body:', res.body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('redirectUrl');
    code = res.body.redirectUrl.split('code=')[1].split('&')[0];
    state = res.body.redirectUrl.split('state=')[1];
    console.log(code + ' ---- ' + state);
  }, 3000);

  it('validate authorise api with invalidClientId in queryParams', async () => {
    console.log('validate authorise api with invalidClientId in queryParams');
    let invalidClientId = 'invalidClientId123';
    const res = await agent
      .get(authoriseApi)
      .query({
        client_id: invalidClientId,
        response_type: 'code',
        scope: 'openid',
        redirect_uri: redirect_uri,
        state: stateVal,
      })
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    console.log('authorise API Response Body for invalidClientId:', res.body);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', ERROR_CODE.INVALID_CLIENT);
    expect(res.body).toHaveProperty('error', 'Bad Request');
    expect(res.body).toHaveProperty('statusCode', 400);
  }, 3000);

  it('validate authorise api with no client_id in queryParams', async () => {
    console.log('validate authorise api with no client_id in queryParams');
    const payload = {
      response_type: 'code',
      scope: 'openid',
      redirect_uri: redirect_uri,
      state: stateVal,
    };
    const dto = plainToInstance(AuthorizeDto, payload);
    const errors = await validate(dto);
    console.log('errors no client_id -> ', errors);
    const clientIdError = errors.find((err) => err.property === 'client_id');
    expect(Object.values(clientIdError!.constraints!)).toEqual(
      expect.arrayContaining(['client_id should not be empty', 'client_id must be a string']),
    );
  }, 3000);

  it('validate authorise api with no response_type in queryParams', async () => {
    console.log('validate authorise api with no response_type in queryParams');
    const payload = {
      client_id: fetchfromPost_client_id,
      scope: 'openid',
      redirect_uri: redirect_uri,
      state: stateVal,
    };
    const dto = plainToInstance(AuthorizeDto, payload);
    const errors = await validate(dto);
    console.log('errors no response_type -> ', errors);
    const responseTypeError = errors.find((err) => err.property === 'response_type');
    expect(Object.values(responseTypeError!.constraints!)).toEqual(
      expect.arrayContaining([
        'response_type should not be empty',
        'response_type must be a string',
      ]),
    );
  }, 3000);

  it('validate authorise api with no scope in queryParams', async () => {
    console.log('validate authorise api with no scope in queryParams');
    const payload = {
      client_id: fetchfromPost_client_id,
      response_type: 'code',
      redirect_uri: redirect_uri,
      state: stateVal,
    };
    const dto = plainToInstance(AuthorizeDto, payload);
    const errors = await validate(dto);
    console.log('errors no scope -> ', errors);
    const scopeError = errors.find((err) => err.property === 'scope');
    expect(Object.values(scopeError!.constraints!)).toEqual(
      expect.arrayContaining(['scope should not be empty', 'scope must be a string']),
    );
  }, 3000);

  it('validate authorise api with no redirect_uri in queryParams', async () => {
    console.log('validate authorise api with no redirect_uri in queryParams');
    const payload = {
      client_id: fetchfromPost_client_id,
      response_type: 'code',
      scope: 'openid',
      state: stateVal,
    };
    const dto = plainToInstance(AuthorizeDto, payload);
    const errors = await validate(dto);
    console.log('errors no redirect_uri -> ', errors);
    const redirect_uriError = errors.find((err) => err.property === 'redirect_uri');
    expect(Object.values(redirect_uriError!.constraints!)).toEqual(
      expect.arrayContaining(['redirect_uri should not be empty', 'redirect_uri must be a string']),
    );
  }, 3000);

  it('validate authorise api with invalidRedirect_uri in queryParams', async () => {
    console.log('validate authorise api with invalidRedirect_uri in queryParams');
    let invalid_redirect_uri = 'invalidRedirectUri.com/callback';
    const res = await agent
      .get(authoriseApi)
      .query({
        client_id: fetchfromPost_client_id,
        response_type: 'code',
        scope: 'openid',
        redirect_uri: invalid_redirect_uri,
        state: stateVal,
      })
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    console.log('authorise API Response Body for invalidRedirect_uri:', res.body);
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message', 'Internal server error');
    expect(res.body).toHaveProperty('statusCode', 500);
  }, 3000);

  it('validate token api generating access token', async () => {
    console.log('validate token api generating access token');
    const res = await agent
      .post(tokenApi)
      .set('Authorization', `Basic ${authCode}`)
      .send({
        code: code,
      })
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    console.log('Token API Response Body:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('id_token');
    expect(res.body).toHaveProperty('expires_in');
    expect(res.body).toHaveProperty('token_type');
  });

  it('validate token api with invalid authorisation', async () => {
    console.log('validate token api with invalid authorisation');
    let invalidAuthCode = 'abctesting';
    const res = await agent
      .post(tokenApi)
      .set('Authorization', `Basic ${invalidAuthCode}`)
      .send({
        code: code,
      })
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    console.log('Token API Response Body:', res.body);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', ERROR_CODE.AUTH_CREDENTIALS_MISSING);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
    expect(res.body).toHaveProperty('statusCode', 401);
  });

  it('validate token api with invalid code', async () => {
    console.log('validate token api with invalid code');
    let invalidCode = 'abctestingcode';
    const res = await agent
      .post(tokenApi)
      .set('Authorization', `Basic ${authCode}`)
      .send({
        code: invalidCode,
      })
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    console.log('Token API Response Body:', res.body);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', ERROR_CODE.INVALID_EXPIRE_AUTH_CODE);
    expect(res.body).toHaveProperty('error', 'Bad Request');
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('validate token api with no requestbody', async () => {
    console.log('validate token api with no requestbody');
    const res = await agent
      .post(tokenApi)
      .set('Authorization', `Basic ${authCode}`)
      .send({})
      .catch((err: any) => {
        console.error('Supertest Error:', err.res?.text || err);
        throw err;
      });
    console.log('Token API Response Body:', res.body);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message', ERROR_CODE.AUTH_CODE_MISSING);
    expect(res.body).toHaveProperty('error', 'Bad Request');
    expect(res.body).toHaveProperty('statusCode', 400);
  });

it('should delete the cache', async () => {
  const cache = app.get(CACHE_MANAGER);
  const cached = await cache.get('client_credentials');
  console.log('Cached credentials before expiration:', cached);
    // cache del
  await cache.del('client_credentials');
  await cache.get('client_credentials').then((cached_afterExpry) => {
    console.log('Cache cannot be deleted from the API because cache is managed internally in the application and hence after using the jest timers we cannot shift the expiry time, hence we are clearning the cache manually, Cached credentials after expiration is : -> ', cached_afterExpry);
    expect(cached_afterExpry).toBeUndefined();
  });
});



});

