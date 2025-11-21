import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  // Rechartsなどのライブラリがevalを使用する可能性があるため、開発モードでのCSP警告を緩和
  experimental: {
    // 開発モードでのCSP警告を抑制（本番環境では適切なCSPヘッダーを設定することを推奨）
  },
  // Webpack設定でevalの使用を許可（開発モードのみ）
  webpack: (config, { dev }) => {
    if (dev) {
      // 開発モードでのみ、evalの使用を許可
      config.devtool = 'eval-cheap-module-source-map';
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
