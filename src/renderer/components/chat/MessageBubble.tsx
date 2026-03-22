import { memo, type ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { ChatMessage } from '@renderer/types/chat'
import { MermaidDiagram } from './MermaidDiagram'

const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
  hour: '2-digit',
  minute: '2-digit',
})

function CodeBlock(props: ComponentProps<'code'>): React.JSX.Element {
  const { children, className, ...rest } = props
  const match = className?.match(/language-(\w+)/)
  const lang = match?.[1]

  if (lang === 'mermaid') {
    return <MermaidDiagram chart={String(children).trim()} />
  }

  return (
    <code className={className} {...rest}>
      {children}
    </code>
  )
}

const markdownComponents = { code: CodeBlock }

export const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: ChatMessage
}): React.JSX.Element {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
            isUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'
          }`}
        >
          {isUser ? 'You' : 'AI'}
        </div>
        <div>
          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isUser ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          <div
            className={`mt-1 flex items-center gap-2 text-xs text-gray-500 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && message.modelName && (
              <span className="text-gray-600">{message.modelName}</span>
            )}
            <span>{timeFormatter.format(message.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  )
})
