type ToastProps = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export function toast(props: ToastProps) {
  // 実際のプロジェクトでは、より高度なトースト通知システムを実装することをお勧めします
  // ここでは簡易的な実装として、コンソールにメッセージを表示します
  console.log(`Toast: ${props.title} - ${props.description || ""}`)

  // アラートを表示（実際のプロジェクトではUIコンポーネントを使用）
  alert(`${props.title}\n${props.description || ""}`)
}
