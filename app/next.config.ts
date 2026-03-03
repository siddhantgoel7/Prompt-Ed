import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse', 'pdf2pic', 'canvas'],
};

export default nextConfig;