const { Router } = require('express');
const jwt = require('jsonwebtoken');
const authenticate = require('../middleware/authenticate');
const GithubUser = require('../models/GithubUser');
const { exchangeCodeForToken, getGithubProfile } = require('../utils/github');
const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24;

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

    // get existing user if there is one
    let user = await GithubUser.findByUsername(login);

    // if not, create one
    if (!user) {
      user = await GithubUser.insert({ username: login, avatar: avatar_url, email });
    }

    // create jwt
    const webTokenThatNeedsToBeSign = (userThatWillBeTurnIntoPayload) => {
      return jwt.sign({ ...userThatWillBeTurnIntoPayload }, process.env.JWT_SECRET, { expiresIn: '1 day' });
    };

    //verify the jwt
    const payload = webTokenThatNeedsToBeSign(user);

    //set cookie and redirect
    res.cookie(process.env.COOKIE_NAME, payload, {
      httpOnly:  true,
      maxAge: ONE_DAY_IN_MS,
    }).redirect('/api/v1/github/dashboard');
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
