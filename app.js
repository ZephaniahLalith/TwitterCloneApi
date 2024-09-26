const express = require('express')
const app = express()
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dbpath = path.join(__dirname, 'twitterClone.db')
let db = null
app.use(express.json())
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at https:/localhost:3000/')
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}

initializeDbAndServer()

const Authenticate = async (request, response, next) => {
  const authheader = request.headers['authorization']
  if (authheader != undefined) {
    const jwtToken = authheader.split(' ')[1]
    jwt.verify(jwtToken, 'LALITH90', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

//API1
app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const checkUser = `
  select * from user where username="${username}"
  `
  const res = await db.get(checkUser)
  if (res != undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const newp = await bcrypt.hash(password, 10)
      const registerquery = `
  insert into user(name,username,password,gender)
  values("${name}","${username}","${newp}","${gender}")
  `
      await db.run(registerquery)
      response.status(200)
      response.send('User created successfully')
    }
  }
})

//API2

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getUser = `
  select * from user where username="${username}"
  `
  const dbresult = await db.get(getUser)
  if (dbresult != undefined) {
    const ispasswd = await bcrypt.compare(password, dbresult.password)
    if (ispasswd) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'LALITH90')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

//API 3

app.get('/user/tweets/feed/', Authenticate, async (request, response) => {
  const {username} = request
  const getquery = `
SELECT t.tweet, 
       t.date_time, 
       u.username
FROM user AS u
INNER JOIN follower f ON u.user_id = f.following_user_id
INNER JOIN tweet t ON f.following_user_id = t.user_id
WHERE f.follower_user_id = (SELECT user_id FROM user WHERE username = "${username}")
ORDER BY t.date_time DESC
LIMIT 4;
`;

  const result = await db.all(getquery)
  response.send([result])
})

//API 4
app.get('/user/following/', Authenticate, async (request, response) => {
  const {username} = request

  const getquery = `
SELECT u2.name
FROM user AS u1
INNER JOIN follower ON u1.user_id = follower.follower_user_id
INNER JOIN user AS u2 ON follower.following_user_id = u2.user_id
WHERE u1.username = "${username}";
`
  const dbres = await db.all(getquery)
  response.send([dbres])
})

//API 5
app.get('/user/followers/', Authenticate, async (request, response) => {
  const {username} = request

  const getquery = `
SELECT u1.name
FROM user AS u1
INNER JOIN follower ON u1.user_id = follower.follower_user_id
INNER JOIN user AS u2 ON follower.following_user_id = u2.user_id
WHERE u2.username = "${username}";
`
  const dbres = await db.all(getquery)
  response.send([dbres])
})

//API 6
app.get('/tweets/:tweetId/', Authenticate, async (request, response) => {
  const {username} = request
  const getquery = `
SELECT t.tweet, 
       COUNT(DISTINCT l.like_id) AS like_count, 
       COUNT(DISTINCT r.reply_id) AS reply_count, 
       t.date_time
FROM user AS u
INNER JOIN follower f ON u.user_id = f.follower_user_id
INNER JOIN tweet t ON f.following_user_id = t.user_id
LEFT JOIN \`like\` l ON t.tweet_id = l.tweet_id
LEFT JOIN reply r ON t.tweet_id = r.tweet_id
WHERE u.username = "${username}" AND t.tweet_id = ${tweet_id}
GROUP BY t.tweet, t.date_time
ORDER BY t.date_time DESC;
`
  const tweetres = await db.get(getquery)
  response.send(tweetres)
})

//API 7
app.get('/tweets/:tweetId/likes/', Authenticate, async (request, response) => {
  const {username} = request
  const {tweetId} = request.params
  const checkreq = `
  select * from (user inner join follower on user.user_id=follower.follower_user_id ) as t inner join tweet on t.following_user_id =tweet.user_id where tweet.tweet_id=${tweetId} and user.user_name="${username}"
  `
  const result = await db.get(checkreq)
  if (result != undefined) {
    const getquery = `
SELECT t.tweet, 
       COUNT(DISTINCT l.like_id) AS like_count, 
       COUNT(DISTINCT r.reply_id) AS reply_count, 
       t.date_time
FROM tweet t
LEFT JOIN \`like\` l ON t.tweet_id = l.tweet_id
LEFT JOIN reply r ON t.tweet_id = r.tweet_id
WHERE t.user_id NOT IN (
    SELECT following_user_id 
    FROM follower 
    WHERE follower_user_id = (SELECT user_id FROM user WHERE username = "${username}")
) AND t.tweet_id = ${tweet_id}
GROUP BY t.tweet, t.date_time
ORDER BY t.date_time DESC;
`

    const getres = await db.all(getquery)
    response.send([getres])
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})
//API 8
app.get('/tweets/:tweetId/replies/', Authenticate, async requestmresponse => {
  const {username} = request
  const checkUser = `
select * from (user inner join follower on user.user_id=follower.follower_id) as t inner join tweet t.following_id = 
`
})

//API 9
app.get('/user/tweets/', Authenticate, async (request, response) => {
  const {username} = request
  const getUsertweet = `
  select tweet,count(like.like_id),count(reply.reply_id), from (user inner join tweet on user.user_id=tweet.user_id) as t inner join like on t.tweet_id=like.tweet_id  inner join tweet on like.tweet_id=reply.tweet_id where t.username="${username}"
  `
  const dbred = await db.get(getUsertweet)
  response.send([dbred])
})

//API 10
app.post('/user/tweets/', Authenticate, async (request, response) => {
  const {tweet} = request.body
  const posttweet = `
  insert into tweet(tweet)
  values("${tweet}")
  `
  await db.run(posttweet)
  response.send('Created a Tweet')
})

app.delete('/tweets/:tweetId/', Authenticate, async (request, response) => {
  const {username} = request
  const {tweetId} = request.params
  const checktweet = `
  select * from user inner join tweet on user.user_id=tweet.user_id where user.username="${username}" and tweet.tweet_id=${tweetId}
  `
  const dbres = await db.get(checktweet)
  if (dbres != undefined) {
    const delQuery = `
    delete from tweet where tweet_id=${tweetId}
    `
    await db.run(delQuery)
    response.send('Tweet Removed')
  } else {
    response.status(401)
    response.send('Invalid Request')
  }
})

module.exports = app
