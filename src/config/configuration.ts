export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  JWT: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d' as any,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
});
