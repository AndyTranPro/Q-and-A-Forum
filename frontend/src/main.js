import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

// The base URL for all fetch requests to the backend
const base = `http://localhost:${BACKEND_PORT}/`;

// The default image when no image is provided
const defaultImage = 'https://static.au.edusercontent.com/files/ErO2m11BEEefPg8Ogr1HqduG';

// pages, headers, sections, and modals in the DOM
const pages = document.querySelectorAll('.page');
const header = document.querySelector('header');
const dashboardPage = document.getElementById('dashboard-page');
const createThreadPage = new bootstrap.Modal(document.getElementById('myModal'));
const editThreadPage = new bootstrap.Modal(document.getElementById('edit-thread-modal'));
const editCommentPage = new bootstrap.Modal(document.getElementById('edit-comment-modal'));
const replyCommentPage = new bootstrap.Modal(document.getElementById('reply-comment-modal'));
const updateProfilePage = new bootstrap.Modal(document.getElementById('update-profile-modal'));
const threadPage = document.getElementById('thread-page');
const profilePage = document.getElementById('profile-page');
const commentListElement = document.querySelector('.comment-list');
const threadListElement = document.querySelector('.thread-list');
const userThreadListElement = document.querySelector('#profile-thread-list');

// text that links to a profile page
const profileLink = document.getElementById('profile-link');

