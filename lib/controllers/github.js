const { Router } = require('express');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/authenticate');
const GithubUser = require('../models/GithubUser');
const { exchangeCodeForToken, getGithubProfile } = require('../utils/github');

module.exports = Router()
  // GET /api/v1/github/login
  .get('/login', async (req, res) => {
    // TODO: Kick-off the github oauth flow
    res.redirect(
      `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=user&redirect_uri=http://localhost:7890/api/v1/github/login/callback`
    );
  })

  // GET /api/v1/github/login/callback
  .get('/login/callback', async (req, res) => {
    /*
      TODO:
     * get code 
     * exchange code for token
     * get info from github about user with token
     * get existing user if there is one
     * if not, create one
     * create jwt
     * set cookie and redirect
     */

    // get code from query params on the req.query object
    const { code } = req.query;
    
    // exchange code for token
    const token = await exchangeCodeForToken(code);

    // get info from github about user with token
    const { login, avatar_url, email } = await getGithubProfile(token);

    console.log('-----login-----', login);
    console.log('----avatar_url----', avatar_url);
    console.log('----email----', email);
    

    // get existing user if there is one
    let user = await GithubUser.findByUsername(login);
    console.log('---user---', user);
    // if not, create one
    if (!user) {
      user = await GithubUser.insert({ login, avatar: avatar_url, email });
    }

    // create jwt
    const session = req.cookies.session;
    const payload = jwt.verify(session, process.env.JWT_SECRET);
    req.user = payload;

    //set cookie and redirect
   

  })

  .get('/dashboard', authenticate, async (req, res) => {
    // require req.user
    // get data about user and send it as json
    res.json(req.user);
  })

  .delete('/sessions', (req, res) => {
    res
      .clearCookie(process.env.COOKIE_NAME)
      .json({ success: true, message: 'Signed out successfully!' });
  });
