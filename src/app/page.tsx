'use client';

import dynamic from 'next/dynamic';

const ThinkApp = dynamic(() => import('@/components/ThinkApp'), { ssr: false });

export default function Home() {
  return <ThinkApp />;
}
