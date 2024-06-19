import request from 'supertest';
import server from '../src/server';
import { reset } from '../src/service';

const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

const postTry = async (path, status, payload, token) => sendTry('post', path, status, payload, token);
const getTry = async (path, status, payload, token) => sendTry('get', path, status, payload, token);
const deleteTry = async (path, status, payload, token) => sendTry('delete', path, status, payload, token);
const putTry = async (path, status, payload, token) => sendTry('put', path, status, payload, token);

const sendTry = async (typeFn, path, status = 200, payload = {}, token = null) => {
  let req = request(server);
  if (typeFn === 'post') {
    req = req.post(path);
  } else if (typeFn === 'get') {
    req = req.get(path);
  } else if (typeFn === 'delete') {
    req = req.delete(path);
  } else if (typeFn === 'put') {
    req = req.put(path);
  }
  if (token !== null) {
    req = req.set('Authorization', `Bearer ${token}`);
  }
  const response = await req.send(payload);
  if (response.statusCode !== status) {
    console.log(typeFn);
    console.log(path);
    console.log(response.body);
  }
  expect(response.statusCode).toBe(status);
  return response.body;
};

describe('Resetting database', () => {

  beforeEach(async () => {
    reset();    
  });

  beforeAll(() => {
    server.close();
  });

  describe('Resetting database', () => {
    it('Resetting database', async () => {
      const globals = {};

      globals.ret1 = await postTry('/auth/register', 200, {
        name: 'Betty',
        email: 'betty@email.com',
        password: 'cardigan',
      });

      globals.ret2 = await postTry('/auth/register', 200, {
        name: 'Augustine',
        email: 'augustine@email.com',
        password: 'august',
      });

      globals.ret3 = await postTry('/auth/register', 200, {
        name: 'James',
        email: 'james@email.com',
        password: 'betty',
      });

      const t1 = await postTry(`/thread`, 200, {
        title: 'Where are my fries?',
        isPublic: true,
        content: 'I like fries but I dont have any right now rip',
      }, await globals.ret1.token);
      const threadId1 = t1.id;
      
      const t2 = await postTry(`/thread`, 200, {
        title: 'Where is my burger?',
        isPublic: true,
        content: 'So I cant find my burger plz help it was round',
      }, await globals.ret1.token);
      const threadId2 = t2.id;

      const c1 = await postTry(`/comment`, 200, {
        threadId: threadId1,
        parentCommentId: null,
        content: 'I like fries but I dont have any right now rip',
      }, await globals.ret2.token);

      const c2 = await postTry(`/comment`, 200, {
        threadId: threadId1,
        parentCommentId: null,
        content: 'I also have fries but only soggy ones'
      }, await globals.ret2.token);

      const c3 = await postTry(`/comment`, 200, {
        threadId: threadId1,
        parentCommentId: c1.id,
        content: 'Sweet I\'ll take that'
      }, await globals.ret1.token);
      

    });

  });

});
