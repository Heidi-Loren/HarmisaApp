// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 千万不要写 output: 'export'，那样 /api 会被砍掉
  // output: 'export', // <- 删掉这行（如果有的话）
};
module.exports = nextConfig;
