/** @type {import('next').NextConfig} */
const nextConfig = {
    // 开启静态导出
    output: 'export',
    // 如果你想所有页面都输出到 /page-name/index.html：
    // trailingSlash: true,
  };
module.exports = {
output: 'export',
// 如需每个页面生成到 `page-name/index.html`，再加下面这一行：
// trailingSlash: true,
}
  
  export default nextConfig;
  