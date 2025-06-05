import { useCallback, useRef, useState, type KeyboardEvent } from "react";

const App = () => {
  /**
   * 会話履歴の配列
   */
  const [messages, setMessages] = useState<string[]>([]);

  /**
   * 現在の出力先となる吹出への参照
   */
  const currentBubbleRef = useRef<HTMLDivElement>(null);

  /**
   * LanguageModel オブジェクトの参照
   */
  const sessionRef = useRef<LanguageModel>(null);

  /**
   * 吹出の内容をクリアする関数
   */
  const clearBubble = useCallback(() => {
    if (
      currentBubbleRef.current === null ||
      currentBubbleRef.current.textContent === null
    )
      return;

    currentBubbleRef.current.textContent = "";
  }, []);

  /**
   * 吹出に文字列を追記する関数
   *
   * @param chunk 追記する文字列
   */
  const addChunk2Bubble = useCallback((chunk: string) => {
    if (
      currentBubbleRef.current === null ||
      currentBubbleRef.current.textContent === null
    )
      return;

    currentBubbleRef.current.textContent += chunk;
  }, []);

  /**
   * ReadableStreamDefaultReader の内容を読み取る関数
   *
   * @param reader 読み取る ReadableStreamDefaultReader
   */
  const readChunk = useCallback(
    async (reader: ReadableStreamDefaultReader<string>) => {
      const { done, value } = await reader.read();

      if (value !== undefined) addChunk2Bubble(value);

      if (!done) await readChunk(reader);
    },
    [addChunk2Bubble]
  );

  /**
   * プロンプトを元に応答を生成する関数
   *
   * @param prompt
   */
  const generate = useCallback(
    async (prompt: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (LanguageModel === undefined) {
        console.error("Prompt API が利用できません。");
        return;
      }

      const availability = await LanguageModel.availability();

      switch (availability) {
        case "unavailable":
          console.error("言語モデルが利用できません。");
          break;

        case "downloadable":
        case "downloading":
          console.error(
            "言語モデルは利用できますが、まずダウンロードの必要があります",
            availability
          );
          break;

        case "available": {
          // セションを開始する
          if (sessionRef.current === null)
            sessionRef.current = await LanguageModel.create();

          // 言語モデルにプロンプトを与え、ストリームを取得する
          const stream = sessionRef.current.promptStreaming(prompt);

          // ストリームからチャンクを読み取る
          const reader = stream.getReader();
          await readChunk(reader);
          break;
        }

        default:
          availability satisfies never;
      }
    },
    [readChunk]
  );

  /**
   * テキストエリアでキーボードを押下したときのイベントハンドラ
   */
  const onkeydownHandler = useCallback(
    ({
      currentTarget: { value },
      ctrlKey,
      metaKey,
      code,
    }: KeyboardEvent<HTMLTextAreaElement>) => {
      if ([ctrlKey, metaKey].includes(true) && code === "Enter") {
        if (currentBubbleRef.current?.textContent === undefined) {
          setMessages([...messages, value]);
        } else {
          setMessages([
            ...messages,
            currentBubbleRef.current.textContent ?? "",
            value,
          ]);
        }

        clearBubble();
        void generate(value);
      }
    },
    [clearBubble, generate, messages]
  );

  return (
    <>
      <main className="relative h-dvh">
        <div className="grid grid-cols-2 gap-4 p-4">
          {messages.map((message) => (
            <div
              className="rounded-md shadow-md p-2 first:invisible odd:bg-blue-200 even:bg-gray-200 odd:mb-10 even:mt-10"
              key={message}
            >
              {message}
            </div>
          ))}

          <div
            className="rounded-md shadow-md p-2 first:invisible odd:bg-blue-200 even:bg-gray-200 odd:mb-10 even:mt-10"
            ref={currentBubbleRef}
          ></div>
        </div>

        <div className="absolute bottom-4 flex justify-center w-full">
          <textarea
            className="border-2 p-2 border-gray-500 rounded-md w-1/3"
            placeholder="プロンプトを入力。Ctrl + Enter で送信。"
            onKeyDown={onkeydownHandler}
          />
        </div>
      </main>
    </>
  );
};

export default App;