// buttons in the DOM
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const registerBtn = document.getElementById('register-btn');
const goToReBtn = document.getElementById('goToRe-btn');
const goToLoBtn = document.getElementById('goToLo-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const updateProfileBtn = document.getElementById('update-profile-btn');
// thread interaction buttons
const createBtn = document.getElementById('create-btn');
const editThreadBtn = document.getElementById('thread-edit-btn');
const likeThreadBtn = document.getElementById('thread-like-btn');
const watchThreadBtn = document.getElementById('thread-watch-btn');
const deleteThreadBtn = document.getElementById('thread-delete-btn');
const loadMoreButton = document.getElementById('more-thread-btn');
const udpateProfileBtn = document.getElementById('update-profile-btn');

// input fields in the DOM
const email = document.getElementById('email');
const password = document.getElementById('password');

// error in the DOM
const error = document.getElementById("error");

// Initialize variables
let curPage = 'login-page';
let targetedAuthor;
let token = null;
let userId = null;
let admin = false;
let shownThreads = 0;
let allThreads = [];
let allAuthors = [];

////////////////////////////////////////////////////////////////////////

/*
    HELPER FUNTIONS
*/

// show the error information
const error_pop = (msg) => {
    error.classList.remove("hide");
    const content = document.getElementById("error-text");
    content.innerText = msg;
};

// check if the current thread is locked
const isThreadLocked = () => {
    // check if the thread is locked
    const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
    const thread = allThreads.find(t => t.id == threadId);
    if (thread.lock) {
        error_pop('This thread is locked!');
        return true;
    }
}

// create a DOM thread in the user's profile page
const createDOMThreadInProfile = (thread) => {
    // get the comments of the thread
    return request(`comments?threadId=${thread.id}`, null, 'GET')
    .then(comments => {
        // Thread container
        const threadElement = document.createElement('div');
        threadElement.id = `profile-thread-${thread.id}`;
        threadElement.classList.add('profile-thread-item');

        // Thread title
        const titleElement = document.createElement('h3');
        titleElement.textContent = thread.title;
        titleElement.classList.add('profile-thread-title');
        threadElement.appendChild(titleElement);

        // Thread content
        const contentElement = document.createElement('p');
        contentElement.textContent = thread.content;
        contentElement.classList.add('profile-thread-content');
        threadElement.appendChild(contentElement);

        // Likes
        const likesElement = document.createElement('p');
        const numLikes = Object.keys(thread.likes).length;
        likesElement.textContent = numLikes > 0 ? `Number of likes: ${numLikes}` : 'No likes';
        likesElement.id = `profile-${thread.id}-likes`;
        likesElement.classList.add('profile-thread-info');
        threadElement.appendChild(likesElement);

        // comments
        const commentsElement = document.createElement('p');
        const numComments = comments.length;
        commentsElement.textContent = numComments > 0 ? `Number of comments: ${numComments}` : 'No comments';
        commentsElement.id = `profile-${thread.id}-comments`;
        commentsElement.classList.add('profile-thread-info');
        threadElement.appendChild(commentsElement);

        return threadElement;
    })
    .catch(error => {
        console.error(error);
        error_pop(error);
    });
}

// create a DOM element for a comment
const createDOMComment = (comment, level) => {
    return getUserById(comment.creatorId)
    .then(author => {
        const commentElement = document.createElement('div');
        commentElement.id = `comment-${comment.id}`;
        commentElement.classList.add('comment-layout');
        // identation for nested comments
        commentElement.style.paddingLeft = `${level * 30}px`;

        // Creator's avatar
        const commentAvatar = document.createElement('div');
        const creatorAvatar = document.createElement('img');
        creatorAvatar.classList.add('comment-creator-avatar');
        creatorAvatar.src = author.image ? author.image : defaultImage;
        commentAvatar.appendChild(creatorAvatar);
        commentElement.appendChild(commentAvatar);

        // comment body
        const body = document.createElement('div');
        body.classList.add('comment-body');
        commentElement.appendChild(body);

        // Creator's name
        const creatorNameElement = document.createElement('p');
        creatorNameElement.textContent = author.name;
        creatorNameElement.classList.add('comment-creator-name');
        body.appendChild(creatorNameElement);

        // Comment text
        const textElement = document.createElement('p');
        textElement.classList.add('comment-content');
        textElement.textContent = comment.content;
        body.appendChild(textElement);

        // create DOM element for thread interactions
        const interactions = document.createElement('div');
        interactions.classList.add('comment-interactions');
        body.appendChild(interactions);

        // Post date
        const postDateElement = document.createElement('p');
        const time = dateTimeFormatter(comment.createdAt).match(/(\d+ [a-zA-Z]+ ago)/);
        postDateElement.textContent = time ? time[0] : 'just now';
        postDateElement.classList.add('comment-info', 'comment-date');

        // Likes
        // create heart fill icon
        const heartIcon = document.createElement('i');
        heartIcon.classList.add('bi', 'bi-heart-fill');
        const likesElement = document.createElement('p');
        const numLikes = Object.keys(comment.likes).length;
        likesElement.textContent = numLikes;
        likesElement.classList.add('comment-info', 'comment-likes');

        // reply text
        const replyText = document.createElement('span');
        replyText.classList.add('reply-comment');
        replyText.textContent = 'Reply';
        replyText.style.fontWeight = 'bold';

        // edit text
        const editText = document.createElement('span');
        editText.classList.add('edit-comment');
        editText.textContent = 'Edit';
        editText.style.fontWeight = 'bold';

        // add the heart icon, likes, date and edit text to the interactions container
        interactions.appendChild(heartIcon);
        interactions.appendChild(likesElement);
        interactions.appendChild(replyText);
        interactions.appendChild(editText);
        interactions.appendChild(postDateElement);

        // highlight the like button if the user has already liked the comment
        highlightLikeCommentButton(comment, heartIcon);

        // hide the edit text if the user is neither the author nor an admin
        if (userId !== comment.creatorId && !admin) { editText.classList.add('hide'); }

        // define the event handler function
        const handleAuthorNameClick = () => {
            displayProfilePage(author);
        };

        // add event listener to the author's name
        creatorNameElement.addEventListener('click', handleAuthorNameClick);

        // add event listener to the like icon
        heartIcon.addEventListener('click', () => {
            handleLikeComment(comment, heartIcon);
            highlightLikeCommentButton(comment, heartIcon);
        });

        // add event listener to the edit text
        editText.addEventListener('click', () => {
            // check if the thread is locked
            if (isThreadLocked()) { return; }
            // set the pre-populated values
            document.getElementById('edit-comment-title').textContent = `Editing the comment ${comment.id}`
            document.getElementById('edit-comment-content').textContent = comment.content;
            editCommentPage.show();
        });

        // add event listener to the reply text
        replyText.addEventListener('click', () => {
            // check if the thread is locked
            if (isThreadLocked()) { return; }
            document.getElementById('reply-comment-content').value = '';
            document.getElementById('reply-comment-title').textContent = `Replying to comment ${comment.id}`;
            replyCommentPage.show();
        });

        return commentElement;
    })
    .catch(error => {
        console.error(error);
        error_pop(error);
    });
}

// translate a thread object to a DOM element
const createDOMThread = (thread, author) => {
    // Thread container
    const threadElement = document.createElement('div');
    threadElement.id = `thread-${thread.id}`;
    threadElement.className = 'thread-item';
    threadElement.classList.add('hide');

    // Thread title
    const titleElement = document.createElement('h3');
    titleElement.textContent = thread.title;
    threadElement.appendChild(titleElement);

    // Post date
    const postDateElement = document.createElement('p');
    postDateElement.textContent = `Posted on: ${dateTimeFormatter(thread.createdAt)}`;
    postDateElement.classList.add('thread-info');
    threadElement.appendChild(postDateElement);

    // Author
    const authorElement = document.createElement('p');
    authorElement.textContent = `Author: ${author}`;
    authorElement.classList.add('thread-info');
    authorElement.classList.add('author');
    threadElement.appendChild(authorElement);

    // Likes
    const likesElement = document.createElement('p');
    const numLikes = Object.keys(thread.likes).length;
    likesElement.textContent = numLikes > 0 ? `Likes: ${numLikes}` : 'No likes';
    likesElement.id = 'likes';
    likesElement.classList.add('thread-info');
    threadElement.appendChild(likesElement);

    // add event listener to the thread element
    threadElement.addEventListener('click', () => {
        // remove the comment elements of the previous thread page
        removeAllComments();
        // reset the comment area
        document.getElementById('comment-content').value = '';
        highlightThreadInDOM(threadElement);
        displayThreadPage(thread);
        highlightLikeButton(thread);
        highlightWatchButton(thread);
    });

    return threadElement;
}

// translate date object to a date string
const dateTranslator = (date) => {
    return new Date(date).toLocaleDateString();
}

// translate time object to a time string
const timeTranslator = (date) => {
    return new Date(date).toLocaleTimeString();
}

// format date and time
const dateTimeFormatter = (date) => {
    const postDate = dateTranslator(new Date(date));
    const postTime = timeTranslator(new Date(date));
    const timeDifference = Math.abs(new Date() - new Date(date));

    const differenceInMinutes = Math.floor(timeDifference / 1000 / 60);
    const differenceInHours = Math.floor(differenceInMinutes / 60);
    const differenceInDays = Math.floor(differenceInHours / 24);
    const differenceInWeeks = Math.floor(differenceInDays / 7);

    // if the post was made less than a minute ago
    if (differenceInMinutes < 1) {
        return `${postDate} at ${postTime} just now`;
    }

    // if the post was made a while ago
    let timeDifferenceString = '';
    if (differenceInWeeks > 0) {
        timeDifferenceString = `${differenceInWeeks} week${differenceInWeeks > 1 ? 's' : ''}`;
    } else if (differenceInDays > 0) {
        timeDifferenceString = `${differenceInDays} day${differenceInDays > 1 ? 's' : ''}`;
    } else if (differenceInHours > 0) {
        timeDifferenceString = `${differenceInHours} hour${differenceInHours > 1 ? 's' : ''}`;
    } else {
        timeDifferenceString = `${differenceInMinutes} minute${differenceInMinutes > 1 ? 's' : ''}`;
    }

    return `${postDate} at ${postTime} (${timeDifferenceString} ago)`;
}

////////////////////////////////////////////////////////////////////////

/*
    API FUNCTIONS
*/

// get thread details function
const getThreadDetails = (id) => {
    return request(`thread?id=${id}`, null, 'GET')
        .then(thread => {
            // check if the thread is already in allThreads
            if (!allThreads.some(t => t.id === thread.id)) {
                allThreads.unshift(thread);
            }
        })
        .catch(error => console.error('Error fetching thread details:', error));
}

// get all threads recursively
const getThreads = (start = 0) => {
    return request(`threads?start=${start}`, null, 'GET')
        .then(threads => {
            if (threads.length > 0) {
                return Promise.all(threads.map(t => getThreadDetails(t)))
                    .then(() => getThreads(start + 5)) // Call the function again with incremented start
                    .catch(error => console.error('Error fetching thread details:', error));
            }
        })
        .catch(error => console.error('Error fetching threads:', error));
};

// get all threads that the targeted user has created then display them in the profile page
const getUserThreads = (givenUserId) => {
    let userThreads = allThreads.filter(t => t.creatorId === givenUserId);
    // if the viewer is neither the author nor an admin show only public threads
    if (userId !== givenUserId && !admin) {
        userThreads = userThreads.filter(t => t.isPublic);
    }
    // sort threads by post date
    userThreads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return Promise.all(userThreads.map(t => createDOMThreadInProfile(t)))
    .then(threadElements => {
        threadElements.forEach(threadElement => {
            if (!userThreadListElement.contains(threadElement)) {
                userThreadListElement.appendChild(threadElement);
            }
        });
    });
}

// get user by id
const getUserById = (userId) => {
    return request(`user?userId=${userId}`, null, 'GET');
}

// update author name in all threads
const updateAuthorInThreads = (threads) => {
    // create an array of promises
    const promises = threads.map(thread => {
        return getUserById(thread.creatorId)
            .then(user => {
                if (user) {
                    thread.creatorName = user.name;
                }
                // Update the author in allAuthors
                if (!allAuthors.some(author => author.id === user.id)) {
                    allAuthors.push(user);
                }
            });
    });
    // return a promise that resolves when all the promises have resolved
    return Promise.all(promises);
}

// Send request to the server
const request = (path, data, method) => {
    // check online status
    if (!window.navigator.onLine) {
        alert('Operation failed. Please check your network connection!');
        return Promise.reject();
    }

    const body = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    }

    if (method !== 'GET') {
        body.body = JSON.stringify(data);
    }

    if (token) {
        body.headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${base}${path}`, body)
        .then(res => res.json())
        .then((data) => {
            if (data.error) {
                error_pop(data.error);
                return Promise.reject(data.error);
            } else {
                return Promise.resolve(data);
            }
        });
}

////////////////////////////////////////////////////////////////////////

/*
    EVENT HANDLERS
*/

// handling the liking comment
const handleLikeComment = (comment, likeCommentBtn) => {
    console.log(comment);
    // check if the thread is locked
    if (isThreadLocked()) { return; }
    // get the id of the clicked comment
    const commentId = comment.id;
    // check if the user has already liked the comment
    if (comment.likes.includes(userId)) {
        // unlike the comment
        comment.likes = comment.likes.filter(id => id !== userId);
        // unhighlight the like button
        likeCommentBtn.classList.remove('liked');
        likeComment(comment, { id: commentId, turnon: false })
    } else {
        // like the comment
        comment.likes.push(userId);
        // highlight the like button
        likeCommentBtn.classList.add('liked');
        likeComment(comment, { id: commentId, turnon: true });
    }
}

const likeComment = (comment, body) => {
    return request('comment/like', body, 'PUT')
        .then(() => {
            // update the comment in the thread page
            const numLikes = comment.likes.length;
            const commentElement = document.getElementById(`comment-${comment.id}`);
            commentElement.querySelector('.comment-likes').textContent = numLikes;
        })
        .catch(error => {
            console.error('Error liking comment:', error);
            error_pop(error);
        });
}

// handling the liking and watching thread
const handleLikeWatchThread = (action) => {
    console.log(action);
    const actor = action === 'like' ? 'likes' : 'watchees';
    // get the id of the clicked thread
    const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
    // get the thread details
    const thread = allThreads.find(t => t.id == threadId);

    // check if the thread is locked and the action is like
    if (thread.lock && action === 'like') {
        error_pop('This thread is locked!');
        return;
    }

    // check if the user has already liked the thread
    if (thread[actor].includes(userId)) {
        // unlike the thread
        thread[actor] = thread[actor].filter(id => id !== userId);
        // unhighlight the appropriate button
        action === 'like' ? likeThreadBtn.classList.remove('liked') : watchThreadBtn.classList.remove('liked');
        likeWatchThread(thread, { id: threadId, turnon: false }, action);
    } else {
        // like the thread
        thread[actor].push(userId);
        // highlight the appropriate button
        action === 'like' ? likeThreadBtn.classList.add('liked') : watchThreadBtn.classList.add('liked');
        likeWatchThread(thread, { id: threadId, turnon: true }, action);
    }
}

// liking or watching a thread
const likeWatchThread = (thread, body, action) => {
    const actionPath = `thread/${action}`;
    return request(actionPath, body, 'PUT')
    .then(() => {
        if (action === 'like') {
            action = 'likes';
            //get the number of likes
            const numLikes = thread.likes.length;
            // update the thread in the DOM
            const newLikes = numLikes > 0 ? `Likes: ${numLikes}` : 'No likes';
            document.getElementById(`thread-${thread.id}`).querySelector('#likes').textContent = newLikes;
            // update the thread page
            threadPage.querySelector('#thread-likes').textContent = numLikes;
        } else {
            action = 'watchees';
        }
        // update the thread in allThreads
        allThreads = allThreads.map(t => {
            if (t.id == thread.id) {
                thread[action].forEach(id => {
                    if (!t[action].includes(id)){
                        t[action].push(id);
                    }
                });
                console.log(t[action]);
            }
            return t;
        });
    })
    .catch(error => {
        console.error(`Error ${action}ing thread:`, error);
        error_pop(error);
    });
}

// update comment
const updateComment = (commentId, newContent) => {
    // check if the thread is locked
    if (isThreadLocked()) { return; }
    const body = {
        id: commentId,
        content: newContent
    }
    return request('comment', body, 'PUT')
        .then(() => {
            // hide the edit comment page
            editCommentPage.hide();
            // update the comment in the DOM
            const commentElement = document.getElementById(`comment-${commentId}`);
            commentElement.querySelector('.comment-content').textContent = newContent;
        })
        .catch(error => {
            console.error('Error updating comment:', error);
            // hide the edit comment page
            editCommentPage.hide();
            // show error message
            error_pop(error);
        });
}

// update profile
const updateProfile = (newName, newEmail, newPassword, newImage) => {
    const body = {}
    if (newName) { body.name = newName; }
    if (newEmail) { body.email = newEmail; }
    if (newPassword) { body.password = newPassword; }
    if (newImage) { body.image = newImage; }
    return request('user', body, 'PUT')
    .then(() => {
        // update the user in the DOM
        if (newName) { document.getElementById('user-name').textContent = newName; }
        if (newEmail) { document.getElementById('user-email').textContent = newEmail; }
        if (newImage) { document.getElementById('profile-image').src = newImage; }
        // update the user in allAuthors
        allAuthors = allAuthors.map(author => {
            if (author.id == userId) {
                if (newName) { author.name = newName; }
                if (newEmail) { author.email = newEmail; }
                if (newImage) { author.image = newImage; }
            }
            return author;
        });
        // reset the input fields in the update profile page
        document.getElementById('update-name').value = '';
        document.getElementById('update-email').value = '';
        document.getElementById('update-password').value = '';
        document.getElementById('img-upload').value = '';
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        // hide the update profile page
        updateProfilePage.hide();
        // show error message
        error_pop(error);
    });
}

// update the user's permission level
const updatePermission = (userId, turnon) => {
    const body = {
        userId: userId,
        turnon: turnon
    }
    return request('user/admin', body, 'PUT')
    .then(() => {
        // update the user in allAuthors
        allAuthors = allAuthors.map(author => {
            if (author.id == userId) {
                author.admin = turnon;
            }
            return author;
        });
    })
    .catch(error => {
        console.error('Error updating permission:', error);
        error_pop(error);
    });
}

// update thread
const updateThread = (id, title, isPublic, content, lock) => {
    const body = {
        id: id,
        title: title,
        isPublic: isPublic,
        content: content,
        lock: lock
    }
    return request('thread', body, 'PUT')
        .then(() => {
            // hide the edit thread page
            editThreadPage.hide();
            // update the thread in allThreads
            allThreads = allThreads.map(t => {
                if (t.id == id) {
                    t.title = title;
                    t.content = content;
                    t.isPublic = isPublic;
                    t.lock = lock;
                }
                return t;
            });
            // update the thread in the DOM
            const threadElement = document.getElementById(`thread-${id}`);
            threadElement.querySelector('h3').textContent = title;
            // update the thread page
            threadPage.querySelector('h1').textContent = title;
            threadPage.querySelector('#thread-page-content').textContent = content;
        })
        .catch((error) => {
            console.error('Error updating thread:', error)
            // hide the edit thread page
            editThreadPage.hide();
            // show error message
            error_pop(error);
        });
}

// Delete thread function
const deleteThread = (e) => {
    e.preventDefault();
    const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
    const body = { id: threadId };
    request('thread', body, 'DELETE')
        .then(() => {
            // remove the thread from allThreads
            allThreads = allThreads.filter(t => t.id != threadId);
            // remove the thread from the DOM
            const threadElement = document.getElementById(`thread-${threadId}`);
            threadElement.remove();
            // hide the thread page
            threadPage.classList.add('hide');

            // redirect to the latest individual thread post from the thread list
            const latestThread = allThreads[0];
            displayThreadPage(latestThread);
            highlightThreadInDOM(document.getElementById(`thread-${latestThread.id}`));
        })
        .catch(error => {
            console.error('Error deleting thread:', error);
            error_pop(error);
        });
}

// create thread function
const createThread = (e) => {
    e.preventDefault();
    const title = document.getElementById('thread-title').value;
    const content = document.getElementById('thread-content').value;
    const isPublic = document.getElementById('thread-privacy').value === 'public' ? true : false;
    if (title === '' || content === '') {
        alert('Please fill in all fields!');
    } else {
        const body = {
            title: title,
            isPublic: isPublic,
            content: content
        }
        console.log(body);
        request('thread', body, 'POST')
            .then(data => {
                createThreadPage.hide();
                console.log(data);
                // get the thread details
                return request(`thread?id=${data.id}`, null, 'GET');
            })
            .then((thread) => {
                allThreads.unshift(thread);
                // display the thread page
                displayThreadPage(thread);
                // update author name in all threads
                return updateAuthorInThreads(allThreads);
            })
            .then(() => {
                // create a new thread element in the DOM
                const newThreadElement = createDOMThread(allThreads[0], allThreads[0].creatorName);
                // display the new thread element
                newThreadElement.classList.remove('hide');

                highlightThreadInDOM(newThreadElement);
                threadListElement.prepend(newThreadElement);
                // increment shownThreads
                shownThreads++;
            })
            .catch((error) => {
                console.error('Error creating thread:', error)
                // hide the edit thread page
                createThreadPage.hide();
                // show error message
                error_pop(error);
            });
    }

}

// create a comment
const createComment = (threadId, content, parentCommentId = null) => {
    const body = {
        content: content,
        threadId: threadId,
        parentCommentId: parentCommentId
    }
    return request('comment', body, 'POST')
    .then(() => {
        // hide the reply comment page
        replyCommentPage.hide();
        // get the id of the clicked thread
        const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
        // update the comment in the thread page
        removeAllComments();
        displayThreadComments(threadId);
    })
    .catch(error => {
        console.error('Error creating comment:', error);
        error_pop(error);
    });
}

// register function
const register = (e) => {
    e.preventDefault();
    const registerEmail = document.getElementById('re-email').value;
    const name = document.getElementById('name').value;
    const pwd = document.getElementById('re-password').value;
    const repwd = document.getElementById('confirm-password').value;
    if (registerEmail === '' || name === '' || pwd === '' || repwd === '') {
        error_pop('Please fill in all blank!');
    }
    else if (pwd !== repwd) {
        error_pop('Two passwords don\'t match!');
    } else {
        const body = {
            email: registerEmail,
            password: pwd,
            name: name
        }
        request('auth/register', body, 'POST')
            .then(data => {
                // store the token in the local storage
                token = data.token;
                userId = data.userId;
                console.log(token);
                localStorage.setItem('token', token);
                // get all threads
                return getThreads();
            })
            .then(() => {
                // update author name in all threads
                return updateAuthorInThreads(allThreads);
            })
            .then(() => {
                return getUserById(userId);
            })
            .then((user) => {
                profileLink.textContent = user.name;
                admin = user.admin;
                // add all threads to the DOM
                addThreadsToDOM(allThreads);
                // display the first 5 threads
                displayThreads(shownThreads);
                render();
            })
            .catch(err => console.log(err))
    }
}

// login function
const login = (e) => {
    e.preventDefault();
    if (email.value === '' || password.value === '') {
        error_pop('Please fill in all fields!');
    } else {
        const body = {
            email: email.value,
            password: password.value
        }
        request('auth/login', body, 'POST')
            .then(data => {
                token = data.token;
                userId = data.userId;
                console.log(token);
                localStorage.setItem('token', token);
                // get all threads
                return getThreads();
            })
            .then(() => {
                // update author name in all threads
                return updateAuthorInThreads(allThreads);
            })
            .then(() => {
                return getUserById(userId);
            })
            .then((user) => {
                profileLink.textContent = user.name;
                admin = user.admin;
                // add all threads to the DOM
                addThreadsToDOM(allThreads);
                // display the first 5 threads
                displayThreads(shownThreads);
                render();
            })
            .catch(err => console.log(err))
    }
}

// logout function
const logout = (e) => {
    e.preventDefault();
    token = null;
    userId = null;
    admin = false;
    localStorage.removeItem('token');
    curPage = 'login-page';
    // remove all threads
    removeAllThreads();
    // show load more button
    loadMoreButton.classList.remove('hide');
    // hide thread page
    threadPage.classList.add('hide');
    // reset shownThreads
    shownThreads = 0;
    // reset allThreads
    allThreads = [];
    // reset allAuthors
    allAuthors = [];
    render();
}

////////////////////////////////////////////////////////////////////////

/*
    User Interface Functions
*/

// render the page
const render = () => {
    if (token !== null) {
        curPage = 'dashboard-page';
    }
    pages.forEach(page => {
        page.style.display = 'none';
    });

    if (curPage !== 'login-page' && curPage !== 'register-page') {
        header.classList.add('hide');
    } else {
        header.classList.remove('hide');
    }
    if (curPage === 'dashboard-page') {
        document.querySelector('#' + curPage).style.display = 'flex';
    } else {
        document.querySelector('#' + curPage).style.display = 'block';
    }
}

// add all threads to the DOM
const addThreadsToDOM = (threads) => {
    // sort threads by post date
    threads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    threads.forEach(t => {
        threadListElement.appendChild(createDOMThread(t, t.creatorName));
    });
}

// remove all threads from the DOM
const removeAllThreads = () => {
    while (threadListElement.firstChild) {
        threadListElement.removeChild(threadListElement.firstChild);
    }
}

// remove all threads from the DOM in the profile page
const removeAllThreadsInProfile = () => {
    while (userThreadListElement.firstChild) {
        userThreadListElement.removeChild(userThreadListElement.firstChild);
    }
}

// remove all comments from the DOM
const removeAllComments = () => {
    while (commentListElement.firstChild) {
        commentListElement.removeChild(commentListElement.firstChild);
    }
}

// display the next 5 threads in the list
const displayThreads = (start = 0) => {
    const threads = allThreads.slice(start, start + 5);
    threads.forEach(t => {
        const threadElement = document.getElementById(`thread-${t.id}`);
        threadElement.classList.remove('hide');
        shownThreads++;
    });
}

// display the thread comments
const displayThreadComments = (threadId) => {
    return request(`comments?threadId=${threadId}`, null, 'GET')
        .then(comments => {
            comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const topLevelComments = comments.filter(comment => !comment.parentCommentId);

            let promiseChain = Promise.resolve();
            topLevelComments.forEach(comment => {
                promiseChain = promiseChain.then(() => processComment(comment, comments, 0));
            });
            return promiseChain;
        })
        .catch(error => {
            console.error('Error fetching comments:', error);
            error_pop(error);
        });
}

// processes a comment and its child comments recursively
const processComment = (comment, allComments, level) => {
    return createDOMComment(comment, level).then(commentElement => {
        commentListElement.appendChild(commentElement);
        // get all child comments of the current comment and sort them by post date
        const childComments = allComments.filter(child => child.parentCommentId === comment.id);
        childComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // process each child comment recursively using a promise chain
        let promiseChain = Promise.resolve();
        childComments.forEach(child => {
            promiseChain = promiseChain.then(() => processComment(child, allComments, level + 1));
        });
        return promiseChain;
    });
};

// display the thread page
const displayThreadPage = (thread) => {
    threadPage.classList.remove('hide');
    // hide the edit & delete buttons if the user is neither the author nor an admin
    if (userId !== thread.creatorId && !admin) {
        threadPage.querySelector('#thread-edit-btn').classList.add('hide');
        threadPage.querySelector('#thread-delete-btn').classList.add('hide');
    } else {
        threadPage.querySelector('#thread-edit-btn').classList.remove('hide');
        threadPage.querySelector('#thread-delete-btn').classList.remove('hide');
    }

    // NEW FEATURE
    // get the author's details
    const author = allAuthors.find(author => author.id === thread.creatorId);
    threadPage.querySelector('#thread-page-author-image').src = author.image ? author.image : defaultImage;
    threadPage.querySelector('#thread-page-author-name').textContent = author.name;
    const postTime = dateTimeFormatter(thread.createdAt).match(/(\d+ [a-zA-Z]+ ago)/);
    threadPage.querySelector('#thread-page-date').textContent = postTime ? postTime[0] : 'just now';

    // NEW FEATURE
    // add the lock icon if the thread is locked
    threadPage.querySelector('h1').textContent = thread.title;
    if (thread.lock) {
        threadPage.querySelector('h1').classList.add('locked');
    } else {
        threadPage.querySelector('h1').classList.remove('locked');
    }
    threadPage.querySelector('#thread-page-content').textContent = thread.content;
    const numLikes = Object.keys(thread.likes).length;
    threadPage.querySelector('#thread-likes').textContent = numLikes;
    highlightLikeButton(thread);
    highlightWatchButton(thread);
    displayThreadComments(thread.id);

    const authorNameElement = threadPage.querySelector('#thread-page-author-name');
    // creates a closure over the author variable to ensure that displayProfilePage is called with the correct author
    targetedAuthor = allAuthors.find(author => author.id === thread.creatorId);

    // remove the previous event listener
    if (handleAuthorNameClick) {
        authorNameElement.removeEventListener('click', handleAuthorNameClick);
    }

    // add event listener to the author's name
    authorNameElement.addEventListener('click', handleAuthorNameClick);
}

// define the event handler function
const handleAuthorNameClick = () => {
    displayProfilePage(targetedAuthor);
};

const displayProfilePage = (user) => {
    // show the buttons in profile according to the permission level of the viewer
    showButtonsInProfile(user);
    // hide the dashboard page
    dashboardPage.classList.add('hide');
    // show the user's profile page
    profilePage.classList.remove('hide');
    // show the user's details
    profilePage.querySelector('#profile-page-title').textContent = user.id === userId ? 'Your Profile' : `${user.name}'s Profile`;
    profilePage.querySelector('#user-threads').textContent = user.id === userId ? 'Your Threads' : `${user.name}'s Threads`;
    profilePage.querySelector('#user-name').textContent = user.name;
    profilePage.querySelector('#user-email').textContent = user.email;
    profilePage.querySelector('#user-admin').textContent = user.admin ? 'Admin' : 'User';
    profilePage.querySelector('#profile-image').src = user.image ? user.image : defaultImage;

    // get the user's threads
    getUserThreads(user.id);
}

// hide all udpate buttons in profile page
const showButtonsInProfile = (user) => {
    // check if the viewer is not an admin
    if (!admin) {
        // hide the admin dropdown menu and show the permission level
        profilePage.querySelector('#permission-type').classList.add('hide');
        profilePage.querySelector('#user-admin').classList.remove('hide');
        // hide the update admin button
        profilePage.querySelector('#update-admin').classList.add('hide');
    } else {
        // show the admin dropdown menu and hide the permission level
        profilePage.querySelector('#permission-type').classList.remove('hide');
        profilePage.querySelector('#permission-type').value = user.admin ? 'admin' : 'user';
        profilePage.querySelector('#user-admin').classList.add('hide');
        // show the update admin button
        profilePage.querySelector('#update-admin').classList.remove('hide');
    }

    // check if the viewer is not the person whose profile is being viewed
    if (userId !== user.id) {
        udpateProfileBtn.classList.add('hide');
        // hide the update image button
        document.querySelector('#img-upload').classList.add('hide');
    } else {
        // show the update profile button
        udpateProfileBtn.classList.remove('hide');
        // show the update image button
        document.querySelector('#img-upload').classList.remove('hide');
    }
}

// highlight the given thread
const highlightThreadInDOM = (threadElement) => {
    threadListElement.querySelectorAll('.thread-item').forEach(t => t.classList.remove('clicked'));
    threadElement.classList.add('clicked');
}

// highlight the like button in thread page
const highlightLikeButton = (thread) => {
    if (thread.likes.includes(userId)) {
        likeThreadBtn.classList.add('liked');
    } else {
        likeThreadBtn.classList.remove('liked');
    }

}

// highlight the watch button
const highlightWatchButton = (thread) => {
    if (thread.watchees.includes(userId)) {
        watchThreadBtn.classList.add('liked');
    } else {
        watchThreadBtn.classList.remove('liked');
    }
}

// highlight the like button in comment
const highlightLikeCommentButton = (comment, likeCommentBtn) => {
    if (comment.likes.includes(userId)) {
        likeCommentBtn.classList.add('liked');
    } else {
        likeCommentBtn.classList.remove('liked');
    }
}

////////////////////////////////////////////////////////////////////////

/*
    MAIN PROGRAM
*/

render();

// close the error message
document.getElementById("error-close-button").addEventListener("click", () => {
    error.classList.add("hide");
});

// Login
loginBtn.addEventListener('click', login);

// Logout
logoutBtn.addEventListener('click', logout);

// Register
registerBtn.addEventListener('click', register);

// Go to register page
goToReBtn.addEventListener('click', (e) => {
    e.preventDefault();
    curPage = 'register-page';
    render();
});

// Go to login page
goToLoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    curPage = 'login-page';
    render();
});

