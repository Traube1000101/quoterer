#!/usr/bin/env bash
cd bot
npm install
node --env-file=../.env deploy-commands.js