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
    console.log(response.body);
  }
  expect(response.statusCode).toBe(status);
  return response.body;
};

const INVALID_TOKEN = 'Cactusbot';

const USER1 = {
  name: 'Betty',
  email: 'betty@email.com',
  password: 'cardigan',
  image: IMAGE,
};
const USER2 = {
  name: 'Augustine',
  email: 'augustine@email.com',
  password: 'august',
  image: IMAGE,
};
const USER3 = {
  name: 'James',
  email: 'james@email.com',
  password: 'betty',
};

describe('Auth tests', () => {

  beforeAll(() => {
    reset();
  });

  beforeAll(() => {
    server.close();
  });

  let firstUserId = null;

  test('Registration of initial user', async () => {
    const { token, userId, } = await postTry('/auth/register', 200, {
      email: USER1.email,
      password: USER1.password,
      name: USER1.name,
    });
    expect(token instanceof String);
    firstUserId = userId;
  });

  test('Inability to re-register a user', async () => {
    await postTry('/auth/register', 400, {
      email: USER1.email,
      password: USER1.password,
      name: USER1.name,
    });
  });

  test('Registration of second user', async () => {
    const { token, } = await postTry('/auth/register', 200, {
      email: USER2.email,
      password: USER2.password,
      name: USER2.name,
    });
    expect(token instanceof String);
  });

  test('Login to an existing user', async () => {
    const { token, userId, } = await postTry('/auth/login', 200, {
      email: USER1.email,
      password: USER1.password,
    });
    expect(token instanceof String);
    expect(userId).toBe(firstUserId);
  });

  test('Login attempt with invalid credentials 1', async () => {
    await postTry('/auth/login', 400, {
      email: 'inez@email.com',
      password: USER1.password,
    });
  });

  test('Login attempt with invalid credentials 2', async () => {
    await postTry('/auth/login', 400, {
      email: USER1.email,
      password: 'car again',
    });
  });
});

