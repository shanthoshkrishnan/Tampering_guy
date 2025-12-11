// functions/index.js

const { setGlobalOptions } = require("firebase-functions");
const logger = require("firebase-functions/logger");
const functions = require("firebase-functions");
const sgMail = require("@sendgrid/mail");

// Global options (for cost control etc.)
setGlobalOptions({ maxInstances: 10 });

// Configure SendGrid from functions config
sgMail.setApiKey(functions.config().sendgrid.key);

exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  const { email, name, token } = data;

  // Optional: require auth
  // if (!context.auth) {
  //   throw new functions.https.HttpsError(
  //     "unauthenticated",
  //     "Must be signed in to request verification email"
  //   );
  // }

  const verificationLink = `${functions.config().app.client_base}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  const msg = {
    to: email,
    from: functions.config().sendgrid.from_email,
    subject: "Verify your email - Tampering Guy",
    html: `
      <p>Hi ${name || "user"},</p>
      <p>Click the button below to verify your email:</p>
      <p><a href="${verificationLink}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    logger.info("Verification email sent", { email });
    return { success: true };
  } catch (err) {
    logger.error("SendGrid error", err);
    throw new functions.https.HttpsError("internal", "Failed to send email");
  }
});