// Go back to dashboard
backToDashboardBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // reset the user's threads in the profile page
    removeAllThreadsInProfile();
    // hide the author's profile page
    profilePage.classList.add('hide');
    // show the thread header and dashboard content
    dashboardPage.classList.remove('hide');
});

// Show create thread page
createBtn.addEventListener('click', (e) => {
    createThreadPage.show();
});

// Show edit thread page
editThreadBtn.addEventListener('click', () => {
    // get the id of the clicked thread
    const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
    console.log(threadId);
    // get the thread details
    const thread = allThreads.find(t => t.id == threadId);
    // check if the thread is locked
    if (thread.lock) {
        error_pop('This thread is locked!');
        return;
    }
    console.log(thread);
    // set the pre-populated values
    document.getElementById('edit-thread-title').value = thread.title;
    document.getElementById('edit-thread-content').value = thread.content;
    document.getElementById('edit-thread-privacy').value = thread.isPublic ? 'public' : 'private';
    document.getElementById('edit-thread-lock').value = thread.lock ? 'true' : 'false';
    editThreadPage.show();
});

// Show the update profile page when the update profile button is clicked
updateProfileBtn.addEventListener('click', () => {
    updateProfilePage.show();
});

// show the current user's profile page when the profile link is clicked
profileLink.addEventListener('click', () => {
    getUserById(userId).then(user => {
        displayProfilePage(user);
    })
    .catch(error => {
        console.error('Error fetching user details:', error);
        error_pop(error);
    });
});

