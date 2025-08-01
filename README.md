<img src="./assets/quoterer.webp" alt="Wow&#8230; such Empty!" title="StealthyWhisper Icon" width="40%" align="right">
<div align="center">
  <picture>
    <source
        media="(prefers-color-scheme: dark)"
        srcset="./assets/title_dark.png"
    />
    <source
        media="(prefers-color-scheme: light), (prefers-color-scheme: no-preference)"
        srcset="./assets/title_light.png"
    />
    <img width="33%" src="./assets/title_dark.png"/>
  </picture>
  <br>
  <img height="22px" alt="Discord" src="https://img.shields.io/badge/Discord-%235865F2?style=flat&logo=discord&logoColor=white">
  &nbsp;
  <img height="22px" alt="Node.js" src="https://img.shields.io/badge/Node.js-%235FA04E?style=flat&logo=nodedotjs&logoColor=white">
  &nbsp;
  <img height="22px" alt="Docker" src="https://img.shields.io/badge/Docker-%232496ED?style=flat&logo=docker&logoColor=white">
  &nbsp;
  <img height="22px" alt="MongoDB" src="https://img.shields.io/badge/MongoDB-%2347A248?style=flat&logo=mongodb&logoColor=white">
</div>
A Discord bot which sends quotes into designated channels, collects and stores them in a MongoDB database. A website is in development which displays the quotes in real-time. Future updates may include voting and commenting functionalities for the website.

## Prerequisites

- git
- docker & docker compose
- npm

## Preparation
- Clone the repo
```
git clone git@github.com:Traube1000101/quoterer
```
- Change into the directory
```
cd quoterer
```
- Create a file named `.env` & fill in the values.
```
db_user=
db_password=
db_interface_user=
db_interface_password=
bot_id=
bot_token=
salt=
```
- The salt must be a random cryptographically secure base64 string, create one with "openssl rand -base64 16"

- Deploy the commands to your discord app
```
npm install
npm run deploy
```  

## Usage
- Start the app
```
sudo docker compose up -d
```
- The mongo express interface is reachable at [localhost:8081](http://localhost:8081)

## Disclaimer
The bot is made for a specific style of quotes, this cannot be changed from within Discord, feel free to change it in source though.  
### Example:

<img width="50%" alt="Example Quote" src="./assets/example_quote.png">
