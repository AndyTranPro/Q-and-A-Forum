import fs from 'fs';
import jwt from 'jsonwebtoken';
import AsyncLock from 'async-lock';
import { InputError, AccessError, } from './error';

const lock = new AsyncLock();

const JWT_SECRET = 'donthugmeimscared';
const DATABASE_FILE = './database.json';

/***************************************************************
                       State Management
***************************************************************/

let users = {};
let threads = {};
let comments = {};

const update = (users, threads, comments) =>
  new Promise((resolve, reject) => {
    lock.acquire('saveData', () => {
      try {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify({
          users,
          threads,
          comments,
        }, null, 2));
        resolve();
      } catch {
        reject(new Error('Writing to database failed'));
      }
    });
  });

export const save = () => update(users, threads, comments);
export const reset = () => {
  update({}, {}, 1);
  users = {};
  threads = {};
  comments = {};
};

try {
  const data = JSON.parse(fs.readFileSync(DATABASE_FILE));
  users = data.users;
  threads = data.threads;
  comments = data.comments;
} catch {
  console.log('WARNING: No database found, create a new one');
  save();
}

/***************************************************************
                        Helper Functions
***************************************************************/

const newUserId = _ => generateId(Object.keys(users), 99999);
const newThreadId = _ => generateId(Object.keys(threads));
const newCommentId = _ => generateId(Object.keys(comments));

const dataLock = callback => new Promise((resolve, reject) => {
  lock.acquire('dataLock', callback(resolve, reject));
});

const randNum = max => Math.round(Math.random() * (max - Math.floor(max / 10)) + Math.floor(max / 10));
const generateId = (currentList, max = 999999) => {
  let R = randNum(max).toString();
  while (currentList.includes(R)) {
    R = randNum(max).toString();
  }
  return parseInt(R);
};

/***************************************************************
                         Auth Functions
***************************************************************/

export const getUserIdFromAuthorization = authorization => {
  const token = authorization.replace('Bearer ', '');
  try {
    const { userId, } = jwt.verify(token, JWT_SECRET);
    if (!(userId in users)) {
      throw new AccessError(`Invalid token ${token}`);
    }
    return userId.toString();
  } catch {
    throw new AccessError(`Invalid token ${token}`);
  }
};

export const getUserIdFromEmail = email => {
  return Object.keys(users).find(id => users[id].email === email);
};

export const login = (email, password) => dataLock((resolve, reject) => {
  const userId = getUserIdFromEmail(email);
  if (userId !== undefined && users[userId].password === password) {
    resolve({
      token: jwt.sign({ userId, }, JWT_SECRET, { algorithm: 'HS256', }),
      userId: parseInt(userId, 10),
    });
  }
  reject(new InputError(`Invalid email ${email} or password ${password}`));
});

export const register = (email, password, name) => dataLock((resolve, reject) => {
  if (getUserIdFromEmail(email) !== undefined) {
    throw new InputError(`Email address ${email} already registered`);
  }
  const userId = newUserId();
  users[userId] = {
    email,
    name,
    password,
    image: null,
    admin: Object.keys(users).length === 0 ? true : false,
  };
  resolve({
    token: jwt.sign({ userId, }, JWT_SECRET, { algorithm: 'HS256', }),
    userId: parseInt(userId, 10),
  });
});

/***************************************************************
                       Threads Functions
***************************************************************/

export const assertValidThread = (threadId) => {
  if (!(threadId in threads)) {
    throw new InputError(`Invalid thread post ID ${threadId}`);
  }
};

export const assertValidComment = (commentId, canBeNull = false) => {
  if ((canBeNull && commentId === null) || commentId in comments) {
    return;
  }
  throw new InputError(`Invalid comment ID ${commentId}`);
};

export const assertViewPermissionOfThread = (userId, threadId) => {
  if (!(threads[threadId].isPublic || users[userId].admin || threads[threadId].creatorId == userId)) {
    throw new AccessError(`Authorised user ${userId} is not the creator of this thread ${threadId}`);
  }
};
  
export const assertUnlockedThread = (threadId) => {
  if (threads[threadId].lock) {
    throw new InputError(`This thread ${threadId} is locked`);
  }
};

export const assertEditPermissionOfThread = (userId, threadId) => {
  if (threads[threadId].creatorId !== parseInt(userId, 10) && !users[userId].admin) {
    throw new AccessError(`Authorised user ${userId} is not the creator of this thread ${threadId}`);
  }
};

export const threadsGet = (authUserId, start) => dataLock((resolve, reject) => {
  if (Number.isNaN(start)) {
    throw new InputError(`Invalid start value of ${start}`);
  } else if (start < 0) {
    throw new InputError(`Start value of ${start} cannot be negative`);
  }
  const allThreads = Object.keys(threads).map(pid => threads[pid]);

  const relevantThreads = allThreads.filter(t => t.isPublic || users[authUserId].admin || t.creatorId == authUserId);
    
  relevantThreads.sort((a, b) => (a.createdAt < b.createdAt) ? 1 : -1)
  const nextThreads = relevantThreads.slice(start, start + 5);

  resolve(nextThreads.map(j => parseInt(j.id)));
});

export const threadGet = (authUserId, threadId) => dataLock((resolve, reject) => {
  if (!(threadId in threads)) {
    throw new InputError(`Invalid thread ID ${threadId}`);
  }
  resolve({
    ...threads[threadId],
    likes: Object.keys(threads[threadId].likes).map(x => parseInt(x)),
    watchees: Object.keys(threads[threadId].watchees).map(x => parseInt(x))
  })
});