// Update the user's profile
document.getElementById('save-new-profile-btn').addEventListener('click', () => {
    // hide the update profile page
    updateProfilePage.hide();
    const newImageElement = document.getElementById('img-upload');
    let newImage = null;
    if (newImageElement.files && newImageElement.files[0]) {
        newImage = newImageElement.files[0];
    }
    if (newImage) {
        fileToDataUrl(newImage)
        .then(dataUrl => {
            const newEmail = document.getElementById('update-email').value;
            const newName = document.getElementById('update-name').value;
            const newPassword = document.getElementById('update-password').value;
            return updateProfile(newName, newEmail, newPassword, dataUrl);
        });
    } else {
        const newEmail = document.getElementById('update-email').value;
        const newName = document.getElementById('update-name').value;
        const newPassword = document.getElementById('update-password').value;
        return updateProfile(newName, newEmail, newPassword, null);
    }
});

// Update the user's permission level when the update permission button is clicked
document.querySelector('#update-admin').addEventListener('click', () => {
    updatePermission(targetedAuthor.id, !targetedAuthor.admin);
});

// Deleting a thread
deleteThreadBtn.addEventListener('click', (e) => {
    deleteThread(e);
});

// Watching a thread
watchThreadBtn.addEventListener('click', () => {
    handleLikeWatchThread('watch');
});

