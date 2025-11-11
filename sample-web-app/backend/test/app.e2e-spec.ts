import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
const session = require('express-session');

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let agent:any;

  beforeAll(async () => {
    try {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(session({ 
      secret: 'test-secret', 
      resave: false, 
      saveUninitialized: false, 
      cookie: { secure: false, maxAge: 300000 } }));
    console.log('** BEFORE init **');
    await app.init();
    agent = request.agent(app.getHttpServer());
    //jest.useFakeTimers();
    console.log('✅ app initialized successfully');
  }catch (e) {
    console.error("❌ BEFOREALL FAILED:", e);
    throw e;
  }

  });

  afterAll(async () => {
    await app.close();
  });

      let fetchfromPost_client_id:string;
      let fetchfromPost_client_secret:string;
      let fetchfromPost_created_at:string;
      let redirect_uri = 'https://yourapp.com/callback';
      let stateVal = "statetest123";
      let code: string, state: string;
      let authCode: string;

      const authoriseApi = "/auth/authorize";
      const clientApi = "/client";
      const tokenApi = "/auth/token";
      

  it('validate POST client api should have client details in response', async () => {
      const res = await agent
        .post(clientApi)
        .catch((err:any) => {
      console.error("Supertest Error:", err.res?.text || err);
      throw err;}
        );
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('client_id');
      expect(res.body).toHaveProperty('client_secret');
      expect(res.body).toHaveProperty('created_at');
      fetchfromPost_client_id = res.body.client_id;
      fetchfromPost_client_secret = res.body.client_secret;
      fetchfromPost_created_at = res.body.created_at;
      console.log("client_id -> " + fetchfromPost_client_id + "\n", "client_secret -> " + fetchfromPost_client_secret + "\n", "created_at -> " + fetchfromPost_created_at);
    });

  it('validate GET client api should get same client details in respone', async () => {
      const res = await agent
        .get(clientApi)
        .catch((err:any) => {
      console.error("Supertest Error:", err.res?.text || err);
      throw err;}
        );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Credentials retrieved from session.');
      expect(res.body).toHaveProperty('credentials.client_id');
      expect(res.body.credentials.client_id).toBe(fetchfromPost_client_id);
      expect(res.body).toHaveProperty('credentials.client_secret');
      expect(res.body.credentials.client_secret).toBe(fetchfromPost_client_secret);
      expect(res.body).toHaveProperty('credentials.created_at');
      expect(res.body.credentials.created_at).toBe(fetchfromPost_created_at);

      authCode = Buffer.from(fetchfromPost_client_id+":"+fetchfromPost_client_secret).toString("base64");

      console.log("get_client_id -> " + res.body.credentials.client_id + "\n", "get_client_secret -> " + res.body.credentials.client_secret + "\n", "get_created_at -> " +res.body.credentials.created_at);
      console.log("authCode -> " + authCode);
    },3000);


  it('validate authorise api generating redirectUrl with code and state', async () => {
      const res = await agent
        .post(authoriseApi)
        .query({
          client_id: fetchfromPost_client_id,
          response_type: 'code',
          scope: 'openid',
          redirect_uri: redirect_uri,
          state: stateVal
        })
        .catch((err:any) => {
      console.error("Supertest Error:", err.res?.text || err);
      throw err;}
        );
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('redirectUrl');
      console.log("redirectUrl -> " + res.body.redirectUrl);
      code = res.body.redirectUrl.split("code=")[1].split("&")[0];
      state = res.body.redirectUrl.split("state=")[1];
      console.log(code + " ---- " + state);
     },3000);

 it('validate token api generating access token', async () => {
      const res = await agent
        .post(tokenApi)
        .set('Authorization', `Basic ${authCode}`)
        .send({
          "code": code
          })
        .catch((err:any) => {
      console.error("Supertest Error:", err.res?.text || err);
      throw err;}
        );
      console.log("Token API Response Body:", res.body);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('id_token');
      expect(res.body).toHaveProperty('expires_in');
      expect(res.body).toHaveProperty('token_type');
      console.log("access_token -> " + res.body.access_token + "\n", "token_type -> " + res.body.token_type + "\n", "expires_in -> " + res.body.expires_in + "\n", "id_token -> " + res.body.id_token);
     });

});