describe('User tests', () => {

  const globals = {};

  beforeEach(async () => {
    reset();

    globals.ret1 = await postTry('/auth/register', 200, {
      email: USER1.email,
      password: USER1.password,
      name: USER1.name,
    });

    globals.ret2 = await postTry('/auth/register', 200, {
      email: USER2.email,
      password: USER2.password,
      name: USER2.name,
    });

    globals.ret3 = await postTry('/auth/register', 200, {
      email: USER3.email,
      password: USER3.password,
      name: USER3.name,
    });
  });

  beforeAll(() => {
    server.close();
  });

  describe('GET /user should', () => {

    it('fail with a bad token', async () => {
      await getTry('/user', 403, {}, INVALID_TOKEN);
    });
    
    it('fail with a no info', async () => {
      const userInfo = await getTry('/user', 400, {}, await globals.ret1.token);
    });
    
    it('produce correct results for valid input for admin user', async () => {
      const id = globals.ret1.userId;
      const userInfo = await getTry(`/user?userId=${id}`, 200, {}, await globals.ret1.token);
      expect(userInfo.id).toBe(id);
      expect(userInfo.email).toBe(USER1.email);
      expect(userInfo.name).toBe(USER1.name);
      expect(userInfo.password).toBe(undefined);
      expect(userInfo.image).toBe(null);
      expect(userInfo.threadsWatching).toEqual(expect.arrayContaining([]));
      expect(userInfo.admin).toEqual(true);
    });

    it('produce correct results for valid input for non-admin user', async () => {
      const id = globals.ret2.userId;
      const userInfo = await getTry(`/user?userId=${id}`, 200, {}, await globals.ret2.token);
      expect(userInfo.id).toBe(id);
      expect(userInfo.email).toBe(USER2.email);
      expect(userInfo.name).toBe(USER2.name);
      expect(userInfo.password).toBe(undefined);
      expect(userInfo.image).toBe(null);
      expect(userInfo.threadsWatching).toEqual(expect.arrayContaining([]));
      expect(userInfo.admin).toEqual(false);
    });
  });

  describe('PUT /user should', () => {
    it('fail with a bad token', async () => {
      await putTry('/user', 403, {}, INVALID_TOKEN);
    });

    it('update only the name', async () => {
      const id = globals.ret1.userId;
      await putTry(`/user`, 200, { id, name: 'TestingName' }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${id}`, 200, {}, await globals.ret1.token);
      expect(userInfo.id).toBe(id);
      expect(userInfo.email).toBe(USER1.email);
      expect(userInfo.name).toBe('TestingName');
      expect(userInfo.image).toBe(null);
      expect(userInfo.threadsWatching).toEqual(expect.arrayContaining([]));
      expect(userInfo.admin).toEqual(true);

      await postTry('/auth/login', 200, { email: USER1.email, password: USER1.password, });
    });

    it('update only the email', async () => {
      const id = globals.ret1.userId;
      await putTry(`/user`, 200, { id, email: 'newemail@gmail.com' }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${id}`, 200, {}, await globals.ret1.token);
      expect(userInfo.id).toBe(id);
      expect(userInfo.email).toBe('newemail@gmail.com');
      expect(userInfo.name).toBe(USER1.name);
      expect(userInfo.image).toBe(null);
      expect(userInfo.threadsWatching).toEqual(expect.arrayContaining([]));
      expect(userInfo.admin).toEqual(true);

      await postTry('/auth/login', 200, { email: 'newemail@gmail.com', password: USER1.password, });
    });

    it('update only the image', async () => {
      const id = globals.ret1.userId;
      await putTry(`/user`, 200, { id, image: USER1.image }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${id}`, 200, {}, await globals.ret1.token);
      expect(userInfo.id).toBe(id);
      expect(userInfo.email).toBe(USER1.email);
      expect(userInfo.name).toBe(USER1.name);
      expect(userInfo.image).toBe(USER1.image);
      expect(userInfo.threadsWatching).toEqual(expect.arrayContaining([]));
      expect(userInfo.admin).toEqual(true);

      await postTry('/auth/login', 200, { email: USER1.email, password: USER1.password, });
    });

    it('update only the password', async () => {
      const id = globals.ret1.userId;
      await putTry(`/user`, 200, { id, password: 'newpassword1234' }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${id}`, 200, {}, await globals.ret1.token);
      expect(userInfo.id).toBe(id);
      expect(userInfo.email).toBe(USER1.email);
      expect(userInfo.name).toBe(USER1.name);
      expect(userInfo.image).toBe(null);
      expect(userInfo.threadsWatching).toEqual(expect.arrayContaining([]));
      expect(userInfo.admin).toEqual(true);

      await postTry('/auth/login', 400, { email: USER1.email, password: USER1.password, });
      await postTry('/auth/login', 200, { email: USER1.email, password: 'newpassword1234', });
    });
  });

  describe('PUT /user/admin should', () => {
    it('fail with a bad token', async () => {
      await putTry('/user/admin', 403, {}, INVALID_TOKEN);
    });

    it('fail without the turnon property', async () => {
      await putTry(`/user/admin`, 400, { userId: globals.ret2.userId }, await globals.ret1.token);
    });

    it('successfully become an admin', async () => {
      await putTry(`/user/admin`, 200, { userId: globals.ret2.userId, turnon: true }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${globals.ret2.userId}`, 200, {}, await globals.ret1.token);
      expect(userInfo.admin).toEqual(true);
    });

    it('successfully stay an admin if same signal is sent', async () => {
      await putTry(`/user/admin`, 200, { userId: globals.ret2.userId, turnon: true }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${globals.ret2.userId}`, 200, {}, await globals.ret1.token);
      expect(userInfo.admin).toEqual(true);
    });

    it('successfully un-become an admin', async () => {
      await putTry(`/user/admin`, 200, { userId: globals.ret2.userId, turnon: false }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${globals.ret2.userId}`, 200, {}, await globals.ret1.token);
      expect(userInfo.admin).toEqual(false);
    });

    it('successfully stay not an admin if same signal is sent', async () => {
      await putTry(`/user/admin`, 200, { userId: globals.ret2.userId, turnon: false }, await globals.ret1.token);

      const userInfo = await getTry(`/user?userId=${globals.ret2.userId}`, 200, {}, await globals.ret1.token);
      expect(userInfo.admin).toEqual(false);
    });
  });

});

const THREAD1 = {
  title: 'Where are my fries?',
  isPublic: true,
  content: 'I like fries but I dont have any right now rip',
};
const THREAD2 = {
  title: 'Where is my burger?',
  isPublic: true,
  content: 'So I cant find my burger plz help it was round',
};
const THREAD3 = {
  title: 'Why am I so awesome?',
  isPublic: false,
  content: 'V confused why I\'m so remarkable',
};

describe('Thread post tests', () => {

  const globals = {};

  beforeEach(async () => {
    reset();

    globals.ret1 = await postTry('/auth/register', 200, {
      email: USER1.email,
      password: USER1.password,
      name: USER1.name,
    });

    globals.ret2 = await postTry('/auth/register', 200, {
      email: USER2.email,
      password: USER2.password,
      name: USER2.name,
    });

    globals.ret3 = await postTry('/auth/register', 200, {
      email: USER3.email,
      password: USER3.password,
      name: USER3.name,
    });
    
  });


  beforeAll(() => {
    server.close();
  });

  describe('POST /thread should', () => {
    it('fail with a bad token', async () => {
      await postTry('/thread', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await postTry(`/thread`, 400, { }, await globals.ret1.token);
    });

    it('can create a new valid thread post', async () => {
      const thread = await postTry(`/thread`, 200, THREAD1, await globals.ret1.token);

    });

  });

  describe('GET /threads should', () => {
    it('fail with a bad token', async () => {
      await getTry('/threads?start=0', 403, {}, INVALID_TOKEN);
    });

    it('return the right core elements for a basic thread post', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(1);

      const threadId = threads[0];
      const thread = await getTry(`/thread?id=${threadId}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD1.title);
      expect(thread.isPublic).toBe(THREAD1.isPublic);
      expect(thread.content).toBe(THREAD1.content);
      expect(thread.likes).toEqual(expect.objectContaining({}));
      expect(thread.watchees).toEqual(expect.objectContaining({}));
      expect(thread.lock).toEqual(false);
    });

    it('return a public thread for the other user too', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret1.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(1);
    });

    it('stores the correct number of public thread posts', async () => {
      await postTry(`/thread`, 200, THREAD1, await globals.ret1.token);
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await postTry(`/thread`, 200, THREAD3, await globals.ret3.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(3);
    });

    it('stores the correct number of private thread posts made by others', async () => {
      await postTry(`/thread`, 200, THREAD1, await globals.ret1.token);
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await postTry(`/thread`, 200, THREAD3, await globals.ret3.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(2);
    });

    it('stores the correct number of private thread posts made by themselves', async () => {
      await postTry(`/thread`, 200, THREAD1, await globals.ret1.token);
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(2);
    });

    it('correctly paginate for no threads at 0', async () => {
      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(0);
    });

    it('correctly paginate for no threads at different start', async () => {
      const threads = await getTry(`/threads?start=3`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(0);
    });

    it('correctly paginate for no threads when can see none', async () => {
      await postTry(`/thread`, 200, THREAD3, await globals.ret1.token);
      
      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(0);
    });

    it('correctly paginate for an admin', async () => {
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));

      let threads = null;

      threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(5);

      let thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD3.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[2]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[3]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD3.title);

      thread = await getTry(`/thread?id=${threads[4]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD2.title);

      // --

      threads = await getTry(`/threads?start=5`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(5);

      thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD3.title);

      thread = await getTry(`/thread?id=${threads[2]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[3]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[4]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD3.title);

      // --

      threads = await getTry(`/threads?start=10`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(2);

      thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret1.token);
      expect(thread.title).toBe(THREAD1.title);
    });

    it('correctly paginate for an owner of private', async () => {
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));

      let threads = null;

      threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(5);

      let thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD3.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[2]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[3]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD3.title);

      thread = await getTry(`/thread?id=${threads[4]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      // --

      threads = await getTry(`/threads?start=5`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(5);

      thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD3.title);

      thread = await getTry(`/thread?id=${threads[2]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[3]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[4]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD3.title);

      // --

      threads = await getTry(`/threads?start=10`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(2);

      thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);
    });

    it('correctly paginate for an non-owner of the threads', async () => {
      await postTry(`/thread`, 200, THREAD1, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD1, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD2, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));
      await postTry(`/thread`, 200, THREAD3, await globals.ret3.token);
      await new Promise((resolve, reject) => setTimeout(resolve, 100));

      let threads = null;

      threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(5);

      let thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[2]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[3]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[4]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      // --

      threads = await getTry(`/threads?start=5`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(3);

      thread = await getTry(`/thread?id=${threads[0]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);

      thread = await getTry(`/thread?id=${threads[1]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD2.title);

      thread = await getTry(`/thread?id=${threads[2]}`, 200, {}, await globals.ret2.token);
      expect(thread.title).toBe(THREAD1.title);

    });

  });

  describe('PUT /thread should', () => {
    it('fail with a bad token', async () => {
      await putTry('/thread', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await putTry(`/thread`, 400, { }, await globals.ret1.token);
    });

    it('fail if wrong person tries to update a thread', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      
      await putTry(`/thread`, 403, { id, title: 'newTitle' }, await globals.ret3.token);
    });

    it('update if an admintries to update a thread', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      
      await putTry(`/thread`, 200, { id, title: 'newTitle' }, await globals.ret1.token);
    });

    it('update the relevant properties of only title is updated', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      
      await putTry(`/thread`, 200, { id, title: 'newTitle' }, await globals.ret2.token);

      const thisThread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret2.token);
      
      expect(thisThread.title).toBe('newTitle');
      expect(thisThread.isPublic).toBe(THREAD1.isPublic);
      expect(thisThread.content).toBe(THREAD1.content);
      expect(thisThread.likes).toEqual(expect.objectContaining({}));
      expect(thisThread.watchees).toEqual(expect.objectContaining({}));
      expect(thisThread.lock).toEqual(false);
    });

    it('update the relevant properties of only lock is updated', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      
      await putTry(`/thread`, 200, { id, lock: true }, await globals.ret2.token);

      const thisThread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret2.token);
      
      expect(thisThread.title).toBe(THREAD1.title);
      expect(thisThread.isPublic).toBe(THREAD1.isPublic);
      expect(thisThread.content).toBe(THREAD1.content);
      expect(thisThread.likes).toEqual(expect.objectContaining({}));
      expect(thisThread.watchees).toEqual(expect.objectContaining({}));
      expect(thisThread.lock).toEqual(true);
    });

    it('update the relevant properties of only isPublic is updated', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      
      await putTry(`/thread`, 200, { id, isPublic: false }, await globals.ret2.token);

      const thisThread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret2.token);
      
      expect(thisThread.title).toBe(THREAD1.title);
      expect(thisThread.isPublic).toBe(false);
      expect(thisThread.content).toBe(THREAD1.content);
      expect(thisThread.likes).toEqual(expect.objectContaining({}));
      expect(thisThread.watchees).toEqual(expect.objectContaining({}));
      expect(thisThread.lock).toEqual(false);
    });

    it('update the relevant properties of only description is updated', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      
      await putTry(`/thread`, 200, { id, content: 'newDescription' }, await globals.ret2.token);

      const thisThread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret2.token);

      expect(thisThread.title).toBe(THREAD1.title);
      expect(thisThread.isPublic).toBe(THREAD1.isPublic);
      expect(thisThread.content).toBe('newDescription');
      expect(thisThread.likes).toEqual(expect.objectContaining({}));
      expect(thisThread.watchees).toEqual(expect.objectContaining({}));
      expect(thisThread.lock).toEqual(false);
    });

    it('fail to update if the thread is locked', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread`, 200, { id, lock: true }, await globals.ret2.token);

      await putTry(`/thread`, 400, { id, content: 'newDescription' }, await globals.ret2.token);
      await putTry(`/thread`, 400, { id, title: 'newTitle' }, await globals.ret1.token);
      await putTry(`/thread`, 400, { id, isPublic: false }, await globals.ret3.token);

    });

  });

  describe('DELETE /thread should', () => {
    it('fail with a bad token', async () => {
      await deleteTry('/thread', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await deleteTry(`/thread`, 400, { }, await globals.ret1.token);
    });

    it('successfully delete a thread', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads.length).toBe(1);

      await deleteTry(`/thread`, 200, { id, image: THREAD2.image }, await globals.ret2.token);

      const threads2 = await getTry(`/threads?start=0`, 200, {}, await globals.ret2.token);
      expect(threads2.length).toBe(0);

      const thisThread = await getTry(`/thread?id=${id}`, 400, {}, await globals.ret2.token);
    });

    it('successfully delete by a non-creator admin', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(1);

      await deleteTry(`/thread`, 200, { id }, await globals.ret1.token);

      const threads2 = await getTry(`/threads?start=0`, 200, {}, await globals.ret1.token);
      expect(threads2.length).toBe(0);

      const thisThread = await getTry(`/thread?id=${id}`, 400, {}, await globals.ret2.token);
    });

    it('fail to delete by non-creator non-admin', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);

      const threads = await getTry(`/threads?start=0`, 200, {}, await globals.ret1.token);
      expect(threads.length).toBe(1);

      await deleteTry(`/thread`, 403, { id }, await globals.ret3.token);
    });
  });

  describe('PUT /thread/like should', () => {
    it('fail with a bad token', async () => {
      await putTry('/thread/like', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await putTry(`/thread/like`, 400, { }, await globals.ret1.token);
    });

    it('successfully add a like to your own post', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret2.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret2.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ globals.ret2.userId ]));
    });

    it('successfully add a like to another persons public post', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret1.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('successfully add a like to a post you dont own as an admin', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret1.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('fail to like a private post you dont own', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await putTry(`/thread/like`, 403, { id, turnon: true }, await globals.ret3.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ ]));
    });

    it('successfully add a like twice with the same effect', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret1.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('successfully like and unlike something', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret1.token);

      let thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));

      await putTry(`/thread/like`, 200, { id, turnon: false }, await globals.ret1.token);

      thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([]));
    });

    it('successfully have multiple people like something', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret3.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret3.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ globals.ret1.userId, globals.ret2.userId, globals.ret3.userId ]));
    });

    it('successfully like and unlike something with multiple people', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: true }, await globals.ret3.token);
      let thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ globals.ret1.userId, globals.ret2.userId, globals.ret3.userId ]));

      await putTry(`/thread/like`, 200, { id, turnon: false }, await globals.ret1.token);
      await putTry(`/thread/like`, 200, { id, turnon: false }, await globals.ret2.token);
      await putTry(`/thread/like`, 200, { id, turnon: false }, await globals.ret3.token);
      thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.likes).toEqual(expect.arrayContaining([ ]));
    });
  });

  describe('PUT /thread/watch should', () => {
    it('fail with a bad token', async () => {
      await putTry('/thread/watch', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await putTry(`/thread/watch`, 400, { }, await globals.ret1.token);
    });

    it('successfully add a watch to your own post', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret2.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret2.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ globals.ret2.userId ]));
    });

    it('successfully add a watch to another persons public post', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret1.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('successfully add a watch to a post you dont own as an admin', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret1.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('fail to watch a private post you dont own', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD3, await globals.ret2.token);
      await putTry(`/thread/watch`, 403, { id, turnon: true }, await globals.ret3.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ ]));
    });

    it('successfully add a watch twice with the same effect', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret1.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('successfully watch and unwatch something', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret1.token);

      let thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ globals.ret1.userId ]));

      await putTry(`/thread/watch`, 200, { id, turnon: false }, await globals.ret1.token);

      thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([]));
    });

    it('successfully have multiple people watch something', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret3.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret3.token);

      const thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ globals.ret1.userId, globals.ret2.userId, globals.ret3.userId ]));
    });

    it('successfully watch and unwatch something with multiple people', async () => {
      const { id } = await postTry(`/thread`, 200, THREAD1, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: true }, await globals.ret3.token);
      let thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ globals.ret1.userId, globals.ret2.userId, globals.ret3.userId ]));

      await putTry(`/thread/watch`, 200, { id, turnon: false }, await globals.ret1.token);
      await putTry(`/thread/watch`, 200, { id, turnon: false }, await globals.ret2.token);
      await putTry(`/thread/watch`, 200, { id, turnon: false }, await globals.ret3.token);
      thread = await getTry(`/thread?id=${id}`, 200, {}, await globals.ret1.token);
      expect(thread.watchees).toEqual(expect.arrayContaining([ ]));
    });
  });

});

describe('Thread COMMENT tests', () => {

  const globals = {};

  beforeEach(async () => {
    reset();

    globals.ret1 = await postTry('/auth/register', 200, {
      email: USER1.email,
      password: USER1.password,
      name: USER1.name,
    });

    globals.ret2 = await postTry('/auth/register', 200, {
      email: USER2.email,
      password: USER2.password,
      name: USER2.name,
    });

    globals.ret3 = await postTry('/auth/register', 200, {
      email: USER3.email,
      password: USER3.password,
      name: USER3.name,
    });

    globals.threadPublic = await postTry(`/thread`, 200, THREAD1, await globals.ret1.token);

    globals.threadPrivate = await postTry(`/thread`, 200, THREAD3, await globals.ret1.token);

    globals.COMMENT1 = {
      threadId: globals.threadPublic.id,
      parentCommentId: null,
      content: 'testing testing',
    }

    globals.COMMENT2 = {
      threadId: globals.threadPrivate.id,
      parentCommentId: null,
      content: 'testing testing',
    }
    
  });


  beforeAll(() => {
    server.close();
  });

  describe('GET /comments should', () => {
    it('fail with a bad token', async () => {
      await getTry('/comments', 403, {}, INVALID_TOKEN);
    });

    it('return empty for no items', async () => {
      const comments = await getTry(`/comments`, 200, { threadId: globals.threadPublic.id }, await globals.ret1.token);
      expect(comments.length).toBe(0);
    });
  });
  
  describe('POST /comment should', () => {
    
    it('fail with a bad token', async () => {
      await postTry('/thread', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await postTry(`/comment`, 400, { }, await globals.ret1.token);
    });

    it('be able to post a new comment', async () => {
      await postTry('/comment', 200, globals.COMMENT1, await globals.ret1.token);
    });

    it('fail to post with an invalid thread id', async () => {
      await postTry('/comment', 400, {
        threadId: 9999999999,
        parentCommentId: null,
        content: 'testing testing',
      }, await globals.ret1.token);
    });

    it('fail to post with an invalid parent comment id', async () => {
      await postTry('/comment', 400, {
        threadId: globals.threadPublic.id,
        parentCommentId: 9999999999,
        content: 'testing testing',
      }, await globals.ret1.token);
    });

    it('fail to post with an empty content', async () => {
      await postTry('/comment', 400, {
        threadId: globals.threadPublic.id,
        parentCommentId: 9999999999,
        content: '',
      }, await globals.ret1.token);
    });

    it('fail to post with a null content', async () => {
      await postTry('/comment', 400, {
        threadId: globals.threadPublic.id,
        parentCommentId: 9999999999,
        content: null,
      }, await globals.ret1.token);
    });

    it('succeed to post with real parent ID', async () => {
      const comment = await postTry('/comment', 200, {
        threadId: globals.threadPublic.id,
        parentCommentId: null,
        content: 'hello',
      }, await globals.ret1.token);

      await postTry('/comment', 200, {
        threadId: globals.threadPublic.id,
        parentCommentId: comment.id,
        content: 'hello',
      }, await globals.ret1.token);
    });

  });

  describe('PUT /comment should', () => {
    it('fail with a bad token', async () => {
      await putTry('/comment', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await putTry(`/comment`, 400, { }, await globals.ret1.token);
    });
    
    it('fail if wrong person tries to update a comment', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      
      await putTry(`/comment`, 403, { id, content: 'newTitle' }, await globals.ret3.token);
    });

    it('update if an admin tries to update a comment', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      
      await putTry(`/comment`, 200, { id, content: 'newTitle' }, await globals.ret1.token);
    });

    it('update the relevant properties of only content is updated', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      
      await putTry(`/comment`, 200, { id, content: 'newContent' }, await globals.ret2.token);

      let comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret2.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      let thisComment = comments[0];
      
      expect(thisComment.content).toBe('newContent');
      expect(thisComment.threadId).toBe(globals.COMMENT1.threadId);
      expect(thisComment.parentCommentId).toBe(globals.COMMENT1.parentCommentId);
      expect(thisComment.likes).toEqual(expect.objectContaining({}));
    });

  });

  describe('DELETE /comment should', () => {
    it('fail with a bad token', async () => {
      await deleteTry('/comment', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await deleteTry(`/comment`, 400, { }, await globals.ret1.token);
    });

    it('successfully delete a comment', async () => {
      const comment = await postTry('/comment', 200, {
        threadId: globals.threadPublic.id,
        parentCommentId: null,
        content: 'testing testing',
      }, await globals.ret1.token);

      await deleteTry(`/comment`, 200, { id: comment.id }, await globals.ret1.token);
    });

    it('successfully delete someone elses comment if youre an admin', async () => {
      const comment = await postTry('/comment', 200, {
        threadId: globals.threadPublic.id,
        parentCommentId: null,
        content: 'testing testing',
      }, await globals.ret2.token);

      await deleteTry(`/comment`, 200, { id: comment.id }, await globals.ret1.token);
    });

    it('fail to delete someone elses comment if you dont own it', async () => {
      const comment = await postTry('/comment', 200, {
        threadId: globals.threadPublic.id,
        parentCommentId: null,
        content: 'testing testing',
      }, await globals.ret2.token);

      await deleteTry(`/comment`, 403, { id: comment.id }, await globals.ret3.token);
    });
  });

  describe('PUT /comment/like should', () => {
    it('fail with a bad token', async () => {
      await putTry('/comment/like', 403, {}, INVALID_TOKEN);
    });

    it('fail without any properties', async () => {
      await putTry(`/comment/like`, 400, { }, await globals.ret1.token);
    });

    it('successfully add a like to your own post', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret2.token);

      const comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret2.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      const comment = comments[0];

      expect(comment.likes).toEqual(expect.arrayContaining([ globals.ret2.userId ]));
    });

    it('successfully add a like to another persons public post', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret1.token);

      const comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      const comment = comments[0];
      expect(comment.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('successfully add a like to a post you dont own as an admin', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret1.token);

      const comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      const comment = comments[0];

      expect(comment.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('fail to like a comment on a private post', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT2, await globals.ret2.token);
      await putTry(`/comment/like`, 403, { id, turnon: true }, await globals.ret3.token);

      const comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(0);
    });

    it('successfully add a like twice with the same effect', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret1.token);

      const comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      const comment = comments[0];

      expect(comment.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));
    });

    it('successfully like and unlike something', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret1.token);

      let comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      let comment = comments[0];

      expect(comment.likes).toEqual(expect.arrayContaining([ globals.ret1.userId ]));

      await putTry(`/comment/like`, 200, { id, turnon: false }, await globals.ret1.token);

      comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      comment = comments[0];

      expect(comment.likes).toEqual(expect.arrayContaining([]));
    });

    it('successfully have multiple people like something', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret3.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret3.token);

      const comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      const comment = comments[0];

      expect(comment.likes).toEqual(expect.arrayContaining([ globals.ret1.userId, globals.ret2.userId, globals.ret3.userId ]));
    });

    it('successfully like and unlike something with multiple people', async () => {
      const { id } = await postTry(`/comment`, 200, globals.COMMENT1, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret1.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: true }, await globals.ret3.token);
      
      let comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      let comment = comments[0];

      expect(comment.likes).toEqual(expect.arrayContaining([ globals.ret1.userId, globals.ret2.userId, globals.ret3.userId ]));

      await putTry(`/comment/like`, 200, { id, turnon: false }, await globals.ret1.token);
      await putTry(`/comment/like`, 200, { id, turnon: false }, await globals.ret2.token);
      await putTry(`/comment/like`, 200, { id, turnon: false }, await globals.ret3.token);
      comments = (await getTry(`/comments?threadId=${globals.threadPublic.id}`, 200, {}, await globals.ret1.token)).filter(t => t.id === id);
      expect(comments.length).toBe(1);
      comment = comments[0];
      expect(comment.likes).toEqual(expect.arrayContaining([ ]));
    });
  });
  
});