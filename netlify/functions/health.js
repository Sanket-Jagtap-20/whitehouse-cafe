exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'ok', cafe: process.env.CAFE_NAME || 'White House Cafe' }),
});
