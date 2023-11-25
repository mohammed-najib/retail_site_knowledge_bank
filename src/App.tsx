import { useEffect, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronRight } from "@fortawesome/free-solid-svg-icons"
import { createClient } from "@supabase/supabase-js"
import { SupabaseVectorStore } from "langchain/vectorstores/supabase"
import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import { ChatOpenAI } from "langchain/chat_models/openai"
import { PromptTemplate } from "langchain/prompts"
import { StringOutputParser } from "langchain/schema/output_parser"
import {
  RunnablePassthrough,
  RunnableSequence,
} from "langchain/schema/runnable"

import { combineDocuments } from "./utils/utils"
import { messages } from "./utils/messages"

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const SUPABASE_API_KEY = import.meta.env.VITE_SUPABASE_API_KEY
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const embeddings = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY })
const client = createClient(SUPABASE_URL, SUPABASE_API_KEY)
const vectorStore = new SupabaseVectorStore(embeddings, {
  client,
  tableName: "documents",
  queryName: "match_documents",
})

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [question, setQuestion] = useState("")

  const div = useRef<HTMLDivElement | null>(null)

  const promptAI = async () => {
    setIsLoading(true)
    messages.push({
      id: messages.length,
      owner: "user",
      content: question,
    })
    setQuestion("")

    const retriever = vectorStore.asRetriever()

    const llm = new ChatOpenAI({ openAIApiKey: OPENAI_API_KEY })

    const standaloneQuestionTemplate = `Given some conversation history (if any) and a question, convert it to a standalone question. 
      
      conversation history: {conv_history}
      question: {question}
      standalone question:`
    const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
      standaloneQuestionTemplate
    )

    const answerTemplate = `
    You are a helpful and anthusiastic support bot who can answer a given question about Retail Site based on the context provided and the conversation history. Try to find the answer in the context. If the answer is not given in the context, find the answer in the conversation history if possible. if you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to email help@retailsite.com. Don't try to make up an answer. Always speak as if you were chatting to a friend.
    context: {context}
    conversation history: {conv_history}
    question: {question}
    answer:
    `

    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)

    const standaloneQuestionChain = standaloneQuestionPrompt
      .pipe(llm)
      .pipe(new StringOutputParser())
      .pipe(retriever)
      .pipe(combineDocuments)
    const retrieveChain = RunnableSequence.from([
      (prevResult) => prevResult.standalone_question,
      retriever,
      combineDocuments,
    ])
    const answerChain = answerPrompt.pipe(llm).pipe(new StringOutputParser())

    const chain = RunnableSequence.from([
      {
        standalone_question: standaloneQuestionChain,
        original_input: new RunnablePassthrough(),
      },
      {
        context: retrieveChain,
        question: ({ original_input }) => original_input.question,
        conv_history: ({ original_input }) => original_input.conv_history,
      },
      answerChain,
    ])

    const response = await chain.invoke({
      question: question,
      conv_history: messages.map((message) =>
        message.owner === "user"
          ? `Human: ${message.content}`
          : `AI: ${message.content}`
      ),
    })

    messages.push({
      id: messages.length,
      owner: "bot",
      content: response,
    })
    setIsLoading(false)
  }

  useEffect(() => {
    div.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [isLoading])

  return (
    <>
      <div className="h-screen w-screen flex items-center justify-center py-4 px-8 bg-red-100">
        <div className="h-full w-full max-h-[600px] max-w-[600px] py-4 px-6 flex flex-col bg-gray-900 rounded-lg lg:rounded-2xl">
          <div className=" text-white uppercase">
            <div className="text-4xl font-bold tracking-wider">Retail Site</div>
            <div className="text-sm leading-none">knowledge bank</div>
          </div>
          <div className="mt-4 mb-4 px-4 flex-1 flex flex-col overflow-y-auto">
            <div ref={div}>
              {messages.map((message) =>
                message.owner === "user" ? (
                  <div
                    key={message.id}
                    className="max-w-[75%] ml-auto mb-4 p-3 bg-green-600 font-bold text-gray-100 text-sm rounded-tl-md rounded-b-md"
                  >
                    {message.content}
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className="max-w-[75%] mr-auto mb-4 p-3 bg-blue-600 font-bold text-gray-100 text-sm rounded-tr-md rounded-b-md"
                  >
                    {message.content}
                  </div>
                )
              )}
              {isLoading && (
                <div className="w-full flex justify-center">
                  <div className="text-white text-2xl font-bold animate-pulse">
                    ...
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="relative mt-auto">
            <input
              className="h-16 w-full pl-4 pr-16 bg-transparent text-white outline-none border-2 border-white rounded-lg lg:rounded-2xl"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && question.length > 0) {
                  promptAI()
                }
              }}
            />
            <div className="absolute top-0 right-0 h-16 w-16 p-2 flex justify-center items-center">
              {isLoading || question.length === 0 ? (
                <button
                  className="h-full w-full flex justify-center items-center bg-transparent text-white rounded-full"
                  disabled={true}
                  onClick={promptAI}
                >
                  <FontAwesomeIcon size="2x" icon={faChevronRight} />
                </button>
              ) : (
                <button
                  className="h-full w-full flex justify-center items-center bg-yellow-500 text-white rounded-full hover:bg-yellow-300 hover:text-gray-900 transition-colors"
                  disabled={false}
                  onClick={promptAI}
                >
                  <FontAwesomeIcon size="2x" icon={faChevronRight} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