// Liking a thread
likeThreadBtn.addEventListener('click', () => {
    handleLikeWatchThread('like');
})

// Create thread
document.getElementById('create-thread-btn').addEventListener('click', createThread);

// create comment
document.getElementById('create-comment-btn').addEventListener('click', () => {
    // check if the thread is locked
    if (isThreadLocked()) { return; }
    // get the id of the clicked thread
    const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
    // get the content of the comment
    const content = document.getElementById('comment-content').value;
    document.getElementById('comment-content').value = '';
    // create the comment
    createComment(threadId, content);
});

// Edit thread
document.querySelector('#save-btn').addEventListener('click', () => {
    // get the id of the clicked thread
    const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
    // get the values from the input fields
    const title = document.getElementById('edit-thread-title').value;
    const isPublic = document.getElementById('edit-thread-privacy').value === 'public' ? true : false;
    const content = document.getElementById('edit-thread-content').value;
    const lock = document.getElementById('edit-thread-lock').value === 'true' ? true : false;
    // update thread page
    updateThread(threadId, title, isPublic, content, lock);
})

// Edit comment
document.querySelector('#save-edit-comment-btn').addEventListener('click', () => {
    // get the id of the clicked comment
    const commentId = document.getElementById('edit-comment-title').textContent.split(' ')[3];
    // get the values from the input fields
    const newContent = document.getElementById('edit-comment-content').value;
    // show the edit comment page
    updateComment(commentId, newContent);
});

document.querySelector('#reply-comment-btn').addEventListener('click', () => {
    // get the current thread id
    const threadId = threadListElement.querySelector('.clicked').id.split('-')[1];
    // get the id of the parent comment
    const parentCommentId = parseInt(document.getElementById('reply-comment-title').textContent.split(' ')[3]);
    // get the values from the input fields
    const content = document.getElementById('reply-comment-content').value;
    // show the edit comment page
    createComment(threadId, content, parentCommentId);
});

// Load more threads
loadMoreButton.addEventListener('click', () => {
    displayThreads(shownThreads);
    // Hide the button if there are no more threads to show
    const numThreadsLeft = allThreads.length - shownThreads;
    if (numThreadsLeft < 1) {
        loadMoreButton.classList.add('hide');
    }
});

// hide thread page when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    threadPage.classList.add('hide');
});
