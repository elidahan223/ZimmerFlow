const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const prisma = require('../config/database');

const region = process.env.AWS_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

const client = jwksClient({
  jwksUri: `${issuer}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, { issuer, algorithms: ['RS256'] }, (err, decoded) => {
      if (err) return reject(err);
      if (decoded.client_id !== clientId && decoded.aud !== clientId) {
        return reject(new Error('Invalid audience'));
      }
      resolve(decoded);
    });
  });
}

// Middleware: requires valid Cognito token + loads DB user
function requireOwner(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'נדרשת התחברות' });
  }

  const token = authHeader.split(' ')[1];
  verifyToken(token)
    .then(async (decoded) => {
      const dbUser = await prisma.user.findUnique({
        where: { cognitoSub: decoded.sub },
      });
      if (!dbUser) {
        return res.status(403).json({ error: 'משתמש לא נמצא במערכת' });
      }
      req.user = {
        id: dbUser.id,
        sub: decoded.sub,
        email: decoded.email,
        role: dbUser.role,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
      };
      next();
    })
    .catch(() => {
      res.status(401).json({ error: 'טוקן לא תקין' });
    });
}

module.exports = { requireOwner };
