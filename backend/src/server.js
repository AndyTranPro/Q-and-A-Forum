import fs from 'fs';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';

import { InputError, AccessError, } from './error';
import { BACKEND_PORT } from './config.js';
import swaggerDocument from '../swagger.json';
import {
  save,
  reset,
  assertValidUserId,
  assertAdminUserId,
  getUserIdFromAuthorization,
  getUserIdFromEmail,
  login,
  register,
  assertValidThread,
  assertValidComment,
  assertViewPermissionOfThread,
  assertEditPermissionOfThread,
  assertEditPermissionOfComment,
  assertLikePermissionOfComment,
  assertUnlockedThread,
  threadsGet,
  threadGet,
  threadNew,
  threadUpdate,
  threadLikeToggle,
  threadDelete,
  threadWatchToggle,
  commentsGet,
  commentNew,
  commentUpdate,
  commentLikeToggle,
  commentDelete,
  userGet,
  userAdminChange,
  userUpdate,
} from './service';

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true, }));
app.use(express.json({ limit: '50mb', }));

const catchErrors = fn => async (req, res) => {
  try {
    await fn(req, res);
    save();
  } catch (err) {
    if (err instanceof InputError) {
      res.status(400).send({ error: err.message, });
    } else if (err instanceof AccessError) {
      res.status(403).send({ error: err.message, });
    } else {
      console.log(err);
      res.status(500).send({ error: 'A system error ocurred', });
    }
  }
};

/***************************************************************
                         Auth Functions
***************************************************************/

const authed = fn => async (req, res) => {
  const userId = getUserIdFromAuthorization(req.header('Authorization'));
  await fn(req, res, userId);
};

app.post('/auth/login', catchErrors(async (req, res) => {
  const { email, password, } = req.body;
  return res.json(await login(email, password));
}));

app.post('/auth/register', catchErrors(async (req, res) => {
  const { email, password, name, } = req.body;
  return res.json(await register(email, password, name));
}));

/***************************************************************
                        Thread Functions
***************************************************************/

app.get('/threads', catchErrors(authed(async (req, res, authUserId) => {
  const { start, } = req.query;
  return res.json(await threadsGet(authUserId, parseInt(start, 10)));
})));

app.get('/thread', catchErrors(authed(async (req, res, authUserId) => {
  const { id, } = req.query;
  return res.json(await threadGet(authUserId, id));
})));

app.post('/thread', catchErrors(authed(async (req, res, authUserId) => {
  const { title, isPublic, content } = req.body;
  return res.json({
    id: await threadNew(authUserId, title, isPublic, content),
  });
})));

app.put('/thread', catchErrors(authed(async (req, res, authUserId) => {
  const { id, title, isPublic, content, lock } = req.body;
  await assertValidThread(id);
  await assertUnlockedThread(id);
  await assertEditPermissionOfThread(authUserId, id);
  await threadUpdate(authUserId, id, title, isPublic, content, lock);
  return res.status(200).send({});
})));

app.delete('/thread', catchErrors(authed(async (req, res, authUserId) => {
  const { id, } = req.body;
  await assertValidThread(id);
  await assertEditPermissionOfThread(authUserId, id);
  await threadDelete(authUserId, id);
  return res.status(200).send({});
})));

app.put('/thread/like', catchErrors(authed(async (req, res, authUserId) => {
  const { id, turnon } = req.body;
  await assertValidThread(id);
  await assertViewPermissionOfThread(authUserId, id);
  await threadLikeToggle(authUserId, id, turnon);
  return res.status(200).send({});
})));

app.put('/thread/watch', catchErrors(authed(async (req, res, authUserId) => {
  const { id, turnon } = req.body;
  await assertValidThread(id);
  await assertViewPermissionOfThread(authUserId, id);
  await threadWatchToggle(authUserId, id, turnon);
  return res.status(200).send({});
})));

/***************************************************************
                        Comment Functions
***************************************************************/

app.get('/comments', catchErrors(authed(async (req, res, authUserId) => {
  const { threadId, } = req.query;
  return res.json(await commentsGet(authUserId, parseInt(threadId)));
})));

app.post('/comment', catchErrors(authed(async (req, res, authUserId) => {
  const { threadId, parentCommentId, content } = req.body;
  await assertValidThread(threadId);
  await assertValidComment(parentCommentId, true);
  return res.json({
    id: await commentNew(authUserId, threadId, parentCommentId, content),
  });
})));

app.put('/comment', catchErrors(authed(async (req, res, authUserId) => {
  const { id, content } = req.body;
  await assertValidComment(id);
  await assertEditPermissionOfComment(authUserId, id);
  await commentUpdate(authUserId, id, content);
  return res.status(200).send({});
})));

app.delete('/comment', catchErrors(authed(async (req, res, authUserId) => {
  const { id, } = req.body;
  await assertValidComment(id);
  await assertEditPermissionOfComment(authUserId, id);
  await commentDelete(authUserId, id);
  return res.status(200).send({});
})));

app.put('/comment/like', catchErrors(authed(async (req, res, authUserId) => {
  const { id, turnon } = req.body;
  await assertValidComment(id);
  await assertLikePermissionOfComment(authUserId, id);
  await commentLikeToggle(authUserId, id, turnon);
  return res.status(200).send({});
})));

/***************************************************************
                        User Functions
***************************************************************/

app.get('/user', catchErrors(authed(async (req, res, authUserId) => {
  const { userId, } = req.query;
  await assertValidUserId(userId);
  return res.json(await userGet(userId));
})));

app.put('/user/admin', catchErrors(authed(async (req, res, authUserId) => {
  const { userId, turnon } = req.body;
  await assertValidUserId(userId);
  await assertAdminUserId(authUserId);
  await userAdminChange(authUserId, userId, turnon);
  return res.status(200).send({});
})));

app.put('/user', catchErrors(authed(async (req, res, authUserId) => {
  const { email, password, name, image } = req.body;
  await userUpdate(authUserId, email, password, name, image);
  return res.status(200).send({});
})));

/***************************************************************
                       Running Server
***************************************************************/

app.get('/', (req, res) => res.redirect('/docs'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = BACKEND_PORT || 5000;

const server = app.listen(port, () => {
  console.log(`Backend is now listening on port ${port}!`);
  console.log(`For API docs, navigate to http://localhost:${port}`);
});

export default server;
