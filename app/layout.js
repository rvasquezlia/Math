import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "./contexts/AuthContext";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "LIA Curriculum",
  description: "Git-backed static curriculum site with GitHub sign-in and TipTap CMS.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <div className="app-shell">
            <Sidebar />
            <main className="app-main">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

