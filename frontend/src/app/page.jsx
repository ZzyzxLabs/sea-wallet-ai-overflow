"use client";
// 修改 pages/index.js
import styles from "../styles/Home.module.css";
import ChatSupport from "../component/ChatSupport";

export default function Home() {
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
          {/* 您將在此處放置S形狀的PNG圖標 */}
          <img
            src='/RMBGlogo.png'
            alt='Sea Wallet Logo'
            className={styles.logo}
          />
        </div>

        <h1 className={styles.title}>SeaWallet</h1>

        <button className={styles.connectButton}>Get Started</button>
      </main>

      {/* 添加客服支援元件 */}
      <ChatSupport />
    </div>
  );
}