export const threadNew = (authUserId, title, isPublic, content) => dataLock((resolve, reject) => {
  if (title === undefined || content === undefined || isPublic === undefined || ![true,false].includes(isPublic)) {
    console.log(`Input is: title(${title}), isPublic(${isPublic}), content(${content})`);
    throw new InputError(`Please enter all relevant fields, you entered title(${title}), isPublic(${isPublic}), content(${content})`);
  }
  const newThread = {
    id: newThreadId(),
    creatorId: parseInt(authUserId, 10),
    title,
    isPublic,
    content,
    lock: false,
    createdAt: new Date().toISOString(),
    likes: {},
    watchees: {},
  };
  threads[newThread.id] = newThread;
  resolve(newThread.id)
});

export const threadUpdate = (authUserId, threadId, title, isPublic, content, lock) => dataLock((resolve, reject) => {
  if (title) threads[threadId].title = title;
  if (isPublic !== undefined) threads[threadId].isPublic = isPublic;
  if (content) threads[threadId].content = content;
  if (lock !== undefined) threads[threadId].lock = lock;
  resolve(threads[threadId]);
});

export const threadLikeToggle = (authUserId, threadId, turnon) => dataLock((resolve, reject) => {
  if (turnon) {
    threads[threadId].likes[authUserId] = true;
  } else {
    if (Object.keys(threads[threadId].likes).includes(authUserId)) {
      delete threads[threadId].likes[authUserId];
    }
  }
  resolve(threads[threadId]);
});

export const threadDelete = (authUserId, threadId) => dataLock((resolve, reject) => {
  delete threads[threadId];
  resolve();
});

export const threadWatchToggle = (authUserId, threadId, turnon) => dataLock((resolve, reject) => {
  if (turnon) {
    threads[threadId].watchees[authUserId] = true;
  } else {
    if (Object.keys(threads[threadId].watchees).includes(authUserId)) {
      delete threads[threadId].watchees[authUserId];
    }
  }
  resolve(threads[threadId]);
});

/***************************************************************
                       Comments Functions
***************************************************************/

export const assertEditPermissionOfComment = (userId, commentId) => {
  if (comments[commentId].creatorId !== parseInt(userId, 10) && !users[userId].admin) {
    throw new AccessError(`Authorised user ${userId} is not permitted to edit comment ${commentId}`);
  }
};

export const assertLikePermissionOfComment = (userId, commentId) => {
  assertViewPermissionOfThread(userId, comments[commentId].threadId);
};

export const commentsGet = (authUserId, threadId) => dataLock((resolve, reject) => {
  const commentIdKeys = Object.keys(comments);
  const mappedComments = commentIdKeys.map(id => ({
    ...comments[id],
    id: parseInt(comments[id].id),
    threadId: parseInt(comments[id].threadId),
    likes: Object.keys(comments[id].likes).map(i => parseInt(i)),
  }));
  const filteredComments = mappedComments.filter(c => c.threadId === threadId);
  resolve(filteredComments);
});

export const commentNew = (authUserId, threadId, parentCommentId, content) => dataLock((resolve, reject) => {
  if (threadId === undefined || parentCommentId === undefined || content === undefined) {
    throw new InputError(`Please enter all relevant fields, you entered threadId(${threadId}), parentCommentId(${parentCommentId}), content(${content})`);
  }
  const newComment = {
    id: newCommentId(),
    creatorId: parseInt(authUserId, 10),
    threadId: threadId,
    parentCommentId: parentCommentId,
    content,
    createdAt: new Date().toISOString(),
    likes: {},
  };
  comments[newComment.id] = newComment;
  resolve(newComment.id)
});

export const commentUpdate = (authUserId, commentId, content) => dataLock((resolve, reject) => {
  if (content) comments[commentId].content = content;
  resolve(comments[commentId]);
});

export const commentLikeToggle = (authUserId, commentId, turnon) => dataLock((resolve, reject) => {
  if (turnon) {
    comments[commentId].likes[authUserId] = true;
  } else {
    if (Object.keys(comments[commentId].likes).includes(authUserId)) {
      delete comments[commentId].likes[authUserId];
    }
  }
  resolve(comments[commentId]);
});

export const commentDelete = (authUserId, commentId) => dataLock((resolve, reject) => {
  delete comments[commentId];
  resolve();
});

/***************************************************************
                         User Functions
***************************************************************/

export const assertValidUserId = (userId) => dataLock((resolve, reject) => {
  if (!(userId in users)) {
    throw new InputError(`Invalid user ID ${userId}`);
  }
  resolve();
});

export const assertAdminUserId = (userId) => dataLock((resolve, reject) => {
  if (!users[userId].admin) {
    throw new InputError(`Invalid admin user ID ${userId}`);
  }
  resolve();
});

export const userGet = (userId) => dataLock((resolve, reject) => {
  const intid = parseInt(userId, 10);
  const user = {
    ...users[userId],
    password: undefined,
    id: intid,
  };
  resolve(user);
});

export const userAdminChange = (authUserId, userId, turnon) => dataLock((resolve, reject) => {
  if (turnon === undefined) {
    reject(new InputError('turnon property is missing'));
    return;
  }
  const user = users[userId];
  if (turnon) {
    user.admin = true;
  } else {
    user.admin = false;
  }
  resolve();
});

export const userUpdate = (authUserId, email, password, name, image) => dataLock((resolve, reject) => {
  if (name) { users[authUserId].name = name; }
  if (password) { users[authUserId].password = password; }
  if (image) { users[authUserId].image = image; }
  if (email && getUserIdFromEmail(email) !== undefined) {
    throw new InputError(`Email address ${email} already taken`);
  } else if (email) { users[authUserId].email = email; }
  resolve();
});
