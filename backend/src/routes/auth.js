const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../config/database');
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const { authLimit, refreshLimit } = require('../middleware/rateLimit');

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || null;

// Compute SECRET_HASH for confidential App clients (those with a secret).
// HMAC-SHA256 over (username + clientId), signed with the client secret, base64-encoded.
// Returns undefined for public clients so callers can spread the param conditionally.
function secretHash(username) {
  if (!CLIENT_SECRET) return undefined;
  return crypto
    .createHmac('SHA256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64');
}

// Normalize any IL phone input into E.164 (+972XXXXXXXXX). Returns null for empty input.
function normalizePhone(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (hadPlus) return '+' + digits;
  if (digits.startsWith('972')) return '+' + digits;
  if (digits.startsWith('0')) return '+972' + digits.substring(1);
  return '+972' + digits;
}

// POST /api/auth/signup - רישום: יוצר משתמש ב-Cognito (email כ-username) + DB
router.post('/signup', authLimit, async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, idNumber, address } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'שם פרטי, שם משפחה, מייל וסיסמה הם שדות חובה' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const formattedPhone = normalizePhone(phone);

    // 1. Check DB FIRST — reject before touching Cognito if email already exists.
    //    Avoids creating an orphan Cognito user when DB would have rejected anyway.
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'משתמש עם מייל זה כבר קיים' });
    }

    const userAttributes = [
      { Name: 'email', Value: normalizedEmail },
      { Name: 'given_name', Value: firstName },
      { Name: 'family_name', Value: lastName },
    ];
    if (formattedPhone) {
      userAttributes.push({ Name: 'phone_number', Value: formattedPhone });
    }

    // 2. Create in Cognito only after DB pre-check passed.
    const cognitoResult = await cognitoClient.send(new SignUpCommand({
      ClientId: CLIENT_ID,
      SecretHash: secretHash(normalizedEmail),
      Username: normalizedEmail,
      Password: password,
      UserAttributes: userAttributes,
    }));

    // 3. Write to DB. If this throws after Cognito succeeded we have an orphan Cognito user;
    //    the user can retry signup and we'll surface UsernameExistsException, which they handle.
    const user = await prisma.user.create({
      data: {
        cognitoSub: cognitoResult.UserSub,
        firstName,
        lastName,
        email: normalizedEmail,
        phone: formattedPhone,
        idNumber: idNumber || null,
        address: address || null,
        role: 'GUEST',
      },
    });

    res.status(201).json({
      message: 'נרשמת בהצלחה! נשלח קוד אימות למייל',
      userId: user.id,
      cognitoSub: cognitoResult.UserSub,
      needsConfirmation: !cognitoResult.UserConfirmed,
    });
  } catch (err) {
    console.error('[signup] Cognito error:', err.name, '-', err.message);
    if (err.name === 'UsernameExistsException') {
      return res.status(409).json({ error: 'משתמש עם מייל זה כבר קיים' });
    }
    if (err.name === 'InvalidPasswordException') {
      return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר' });
    }
    if (err.name === 'InvalidParameterException') {
      return res.status(400).json({ error: 'אחד מהפרטים לא תקין', detail: err.message });
    }
    next(err);
  }
});

// POST /api/auth/confirm - אימות קוד שנשלח למייל
router.post('/confirm', authLimit, async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'מייל וקוד אימות הם שדות חובה' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    await cognitoClient.send(new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      SecretHash: secretHash(normalizedEmail),
      Username: normalizedEmail,
      ConfirmationCode: String(code).trim(),
    }));

    res.json({ message: 'האימות הצליח! אפשר להתחבר' });
  } catch (err) {
    if (err.name === 'CodeMismatchException') {
      return res.status(400).json({ error: 'קוד אימות שגוי' });
    }
    if (err.name === 'ExpiredCodeException') {
      return res.status(400).json({ error: 'קוד האימות פג תוקף' });
    }
    next(err);
  }
});

// POST /api/auth/resend-code - שליחת קוד חדש למייל
router.post('/resend-code', authLimit, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'מייל הוא שדה חובה' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    await cognitoClient.send(new ResendConfirmationCodeCommand({
      ClientId: CLIENT_ID,
      SecretHash: secretHash(normalizedEmail),
      Username: normalizedEmail,
    }));
    res.json({ message: 'נשלח קוד אימות חדש למייל' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - התחברות במייל + סיסמה
router.post('/login', authLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'מייל וסיסמה הם שדות חובה' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const loginAuthParams = {
      USERNAME: normalizedEmail,
      PASSWORD: password,
    };
    const sh = secretHash(normalizedEmail);
    if (sh) loginAuthParams.SECRET_HASH = sh;

    const result = await cognitoClient.send(new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: loginAuthParams,
    }));

    // Ensure user exists in DB (handles DB reset / first login from another device)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(result.AuthenticationResult.IdToken);
    if (decoded && decoded.sub) {
      const existing = await prisma.user.findUnique({ where: { cognitoSub: decoded.sub } });
      if (!existing) {
        await prisma.user.create({
          data: {
            cognitoSub: decoded.sub,
            firstName: decoded.given_name || decoded.name?.split(' ')[0] || 'משתמש',
            lastName: decoded.family_name || decoded.name?.split(' ').slice(1).join(' ') || '',
            email: decoded.email || normalizedEmail,
            phone: decoded.phone_number || null,
            role: 'GUEST',
          },
        });
      }
    }

    res.json({
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
    });
  } catch (err) {
    if (err.name === 'NotAuthorizedException') {
      return res.status(401).json({ error: 'מייל או סיסמה שגויים' });
    }
    if (err.name === 'UserNotConfirmedException') {
      return res.status(403).json({ error: 'יש לאמת את החשבון קודם', needsConfirmation: true });
    }
    next(err);
  }
});

// POST /api/auth/refresh - רענון טוקן
router.post('/refresh', refreshLimit, async (req, res, next) => {
  try {
    const { refreshToken, email } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'חסר refresh token' });
    }

    const refreshParams = { REFRESH_TOKEN: refreshToken };
    // Confidential clients need SECRET_HASH on refresh too — frontend sends email to derive it.
    if (CLIENT_SECRET && email) {
      refreshParams.SECRET_HASH = secretHash(String(email).trim().toLowerCase());
    }

    const result = await cognitoClient.send(new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: refreshParams,
    }));

    res.json({
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
    });
  } catch (err) {
    if (err.name === 'NotAuthorizedException') {
      return res.status(401).json({ error: 'יש להתחבר מחדש' });
    }
    next(err);
  }
});

module.exports = router;
