import type { NextPageContext } from 'next';

type Props = { statusCode?: number };

function ErrorPage({ statusCode }: Props) {
  return <div style={{ padding: 24 }}>Error {statusCode || 500}</div>;
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => ({
  statusCode: res?.statusCode ?? err?.statusCode ?? 500,
});

export default ErrorPage;
