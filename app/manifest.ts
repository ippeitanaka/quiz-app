import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quiz App",
    short_name: "Quiz App",
    description: "Create and join interactive quizzes",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/icon.png",
        sizes: "1289x1295",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "1289x1295",
        type: "image/png",
      },
    ],
  }
}