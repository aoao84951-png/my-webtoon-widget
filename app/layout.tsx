export const metadata = {
    title: "Webtoon Widget",
    description: "Webtoon Search Widget",
  };
  
  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <html lang="ko">
        <body>{children}</body>
      </html>
    );
  }