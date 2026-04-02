import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { authMiddleware } from './auth.js';

type HeaderMap = Record<string, string | undefined>;

function createReq(method: string, headers: HeaderMap = {}, query: Record<string, string> = {}): Request {
  return {
    method,
    headers,
    query,
  } as unknown as Request;
}

function createRes() {
  const state = {
    statusCode: 200,
    body: null as unknown,
  };

  const res = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
  } as unknown as Response;

  return { res, state };
}

function runAuth(req: Request) {
  const { res, state } = createRes();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  authMiddleware(req, res, next);
  return { nextCalled, ...state };
}

test('workflow 4: includeDisabled requires api key and admin read permission', () => {
  const reqMissingAuth = createReq('GET', {}, { includeDisabled: 'true' });
  const missingAuth = runAuth(reqMissingAuth);
  assert.equal(missingAuth.nextCalled, false);
  assert.equal(missingAuth.statusCode, 401);

  const reqMissingPermission = createReq('GET', {
    'x-api-key': 'dev-key-123',
    'x-user-permissions': 'app:read',
  }, { includeDisabled: 'true' });
  const missingPermission = runAuth(reqMissingPermission);
  assert.equal(missingPermission.nextCalled, false);
  assert.equal(missingPermission.statusCode, 403);

  const reqAuthorized = createReq('GET', {
    'x-api-key': 'dev-key-123',
    'x-user-permissions': 'admin:read',
  }, { includeDisabled: 'true' });
  const authorized = runAuth(reqAuthorized);
  assert.equal(authorized.nextCalled, true);
  assert.equal(authorized.statusCode, 200);
});

test('workflow 5: write operations require api key and admin write', () => {
  const noKey = runAuth(createReq('PATCH', {
    'x-user-permissions': 'admin:write',
  }));
  assert.equal(noKey.nextCalled, false);
  assert.equal(noKey.statusCode, 401);

  const noWrite = runAuth(createReq('PATCH', {
    'x-api-key': 'dev-key-123',
    'x-user-permissions': 'admin:read',
  }));
  assert.equal(noWrite.nextCalled, false);
  assert.equal(noWrite.statusCode, 403);

  const allowed = runAuth(createReq('PATCH', {
    'x-api-key': 'dev-key-123',
    'x-user-permissions': 'admin:write',
  }));
  assert.equal(allowed.nextCalled, true);
  assert.equal(allowed.statusCode, 200);
});
