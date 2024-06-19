# Questions and answers forum

1. Background
2. Running the application

## 1. Background

A single page app that is built in Vanilla.js frameworks. This project is a simple and lightweight version of [Ed Discussion](https://edstem.org/)

## 2. Running the application

### 2.1. The Frontend

To work with the frontend code locally with the web server, you may have to run another web server to serve the frontend's static files.

To do this, run the following command once on your machine:

`$ npm install --global http-server`

Then whenever you want to start your server, run the following in your project's root folder:

`$ npx http-server frontend -c 1 -p [port]`

Where `[port]` is the port you want to run the server on (e.g. `8080`). Any number is fine.

This will start up a second HTTP server where if you navigate to `http://localhost:8000` (or whatever URL/port it provides) it will run your `index.html` without any CORs issues.

### 2.2. The Backend

This web app uses a simple data storage, which is just `database.json` file.

To run the backend server, simply run `npm start` in the backend project. This will start the backend.

To view the API interface for the backend you can navigate to the base URL of the backend (e.g. `http://localhost:5005`). This will list all of the HTTP routes that you can interact with.

To reset the data in the backend to the original starting state, run `npm run reset` in the backend directory.

To start with an empty database, run `npm run clear` in the backend directory.

Once the backend has started, you can view the API documentation by navigating to `http://localhost:[port]` in a web browser.

Please note: If you manually update database.json you will need to restart your server.
