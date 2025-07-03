import QRCode from "qrcode"

export async function generateQRCode(url: string): Promise<string> {
  try {
    // URLが http:// または https:// で始まっていない場合は、完全なURLに変換
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      // 開発環境では localhost を使用
      if (typeof window !== "undefined") {
        // 現在のウィンドウのオリジンを使用
        const origin = window.location.origin
        url = `${origin}${url.startsWith("/") ? "" : "/"}${url}`
      } else {
        // サーバーサイドでは環境変数またはデフォルト値を使用
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com"
        url = `${appUrl}${url.startsWith("/") ? "" : "/"}${url}`
      }
    }

    console.log("Generating QR code for URL:", url)
    return await QRCode.toDataURL(url)
  } catch (error) {
    console.error("Error generating QR code:", error)
    throw error
  }
}
