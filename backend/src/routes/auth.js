const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

// POST /api/auth/signup - רישום: יוצר משתמש ב-Cognito + DB
router.post('/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, idNumber, address } = req.body;

    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({ error: 'שם פרטי, שם משפחה, טלפון וסיסמה הם שדות חובה' });
    }

    // Format phone for Cognito (needs +972 format)
    let formattedPhone = phone;
    if (phone.startsWith('0')) {
      formattedPhone = '+972' + phone.substring(1);
    } else if (!phone.startsWith('+')) {
      formattedPhone = '+972' + phone;
    }

    // 1. Create user in Cognito
    const userAttributes = [
      { Name: 'phone_number', Value: formattedPhone },
    ];
    if (email) {
      userAttributes.push({ Name: 'email', Value: email });
    }
    userAttributes.push({ Name: 'name', Value: `${firstName} ${lastName}` });

    const signUpCommand = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: formattedPhone,
      Password: password,
      UserAttributes: userAttributes,
    });

    const cognitoResult = await cognitoClient.send(signUpCommand);

    // 2. Save user in DB
    const user = await prisma.user.create({
      data: {
        cognitoSub: cognitoResult.UserSub,
        firstName,
        lastName,
        email: email || null,
        phone: formattedPhone,
        idNumber: idNumber || null,
        address: address || null,
        role: 'OWNER',
      },
    });

    res.status(201).json({
      message: 'נרשמת בהצלחה! נשלח קוד אימות לטלפון',
      userId: user.id,
      cognitoSub: cognitoResult.UserSub,
      needsConfirmation: !cognitoResult.UserConfirmed,
    });
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      return res.status(409).json({ error: 'משתמש עם טלפון זה כבר קיים' });
    }
    if (err.name === 'InvalidPasswordException') {
      return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 8 תווים, אות גדולה, אות קטנה ומספר' });
    }
    next(err);
  }
});

// POST /api/auth/confirm - אימות קוד SMS
router.post('/confirm', async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    let formattedPhone = phone;
    if (phone.startsWith('0')) {
      formattedPhone = '+972' + phone.substring(1);
    } else if (!phone.startsWith('+')) {
      formattedPhone = '+972' + phone;
    }

    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: formattedPhone,
      ConfirmationCode: code,
    });

    await cognitoClient.send(confirmCommand);

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

// POST /api/auth/login - התחברות
router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    let formattedPhone = phone;
    if (phone.startsWith('0')) {
      formattedPhone = '+972' + phone.substring(1);
    } else if (!phone.startsWith('+')) {
      formattedPhone = '+972' + phone;
    }

    const authCommand = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: formattedPhone,
        PASSWORD: password,
      },
    });

    const result = await cognitoClient.send(authCommand);

    res.json({
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
    });
  } catch (err) {
    if (err.name === 'NotAuthorizedException') {
      return res.status(401).json({ error: 'טלפון או סיסמה שגויים' });
    }
    if (err.name === 'UserNotConfirmedException') {
      return res.status(403).json({ error: 'יש לאמת את החשבון קודם', needsConfirmation: true });
    }
    next(err);
  }
});

module.exports = router;
