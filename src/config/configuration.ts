export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  JWT: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d' as any,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_WHATSAPP_FROM,
  },
});
