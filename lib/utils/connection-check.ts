// 参加者向けの簡単な接続チェック

export async function checkQuizServerConnection(): Promise<{
  success: boolean
  message: string
  canRetry: boolean
}> {
  try {
    // 簡単な接続テスト
    const response = await fetch("/api/quiz/test-connection")
    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        message: "サーバーに正常に接続されています",
        canRetry: false,
      }
    } else {
      return {
        success: false,
        message: "クイズサーバーに接続できません。しばらく時間をおいてから再度お試しください。",
        canRetry: true,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: "ネットワークエラーが発生しました。インターネット接続を確認してください。",
      canRetry: true,
    }
  }
}
