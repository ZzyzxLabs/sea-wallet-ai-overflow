// frontend/src/app/page.jsx
"use client";
import styles from "../styles/Home.module.css";
import ChatSupport from "../component/ChatSupport";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  // 處理「Get Started」按鈕點擊
  const handleGetStarted = () => {
    router.push("/init");
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGif}></div>

      <header className={styles.header}>
        <div className={styles.logoContainer}>
          {/* 這裡可放置您的左側logo或其他內容 */}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.iconContainer}>
          <img
            src='/RMBGlogo.png'
            alt='Sea Wallet Logo'
            className={styles.logo}
          />
        </div>

        <h1 className={styles.title}>SeaWallet</h1>

        <button className={styles.connectButton} onClick={handleGetStarted}>Get Started</button>
      </main>

      {/* 添加客服支援元件 */}
      <ChatSupport />
    </div>
  );
}