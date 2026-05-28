import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

interface VoiceInputControlProps {
  disabled?: boolean
  onTranscript: (text: string) => void
  onStatusChange?: (status: string | null) => void
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export function VoiceInputControl({ disabled, onTranscript, onStatusChange }: VoiceInputControlProps) {
  const Recognition = useMemo(() => getSpeechRecognition(), [])
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTextRef = useRef('')
  const interimTextRef = useRef('')
  const [isListening, setIsListening] = useState(false)

  const supported = Boolean(Recognition)

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const startListening = useCallback(() => {
    if (!Recognition || disabled || isListening) return
    onStatusChange?.('正在聆听...')
    finalTextRef.current = ''
    interimTextRef.current = ''

    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onstart = () => setIsListening(true)
    recognition.onerror = () => {
      onStatusChange?.('识别中断，请重试')
      setIsListening(false)
    }
    recognition.onresult = (event) => {
      let committed = finalTextRef.current
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          committed = `${committed}${transcript}`
        } else {
          interim += transcript
        }
      }
      finalTextRef.current = committed
      interimTextRef.current = interim
      if (committed || interim) onStatusChange?.(`正在聆听... ${committed}${interim}`)
    }
    recognition.onend = () => {
      setIsListening(false)
      const text = `${finalTextRef.current}${interimTextRef.current}`.trim()
      if (text) {
        onTranscript(text)
        onStatusChange?.('识别完成，已填入输入框')
        window.setTimeout(() => onStatusChange?.(null), 2200)
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }, [Recognition, disabled, isListening, onTranscript, onStatusChange])

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="当前浏览器不支持语音输入，可使用键盘输入"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-300"
      >
        <MicOff className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      title={isListening ? '停止语音输入' : '语音输入'}
      className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        isListening
          ? 'animate-pulse border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-200'
          : 'border-gray-200 bg-gray-50 text-blue-600 hover:border-blue-200 hover:bg-blue-50'
      }`}
      aria-label={isListening ? '停止语音输入' : '点击开始语音'}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  )
}
