import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quiz App",
    short_name: "Quiz App",
    description: "Create and join interactive quizzes",
    start_url: "/",
    display: "standalone",
    background_color: "#ffb125",
    theme_color: "#f27a22",
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