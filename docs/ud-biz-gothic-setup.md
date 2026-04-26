UD BIZ ゴシックを全端末で強制するには、ライセンス済みフォントファイルをリポジトリに同梱します。

配置先:
/public/fonts/ud-biz-gothic/

必要ファイル:
- BIZUDPGothic-Regular.ttf
- BIZUDPGothic-Bold.ttf

現在の実装では、まず同梱フォントを /fonts/ud-biz-gothic/ から読み込みます。
同梱ファイルがない環境では、端末にインストール済みの BIZ UDPゴシック / BIZ UDゴシック を探し、見つからない場合は既存の日本語サンセリフへフォールバックします。

反映後の確認ポイント:
- 参加者画面と管理画面の両方で文字幅が UD BIZ ゴシックらしい見え方になること
- 太字見出しで Bold が使われること
- Network タブで /fonts/ud-biz-gothic/BIZUDPGothic-Regular.ttf が 200 になること

注意:
- フォントファイル自体はライセンス条件を満たしたものだけを配置してください
- ファイル名が異なる場合は /app/globals.css の url を合わせて更新してください