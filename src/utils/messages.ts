export type message = {
  id: number
  owner: "user" | "bot"
  content: string
}

export const messages: message[] = [
  {
    id: 0,
    owner: "bot",
    content:
      "Ask a question about Retail Site, and we'll try to find the answer.",
  },
]
