const app = require('../server');
const mongoose = require('mongoose');

async function testResendRoute() {
  console.log('🔍 Inspecting registered Express routes...');
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(`${Object.keys(handler.route.methods).join(',').toUpperCase()} /api/auth${handler.route.path}`);
        }
      });
    }
  });

  console.log('📌 Registered API Routes:');
  routes.forEach(r => console.log('  ->', r));

  const hasResend = routes.some(r => r.includes('/resend-otp'));
  if (hasResend) {
    console.log('\n✅ /api/auth/resend-otp is DEFINED and MOUNTED correctly!');
  } else {
    console.log('\n❌ /api/auth/resend-otp NOT found!');
  }

  process.exit(0);
}

testResendRoute();
