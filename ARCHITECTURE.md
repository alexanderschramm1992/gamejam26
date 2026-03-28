# ARCHITECTURE.md
This file describes the technical structure of the project.

## Client Server 
The application is split into a server application and potentially multiple instances of client applications.

### Structure
As this game supports multiple players, it has to be separated into client and server applications. The client is a stateless application running in the browser, responsible only for rendering the current game state and capturing player input to send it to the server. The server as a stateful application running on the host machine. It is responsible to process game logic and store the game state. Further, it hosts the client applications for players to request it with their browsers and accepts player input, which is then processed through game logic on the game state.

### Communication
The client application is requested by player browsers using HTTP. Player input and game state updates are communicated through a web socket.

## Modularization
Both the client and server applications are modularized to allow multiple developers and/or agents to work on the project simultaneously. Modules are defined through features, not technical layers or technologies. For example, the movement is defined in a different module than the map layout.

### Initial Modules
The initial modules are:
- Movement: Contains game logic for car movement, including acceleration, deceleration, turning, drifting and collision detection.
- Map: Contains the map layout and/or generator. At a later point in time, other or different map layouts could be implemented. This could include an input of OpenStreetMap data.
- Resource Management: Contains the logic for loading and managing in game resources, for example, the intergitiy/health of a car, its fuel and munitions.
- Enemy AI: Contains the rules and logic enemies follow, for example, driving towards a player and shooting or ramming them.
- Enemy Spawning: Contains the logic for spawning enemies.

## Technologies
The project is written in TypeScript and uses only a few external libraries. The server application is built using Node.js, and the client application is built using vanilla TypeScript and HTML5 canvas. The project uses Webpack for bundling the client application. The server application uses Express.js for handling HTTP requests and Socket.io for handling web socket communication.

## Assets
The game works with static assets, such as PNG images and audio files. These are stored in the server application and served via HTTP, such as the client applications. Assets should be expected to change over time, for example, a developer updating the image asset of a car.
