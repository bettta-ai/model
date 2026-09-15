import { Analytics } from '@vercel/analytics/next';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>SCOUT — Model Portfolio Builder</title>
        <meta
          name="description"
          content="Build a model portfolio package on your own device, then send it to agencies yourself."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
      {/* Vercel Web Analytics. It sets no cookies and stores no identifiers in
          the browser — visits are counted without tracking individuals. */}
      <Analytics />
    </>
  );
}
